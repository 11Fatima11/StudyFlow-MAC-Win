@echo off
setlocal enabledelayedexpansion
title Canvas AI Helper -- Installer

:: ================================================================
::  Canvas AI Helper - One-Click Installer for Windows
::  Installs: Ollama + gemma3:1b + phi3:mini + qwen2.5:0.5b
:: ================================================================

color 0B
echo.
echo  ============================================================
echo    Canvas AI Helper -- One-Click Installer
echo  ============================================================
echo.
echo  This will install everything you need to study with AI:
echo.
echo    Step 1 - Download and install Ollama (local AI runtime)
echo    Step 2 - Download 3 AI models  (~3.5 GB total)
echo    Step 3 - Test that everything works
echo.
echo  Requirements:
echo    - Windows 10 or 11
echo    - Internet connection
echo    - ~4 GB free disk space
echo    - About 10-20 minutes
echo.
echo  Press any key to start, or close this window to cancel.
pause > nul
cls

:: ----------------------------------------------------------------
:: STEP 1 -- Check internet
:: ----------------------------------------------------------------
echo.
echo  [Step 1/5]  Checking internet connection...
ping -n 1 ollama.com > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: No internet connection.
    echo         Connect to the internet and run this installer again.
    echo.
    pause
    exit /b 1
)
echo              OK
echo.

:: ----------------------------------------------------------------
:: STEP 2 -- Install Ollama (skip if already installed)
:: ----------------------------------------------------------------
echo  [Step 2/5]  Checking for Ollama...

:: Check if already installed
where ollama > nul 2>&1
if %errorlevel% equ 0 (
    echo              Already installed - skipping download.
    goto :startservice
)
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    echo              Already installed - skipping download.
    set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"
    goto :startservice
)

:: Download Ollama installer
echo              Not found. Downloading Ollama installer...
echo              (this is about 150 MB, may take 1-2 minutes)
echo.
set "INSTALLER=%TEMP%\OllamaSetup.exe"

powershell -NoProfile -Command ^
  "$ProgressPreference='SilentlyContinue';" ^
  "Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile '%INSTALLER%'"

if not exist "%INSTALLER%" (
    echo.
    echo  ERROR: Download failed.
    echo         Please download Ollama manually from:
    echo         https://ollama.com/download
    echo         Then run this installer again.
    echo.
    pause
    exit /b 1
)

echo.
echo  [Step 3/5]  Installing Ollama...
echo              (a small window will appear and close - this is normal)
echo.
"%INSTALLER%" /silent

:: Wait for installer to finish
echo              Waiting for installation to complete...
timeout /t 12 /nobreak > nul

:: Add to PATH for this session
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"

:: Verify
where ollama > nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
        set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"
    ) else (
        echo.
        echo  ERROR: Installation could not be verified.
        echo         Please restart your computer and run this again.
        echo         Or install manually: https://ollama.com/download
        echo.
        pause
        exit /b 1
    )
)
echo              Ollama installed successfully.
echo.
goto :startservice_label

:startservice
echo.

:startservice_label
:: ----------------------------------------------------------------
:: STEP 3 -- Start Ollama service
:: ----------------------------------------------------------------
echo  [Step 3/5]  Starting Ollama...

ollama list > nul 2>&1
if %errorlevel% equ 0 (
    echo              Already running.
    goto :models
)

start /min "" ollama serve
echo              Waiting for Ollama to start...
timeout /t 6 /nobreak > nul

ollama list > nul 2>&1
if %errorlevel% neq 0 (
    echo              Giving it a little more time...
    timeout /t 8 /nobreak > nul
)

ollama list > nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  WARNING: Ollama may not have started correctly.
    echo           Trying to continue anyway...
    echo.
) else (
    echo              Ollama is running.
)
echo.

