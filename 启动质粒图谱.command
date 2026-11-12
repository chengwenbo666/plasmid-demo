#!/bin/zsh
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ ! -f "$PROJECT_DIR/质粒图谱.html" ]]; then
  osascript -e 'display alert "找不到质粒图谱.html" message "请重新下载完整项目。"'
  exit 1
fi
open "$PROJECT_DIR/质粒图谱.html"
