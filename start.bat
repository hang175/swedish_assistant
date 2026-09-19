@echo off
rem Double-click this file to start Swedish Assistant.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Please install the "LTS" version from https://nodejs.org and then run this file again.
  pause
  exit /b 1
)
echo Checking dependencies...
call npm install --no-fund --no-audit
if errorlevel 1 ( pause & exit /b 1 )
echo Starting... the app opens in your browser. Close this window to stop it.
call npm run dev
pause
