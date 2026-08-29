@echo off
cd /d "%~dp0\.."

echo Starting LearnForge AI Desktop...
start "" "http://localhost:1420"
npm run dev
