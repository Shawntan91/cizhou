import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import prisma from '../lib/prisma.js'
import { authRequired } from '../middleware/auth.js'
import { analyzePdfDocument } from '../services/pdfAnalyzer.js'

const router = Router()
router.use(authRequired)

// 上传配置：≤50MB，仅 PDF
const uploadDir = path.resolve(process.cwd(), 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname) || '.pdf'}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true)
    } else {
      cb(new Error('仅支持 PDF 文件'))
    }
  }
})

// POST /api/pdf/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未收到文件' })

    const doc = await prisma.pDFDocument.create({
      data: {
        userId: req.user.id,
        filename: req.file.originalname,
        file_path: req.file.path,
        status: 'uploaded'
      }
    })
    res.json({ document: doc })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// POST /api/pdf/analyze — 开始分析 { documentId }
router.post('/analyze', async (req, res) => {
  try {
    const { documentId } = req.body || {}
    if (!documentId) return res.status(400).json({ error: '缺少 documentId' })

    const doc = await prisma.pDFDocument.findFirst({
      where: { id: documentId, userId: req.user.id }
    })
    if (!doc) return res.status(404).json({ error: '文档不存在' })

    // 异步分析
    analyzePdfDocument(documentId).catch(e => console.error('[pdf-analyze]', e.message))

    res.json({ status: 'analyzing', documentId })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/pdf/result/:id — 分析结果
router.get('/result/:id', async (req, res) => {
  try {
    const analysis = await prisma.pDFAnalysis.findFirst({
      where: { id: Number(req.params.id) },
      include: {
        document: { select: { filename: true, status: true } },
        examWords: { orderBy: { importance: 'desc' } },
        sentences: { take: 50, orderBy: { page: 'asc' } }
      }
    })
    if (!analysis) return res.status(404).json({ error: '分析不存在' })

    // 附加熟词僻义与作文表达
    const polyWords = await prisma.wordMeaning.findMany({
      where: { word: { in: analysis.examWords.filter(w => w.category === 'C').map(w => w.word) } }
    })
    const writing = await prisma.writingExpression.findMany({ take: 30 })

    res.json({ ...analysis, polyWords, writing })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/pdf/documents — 用户的 PDF 列表（含最新分析）
router.get('/documents', async (req, res) => {
  try {
    const docs = await prisma.pDFDocument.findMany({
      where: { userId: req.user.id },
      include: { analyses: { orderBy: { created_time: 'desc' }, take: 1 } },
      orderBy: { upload_time: 'desc' }
    })
    res.json({ documents: docs })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/pdf/documents/:id — 删除 PDF 文档及其分析数据
router.delete('/documents/:id', async (req, res) => {
  try {
    const docId = Number(req.params.id)
    const doc = await prisma.pDFDocument.findFirst({
      where: { id: docId, userId: req.user.id },
      include: { analyses: true }
    })
    if (!doc) return res.status(404).json({ error: '文档不存在' })

    const analysisIds = doc.analyses.map(a => a.id)
    if (analysisIds.length) {
      await prisma.examWord.deleteMany({ where: { analysisId: { in: analysisIds } } })
      await prisma.articleSentence.deleteMany({ where: { analysisId: { in: analysisIds } } })
      await prisma.pDFAnalysis.deleteMany({ where: { documentId: docId } })
    }

    await prisma.pDFDocument.delete({ where: { id: docId } })

    // 清理本地文件
    if (doc.file_path && fs.existsSync(doc.file_path)) {
      try { fs.unlinkSync(doc.file_path) } catch { /* ignore */ }
    }

    res.json({ message: '文档及分析数据已删除' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/pdf/result/:id/export — 导出真题解析结果 (markdown / anki)
router.get('/result/:id/export', async (req, res) => {
  try {
    const format = (req.query.format || 'markdown').toLowerCase()
    const analysis = await prisma.pDFAnalysis.findFirst({
      where: { id: Number(req.params.id) },
      include: {
        document: true,
        examWords: { orderBy: { importance: 'desc' } }
      }
    })
    if (!analysis) return res.status(404).json({ error: '分析不存在' })

    const filename = (analysis.document?.filename || '真题解析').replace(/\.pdf$/i, '')

    if (format === 'anki') {
      res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}_anki.txt"`)
      let tsv = '#separator:tab\n#html:true\n'
      for (const w of analysis.examWords) {
        const front = `<b>${w.word}</b> <small style="color:#666">${w.phonetic || ''}</small>`
        const back = `<div>${w.meaning || ''}</div>${w.original_sentence ? `<div style="margin-top:6px;font-style:italic;color:#555">原句: ${w.original_sentence}</div>` : ''}`
        tsv += `${front.replace(/\t/g, ' ')}\t${back.replace(/\t/g, ' ')}\n`
      }
      return res.send(tsv)
    }

    // 默认 Markdown 笔记
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}_精读笔记.md"`)
    let md = `# ${filename} · 真题词汇与精读笔记\n\n`
    md += `> ${analysis.summary || '考研真题词汇深度解析'}\n\n`
    md += `## 核心词汇列表 (共 ${analysis.examWords.length} 词)\n\n`
    md += `| 单词 | 音标 | 释义 | 频次 | 评级 | 真题原句 |\n`
    md += `|---|---|---|---|---|---|\n`
    for (const w of analysis.examWords) {
      const sentence = (w.original_sentence || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
      md += `| **${w.word}** | ${w.phonetic || '-'} | ${w.meaning || '-'} | ${w.frequency}次 | ${w.category}类(${'★'.repeat(w.importance)}) | ${sentence} |\n`
    }
    return res.send(md)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/pdf/add-vocabulary — 将分析词加入个人词库
// body: { analysisId, wordIds?: number[], bookName?: string, category?: string }
router.post('/add-vocabulary', async (req, res) => {
  try {
    const { analysisId, wordIds, bookName: bookNameParam, category } = req.body || {}
    if (!analysisId) return res.status(400).json({ error: '缺少 analysisId' })

    const analysis = await prisma.pDFAnalysis.findFirst({
      where: { id: Number(analysisId) },
      include: { examWords: true, document: true }
    })
    if (!analysis) return res.status(404).json({ error: '分析不存在' })

    // 目标词筛选
    let targetWords = analysis.examWords
    if (wordIds && wordIds.length) {
      targetWords = targetWords.filter(w => wordIds.includes(w.id))
    }
    if (category) {
      targetWords = targetWords.filter(w => w.category === category)
    }

    // 词书（复用或创建）
    const bookName = bookNameParam || `${analysis.document.filename} 词汇`
    let book = await prisma.vocabularyBook.findFirst({
      where: { userId: req.user.id, name: bookName }
    })
    if (!book) {
      book = await prisma.vocabularyBook.create({
        data: { name: bookName, type: 'pdf', userId: req.user.id }
      })
    }

    // 将词加入用户学习队列（创建 Word + LearningRecord）
    let added = 0
    for (const ew of targetWords.slice(0, 300)) {
      const word = await prisma.word.upsert({
        where: { word: ew.word },
        create: {
          word: ew.word,
          phonetic: ew.phonetic,
          meaning: ew.meaning,
          example: ew.original_sentence,
          frequency: ew.frequency,
          level: ew.category,
          category: 'pdf'
        },
        update: {}
      })
      await prisma.learningRecord.upsert({
        where: { userId_wordId: { userId: req.user.id, wordId: word.id } },
        create: { userId: req.user.id, wordId: word.id, next_review_time: new Date(), bookId: book.id },
        update: { bookId: book.id }
      })
      added++
    }

    res.json({ added, bookName: book.name })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
