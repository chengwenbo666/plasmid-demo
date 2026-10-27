#!/bin/zsh

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "没有找到 Node.js。请先安装 Node.js 22 或更高版本。"
  read -k 1 "?按任意键退出..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "第一次运行，正在安装依赖，请稍候..."
  npm install || exit 1
fi

echo "正在启动质粒图谱网站..."
npm run dev &
SERVER_PID=$!
sleep 3
open "http://localhost:3000"

echo "网站已打开。关闭此窗口会停止网站。"
wait $SERVER_PID
