@echo off
setlocal
cd /d "%~dp0"

echo Starting Teaching Agent...
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first.
  pause
  exit /b 1
)

start "Teaching Agent Backend" /min /D "%~dp0" node server.mjs
timeout /t 2 /nobreak >nul
start "" "http://localhost:4173/"

echo Teaching Agent is running at http://localhost:4173/
echo Keep the backend window open while using the interface.
endlocal

