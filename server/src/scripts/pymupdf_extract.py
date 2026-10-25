#!/usr/bin/env python3
"""PyMuPDF 文本提取 — 输出 JSON: {"pages": ["..."]}"""
import json
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"pages": [], "error": "pymupdf not installed"}))
    sys.exit(0)

def main(path):
    try:
        doc = fitz.open(path)
        pages = []
        for page in doc:
            pages.append(page.get_text("text"))
        print(json.dumps({"pages": pages}))
    except Exception as e:
        print(json.dumps({"pages": [], "error": str(e)}))

if __name__ == "__main__":
    main(sys.argv[1])
