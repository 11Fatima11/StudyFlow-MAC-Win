// popup.js — Canvas AI Helper v10
// Active Recall Study Mode + Interactive Flashcard Mode

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
//const cloudProvider  = document.getElementById("cloud-provider");
//const cloudApiKey    = document.getElementById("cloud-api-key");
//const testCloudBtn   = document.getElementById("test-cloud-btn");
//const cloudStatus    = document.getElementById("cloud-status");

// History
const historyBtn     = document.getElementById("history-btn");
const historyPanel   = document.getElementById("history-panel");
const historyList    = document.getElementById("history-list");
const historyEmpty   = document.getElementById("history-empty");
const clearHistBtn   = document.getElementById("clear-history-btn");

// Notion bottom
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
const flashBackBtn   = document.getElementById("flash-back-btn");

const KIND_ICON = { document:"📄",presentation:"📊",spreadsheet:"📋",video:"🎬",audio:"🎵",image:"🖼️",archive:"🗜️",code:"💻" };

// ── State ─────────────────────────────────────────────────────────
let currentMode      = "summary";
let savedModel       = "";
let savedNotionToken = "";
let savedSubjects    = [];
let lastExtractedName= "";
let savedCloudProvider= "";
let savedCloudKey     = "";

// Study session state
let studyQuestions   = []; // [{q, a}]
let studyQueue       = []; // indices into studyQuestions
let studyCurrent     = 0;  // index into studyQueue
let studyResults     = []; // "correct"|"partial"|"wrong"|"skip"
let studyWrongCards  = []; // [{q,a}] for retry

