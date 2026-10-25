@echo off
chcp 65001 >nul
title 词舟 · PDF 与 OCR 环境配置帮助

cd /d "%~dp0"
echo ======================================================
echo          词舟 · PDF 与 OCR 环境配置指南 (Windows)
echo ======================================================
echo.
echo 提示：
echo 词舟默认采用纯 JavaScript (pdfjs-dist) 解析 PDF，
echo 绝大多数常见的真题 PDF、阅读材料（文字版）均可直接完美解析，
echo 【无需】安装任何 Python 或第三方软件！
echo.
echo 只有当您需要解析「纯扫描图片版 / 拍照版 PDF」时，才需要 OCR 引擎：
echo.
echo 步骤 1：安装 Python (如果未安装)
echo   访问 https://www.python.org/downloads/ 下载并安装
echo   *注意：安装时务必勾选 "Add Python to PATH"*
echo.
echo 步骤 2：安装 Python PyMuPDF
echo   打开终端执行: pip install pymupdf pillow pytesseract
echo.
echo 步骤 3：安装 Tesseract-OCR (扫描文字识别引擎)
echo   下载地址: https://github.com/UB-Mannheim/tesseract/wiki
echo   下载 Windows 64-bit 安装包安装，并将安装目录 (如 C:\Program Files\Tesseract-OCR) 加入系统环境变量 PATH。
echo.
echo ======================================================
pause
