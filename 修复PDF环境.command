#!/bin/bash
# 词舟 — PDF 环境修复（macOS 双击运行）
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
chmod +x fix-pdf-env.sh
./fix-pdf-env.sh
