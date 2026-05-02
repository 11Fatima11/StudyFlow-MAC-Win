#!/bin/bash

# ================================================================
#  Canvas AI Helper — One-Click Installer for macOS
#  Installs: Ollama + gemma3:1b + phi3:mini + qwen2.5:0.5b
# ================================================================

set -e  # Stop on first error (we handle errors manually below)

# ── Colours ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

clear
echo ""
echo -e "${BOLD}  ============================================================${RESET}"
echo -e "${BOLD}   🎓  Canvas AI Helper — One-Click Installer (macOS)${RESET}"
echo -e "${BOLD}  ============================================================${RESET}"
echo ""
echo "  This will install everything you need to study with AI:"
echo ""
echo "    Step 1 — Install Homebrew (macOS package manager)"
echo "    Step 2 — Install Ollama (local AI runtime)"
echo "    Step 3 — Download 3 AI models  (~3.5 GB total)"
echo "    Step 4 — Test that everything works"
echo ""
echo "  Requirements:"
echo "    - macOS 12 Monterey or newer"
echo "    - Internet connection"
echo "    - ~5 GB free disk space"
echo "    - About 15-25 minutes"
echo ""
echo -e "  Press ${BOLD}Return${RESET} to start, or ${BOLD}Ctrl+C${RESET} to cancel."
read -r

# ── Step 1: Check macOS version ───────────────────────────────────
echo ""
echo -e "${CYAN}  [Step 1/5]  Checking system...${RESET}"

MACOS_VERSION=$(sw_vers -productVersion)
MACOS_MAJOR=$(echo "$MACOS_VERSION" | cut -d. -f1)

if [ "$MACOS_MAJOR" -lt 12 ]; then
    echo ""
    echo -e "${RED}  ERROR: macOS $MACOS_VERSION is too old.${RESET}"
    echo "         Ollama requires macOS 12 Monterey or newer."
    echo "         Please update your Mac in System Settings → Software Update."
    echo ""
    exit 1
fi
echo -e "${GREEN}         macOS $MACOS_VERSION — OK${RESET}"

# Check internet
if ! ping -c 1 -t 3 ollama.com > /dev/null 2>&1; then
    echo ""
    echo -e "${RED}  ERROR: No internet connection.${RESET}"
    echo "         Connect to the internet and run this installer again."
    echo ""
    exit 1
fi
echo -e "${GREEN}         Internet connection — OK${RESET}"
echo ""

# ── Step 2: Install Homebrew (if needed) ─────────────────────────
echo -e "${CYAN}  [Step 2/5]  Checking for Homebrew...${RESET}"

if command -v brew &> /dev/null; then
    echo -e "${GREEN}         Homebrew is already installed — skipping.${RESET}"
else
    echo "         Not found. Installing Homebrew..."
    echo "         (You may be asked for your Mac password — this is normal)"
    echo ""
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for Apple Silicon Macs
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
    fi

    if ! command -v brew &> /dev/null; then
        echo ""
        echo -e "${RED}  ERROR: Homebrew installation failed.${RESET}"
        echo "         Please install it manually: https://brew.sh"
        echo "         Then run this installer again."
        echo ""
        exit 1
    fi
    echo ""
    echo -e "${GREEN}         Homebrew installed successfully.${RESET}"
fi
echo ""

# ── Step 3: Install Ollama ────────────────────────────────────────
echo -e "${CYAN}  [Step 3/5]  Checking for Ollama...${RESET}"

if command -v ollama &> /dev/null; then
    echo -e "${GREEN}         Ollama is already installed — skipping download.${RESET}"
else
    echo "         Installing Ollama via Homebrew..."
    echo "         (this downloads ~150 MB)"
    echo ""
    brew install ollama

    if ! command -v ollama &> /dev/null; then
        echo ""
        echo -e "${RED}  ERROR: Ollama installation failed.${RESET}"
        echo "         Try installing manually: https://ollama.com/download"
        echo ""
        exit 1
    fi
    echo ""
    echo -e "${GREEN}         Ollama installed successfully.${RESET}"
fi
echo ""

# ── Step 4: Start Ollama service ──────────────────────────────────
echo -e "${CYAN}  [Step 4/5]  Starting Ollama service...${RESET}"

# Check if already running
if ollama list > /dev/null 2>&1; then
    echo -e "${GREEN}         Ollama is already running.${RESET}"
else
    # Start as background service
    brew services start ollama 2>/dev/null || ollama serve &>/dev/null &
    echo "         Waiting for Ollama to start..."
    sleep 5

    # Retry check
    if ! ollama list > /dev/null 2>&1; then
        echo "         Giving it a little more time..."
        sleep 6
    fi

    if ! ollama list > /dev/null 2>&1; then
        echo ""
        echo -e "${YELLOW}  WARNING: Ollama may not have started correctly.${RESET}"
        echo "           Trying to continue anyway..."
        echo ""
    else
        echo -e "${GREEN}         Ollama is running.${RESET}"
    fi
