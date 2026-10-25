@echo off
chcp 65001 >nul
title 词舟 · 环境诊断工具

cd /d "%~dp0"
echo ======================================================
echo              词舟 · 运行环境诊断
echo ======================================================
echo.

:: 1. Node.js
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('node -v') do set NODE_V=%%v
    for /f "tokens=*" %%v in ('npm -v') do set NPM_V=%%v
    echo [√] Node.js: %NODE_V%   npm: %NPM_V%
) else (
    echo [×] Node.js: 未安装 (运行网站必需，请前往 https://nodejs.org 下载)
)

:: 2. Python (用于 OCR 备用引擎，非必需)
set PYTHON_FOUND=0
where python >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [√] Python: %%v
    set PYTHON_FOUND=1
) else (
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%v in ('py --version 2^>^&1') do echo [√] Python (py): %%v
        set PYTHON_FOUND=1
    ) else (
        echo [-] Python: 未找到 (文字版 PDF 不需要 Python，仅扫描版 OCR 需要)
    )
)

:: 3. Tesseract OCR (扫描版 PDF 需要)
where tesseract >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%v in ('tesseract --version 2^>^&1') do (
        echo [√] Tesseract: %%v
        goto :check_modules
    )
) else (
    echo [-] Tesseract OCR: 未找到 (文字版 PDF 不需要，仅扫描图片版 PDF 需要)
)

:check_modules
:: 4. 依赖文件检查
echo.
echo --- 项目文件与依赖检查 ---
if exist "server\node_modules\" (
    echo [√] 后端依赖: 已安装
) else (
    echo [!] 后端依赖: 未安装 (启动时将自动安装)
)

if exist "server\prisma\dev.db\" (
    echo [√] 数据库文件: 存在
) else (
    if exist "server\prisma\dev.db" (
        echo [√] 数据库文件: 存在
    ) else (
        echo [!] 数据库文件: 未初始化 (启动时将自动生成并导入词库)
    )
)

if exist "client\node_modules\" (
    echo [√] 前端依赖: 已安装
) else (
    echo [!] 前端依赖: 未安装 (启动时将自动安装)
)

if exist "client\dist\index.html" (
    echo [√] 前端构建产物: 已就绪
) else (
    echo [!] 前端构建产物: 未构建 (启动时将自动构建)
)

echo.
echo ======================================================
echo 诊断完成。可以直接双击「启动词舟.bat」运行项目！
echo ======================================================
pause
