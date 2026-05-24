// popup.js — StudyFlow v13


// ── DOM refs ──────────────────────────────────────────────────────
const inputTextEl    = document.getElementById("inputText");
const runBtn         = document.getElementById("runBtn");
const statusEl       = document.getElementById("status");
const outputEl       = document.getElementById("output");
const outputWrap     = document.getElementById("output-wrap");
const detectBadge    = document.getElementById("detect-badge");
const useSelBtn      = document.getElementById("use-sel-btn");
const filesList      = document.getElementById("files-list");
const filesCount     = document.getElementById("files-count");
const noFilesNote    = document.getElementById("no-files-note");
const extractStatus  = document.getElementById("extract-status");
const progressWrap   = document.getElementById("progress-wrap");
const progressLabel  = document.getElementById("progress-label");
const progressBar    = document.getElementById("progress-bar");
const copyBtn        = document.getElementById("copy-btn");
const saveHistBtn    = document.getElementById("save-hist-btn");

// Settings
const settingsBtn    = document.getElementById("settings-btn");
const settingsPanel  = document.getElementById("settings-panel");
const modelSelect    = document.getElementById("model-select");
const refreshModels  = document.getElementById("refresh-models-btn");
const notionTokEl    = document.getElementById("notion-token-input");
const saveSettingsBtn= document.getElementById("save-settings-btn");
const settingsMsg    = document.getElementById("settings-msg");
const subjectsList   = document.getElementById("subjects-list");
const newSubjName    = document.getElementById("new-subj-name");
const newSubjId      = document.getElementById("new-subj-id");
const addSubjBtn     = document.getElementById("add-subj-btn");

// History
const historyBtn     = document.getElementById("history-btn");
const historyPanel   = document.getElementById("history-panel");
const historyList    = document.getElementById("history-list");
const historyEmpty   = document.getElementById("history-empty");
const clearHistBtn   = document.getElementById("clear-history-btn");

// Notion
const subjectSel     = document.getElementById("subject-sel");
const notionTitleEl  = document.getElementById("notion-title-input");
const saveNotionBtn  = document.getElementById("saveNotionBtn");
const tokenWarning   = document.getElementById("token-warning");

// Study mode
const studyWrap      = document.getElementById("study-wrap");
const studyProgFill  = document.getElementById("study-prog-fill");
const studyProgLabel = document.getElementById("study-prog-label");
const scoreCorrect   = document.getElementById("score-correct");
const scoreWrong     = document.getElementById("score-wrong");
const scoreRemaining = document.getElementById("score-remaining");
const studyQNum      = document.getElementById("study-q-num");
const studyQText     = document.getElementById("study-q-text");
const studyAnswer    = document.getElementById("study-answer");
const checkBtn       = document.getElementById("check-btn");
const skipBtn        = document.getElementById("skip-btn");
const studyFeedback  = document.getElementById("study-feedback");
const feedbackGrade  = document.getElementById("feedback-grade");
const feedbackText   = document.getElementById("feedback-text");
const feedbackModel  = document.getElementById("feedback-model-answer");
const nextBtn        = document.getElementById("next-btn");
const studyComplete  = document.getElementById("study-complete");
const retryAllBtn    = document.getElementById("retry-all-btn");
const retryWrongBtn  = document.getElementById("retry-wrong-btn");
const studyBackBtn   = document.getElementById("study-back-btn");

// Flashcard mode
const flashWrap      = document.getElementById("flash-wrap");
const flashProgFill  = document.getElementById("flash-prog-fill");
const flashProgLabel = document.getElementById("flash-prog-label");
const flashCard      = document.getElementById("flash-card");
const flashFrontText = document.getElementById("flash-front-text");
const flashBackText  = document.getElementById("flash-back-text");
const flashKnew      = document.getElementById("flash-knew");
const flashFlip      = document.getElementById("flash-flip");
const flashDidnt     = document.getElementById("flash-didnt");
const flashComplete  = document.getElementById("flash-complete");
const flashCompSub   = document.getElementById("flash-complete-sub");
const flashRetryAll  = document.getElementById("flash-retry-all");
const flashRetryWrong= document.getElementById("flash-retry-wrong"); // FIX: was missing
const flashBackBtn   = document.getElementById("flash-back-btn");

const KIND_ICON = {
  document:"📄", presentation:"📊", spreadsheet:"📋",
  video:"🎬", audio:"🎵", image:"🖼️", archive:"🗜️", code:"💻"
};

// ── State ─────────────────────────────────────────────────────────
let currentMode       = "summary";
let savedModel        = "";
let savedNotionToken  = "";
let savedSubjects     = [];
let savedAnkiDeck     = ""; // FIX: was assigned but never declared
let lastExtractedName = "";

// Study session state
let studyQuestions = []; // [{q, a}]
let studyQueue     = []; // indices into studyQuestions
let studyCurrent   = 0;  // position in studyQueue
let studyResults   = []; // "correct"|"partial"|"wrong"|"skip" per queue position

