#!/usr/bin/env bash
# 词舟 · PDF OCR 环境一键修复
# 作用：让扫描版 PDF 也能识别。
#   方案（推荐）：用 Xcode 命令行工具自带 swiftc 编译 macOS 原生 Vision OCR，
#                 无需 pyobjc、无需 Homebrew、无需 Tesseract。
# 用法：双击运行，或在终端执行 ./fix-pdf-env.sh

cd "$(dirname "$0")"

echo "======================================"
echo "  词舟 · PDF OCR 环境一键修复"
echo "======================================"
echo ""

PY="python3"
echo "▶ 使用的 Python: $PY ($($PY --version 2>&1))"
echo ""

# ---------- 1. PyMuPDF ----------
echo "▶ 检查 PyMuPDF (import fitz) ..."
if $PY -c "import fitz" >/dev/null 2>&1; then
  echo "  ✓ PyMuPDF 已安装"
else
  echo "  未检测到，开始安装..."
  if $PY -m pip install --quiet pymupdf 2>/dev/null || $PY -m pip install --quiet --user pymupdf 2>/dev/null || $PY -m pip install --quiet --break-system-packages pymupdf 2>/dev/null; then
    echo "  ✓ PyMuPDF 安装成功"
  else
    echo "  ❌ PyMuPDF 安装失败，请手动执行: $PY -m pip install pymupdf"
  fi
fi
echo ""

# ---------- 2. macOS 原生 Vision OCR（swiftc 编译）----------
echo "▶ 检查 macOS 原生 OCR（swiftc + Vision framework）..."

# 定位 swiftc
SWIFTC=""
for c in /usr/bin/swiftc /usr/local/bin/swiftc /opt/homebrew/bin/swiftc /Library/Developer/CommandLineTools/usr/bin/swiftc; do
  [ -x "$c" ] && SWIFTC="$c" && break
done
if [ -z "$SWIFTC" ] && command -v swiftc >/dev/null 2>&1; then
  SWIFTC="$(command -v swiftc)"
fi

if [ -z "$SWIFTC" ]; then
  echo "  ❌ 未找到 swiftc 编译器。"
  echo "     需要安装 Xcode 命令行工具（免费，约 1-2 分钟）："
  echo "     打开终端执行: xcode-select --install"
  echo "     然后在弹出的窗口点「安装」。装完重新运行本脚本。"
else
  echo "  ✓ 找到 swiftc: $SWIFTC"
  # 编译 vision_ocr
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  SWIFT_SRC="$SCRIPT_DIR/server/src/scripts/ocr_vision.swift"
  SWIFT_BIN="$SCRIPT_DIR/server/src/scripts/vision_ocr"

  if [ -x "$SWIFT_BIN" ]; then
    echo "  ✓ 原生 OCR 工具已编译就绪"
  else
    echo "  正在编译原生 OCR 工具（约 10-30 秒）..."
    if "$SWIFTC" -O "$SWIFT_SRC" -o "$SWIFT_BIN" 2>/tmp/vision_build.log; then
      echo "  ✓ 原生 OCR 工具编译成功！无需任何额外安装。"
    else
      echo "  ❌ 编译失败，错误信息："
      cat /tmp/vision_build.log | head -10
      echo "     请把上面的错误发给我。"
    fi
  fi
fi
echo ""

# ---------- 3. Tesseract（可选备用）----------
echo "▶ Tesseract（备用 OCR，可选项）..."
if command -v tesseract >/dev/null 2>&1; then
  echo "  ✓ Tesseract: $(tesseract --version 2>&1 | head -1)"
else
  echo "  - 未安装（非必需，macOS 原生 OCR 优先）"
fi
echo ""

# ---------- 验证 ----------
echo "======================================"
echo "  验证结果"
echo "======================================"
echo "  PyMuPDF:      $($PY -c "import fitz; print('✓')" 2>/dev/null || echo '✗')"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "  原生 Vision:  $([ -x "$SCRIPT_DIR/server/src/scripts/vision_ocr" ] && echo '✓ 已编译' || echo '✗')"
echo "  Tesseract:    $(command -v tesseract >/dev/null 2>&1 && echo '✓' || echo '-')"
echo ""

if $PY -c "import fitz" >/dev/null 2>&1 && [ -x "$SCRIPT_DIR/server/src/scripts/vision_ocr" ]; then
  echo "  ✅ 就绪！macOS 原生 OCR 已启用，扫描版 PDF 可以识别了。"
  echo "  现在重新双击「启动词舟.command」启动网站即可。"
elif $PY -c "import fitz" >/dev/null 2>&1 && command -v tesseract >/dev/null 2>&1; then
  echo "  ✅ 就绪！Tesseract OCR 已启用。"
else
  echo "  还有依赖未装好，请根据上面提示操作，或把输出发我。"
fi
echo ""
read -n 1 -s -r -p "  按任意键退出..."
echo ""
