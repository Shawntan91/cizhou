#!/usr/bin/env python3
"""扫描版 PDF OCR 识别脚本。
引擎优先级：
  1) macOS 原生 Vision OCR（swiftc 编译的 ocr_vision，无需任何安装）
     - 自动检测 Xcode CommandLineTools 的 swiftc 并编译
  2) Tesseract OCR（brew install tesseract，备用）

依赖：PyMuPDF (pip3 install pymupdf) 用于把 PDF 页渲染为图片。
输出 JSON: {"pages": ["..."], "engine": "..."}
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SWIFT_SRC = os.path.join(SCRIPT_DIR, "ocr_vision.swift")
SWIFT_BIN = os.path.join(SCRIPT_DIR, "vision_ocr")


def find_swiftc():
    """定位 swiftc 编译器（Xcode CommandLineTools 自带）。"""
    candidates = [
        "/usr/bin/swiftc",
        "/usr/local/bin/swiftc",
        "/opt/homebrew/bin/swiftc",
        "/Library/Developer/CommandLineTools/usr/bin/swiftc"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    # 最后尝试 PATH
    return shutil.which("swiftc")


def ensure_vision_binary():
    """编译 ocr_vision.swift → vision_ocr，若尚未编译。"""
    if os.path.exists(SWIFT_BIN):
        return SWIFT_BIN
    swiftc = find_swiftc()
    if not swiftc:
        return None
    try:
        subprocess.run(
            [swiftc, "-O", SWIFT_SRC, "-o", SWIFT_BIN],
            check=True, capture_output=True, timeout=120
        )
        return SWIFT_BIN
    except Exception:
        return None


def detect_engines():
    """返回可用引擎优先级列表。"""
    engines = []
    if ensure_vision_binary():
        engines.append("vision")
    if shutil.which("tesseract"):
        engines.append("tesseract")
    return engines


def vision_ocr(img_path):
    result = subprocess.run([SWIFT_BIN, img_path], capture_output=True, text=True, timeout=60)
    return result.stdout.strip()


def tesseract_ocr(img_path):
    result = subprocess.run(
        ["tesseract", img_path, "stdout", "-l", "eng", "--psm", "3"],
        capture_output=True, text=True, timeout=60
    )
    return result.stdout.strip()


def main(path, max_pages=10):
    try:
        import fitz
    except ImportError:
        print(json.dumps({"pages": [], "error": "pymupdf not installed; run: python3 -m pip install pymupdf"}))
        sys.exit(0)

    engines = detect_engines()
    if not engines:
        print(json.dumps({
            "pages": [],
            "error": "no OCR engine available. mac 用户请安装 Xcode 命令行工具 (xcode-select --install) 以获得 swiftc；或 brew install tesseract"
        }))
        sys.exit(0)

    engine = engines[0]
    try:
        doc = fitz.open(path)
        pages = []
        with tempfile.TemporaryDirectory() as tmp:
            for i, page in enumerate(doc):
                if i >= max_pages:
                    break
                pix = page.get_pixmap(dpi=200)
                img_path = os.path.join(tmp, f"page_{i}.png")
                pix.save(img_path)
                if engine == "vision":
                    text = vision_ocr(img_path)
                else:
                    text = tesseract_ocr(img_path)
                pages.append(text.strip())
        print(json.dumps({"pages": pages, "engine": engine}))
    except Exception as e:
        print(json.dumps({"pages": [], "error": str(e)}))


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else ""
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    main(path, max_pages)