// Flashcard state
let flashCards    = [];
let flashQueue    = [];
let flashIdx      = 0;
let flashKnewSet  = [];
let flashDidntSet = [];
let flashFlipped  = false;

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  updateRunLabel();
  checkTokenWarning();
  renderSubjectDropdown();
  setupModeBtns();
  await pollSelection();
  await scanPageFiles();
  window.addEventListener("focus", pollSelection);

  // Listen for SPA navigations reported by content.js
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "PAGE_NAVIGATED") scanPageFiles();
  });

  const { autoMode } = await chrome.storage.session.get("autoMode").catch(() => ({}));
  if (autoMode) {
    await chrome.storage.session.remove("autoMode");
    const { selectedText } = await chrome.storage.session.get("selectedText").catch(() => ({}));
    if (selectedText) {
      inputTextEl.value = selectedText;
      if (autoMode === "explain") {
        runWithPrompt({
          system: "You are a tutor. Explain clearly and simply.",
          prompt: "Explain this:\n\n" + selectedText
        }, "Explain");
      } else if (autoMode === "summary") {
        selectMode("summary");
        runBtn.click();
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════
async function loadSettings() {
  const d = await chrome.storage.local.get(["ollamaModel", "notionToken", "subjects", "ankiDeck"]);
  savedModel       = d.ollamaModel || "";
  savedNotionToken = d.notionToken || "";
  savedSubjects    = d.subjects    || [];
  savedAnkiDeck    = d.ankiDeck    || "";
  notionTokEl.value = savedNotionToken;
  renderSubjectsEditor();
  await loadModelsFromOllama(savedModel);
}

async function saveSettings() {
  savedModel       = modelSelect.value;
  savedNotionToken = notionTokEl.value.trim();
  await chrome.storage.local.set({
    ollamaModel:  savedModel,
    notionToken:  savedNotionToken,
    subjects:     savedSubjects,
    ankiDeck:     savedAnkiDeck
  });
  updateRunLabel();
  checkTokenWarning();
  renderSubjectDropdown();
  settingsMsg.style.display = "inline";
  setTimeout(() => { settingsMsg.style.display = "none"; }, 2000);
}

settingsBtn.addEventListener("click", () => {
  const open = togglePanel("settings-panel");
  settingsBtn.classList.toggle("active", open);
  historyBtn.classList.remove("active");
  if (open) loadModelsFromOllama(savedModel);
});

historyBtn.addEventListener("click", () => {
  const open = togglePanel("history-panel");
  historyBtn.classList.toggle("active", open);
  settingsBtn.classList.remove("active");
  if (open) renderHistory();
});

function togglePanel(id) {
  const p   = document.getElementById(id);
  const was = p.classList.contains("open");
  document.querySelectorAll(".tab-panel").forEach(x => {
    x.classList.remove("open");
    x.style.display = "none";
  });
  if (!was) {
    p.classList.add("open");
    p.style.display = id === "history-panel" ? "flex" : "block";
    return true;
  }
  return false;
}

saveSettingsBtn.addEventListener("click", saveSettings);
refreshModels.addEventListener("click", () => loadModelsFromOllama(modelSelect.value));

async function loadModelsFromOllama(sel = "") {
  try {
    const r  = await fetch("http://localhost:11434/api/tags");
    if (!r.ok) throw new Error("not ok");
    const ms = (await r.json()).models?.map(m => m.name).filter(Boolean) || [];
    modelSelect.innerHTML = "";
    if (!ms.length) {
      addOpt(modelSelect, "", "— no models (is Ollama running?) —");
    } else {
      ms.forEach(n => addOpt(modelSelect, n, n));
      if (sel && ms.includes(sel)) modelSelect.value = sel;
    }
  } catch {
    modelSelect.innerHTML = "";
    addOpt(modelSelect, "", "— Ollama not reachable —");
  }
}

function renderSubjectsEditor() {
  subjectsList.innerHTML = "";
  savedSubjects.forEach((s, i) => {
    const r = document.createElement("div");
    r.className = "subject-row";
    r.innerHTML = `<input type="text" value="${escHtml(s.name)}" data-i="${i}" data-f="name" placeholder="Name"/>
      <input type="text" value="${escHtml(s.id)}" data-i="${i}" data-f="id" placeholder="Page ID" style="flex:1.2"/>
      <button class="del-btn" data-i="${i}">✕</button>`;
    r.querySelectorAll("input").forEach(inp =>
      inp.addEventListener("input", e => {
        savedSubjects[+e.target.dataset.i][e.target.dataset.f] = e.target.value.trim();
      })
    );
    r.querySelector(".del-btn").addEventListener("click", e => {
      savedSubjects.splice(+e.target.dataset.i, 1);
      renderSubjectsEditor();
    });
    subjectsList.appendChild(r);
  });
}

addSubjBtn.addEventListener("click", () => {
  const name = newSubjName.value.trim();
  const id   = newSubjId.value.trim().replace(/-/g, "").slice(-32);
  if (!name || !id) { alert("Enter both name and page ID."); return; }
  savedSubjects.push({ name, id });
  newSubjName.value = "";
  newSubjId.value   = "";
  renderSubjectsEditor();
});

function renderSubjectDropdown() {
  subjectSel.innerHTML = '<option value="">-- Select subject --</option>';
  savedSubjects.forEach(s => addOpt(subjectSel, s.id, s.name));
}

function addOpt(sel, val, label) {
  const o = document.createElement("option");
  o.value = val; o.textContent = label;
  sel.appendChild(o);
}

function currentModel() { return modelSelect.value || savedModel || "gemma3:1b"; }
function updateRunLabel() { runBtn.textContent = `▶ Run with ${savedModel || "Ollama"}`; }
function checkTokenWarning() { tokenWarning.style.display = savedNotionToken ? "none" : "block"; }

// ═══════════════════════════════════════════════════════════════════
// MODE BUTTONS
// ═══════════════════════════════════════════════════════════════════
function setupModeBtns() {
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => selectMode(btn.dataset.mode));
  });
}

function selectMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.mode === mode)
  );
  const labels = {
    summary:         "▶ Generate Summary",
    short_questions: "▶ Generate Short Questions",
    open_questions:  "▶ Generate Open Questions",
    exam_questions:  "▶ Generate Exam Questions",
    hints:           "▶ Generate Hints",
    study:           "🧠 Start Study Session",
    flashcards:      "🃏 Generate Flashcards",
    feynman:         "🎓 Start Feynman Session"
  };
  runBtn.textContent   = labels[mode] || "▶ Generate";
  runBtn.style.background = mode === "study"      ? "#d97706"
                          : mode === "flashcards"  ? "#059669"
                          : mode === "feynman"     ? "#4f46e5"
                          : "#4f46e5";
}

// ═══════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════
async function loadHistory()  { return (await chrome.storage.local.get("history")).history || []; }

async function saveHistEntry(e) {
  const h = await loadHistory();
  h.unshift(e);
  if (h.length > 50) h.splice(50);
  await chrome.storage.local.set({ history: h });
}

async function renderHistory() {
  const h = await loadHistory();
  historyList.innerHTML = "";
  historyEmpty.style.display  = h.length ? "none" : "block";
  clearHistBtn.style.display  = h.length ? "block" : "none";
  h.forEach(item => {
    const el   = document.createElement("div");
    el.className = "hist-item";
    const date = new Date(item.ts).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
    el.innerHTML = `<div class="hist-header">
        <span class="hist-title">${escHtml(item.title)}</span>
        <button class="hist-del" data-id="${item.id}">✕</button>
      </div>
      <div class="hist-meta">${escHtml(item.mode)} · ${date}</div>
      <div class="hist-preview">${escHtml(item.output.slice(0, 120))}…</div>`;
    el.addEventListener("click", e => {
      if (e.target.classList.contains("hist-del")) return;
      outputEl.textContent     = item.output;
      outputWrap.style.display = "block";
      togglePanel("");
      historyBtn.classList.remove("active");
    });
    el.querySelector(".hist-del").addEventListener("click", async e => {
      e.stopPropagation();
      const h2 = await loadHistory();
      await chrome.storage.local.set({ history: h2.filter(x => x.id !== item.id) });
      renderHistory();
    });
    historyList.appendChild(el);
  });
}

clearHistBtn.addEventListener("click", async () => {
  if (!confirm("Clear all history?")) return;
  await chrome.storage.local.set({ history: [] });
  renderHistory();
});

saveHistBtn.addEventListener("click", async () => {
  const out = outputEl.textContent.trim();
  if (!out) return;
  const course    = await getPageTitle();
  const modeLabel = document.querySelector(".mode-btn.active")?.textContent?.trim() || currentMode;
  await saveHistEntry({
    id: Date.now().toString(), ts: Date.now(),
    title: `${modeLabel} — ${lastExtractedName || course}`,
    mode: modeLabel, course, output: out
  });
  saveHistBtn.textContent = "✓ Saved";
  setTimeout(() => { saveHistBtn.textContent = "💾 Save"; }, 1500);
});

// ── Helper: get page title without any institution name ───────────
async function getPageTitle() {
  try {
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    // Strip everything after the last | or — to remove institution names
    return t?.title?.replace(/\s*[|—].*$/, "").trim() || "Canvas";
  } catch {
    return "Canvas";
  }
}

// ═══════════════════════════════════════════════════════════════════
// SELECTION + FILE SCANNING
// ═══════════════════════════════════════════════════════════════════
async function pollSelection() {
  let text = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // FIX: works on any *.instructure.com, not just one institution
    if (tab?.id && tab.url?.includes(".instructure.com")) {
      const r = await chrome.tabs.sendMessage(tab.id, { type: "GET_SELECTION" }).catch(() => null);
      text = r?.text ?? "";
    }
  } catch {}
  if (!text) {
    const { selectedText } = await chrome.storage.session.get("selectedText").catch(() => ({}));
    text = selectedText ?? "";
  }
  detectBadge.textContent = text ? `Selected: ${text.length} chars` : "No selection";
  detectBadge.className   = text ? "has-sel" : "no-sel";
  useSelBtn.disabled      = !text;
  if (text) useSelBtn.onclick = () => { inputTextEl.value = text; inputTextEl.focus(); };
}

async function scanPageFiles() {
  filesCount.textContent = "scanning…";
  filesList.innerHTML    = "";
  noFilesNote.style.display = "none";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // FIX: works on any *.instructure.com
    if (!tab?.id || !tab.url?.includes(".instructure.com")) {
      filesCount.textContent = "(not on Canvas)";
      return;
    }
    const resp  = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_FILES" }).catch(() => null);
    const files = resp?.files ?? [];
    if (!files.length) {
      filesCount.textContent    = "0";
      noFilesNote.style.display = "inline";
      return;
    }
    filesCount.textContent = files.length;
    files.forEach(f => renderChip(f));
  } catch {
    filesCount.textContent = "unavailable";
  }
}

