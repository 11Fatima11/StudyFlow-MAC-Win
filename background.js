// background.js — service worker v8
// TABLE-AWARE extraction for PPTX, DOCX, XLSX, PDF
// Images/photos cannot be extracted locally (binary blobs, no OCR).
// Charts: underlying data values extracted from chart XML.

importScripts("libs/pdf.worker.min.js");
importScripts("libs/pdf.min.js");
importScripts("libs/jszip.min.js");
importScripts("libs/mammoth.browser.min.js");

if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
}

// ── Context menu ──────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  // Open as side panel on toolbar click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  chrome.contextMenus.create({ id: "canvas-ai-use",      title: "Use in Canvas AI Helper", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "canvas-ai-explain",  title: "Explain this with AI",    contexts: ["selection"] });
  chrome.contextMenus.create({ id: "canvas-ai-summarise",title: "Summarise this with AI",  contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const text = (info.selectionText || "").trim();
  if (!text) return;
  if (info.menuItemId === "canvas-ai-use") {
    chrome.storage.session.set({ selectedText: text });
  }
  if (info.menuItemId === "canvas-ai-explain") {
    chrome.storage.session.set({ selectedText: text, autoMode: "explain" });
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  }
  if (info.menuItemId === "canvas-ai-summarise") {
    chrome.storage.session.set({ selectedText: text, autoMode: "summary" });
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
  }
});

