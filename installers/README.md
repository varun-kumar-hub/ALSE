# 🚀 LearnForge Open-Source Setup & Desktop Installer Guide

LearnForge is an open-source adaptive learning platform and desktop application with real-time Bayesian Knowledge Tracing (BKT), knowledge graph synthesis, and PS6 intervention modeling.

---

## ⚡ Single-Command Quickstart

### On Windows
Simply double-click:
```bat
installers\install_and_run.bat
```
Or in PowerShell / CMD from the repository root:
```powershell
npm run dev
```

---

### On macOS / Linux
Run the setup shell script:
```bash
chmod +x installers/install_and_run.sh
./installers/install_and_run.sh
```

---

## 📦 Native Desktop App (Tauri)
To run or build as a compiled native Windows/macOS/Linux desktop `.exe` / `.dmg`:
```bash
# Run in Tauri Desktop Mode
npm run dev:desktop

# Build Release Installer
npm run tauri build
```

---

## ⚙️ Cloud AI Model Configuration (OX Alpha / OpenAI / 01-ai)

1. Open **Settings** (gear icon at bottom left of sidebar).
2. Under **Execution Mode**, select **Cloud Mode**.
3. Select **OX Alpha (01-ai)** or **OpenAI**.
4. Enter your API Key and click **Verify Credentials & Endpoint**.
5. Select `01-ai/yi-large` or your preferred model from the dropdown.
6. Click **Save Settings**!
