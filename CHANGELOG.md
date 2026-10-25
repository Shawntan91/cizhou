# CHANGELOG.md

## [0.3.0] - 2026-10-20
### 新增与优化
- **Windows 原生一键启动与诊断**：
  - 新增 `启动词舟.bat`、`start.bat` 与 PowerShell `start.ps1`，自动检测 Node、安装依赖、初始化数据库并调起浏览器
  - 新增 `diagnose.bat` Windows 环境诊断脚本与 `修复PDF环境.bat`
  - 修复 Python 命令在 Windows 平台的调用问题（自动尝试 `python` / `py` / `python3`）
  - 修复 Vite 8 与 rolldown 在 Windows 环境下缺失原生 MSVC binding 报错问题
- **真人语音发音 (TTS)**：
  - 新增 `speech.ts` 发音工具，整合 Web Speech API 原生发音与在线美音双通道
  - 在记忆卡片正面、背面、拼写界面、真题词汇表与词书列表中均加入一键发音按钮，支持快捷键 `P` 朗读
  - 新增卡片翻开时自动朗读开关
- **全新拼写测试模式**：
  - 在背单词页面提供「卡片记忆」与「拼写测试」双模式无缝切换
  - 根据中文释义与真题例句挖空进行英文默写，支持即时正误校验与回车提交
- **词书管理与导出**：
  - 支持创建自定义词书与删除词书
  - 支持一键导出词书为 **Anki 卡片格式 (TSV)**、**CSV 表格** 与 **JSON**
  - 支持在词书内实时检索词汇、移出词汇
- **真题 PDF 解析系统升级**：
  - 支持按难度评级（A/B/C/D）和星级多重过滤真题核心词
  - 支持单词多选复选框，可自由勾选指定词汇或一键批量加入今日学习
  - 支持导出真题词汇为 **Markdown 精读笔记** 与 **Anki 牌组**
  - 支持删除已上传的 PDF 文档及其关联数据并自动清理磁盘文件
- **真题词库与数据大幅扩充**：
  - 考研核心真题词汇从 59 词大幅扩充至 180+ 词，附带完整音标、词根词缀、趣味联想法与考频年份
  - 考研核心熟词僻义库从 40 词扩充至 80+ 词，精准标明常考义与真题语境
  - 高分作文高级替换表达扩充至 65+ 组，覆盖教育、科技、生态环境、社会经济与个人成长
- **AI 讲解层重构与健壮性提升**：
  - 支持标准 OpenAI 协议、DeepSeek R1、Qwen、Kimi、Claude 等各类模型
  - 自动剥离推理思维链 `<think>` 标签与 Markdown 格式，增强容错提取
  - 加入 12 秒 AbortController 超时保护与本地规则引擎平滑降级
  - 修复 SPA 静态路由与 `/api/*` 404 返回 JSON 的冲突

---

## [0.2.0] - 2026-08-03
### 新增
- 完整后端：认证(JWT)、今日词汇、复习算法(艾宾浩斯六档)、AI讲解(本地兜底)、PDF上传/分析/结果/加词库、词书管理、学习统计
- PDF 解析引擎：pdf-parse + PyMuPDF 回退 + Tesseract OCR（扫描版）
- 前端 7 页面：首页/学习/PDF上传/真题解析/词书/统计/个人中心，三栏真题分析布局
- 内置词库数据：考研核心词 59、熟词僻义 40、作文表达 40
- Prisma schema：User/Word/VocabularyBook/LearningRecord/PDFDocument/PDFAnalysis/ExamWord/WordMeaning/WritingExpression/ArticleSentence

### 修复
- 非PDF文件上传返回 400（multer 错误映射）
- 词书单词按 bookId 精确过滤（LearningRecord 增加 bookId 字段）
- ESM require 兼容、PDF 引擎自动回退
- 种子脚本补齐演示用户默认词书

### 测试
- API 回归 16/17 → 修复后全绿
- 文字版 PDF 与扫描版 OCR 全流程验证通过

---

## [0.1.0] - 2026-08-03
### 新增
- 项目初始化：PROJECT_SPEC.md、CLAUDE.md、TODO.md、docs/pdf-analysis.md
- 规划完整技术架构（React+TS+Tailwind+Vite / Express+Prisma+SQLite）