// ── Message router ────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "ANKI_REQUEST") {
    fetch("http://localhost:8765", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg.payload)
    })
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(e  => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === "BG_EXTRACT") {
    bgExtract(msg.url, msg.filename, msg.kind)
      .then(text => sendResponse({ ok: true, text }))
      .catch(e   => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

// ── Fetch + dispatch ──────────────────────────────────────────────
async function bgExtract(url, filename, kind) {
  const resp = await fetch(url, { credentials: "include", redirect: "follow" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} — are you logged into Canvas?`);
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("text/html"))
    throw new Error("Canvas returned a login page — please log into Canvas and try again.");

  const buf  = await resp.arrayBuffer();
  const name = (filename || "").toLowerCase();

  const isPptx = name.endsWith(".pptx") || kind === "presentation" || ct.includes("presentationml");
  const isDocx = name.endsWith(".docx") || name.endsWith(".doc")   || ct.includes("wordprocessingml");
  const isPdf  = name.endsWith(".pdf")  || ct.includes("pdf");
  const isXlsx = /\.(xlsx|xls)$/.test(name) || kind === "spreadsheet" || ct.includes("spreadsheetml");

  if (isPptx) return extractPptx(buf);
  if (isDocx) return extractDocx(buf);
  if (isPdf)  return extractPdf(buf);
  if (isXlsx) return extractXlsx(buf);

  const text = new TextDecoder("utf-8").decode(new Uint8Array(buf));
  const clean = text.replace(/[^\x20-\x7E\n\r\t]/g, "");
  if (clean.length / Math.max(text.length, 1) > 0.8) return clean;
  throw new Error(`Unsupported file type (${ct || name}). Supported: PDF, PPTX, DOCX, XLSX, TXT.`);
}

// ═══════════════════════════════════════════════════════════════════
// PPTX EXTRACTOR
// Handles: text paragraphs, tables (<a:tbl>), chart data, image notes
// ═══════════════════════════════════════════════════════════════════
async function extractPptx(buf) {
  const zip = await JSZip.loadAsync(buf);

  // Get slide files in order
  const slideFiles = Object.keys(zip.files)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);

  if (!slideFiles.length) throw new Error("No slides found in PPTX");

  // Get chart XML files (for chart data extraction)
  const chartFiles = {};
  for (const name of Object.keys(zip.files)) {
    if (/^ppt\/charts\/chart\d+\.xml$/.test(name)) {
      chartFiles[name] = await zip.files[name].async("string");
    }
  }

  const slides = [];
  for (let si = 0; si < slideFiles.length; si++) {
    const slidePath = slideFiles[si];
    try {
      chrome.runtime.sendMessage({
        type:  "EXTRACT_PROGRESS",
        pct:   Math.round((si / slideFiles.length) * 100),
        label: `Reading slide ${si + 1} of ${slideFiles.length}…`
      });
    } catch {}
    const xml    = await zip.files[slidePath].async("string");
    const blocks = extractPptxBlocks(xml, chartFiles);
    if (blocks.trim()) slides.push(blocks.trim());
  }

  if (!slides.length) throw new Error("Slides contain no extractable text");
  return slides.map((s, i) => `[Slide ${i + 1}]\n${s}`).join("\n\n");
}

function extractPptxBlocks(xml, chartFiles) {
  const parts = [];

  // Step 1 — extract ALL tables first (removes them from further processing)
  const tableRe = /<a:tbl>[\s\S]*?<\/a:tbl>/g;
  const tablePositions = [];
  let tm;
  while ((tm = tableRe.exec(xml)) !== null) {
    const table = extractXmlTable(tm[0]);
    if (table) parts.push(table);
    tablePositions.push([tm.index, tm.index + tm[0].length]);
  }

  // Step 2 — extract charts
  const chartRe = /<c:chart[^/]*\/>/g;
  let cm;
  while ((cm = chartRe.exec(xml)) !== null) {
    const chartData = extractChartFromShape(cm[0], chartFiles);
    if (chartData) parts.push(chartData);
  }

  // Step 3 — extract images (get alt text / description)
  const picRe = /<p:pic[\s>][\s\S]*?<\/p:pic>/g;
  let pm2;
  while ((pm2 = picRe.exec(xml)) !== null) {
    const pic   = pm2[0];
    const descM = pic.match(/descr="([^"]+)"/);
    const nameM = pic.match(/name="([^"]+)"/);
    const label = descM?.[1] || "";
    const pname = nameM?.[1] || "";
    if (label) parts.push(`[Image: ${label}]`);
    else if (pname && !/^(Picture|Image|Afbeelding|Foto)\s*\d*$/i.test(pname))
      parts.push(`[Image: ${pname}]`);
    // silently skip unnamed images — they are usually decorative
  }

  // Step 4 — extract plain text paragraphs
  // Remove table and chart XML first so we don't re-read their inner <a:t> nodes
  let textXml = xml;
  // Strip tables
  textXml = textXml.replace(/<a:tbl>[\s\S]*?<\/a:tbl>/g, "");
  // Strip chart graphic frames
  textXml = textXml.replace(/<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/g, "");
  // Strip pictures
  textXml = textXml.replace(/<p:pic[\s>][\s\S]*?<\/p:pic>/g, "");

  // Now extract paragraphs — each <a:p> is one line
  const paraRe = /<a:p[\s>][\s\S]*?<\/a:p>/g;
  let pm;
  const textParts = [];
  while ((pm = paraRe.exec(textXml)) !== null) {
    const runs = [];
    const tRe  = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let tr;
    while ((tr = tRe.exec(pm[0])) !== null) {
      const t = xmlDec(tr[1]).trim();
      if (t) runs.push(t);
    }
    const line = runs.join("").trim();
    if (line) textParts.push(line);
  }
  if (textParts.length) parts.push(textParts.join("\n"));

  return parts.join("\n\n");
}

// ── Generic XML table → markdown table ───────────────────────────
// Works for PPTX (<a:tbl>) and DOCX (<w:tbl>)
function extractXmlTable(xml) {
  const rows  = [];
  // Try PPTX table rows first (<a:tr>), then DOCX (<w:tr>)
  const rowRe = /<a:tr[\s>][\s\S]*?<\/a:tr>|<w:tr[\s>][\s\S]*?<\/w:tr>/g;
  let rm;
  while ((rm = rowRe.exec(xml)) !== null) {
    const row     = rm[0];
    const cells   = [];
    // Cell content: PPTX <a:tc>, DOCX <w:tc>
    const cellRe  = /<a:tc[\s>][\s\S]*?<\/a:tc>|<w:tc[\s>][\s\S]*?<\/w:tc>/g;
    let cm;
    while ((cm = cellRe.exec(row)) !== null) {
      // Extract all <a:t> or <w:t> text within the cell
      const tParts = [];
      const tRe    = /<a:t[^>]*>([\s\S]*?)<\/a:t>|<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let tm;
      while ((tm = tRe.exec(cm[0])) !== null) {
        const t = xmlDec(tm[1] || tm[2] || "").trim();
        if (t) tParts.push(t);
      }
      cells.push(tParts.join(" ") || " ");
    }
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) return "";
  return toMarkdownTable(rows);
}

function toMarkdownTable(rows) {
  if (!rows.length) return "";
  const colCount = Math.max(...rows.map(r => r.length));
  // Pad all rows to same column count
  const padded = rows.map(r => {
    while (r.length < colCount) r.push("");
    return r;
  });
  const header    = "| " + padded[0].join(" | ") + " |";
  const separator = "| " + padded[0].map(() => "---").join(" | ") + " |";
  const body      = padded.slice(1).map(r => "| " + r.join(" | ") + " |");
  return [header, separator, ...body].join("\n");
}

// ── Chart data extractor ──────────────────────────────────────────
function extractChartFromShape(shapeXml, chartFiles) {
  // Find chart relationship ID
  const ridM = shapeXml.match(/r:id="(rId\d+)"/);
  if (!ridM) return "[Chart]";

  // Find chart XML by looking for any chart file (simplified — no rels parsing)
  for (const xml of Object.values(chartFiles)) {
    const series = extractChartSeries(xml);
    if (series) return `[Chart]\n${series}`;
  }
  return "[Chart — data not available]";
}

function extractChartSeries(xml) {
  const lines = [];
  // Chart series: <c:ser> contains <c:tx> (series name) and <c:val> (values)
  const serRe = /<c:ser[\s>][\s\S]*?<\/c:ser>/g;
  let sm;
  while ((sm = serRe.exec(xml)) !== null) {
    const ser  = sm[0];
    const nameM = ser.match(/<c:v>([\s\S]*?)<\/c:v>/);
    const name  = nameM ? xmlDec(nameM[1]) : "Series";
    // Collect numeric values
    const vals  = [];
    const vRe   = /<c:numRef[\s\S]*?<\/c:numRef>|<c:v>([\s\S]*?)<\/c:v>/g;
    let vm;
    while ((vm = vRe.exec(ser)) !== null) {
      if (vm[1]) vals.push(vm[1]);
    }
    if (vals.length) lines.push(`${name}: ${vals.join(", ")}`);
  }
  // Also try category labels
  const catRe = /<c:cat[\s\S]*?<\/c:cat>/;
  const catM  = catRe.exec(xml);
  if (catM) {
    const cats = [];
    const cRe  = /<c:v>([\s\S]*?)<\/c:v>/g;
    let cm;
    while ((cm = cRe.exec(catM[0])) !== null) cats.push(xmlDec(cm[1]));
    if (cats.length) lines.unshift(`Categories: ${cats.join(", ")}`);
  }
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// DOCX EXTRACTOR
// Handles: paragraphs, tables (<w:tbl>), images (alt text only)
// ═══════════════════════════════════════════════════════════════════
async function extractDocx(buf) {
  // Try mammoth first — it handles most cases including basic tables
  if (typeof mammoth !== "undefined") {
    try {
      // Use convertToMarkdown-style via HTML conversion for table support
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buf });
      if (htmlResult.value && htmlResult.value.trim()) {
        return htmlToMarkdown(htmlResult.value);
      }
    } catch (e) { console.log("[BG] mammoth HTML error:", e.message); }

    try {
      const r = await mammoth.extractRawText({ arrayBuffer: buf });
      if (r.value && r.value.trim()) return r.value;
    } catch (e) { console.log("[BG] mammoth text error:", e.message); }
  }

  // Fallback: parse word/document.xml directly with table support
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.files["word/document.xml"]?.async("string");
  if (!xml) throw new Error("Could not find document.xml in DOCX");
  return extractDocxXml(xml);
}

// Convert mammoth's HTML output to readable markdown (preserves tables)
function htmlToMarkdown(html) {
  let md = html;

  // Tables → markdown tables
  md = md.replace(/<table[\s\S]*?<\/table>/gi, match => {
    const rows = [];
    const rowRe = /<tr[\s\S]*?<\/tr>/gi;
    let rm;
    while ((rm = rowRe.exec(match)) !== null) {
      const cells = [];
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cm;
      while ((cm = cellRe.exec(rm[0])) !== null) {
        cells.push(cm[1].replace(/<[^>]+>/g, "").trim() || " ");
      }
      if (cells.length) rows.push(cells);
    }
    return rows.length ? "\n" + toMarkdownTable(rows) + "\n" : "";
  });

  // Headings
  md = md.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_, level, content) => "\n" + "#".repeat(+level) + " " + stripTags(content) + "\n");

  // Images → alt text note
  md = md.replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi,
    (_, alt) => alt ? `[Image: ${alt}]` : "[Image]");
  md = md.replace(/<img[^>]*>/gi, "[Image]");

  // Paragraphs / line breaks
  md = md.replace(/<\/p>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<li[^>]*>/gi, "\n- ").replace(/<\/li>/gi, "");

  // Strip remaining tags
  md = stripTags(md);
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

// Direct XML parser for DOCX (fallback)
function extractDocxXml(xml) {
  const parts = [];
  // Process top-level body children in order
  const bodyRe = /<w:body[\s>]([\s\S]*)<\/w:body>/;
  const bodyM  = bodyRe.exec(xml);
  const body   = bodyM ? bodyM[1] : xml;

  const blockRe = /<w:p[\s>][\s\S]*?<\/w:p>|<w:tbl[\s>][\s\S]*?<\/w:tbl>/g;
  let bm;
  while ((bm = blockRe.exec(body)) !== null) {
    const block = bm[0];
    if (block.startsWith("<w:tbl")) {
      const table = extractXmlTable(block);
      if (table) parts.push(table);
    } else {
      // Paragraph — check for images
      if (block.includes("<wp:docPr") || block.includes("<a:blip")) {
        const altM = block.match(/descr="([^"]+)"/);
        parts.push(altM ? `[Image: ${altM[1]}]` : "[Image]");
      }
      // Extract text runs
      const runs = [];
      const tRe  = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let tm;
      while ((tm = tRe.exec(block)) !== null) {
        const t = xmlDec(tm[1]);
        if (t.trim()) runs.push(t);
      }
      const line = runs.join("").trim();
      if (line) parts.push(line);
    }
  }
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ═══════════════════════════════════════════════════════════════════
// XLSX EXTRACTOR
// Outputs a proper markdown table per sheet
// ═══════════════════════════════════════════════════════════════════
async function extractXlsx(buf) {
  const zip = await JSZip.loadAsync(buf);

  // Load shared strings
  const ssXml  = await zip.files["xl/sharedStrings.xml"]?.async("string") ?? "";
  const shared = [];
  const siRe   = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(ssXml)) !== null) {
    // Concatenate all <t> runs in the <si>
    const parts = [];
    const tRe   = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let tm;
    while ((tm = tRe.exec(m[1])) !== null) parts.push(xmlDec(tm[1]));
    shared.push(parts.join(""));
  }

  // Find all sheets
  const workbookXml = await zip.files["xl/workbook.xml"]?.async("string") ?? "";
  const sheetNames  = [];
  const snRe = /<sheet [^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/g;
  while ((m = snRe.exec(workbookXml)) !== null) {
    sheetNames.push({ name: m[1], rid: m[2] });
  }

  // Load workbook rels to map rId → file path
  const relsXml = await zip.files["xl/_rels/workbook.xml.rels"]?.async("string") ?? "";
  const relsMap = {};
  const relRe   = /<Relationship[^>]*Id="([^"]*)"[^>]*Target="([^"]*)"/g;
  while ((m = relRe.exec(relsXml)) !== null) relsMap[m[1]] = m[2];

  const results = [];

  for (const sheet of sheetNames) {
    const target = relsMap[sheet.rid];
    if (!target) continue;
    const path     = target.startsWith("xl/") ? target : "xl/" + target;
    const sheetXml = await zip.files[path]?.async("string") ?? "";
    if (!sheetXml) continue;

    // Build a sparse grid from cell addresses
    const grid   = {};
    let maxRow = 0, maxCol = 0;

    const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g;
    while ((m = cellRe.exec(sheetXml)) !== null) {
      const col    = colLetterToNum(m[1]);
      const row    = parseInt(m[2]);
      const attrs  = m[3];
      const inner  = m[4];
      const t      = attrs.match(/t="([^"]*)"/)?.[1];
      const vMatch = inner.match(/<v>([\s\S]*?)<\/v>/);
      let   val    = "";
      if (vMatch) {
        val = t === "s" ? (shared[+vMatch[1]] ?? vMatch[1])
            : t === "b" ? (vMatch[1] === "1" ? "TRUE" : "FALSE")
            : vMatch[1];
      }
      // Inline string <is><t>
      const isMatch = inner.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/);
      if (isMatch) val = xmlDec(isMatch[1]);

      if (!grid[row]) grid[row] = {};
      grid[row][col] = xmlDec(val);
      if (row > maxRow) maxRow = row;
      if (col > maxCol) maxCol = col;
    }

    if (!maxRow) continue;

    // Convert sparse grid → 2D array
    const rows = [];
    for (let r = 1; r <= maxRow; r++) {
      const row = [];
      for (let c = 1; c <= maxCol; c++) {
        row.push(grid[r]?.[c] ?? "");
      }
      // Skip completely empty rows
      if (row.some(v => v !== "")) rows.push(row);
    }

    if (!rows.length) continue;
    const table = toMarkdownTable(rows);
    results.push(`### Sheet: ${sheet.name}\n\n${table}`);
  }

  if (!results.length) throw new Error("No data found in spreadsheet");
  return results.join("\n\n");
}

function colLetterToNum(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n;
}

// ═══════════════════════════════════════════════════════════════════
// PDF EXTRACTOR via PDF.js
// Reconstructs table structure from x/y position data
// ═══════════════════════════════════════════════════════════════════
async function extractPdf(buf) {
  if (typeof pdfjsLib === "undefined")
    throw new Error("PDF.js failed to load");

  const pdf   = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    // Send progress to popup
    try {
      chrome.runtime.sendMessage({
        type:  "EXTRACT_PROGRESS",
        pct:   Math.round((i / pdf.numPages) * 100),
        label: `Reading page ${i} of ${pdf.numPages}…`
      });
    } catch {}

    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items   = content.items.filter(it => it.str !== undefined && it.str.trim() !== "");

    if (!items.length) continue;

    // Group items into rows by Y position (rounded to nearest 3px)
    const rowMap = {};
    for (const item of items) {
      const y = Math.round(item.transform[5] / 3) * 3;
      const x = item.transform[4];
      if (!rowMap[y]) rowMap[y] = [];
      rowMap[y].push({ x, text: item.str.trim() });
    }

    const ys = Object.keys(rowMap).map(Number).sort((a, b) => b - a); // top → bottom

    // Detect if page looks like a table:
    // A table has many rows with the same number of columns
    const rowArrays = ys.map(y => rowMap[y].sort((a, b) => a.x - b.x));
    const colCounts = rowArrays.map(r => r.length);
    const maxCols   = Math.max(...colCounts);
    const tableRows = rowArrays.filter(r => r.length >= 2 && r.length >= maxCols * 0.6);

    // If most rows have consistent column counts, render as markdown table
    if (maxCols >= 2 && tableRows.length >= 3 && tableRows.length / rowArrays.length > 0.5) {
      const mdRows = tableRows.map(r => r.map(c => c.text));
      pages.push(`[Page ${i}]\n${toMarkdownTable(mdRows)}`);
    } else {
      // Regular text — join by line
      const lines = rowArrays.map(row => row.map(c => c.text).join("  "));
      pages.push(`[Page ${i}]\n${lines.join("\n")}`);
    }
  }

  if (!pages.length) throw new Error("No text found in PDF (may be a scanned/image-only PDF).");
  return pages.join("\n\n");
}

// ── Shared helpers ────────────────────────────────────────────────
function xmlDec(s) {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, "");
}

// xmlToText kept for XLSX sharedStrings fallback
function xmlToText(xml) {
  let out = "";
  let m;
  const tRe = /<[aw]:t[^>]*>([\s\S]*?)<\/[aw]:t>/g;
  while ((m = tRe.exec(xml)) !== null) out += xmlDec(m[1]) + " ";
  if (!out.trim()) out = xml.replace(/<[^>]+>/g, " ");
  return out.replace(/\s{2,}/g, " ").trim();
}