function renderChip(file) {
  const chip = document.createElement("span");
  chip.className = "file-chip";
  chip.title     = file.url;
  chip.innerHTML = `<span>${KIND_ICON[file.kind] ?? "📎"}</span>${escHtml(file.name)}`;

  chip.addEventListener("click", async () => {
    if (chip.classList.contains("extracting")) return;

    // Deselect
    if (chip.classList.contains("selected")) {
      chip.classList.remove("selected");
      const marker = `\n\n--- ${file.name} ---\n`;
      const idx    = inputTextEl.value.indexOf(marker);
      if (idx !== -1) {
        const next = inputTextEl.value.indexOf("\n\n--- ", idx + marker.length);
        inputTextEl.value = next !== -1
          ? inputTextEl.value.slice(0, idx) + inputTextEl.value.slice(next)
          : inputTextEl.value.slice(0, idx);
      }
      return;
    }

    chip.classList.add("extracting");
    showExtractStatus(`⏳ Extracting "${file.name}"…`);
    showProgress(0, "Starting…");
    try {
      const text = await extractFileText(file);
      if (!text?.trim()) {
        showExtractStatus(`⚠️ No text in "${file.name}"`);
        chip.classList.remove("extracting");
        hideProgress();
        return;
      }
      chip.classList.remove("extracting");
      chip.classList.add("selected");
      inputTextEl.value = (inputTextEl.value + `\n\n--- ${file.name} ---\n${text.trim()}`).trim();
      lastExtractedName = file.name.replace(/\.[^.]+$/, "");
      notionTitleEl.placeholder = lastExtractedName || "Title";
      showExtractStatus(`✓ Extracted ${text.length.toLocaleString()} chars`);
      hideProgress();
      setTimeout(hideExtractStatus, 3000);
    } catch (err) {
      chip.classList.remove("extracting");
      hideProgress();
      showExtractStatus(`❌ ${err.message}`);
    }
  });

  filesList.appendChild(chip);
}

function showProgress(pct, label) {
  progressWrap.style.display = "flex";
  progressLabel.textContent  = label;
  progressBar.style.width    = `${Math.min(100, pct)}%`;
}
function hideProgress()      { progressWrap.style.display = "none"; progressBar.style.width = "0%"; }
function showExtractStatus(m){ extractStatus.textContent = m; extractStatus.style.display = "block"; }
function hideExtractStatus() { extractStatus.style.display = "none"; }

async function extractFileText(file) {
  if (file.kind === "video" || file.kind === "audio") {
    return `[${file.kind === "video" ? "🎬 Video" : "🎵 Audio"}: ${file.name}]\nURL: ${file.url}\n\nNote: Ollama cannot watch/listen to files. Watch it and paste your notes here.`;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active Canvas tab.");

  showProgress(15, "Resolving file URL…");
  const resolved = await chrome.tabs.sendMessage(tab.id, { type: "RESOLVE_URL", url: file.url })
    .catch(() => { throw new Error("Content script not ready — refresh Canvas page."); });
  if (!resolved?.ok) throw new Error(resolved?.error || "Could not resolve URL");

  showProgress(35, "Downloading…");
  const listener = msg => { if (msg.type === "EXTRACT_PROGRESS") showProgress(35 + msg.pct * 0.6, msg.label); };
  chrome.runtime.onMessage.addListener(listener);

  try {
    const result = await chrome.runtime.sendMessage({
      type: "BG_EXTRACT", url: resolved.url, filename: file.name, kind: file.kind
    }).catch(e => { throw new Error("Background error: " + e.message); });
    if (!result?.ok) throw new Error(result?.error || "Extraction failed");
    showProgress(100, "Done!");
    return result.text;
  } finally {
    chrome.runtime.onMessage.removeListener(listener);
  }
}

// ═══════════════════════════════════════════════════════════════════
// OLLAMA API  — FIX: was commented out, nothing could run
// ═══════════════════════════════════════════════════════════════════
async function callOllama({ system, prompt }, model) {
  const body = {
    model,
    prompt,
    stream:  false,
    options: { temperature: 0.4, num_predict: 2048 }
  };
  if (system) body.system = system;

  const res = await fetch("http://localhost:11434/api/generate", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status} — is Ollama running?`);
  return (await res.json()).response;
}

// ── JSON parser (handles markdown fences) ────────────────────────
function parseJsonResponse(raw) {
  let text = raw.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i,     "")
    .replace(/\s*```$/,      "")
    .trim();
  const start = text.indexOf("[");
  const end   = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in response");
  return JSON.parse(text.slice(start, end + 1));
}

