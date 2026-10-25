#!/usr/bin/env bash
# 词舟 · PDF 环境诊断脚本
# 用法: 双击运行，或在终端执行 ./diagnose.sh
# 作用: 检查 Python / PyMuPDF / Tesseract 环境，并给出修复命令

cd "$(dirname "$0")"

echo "======================================"
echo "  词舟 · PDF 解析环境诊断"
echo "======================================"
echo ""

# 1. Node
echo "▶ Node.js"
echo "  $(node -v 2>/dev/null || echo '❌ 未找到')"
echo ""

# 2. Python
echo "▶ Python"
PY=$(which python3)
echo "  路径: $PY"
python3 --version 2>/dev/null
echo ""

# 3. PyMuPDF 检测
echo "▶ PyMuPDF（扫描版 PDF 需要，用于渲染页面）"
python3 -c "import fitz; print('  ✓ PyMuPDF', getattr(fitz,'__version__','已安装'))" 2>&1 | head -2
echo ""

# 4. Tesseract 检测
echo "▶ Tesseract OCR（扫描版 PDF 需要，用于文字识别）"
if command -v tesseract >/dev/null 2>&1; then
  echo "  ✓ $(tesseract --version 2>&1 | head -1)"
else
  echo "  ❌ 未找到 tesseract 命令"
fi
echo ""

# 5. Homebrew 检测
echo "▶ Homebrew"
if command -v brew >/dev/null 2>&1; then
  echo "  ✓ brew $(brew --version 2>/dev/null | head -1)"
  echo "  Python 位置: $(brew --prefix python 2>/dev/null || brew --prefix python3 2>/dev/null || echo '未知')"
else
  echo "  ❌ 未安装 Homebrew（如需安装：/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"）"
fi
echo ""

echo "======================================"
echo "  修复命令（根据上面缺失项执行）"
echo "======================================"
echo ""
echo "  【安装 PyMuPDF】（若上面 PyMuPDF 显示 ❌）"
echo "    pip3 install --user pymupdf"
echo "    或  brew install python@3.12 && pip3 install pymupdf"
echo ""
echo "  【安装 Tesseract】（若上面 Tesseract 显示 ❌）"
echo "    brew install tesseract"
echo ""
echo "  装完后重新运行本诊断，确认全部 ✓ 后再启动网站。"
echo ""
read -n 1 -s -r -p "  按任意键退出..."
echo ""
