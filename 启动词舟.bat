@echo off
chcp 65001 >nul
title 词舟 · AI 智能背单词

cd /d "%~dp0"

echo ======================================================
echo             词舟 · AI 智能背单词网站
echo ======================================================
echo   项目目录: %CD%
echo.

:: 1. 检查 Node.js 环境
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js！
    echo.
    echo   词舟需要 Node.js 才能运行。
    echo   请访问官方网站下载安装 LTS 版本：
    echo   https://nodejs.org/
    echo.
    echo 安装完成后，请重新双击运行「启动词舟.bat」。
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo [√] Node.js %NODE_VER%    npm %NPM_VER%
echo.

:: 2. 后端依赖与数据库
echo ▶ 检查后端服务 (server)...
cd /d "%~dp0server"

if not exist "node_modules\" (
    echo   首次运行，正在安装后端依赖（约需 30-60 秒）...
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [错误] 后端依赖安装失败，请检查网络！
        pause
        exit /b 1
    )
)

if not exist "prisma\dev.db" (
    echo   初始化数据库与内置真题词库...
    call npx prisma db push
    call npm run seed
    if %errorlevel% neq 0 (
        echo [警告] 数据库初始化出现警告，尝试继续...
    )
)

:: 3. 前端依赖与构建
echo ▶ 检查前端界面 (client)...
cd /d "%~dp0client"

if not exist "node_modules\" (
    echo   正在安装前端依赖...
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [错误] 前端依赖安装失败！
        pause
        exit /b 1
    )
)

if not exist "dist\" (
    echo   首次运行，正在构建前端页面...
    call npm run build
    if %errorlevel% neq 0 (
        echo [错误] 前端构建失败！
        pause
        exit /b 1
    )
)

:: 4. 启动服务与打开浏览器
cd /d "%~dp0server"

echo.
echo ======================================================
echo   √ 词舟系统已就绪！
echo.
echo   访问地址: http://localhost:4000
echo   演示账号: demo@vocab.app
echo   演示密码: demo123
echo.
echo   提示：关闭此黑框窗口将停止服务。
echo ======================================================
echo.

:: 检查 4000 端口是否已被占用
netstat -ano | findstr ":4000" | findstr "LISTENING" >nul 2>nul
if %errorlevel% equ 0 (
    echo [提示] 检测到 4000 端口已有实例运行，直接打开浏览器...
    start http://localhost:4000
    echo 请保留或按任意键退出...
    pause >nul
    exit /b 0
)

:: 后台稍后打开浏览器
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:4000"

:: 启动 Node.js 后端服务器
node src/index.js

pause
