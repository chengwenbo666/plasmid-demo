@echo off
setlocal
cd /d "%~dp0"
if not exist "%~dp0Plasmid-Demo.html" (
  echo Please extract the complete ZIP before starting Plasmid Demo.
  pause
  exit /b 1
)
start "" "%~dp0Plasmid-Demo.html"
