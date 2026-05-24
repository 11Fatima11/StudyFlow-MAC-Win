// content.js — StudyFlow v13
// Handles: text selection, file scanning, URL resolution for file extraction.
// Works on any *.instructure.com Canvas instance.

// ── 1. Selected-text watcher ──────────────────────────────────────
document.addEventListener("mouseup",  pushSelection);
document.addEventListener("keyup",    pushSelection);
document.addEventListener("touchend", pushSelection);

function pushSelection() {
  const sel  = window.getSelection();
  const text = sel ? sel.toString().trim() : "";
  chrome.storage.session.set({ selectedText: text });
}

// ── 2. Message listener ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SCAN_FILES") {
    sendResponse({ files: scanFiles() });
    return true;
  }
  if (msg.type === "GET_SELECTION") {
    sendResponse({ text: window.getSelection()?.toString().trim() ?? "" });
    return true;
  }
  if (msg.type === "RESOLVE_URL") {
    resolveCanvasUrl(msg.url)
      .then(url => sendResponse({ ok: true, url }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

// ── 3. SPA navigation watcher ────────────────────────────────────
// Canvas is a single-page app. Re-scan when the URL changes.
let _lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== _lastUrl) {
    _lastUrl = location.href;
    // Notify the side panel that files may have changed
    chrome.runtime.sendMessage({ type: "PAGE_NAVIGATED" }).catch(() => {});
  }
}).observe(document.body, { childList: true, subtree: true });

// ── 4. File scanner ───────────────────────────────────────────────
function scanFiles() {
  const seen    = new Set();
  const results = [];

  function add(name, url, kind) {
    const key = url || name;
    if (!key || seen.has(key)) return;
    seen.add(key);
    results.push({
      name: cleanName(name) || key.split("/").pop() || "file",
      url:  url || "",
      kind
    });
  }

  // ── A. All anchor links ───────────────────────────────────────
  document.querySelectorAll("a[href]").forEach(a => {
    const href = a.href || "";
    const text = a.textContent.trim();
    // FIX: fall back to "document" for Canvas /files/ links with no extension
    const kind = kindFromUrl(href) || (href.includes("/files/") ? "document" : null);
    if (kind) add(text || null, href, kind);
  });

  // ── B. Canvas instructure file links ─────────────────────────
  document.querySelectorAll(
    "a.instructure_file_link, a.instructure_scribd_file, " +
    "a[data-api-returntype='File'], a[href*='/files/']"
  ).forEach(a => {
    const name = a.getAttribute("data-api-endpoint")?.split("/").pop()
              || a.textContent.trim() || null;
    let href = a.getAttribute("data-download-url") || a.href || "";
    if (href.includes("/files/") && !href.includes("/download") && !href.includes("download_frd")) {
      href = href.split("?")[0].replace(/\/$/, "") + "/download?download_frd=1";
    }
    add(name, href, kindFromUrl(href) || "document");
  });

  // ── C. Module item file links ─────────────────────────────────
  document.querySelectorAll(".ig-row a[href*='/files/'], .module-item-title a[href*='/files/']").forEach(a => {
    const name = a.querySelector(".ig-title, .title")?.textContent?.trim() || a.textContent.trim() || null;
    let href = a.href || "";
    if (href.includes("/files/") && !href.includes("/download") && !href.includes("download_frd")) {
      href = href.split("?")[0].replace(/\/$/, "") + "/download?download_frd=1";
    }
    add(name, href, kindFromUrl(href) || "document");
  });

  // ── D. Embedded iframes ───────────────────────────────────────
  document.querySelectorAll("iframe[src]").forEach(fr => {
    const src  = fr.src;
    if (!src || src === "about:blank") return;
    const kind = kindFromUrl(src) || (src.includes("/files/") || src.endsWith(".pdf") ? "document" : null);
    if (kind) add(fr.title || null, src, kind);
  });

  // ── E. <embed> and <object> ───────────────────────────────────
  document.querySelectorAll("embed[src], object[data]").forEach(el => {
    const src = el.src || el.data || "";
    if (!src) return;
    add(null, src, kindFromUrl(src) || "document");
  });

  // ── F. data-src (lazy-loaded) ────────────────────────────────
  document.querySelectorAll("[data-src]").forEach(el => {
    const src  = el.dataset.src || "";
    const kind = kindFromUrl(src);
    if (kind) add(el.title || el.alt || null, src, kind);
  });

  // ── G. Assignment / discussion attachments ────────────────────
  document.querySelectorAll(
    ".attachment a[href], .submission-attachment a[href], " +
    ".comment-attachment a[href], .file_download_btn[href]"
  ).forEach(a => {
    const href = a.href || "";
    const name = a.textContent.trim() || a.getAttribute("download") || null;
    const kind = kindFromUrl(href) || (href.includes("/files/") ? "document" : null);
    if (kind) add(name, href, kind);
  });

  // ── H. Rich-text content areas ───────────────────────────────
  document.querySelectorAll(
    ".show-content a[href], .user_content a[href], " +
    ".assignment-description a[href], .entry-content a[href]"
  ).forEach(a => {
    const href = a.href || "";
    const text = a.textContent.trim();
    const kind = kindFromUrl(href) || (href.includes("/files/") ? "document" : null);
    if (kind) add(text || null, href, kind);
  });

  // ── I. Embedded images ───────────────────────────────────────
  document.querySelectorAll(
    ".show-content img[src], .user_content img[src], " +
    ".assignment-description img[src]"
  ).forEach(img => {
    const src = img.src || "";
    if (!src || src.startsWith("data:") || /avatar|icon|logo|blank/i.test(src)) return;
    if (kindFromUrl(src) === "image") add(img.alt || null, src, "image");
  });

  return results;
}

// ── URL resolver: Canvas viewer URL → direct CDN download URL ────
async function resolveCanvasUrl(url) {
  const u = url.toLowerCase();
  if (u.includes("/download") || u.includes("download_frd=1") || u.includes("verifier=")) {
    return url;
  }
  const m = url.match(/\/files\/(\d+)/);
  if (m) {
    try {
      // Use current hostname so this works on any Canvas instance
      const base = `${location.protocol}//${location.hostname}`;
      const r    = await fetch(`${base}/api/v1/files/${m[1]}`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        if (d.url) return d.url;
      }
    } catch {}
    // Fallback: force download param
    return url.split("?")[0].replace(/\/$/, "") + "/download?download_frd=1";
  }
  return url;
}

// ── Helpers ───────────────────────────────────────────────────────
function kindFromUrl(url) {
  if (!url) return null;
  const u = url.toLowerCase().split("?")[0];
  if (/\.(pdf)$/.test(u))                                                   return "document";
  if (/\.(doc|docx|odt|rtf|txt|md)$/.test(u))                              return "document";
  if (/\.(ppt|pptx|odp)$/.test(u))                                         return "presentation";
  if (/\.(xls|xlsx|ods|csv)$/.test(u))                                      return "spreadsheet";
  if (/\.(mp4|mov|avi|webm|mkv|m4v|ogv)$/.test(u))                         return "video";
  if (/\.(mp3|wav|ogg|m4a|aac|flac|opus)$/.test(u))                        return "audio";
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/.test(u))                   return "image";
  if (/\.(zip|rar|7z|tar|gz|bz2)$/.test(u))                                return "archive";
  if (/\.(py|js|java|cpp|c|cs|html|css|ipynb|r|sh|ts|json|xml)$/.test(u)) return "code";
  return null;
}

function cleanName(str) {
  if (!str) return "";
  return str.replace(/\s+/g, " ").trim().slice(0, 80);
}
