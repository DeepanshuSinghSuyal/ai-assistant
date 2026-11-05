# ⚡ AR ASSISTANT // MULTIMODAL REAL-TIME SOFTWARE TUTOR & 3D PICTURE-BOOK

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Gemini Live](https://img.shields.io/badge/Gemini_Live-gemini--3.1--flash--live-purple.svg)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent, real-time multimodal companion and software tutor powered by **Google Gemini Live (`gemini-3.1-flash-live-preview`)**.

As you work in any software application (Blender, Unreal Engine, Photoshop, Premiere, DaVinci Resolve, VS Code, terminal tools, CAD, or web apps), the assistant continuously watches your workspace via **1-second discrete frame snapshots**, listens to your voice or typed questions, and responds with **fluid, native 24kHz voice output** and live terminal subtitles—synchronized with an **ultra-luxury interactive 3D WebGL Picture-Book visualizer**.

---

## 🌟 Key Features

* **⚡ Ultra-Low Latency Multimodal Live**: Powered by Google Gemini 3.1 Live full-duplex WebSockets with sub-1.8s turnaround.
* **👁️ 1-Second Discrete Spatial Sampling**: Uses threaded MSS screen capture to capture a high-resolution workspace snapshot every second without token bloat or video streaming lag.
* **🎙️ Fluid Voice & Audio Playback**: Native 24kHz 16-bit linear PCM audio streaming through your speakers via PortAudio / sounddevice with synchronous terminal subtitles.
* **🌐 Live Interactive 3D Picture-Book Visualizer**: A luxury silver, platinum, chrome, and crystal WebGL 3D stage (`http://localhost:8765`) that dynamically mirrors the terminal assistant lifecycle in real time:
  * **01 Audio In**: Chrome sound capsule glows when recording voice.
  * **02 Spatial Eye**: Shutter blinks every 1 second as snapshots occur.
  * **03 Fusion Core**: High-speed gyroscopic spin while synthesizing reasoning for your prompt.
  * **04 Voice Out**: Radiating harmonic acoustic waves while voice and subtitles stream live.
* **🧠 Day-in-the-Life Memory Journal**: Tracks learning milestones and software workflows across sessions in daily JSON ledgers (`.memory/day_YYYY-MM-DD.json`).
* **🔒 Privacy-First**: API keys and local memory journals are strictly kept on your machine and never tracked in version control.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Python 3.10 or higher** (tested on Python 3.12).
* **A Google Gemini API Key**: Get a free API key from [Google AI Studio](https://aistudio.google.com/).
* A working microphone and speakers / headphones.

### 2. Clone the Repository

```bash
git clone https://github.com/DeepanshuSinghSuyal/ai-assistant.git
cd ai-assistant
```

### 3. Install Dependencies

You can use standard `pip` or modern `uv`:

```bash
# Using pip
pip install -r requirements.txt

# Or install in editable mode
pip install -e .
```

*(On Windows, ensure PortAudio is supported via `sounddevice` which bundles wheels automatically).*

### 4. Configure Your API Key

1. Copy the template configuration file:
   ```bash
   # On Windows (PowerShell)
   Copy-Item .env.example .env

   # On Linux/macOS
   cp .env.example .env
   ```

2. Open `.env` and paste your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

*(Note: If you launch the assistant without setting the key in `.env`, the assistant will automatically prompt you to enter it in the terminal and save it for you).*

### 5. Launch the Assistant

Run the assistant from your terminal:

```bash
# Using Python directly
python main.py

# Or via CLI script (if installed with pip -e .)
assistant

# Or on Windows using the batch launcher
run.bat
```

1. Select your target display or drag a crop box over your software application.
2. The **3D Picture-Book automatically launches** in your default browser at `http://localhost:8765`.
3. Speak or type your questions!

---

## 🎮 Terminal Commands & Shortcuts

While the assistant is running:

| Key / Command | Action |
| :--- | :--- |
| **Type question** | Type any question and press Enter to query the assistant with visual context |
| **`v`** | Speak directly into your microphone (records 4 seconds of voice audio) |
| **`s`** | Force an immediate screen snapshot right now |
| **`r`** | Re-crop your active software window |
| **`d`** | Cycle to another display/monitor |
| **`c`** | Clear terminal and re-print status HUD |
| **`q`** | Save today's contextual memory journal and safely exit |

---

## 📖 The 3D Picture-Book Architecture

Open `http://localhost:8765` while the assistant runs to explore the interactive 3D stage:

* **▶ AUTO-TOUR FOR TEACHER**: Automatically glides through the 4 chapters every 7.5 seconds, smoothly flying the 3D camera to each component for effortless presentations.
* **RUN LIVE CYCLE DEMO**: Demonstrates a full synthetic roundtrip data flow (Audio In ➔ 1s Eye Shutter ➔ Core Spin ➔ Voice Out ➔ Idle).
* **FREE 3D ORBIT**: Click and drag to orbit in 3D, right-click to pan, and scroll to zoom.
* **Offline-First**: All WebGL libraries (`Three.js`, `OrbitControls`, `Tween.js`) and visual vector assets are bundled locally in `web/libs/` and `web/assets/`.

---

## 📁 Project Structure

```
ai-assistant/
├── src/
│   ├── main.py        # Core Gemini Live loop & audio/screen orchestration
│   ├── config.py      # Environment variables & runtime settings
│   ├── screen.py      # MSS/GDI fast screen capture & Tkinter region crop selector
│   ├── observer.py    # 1.0s background screen snapshot engine & telemetry dispatcher
│   ├── audio.py       # Microphone voice recording & sounddevice player
│   ├── memory.py      # Daily contextual memory ledger manager
│   ├── server.py      # Local HTTP & WebSocket telemetry server (ports 8765/8766)
│   └── ui.py          # Rich terminal HUD & streaming subtitles
├── web/
│   ├── index.html     # 3D Picture-Book UI & Live Synchronization HUD
│   ├── style.css      # Ultra-luxury silver/platinum/obsidian frosted glass styling
│   ├── app.js         # Three.js WebGL scene, PMREM studio lighting & live WebSocket loop
│   ├── libs/          # Bundled offline Three.js, OrbitControls & Tween.js
│   └── assets/        # Visual vector concept illustrations (Chapters 1-4)
├── main.py            # Root launcher entrypoint
├── run.bat            # Windows quick-launch script
├── pyproject.toml     # Packaging metadata & dependency definitions
├── requirements.txt   # Standard pip requirements
├── .env.example       # Safe public configuration template
└── .gitignore         # Strict security exclusions (keeps your keys & memory local)
```

---

## 🛡️ Security & Privacy

* Your **`GEMINI_API_KEY` is never committed to GitHub**. It remains strictly in your local `.env` file, which is listed in `.gitignore`.
* All screen captures and audio processing are streamed securely over encrypted WebSockets directly to Google's official Gemini Live endpoints (`bidiGenerateContent`).
* Local memory logs are stored strictly on your local machine in `.memory/`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