// ── Parse single-object JSON response (for answer evaluation) ────
function parseSingleObject(raw) {
  let text = raw.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i,     "")
    .replace(/\s*```$/,      "")
    .trim();
  // Try as array first, then as plain object
  try {
    const arr = JSON.parse(text.startsWith("[") ? text : `[${text}]`);
    return Array.isArray(arr) ? arr[0] : arr;
  } catch {
    const start = text.indexOf("{");
    const end   = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON object in response");
    return JSON.parse(text.slice(start, end + 1));
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RUN BUTTON
// ═══════════════════════════════════════════════════════════════════
runBtn.addEventListener("click", async () => {
  const text = inputTextEl.value.trim();
  if (!text) { statusEl.textContent = "Please add some text first."; return; }

  outputWrap.style.display  = "none";
  studyWrap.style.display   = "none";
  flashWrap.style.display   = "none";
  document.getElementById("feynman-wrap").style.display = "none";
  outputEl.textContent      = "";
  statusEl.textContent      = "";

  if (currentMode === "study")      { await startStudySession(text);     }
  else if (currentMode === "flashcards") { await startFlashcardSession(text); }
  else if (currentMode === "feynman")    { await startFeynmanSession(text);   }
  else {
    const modeLabel = document.querySelector(".mode-btn.active")?.textContent?.trim() || currentMode;
    await runWithPrompt(buildPrompt(currentMode, text), modeLabel);
  }
});

async function runWithPrompt({ system, prompt }, modeLabel) {
  const model    = currentModel();
  const origText = runBtn.textContent;
  runBtn.disabled    = true;
  runBtn.textContent = "Running…";
  statusEl.textContent = `Sending to ${model}…`;
  try {
    const response       = await callOllama({ system, prompt }, model);
    outputEl.textContent     = response || "(No response)";
    outputWrap.style.display = "block";
    statusEl.textContent     = "✓ Done.";
    const course = await getPageTitle();
    await saveHistEntry({
      id: Date.now().toString(), ts: Date.now(),
      title: `${modeLabel} — ${lastExtractedName || course}`,
      mode: modeLabel, course, output: response
    });
  } catch (err) {
    statusEl.textContent = "Error: " + (err.message || "Could not reach Ollama.");
  } finally {
    runBtn.disabled    = false;
    runBtn.textContent = origText;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════
function buildPrompt(mode, text) {
  const MAX  = 5000;
  const body = text.length > MAX ? text.slice(0, MAX) + "\n\n[Content truncated]" : text;
  switch (mode) {
    case "summary": return {
      system: "You are a university study assistant. Summarise study material into bullet points grouped by topic. Never repeat the input. Just write the summary.",
      prompt: "Summarise the following study material into clear bullet points grouped by topic:\n\n" + body
    };
    case "short_questions": return {
      system: "You are a quiz maker. Output exactly this format:\nQ1: [question]\n...up to Q10.\nNever write an introduction. Start with Q1.",
      prompt: "Write 10 short-answer quiz questions with no answers based on:\n\n" + body
    };
    case "open_questions": return {
      system: "You are a university lecturer. Output a numbered list 1 to 6. No answers, no introduction. Start with '1.'",
      prompt: "Write 6 open-ended critical thinking questions about:\n\n" + body
    };
    case "exam_questions": return {
      system: "You are an exam writer. Output only the exam:\nSECTION A - Multiple Choice (4 questions, options A B C D, correct marked)\nSECTION B - Short Answer (3 questions with model answers)\nSECTION C - Essay (1 question with bullet-point model answer)\nNo introduction.",
      prompt: "Create a university exam based on:\n\n" + body
    };
    case "hints": return {
      system: "You are a tutor. Respond in exactly this structure:\nKEY CONCEPTS (bullet list of 5 most important ideas)\nWATCH OUT FOR (2-3 common mistakes)\nMEMORY TRICKS (mnemonics or tips)\nIN PLAIN ENGLISH (one short paragraph)\nStart with KEY CONCEPTS. No introduction.",
      prompt: "Give study hints for:\n\n" + body
    };
    default: return { system: "", prompt: body };
  }
}

function buildStudyPrompt(text) {
  const body = text.length > 5000 ? text.slice(0, 5000) + "\n\n[truncated]" : text;
  return {
    system: "You are a university exam maker. Generate exactly 6 study questions with model answers.\n" +
            "Output ONLY valid JSON — no explanation, no markdown, no extra text.\n" +
            "Format: [{\"q\":\"question text\",\"a\":\"model answer text\"}, ...]\n" +
            "Questions should test understanding, not just recall. Mix factual and analytical questions.",
    prompt: "Generate 6 study questions with model answers for this content. Output only JSON:\n\n" + body
  };
}

function buildFlashcardPrompt(text) {
  const body = text.length > 5000 ? text.slice(0, 5000) + "\n\n[truncated]" : text;
  return {
    system: "You are a flashcard creator. Generate 12 Anki flashcard pairs.\n" +
            "Output ONLY valid JSON — no markdown, no explanation.\n" +
            "Format: [{\"front\":\"question or term\",\"back\":\"answer or definition\"}, ...]\n" +
            "Keep fronts short (one concept per card). Backs should be concise but complete.",
    prompt: "Create 12 Anki flashcards for this content. Output only JSON:\n\n" + body
  };
}

// ═══════════════════════════════════════════════════════════════════
// STUDY MODE
// ═══════════════════════════════════════════════════════════════════
async function startStudySession(text) {
  const model    = currentModel();
  const origText = runBtn.textContent;
  runBtn.disabled    = true;
  runBtn.textContent = "Generating questions…";
  statusEl.textContent = `Asking ${model} to create study questions…`;
  try {
    const raw = await callOllama(buildStudyPrompt(text), model);
    studyQuestions = parseJsonResponse(raw);
    if (!studyQuestions.length) throw new Error("No questions generated");
    beginStudyRound(studyQuestions.map((_, i) => i));
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "Error generating questions: " + err.message;
  } finally {
    runBtn.disabled    = false;
    runBtn.textContent = origText;
  }
}

function beginStudyRound(queue) {
  studyQueue   = [...queue];
  studyCurrent = 0;
  studyResults = new Array(studyQueue.length).fill(null);

  studyComplete.style.display   = "none";
  studyFeedback.style.display   = "none";
  nextBtn.style.display         = "none";
  studyAnswer.style.display     = "";
  checkBtn.style.display        = "";
  skipBtn.style.display         = "";
  studyWrap.style.display       = "block";
  studyAnswer.value             = "";

  updateStudyProgress();
  showStudyQuestion();
}

function showStudyQuestion() {
  if (studyCurrent >= studyQueue.length) { showStudyComplete(); return; }
  const q = studyQuestions[studyQueue[studyCurrent]];
  studyQNum.textContent       = `Question ${studyCurrent + 1} of ${studyQueue.length}`;
  studyQText.textContent      = q.q;
  studyAnswer.value           = "";
  studyFeedback.style.display = "none";
  nextBtn.style.display       = "none";
  studyAnswer.disabled        = false;
  checkBtn.disabled           = false;
  studyAnswer.focus();
  updateStudyProgress();
}

function updateStudyProgress() {
  const done     = studyResults.filter(Boolean).length;
  const correct  = studyResults.filter(r => r === "correct").length;
  const wrong    = studyResults.filter(r => r === "wrong" || r === "partial").length;
  const pct      = studyQueue.length ? (done / studyQueue.length) * 100 : 0;
  studyProgFill.style.width  = `${pct}%`;
  studyProgLabel.textContent = `${done} / ${studyQueue.length}`;
  scoreCorrect.textContent   = correct;
  scoreWrong.textContent     = wrong;
  scoreRemaining.textContent = studyQueue.length - done;
}

checkBtn.addEventListener("click", async () => {
  const userAnswer = studyAnswer.value.trim();
  if (!userAnswer) { studyAnswer.focus(); return; }

  checkBtn.disabled    = true;
  checkBtn.textContent = "Checking…";

  const q = studyQuestions[studyQueue[studyCurrent]];
  try {
    const raw    = await callOllama({
      system: "You are a strict but fair university examiner. Evaluate the student's answer.\n" +
              "Reply with ONLY a JSON array containing one object: [{\"grade\":\"correct\"|\"partial\"|\"wrong\", \"feedback\":\"one sentence\", \"missing\":\"what was missing or empty string\"}]\n" +
              "correct = fully right. partial = mostly right but missing something. wrong = incorrect or too vague.",
      prompt: `Question: ${q.q}\n\nModel answer: ${q.a}\n\nStudent answer: ${userAnswer}\n\nEvaluate and reply with JSON only.`
    }, currentModel());

    // FIX: use parseSingleObject instead of fragile string manipulation
    const result = parseSingleObject(raw);
    const grade  = result.grade || "wrong";
    studyResults[studyCurrent] = grade;

    studyFeedback.className     = grade;
    studyFeedback.style.display = "block";
    const gradeEmoji = { correct: "✅ Correct!", partial: "⚠️ Partially correct", wrong: "❌ Incorrect" };
    feedbackGrade.textContent   = gradeEmoji[grade] || grade;
    feedbackText.textContent    = result.feedback || "";
    feedbackModel.textContent   = q.a;
    studyAnswer.disabled        = true;
    nextBtn.style.display       = "block";
    updateStudyProgress();

  } catch {
    // Fallback: show model answer
    studyResults[studyCurrent]  = "skip";
    studyFeedback.className     = "partial";
    studyFeedback.style.display = "block";
    feedbackGrade.textContent   = "⚠️ Could not evaluate — here is the model answer";
    feedbackText.textContent    = "";
    feedbackModel.textContent   = q.a;
    studyAnswer.disabled        = true;
    nextBtn.style.display       = "block";
    updateStudyProgress();
  }

  checkBtn.textContent = "✓ Check my answer";
  checkBtn.disabled    = false;
});

skipBtn.addEventListener("click", () => {
  studyResults[studyCurrent] = "skip";
  studyCurrent++;
  updateStudyProgress();
  showStudyQuestion();
});

nextBtn.addEventListener("click", () => {
  studyCurrent++;
  showStudyQuestion();
});

function showStudyComplete() {
  studyComplete.style.display = "block";
  studyFeedback.style.display = "none";
  nextBtn.style.display       = "none";
  studyAnswer.style.display   = "none";
  checkBtn.style.display      = "none";
  skipBtn.style.display       = "none";

  const correct = studyResults.filter(r => r === "correct").length;
  const wrong   = studyResults.filter(r => r === "wrong" || r === "partial").length;
  const skipped = studyResults.filter(r => r === "skip").length;
  const total   = studyQueue.length;
  const pct     = Math.round((correct / total) * 100);

  document.getElementById("complete-correct").textContent = correct;
  document.getElementById("complete-wrong").textContent   = wrong;
  document.getElementById("complete-skipped").textContent = skipped;

  const emoji    = pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "📚";
  const title    = pct >= 80 ? "Excellent work!" : pct >= 60 ? "Good effort!" : "Keep studying!";
  const subtitle = pct >= 80
    ? `You scored ${pct}% — you know this material well.`
    : pct >= 60
      ? `You scored ${pct}% — review the ones you missed.`
      : `You scored ${pct}% — try again after reviewing the content.`;

  document.getElementById("complete-emoji").textContent    = emoji;
  document.getElementById("complete-title").textContent    = title;
  document.getElementById("complete-subtitle").textContent = subtitle;

  retryWrongBtn.style.display = wrong > 0 || skipped > 0 ? "block" : "none";
}

retryAllBtn.addEventListener("click", () => {
  beginStudyRound(studyQuestions.map((_, i) => i));
});

retryWrongBtn.addEventListener("click", () => {
  // FIX: collect queue positions where result was wrong/partial/skip,
  // then map back to the original question indices
  const wrongIndices = studyQueue.filter((_, pos) =>
    studyResults[pos] === "wrong" ||
    studyResults[pos] === "partial" ||
    studyResults[pos] === "skip"
  );
  if (!wrongIndices.length) { alert("No wrong answers to retry!"); return; }
  beginStudyRound(wrongIndices);
});

studyBackBtn.addEventListener("click", () => {
  studyWrap.style.display   = "none";
  studyAnswer.style.display = "";
  checkBtn.style.display    = "";
  skipBtn.style.display     = "";
});

// ═══════════════════════════════════════════════════════════════════
// FEYNMAN MODE
// ═══════════════════════════════════════════════════════════════════
let feynmanTopics = [];
let feynmanIdx    = 0;

async function startFeynmanSession(text) {
  const origText         = runBtn.textContent;
  runBtn.disabled        = true;
  runBtn.textContent     = "Extracting topics…";
  statusEl.textContent   = "Identifying key topics…";
  try {
    const raw = await callOllama({
      system: "You are a curriculum expert. Extract key topics from study material.\nOutput ONLY valid JSON array: [{\"topic\":\"Name\",\"keyPoints\":\"2-3 sentence summary\"}]\nExtract 3-5 distinct teachable topics. No markdown, no explanation.",
      prompt: "Extract key topics from this content. JSON only:\n\n" + text.slice(0, 5000)
    }, currentModel());
    feynmanTopics = parseJsonResponse(raw);
    if (!feynmanTopics.length) throw new Error("No topics found");
    feynmanIdx             = 0;
    statusEl.textContent   = "";
    outputWrap.style.display  = "none";
    studyWrap.style.display   = "none";
    flashWrap.style.display   = "none";
    document.getElementById("feynman-wrap").style.display = "block";
    showFeynmanTopic();
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    runBtn.disabled    = false;
    runBtn.textContent = origText;
  }
}

function showFeynmanTopic() {
  if (feynmanIdx >= feynmanTopics.length) {
    document.getElementById("feynman-wrap").style.display = "none";
    outputEl.textContent = `🎓 Feynman Session Complete!\n\nYou worked through all ${feynmanTopics.length} topics.\n\nTopics where you scored below 6/10 are your weak spots — go back and re-read those sections, then try again.`;
    outputWrap.style.display = "block";
    return;
  }
  const t = feynmanTopics[feynmanIdx];
  document.getElementById("feynman-topic").textContent      = `Topic ${feynmanIdx + 1} of ${feynmanTopics.length}: ${t.topic}`;
  document.getElementById("feynman-answer").value           = "";
  document.getElementById("feynman-feedback").style.display = "none";
  // FIX: remove duplicate display:none — just hide correctly
  document.getElementById("feynman-next-row").style.display = "none";
  document.getElementById("feynman-answer").focus();
}

async function evaluateFeynman() {
  const explanation = document.getElementById("feynman-answer").value.trim();
  if (!explanation) return;
  const btn      = document.getElementById("feynman-check-btn");
  btn.disabled   = true;
  btn.textContent = "Evaluating…";
  const t = feynmanTopics[feynmanIdx];
  try {
    const feedback = await callOllama({
      system: "You are a Socratic university tutor using the Feynman technique.\nBe encouraging but honest — find GAPS in understanding.\nRespond in exactly this format:\n\nWHAT YOU GOT RIGHT\n[bullet list]\n\nGAPS IN YOUR EXPLANATION\n[bullet list of missing/unclear concepts — be specific]\n\nMISCONCEPTIONS\n[any incorrect statements, or 'None spotted']\n\nHOW TO IMPROVE\n[2-3 concrete suggestions]\n\nSCORE: [X/10]\n\nIf score >= 8 add: READY FOR NEXT TOPIC\nIf score < 6 add: TRY AGAIN BEFORE MOVING ON",
      prompt: `Topic: ${t.topic}\nWhat student should know: ${t.keyPoints}\nStudent's explanation:\n${explanation}\n\nEvaluate:`
    }, currentModel());

    const feedEl = document.getElementById("feynman-feedback");
    feedEl.textContent   = feedback;
    feedEl.style.display = "block";

    const scoreM = feedback.match(/SCORE:\s*(\d+)\s*\/\s*10/i);
    const score  = scoreM ? +scoreM[1] : 5;
    feedEl.style.background = score >= 8 ? "#d1fae5" : score >= 6 ? "#fef3c7" : "#fee2e2";
    feedEl.style.border     = score >= 8 ? "1.5px solid #6ee7b7" : score >= 6 ? "1.5px solid #fcd34d" : "1.5px solid #fca5a5";
    feedEl.style.color      = "#1f2937";

    const nextRow = document.getElementById("feynman-next-row");
    nextRow.style.display = "block";
    const nextBtn2 = document.getElementById("feynman-next-btn");
    if (nextBtn2) {
      nextBtn2.style.display = score >= 6 ? "block" : "none";
      nextBtn2.textContent   = feynmanIdx + 1 >= feynmanTopics.length ? "✓ Finish session" : "Next topic →";
    }
  } catch (err) {
    const feedEl = document.getElementById("feynman-feedback");
    feedEl.textContent      = "Error: " + err.message;
    feedEl.style.background = "#fee2e2";
    feedEl.style.border     = "1.5px solid #fca5a5";
    feedEl.style.display    = "block";
  }
  btn.disabled    = false;
  btn.textContent = "🎓 Evaluate my explanation";
}

