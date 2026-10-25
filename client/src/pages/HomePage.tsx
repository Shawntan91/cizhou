import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { PageHeader } from '../components/ui/PageHeader'
import { speakWord } from '../utils/speech'
import type { LearningWord, Statistics } from '../types'

export function HomePage() {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [todayWords, setTodayWords] = useState<LearningWord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.statistics(), api.todayWords()])
      .then(([s, w]) => {
        setStats(s)
        setTodayWords(w.words)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const dueCount = stats?.due_today ?? todayWords.length

  return (
    <div>
      <PageHeader
        eyebrow="今日学习"
        title="开始你的词汇之旅"
        desc="艾宾浩斯记忆曲线，让每个单词都记得牢固。"
      />

      {/* 今日概览卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="今日待学" value={dueCount} accent="text-ink-700" note="新词 + 复习" />
        <StatCard label="累计词汇" value={stats?.total_learned ?? 0} note="已学习" />
        <StatCard label="连续学习" value={stats?.streak_days ?? 0} note="天" suffix="天" />
        <StatCard label="掌握率" value={stats?.mastery_rate ?? 0} suffix="%" note="已认识比例" />
      </div>

      {/* 行动卡片 */}
      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <Link to="/learn" className="group bg-ink-700 rounded-2xl p-6 text-white shadow-card hover:shadow-float transition-shadow relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full" />
          <div className="text-white/60 text-xs tracking-widest mb-3">背单词</div>
          <div className="font-display text-2xl font-bold mb-1">{dueCount > 0 ? `还有 ${dueCount} 个单词待复习` : '今日任务已完成'}</div>
          <div className="text-white/70 text-sm">卡片记忆 · 快捷键操作 · AI 讲解</div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-white/90 group-hover:translate-x-1 transition-transform">
            开始学习 <span>→</span>
          </div>
        </Link>

        <Link to="/pdf-analysis" className="group bg-white rounded-2xl p-6 border border-ink-100 shadow-card hover:shadow-float transition-shadow">
          <div className="text-accent-amber text-xs tracking-widest mb-3">真题解析</div>
          <div className="font-display text-2xl font-bold text-ink-900 mb-1">上传考研真题 PDF</div>
          <div className="text-ink-400 text-sm">自动提取核心词汇 · 熟词僻义 · 作文高级表达</div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-ink-600 group-hover:translate-x-1 transition-transform">
            上传分析 <span>→</span>
          </div>
        </Link>
      </div>

      {/* 今日词汇预览 */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">今日词汇</h2>
          <Link to="/learn" className="text-xs text-ink-500 hover:text-ink-800 transition-colors">查看全部 →</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-ink-300 text-sm">加载中…</div>
        ) : todayWords.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-ink-300 text-sm mb-2">今日单词已全部学完</div>
            <Link to="/pdf-analysis" className="text-xs text-accent-amber hover:underline">从真题 PDF 提取新词 →</Link>
          </div>
        ) : (
          <div className="divide-y divide-ink-50">
            {todayWords.slice(0, 8).map(item => (
              <div key={item.word.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-ink-50/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-900">{item.word.word}</span>
                    <button
                      type="button"
                      onClick={() => speakWord(item.word.word)}
                      className="text-xs text-ink-400 hover:text-ink-700 p-0.5"
                      title="发音"
                    >
                      🔊
                    </button>
                    <span className="text-xs text-ink-300">{item.word.phonetic}</span>
                    {item.word.level && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-50 text-ink-500">{item.word.level}级</span>
                    )}
                  </div>
                  <div className="text-xs text-ink-400 truncate mt-0.5">{item.word.meaning}</div>
                </div>
                <div className="text-xs text-ink-400 shrink-0">
                  {item.status === 0 ? '新词' : item.interval_index === 0 ? '待复习' : `复习 ${item.interval_index}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, note, suffix = '', accent = 'text-ink-900' }: {
  label: string
  value: number
  note?: string
  suffix?: string
  accent?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-5">
      <div className="text-xs text-ink-400 mb-1.5">{label}</div>
      <div className={`font-display text-3xl font-bold ${accent}`}>
        {value}
        <span className="text-base text-ink-400 font-normal ml-0.5">{suffix}</span>
      </div>
      {note && <div className="text-[11px] text-ink-300 mt-1">{note}</div>}
    </div>
  )
}
