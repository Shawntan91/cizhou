import { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, desc, action }: {
  eyebrow?: string
  title: string
  desc?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-xs text-accent-amber tracking-[0.2em] uppercase mb-1.5">{eyebrow}</div>
        )}
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-900">{title}</h1>
        {desc && <p className="text-ink-400 text-sm mt-1.5">{desc}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
