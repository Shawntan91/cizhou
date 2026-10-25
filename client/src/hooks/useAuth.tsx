import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, getToken, setToken, clearToken } from '../api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(padded), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonStr)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 从 localStorage 恢复登录态
  useEffect(() => {
    const token = getToken()
    if (token) {
      const payload = decodeJwt(token)
      if (payload && payload.id) {
        setUser({ id: payload.id, username: payload.username, email: payload.email })
      } else {
        clearToken()
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const { token, user } = await api.login({ email, password })
    setToken(token)
    setUser(user)
  }

  const register = async (username: string, email: string, password: string) => {
    const { token, user } = await api.register({ username, email, password })
    setToken(token)
    setUser(user)
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
