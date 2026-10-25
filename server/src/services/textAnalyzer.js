// 文本分析引擎 — 分词/过滤/词频/熟词僻义/难度评级

import { CORE_WORDS } from '../data/coreWords.js'
import { POLY_WORDS } from '../data/polyWords.js'
import { detectWritingExpressions } from '../services/aiService.js'

// 停用词表（低价值词）
const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','am','of','to','in','on','at','for',
  'by','with','from','about','into','through','during','before','after','above','below','between',
  'under','over','and','or','but','not','no','nor','so','if','then','than','that','this','these',
  'those','i','you','he','she','it','we','they','me','him','her','us','them','my','your','his',
  'its','our','their','as','such','only','own','same','too','very','just','can','could','will',
  'would','shall','should','may','might','must','do','does','did','have','has','had','there',
  'here','when','where','why','how','what','which','who','whom','whose','also','more','most',
  'less','least','some','any','each','every','all','both','few','many','much','one','two','three',
  'get','got','make','made','take','took','give','gave','find','found','see','saw','seem','let',
  'us','use','used','using','come','came','go','went','become','became','begin','began','show',
  'know','think','say','said','mean','like','want','need','way','new','now','out','up','down',
  'back','again','still','ever','never','while','because','though','although','since','until',
  'per','via','vs','et','al','among','against','across','along','around','without','within',
  'according','however','therefore','thus','hence','well','also','whether','may','might'
])

// 基础词形还原（简单规则）
const INFLECTION_RULES = [
  [/ies$/i, 'y'],     // studies -> study
  [/ves$/i, 'f'],     // leaves -> leaf (粗略)
  [/s$/i, ''],        // cats -> cat
  [/ing$/i, ''],      // running -> runn (粗略)
  [/ed$/i, '']        // walked -> walk
]

export function stem(word) {
  let w = word
  for (const [regex, repl] of INFLECTION_RULES) {
    if (regex.test(w)) { w = w.replace(regex, repl); break }
  }
  return w
}

// 频率映射（按单词长度/稀有度粗略，可扩展）
export function frequencyStars(word) {
  const len = word.length
  if (len <= 4) return len === 4 ? 3 : 2
  if (len <= 6) return 4
  if (len <= 9) return 4
  return 5
}

/**
 * 核心分析函数
 * @param {string} text
 * @param {object} options
 * @returns {Promise<{words: object[], poly: object[], writing: object[], stats: object}>}
 */
export async function analyzeText(text, options = {}) {
  const minCount = options.minCount ?? 1
  const maxWords = options.maxWords ?? 80

  // 1. 分句
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 10)

  // 2. 分词 & 词频
  const freq = new Map()
  const context = new Map() // word -> 首次出现句子
  const positions = new Map() // word -> Set(段落位置)

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    const tokens = sentence
      .toLowerCase()
      .match(/[a-z][a-z-']{2,}/g) || []

    for (const token of tokens) {
      const clean = token.replace(/['-]/g, '').toLowerCase()
      if (STOP_WORDS.has(clean)) continue
      if (clean.length < 3) continue
      if (!/^[a-z]+$/.test(clean)) continue

      freq.set(clean, (freq.get(clean) || 0) + 1)
      if (!context.has(clean)) context.set(clean, sentence)
      if (!positions.has(clean)) positions.set(clean, new Set())
      positions.get(clean).add(Math.floor(i / 3) + 1)
    }
  }

  // 3. 熟词僻义识别（基于内置词库）
  const polyMap = new Map(POLY_WORDS.map(p => [p.word, p]))

  // 4. 构建词汇列表
  const words = []
  const polyFound = []
  const wordSet = new Set()

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1])
  for (const [word, count] of sorted) {
    if (words.length >= maxWords) break
    if (wordSet.has(word)) continue
    wordSet.add(word)

    const core = CORE_WORDS.find(w => w.word === word)
    const poly = polyMap.get(word)

    const importance = core ? core.frequency : (poly ? poly.frequency : Math.min(5, 2 + Math.floor(count / 2)))

    const entry = {
      word,
      phonetic: core?.phonetic || '',
      meaning: core?.meaning || (poly ? `${poly.common_meaning} → ${poly.exam_meaning}` : ''),
      frequency: count,
      position: `Paragraph ${Math.min(...positions.get(word) || [1])}`,
      original_sentence: context.get(word) || '',
      importance: Math.max(1, Math.min(5, importance)),
      category: classifyWord(word, core, poly),
      suggestion: getSuggestion(word, core, poly),
      exam_years: core?.exam_years || poly?.source_year || null
    }
    words.push(entry)

    if (poly) {
      polyFound.push({
        word,
        common_meaning: poly.common_meaning,
        exam_meaning: poly.exam_meaning,
        example: poly.example,
        source_year: poly.source_year,
        frequency: poly.frequency,
        original_sentence: context.get(word) || ''
      })
    }
  }

  // 5. 作文表达提取
  const writing = detectWritingExpressions(text)

  return {
    words,
    poly: polyFound,
    writing,
    stats: {
      total_sentences: sentences.length,
      unique_words: freq.size,
      total_tokens: [...freq.values()].reduce((a, b) => a + b, 0)
    },
    sentences: sentences.slice(0, 100).map((s, idx) => ({
      text: s,
      page: Math.floor(idx / 10) + 1,
      position: `Paragraph ${idx + 1}`
    }))
  }
}

/** 难度评级：A 核心5500 / B 高频 / C 熟词僻义 / D 超纲 */
function classifyWord(word, core, poly) {
  if (poly) return 'C'
  if (core) return core.frequency >= 4 ? 'A' : 'B'
  return 'D'
}

function getSuggestion(word, core, poly) {
  if (poly) return '熟词僻义，务必掌握考研特殊含义'
  if (core) {
    if (core.frequency >= 4) return '重点掌握，反复考查'
    return '高频词，建议结合真题例句记忆'
  }
  return '超纲词，结合上下文理解即可'
}

export { STOP_WORDS }
