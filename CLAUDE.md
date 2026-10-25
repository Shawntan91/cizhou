# CLAUDE.md — AI 智能背单词网站

## 项目介绍
AI 智能背单词网站，面向中国英语学习者（考研 / 雅思 / 四六级 / GRE）。核心能力：智能背单词 + 艾宾浩斯/Anki 复习算法 + 拼写测试模式 + 真人发音 TTS + PDF 自动提取生词 + 考研真题 PDF 智能解析 + 词库导出 (Anki/CSV/Markdown) + AI 辅助记忆 + 学习统计。

## 技术架构
- **前端** `client/`：React 18 + TypeScript + Tailwind CSS + Vite + React Router v6
- **后端** `server/`：Node.js + Express + Prisma + SQLite
- **PDF**：pdfjs-dist（纯 JS 主引擎）→ pdf-parse / PyMuPDF（备用）→ Tesseract OCR（扫描版）
- **AI**：可插拔 AI 服务层（`server/src/services/aiService.js`），支持环境变量 `AI_API_KEY`/`AI_API_URL`，兼容各类大模型与本地规则引擎双重兜底

## 常用命令
```bash
# Windows 一键启动
双击「启动词舟.bat」或执行 .\start.ps1

# 后端开发（server/）
npm install && npx prisma db push && npm run seed && npm run dev   # 端口 4000

# 前端开发（client/）
npm install && npm run dev   # 端口 5173, 代理 /api → 4000

# 构建前端生产产物
cd client && npm run build
```

## 数据库结构
核心模型：User、Word、VocabularyBook、LearningRecord、PDFDocument、PDFAnalysis、ExamWord、WordMeaning、WritingExpression、ArticleSentence。

## 当前进度
- [x] Phase 0: 项目初始化与技术规划
- [x] Phase 1: 后端 API + Prisma 数据库 (认证/单词/复习/PDF/统计/词书)
- [x] Phase 2: PDF 解析引擎 (纯 JS pdfjs-dist 主引擎 + OCR 备用)
- [x] Phase 3: 前端骨架 + 7 大核心页面构建通过
- [x] Phase 4: PDF 分析页面 + 学习模式 (核心词/熟词僻义/作文表达/长难句)
- [x] Phase 5: 端到端测试与 Windows 全面兼容
- [x] Phase 6: 全面优化与增强：
  - Windows 原生启动体系（`启动词舟.bat`、`start.ps1`、`diagnose.bat`、`修复PDF环境.bat`）
  - 真人发音 TTS（Web Speech + 在线美音发音，快捷键 P）
  - 拼写默写测试模式（挖空提示与即时提交校验）
  - 词库多格式导出（Anki TSV 牌组、CSV 表格、Markdown 精读笔记）
  - 考研核心词汇大幅扩充（180+ 核心词、80+ 熟词僻义、65+ 高分写作表达）
  - AI 外部大模型容错（剥离思维链、超时保护、格式正则解析）
