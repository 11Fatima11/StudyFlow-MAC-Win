# 🎓 StudyFlow
### AI-powered study assistant built into Canvas

StudyFlow is a Chrome extension that brings AI study tools directly into Canvas — the learning platform used at Thomas More. Load any lecture file and instantly get summaries, quizzes, flashcards, active recall sessions, and Feynman-style explanations. Everything runs locally on your laptop using Ollama, so your data never leaves your device.

> Built as a first-year student project using Claude Sonnet 4.6 and Ollama.

---

## ✨ What it does

| Mode | What you get |
|------|-------------|
| 📝 Summary | Structured bullet-point summary grouped by topic |
| ❓ Short Questions | 10 quiz questions with model answers |
| 🤔 Open Questions | 6 discussion questions for critical thinking |
| 📋 Exam Questions | Full mock exam — multiple choice, short answer, essay |
| 💡 Hints | Key concepts, common mistakes, memory tricks, plain-English explanation |
| 🧠 Active Recall | AI hides answers — you answer first, then get evaluated |
| 🎓 Feynman Mode | Explain a topic in your own words, AI scores and gives feedback |
| 🃏 Flashcards | 12 flip cards, retry only the ones you missed |

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


### How to start

1. Go to a Canvas course page with files
2. The extension detects PDFs, slides, Word docs, Excel files automatically
3. Click a **file chip** to extract the text
4. Select a mode and click **Generate**
   
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
## 🛠️ Built with

- [Claude Sonnet 4.6](https://anthropic.com) — AI code generation and iteration
- [Ollama](https://ollama.com) — local AI model runner
- [PDF.js](https://mozilla.github.io/pdf.js/) — PDF extraction
- [Mammoth.js](https://github.com/mwilliamson/mammoth.js) — Word document extraction
- [JSZip](https://stuk.github.io/jszip/) — PowerPoint and Excel extraction

---

*Built for Thomas More University College students.*