// Feynman button listeners
window.addEventListener("load", () => {
  document.getElementById("feynman-check-btn")?.addEventListener("click", evaluateFeynman);
  document.getElementById("feynman-retry-btn")?.addEventListener("click", () => {
    document.getElementById("feynman-answer").value           = "";
    document.getElementById("feynman-feedback").style.display = "none";
    document.getElementById("feynman-next-row").style.display = "none";
    document.getElementById("feynman-answer").focus();
  });
  document.getElementById("feynman-next-btn")?.addEventListener("click", () => {
    feynmanIdx++;
    showFeynmanTopic();
  });
  document.getElementById("feynman-back-btn")?.addEventListener("click", () => {
    document.getElementById("feynman-wrap").style.display = "none";
  });
});

// ═══════════════════════════════════════════════════════════════════
// FLASHCARD MODE
// ═══════════════════════════════════════════════════════════════════
async function startFlashcardSession(text) {
  const model    = currentModel();
  const origText = runBtn.textContent;
  runBtn.disabled    = true;
  runBtn.textContent = "Generating flashcards…";
  statusEl.textContent = `Asking ${model} to create flashcards…`;
  try {
    const raw = await callOllama(buildFlashcardPrompt(text), model);
    flashCards = parseJsonResponse(raw);
    if (!flashCards.length) throw new Error("No flashcards generated");
    beginFlashRound(flashCards.map((_, i) => i));
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    runBtn.disabled    = false;
    runBtn.textContent = origText;
  }
}

