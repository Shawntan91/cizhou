import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authRequired } from '../middleware/auth.js'
import { schedule } from '../services/srs.js'
import { aiExplain, localExplain } from '../services/aiService.js'

const router = Router()
router.use(authRequired)

// GET /api/words/today — 今日学习词（新词 + 到期复习）
// 可选参数：?bookId=123&limit=20
router.get('/today', async (req, res) => {
  try {
    const userId = req.user.id
    const now = new Date()
    const bookId = req.query.bookId ? Number(req.query.bookId) : undefined
    const limit = Math.min(Number(req.query.limit) || 20, 50)

    const whereCondition = {
      userId,
      next_review_time: { lte: now }
    }
    if (bookId) whereCondition.bookId = bookId

    const records = await prisma.learningRecord.findMany({
      where: whereCondition,
      include: { word: true },
      orderBy: { next_review_time: 'asc' },
      take: limit
    })

    // 新词不足时从词库补充
    const dueCount = records.length
    if (dueCount < Math.min(10, limit)) {
      const targetShortfall = Math.min(10, limit) - dueCount
      const knownIds = (await prisma.learningRecord.findMany({
        where: { userId },
        select: { wordId: true }
      })).map(r => r.wordId)

      const newWords = await prisma.word.findMany({
        where: knownIds.length ? { id: { notIn: knownIds } } : undefined,
        orderBy: { frequency: 'desc' },
        take: targetShortfall
      })

      const newRecords = []
      for (const w of newWords) {
        const created = await prisma.learningRecord.upsert({
          where: { userId_wordId: { userId, wordId: w.id } },
          create: {
            userId,
            wordId: w.id,
            next_review_time: now,
            bookId: bookId || null
          },
          update: {},
          include: { word: true }
        })
        newRecords.push(created)
      }

      return res.json({ words: [...records, ...newRecords], total: records.length + newRecords.length })
    }

    res.json({ words: records, total: records.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/words/search — 检索词库
router.get('/search', async (req, res) => {
  try {
    const userId = req.user.id
    const { q = '', category, level, page = 1, pageSize = 30 } = req.query
    const trimmed = String(q).trim().toLowerCase()

    const where = {}
    if (trimmed) {
      where.OR = [
        { word: { contains: trimmed } },
        { meaning: { contains: trimmed } }
      ]
    }
    if (category) where.category = String(category)
    if (level) where.level = String(level)

    const skip = (Math.max(1, Number(page)) - 1) * Number(pageSize)
    const [words, total] = await Promise.all([
      prisma.word.findMany({
        where,
        orderBy: [{ frequency: 'desc' }, { word: 'asc' }],
        skip,
        take: Number(pageSize)
      }),
      prisma.word.count({ where })
    ])

    // 附带当前用户的掌握状态
    const wordIds = words.map(w => w.id)
    const userRecords = await prisma.learningRecord.findMany({
      where: { userId, wordId: { in: wordIds } }
    })
    const recordMap = new Map(userRecords.map(r => [r.wordId, r]))

    const result = words.map(w => {
      const rec = recordMap.get(w.id)
      return {
        ...w,
        learning_status: rec ? rec.status : null,
        interval_index: rec ? rec.interval_index : null,
        next_review_time: rec ? rec.next_review_time : null
      }
    })

    res.json({ words: result, total, page: Number(page), pageSize: Number(pageSize) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/words/custom — 添加自定义生词
router.post('/custom', async (req, res) => {
  try {
    const userId = req.user.id
    const { word: rawWord, meaning, phonetic, example, bookId } = req.body || {}
    if (!rawWord) return res.status(400).json({ error: '请输入单词' })

    const wordText = String(rawWord).trim().toLowerCase()

    // 尝试获取内置或 AI 解释补充
    let wordMeaning = meaning
    let wordPhonetic = phonetic
    let wordExample = example
    let wordRoot = null
    let wordMnemonic = null

    if (!wordMeaning || !wordPhonetic) {
      const explanation = await aiExplain(wordText).catch(() => localExplain(wordText))
      if (!wordMeaning && explanation.simple_explanation) wordMeaning = explanation.simple_explanation
      if (!wordPhonetic && explanation.phonetic) wordPhonetic = explanation.phonetic
      if (!wordExample && explanation.example_sentence) wordExample = explanation.example_sentence
      wordRoot = explanation.root_analysis
      wordMnemonic = explanation.memory_method
    }

    const word = await prisma.word.upsert({
      where: { word: wordText },
      create: {
        word: wordText,
        phonetic: wordPhonetic || '',
        meaning: wordMeaning || '暂无释义',
        example: wordExample || '',
        root: wordRoot || '',
        mnemonic: wordMnemonic || '',
        frequency: 3,
        level: 'B',
        category: 'custom'
      },
      update: {
        ...(wordMeaning ? { meaning: wordMeaning } : {}),
        ...(wordPhonetic ? { phonetic: wordPhonetic } : {})
      }
    })

    // 加入学习记录
    const record = await prisma.learningRecord.upsert({
      where: { userId_wordId: { userId, wordId: word.id } },
      create: {
        userId,
        wordId: word.id,
        next_review_time: new Date(),
        bookId: bookId ? Number(bookId) : null
      },
      update: {
        ...(bookId ? { bookId: Number(bookId) } : {})
      },
      include: { word: true }
    })

    res.json({ word, record })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/words/:id — 从学习记录中移除单词
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id
    const wordId = Number(req.params.id)

    await prisma.learningRecord.deleteMany({
      where: { userId, wordId }
    })

    res.json({ message: '已从学习记录中移除' })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/words/review — 提交复习结果 { wordId, answer: 1|2|3 }
router.post('/review', async (req, res) => {
  try {
    const userId = req.user.id
    const { wordId, answer } = req.body || {}
    if (!wordId || ![1, 2, 3].includes(answer)) {
      return res.status(400).json({ error: '参数错误' })
    }

    const record = await prisma.learningRecord.findUnique({
      where: { userId_wordId: { userId, wordId } }
    })

    const base = record || { status: 0, interval_index: 0, review_count: 0 }
    const next = schedule(base, answer)

    const saved = await prisma.learningRecord.upsert({
      where: { userId_wordId: { userId, wordId } },
      create: {
        userId, wordId,
        status: next.status,
        interval_index: next.interval_index,
        next_review_time: next.next_review_time,
        review_count: next.review_count,
        last_reviewed: new Date()
      },
      update: {
        status: next.status,
        interval_index: next.interval_index,
        next_review_time: next.next_review_time,
        review_count: next.review_count,
        last_reviewed: new Date()
      }
    })

    res.json({ record: saved })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/words/explain — AI 讲解 { word }
router.post('/explain', async (req, res) => {
  try {
    const { word } = req.body || {}
    if (!word) return res.status(400).json({ error: '缺少单词' })
    const result = await aiExplain(word)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
