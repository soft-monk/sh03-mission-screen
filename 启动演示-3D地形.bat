@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   FastHTML demo - 3D TERRAIN version
echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js first.
  pause
  exit /b 1
)
node serve.mjs 3d
pause