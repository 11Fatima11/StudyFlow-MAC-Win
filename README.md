# 🎓 StudyFlow

An AI-powered study assistant built into Canvas.  
Extract lecture files, generate summaries, quiz yourself with active recall, and master topics with the Feynman technique — without ever leaving Canvas.

---

## 🚀 Installation

Choose your operating system:

---

### 🪟 Windows

**Double-click `install.bat`** and follow the on-screen steps.

> If Windows shows "Windows protected your PC" → click **More info** → **Run anyway**

The installer will automatically:
1. Download and install Ollama (the local AI engine)
2. Download 3 AI models (~3.5 GB)
3. Confirm everything is working

**After the installer finishes:**

1. Open **Google Chrome**
2. Go to `chrome://extensions`
3. Turn on **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `canvas-ext-v2` folder
5. Go to `thomasmore.instructure.com` — the panel opens on the right

---

### 🍎 Mac

**Right-click `install.sh` → Open With → Terminal**

> Or open Terminal and run:
> ```bash
> cd /path/to/canvas-ext-v2
> chmod +x install.sh
> ./install.sh
> ```

The installer will automatically:
1. Install Homebrew (macOS package manager, if not already installed)
2. Install Ollama via Homebrew
3. Download 3 AI models (~3.5 GB)
4. Set Ollama to start automatically on login

**After the installer finishes:**

1. Open **Google Chrome**
2. Go to `chrome://extensions`
3. Turn on **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `canvas-ext-v2` folder
5. Go to `thomasmore.instructure.com` — the panel opens on the right

---

### ⚙️ First-time setup (both platforms)

1. Click the **⚙️ Settings** gear in the extension panel
2. Click **↻ Refresh** to load your AI models
3. Select **`gemma3:1b`** (recommended)
4. Click **Save Settings**

Done — the extension is ready to use.

---

## 🤖 Which model should I use?

| Model | Speed | Quality | Use it for |
|---|---|---|---|
| `qwen2.5:0.5b` | ⚡⚡⚡ Fastest | Basic | Quick summaries, slow laptop |
| `gemma3:1b` | ⚡⚡ Fast | Good | **Most tasks — start here** |
| `phi3:mini` | ⚡ Medium | Excellent | Feynman mode, exam questions |

Switch models anytime in ⚙️ Settings.

---

## 💻 System Requirements

| | Windows | Mac |
|---|---|---|
| **OS** | Windows 10 or 11 | macOS 12 Monterey or newer |
| **RAM** | 8 GB recommended (4 GB minimum with Cloud AI) | 8 GB recommended (Apple Silicon M1+ works great) |
| **Storage** | ~5 GB for all 3 models | ~5 GB for all 3 models |
| **Browser** | Google Chrome 114+ | Google Chrome 114+ |
| **Internet** | Required during setup | Required during setup |

---

## 📖 Study Modes

### How to start

1. Go to a Canvas course page with files
2. The extension detects PDFs, slides, Word docs, Excel files automatically
3. Click a **file chip** to extract the text
4. Select a mode and click **Generate**

---

### 📝 Summary
Structured bullet-point summary of the content, grouped by topic.  
*Use before class to preview, or after class to review.*

---

### ❓ Short Questions
10 short-answer quiz questions with model answers.  
*Use to quickly check if you remember the key facts.*

---

### 🤔 Open Questions
6 open-ended discussion questions for critical thinking.  
*Use to prepare for seminars or written assignments.*

---

### 📋 Exam Questions
A complete mock exam:
- **Section A** — 4 multiple choice questions (correct answer marked)
- **Section B** — 3 short answer questions (with model answers)
- **Section C** — 1 essay question (with answer outline)

*Use in the week before an exam.*

---

### 💡 Hints
- **Key Concepts** — the 5 most important ideas
- **Watch Out For** — common mistakes and tricky parts
- **Memory Tricks** — mnemonics and tips
- **In Plain English** — a simple one-paragraph explanation

*Use when something is not clicking and you need a different angle.*

---

### 🧠 Study Mode — Active Recall

**The most effective way to study.**

How it works:
1. AI generates 6 questions — answers are hidden from you
2. Questions appear one at a time
3. You type your answer before seeing the model answer
4. AI evaluates: ✅ Correct / ⚠️ Partial / ❌ Wrong + one sentence of feedback
5. Model answer is revealed after your attempt
6. Session ends with your score % and the option to retry only the ones you got wrong

**Why it works:** Forcing yourself to produce an answer before seeing it is called *active recall* — the most evidence-backed study technique in educational research. Re-reading notes is much less effective.

---

### 🎓 Feynman Mode

**Based on the Feynman Technique**, developed by Nobel Prize physicist Richard Feynman.

*"If you cannot explain something simply, you do not truly understand it."*

How it works:
1. AI identifies 3–5 key topics from your content
2. Each topic appears one at a time
3. You explain the topic in your own words — as if teaching a complete beginner
4. AI evaluates your explanation with a score (1–10) and structured feedback:
   - What you got right
   - Gaps in your explanation
   - Any misconceptions
   - How to improve
