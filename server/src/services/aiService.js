// AI 服务层 — 可插拔
// 配置 AI_API_KEY / AI_API_URL 后调用外部 AI；否则使用本地规则引擎兜底

import { CORE_WORDS } from '../data/coreWords.js'
import { POLY_WORDS } from '../data/polyWords.js'
import { WRITING_EXPRESSIONS } from '../data/writingExpressions.js'

const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_API_URL = process.env.AI_API_URL || ''

const ROOTS = [
  ['trans', '跨越'], ['pre', '在前'], ['in', '使/进入'], ['re', '再次'], ['ex', '向外'],
  ['con', '共同'], ['com', '共同'], ['sub', '向下'], ['pro', '向前'], ['ad', '向'],
  ['dis', '分开'], ['de', '向下'], ['im', '向内'], ['un', '不'], ['bi', '两个'],
  ['spect', '看'], ['dict', '说'], ['duct', '引导'], ['ject', '扔'], ['mit', '送'],
  ['port', '运'], ['form', '形状'], ['struct', '建造'], ['pos', '放'], ['vert', '转'],
  ['ceed', '走'], ['graph', '写'], ['log', '说/学科'], ['phil', '爱'], ['soph', '智慧'],
  ['cred', '相信'], ['fort', '强壮'], ['gen', '产生'], ['labor', '劳动'], ['legal', '法律']
]

function findRootInfo(word) {
  for (const [root, zh] of ROOTS) {
    if (word.includes(root)) return `${root}(${zh})`
  }
  return null
}

function findCoreInfo(word) {
  const lower = word.toLowerCase()
  return CORE_WORDS.find(w => w.word === lower) || null
}

function findPolyInfo(word) {
  const lower = word.toLowerCase()
  return POLY_WORDS.find(w => w.word === lower) || null
}

function localExplain(word) {
  const w = word.toLowerCase()
  const core = findCoreInfo(w)
  const poly = findPolyInfo(w)
  const root = findRootInfo(w)

  const meaning = poly
    ? `${poly.common_meaning} → 考研常考义：${poly.exam_meaning}`
    : (core?.meaning || '暂无内置释义，建议查词典')

  return {
    word: w,
    simple_explanation: meaning,
    memory_method: core?.mnemonic || (poly ? `熟词僻义：「${poly.common_meaning}」别忘还有「${poly.exam_meaning}」的含义。` : `可通过词根记忆：${root || '建议搭配例句记忆。'}`),
    root_analysis: core?.root || root || '暂无词根信息',
    example_sentence: core?.meaning
      ? `The article emphasizes the importance of ${w}.`
      : (poly?.example || `We should pay attention to the word "${w}" in context.`),
    synonyms: core ? getSynonyms(core.frequency) : [],
    poly_meaning: poly ? { common: poly.common_meaning, exam: poly.exam_meaning, example: poly.example, years: poly.source_year } : null,
    exam_years: core?.exam_years || null,
    frequency: core?.frequency || poly?.frequency || 3,
    source: 'local'
  }
}

function getSynonyms(freq) {
  const pool = [
    ['important', 'crucial', 'significant'],
    ['improve', 'enhance', 'optimize'],
    ['solve', 'resolve', 'tackle'],
    ['think', 'contend', 'maintain'],
    ['show', 'demonstrate', 'illustrate']
  ]
  return pool[freq % pool.length]
}

function getChatEndpoint(rawUrl) {
  const url = (rawUrl || '').trim().replace(/\/+$/, '')
  if (!url) return ''
  if (url.endsWith('/chat/completions')) return url
  if (url.endsWith('/v1')) return `${url}/chat/completions`
  return `${url}/v1/chat/completions`
}

function parseAiJson(rawText) {
  // 清理 <think>...</think> 标签（例如 DeepSeek R1 等推理模型）
  let text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  // 清理 markdown 代码块
  text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
  
  try {
    return JSON.parse(text)
  } catch {
    // 尝试正则匹配最外层的 { ... }
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      return JSON.parse(match[0])
    }
    throw new Error('无法解析 AI 返回的 JSON')
  }
}

async function aiExplain(word) {
  const apiKey = process.env.AI_API_KEY || AI_API_KEY
  const apiUrl = process.env.AI_API_URL || AI_API_URL

  // 尝试外部 AI
  if (apiKey && apiUrl) {
    try {
      const endpoint = getChatEndpoint(apiUrl)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: '你是考研/雅思/四六级英语词汇名师。请以标准 JSON 格式输出指定单词解析，包含字段：simple_explanation(精炼中文释义), memory_method(趣味联想或词根记忆法), root_analysis(词根词缀剖析), example_sentence(地道真题或外刊风格英文例句), synonyms(近义词数组), exam_years(近年考频年份字符串，如"2018,2022")。不要输出除 JSON 以外的内容。'
            },
            { role: 'user', content: `请详细解析单词: ${word}` }
          ],
          temperature: 0.3
        }),
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content || ''
        const json = parseAiJson(text)
        return {
          word,
          simple_explanation: json.simple_explanation || '暂无释义',
          memory_method: json.memory_method || '建议结合语境例句记忆',
          root_analysis: json.root_analysis || '暂无词根分析',
          example_sentence: json.example_sentence || `Study the word "${word}" in practical reading contexts.`,
          synonyms: Array.isArray(json.synonyms) ? json.synonyms : [],
          poly_meaning: json.poly_meaning || null,
          exam_years: json.exam_years || null,
          frequency: json.frequency || 4,
          source: 'ai'
        }
      }
    } catch (e) {
      console.warn(`[AI] 调用外部模型失败，已自动切换为本地智能词库:`, e.message)
    }
  }
  return localExplain(word)
}

/** 根据文章文本提取作文表达（本地规则 + 词库匹配） */
export function detectWritingExpressions(text) {
  const lower = text.toLowerCase()
  const found = new Map()
  for (const expr of WRITING_EXPRESSIONS) {
    const key = expr.basic_word
    if (lower.includes(key.toLowerCase()) && !found.has(key)) {
      found.set(key, expr)
    }
  }
  return Array.from(found.values())
}

export { localExplain, aiExplain }