// Flashcard state
let flashCards       = []; // [{front, back}]
let flashQueue       = [];
let flashIdx         = 0;
let flashKnewSet     = [];
let flashDidntSet    = [];
let flashFlipped     = false;

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


  const { autoMode } = await chrome.storage.session.get("autoMode").catch(() => ({}));
  if (autoMode) {
    await chrome.storage.session.remove("autoMode");
    const { selectedText } = await chrome.storage.session.get("selectedText").catch(() => ({}));
    if (selectedText) {
      inputTextEl.value = selectedText;
      if (autoMode === "explain") {
        runWithPrompt({ system:"You are a tutor. Explain clearly and simply.", prompt:"Explain this:\n\n"+selectedText }, "Explain");
      } else if (autoMode === "summary") {
        selectMode("summary"); runBtn.click();
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════
async function loadSettings() {
  const d = await chrome.storage.local.get(["ollamaModel","notionToken","subjects","cloudProvider","cloudKey"]);
  savedModel       = d.ollamaModel || "";
  savedNotionToken = d.notionToken || "";
  savedSubjects     = d.subjects     || [];
  savedAnkiDeck     = d.ankiDeck     || "";
  savedCloudProvider= d.cloudProvider|| "";
  savedCloudKey     = d.cloudKey     || "";
  if(cloudProvider) cloudProvider.value = savedCloudProvider;
  if(cloudApiKey)   cloudApiKey.value   = savedCloudKey;
  notionTokEl.value    = savedNotionToken;
  renderSubjectsEditor();
  await loadModelsFromOllama(savedModel);
}
async function saveSettings() {
  savedModel       = modelSelect.value;
  savedNotionToken = notionTokEl.value.trim();
  savedCloudProvider = cloudProvider?.value || "";
  savedCloudKey      = cloudApiKey?.value.trim() || "";
  await chrome.storage.local.get(["ollamaModel","notionToken","subjects","cloudProvider","cloudKey"]);
  await chrome.storage.local.set({ ollamaModel:savedModel, notionToken:savedNotionToken, subjects:savedSubjects, cloudProvider:savedCloudProvider, cloudKey:savedCloudKey });
  updateRunLabel(); checkTokenWarning(); renderSubjectDropdown();
  settingsMsg.style.display = "inline";
  setTimeout(() => { settingsMsg.style.display = "none"; }, 2000);
}

settingsBtn.addEventListener("click", () => { const o=togglePanel("settings-panel"); settingsBtn.classList.toggle("active",o); historyBtn.classList.remove("active"); if(o) loadModelsFromOllama(savedModel); });
historyBtn.addEventListener("click",  () => { const o=togglePanel("history-panel"); historyBtn.classList.toggle("active",o); settingsBtn.classList.remove("active"); if(o) renderHistory(); });
function togglePanel(id) {
  const p=document.getElementById(id), was=p.classList.contains("open");
  document.querySelectorAll(".tab-panel").forEach(x=>{ x.classList.remove("open"); x.style.display="none"; });
  if(!was){ p.classList.add("open"); p.style.display=id==="history-panel"?"flex":"block"; return true; }
  return false;
}
saveSettingsBtn.addEventListener("click", saveSettings);
refreshModels.addEventListener("click", ()=>loadModelsFromOllama(modelSelect.value));

async function loadModelsFromOllama(sel="") {
  try {
    const r=await fetch("http://localhost:11434/api/tags"); if(!r.ok) throw 0;
    const ms=(await r.json()).models?.map(m=>m.name).filter(Boolean)||[];
    modelSelect.innerHTML="";
    if(!ms.length){ addOpt(modelSelect,"","— no models (is Ollama running?) —"); }
    else { ms.forEach(n=>addOpt(modelSelect,n,n)); if(sel&&ms.includes(sel)) modelSelect.value=sel; }
  } catch { modelSelect.innerHTML=""; addOpt(modelSelect,"","— Ollama not reachable —"); }
}
function renderSubjectsEditor() {
  subjectsList.innerHTML="";
  savedSubjects.forEach((s,i)=>{
    const r=document.createElement("div"); r.className="subject-row";
    r.innerHTML=`<input type="text" value="${escHtml(s.name)}" data-i="${i}" data-f="name" placeholder="Name"/>
      <input type="text" value="${escHtml(s.id)}" data-i="${i}" data-f="id" placeholder="Page ID" style="flex:1.2"/>
      <button class="del-btn" data-i="${i}">✕</button>`;
    r.querySelectorAll("input").forEach(inp=>inp.addEventListener("input",e=>{ savedSubjects[+e.target.dataset.i][e.target.dataset.f]=e.target.value.trim(); }));
    r.querySelector(".del-btn").addEventListener("click",e=>{ savedSubjects.splice(+e.target.dataset.i,1); renderSubjectsEditor(); });
    subjectsList.appendChild(r);
  });
}
addSubjBtn.addEventListener("click",()=>{
  const name=newSubjName.value.trim(), id=newSubjId.value.trim().replace(/-/g,"").slice(-32);
  if(!name||!id){alert("Enter both name and page ID.");return;}
  savedSubjects.push({name,id}); newSubjName.value=""; newSubjId.value=""; renderSubjectsEditor();
});
function renderSubjectDropdown() {
  subjectSel.innerHTML='<option value="">-- Select subject --</option>';
  savedSubjects.forEach(s=>addOpt(subjectSel,s.id,s.name));
}

// Cloud API test
/*document.addEventListener("DOMContentLoaded", () => {
  if (testCloudBtn) testCloudBtn.addEventListener("click", testCloudConnection);
  if (cloudProvider) cloudProvider.addEventListener("change", () => {
    const hints = {
      openai:    "OpenAI: platform.openai.com/api-keys",
      anthropic: "Anthropic: console.anthropic.com/settings/keys",
      openrouter:"OpenRouter: openrouter.ai/keys — has a free tier!"
    };
    const h = document.getElementById("cloud-key-hint");
    if (h) h.textContent = hints[cloudProvider.value] || "OpenAI · Anthropic · OpenRouter";
  });
});

async function testCloudConnection() {
  const provider = cloudProvider?.value;
  const key      = cloudApiKey?.value.trim();
  if (!provider || !key) {
    showCloudStatus("error", "Select a provider and enter your API key.");
    return;
  }
  testCloudBtn.textContent = "Testing…";
  try {
    await callCloud({ system: "You are a test assistant.", prompt: "Reply with: OK" }, provider, key);
    showCloudStatus("ok", `✓ Connected to ${provider} — API key works!`);
  } catch(e) {
    showCloudStatus("error", "✗ " + e.message);
  }
  testCloudBtn.textContent = "Test Cloud Connection";
}

function showCloudStatus(type, msg) {
  if (!cloudStatus) return;
  cloudStatus.textContent  = msg;
  cloudStatus.style.display = "block";
  cloudStatus.style.background = type === "ok" ? "#d1fae5" : "#fee2e2";
  cloudStatus.style.color      = type === "ok" ? "#065f46"  : "#991b1b";
}*/



function addOpt(sel,val,label){ const o=document.createElement("option"); o.value=val; o.textContent=label; sel.appendChild(o); }
function currentModel(){ return modelSelect.value||savedModel||"gemma3:1b"; }
function updateRunLabel(){ runBtn.textContent=`▶ Run with ${savedModel||"Ollama"}`; }
function checkTokenWarning(){ tokenWarning.style.display=savedNotionToken?"none":"block"; }

// ═══════════════════════════════════════════════════════════════════
// MODE BUTTONS
// ═══════════════════════════════════════════════════════════════════
function setupModeBtns() {
  document.querySelectorAll(".mode-btn").forEach(btn=>{
    btn.addEventListener("click",()=>selectMode(btn.dataset.mode));
  });
}
function selectMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach(b=>b.classList.toggle("active", b.dataset.mode===mode));
  const label = { summary:"▶ Generate Summary", short_questions:"▶ Generate Short Questions",
    open_questions:"▶ Generate Open Questions", exam_questions:"▶ Generate Exam Questions",
    hints:"▶ Generate Hints",
    study:"🧠 Start Study Session", flashcards:"🃏 Generate Flashcards",
    feynman:"🎓 Start Feynman Session" }[mode] || "▶ Generate";
  runBtn.textContent = label;
  runBtn.style.background = mode==="study" ? "#d97706" : mode==="flashcards" ? "#059669" : mode==="feynman" ? "#4f46e5" : "#4f46e5";
}

// ═══════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════
async function loadHistory()  { return (await chrome.storage.local.get("history")).history||[]; }
async function saveHistEntry(e) {
  const h=await loadHistory(); h.unshift(e); if(h.length>50) h.splice(50);
  await chrome.storage.local.set({history:h});
}
async function renderHistory() {
  const h=await loadHistory();
  historyList.innerHTML="";
  historyEmpty.style.display=h.length?"none":"block";
  clearHistBtn.style.display=h.length?"block":"none";
  h.forEach(item=>{
    const el=document.createElement("div"); el.className="hist-item";
    const date=new Date(item.ts).toLocaleDateString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    el.innerHTML=`<div class="hist-header"><span class="hist-title">${escHtml(item.title)}</span>
      <button class="hist-del" data-id="${item.id}">✕</button></div>
      <div class="hist-meta">${escHtml(item.mode)} · ${date}</div>
      <div class="hist-preview">${escHtml(item.output.slice(0,120))}…</div>`;
    el.addEventListener("click",e=>{
      if(e.target.classList.contains("hist-del")) return;
      outputEl.textContent=item.output; outputWrap.style.display="block";
      togglePanel(""); historyBtn.classList.remove("active");
    });
    el.querySelector(".hist-del").addEventListener("click",async e=>{
      e.stopPropagation();
      let h2=await loadHistory();
      await chrome.storage.local.set({history:h2.filter(x=>x.id!==item.id)});
      renderHistory();
    });
    historyList.appendChild(el);
  });
}
clearHistBtn.addEventListener("click",async()=>{ if(!confirm("Clear all history?")) return; await chrome.storage.local.set({history:[]}); renderHistory(); });
saveHistBtn.addEventListener("click",async()=>{
  const out=outputEl.textContent.trim(); if(!out) return;
  let course="Canvas";
  try{const[t]=await chrome.tabs.query({active:true,currentWindow:true}); course=t?.title?.replace("Thomas More Canvas","").replace("|","").trim()||course;}catch{}
  const modeLabel=document.querySelector(".mode-btn.active")?.textContent?.trim()||currentMode;
  await saveHistEntry({id:Date.now().toString(),ts:Date.now(),title:`${modeLabel} — ${lastExtractedName||course}`,mode:modeLabel,course,output:out});
  saveHistBtn.textContent="✓ Saved"; setTimeout(()=>{saveHistBtn.textContent="💾 Save";},1500);
});

// ═══════════════════════════════════════════════════════════════════
// SELECTION + FILE SCANNING
// ═══════════════════════════════════════════════════════════════════
async function pollSelection() {
  let text="";
  try{
    const[tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(tab?.id&&tab.url?.includes("thomasmore.instructure.com")){
      const r=await chrome.tabs.sendMessage(tab.id,{type:"GET_SELECTION"}).catch(()=>null);
      text=r?.text??"";
    }
  }catch{}
  if(!text){const{selectedText}=await chrome.storage.session.get("selectedText").catch(()=>({})); text=selectedText??"";}
  detectBadge.textContent=text?`Selected: ${text.length} chars`:"No selection";
  detectBadge.className=text?"has-sel":"no-sel";
  useSelBtn.disabled=!text;
  if(text) useSelBtn.onclick=()=>{inputTextEl.value=text;inputTextEl.focus();};
}

async function scanPageFiles() {
  filesCount.textContent="scanning…"; filesList.innerHTML=""; noFilesNote.style.display="none";
  try{
    const[tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id||!tab.url?.includes("thomasmore.instructure.com")){filesCount.textContent="(not on Canvas)";return;}

    const resp=await chrome.tabs.sendMessage(tab.id,{type:"SCAN_FILES"}).catch(()=>null);
    const files=resp?.files??[];
    if(!files.length){filesCount.textContent="0";noFilesNote.style.display="inline";return;}
    filesCount.textContent=files.length;
    files.forEach(f=>renderChip(f));
  }catch{filesCount.textContent="unavailable";}
}

function renderChip(file) {
  const chip=document.createElement("span");
  chip.className="file-chip"; chip.title=file.url;
  chip.innerHTML=`<span>${KIND_ICON[file.kind]??"📎"}</span>${escHtml(file.name)}`;
  chip.addEventListener("click",async()=>{
    if(chip.classList.contains("extracting")) return;
    if(chip.classList.contains("selected")){
      chip.classList.remove("selected");
      const marker=`\n\n--- ${file.name} ---\n`, idx=inputTextEl.value.indexOf(marker);
      if(idx!==-1){const next=inputTextEl.value.indexOf("\n\n--- ",idx+marker.length);
        inputTextEl.value=next!==-1?inputTextEl.value.slice(0,idx)+inputTextEl.value.slice(next):inputTextEl.value.slice(0,idx);}
      return;
    }
    chip.classList.add("extracting");
    showExtractStatus(`⏳ Extracting "${file.name}"…`);
    showProgress(0,"Starting…");
    try{
      const text=await extractFileText(file);
      if(!text?.trim()){showExtractStatus(`⚠️ No text in "${file.name}"`);chip.classList.remove("extracting");hideProgress();return;}
      chip.classList.remove("extracting"); chip.classList.add("selected");
      inputTextEl.value=(inputTextEl.value+`\n\n--- ${file.name} ---\n${text.trim()}`).trim();
      lastExtractedName=file.name.replace(/\.[^.]+$/,"");
      notionTitleEl.placeholder=lastExtractedName||"Title";
      showExtractStatus(`✓ Extracted ${text.length.toLocaleString()} chars`);
      hideProgress(); setTimeout(hideExtractStatus,3000);
    }catch(err){chip.classList.remove("extracting");hideProgress();showExtractStatus(`❌ ${err.message}`);}
  });
  filesList.appendChild(chip);
}

function showProgress(pct,label){progressWrap.style.display="flex";progressLabel.textContent=label;progressBar.style.width=`${Math.min(100,pct)}%`;}
function hideProgress(){progressWrap.style.display="none";progressBar.style.width="0%";}
function showExtractStatus(m){extractStatus.textContent=m;extractStatus.style.display="block";}
function hideExtractStatus(){extractStatus.style.display="none";}

async function extractFileText(file){
  if(file.kind==="video"||file.kind==="audio")
    return `[${file.kind==="video"?"🎬 Video":"🎵 Audio"}: ${file.name}]\nURL: ${file.url}\n\nNote: Ollama cannot watch/listen to files. Watch it and paste your notes here.`;
  const[tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id) throw new Error("No active Canvas tab.");
  showProgress(15,"Resolving file URL…");
  const resolved=await chrome.tabs.sendMessage(tab.id,{type:"RESOLVE_URL",url:file.url}).catch(()=>{throw new Error("Content script not ready — refresh Canvas page.");});
  if(!resolved?.ok) throw new Error(resolved?.error||"Could not resolve URL");
  showProgress(35,"Downloading…");
  const listener=msg=>{if(msg.type==="EXTRACT_PROGRESS") showProgress(35+msg.pct*0.6,msg.label);};
  chrome.runtime.onMessage.addListener(listener);
  try{
    const result=await chrome.runtime.sendMessage({type:"BG_EXTRACT",url:resolved.url,filename:file.name,kind:file.kind}).catch(e=>{throw new Error("Background error: "+e.message);});
    if(!result?.ok) throw new Error(result?.error||"Extraction failed");
    showProgress(100,"Done!"); return result.text;
  }finally{chrome.runtime.onMessage.removeListener(listener);}
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RUN BUTTON
// ═══════════════════════════════════════════════════════════════════
runBtn.addEventListener("click", async () => {
  const text = inputTextEl.value.trim();
  if (!text) { statusEl.textContent = "Please add some text first."; return; }

  // Hide previous outputs
  outputWrap.style.display    = "none";
  studyWrap.style.display     = "none";
  flashWrap.style.display     = "none";
  outputEl.textContent        = "";
  statusEl.textContent        = "";

  if (currentMode === "study") {
    await startStudySession(text);
  } else if (currentMode === "flashcards") {
    await startFlashcardSession(text);
  } else if (currentMode === "feynman") {
    await startFeynmanSession(text);
  } else {
    const modeLabel = document.querySelector(".mode-btn.active")?.textContent?.trim() || currentMode;
    await runWithPrompt(buildPrompt(currentMode, text), modeLabel);
  }
});

async function runWithPrompt({ system, prompt }, modeLabel) {
  const model = currentModel();
  runBtn.disabled = true;
  const origText = runBtn.textContent;
  runBtn.textContent = "Running…";
  statusEl.textContent = `Sending to ${model}…`;
  try {
    const response = await callOllama({ system, prompt }, model);
    outputEl.textContent     = response || "(No response)";
    outputWrap.style.display = "block";
    statusEl.textContent     = "✓ Done.";
    let course="Canvas";
    try{const[t]=await chrome.tabs.query({active:true,currentWindow:true});course=t?.title?.replace("Thomas More Canvas","").replace("|","").trim()||course;}catch{}
    await saveHistEntry({id:Date.now().toString(),ts:Date.now(),title:`${modeLabel} — ${lastExtractedName||course}`,mode:modeLabel,course,output:response});
  } catch (err) {
    statusEl.textContent = "Error: " + (err.message || "Could not reach Ollama.");
  } finally {
    runBtn.disabled = false; runBtn.textContent = origText;
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════
function buildPrompt(mode, text) {
  const MAX=5000;
  const body=text.length>MAX?text.slice(0,MAX)+"\n\n[Content truncated]":text;
  switch(mode){
    case "summary": return {
      system:"You are a university study assistant. Summarise study material into bullet points grouped by topic. Never repeat the input. Just write the summary.",
      prompt:"Summarise the following study material into clear bullet points grouped by topic:\n\n"+body};
    case "short_questions": return {
      system:"You are a quiz maker. Output exactly this format:\nQ1: [question]\n...up to Q10.\nNever write an introduction. Start with Q1.",
      prompt:"Write 10 short-answer quiz questions with no answers based on:\n\n"+body};
    case "open_questions": return {
      system:"You are a university lecturer. Output a numbered list 1 to 6. No answers, no introduction. Start with '1.'",
      prompt:"Write 6 open-ended critical thinking questions about:\n\n"+body};
    case "exam_questions": return {
      system:"You are an exam writer. Output only the exam:\nSECTION A - Multiple Choice (4 questions, options A B C D, correct marked)\nSECTION B - Short Answer (3 questions with model answers)\nSECTION C - Essay (1 question with bullet-point model answer)\nNo introduction.",
      prompt:"Create a university exam based on:\n\n"+body};
    case "hints": return {
      system:"You are a tutor. Respond in exactly this structure:\nKEY CONCEPTS (bullet list of 5 most important ideas)\nWATCH OUT FOR (2-3 common mistakes)\nMEMORY TRICKS (mnemonics or tips)\nIN PLAIN ENGLISH (one short paragraph)\nStart with KEY CONCEPTS. No introduction.",
      prompt:"Give study hints for:\n\n"+body};
    default: return {system:"",prompt:body};
  }
}

// Study session question generator
function buildStudyPrompt(text) {
  const MAX=5000;
  const body=text.length>MAX?text.slice(0,MAX)+"\n\n[truncated]":text;
  return {
    system: "You are a university exam maker. Generate exactly 6 study questions with model answers.\n" +
            "Output ONLY valid JSON — no explanation, no markdown, no extra text.\n" +
            "Format: [{\"q\":\"question text\",\"a\":\"model answer text\"}, ...]\n" +
            "Questions should test understanding, not just recall. Mix factual and analytical questions.",
    prompt: "Generate 6 study questions with model answers for this content. Output only JSON:\n\n" + body
  };
}

// Flashcard generator
function buildFlashcardPrompt(text) {
  const MAX=5000;
  const body=text.length>MAX?text.slice(0,MAX)+"\n\n[truncated]":text;
  return {
    system: "You are a flashcard creator. Generate 12 Anki flashcard pairs.\n" +
            "Output ONLY valid JSON — no markdown, no explanation.\n" +
            "Format: [{\"front\":\"question or term\",\"back\":\"answer or definition\"}, ...]\n" +
            "Keep fronts short (one concept per card). Backs should be concise but complete.",
    prompt: "Create 12 Anki flashcards for this content. Output only JSON:\n\n" + body
  };
}

// ── AI router: cloud first if configured, else Ollama ────────────
/*async function callOllama({ system, prompt }, model) {
  // Use cloud if provider + key are configured
  if (savedCloudProvider && savedCloudKey) {
    return callCloud({ system, prompt }, savedCloudProvider, savedCloudKey);
  }
  return callLocal({ system, prompt }, model);
}

async function callLocal({ system, prompt }, model) {
  const body = { model, prompt, stream: false, options: { temperature: 0.4, num_predict: 2048 } };
  if (system) body.system = system;
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status} — is Ollama running?`);
  return (await res.json()).response;
}

async function callCloud({ system, prompt }, provider, key) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  // ── OpenAI (GPT-4o-mini) ──────────────────────────────────────
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.4, max_tokens: 2048 })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI HTTP ${res.status}`);
    }
    return (await res.json()).choices[0].message.content;
  }

  // ── Anthropic (Claude Haiku — fastest, cheapest) ──────────────
  if (provider === "anthropic") {
    const body = { model: "claude-haiku-4-5-20251001", max_tokens: 2048, temperature: 0.4, messages: [{ role: "user", content: prompt }] };
    if (system) body.system = system;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Anthropic HTTP ${res.status}`);
    }
    return (await res.json()).content[0].text;
  }

  // ── OpenRouter (free models available) ───────────────────────
  if (provider === "openrouter") {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "HTTP-Referer": "https://thomasmore.instructure.com" },
      body: JSON.stringify({ model: "mistralai/mistral-7b-instruct:free", messages, temperature: 0.4, max_tokens: 2048 })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenRouter HTTP ${res.status}`);
    }
    return (await res.json()).choices[0].message.content;
  }

  throw new Error("Unknown cloud provider: " + provider);
}*/

// Parse JSON from LLM (handles markdown fences)
function parseJsonResponse(raw) {
  let text = raw.trim();
  // Strip markdown fences if present
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/,"").trim();
  // Find first [ and last ]
  const start = text.indexOf("[");
  const end   = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in response");
  return JSON.parse(text.slice(start, end + 1));
}

// ═══════════════════════════════════════════════════════════════════
// STUDY MODE
// ═══════════════════════════════════════════════════════════════════
async function startStudySession(text) {
  const model = currentModel();
  runBtn.disabled = true;
  runBtn.textContent = "Generating questions…";
  statusEl.textContent = `Asking ${model} to create study questions…`;

  try {
    const raw = await callOllama(buildStudyPrompt(text), model);
    studyQuestions = parseJsonResponse(raw);
    if (!studyQuestions.length) throw new Error("No questions generated");
    beginStudyRound(studyQuestions.map((_,i)=>i));
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "Error generating questions: " + err.message;
    runBtn.disabled = false; selectMode("study");
  } finally {
    runBtn.disabled = false; runBtn.textContent = "🧠 Start Study Session";
  }
}

function beginStudyRound(queue) {
  studyQueue    = [...queue];
  studyCurrent  = 0;
  studyResults  = new Array(studyQueue.length).fill(null);
  studyWrongCards = [];

  // Reset UI
  studyComplete.style.display  = "none";
  studyFeedback.style.display  = "none";
  nextBtn.style.display        = "none";
  studyWrap.style.display      = "block";
  studyAnswer.value            = "";

  updateStudyProgress();
  showStudyQuestion();
}

function showStudyQuestion() {
  if (studyCurrent >= studyQueue.length) { showStudyComplete(); return; }
  const qi = studyQueue[studyCurrent];
  const q  = studyQuestions[qi];

  studyQNum.textContent     = `Question ${studyCurrent + 1} of ${studyQueue.length}`;
  studyQText.textContent    = q.q;
  studyAnswer.value         = "";
  studyFeedback.style.display = "none";
  nextBtn.style.display     = "none";
  studyAnswer.disabled      = false;
  checkBtn.disabled         = false;
  studyAnswer.focus();
  updateStudyProgress();
}

function updateStudyProgress() {
  const done    = studyResults.filter(Boolean).length;
  const correct = studyResults.filter(r=>r==="correct").length;
  const wrong   = studyResults.filter(r=>r==="wrong"||r==="partial").length;
  const skip    = studyResults.filter(r=>r==="skip").length;
  const pct     = studyQueue.length ? (done / studyQueue.length) * 100 : 0;

  studyProgFill.style.width  = `${pct}%`;
  studyProgLabel.textContent = `${done} / ${studyQueue.length}`;
  scoreCorrect.textContent   = correct;
  scoreWrong.textContent     = wrong;
  scoreRemaining.textContent = studyQueue.length - done;
}

checkBtn.addEventListener("click", async () => {
  const userAnswer = studyAnswer.value.trim();
  if (!userAnswer) { studyAnswer.focus(); return; }

  checkBtn.disabled = true;
  checkBtn.textContent = "Checking…";

  const qi = studyQueue[studyCurrent];
  const q  = studyQuestions[qi];

  try {
    const evalPrompt = {
      system: "You are a strict but fair university examiner. Evaluate the student's answer.\n" +
              "Reply with ONLY a JSON object: {\"grade\":\"correct\"|\"partial\"|\"wrong\", \"feedback\":\"one sentence of feedback\", \"missing\":\"what was missing or wrong (empty string if correct)\"}\n" +
              "correct = fully right. partial = mostly right but missing something. wrong = incorrect or too vague.",
      prompt: `Question: ${q.q}\n\nModel answer: ${q.a}\n\nStudent answer: ${userAnswer}\n\nEvaluate and reply with JSON only.`
    };

    const raw    = await callOllama(evalPrompt, currentModel());
    const result = parseJsonResponse(raw.replace(/^\s*\{/,"[{").replace(/\}\s*$/,"}]"))[0] ||
                   JSON.parse(raw.trim().replace(/^```json/,"").replace(/```$/,"").trim());

    const grade = result.grade || "wrong";
    studyResults[studyCurrent] = grade;

    if (grade === "wrong" || grade === "partial") {
      studyWrongCards.push({ q: q.q, a: q.a });
    }

    // Show feedback
    studyFeedback.className   = `${grade}`;
    studyFeedback.style.display = "block";

    const gradeEmoji = { correct:"✅ Correct!", partial:"⚠️ Partially correct", wrong:"❌ Incorrect" };
    feedbackGrade.textContent = gradeEmoji[grade] || grade;
    feedbackText.textContent  = result.feedback || "";
    feedbackModel.textContent = q.a;

    studyAnswer.disabled      = true;
    nextBtn.style.display     = "block";
    updateStudyProgress();

  } catch (err) {
    // Fallback: just show model answer
    studyResults[studyCurrent] = "skip";
    studyFeedback.className    = "partial";
    studyFeedback.style.display = "block";
    feedbackGrade.textContent  = "⚠️ Could not evaluate — here is the model answer";
    feedbackText.textContent   = "";
    feedbackModel.textContent  = q.a;
    studyAnswer.disabled       = true;
    nextBtn.style.display      = "block";
    updateStudyProgress();
  }

  checkBtn.textContent = "✓ Check my answer";
  checkBtn.disabled    = false;
});

skipBtn.addEventListener("click", () => {
  studyResults[studyCurrent] = "skip";
  const qi = studyQueue[studyCurrent];
  studyWrongCards.push({ q: studyQuestions[qi].q, a: studyQuestions[qi].a });
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

  const correct = studyResults.filter(r=>r==="correct").length;
  const wrong   = studyResults.filter(r=>r==="wrong"||r==="partial").length;
  const skipped = studyResults.filter(r=>r==="skip").length;
  const total   = studyQueue.length;
  const pct     = Math.round((correct / total) * 100);

  document.getElementById("complete-correct").textContent = correct;
  document.getElementById("complete-wrong").textContent   = wrong;
  document.getElementById("complete-skipped").textContent = skipped;

  const emoji   = pct>=80?"🎉":pct>=60?"👍":"📚";
  const title   = pct>=80?"Excellent work!":pct>=60?"Good effort!":"Keep studying!";
  const subtitle= pct>=80?`You scored ${pct}% — you know this material well.`
                        :pct>=60?`You scored ${pct}% — review the ones you missed.`
                        :`You scored ${pct}% — try again after reviewing the content.`;

  document.getElementById("complete-emoji").textContent    = emoji;
  document.getElementById("complete-title").textContent    = title;
  document.getElementById("complete-subtitle").textContent = subtitle;

  retryWrongBtn.style.display   = wrong > 0 || skipped > 0 ? "block" : "none";
}

retryAllBtn.addEventListener("click", () => {
  studyAnswer.style.display = "";
  checkBtn.style.display    = "";
  skipBtn.style.display     = "";
  beginStudyRound(studyQuestions.map((_,i)=>i));
});

retryWrongBtn.addEventListener("click", () => {
  studyAnswer.style.display = "";
  checkBtn.style.display    = "";
  skipBtn.style.display     = "";
  const wrongIdx = studyQueue.filter((_,i) => studyResults[i]==="wrong"||studyResults[i]==="partial"||studyResults[i]==="skip");
  if (!wrongIdx.length) { alert("No wrong answers to retry!"); return; }
  beginStudyRound(wrongIdx);
});


studyBackBtn.addEventListener("click", () => {
  studyWrap.style.display = "none";
  studyAnswer.style.display = "";
  checkBtn.style.display = "";
  skipBtn.style.display  = "";
});

// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// FEYNMAN MODE — Explain it simply, AI finds your gaps
// ═══════════════════════════════════════════════════════════════
let feynmanTopics = [];
let feynmanIdx    = 0;

async function startFeynmanSession(text) {
  runBtn.disabled = true;
  runBtn.textContent = "Extracting topics…";
  statusEl.textContent = "Identifying key topics…";
  try {
    const raw = await callOllama({
      system: "You are a curriculum expert. Extract key topics from study material.\nOutput ONLY valid JSON array: [{\"topic\":\"Name\",\"keyPoints\":\"2-3 sentence summary\"}]\nExtract 3-5 distinct teachable topics. No markdown, no explanation.",
      prompt: "Extract key topics from this content. JSON only:\n\n" + text.slice(0, 5000)
    }, currentModel());
    feynmanTopics = parseJsonResponse(raw);
    if (!feynmanTopics.length) throw new Error("No topics found");
    feynmanIdx = 0;
    statusEl.textContent = "";
    outputWrap.style.display  = "none";
    studyWrap.style.display   = "none";
    flashWrap.style.display   = "none";
    document.getElementById("feynman-wrap").style.display = "block";
    showFeynmanTopic();
  } catch(err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "🎓 Start Feynman Session";
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
  document.getElementById("feynman-topic").textContent = `Topic ${feynmanIdx+1} of ${feynmanTopics.length}: ${t.topic}`;
  document.getElementById("feynman-answer").value = "";
  document.getElementById("feynman-feedback").style.display = "none";
  document.getElementById("feynman-next-row").style.display = "none";
  document.getElementById("feynman-answer").focus();
}

async function evaluateFeynman() {
  const explanation = document.getElementById("feynman-answer").value.trim();
  if (!explanation) return;
  const btn = document.getElementById("feynman-check-btn");
  btn.disabled = true; btn.textContent = "Evaluating…";
  const t = feynmanTopics[feynmanIdx];
  try {
    const feedback = await callOllama({
      system: "You are a Socratic university tutor using the Feynman technique.\nBe encouraging but honest — find GAPS in understanding.\nRespond in exactly this format:\n\nWHAT YOU GOT RIGHT\n[bullet list]\n\nGAPS IN YOUR EXPLANATION\n[bullet list of missing/unclear concepts — be specific]\n\nMISCONCEPTIONS\n[any incorrect statements, or 'None spotted']\n\nHOW TO IMPROVE\n[2-3 concrete suggestions]\n\nSCORE: [X/10]\n\nIf score >= 8 add: READY FOR NEXT TOPIC\nIf score < 6 add: TRY AGAIN BEFORE MOVING ON",
      prompt: `Topic: ${t.topic}\nWhat student should know: ${t.keyPoints}\nStudent's explanation:\n${explanation}\n\nEvaluate:`
    }, currentModel());

    const feedEl = document.getElementById("feynman-feedback");
    feedEl.textContent  = feedback;
    feedEl.style.display = "block";

    const scoreM = feedback.match(/SCORE:\s*(\d+)\s*\/\s*10/i);
    const score  = scoreM ? +scoreM[1] : 5;
    feedEl.style.background = score>=8?"#d1fae5":score>=6?"#fef3c7":"#fee2e2";
    feedEl.style.border     = score>=8?"1.5px solid #6ee7b7":score>=6?"1.5px solid #fcd34d":"1.5px solid #fca5a5";
    feedEl.style.color      = "#1f2937";

    const nextRow = document.getElementById("feynman-next-row");
    nextRow.style.display = "block";
    const nextBtn2 = document.getElementById("feynman-next-btn");
    if (nextBtn2) {
      nextBtn2.style.display = score >= 6 ? "block" : "none";
      nextBtn2.textContent   = feynmanIdx+1 >= feynmanTopics.length ? "✓ Finish session" : "Next topic →";
    }
  } catch(err) {
    const feedEl = document.getElementById("feynman-feedback");
    feedEl.textContent = "Error: " + err.message;
    feedEl.style.background = "#fee2e2"; feedEl.style.border = "1.5px solid #fca5a5";
    feedEl.style.display = "block";
  }
  btn.disabled = false; btn.textContent = "🎓 Evaluate my explanation";
}

// Feynman button listeners (attached after DOM ready via inline)
window.addEventListener("load", () => {
  document.getElementById("feynman-check-btn")?.addEventListener("click", evaluateFeynman);
  document.getElementById("feynman-retry-btn")?.addEventListener("click", () => {
    document.getElementById("feynman-answer").value = "";
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

// FLASHCARD MODE
// ═══════════════════════════════════════════════════════════════════
async function startFlashcardSession(text) {
  const model = currentModel();
  runBtn.disabled = true;
  runBtn.textContent = "Generating flashcards…";
  statusEl.textContent = `Asking ${model} to create flashcards…`;

  try {
    const raw = await callOllama(buildFlashcardPrompt(text), model);
    flashCards = parseJsonResponse(raw);
    if (!flashCards.length) throw new Error("No flashcards generated");
    beginFlashRound(flashCards.map((_,i)=>i));
    statusEl.textContent = "";
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    runBtn.disabled = false; runBtn.textContent = "🃏 Generate Flashcards";
  }
}

function beginFlashRound(queue) {
  flashQueue   = [...queue];
  flashIdx     = 0;
  flashKnewSet = [];
  flashDidntSet= [];
  flashFlipped = false;

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
  flashFlipped = false;
  const pct = (flashIdx / flashQueue.length) * 100;
  flashProgFill.style.width  = `${pct}%`;
  flashProgLabel.textContent = `${flashIdx + 1} / ${flashQueue.length}`;
}

flashCard.addEventListener("click", () => {
  flashFlipped = !flashFlipped;
  flashCard.classList.toggle("flipped", flashFlipped);
});
flashFlip.addEventListener("click", () => {
  flashFlipped = !flashFlipped;
  flashCard.classList.toggle("flipped", flashFlipped);
});

flashKnew.addEventListener("click", () => {
  flashKnewSet.push(flashQueue[flashIdx]);
  flashIdx++; showFlashCard();
});
flashDidnt.addEventListener("click", () => {
  flashDidntSet.push(flashQueue[flashIdx]);
  flashIdx++; showFlashCard();
});

function showFlashComplete() {
  flashComplete.style.display = "block";
  const knew=flashKnewSet.length, didnt=flashDidntSet.length;
  const pct=Math.round((knew/flashQueue.length)*100);
  flashCompSub.textContent = `You knew ${knew} out of ${flashQueue.length} cards (${pct}%).`+(didnt>0?` ${didnt} to review.`:"");
  flashRetryWrong.style.display = didnt>0?"block":"none";
}

flashRetryAll.addEventListener("click",  ()=>beginFlashRound(flashCards.map((_,i)=>i)));
flashBackBtn.addEventListener("click",()=>{ flashWrap.style.display="none"; });

// ═══════════════════════════════════════════════════════════════════
// COPY + NOTION (bottom bar)
// ═══════════════════════════════════════════════════════════════════
copyBtn.addEventListener("click", async ()=>{
  await navigator.clipboard.writeText(outputEl.textContent).catch(()=>{});
  copyBtn.textContent="✓ Copied"; setTimeout(()=>{copyBtn.textContent="Copy";},2000);
});

saveNotionBtn.addEventListener("click", async()=>{
  const text=outputEl.textContent.trim(); if(!text){alert("No output to save.");return;}
  if(!savedNotionToken){alert("No Notion token — open ⚙️ Settings first.");settingsBtn.click();return;}
  const pageId=subjectSel.value; if(!pageId){alert("Select a subject page.");return;}
  const modeLabel=document.querySelector(".mode-btn.active")?.textContent?.trim()||"AI Output";
  const title=notionTitleEl.value.trim()||lastExtractedName||`${modeLabel} — ${new Date().toLocaleDateString("en-GB")}`;
  saveNotionBtn.textContent="Saving…";
  try{
    const chunks=[];
    for(let i=0;i<text.length;i+=2000) chunks.push(text.substring(i,i+2000));
    const res=await fetch("https://api.notion.com/v1/pages",{
      method:"POST",
      headers:{"Authorization":`Bearer ${savedNotionToken}`,"Content-Type":"application/json","Notion-Version":"2022-06-28"},
      body:JSON.stringify({parent:{page_id:pageId},properties:{title:[{type:"text",text:{content:title}}]},
        children:chunks.map(c=>({object:"block",type:"paragraph",paragraph:{rich_text:[{type:"text",text:{content:c}}]}}))})
    });
    if(!res.ok) throw new Error(await res.text());
    saveNotionBtn.textContent="✓ Saved!"; setTimeout(()=>{saveNotionBtn.textContent="📓 Save";},2000);
  }catch(err){alert("Notion error: "+err.message);saveNotionBtn.textContent="📓 Save";}
});


// ── AnkiConnect helper ────────────────────────────────────────────


//function escHtml(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
