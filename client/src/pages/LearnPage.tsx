import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { PageHeader } from '../components/ui/PageHeader'
import { speakWord } from '../utils/speech'
import type { LearningWord, WordExplanation } from '../types'

type LearnMode = 'flashcard' | 'spelling'

export function LearnPage() {
  const [searchParams] = useSearchParams()
  const bookIdParam = searchParams.get('bookId')
  const bookId = bookIdParam ? Number(bookIdParam) : undefined

  const [words, setWords] = useState<LearningWord[]>([])
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<LearnMode>('flashcard')
  const [revealed, setRevealed] = useState(false)
  const [explanation, setExplanation] = useState<WordExplanation | null>(null)
  const [loadingExplain, setLoadingExplain] = useState(false)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [stats, setStats] = useState({ known: 0, fuzzy: 0, unknown: 0 })
  const [error, setError] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(true)

  // 拼写模式状态
  const [inputSpelling, setInputSpelling] = useState('')
  const [spellingFeedback, setSpellingFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const spellingInputRef = useRef<HTMLInputElement>(null)

  const current = words[index]

  const loadWords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.todayWords({ bookId, limit: 30 })
      setWords(res.words)
      setIndex(0)
      setRevealed(false)
      setDone(res.words.length === 0)
      setInputSpelling('')
      setSpellingFeedback('idle')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    loadWords()
  }, [loadWords])

  // 显示答案时加载 AI 讲解与发音
  useEffect(() => {
    if (revealed && current) {
      if (autoSpeak) {
        speakWord(current.word.word)
      }
      setLoadingExplain(true)
      setExplanation(null)
      api.explainWord(current.word.word)
        .then(setExplanation)
        .catch(() => setExplanation(null))
        .finally(() => setLoadingExplain(false))
    }
  }, [revealed, current?.word.id, autoSpeak]) // eslint-disable-line

  // 切换单词时重置拼写状态并聚焦
  useEffect(() => {
    setInputSpelling('')
    setSpellingFeedback('idle')
    if (mode === 'spelling') {
      setTimeout(() => spellingInputRef.current?.focus(), 100)
    }
  }, [index, mode])

  const submit = async (answer: 1 | 2 | 3) => {
    if (!current) return
    try {
      await api.reviewWord(current.word.id, answer)
    } catch (e: any) {
      setError(e.message)
      return
    }

    if (answer === 1) setStats(s => ({ ...s, unknown: s.unknown + 1 }))
    if (answer === 2) setStats(s => ({ ...s, fuzzy: s.fuzzy + 1 }))
    if (answer === 3) setStats(s => ({ ...s, known: s.known + 1 }))

    if (index + 1 >= words.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setRevealed(false)
    }
  }

  // 拼写检查
  const handleCheckSpelling = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!current) return

    const target = current.word.word.trim().toLowerCase()
    const input = inputSpelling.trim().toLowerCase()

    if (input === target) {
      setSpellingFeedback('correct')
      speakWord(target)
      setTimeout(() => {
        submit(3)
      }, 700)
    } else {
      setSpellingFeedback('wrong')
      speakWord(target)
    }
  }

  // 快捷键支持
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (done) return

      // 按 P 键发音
      if ((e.key === 'p' || e.key === 'P') && current) {
        // 如果焦点在输入框中且不是按组合键，避免拦截普通字母 p
        if (mode === 'spelling' && document.activeElement === spellingInputRef.current) {
          return
        }
        e.preventDefault()
        speakWord(current.word.word)
        return
      }

      if (mode === 'flashcard') {
        if (e.code === 'Space') {
          e.preventDefault()
          if (!revealed) setRevealed(true)
          return
        }
        if (!revealed) return
        if (e.key === '1') submit(1)
        if (e.key === '2') submit(2)
        if (e.key === '3') submit(3)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [revealed, done, index, words, mode, current])

  if (loading) {
    return <div className="text-center py-24 text-ink-300">加载今日单词…</div>
  }

  if (error) {
    return (
      <div className="text-center py-24">
        <div className="text-accent-coral mb-4">{error}</div>
        <button onClick={loadWords} className="text-ink-600 underline">重试</button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16 fade-in-up">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-ink-700 flex items-center justify-center text-white text-3xl mb-6">✓</div>
        <h2 className="font-display text-2xl font-bold text-ink-900 mb-3">今日任务完成</h2>
        <p className="text-ink-400 text-sm mb-2">认识 {stats.known} · 模糊 {stats.fuzzy} · 不认识 {stats.unknown}</p>
        <div className="flex gap-3 justify-center mt-8">
          <button onClick={loadWords} className="px-5 py-2.5 rounded-xl bg-ink-700 text-white text-sm hover:bg-ink-800">再学一轮</button>
          <Link to="/pdf-analysis" className="px-5 py-2.5 rounded-xl border border-ink-200 text-ink-600 text-sm hover:bg-ink-50">从 PDF 提取新词</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="背单词"
        title={mode === 'flashcard' ? '记忆卡片' : '拼写测试'}
        desc={mode === 'flashcard' ? '空格显示答案 · 1 不认识 · 2 模糊 · 3 认识 · P 发音' : '根据释义输入英文拼写，按回车提交校验'}
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                autoSpeak ? 'border-accent-amber/40 bg-accent-amber/10 text-accent-amber' : 'border-ink-200 text-ink-400'
              }`}
              title="翻开卡片时自动朗读发音"
            >
              🔊 自动发音: {autoSpeak ? '开' : '关'}
            </button>
          </div>
        }
      />

      {/* 模式切换 */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-xl p-1 bg-ink-100/70 border border-ink-100">
          <button
            onClick={() => setMode('flashcard')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'flashcard' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            卡片记忆模式
          </button>
          <button
            onClick={() => setMode('spelling')}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'spelling' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            拼写测试模式
          </button>
        </div>
      </div>

      {/* 进度 */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="flex items-center justify-between text-xs text-ink-400 mb-2">
          <span>{index + 1} / {words.length}</span>
          <span className="flex gap-3">
            <span className="text-accent-coral">× {stats.unknown}</span>
            <span className="text-accent-amber">△ {stats.fuzzy}</span>
            <span className="text-ink-500">✓ {stats.known}</span>
          </span>
        </div>
        <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
          <div className="h-full bg-ink-600 rounded-full transition-all" style={{ width: `${((index + 1) / words.length) * 100}%` }} />
        </div>
      </div>

      {/* 模式 A：卡片记忆 */}
      {mode === 'flashcard' ? (
        <div className="max-w-lg mx-auto">
          <div className="perspective-1200">
            <div className={`relative preserve-3d transition-transform duration-500 ${revealed ? 'rotate-y-180' : ''}`} style={{ minHeight: 350 }}>
              {/* 正面 */}
              <div
                className="absolute inset-0 backface-hidden bg-white rounded-2xl border border-ink-100 shadow-card p-8 flex flex-col items-center justify-center gap-4 cursor-pointer select-none"
                onClick={() => setRevealed(true)}
              >
                <div className="text-xs text-ink-300 tracking-widest uppercase">词舟记忆卡片</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-display text-4xl font-bold text-ink-900 text-center break-words">{current.word.word}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      speakWord(current.word.word)
                    }}
                    className="w-8 h-8 rounded-full bg-ink-50 hover:bg-ink-100 flex items-center justify-center text-ink-600 transition-colors"
                    title="播放发音 (快捷键 P)"
                  >
                    🔊
                  </button>
                </div>
                {current.word.phonetic && (
                  <div className="text-sm text-ink-400">{current.word.phonetic}</div>
                )}
                <div className="text-xs text-ink-300 mt-2">点击卡片或按空格键显示答案</div>
              </div>

              {/* 背面 */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-2xl border border-ink-100 shadow-card p-8 overflow-y-auto">
                <div className="text-center mb-5">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xl font-bold text-ink-900">{current.word.word}</span>
                    <button
                      type="button"
                      onClick={() => speakWord(current.word.word)}
                      className="p-1 text-ink-400 hover:text-ink-700"
                      title="点击发音"
                    >
                      🔊
                    </button>
                  </div>
                  <div className="text-sm text-ink-400 mt-1">{current.word.phonetic}</div>
                  {current.word.level && (
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-ink-50 text-ink-500">
                      {current.word.level} 类核心词汇
                    </span>
                  )}
                </div>

                <div className="text-center mb-6">
                  <div className="text-lg text-ink-800 leading-relaxed font-medium">{current.word.meaning || '暂无释义'}</div>
                </div>

                <div className="space-y-3 text-sm border-t border-ink-50 pt-4">
                  {current.word.root && (
                    <InfoRow label="词根" value={current.word.root} />
                  )}
                  {current.word.mnemonic && (
                    <InfoRow label="记忆" value={current.word.mnemonic} />
                  )}
                  {current.word.exam_years && (
                    <InfoRow label="真题年份" value={current.word.exam_years} />
                  )}
                  {current.word.example && (
                    <InfoRow label="例句" value={current.word.example} />
                  )}
                </div>

                {/* AI 讲解 */}
                <div className="mt-4 border-t border-ink-50 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber font-semibold">AI 智能解析</span>
                    <span className="text-xs text-ink-400">词汇拓展</span>
                  </div>
                  {loadingExplain ? (
                    <div className="text-xs text-ink-300 pulse-soft">AI 正在深度解析中…</div>
                  ) : explanation ? (
                    <div className="space-y-2.5 text-sm">
                      {explanation.memory_method && (
                        <div>
                          <div className="text-xs text-ink-400 mb-0.5">联想法</div>
                          <div className="text-ink-700">{explanation.memory_method}</div>
                        </div>
                      )}
                      {explanation.poly_meaning && (
                        <div>
                          <div className="text-xs text-ink-400 mb-0.5">熟词僻义辨析</div>
                          <div className="text-ink-700">{explanation.poly_meaning.common} → <span className="font-semibold text-accent-amber">{explanation.poly_meaning.exam}</span></div>
                        </div>
                      )}
                      {explanation.example_sentence && (
                        <div>
                          <div className="text-xs text-ink-400 mb-0.5">地道真题例句</div>
                          <div className="text-ink-600 italic bg-ink-50/60 p-2.5 rounded-lg">{explanation.example_sentence}</div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* 操作区 */}
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="mt-6 w-full py-3.5 rounded-xl bg-ink-700 text-white text-sm font-medium hover:bg-ink-800 transition-colors shadow-sm"
            >
              显示答案（空格）
            </button>
          ) : (
            <div className="mt-6 grid grid-cols-3 gap-3">
              <AnswerButton label="不认识" keyHint="1" onClick={() => submit(1)} className="bg-white border-accent-coral/40 text-accent-coral hover:bg-accent-coral/5" />
              <AnswerButton label="模糊" keyHint="2" onClick={() => submit(2)} className="bg-white border-accent-amber/40 text-accent-amber hover:bg-accent-amber/5" />
              <AnswerButton label="认识" keyHint="3" onClick={() => submit(3)} className="bg-ink-700 text-white hover:bg-ink-800 shadow-sm" />
            </div>
          )}
        </div>
      ) : (
        /* 模式 B：拼写测试 */
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-8">
            <div className="text-center mb-6">
              <div className="text-xs text-ink-300 tracking-widest uppercase mb-2">拼写测试</div>
              <div className="text-2xl font-bold text-ink-900 mb-2">{current.word.meaning || '根据释义拼写单词'}</div>
              <div className="flex items-center justify-center gap-2 text-sm text-ink-400">
                <span>{current.word.phonetic}</span>
                <button
                  type="button"
                  onClick={() => speakWord(current.word.word)}
                  className="p-1 hover:text-ink-700 text-accent-amber"
                  title="点击听发音"
                >
                  🔊 听发音
                </button>
              </div>
            </div>

            {/* 例句提示（将单词替换为下划线） */}
            {current.word.example && (
              <div className="bg-ink-50/70 p-4 rounded-xl text-sm text-ink-600 italic text-center mb-6">
                "{current.word.example.replace(new RegExp(current.word.word, 'gi'), '_______')}"
              </div>
            )}

            {/* 输入表单 */}
            <form onSubmit={handleCheckSpelling} className="space-y-4">
              <div>
                <input
                  ref={spellingInputRef}
                  type="text"
                  value={inputSpelling}
                  onChange={e => {
                    setInputSpelling(e.target.value)
                    if (spellingFeedback !== 'idle') setSpellingFeedback('idle')
                  }}
                  placeholder="在此输入英文单词…"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className={`w-full px-4 py-3.5 text-center text-lg font-mono rounded-xl border transition-all focus:outline-none ${
                    spellingFeedback === 'correct'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                      : spellingFeedback === 'wrong'
                      ? 'border-accent-coral bg-accent-coral/5 text-accent-coral ring-2 ring-accent-coral/20'
                      : 'border-ink-200 bg-white text-ink-900 focus:border-ink-600 focus:ring-2 focus:ring-ink-100'
                  }`}
                />
              </div>

              {spellingFeedback === 'wrong' && (
                <div className="text-center p-3 rounded-xl bg-accent-coral/10 text-xs text-accent-coral">
                  拼写不正确。正确拼写：<span className="font-bold underline text-sm ml-1 font-mono">{current.word.word}</span>
                </div>
              )}

              {spellingFeedback === 'correct' && (
                <div className="text-center p-3 rounded-xl bg-emerald-100/80 text-xs text-emerald-700 font-medium">
                  ✓ 回答正确！正在进入下一个单词…
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-ink-700 text-white text-sm font-medium hover:bg-ink-800 transition-colors shadow-sm"
                >
                  确认提交（回车）
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputSpelling(current.word.word)
                    speakWord(current.word.word)
                    setSpellingFeedback('wrong')
                  }}
                  className="px-4 py-3.5 rounded-xl border border-ink-200 text-ink-600 text-sm hover:bg-ink-50 transition-colors"
                >
                  看答案
                </button>
              </div>
            </form>
          </div>

          {/* 状态操作 */}
          {spellingFeedback === 'wrong' && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <AnswerButton label="记住了，重新尝试" keyHint="" onClick={() => { setInputSpelling(''); setSpellingFeedback('idle'); }} className="bg-white border-ink-200 text-ink-700" />
              <AnswerButton label="跳过并标记模糊" keyHint="" onClick={() => submit(2)} className="bg-accent-amber/10 border-accent-amber/40 text-accent-amber" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-ink-300 shrink-0 w-16">{label}</span>
      <span className="text-ink-700">{value}</span>
    </div>
  )
}

function AnswerButton({ label, keyHint, onClick, className = '' }: {
  label: string
  keyHint: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3.5 rounded-xl border text-sm font-medium transition-colors ${className}`}
    >
      {label}
      {keyHint && <span className="block text-[10px] opacity-60 mt-0.5">按 {keyHint}</span>}
    </button>
  )
}
