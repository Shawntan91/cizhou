#!/usr/bin/env bash
# 词舟 · AI 智能背单词 — 一键启动脚本（macOS / Linux 通用）
# 用法: 双击「启动词舟.command」或在终端执行 ./start.sh
# 首次运行会自动安装依赖、初始化数据库、构建前端，然后打开浏览器

cd "$(dirname "$0")"

echo "=============================="
echo "  词舟 · AI 智能背单词"
echo "=============================="
echo "  项目目录: $(pwd)"
echo ""

# ---------- 环境准备 ----------
# macOS 双击 .command 时 PATH 精简，需手动补全常见工具路径
# 把 Homebrew、Python、nvm 等路径加入 PATH
for p in \
  "/opt/homebrew/bin" \
  "/opt/homebrew/opt/python@3/libexec/bin" \
  "/usr/local/bin" \
  "/usr/local/sbin" \
  "$HOME/.local/bin" \
  "$HOME/.nvm/versions/node/"*/bin \
  "$HOME/.volta/bin"; do
  [ -d "$p" ] && export PATH="$p:$PATH"
done

# ---------- 定位 Node.js ----------
detect_node() {
  if command -v node >/dev/null 2>&1; then return 0; fi
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
    command -v node >/dev/null 2>&1 && return 0
  fi
  for rc in "$HOME/.zshrc" "$HOME/.bash_profile" "$HOME/.profile"; do
    if [ -f "$rc" ]; then
      # 提取 rc 中的 PATH 导出
      local_path="$(grep -E '^(export )?PATH=' "$rc" 2>/dev/null | head -1 | sed -E 's/^(export )?PATH=//; s/"//g')"
      [ -n "$local_path" ] && export PATH="$local_path:$PATH"
      command -v node >/dev/null 2>&1 && return 0
    fi
  done
  return 1
}

if detect_node; then
  echo "✓ Node.js $(node -v)   npm $(npm -v)"
else
  echo ""
  echo "❌ 未检测到 Node.js！"
  echo ""
  echo "   词舟需要 Node.js 才能运行。请二选一："
  echo ""
  echo "   方式 A（推荐）：在终端执行以下命令安装 nvm + Node："
  echo "     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash"
  echo "     然后重新打开终端，执行： nvm install 20"
  echo ""
  echo "   方式 B：前往 https://nodejs.org 下载 LTS 版安装包，双击安装。"
  echo ""
  echo "   安装完成后，重新双击「启动词舟.command」即可。"
  echo ""
  read -n 1 -s -r -p "按任意键退出..."
  exit 1
fi

# 若 npm 找不到，尝试随 node 所在目录定位
if ! command -v npm >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
  NODE_DIR="$(dirname "$(command -v node)")"
  [ -x "$NODE_DIR/npm" ] && export PATH="$NODE_DIR:$PATH"
fi

# ---------- PDF 工具检测（仅提示，不阻塞）----------
echo "--- PDF 解析环境 ---"
echo "  Python:  $(python3 --version 2>/dev/null || echo '❌ 未找到')"
if command -v tesseract >/dev/null 2>&1; then
  echo "  Tesseract: ✓ $($(command -v tesseract) --version 2>/dev/null | head -1)"
else
  echo "  Tesseract: 未找到（扫描版 PDF 需要，文字版 PDF 不需要）"
fi
echo ""

# ---------- 后端依赖 ----------
echo "▶ 初始化后端 (server/)"
cd server
if [ ! -d node_modules ]; then
  echo "  安装后端依赖（首次约 1-2 分钟）..."
  npm install --no-audit --no-fund || { echo "❌ 后端依赖安装失败"; read -n 1 -s -r -p "按任意键退出..."; exit 1; }
fi

# ---------- 数据库 ----------
if [ ! -f prisma/dev.db ]; then
  echo "  初始化数据库..."
  npx prisma db push || { echo "❌ 数据库初始化失败"; read -n 1 -s -r -p "按任意键退出..."; exit 1; }
  echo "  导入内置词库..."
  npm run seed || { echo "❌ 词库导入失败"; read -n 1 -s -r -p "按任意键退出..."; exit 1; }
fi

# ---------- 前端依赖与构建 ----------
cd ../client
if [ ! -d node_modules ]; then
  echo "  安装前端依赖（首次约 1-2 分钟）..."
  npm install --no-audit --no-fund || { echo "❌ 前端依赖安装失败"; read -n 1 -s -r -p "按任意键退出..."; exit 1; }
fi
if [ ! -d dist ]; then
  echo "  构建前端..."
  npm run build || { echo "❌ 前端构建失败"; read -n 1 -s -r -p "按任意键退出..."; exit 1; }
fi

# ---------- 启动 ----------
cd ../server
echo ""
echo "======================================"
echo "  ✅ 网站已就绪！"
echo "  打开浏览器访问: http://localhost:4000"
echo "  演示账号: demo@vocab.app / demo123"
echo "  （关闭此窗口或按 Ctrl+C 停止服务）"
echo "======================================"
echo ""

# 端口占用检测：若 4000 已被占用，说明已有词舟实例在运行，直接打开浏览器
if lsof -i :4000 -sTCP:LISTEN >/dev/null 2>&1 || nc -z 127.0.0.1 4000 >/dev/null 2>&1; then
  echo "  检测到 4000 端口已有服务在运行（可能是之前启动的实例）。"
  echo "  直接打开浏览器访问...（如需重启，先关闭旧窗口）"
  (sleep 1
    if command -v open >/dev/null 2>&1; then open "http://localhost:4000"; fi
  ) &
  # 保持窗口，等待用户按任意键退出
  read -n 1 -s -r -p "  按任意键退出..."
  exit 0
fi

# 自动打开浏览器
(sleep 2
  if command -v open >/dev/null 2>&1; then
    open "http://localhost:4000"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:4000"
  fi
) &

node src/index.js
