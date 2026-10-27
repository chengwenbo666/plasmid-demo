@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Please install Node.js 22 or newer from https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please reinstall Node.js.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies for the first run...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting Plasmid Demo...
start "Plasmid Demo server" cmd /k "cd /d "%~dp0" && npm run dev"
timeout /t 5 /nobreak >nul
start "" http://localhost:3000
echo The browser should now be open at http://localhost:3000
pause
endlocal
