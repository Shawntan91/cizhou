#!/bin/bash
# 词舟 — 一键启动（macOS 双击运行）
# 首次运行需安装依赖，会自动打开浏览器窗口
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
chmod +x start.sh
./start.sh
