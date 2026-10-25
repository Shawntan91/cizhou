import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()
router.use(authRequired)

// GET /api/statistics — 学习统计
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // 累计词汇量（有学习记录的词数）
    const totalLearned = await prisma.learningRecord.count({ where: { userId } })

    // 今日已完成（今天有 last_reviewed 的记录）
    const todayReviewed = await prisma.learningRecord.count({
      where: { userId, last_reviewed: { gte: todayStart } }
    })

    // 掌握率：status >= 3 (认识) 的比例
    const known = await prisma.learningRecord.count({ where: { userId, status: 3 } })
    const masteryRate = totalLearned ? Math.round((known / totalLearned) * 100) : 0

    // 连续学习天数
    const streak = await calculateStreak(userId)

    // 今日待复习
    const dueToday = await prisma.learningRecord.count({
      where: { userId, next_review_time: { lte: new Date() } }
    })

    // 最近 30 天复习记录（用于热力图）
    const daysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentRecords = await prisma.learningRecord.findMany({
      where: { userId, last_reviewed: { gte: daysAgo } },
      select: { last_reviewed: true }
    })

    const heatmap = {}
    for (const r of recentRecords) {
      if (!r.last_reviewed) continue
      const key = r.last_reviewed.toISOString().slice(0, 10)
      heatmap[key] = (heatmap[key] || 0) + 1
    }

    // 遗忘曲线数据（各 interval_index 的单词量）
    const intervals = await prisma.learningRecord.groupBy({
      by: ['interval_index'],
      where: { userId },
      _count: true
    })

    res.json({
      total_learned: totalLearned,
      today_reviewed: todayReviewed,
      due_today: dueToday,
      mastery_rate: masteryRate,
      streak_days: streak,
      heatmap,
      intervals
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// 连续学习天数
async function calculateStreak(userId) {
  const records = await prisma.learningRecord.findMany({
    where: { userId, last_reviewed: { not: null } },
    select: { last_reviewed: true },
    orderBy: { last_reviewed: 'desc' }
  })

  if (!records.length) return 0
  const days = new Set(records.map(r => r.last_reviewed.toISOString().slice(0, 10)))
  let streak = 0
  const today = new Date()
  // 如果今天没学，从昨天开始算
  let cursor = new Date(today)
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000)
  }
  return streak
}

export default router
