import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api, getToken } from '../api'
import { PageHeader } from '../components/ui/PageHeader'
import { speakWord } from '../utils/speech'
import type { VocabularyBook, Word } from '../types'

interface BookWithStats extends VocabularyBook {
  wordCount?: number
  masteredCount?: number
}

export function BooksPage() {
  const [books, setBooks] = useState<BookWithStats[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [words, setWords] = useState<(Word & { status?: number; next_review_time?: string })[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // 新建词书弹窗
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBookName, setNewBookName] = useState('')
  const [creating, setCreating] = useState(false)

  const loadBooks = useCallback(async () => {
    try {
      const res = await api.getBooks()
      setBooks(res.books)
      if (res.books.length && (!selected || !res.books.some((b: any) => b.id === selected))) {
        setSelected(res.books[0].id)
      }
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  const loadWords = useCallback(async (bookId: number) => {
    try {
      const res = await api.getBookWords(bookId)
      setWords(res.words)
    } catch {
      setWords([])
    }
  }, [])

  useEffect(() => {
    if (selected) {
      loadWords(selected)
    } else {
      setWords([])
    }
  }, [selected, loadWords])

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBookName.trim()) return
    setCreating(true)
    setMessage('')
    try {
      const res = await api.createBook(newBookName.trim())
      setNewBookName('')
      setShowCreateModal(false)
      await loadBooks()
      setSelected(res.book.id)
      setMessage(`✅ 词书「${res.book.name}」已创建`)
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteBook = async (bookId: number) => {
    const book = books.find(b => b.id === bookId)
    if (!confirm(`确定要删除词书「${book?.name || ''}」吗？单词本身将被保留在系统中。`)) {
      return
    }
    try {
      await api.deleteBook(bookId)
      setMessage('✅ 词书已删除')
      await loadBooks()
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    }
  }

  const handleRemoveWord = async (wordId: number) => {
    if (!selected) return
    try {
      await api.removeWordFromBook(selected, wordId)
      setWords(prev => prev.filter(w => w.id !== wordId))
      loadBooks()
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    }
  }

  const handleExport = (format: 'anki' | 'csv' | 'json') => {
    if (!selected) return
    const token = getToken()
    const url = `/api/books/${selected}/export?format=${format}`
    // 直接触发下载
    const a = document.createElement('a')
    a.href = url
    if (token) {
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.blob())
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob)
          const tempLink = document.createElement('a')
          tempLink.href = blobUrl
          const curr = books.find(b => b.id === selected)
          const ext = format === 'anki' ? 'txt' : format
          tempLink.download = `${curr?.name || '词书'}_${format === 'anki' ? 'anki' : ''}.${ext}`
          tempLink.click()
          window.URL.revokeObjectURL(blobUrl)
        })
        .catch(err => setMessage(`导出失败: ${err.message}`))
    }
  }

  const selectedBook = books.find(b => b.id === selected)
  const filteredWords = words.filter(w =>
    !search ||
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    (w.meaning && w.meaning.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div>
      <PageHeader
        eyebrow="词书管理"
        title="我的词汇书库"
        desc="分主题分类管理词汇，支持一键导出到 Anki、墨墨与 CSV。"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-ink-700 text-white text-sm font-medium hover:bg-ink-800 transition-colors shadow-sm"
          >
            + 新建词书
          </button>
        }
      />

      {message && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-white border border-ink-100 text-sm flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-ink-400 hover:text-ink-700 text-xs">✕</button>
        </div>
      )}

      {/* 新建词书弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-ink-900 mb-1">新建词书</h3>
            <p className="text-xs text-ink-400 mb-4">输入词书名称（如「考研英语一真题」「经济学人阅读生词」）</p>
            <form onSubmit={handleCreateBook} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={newBookName}
                onChange={e => setNewBookName(e.target.value)}
                placeholder="词书名称…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-ink-200"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-ink-500 text-xs hover:bg-ink-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating || !newBookName.trim()}
                  className="px-4 py-2 rounded-xl bg-ink-700 text-white text-xs font-medium hover:bg-ink-800 disabled:opacity-50"
                >
                  {creating ? '创建中…' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* 左侧词书列表 */}
        <div className="space-y-2">
          {books.map(book => (
            <div
              key={book.id}
              onClick={() => setSelected(book.id)}
              className={`w-full group text-left px-4 py-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                selected === book.id
                  ? 'bg-ink-700 text-white border-ink-700 shadow-sm'
                  : 'bg-white text-ink-700 border-ink-100 hover:bg-ink-50/70'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">{book.name}</div>
                <div className={`text-xs mt-0.5 flex items-center gap-1.5 ${selected === book.id ? 'text-white/70' : 'text-ink-400'}`}>
                  <span>{book.type === 'exam' ? '真题词书' : book.type === 'pdf' ? 'PDF 提取' : '自定义'}</span>
                  <span>·</span>
                  <span>{book.wordCount ?? 0} 词</span>
                </div>
              </div>
              {book.name !== '我的单词本' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBook(book.id)
                  }}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent-coral/20 hover:text-accent-coral text-xs transition-opacity ${
                    selected === book.id ? 'text-white/60' : 'text-ink-300'
                  }`}
                  title="删除此词书"
                >
                  🗑
                </button>
              )}
            </div>
          ))}
          {books.length === 0 && (
            <div className="text-center text-ink-300 text-sm py-10">暂无词书</div>
          )}
        </div>

        {/* 右侧单词列表与导出 */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden flex flex-col">
          {/* 顶栏控制 */}
          <div className="px-6 py-4 border-b border-ink-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink-900">
                {selectedBook?.name || '词汇列表'}
              </h2>
              <div className="text-xs text-ink-400 mt-0.5">
                共 {words.length} 词 · 已掌握 {words.filter(w => w.status === 3).length} 词
              </div>
            </div>

            {/* 操作与导出按钮群 */}
            <div className="flex items-center gap-2">
              {selected && (
                <Link
                  to={`/learn?bookId=${selected}`}
                  className="px-3 py-1.5 rounded-lg bg-ink-800 text-white text-xs font-semibold hover:bg-black transition-colors flex items-center gap-1 shadow-sm"
                >
                  <span>🎯</span>
                  <span>开始背诵</span>
                </Link>
              )}
              <span className="text-xs text-ink-300 mx-1">|</span>
              <span className="text-xs text-ink-400 hidden sm:inline">导出:</span>
              <button
                onClick={() => handleExport('anki')}
                className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-xs text-ink-600 hover:bg-ink-50 transition-colors"
                title="导出为 Anki 格式 TXT 文本卡片"
              >
                Anki 卡片
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-xs text-ink-600 hover:bg-ink-50 transition-colors"
                title="导出为 CSV 表格 (Excel/墨墨兼容)"
              >
                CSV 表格
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-xs text-ink-600 hover:bg-ink-50 transition-colors"
                title="导出原始 JSON 数据"
              >
                JSON
              </button>
            </div>
          </div>

          {/* 搜索过滤框 */}
          <div className="p-4 border-b border-ink-50 bg-ink-50/30">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索词书中的英文或中文释义…"
              className="w-full px-3.5 py-2 rounded-xl border border-ink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-ink-200"
            />
          </div>

          {/* 词汇列表 */}
          {loading ? (
            <div className="p-10 text-center text-ink-300 text-sm">加载中…</div>
          ) : filteredWords.length === 0 ? (
            <div className="p-12 text-center text-ink-300 text-sm">
              {words.length === 0 ? (
                <>还没有单词。可前往 <a href="/pdf-analysis" className="text-accent-amber hover:underline">真题解析</a> 或 <a href="/learn" className="text-accent-amber hover:underline">背单词</a> 添加词汇。</>
              ) : (
                <>无匹配单词</>
              )}
            </div>
          ) : (
            <div className="divide-y divide-ink-50 max-h-[60vh] overflow-y-auto">
              {filteredWords.map(item => (
                <div key={item.id} className="group flex items-center gap-4 px-6 py-3.5 hover:bg-ink-50/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-900">{item.word}</span>
                      <button
                        type="button"
                        onClick={() => speakWord(item.word)}
                        className="text-xs text-ink-400 hover:text-ink-700"
                        title="朗读发音"
                      >
                        🔊
                      </button>
                      <span className="text-xs text-ink-400">{item.phonetic}</span>
                      {item.level && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-50 text-ink-500">{item.level}类</span>
                      )}
                    </div>
                    <div className="text-xs text-ink-500 mt-1 truncate">{item.meaning}</div>
                    {item.example && (
                      <div className="text-[11px] text-ink-300 italic truncate mt-0.5">{item.example}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === 3 ? 'bg-emerald-50 text-emerald-600' :
                      item.status === 2 ? 'bg-amber-50 text-amber-600' :
                      item.status === 1 ? 'bg-rose-50 text-rose-600' : 'bg-ink-50 text-ink-400'
                    }`}>
                      {item.status === 3 ? '✓ 已掌握' : item.status === 2 ? '模糊' : item.status === 1 ? '待复习' : '新词'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-300 hover:text-accent-coral text-xs p-1 transition-opacity"
                      title="从此词书中移除"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
