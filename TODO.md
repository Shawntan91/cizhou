# TODO.md

## 已完成核心功能 (v0.3.0)
- [x] Phase 1: 后端 API + Prisma 数据库 (SQLite)
- [x] Phase 2: PDF 解析引擎 (pdfjs-dist 纯JS主引擎 + PyMuPDF/Tesseract 扫描版)
- [x] Phase 3: 前端架构 + 7 大核心页面 (React + TS + Tailwind + Vite)
- [x] Phase 4: 真题 PDF 智能解析系统 (三栏工作台，核心词/熟词僻义/作文表达/长难句)
- [x] Phase 5: 端到端测试与 Windows 全面兼容
- [x] 语音发音 (TTS) 双通道发音与快捷键
- [x] 拼写测试模式 (根据释义与例句填词默写)
- [x] 用户词库导入导出 (支持 Anki TSV、CSV 表格、Markdown 笔记)
- [x] Windows 一键运行脚本 (启动词舟.bat / start.ps1 / diagnose.bat)
- [x] 考研词库扩充 (180+ 核心词 / 80+ 熟词僻义 / 65+ 写作替换)
- [x] AI 容错层 (思维链剥离 / 超时保护 / 多服务商兼容)

## 未来演进规划
- [ ] 真题词汇按年份/文章分类多维浏览 (2010-2025 年份筛选器)
- [ ] AI 生成整篇文章的长难句语法结构树与精读解析
- [ ] 社交学习打卡生成海报 (卡片截图分享)
- [ ] Docker 容器化打包与一键 Docker-compose 部署
