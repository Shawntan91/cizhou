# 考研英语真题 PDF 智能解析系统 — 功能设计

## 目标
用户上传考研英语真题 PDF，系统自动分析并生成：
1. 阅读核心词汇库
2. 熟词僻义库
3. 真题高频表达库
4. 作文高级替换词库
5. 个人专属复习词库

## 解析流程 Pipeline
```
PDF 上传 → Step1 文本提取 → Step2 OCR(扫描版) → Step3 NLP处理
→ 核心词汇 → 熟词僻义 → 作文表达 → 难度评级 → 存入数据库
```

- **Step 1** 文本提取：pdfjs-dist（纯 JS）主引擎，pdf-parse / PyMuPDF 备用；自动检测文字层。
- **Step 2** OCR：无文字层时调用 Tesseract OCR（英文）。
- **Step 3** NLP：分句 → 分词 → 词性 → 词频 → 词根。过滤停用词（a/an/the/is/of/to 等）。

## 核心功能
### 阅读核心词汇
每个词生成：word / 音标 / 中文 / 词频★ / 文章位置 / 原句 / 考研重要程度 / 学习建议。

### 熟词僻义
如 `address`（地址 → 处理、解决）。数据库 `WordMeaning`：word, common_meaning, exam_meaning, example, source_year, frequency。

### 真题词汇难度评级
- A类：5500 核心词
- B类：高频考研词
- C类：熟词僻义
- D类：超纲词

### AI 生成作文替换词
`WritingExpression`：basic_word, advanced_expression, meaning, example_sentence, topic。
分类：社会发展 / 教育 / 科技 / 环境 / 文化 / 个人成长 / 经济。

## 数据库新增
```
User 1—N PDFDocument 1—N PDFAnalysis 1—N ExamWord
WordMeaning（熟词僻义库，独立）
WritingExpression（作文表达库，独立）
ArticleSentence（文章句子）
```

## API 接口
| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/pdf/upload | 上传 PDF（≤50MB） |
| POST | /api/pdf/analyze | 开始分析（body: documentId） |
| GET | /api/pdf/result/:id | 获取分析结果 |
| POST | /api/pdf/add-vocabulary | 将分析词加入个人词库 |

## 学习模式
真题专项学习：文章背景 → 核心词汇 → 熟词僻义 → 原句理解 → AI记忆方法。

## UI
Notion + Apple 风格。`/pdf-analysis` 三栏：左=PDF列表，中=分析结果，右=词汇卡片。支持搜索/收藏/加入学习计划。
