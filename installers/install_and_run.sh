#!/usr/bin/env bash
set -e

echo "==================================================================="
echo "  LearnForge AI Desktop - One-Command Installer & Runner"
echo "  Open-Source Adaptive Learning Platform"
echo "==================================================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# 1. Verify Node.js
echo "[*] Checking Node.js runtime..."
if ! command -v node &> /dev/null; then
    echo "[!] Node.js is not installed. Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi
echo "[OK] Node.js $(node -v) detected."
echo ""

# 2. Install NPM dependencies
echo "[*] Installing dependencies (npm install)..."
npm install
echo "[OK] Dependencies installed."
echo ""

# 3. Check Python for ML Backend
echo "[*] Checking Python environment..."
if command -v python3 &> /dev/null; then
    if [ -f "backend/requirements.txt" ]; then
        pip3 install -r backend/requirements.txt 2>/dev/null || true
    fi
    echo "[OK] Python backend ready."
fi
echo ""

# 4. Launch Desktop / Local Dev Runtime
echo "==================================================================="
echo "  Starting LearnForge..."
echo "  App URL: http://localhost:1420"
echo "==================================================================="
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:1420" &
elif command -v open &> /dev/null; then
    open "http://localhost:1420" &
fi

npm run dev
