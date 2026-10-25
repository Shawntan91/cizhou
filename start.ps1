# 词舟 · AI 智能背单词 — PowerShell 启动脚本
$Host.UI.RawUI.WindowTitle = "词舟 · AI 智能背单词"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "            词舟 · AI 智能背单词网站" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  项目目录: $ScriptDir"
Write-Host ""

# 1. 检查 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[错误] 未检测到 Node.js！" -ForegroundColor Red
    Write-Host "请前往 https://nodejs.org 下载安装 LTS 版本。"
    Pause
    Exit 1
}

$nodeVer = (node -v).Trim()
$npmVer = (npm -v).Trim()
Write-Host "[√] Node.js $nodeVer    npm $npmVer" -ForegroundColor Green
Write-Host ""

# 2. 检查后端
Write-Host "▶ 检查后端服务 (server)..." -ForegroundColor Yellow
Set-Location (Join-Path $ScriptDir "server")

if (-not (Test-Path "node_modules")) {
    Write-Host "  正在安装后端依赖..."
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 后端依赖安装失败！" -ForegroundColor Red
        Pause
        Exit 1
    }
}

if (-not (Test-Path "prisma\dev.db")) {
    Write-Host "  初始化数据库与内置真题词库..."
    npx prisma db push
    npm run seed
}

# 3. 检查前端
Write-Host "▶ 检查前端界面 (client)..." -ForegroundColor Yellow
Set-Location (Join-Path $ScriptDir "client")

if (-not (Test-Path "node_modules")) {
    Write-Host "  正在安装前端依赖..."
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 前端依赖安装失败！" -ForegroundColor Red
        Pause
        Exit 1
    }
}

if (-not (Test-Path "dist")) {
    Write-Host "  正在构建前端页面..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 前端构建失败！" -ForegroundColor Red
        Pause
        Exit 1
    }
}

# 4. 启动服务
Set-Location (Join-Path $ScriptDir "server")

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  √ 词舟系统已就绪！" -ForegroundColor Green
Write-Host "  访问地址: http://localhost:4000" -ForegroundColor White
Write-Host "  演示账号: demo@vocab.app" -ForegroundColor White
Write-Host "  演示密码: demo123" -ForegroundColor White
Write-Host "  提示：按 Ctrl+C 可停止服务。" -ForegroundColor DarkGray
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

# 检查端口占用
$portInUse = Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "[提示] 检测到 4000 端口已有实例运行，直接在浏览器中打开..." -ForegroundColor Cyan
    Start-Process "http://localhost:4000"
    Pause
    Exit 0
}

# 后台打开浏览器
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:4000"
} | Out-Null

# 运行服务器
node src/index.js
