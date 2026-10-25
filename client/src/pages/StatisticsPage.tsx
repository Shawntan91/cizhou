import { useEffect, useState } from 'react'
import { api } from '../api'
import { PageHeader } from '../components/ui/PageHeader'
import type { Statistics } from '../types'

const INTERVAL_LABELS = ['10分钟', '1天', '3天', '7天', '15天', '30天']

export function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null)

  useEffect(() => {
    api.statistics().then(setStats).catch(console.error)
  }, [])

  if (!stats) {
    return <div className="text-center py-24 text-ink-300">加载统计…</div>
  }

  const maxInterval = Math.max(...stats.intervals.map(i => i._count), 1)
  const maxHeat = Math.max(...Object.values(stats.heatmap), 1)

  return (
    <div>
      <PageHeader eyebrow="学习分析" title="统计 Dashboard" desc="用数据了解你的记忆进展。" />

      {/* 概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="累计词汇" value={stats.total_learned} />
        <StatCard label="今日已学" value={stats.today_reviewed} />
        <StatCard label="待复习" value={stats.due_today} />
        <StatCard label="掌握率" value={stats.mastery_rate} suffix="%" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 记忆间隔分布（遗忘曲线相关） */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
          <h3 className="font-display text-lg font-bold text-ink-900 mb-5">记忆间隔分布</h3>
          <p className="text-xs text-ink-400 mb-5">艾宾浩斯复习阶段 · 每个间隔档位的单词量</p>
          <div className="space-y-3">
            {stats.intervals
              .slice()
              .sort((a, b) => a.interval_index - b.interval_index)
              .map(item => (
                <div key={item.interval_index} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-ink-500 shrink-0">
                    {INTERVAL_LABELS[item.interval_index] || `档${item.interval_index}`}
                  </div>
                  <div className="flex-1 h-5 bg-ink-50 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-ink-500 to-ink-700 rounded"
                      style={{ width: `${(item._count / maxInterval) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs text-ink-500">{item._count}</div>
                </div>
              ))}
          </div>
        </div>

        {/* 学习热力图 */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
          <h3 className="font-display text-lg font-bold text-ink-900 mb-2">近 30 天学习热力图</h3>
          <p className="text-xs text-ink-400 mb-5">颜色越深，当天学习越多</p>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 28 }, (_, i) => {
              const d = new Date()
              d.setDate(d.getDate() - (27 - i))
              const key = d.toISOString().slice(0, 10)
              const count = stats.heatmap[key] || 0
              const isToday = i === 27
              const intensity = count === 0 ? 'bg-ink-50' :
                count < maxHeat / 3 ? 'bg-ink-200' :
                count < (maxHeat * 2) / 3 ? 'bg-ink-400' : 'bg-ink-600'
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div
                    title={`${key}: ${count} 词`}
                    className={`w-full aspect-square rounded-md ${intensity} ${isToday ? 'ring-2 ring-accent-amber' : ''}`}
                  />
                  <span className="text-[8px] text-ink-300">{d.getDate()}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] text-ink-400">
            <span>少</span>
            <div className="w-3 h-3 rounded bg-ink-50" />
            <div className="w-3 h-3 rounded bg-ink-200" />
            <div className="w-3 h-3 rounded bg-ink-400" />
            <div className="w-3 h-3 rounded bg-ink-600" />
            <span>多</span>
          </div>
        </div>
      </div>

      {/* 连续学习天数强调 */}
      <div className="mt-6 bg-gradient-to-r from-ink-700 to-ink-800 rounded-2xl p-8 text-white shadow-card flex items-center justify-between">
        <div>
          <div className="text-white/60 text-xs tracking-widest mb-1">连续学习</div>
          <div className="font-display text-4xl font-bold">{stats.streak_days}<span className="text-lg text-white/60 ml-1">天</span></div>
        </div>
        <div className="text-white/40 text-sm text-right">
          坚持就是胜利
          <div className="text-xs mt-1">每天背一点，词汇量稳步提升</div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-5">
      <div className="text-xs text-ink-400 mb-1.5">{label}</div>
      <div className="font-display text-3xl font-bold text-ink-900">
        {value}<span className="text-base text-ink-400 font-normal ml-0.5">{suffix}</span>
      </div>
    </div>
  )
}
