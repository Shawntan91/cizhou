import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
      navigate('/')
    } catch (err: any) {
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-paper via-ink-50 to-ink-100">
      <div className="w-full max-w-md fade-in-up">
        {/* 品牌 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-ink-700 flex items-center justify-center text-white text-2xl font-display shadow-float mb-4">
            舟
          </div>
          <h1 className="font-display text-3xl font-bold text-ink-900">词舟</h1>
          <p className="text-ink-400 mt-2 text-sm">AI 智能背单词 · 考研 / 雅思 / 四六级 / GRE</p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-ink-100 p-8">
          {/* 切换 */}
          <div className="flex rounded-xl bg-ink-50 p-1 mb-6">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === m ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-400'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs text-ink-500 mb-1 block">用户名</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-ink-100 bg-paper focus:outline-none focus:ring-2 focus:ring-ink-300 text-sm"
                  placeholder="如何称呼你"
                  required
                />
              </div>
            )}
            <div>
              <label className="text-xs text-ink-500 mb-1 block">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-ink-100 bg-paper focus:outline-none focus:ring-2 focus:ring-ink-300 text-sm"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-ink-100 bg-paper focus:outline-none focus:ring-2 focus:ring-ink-300 text-sm"
                placeholder={mode === 'register' ? '至少 6 位' : '请输入密码'}
                required
              />
            </div>

            {error && <div className="text-xs text-accent-coral bg-coral/5 rounded-lg px-3 py-2">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-ink-700 text-white text-sm font-medium hover:bg-ink-800 transition-colors disabled:opacity-50"
            >
              {loading ? '请稍候…' : mode === 'login' ? '登录' : '创建账号'}
            </button>
          </form>

          <div className="text-center mt-5">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setEmail('demo@vocab.app')
                setPassword('demo123')
              }}
              className="text-xs text-ink-600 bg-ink-50 hover:bg-ink-100 px-3 py-1.5 rounded-lg border border-ink-200 transition-colors inline-flex items-center gap-1.5"
            >
              <span>🔑</span>
              <span>一键填入演示账号 (demo@vocab.app / demo123)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