:models
:: ----------------------------------------------------------------
:: STEP 4 -- Download AI models
:: ----------------------------------------------------------------
echo  [Step 4/5]  Downloading AI models...
echo.
echo  This is the longest step (5-20 minutes depending on internet speed).
echo  Total download: approximately 3.5 GB
echo.
echo  +----------------------------------------------------------+
echo  ^|  1. qwen2.5:0.5b   400 MB    Ultra fast - quick tasks  ^|
echo  ^|  2. gemma3:1b       1.5 GB    Recommended for studying  ^|
echo  ^|  3. phi3:mini       2.2 GB    Best quality - Feynman    ^|
echo  +----------------------------------------------------------+
echo.
echo  Do not close this window while models are downloading.
echo.

:: -- Model 1: qwen2.5:0.5b --
echo  Downloading model 1 of 3: qwen2.5:0.5b  (ultra fast, ~400 MB)
echo  -----------------------------------------------------------
ollama pull qwen2.5:0.5b
if %errorlevel% neq 0 (
    echo  WARNING: qwen2.5:0.5b failed. Skipping, continuing...
) else (
    echo  qwen2.5:0.5b -- downloaded successfully
)
echo.

:: -- Model 2: gemma3:1b --
echo  Downloading model 2 of 3: gemma3:1b  (recommended, ~1.5 GB)
echo  -----------------------------------------------------------
ollama pull gemma3:1b
if %errorlevel% neq 0 (
    echo  WARNING: gemma3:1b failed. Skipping, continuing...
) else (
    echo  gemma3:1b -- downloaded successfully
)
echo.

:: -- Model 3: phi3:mini --
echo  Downloading model 3 of 3: phi3:mini  (best quality, ~2.2 GB)
echo  -----------------------------------------------------------
ollama pull phi3:mini
if %errorlevel% neq 0 (
    echo  WARNING: phi3:mini failed.
    echo           You can download it later: ollama pull phi3:mini
) else (
    echo  phi3:mini -- downloaded successfully
)
echo.

:: ----------------------------------------------------------------
:: STEP 5 -- Verify
:: ----------------------------------------------------------------
echo  [Step 5/5]  Verifying installation...
echo.

ollama list > nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Ollama is not responding.
    echo         Please restart your computer and try again.
    echo.
    pause
    exit /b 1
)

echo  Installed models:
echo  -----------------------------------------------------------
ollama list
echo.

:: Count models
set /a COUNT=0
for /f "skip=1 tokens=1" %%M in ('ollama list 2^>nul') do (
    set /a COUNT+=1
)

if %COUNT% equ 0 (
    echo  WARNING: No models detected.
    echo           Please check your internet and try the install again.
) else (
    echo  %COUNT% model(s) ready to use.
)

:: ================================================================
::  DONE -- Show next steps
:: ================================================================
cls
echo.
echo  ============================================================
echo    Installation Complete!
echo  ============================================================
echo.
echo  All %COUNT% AI model(s) are installed and ready.
echo.
echo  HOW TO INSTALL THE CHROME EXTENSION:
echo  -----------------------------------------------------------
echo.
echo  1. Open Google Chrome
echo.
echo  2. Go to:  chrome://extensions
echo     (type this in the address bar)
echo.
echo  3. Turn on "Developer mode"
echo     (toggle in the top-right corner of the page)
echo.
echo  4. Click "Load unpacked"
echo     Select the folder:  canvas-ext-v2
echo     (the folder that contains this install.bat file)
echo.
echo  5. Go to Canvas:  thomasmore.instructure.com
echo     The AI panel opens automatically on the right side
echo.
echo  6. Click the Settings gear in the extension
echo     Click the Refresh button to load models
echo     Select your model and click Save Settings
echo.
echo  WHICH MODEL SHOULD I USE?
echo  -----------------------------------------------------------
echo.
echo    gemma3:1b     -- Best for most tasks (summaries, questions)
echo    qwen2.5:0.5b  -- When you need a very quick result
echo    phi3:mini     -- When you need the best quality
echo                     (Feynman mode, exam questions)
echo.
echo  IMPORTANT - KEEP OLLAMA RUNNING:
echo  -----------------------------------------------------------
echo.
echo    Ollama runs automatically in the system tray after reboot.
echo    If the extension says Ollama is not reachable, open the
echo    Ollama app from your Start menu to restart it.
echo.
echo  ============================================================
echo.
echo  Press any key to close this window.
pause > nul
