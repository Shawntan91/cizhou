import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {}
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱、密码不能为空' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' })
    }
    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    })
    if (exists) return res.status(409).json({ error: '用户名或邮箱已存在' })

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: await bcrypt.hash(password, 10)
      }
    })
    // 默认创建「我的单词本」
    await prisma.vocabularyBook.create({
      data: { name: '我的单词本', type: 'custom', userId: user.id }
    })

    res.json({ token: signToken(user), user: { id: user.id, username: user.username, email: user.email } })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: '请输入邮箱和密码' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: '用户不存在' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: '密码错误' })

    res.json({ token: signToken(user), user: { id: user.id, username: user.username, email: user.email } })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
