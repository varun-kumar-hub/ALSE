@echo off
setlocal enabledelayedexpansion

echo ===================================================================
echo   LearnForge AI Desktop - One-Click Installer & Runner
echo   Open-Source Adaptive Learning Platform
echo ===================================================================
echo.

cd /d "%~dp0\.."

:: 1. Verify Node.js
echo [*] Checking Node.js runtime...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Node.js is NOT installed on this system.
    echo [*] Please install Node.js v18+ from https://nodejs.org/ and re-run this script.
    pause
    exit /b 1
)
node -v
echo [OK] Node.js is installed.
echo.

:: 2. Install NPM dependencies
echo [*] Installing frontend & application packages (npm install)...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [!] Failed to install NPM dependencies.
    pause
    exit /b 1
)
echo [OK] NPM dependencies installed successfully.
echo.

:: 3. Check Python for PS6 ML Backend (Optional but recommended)
echo [*] Checking Python environment for Adaptive Engine...
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Python is available. Installing backend ML dependencies...
    if exist "backend\requirements.txt" (
        pip install -r backend\requirements.txt >nul 2>&1
        echo [OK] Python ML backend dependencies ready.
    )
) else (
    echo [i] Python not detected on PATH. LearnForge will run in lightweight client mode.
)
echo.

:: 4. Launch Desktop Application / Dev Runtime
echo ===================================================================
echo   Starting LearnForge Desktop Application...
echo   App URL: http://localhost:1420
echo ===================================================================
echo.

:: Open default browser to the app
start "" "http://localhost:1420"

:: Start full dev runtime (Frontend + ML Engine)
call npm run dev

pause