function beginFlashRound(queue) {
  flashQueue    = [...queue];
  flashIdx      = 0;
  flashKnewSet  = [];
  flashDidntSet = [];
  flashFlipped  = false;

  flashComplete.style.display = "none";
  flashWrap.style.display     = "block";
  flashCard.classList.remove("flipped");
  showFlashCard();
}

function showFlashCard() {
  if (flashIdx >= flashQueue.length) { showFlashComplete(); return; }
  const card = flashCards[flashQueue[flashIdx]];
  flashFrontText.textContent = card.front;
  flashBackText.textContent  = card.back;
  flashCard.classList.remove("flipped");
  flashFlipped               = false;
  const pct = (flashIdx / flashQueue.length) * 100;
  flashProgFill.style.width  = `${pct}%`;
  flashProgLabel.textContent = `${flashIdx + 1} / ${flashQueue.length}`;
}

flashCard.addEventListener("click",  () => { flashFlipped = !flashFlipped; flashCard.classList.toggle("flipped", flashFlipped); });
flashFlip.addEventListener("click",  () => { flashFlipped = !flashFlipped; flashCard.classList.toggle("flipped", flashFlipped); });
flashKnew.addEventListener("click",  () => { flashKnewSet.push(flashQueue[flashIdx]);  flashIdx++; showFlashCard(); });
flashDidnt.addEventListener("click", () => { flashDidntSet.push(flashQueue[flashIdx]); flashIdx++; showFlashCard(); });