fi
echo ""

# ── Step 5: Download models ───────────────────────────────────────
echo -e "${CYAN}  [Step 5/5]  Downloading AI models...${RESET}"
echo ""
echo "  This is the longest step (10-25 minutes depending on internet speed)."
echo "  Total download: approximately 3.5 GB."
echo "  Do not close this window while models are downloading."
echo ""
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │  1. qwen2.5:0.5b   ~400 MB   Ultra fast - quick tasks  │"
echo "  │  2. gemma3:1b      ~1.5 GB   Recommended for studying  │"
echo "  │  3. phi3:mini      ~2.2 GB   Best quality - Feynman    │"
echo "  └─────────────────────────────────────────────────────────┘"
echo ""

# -- Model 1: qwen2.5:0.5b --
echo -e "${BOLD}  Downloading 1 of 3: qwen2.5:0.5b  (ultra fast, ~400 MB)${RESET}"
echo "  ─────────────────────────────────────────────────────────"
if ollama pull qwen2.5:0.5b; then
    echo -e "${GREEN}  qwen2.5:0.5b ✓ downloaded${RESET}"
else
    echo -e "${YELLOW}  WARNING: qwen2.5:0.5b failed — skipping, continuing...${RESET}"
fi
echo ""

# -- Model 2: gemma3:1b --
echo -e "${BOLD}  Downloading 2 of 3: gemma3:1b  (recommended, ~1.5 GB)${RESET}"
echo "  ─────────────────────────────────────────────────────────"
if ollama pull gemma3:1b; then
    echo -e "${GREEN}  gemma3:1b ✓ downloaded${RESET}"
else
    echo -e "${YELLOW}  WARNING: gemma3:1b failed — skipping, continuing...${RESET}"
fi
echo ""

# -- Model 3: phi3:mini --
echo -e "${BOLD}  Downloading 3 of 3: phi3:mini  (best quality, ~2.2 GB)${RESET}"
echo "  ─────────────────────────────────────────────────────────"
if ollama pull phi3:mini; then
    echo -e "${GREEN}  phi3:mini ✓ downloaded${RESET}"
else
    echo -e "${YELLOW}  WARNING: phi3:mini failed.${RESET}"
    echo -e "           You can download it later: ${BOLD}ollama pull phi3:mini${RESET}"
fi
echo ""

# ── Verify ────────────────────────────────────────────────────────
echo "  Installed models:"
echo "  ─────────────────────────────────────────────────────────"
ollama list
echo ""

MODEL_COUNT=$(ollama list 2>/dev/null | tail -n +2 | grep -c . || echo 0)

# ── Make Ollama start automatically on login ──────────────────────
echo "  Setting Ollama to start automatically on login..."
brew services start ollama 2>/dev/null || true
echo ""

# ── Done ──────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BOLD}${GREEN}  ============================================================${RESET}"
echo -e "${BOLD}${GREEN}   ✅  Installation Complete!${RESET}"
echo -e "${BOLD}${GREEN}  ============================================================${RESET}"
echo ""
echo -e "  ${MODEL_COUNT} AI model(s) installed and ready."
echo ""
echo -e "${BOLD}  HOW TO INSTALL THE CHROME EXTENSION:${RESET}"
echo "  ─────────────────────────────────────────────────────────"
echo ""
echo "  1. Open Google Chrome"
echo ""
echo "  2. Type this in the address bar and press Return:"
echo -e "         ${BOLD}chrome://extensions${RESET}"
echo ""
echo "  3. Turn on  Developer mode  (toggle in top-right corner)"
echo ""
echo "  4. Click  Load unpacked"
echo "     Select the folder:  canvas-ext-v2"
echo "     (the folder containing this install.sh file)"
echo ""
echo "  5. Go to Canvas:  thomasmore.instructure.com"
echo "     The AI panel opens automatically on the right side"
echo ""
echo "  6. Click the Settings gear ⚙️ in the extension"
echo "     Click ↻ Refresh to load models"
echo "     Select your model → Save Settings"
echo ""
echo -e "${BOLD}  WHICH MODEL SHOULD I USE?${RESET}"
echo "  ─────────────────────────────────────────────────────────"
echo "   gemma3:1b     — Best for most tasks  ← Start here"
echo "   qwen2.5:0.5b  — When you need a very quick result"
echo "   phi3:mini     — Best quality (Feynman mode, exam questions)"
echo ""
echo -e "${BOLD}  KEEPING OLLAMA RUNNING:${RESET}"
echo "  ─────────────────────────────────────────────────────────"
echo "   Ollama is set to start automatically when you log in."
echo "   If the extension says Ollama is not reachable, run:"
echo -e "         ${BOLD}ollama serve${RESET}"
echo "   in a Terminal window, then try again."
echo ""
echo "  ─────────────────────────────────────────────────────────"
echo ""
echo "  Press Return to close this window."
read -r
