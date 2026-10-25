import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()
router.use(authRequired)

// GET /api/books — 词书列表（附带词数统计）
router.get('/', async (req, res) => {
  try {
    const books = await prisma.vocabularyBook.findMany({
      where: { userId: req.user.id },
      orderBy: { created_time: 'desc' }
    })

    // 计算每本词书的单词数量
    const booksWithCounts = await Promise.all(
      books.map(async book => {
        const count = await prisma.learningRecord.count({
          where: { userId: req.user.id, bookId: book.id }
        })
        const mastered = await prisma.learningRecord.count({
          where: { userId: req.user.id, bookId: book.id, status: 3 }
        })
        return { ...book, wordCount: count, masteredCount: mastered }
      })
    )

    res.json({ books: booksWithCounts })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/books — 创建新词书
router.post('/', async (req, res) => {
  try {
    const { name, type = 'custom' } = req.body || {}
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '词书名称不能为空' })
    }

    const trimmed = name.trim()
    const exists = await prisma.vocabularyBook.findFirst({
      where: { userId: req.user.id, name: trimmed }
    })
    if (exists) {
      return res.status(400).json({ error: '已存在同名词书' })
    }

    const book = await prisma.vocabularyBook.create({
      data: {
        name: trimmed,
        type,
        userId: req.user.id
      }
    })

    res.json({ book })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/books/:id — 删除词书
router.delete('/:id', async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    const book = await prisma.vocabularyBook.findFirst({
      where: { id: bookId, userId: req.user.id }
    })
    if (!book) return res.status(404).json({ error: '词书不存在' })

    // 将所属学习记录解绑词书（保留学习记录，解除所属）
    await prisma.learningRecord.updateMany({
      where: { bookId },
      data: { bookId: null }
    })

    await prisma.vocabularyBook.delete({
      where: { id: bookId }
    })

    res.json({ message: '词书已删除' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/books/:id/words — 词书内的学习词
router.get('/:id/words', async (req, res) => {
  try {
    const book = await prisma.vocabularyBook.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id }
    })
    if (!book) return res.status(404).json({ error: '词书不存在' })

    const records = await prisma.learningRecord.findMany({
      where: { userId: req.user.id, bookId: book.id },
      include: { word: true },
      orderBy: { next_review_time: 'asc' }
    })
    res.json({
      book,
      words: records.map(r => ({
        ...r.word,
        status: r.status,
        interval_index: r.interval_index,
        next_review_time: r.next_review_time,
        review_count: r.review_count,
        last_reviewed: r.last_reviewed
      }))
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/books/:id/words/:wordId — 从词书中移除单词
router.delete('/:id/words/:wordId', async (req, res) => {
  try {
    const bookId = Number(req.params.id)
    const wordId = Number(req.params.wordId)

    await prisma.learningRecord.updateMany({
      where: { userId: req.user.id, bookId, wordId },
      data: { bookId: null }
    })

    res.json({ message: '已从词书中移出' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/books/:id/export — 导出词书（支持 anki / csv / json）
router.get('/:id/export', async (req, res) => {
  try {
    const format = (req.query.format || 'anki').toLowerCase()
    const book = await prisma.vocabularyBook.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id }
    })
    if (!book) return res.status(404).json({ error: '词书不存在' })

    const records = await prisma.learningRecord.findMany({
      where: { userId: req.user.id, bookId: book.id },
      include: { word: true }
    })

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.name)}.json"`)
      return res.json({ book: book.name, words: records.map(r => r.word) })
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.name)}.csv"`)
      let csv = '\uFEFF单词,音标,释义,例句,真题年份,掌握状态\n'
      for (const r of records) {
        const statusText = r.status === 3 ? '已掌握' : r.status === 0 ? '新词' : '学习中'
        csv += `"${(r.word.word || '').replace(/"/g, '""')}","${(r.word.phonetic || '').replace(/"/g, '""')}","${(r.word.meaning || '').replace(/"/g, '""')}","${(r.word.example || '').replace(/"/g, '""')}","${(r.word.exam_years || '').replace(/"/g, '""')}","${statusText}"\n`
      }
      return res.send(csv)
    }

    // 默认 Anki 制表符分隔 (TSV) 格式，直接导入 Anki 卡片
    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(book.name)}_anki.txt"`)
    let tsv = '#separator:tab\n#html:true\n'
    for (const r of records) {
      const front = `<b>${r.word.word}</b> <small style="color:#666">${r.word.phonetic || ''}</small>`
      const back = `<div>${r.word.meaning || ''}</div>${r.word.example ? `<div style="margin-top:6px;font-style:italic;color:#555">${r.word.example}</div>` : ''}${r.word.mnemonic ? `<div style="margin-top:4px;color:#d97706;font-size:12px">💡 ${r.word.mnemonic}</div>` : ''}`
      tsv += `${front.replace(/\t/g, ' ')}\t${back.replace(/\t/g, ' ')}\n`
    }
    return res.send(tsv)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