5. Score below 6 → retry button shown, next topic locked
6. Score 6 or above → move to the next topic

**Why it works:** Writing an explanation forces you to confront exactly what you do and do not know. It is a more accurate test of understanding than answering questions about something you just read.

---

### 🃏 Flashcards

12 interactive flip cards generated from your content.

- Click a card to reveal the answer
- Click **✓ Knew it** or **✗ Didn't know** after each card
- At the end: retry only the cards you missed

---

## ✏️ Right-click shortcuts

Select any text on a Canvas page, right-click, and choose:

- **Explain this with AI** — opens the panel with an instant explanation
- **Summarise this with AI** — opens the panel with an instant summary

---

## ☁️ Using Cloud AI (no powerful laptop needed)

Students with older laptops (less than 8 GB RAM) can use a cloud AI provider instead of Ollama. The output quality is also significantly better with cloud models.

In **⚙️ Settings → Cloud AI**, select a provider and paste your API key:

| Provider | Cost | Free tier | Sign up |
|---|---|---|---|
| **OpenRouter** | Pay per use | ✅ Yes | openrouter.ai/keys |
| **OpenAI** | ~€0.001 per run | ❌ No | platform.openai.com/api-keys |
| **Anthropic** | ~€0.001 per run | ❌ No | console.anthropic.com |

When a cloud key is set, it is used automatically. The extension falls back to Ollama if no key is configured.

**Privacy note:** When using cloud AI, your study content is sent to the provider's servers. With local Ollama, everything stays on your laptop.

---

## 📓 Save to Notion

In **⚙️ Settings → Notion**:

1. Paste your Notion Integration Token
   - Go to notion.so → Settings → Connections → Develop or manage integrations → New integration
   - Copy the token (starts with `secret_`)
2. Add your subject pages:
   - Open a Notion page for a subject
   - Copy the page ID from the URL (the 32-character string at the end)
   - Enter the name and ID in Settings → click **+ Add**
3. Click **Save Settings**

When you save an output, it creates a new sub-page inside the selected subject page, titled with the file name and mode.

---

## 🔧 Troubleshooting

### "Ollama is not reachable"

**Windows:** Look for the Ollama icon in the system tray (bottom-right near the clock). If it is not there, open Ollama from the Start menu.

**Mac:** Open Terminal and run:
```bash
ollama serve
```
Leave the Terminal window open while using the extension.

Or re-run the installer — it will set Ollama to start automatically on login.

---

### "No files detected"

- Make sure you are on a specific Canvas **course content page**, not the dashboard
- Navigate to a module, file, or assignment page
- The extension only works on `thomasmore.instructure.com`

---

### "Error extracting file"

- Make sure you are logged into Canvas
- Refresh the Canvas page, then click the file chip again
- Files larger than 50 MB may time out — try a smaller file first

---

### "The output does not follow the format" or looks like random text

- Switch to a larger model: `gemma3:1b` or `phi3:mini` in ⚙️ Settings
- Or connect a Cloud AI provider for much more reliable results
- The `qwen2.5:0.5b` model is very small and may not follow format instructions — use it only for quick summaries

---

### Extension not visible in Chrome

- Go to `chrome://extensions` and confirm Developer mode is on
- Click the puzzle piece icon in the Chrome toolbar and pin the extension
- If it shows as disabled, click the toggle to enable it

---

### Mac: "Permission denied" when running install.sh

Open Terminal and run:
```bash
chmod +x /path/to/canvas-ext-v2/install.sh
./install.sh
```

---

## 🔒 Privacy

| Action | Where your data goes |
|---|---|
| Generating with Ollama | **Stays on your laptop — nothing sent anywhere** |
| Generating with Cloud AI | Sent to OpenAI, Anthropic, or OpenRouter servers |
| Saving to Notion | Sent to Notion's servers |
| Settings, history, subjects | Stored locally in Chrome's encrypted storage only |

---

## 📁 What is in this folder

```
canvas-ext-v2/
│
├── install.bat          ← Windows one-click installer
├── install.sh           ← Mac one-click installer
├── README.md            ← This file
├── TRAIN_QWEN.md        ← Guide: how to fine-tune your own AI model
│
├── manifest.json        ← Chrome extension configuration
├── background.js        ← File extraction engine + cloud AI routing
├── content.js           ← Canvas page file scanner
├── popup.html           ← Extension interface
├── popup.js             ← Extension logic (modes, history, settings)
│
├── libs/
│   ├── pdf.min.js           ← PDF text extraction (Mozilla PDF.js)
│   ├── pdf.worker.min.js
│   ├── mammoth.browser.min.js  ← Word document extraction
│   └── jszip.min.js         ← PowerPoint and Excel extraction
│
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

*Built for Thomas More University College students.*  
*Local AI powered by Ollama. File extraction uses PDF.js, Mammoth.js, and JSZip — all open source.*
