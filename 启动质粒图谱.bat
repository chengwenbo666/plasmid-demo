@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo 第一次运行，正在安装依赖，请稍候...
  call npm install
  if errorlevel 1 pause & exit /b 1
)

echo 正在启动质粒图谱网站...
start "Plasmid Demo" cmd /k "npm run dev"
timeout /t 4 /nobreak >nul
start "" http://localhost:3000

echo 网站已打开。关闭启动窗口即可停止网站。
endlocal
