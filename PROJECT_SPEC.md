# PROJECT_SPEC.md — AI 智能背单词网站

> 面向中国英语学习者（考研 / 雅思 / 四六级 / GRE）的 AI 驱动背单词产品。
> 参考产品：墨墨背单词、Anki、Quizlet。UI 风格：Notion + Apple。

## 1. 产品定位

- 智能背单词（卡片 + 艾宾浩斯/Anki 复习算法）
- PDF 自动提取生词 → 生成个人词库
- 考研英语真题 PDF 智能解析（核心词汇 / 熟词僻义 / 作文替换词）
- AI 辅助记忆（解释、记忆法、词根、真题例句）
- 学习统计 Dashboard

## 2. 技术架构

### Frontend（`client/`）
- React 18 + TypeScript + Vite
- Tailwind CSS（定制主题）
- React Router v6
- 组件化：`components/`、`pages/`、`hooks/`、`utils/`

### Backend（`server/`）
- Node.js + Express
- SQLite + Prisma ORM
- Multer 文件上传（PDF，≤50MB）
- PDF 解析：pdf-parse（文字版）；PyMuPDF（备用）；Tesseract OCR（扫描版）
- AI 服务层：可配置的 AI 接口，无 key 时本地规则引擎兜底

## 3. 数据库结构（Prisma / SQLite）

| 模型 | 用途 | 关键字段 |
|---|---|---|
| User | 用户 | username, email, password, created_time |
| Word | 单词 | word, phonetic, meaning, example, frequency, level, root, mnemonic, exam_years |
| VocabularyBook | 词书 | name, type, user_id |
| LearningRecord | 学习记录 | user_id, word_id, status, next_review_time, review_count, interval_index |
| PDFDocument | PDF文件 | user_id, filename, upload_time, total_pages, status, file_path |
| PDFAnalysis | 分析结果 | pdf_id, status, summary, total_words, created_time |
| ExamWord | 真题词汇 | analysis_id, word, phonetic, meaning, frequency, position, original_sentence, importance, category(A/B/C/D) |
| WordMeaning | 熟词僻义 | word, common_meaning, exam_meaning, example, source_year, frequency |
| WritingExpression | 作文表达 | basic_word, advanced_expression, meaning, example_sentence, topic |
| ArticleSentence | 文章句子 | analysis_id, page, text, position |

## 4. 核心功能

1. **智能背单词**：卡片模式，英文 → 回忆 → 音标/中文/词根/例句/真题出处。快捷键 Space/1/2/3。
2. **艾宾浩斯+Anki算法**：不认识/模糊/认识 → 10分钟→1天→3天→7天→15天→30天。
3. **PDF自动提取生词**：上传 → 提取文本 → 分词 → 停用词过滤 → 词频 → 生成词库（含页码/次数/上下文）。
4. **考研真题PDF智能解析**：阅读核心词汇、熟词僻义、作文高级替换词、真题词汇难度评级(A/B/C/D)。
5. **AI辅助学习**：简单解释、记忆方法、词根分析、考研例句、近义词区别。
6. **学习统计**：今日任务、累计词汇、连续天数、掌握率、遗忘曲线、热力图。

## 5. 页面

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | 首页 | 今日学习计划 |
| `/learn` | 学习 | 背单词卡片 |
| `/pdf` | PDF上传 | 上传材料生成词库 |
| `/pdf-analysis` | 真题解析 | 上传考研PDF → 分析结果（三栏） |
| `/books` | 词库 | 管理词书 |
| `/statistics` | 统计 | 学习分析 |
| `/profile` | 个人中心 | 账号与设置 |

## 6. API 概要

```
POST /api/auth/register   注册
POST /api/auth/login      登录
GET  /api/words/today     今日学习词
POST /api/words/review    提交复习结果
GET  /api/books           词书列表
POST /api/pdf/upload      上传PDF
POST /api/pdf/analyze     开始分析
GET  /api/pdf/result/:id  获取分析结果
POST /api/pdf/add-vocabulary  加入个人词库
GET  /api/statistics      学习统计
POST /api/ai/explain      单词AI讲解
```

## 7. 开发流程

Phase 0: 初始化文档 → Phase 1: 后端+DB → Phase 2: PDF解析引擎 → Phase 3: 前端骨架+核心页面 → Phase 4: PDF分析页+学习模式 → Phase 5: 测试部署。

**每阶段结束必须运行测试。**
