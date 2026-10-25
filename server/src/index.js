import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'

import authRoutes from './routes/auth.js'
import wordsRoutes from './routes/words.js'
import pdfRoutes from './routes/pdf.js'
import statisticsRoutes from './routes/statistics.js'
import booksRoutes from './routes/books.js'

const app = express()
const PORT = process.env.PORT || 4000

// 静态上传目录
const uploadDir = path.resolve(process.cwd(), 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)
app.use('/api/words', wordsRoutes)
app.use('/api/pdf', pdfRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/books', booksRoutes)

// 静态文件（生产环境前端构建）
const candidatePaths = [
  path.resolve(process.cwd(), '..', 'client', 'dist'),
  path.resolve(process.cwd(), 'client', 'dist'),
  path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../client/dist'),
  path.resolve(process.cwd(), 'public')
]
const clientDist = candidatePaths.find(p => fs.existsSync(p))
if (clientDist) {
  console.log(`📦 前端静态资源目录: ${clientDist}`)
  app.use(express.static(clientDist))
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' })
})

// 错误处理
app.use((err, req, res, next) => {
  console.error('[server error]', err.message)
  // multer 文件大小/类型错误 → 400
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: '文件超过 50MB 限制' })
  }
  if (err.message && /仅支持 PDF/.test(err.message)) {
    return res.status(400).json({ error: err.message })
  }
  res.status(err.status || 500).json({ error: err.message || '服务器错误' })
})

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ 后端已启动: http://localhost:${PORT}`)
  })
}

export default app