function showFlashComplete() {
  flashComplete.style.display = "block";
  const knew  = flashKnewSet.length;
  const didnt = flashDidntSet.length;
  const pct   = Math.round((knew / flashQueue.length) * 100);
  flashCompSub.textContent        = `You knew ${knew} out of ${flashQueue.length} cards (${pct}%).` + (didnt > 0 ? ` ${didnt} to review.` : "");
  // FIX: flashRetryWrong is now declared at top
  flashRetryWrong.style.display   = didnt > 0 ? "block" : "none";
}

flashRetryAll.addEventListener("click",   () => beginFlashRound(flashCards.map((_, i) => i)));
flashRetryWrong.addEventListener("click", () => beginFlashRound([...flashDidntSet]));
flashBackBtn.addEventListener("click",    () => { flashWrap.style.display = "none"; });

// ═══════════════════════════════════════════════════════════════════
// COPY + NOTION
// ═══════════════════════════════════════════════════════════════════
copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(outputEl.textContent).catch(() => {});
  copyBtn.textContent = "✓ Copied";
  setTimeout(() => { copyBtn.textContent = "Copy"; }, 2000);
});

saveNotionBtn.addEventListener("click", async () => {
  const text = outputEl.textContent.trim();
  if (!text) { alert("No output to save."); return; }
  if (!savedNotionToken) { alert("No Notion token — open ⚙️ Settings first."); settingsBtn.click(); return; }
  const pageId = subjectSel.value;
  if (!pageId) { alert("Select a subject page."); return; }

  const modeLabel = document.querySelector(".mode-btn.active")?.textContent?.trim() || "AI Output";
  const title     = notionTitleEl.value.trim() || lastExtractedName || `${modeLabel} — ${new Date().toLocaleDateString("en-GB")}`;
  saveNotionBtn.textContent = "Saving…";

  try {
    const chunks = [];
    for (let i = 0; i < text.length; i += 2000) chunks.push(text.substring(i, i + 2000));
    const res = await fetch("https://api.notion.com/v1/pages", {
      method:  "POST",
      headers: {
        "Authorization":  `Bearer ${savedNotionToken}`,
        "Content-Type":   "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        parent:     { page_id: pageId },
        properties: { title: [{ type: "text", text: { content: title } }] },
        children:   chunks.map(c => ({
          object: "block", type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: c } }] }
        }))
      })
    });
    if (!res.ok) throw new Error(await res.text());
    saveNotionBtn.textContent = "✓ Saved!";
    setTimeout(() => { saveNotionBtn.textContent = "📓 Save"; }, 2000);
  } catch (err) {
    alert("Notion error: " + err.message);
    saveNotionBtn.textContent = "📓 Save";
  }
});

// ── Utility ───────────────────────────────────────────────────────
// FIX: was commented out but used everywhere — restored
function escHtml(s) {
  return String(s)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}
