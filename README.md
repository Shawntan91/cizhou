# 词舟 · AI 智能背单词网站

面向中国英语学习者（考研 / 雅思 / 四六级 / GRE）的 AI 驱动背单词与真题深度精读产品。

## 🌟 核心功能

- **智能背单词**：卡片翻转，快捷键操作，艾宾浩斯 + Anki 六档间隔重复复习算法。
- **全新 · 拼写测试模式**：支持根据中文释义与真题例句默写英文单词，即时反馈对错。
- **全新 · 纯正真人发音 (TTS)**：内置 Web Speech 与高品质美音发音，支持快捷键 `P` 朗读与翻牌自动朗读。
- **考研真题 PDF 智能解析**：上传真题 PDF → 自动提取核心高频词汇、熟词僻义、作文高级替换表达 → 快速加入复习队列。
- **全新 · 词书多格式导出**：一键导出词书为 **Anki 牌组 (.txt)**、**Excel/墨墨兼容 CSV** 或 **Markdown 精读笔记**。
- **海量内置考研词库**：预置 180+ 考研真题高频核心词、80+ 核心熟词僻义、60+ 高分作文替换表达与词根联想法。
- **AI 智能词汇深度解析**：支持接入各类大模型（OpenAI、DeepSeek、Qwen等），自动容错解析与本地词库双重兜底。
- **学习统计 Dashboard**：今日任务、累计词汇、连续天数、掌握率、记忆间隔阶段分布、学习热力图。

## 🛠️ 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 前端 | React 18 + TypeScript + Tailwind CSS + Vite | 现代化响应式设计，卡片翻转 3D 动画，快捷键体验 |
| 后端 | Node.js + Express + Prisma | 异步 RESTful API，JWT 鉴权 |
| 数据库 | SQLite + Prisma ORM | 免复杂安装配置，开箱即用 |
| 语音发音 | Web Speech API + 词典语音降级 | 双通道纯净发音，离线与弱网自适应 |
| PDF 引擎 | pdfjs-dist（纯 JS 引擎）→ PyMuPDF / Tesseract（扫描 OCR 备用） | 绝大多数真题 PDF 免装 Python 即可极速解析 |

---

## 🚀 极速运行（开箱即用）

### 方式 A：Windows 用户（一键双击）
直接在项目根目录双击运行：
👉 **`启动词舟.bat`**  （或在 PowerShell 中执行 `.\start.ps1`）

*脚本会自动检测环境、安装依赖、初始化数据库并导入词库、构建前端页面并自动打开浏览器。*

### 方式 B：macOS / Linux 用户
终端执行：
```bash
chmod +x ./start.sh
./start.sh
```

### 方式 C：开发者手动分步启动

```bash
# 1. 启动后端 (server/)
cd server
npm install
npx prisma db push        # 初始化数据库结构
npm run seed              # 导入内置真题词库与演示账号
npm run dev               # http://localhost:4000

# 2. 启动前端开发服务器 (client/ - 另开终端)
cd client
npm install
npm run dev               # http://localhost:5173
```

- **默认访问地址**：`http://localhost:4000`
- **演示账号**：`demo@vocab.app`
- **演示密码**：`demo123`

---

## 🤖 可选配置：连接外部 AI 大模型

词舟默认自带**智能规则引擎与考研本地词库**，未配置 AI 也能完美运行并提供单词释义、词根与例句。

如需获得更自由的大模型深度扩展讲解，编辑 `server/.env`：

```env
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET=dev-secret-change-in-production

# AI 接口配置（兼容 OpenAI / DeepSeek / 阿里百炼 / Kimi 等任何标准接口）
AI_API_KEY=sk-xxxxxx
AI_API_URL=https://api.openai.com
AI_MODEL=gpt-4o-mini
```

*系统已针对带推理思维链（如 DeepSeek-R1 的 `<think>` 标签）及 Markdown 格式做全自动解析过滤与超时降级保护。*

---

## 📑 常见问题与诊断

- **遇到运行环境疑问？**
  - Windows 用户双击运行：`diagnose.bat`
  - macOS / Linux 用户运行：`./diagnose.sh`
- **需要解析扫描图片版 PDF？**
  - 双击运行：`修复PDF环境.bat` 查看安装 Tesseract OCR 快速指引。普通文字版 PDF 默认无需安装。

## 📂 目录结构

```
├── client/              # React 前端工程
│   └── src/
│       ├── components/  # 布局 Shell、UI 基础组件
│       ├── pages/       # 7 大核心页面（今日计划/背单词/拼写测试/词书/真题解析/上传/统计）
│       ├── utils/       # 发音 (speech.ts) 等工具函数
│       ├── hooks/       # useAuth 鉴权机制
│       └── api.ts       # 强类型 API 客户端
├── server/              # Express 后端工程
│   ├── prisma/          # SQLite 数据模型定义
│   └── src/
│       ├── routes/      # 认证、单词检索、词书导出、PDF 分析路由
│       ├── services/    # SRS 复习间隔调度、PDF 解析、AI 智能服务
│       └── data/        # 考研核心词 (180+)、熟词僻义 (80+)、作文高分表达 (65+)
├── 启动词舟.bat         # Windows 一键启动脚本
├── start.bat            # Windows 快捷启动
├── start.ps1            # PowerShell 启动脚本
├── diagnose.bat         # Windows 环境体检脚本
└── 修复PDF环境.bat      # Windows OCR 环境助手
```
