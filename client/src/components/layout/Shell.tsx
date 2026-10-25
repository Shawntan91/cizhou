import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/', label: '今日计划', icon: '◐', end: true },
  { to: '/learn', label: '背单词', icon: '▣' },
  { to: '/pdf', label: 'PDF 提取', icon: '⇪' },
  { to: '/pdf-analysis', label: '真题解析', icon: '❋' },
  { to: '/books', label: '词书', icon: '▤' },
  { to: '/statistics', label: '统计', icon: '◔' },
  { to: '/profile', label: '个人中心', icon: '◍' }
]

export function Shell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex">
      {/* 桌面侧栏 */}
      <aside className="hidden md:flex w-60 flex-col border-r border-ink-100 bg-white/70 backdrop-blur fixed inset-y-0 left-0 z-30">
        <SidebarContent user={user} handleLogout={handleLogout} />
      </aside>

      {/* 移动端抽屉 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 inset-y-0 w-64 bg-white shadow-xl flex flex-col">
            <SidebarContent user={user} handleLogout={handleLogout} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* 主区 */}
      <div className="flex-1 md:ml-60 flex flex-col min-w-0">
        {/* 移动端顶栏 */}
        <header className="md:hidden sticky top-0 z-20 bg-paper/90 backdrop-blur border-b border-ink-100 px-4 h-14 flex items-center justify-between">
          <button onClick={() => setMobileOpen(true)} className="text-ink-600 text-xl px-2">☰</button>
          <Brand />
          <div className="w-9" />
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-ink-700 flex items-center justify-center text-white text-lg shadow-sm">舟</div>
      <div>
        <div className="font-display font-bold text-ink-900 leading-none">词舟</div>
        <div className="text-[10px] text-ink-400 tracking-widest">AI 背单词</div>
      </div>
    </div>
  )
}

function SidebarContent({ user, handleLogout, onNavigate }: {
  user: any
  handleLogout: () => void
  onNavigate?: () => void
}) {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="px-2 pt-2 pb-6">
        <Brand />
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-ink-50 text-ink-800 font-medium shadow-sm'
                  : 'text-ink-500 hover:bg-ink-50/60 hover:text-ink-700'
              }`
            }
          >
            <span className={`w-6 text-center ${item.to === '/pdf-analysis' ? 'text-accent-amber' : 'text-ink-300'}`}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-100 pt-4 mt-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center text-ink-700 font-medium">
            {(user?.username || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-ink-800 truncate">{user?.username || '游客'}</div>
            <div className="text-xs text-ink-400 truncate">{user?.email || ''}</div>
          </div>
          <button
            onClick={handleLogout}
            className="text-ink-300 hover:text-ink-600 transition-colors text-sm p-1"
            title="退出登录"
          >
            ⎋
          </button>
        </div>
      </div>
    </div>
  )
}
