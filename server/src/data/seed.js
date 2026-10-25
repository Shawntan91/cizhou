// 种子脚本 — 初始化内置词库
import prisma from '../lib/prisma.js'
import bcrypt from 'bcryptjs'
import { CORE_WORDS } from './coreWords.js'
import { POLY_WORDS } from './polyWords.js'
import { WRITING_EXPRESSIONS } from './writingExpressions.js'

async function main() {
  console.log('🌱 开始种子数据初始化...')

  // 1. 演示用户
  const demo = await prisma.user.upsert({
    where: { email: 'demo@vocab.app' },
    create: {
      username: 'demo',
      email: 'demo@vocab.app',
      password: await bcrypt.hash('demo123', 10)
    },
    update: {}
  })

  // 1b. 默认词书
  const hasBook = await prisma.vocabularyBook.findFirst({
    where: { userId: demo.id, name: '我的单词本' }
  })
  if (!hasBook) {
    await prisma.vocabularyBook.create({
      data: { name: '我的单词本', type: 'custom', userId: demo.id }
    })
  }
  console.log(`✓ 演示用户: demo / demo123`)

  // 2. 单词表
  let wordCount = 0
  for (const w of CORE_WORDS) {
    await prisma.word.upsert({
      where: { word: w.word },
      create: {
        word: w.word,
        phonetic: w.phonetic,
        meaning: w.meaning,
        example: `The article emphasizes the importance of ${w.word}.`,
        frequency: w.frequency,
        level: w.frequency >= 4 ? 'A' : 'B',
        root: w.root,
        mnemonic: w.mnemonic,
        exam_years: w.exam_years,
        category: w.poly ? 'polymeaning' : 'core'
      },
      update: {}
    })
    wordCount++
  }

  // 3. 熟词僻义表
  let polyCount = 0
  for (const p of POLY_WORDS) {
    await prisma.wordMeaning.upsert({
      where: { word: p.word },
      create: {
        word: p.word,
        common_meaning: p.common_meaning,
        exam_meaning: p.exam_meaning,
        example: p.example,
        source_year: p.source_year,
        frequency: p.frequency
      },
      update: {}
    })
    polyCount++
  }

  // 4. 作文表达表
  let writingCount = 0
  for (const e of WRITING_EXPRESSIONS) {
    await prisma.writingExpression.upsert({
      where: { basic_word_advanced_expression: { basic_word: e.basic_word, advanced_expression: e.advanced_expression } },
      create: {
        basic_word: e.basic_word,
        advanced_expression: e.advanced_expression,
        meaning: e.meaning,
        example_sentence: e.example_sentence,
        topic: e.topic
      },
      update: {}
    })
    writingCount++
  }

  console.log(`✓ 单词 ${wordCount} 个 / 熟词僻义 ${polyCount} 条 / 作文表达 ${writingCount} 条`)
  console.log('✅ 种子数据完成')
}

main()
  .catch(e => { console.error('❌', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
