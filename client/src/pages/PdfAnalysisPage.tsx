import { useCallback, useEffect, useRef, useState } from 'react'
import { api, getToken } from '../api'
import { PageHeader } from '../components/ui/PageHeader'
import { speakWord } from '../utils/speech'
import type { PDFAnalysis, PDFDocument } from '../types'

type Tab = 'keywords' | 'poly' | 'writing' | 'sentences'
type CategoryFilter = 'all' | 'A' | 'B' | 'C' | 'D'

export function PdfAnalysisPage() {
  const [documents, setDocuments] = useState<PDFDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<PDFDocument | null>(null)
  const [analysis, setAnalysis] = useState<PDFAnalysis | null>(null)
  const [polling, setPolling] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [tab, setTab] = useState<Tab>('keywords')
  const [selectedWord, setSelectedWord] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set())

  const fileInput = useRef<HTMLInputElement>(null)
  const pollTimer = useRef<any>(null)

  const loadDocuments = useCallback(async () => {
    try {
      const res = await api.pdfDocuments()
      setDocuments(res.documents)
    } catch (e: any) {
      setMessage(e.message)
    }
  }, [])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  // 打开文档分析
  const openDocument = useCallback(async (doc: PDFDocument) => {
    setSelectedDoc(doc)
    setAnalysis(null)
    setSelectedWord(null)
    setSelectedWordIds(new Set())
    const latest = doc.analyses?.[0]
    if (latest) {
      try {
        const result = await api.pdfResult(latest.id)
        setAnalysis(result)
        if (result.examWords?.length) {
          setSelectedWord(result.examWords[0].id)
          // 默认全选核心词
          setSelectedWordIds(new Set(result.examWords.map((w: any) => w.id)))
        }
      } catch (e: any) {
        setMessage(e.message)
      }
    }
  }, [])

  // 轮询分析状态
  useEffect(() => {
    if (polling && selectedDoc) {
      pollTimer.current = setInterval(async () => {
        try {
          const res = await api.pdfDocuments()
          const doc = res.documents.find((d: any) => d.id === selectedDoc.id)
          setDocuments(res.documents)
          const latest = doc?.analyses?.[0]
          if (latest) {
            const result = await api.pdfResult(latest.id)
            setAnalysis(result)
            if (result.status === 'done') {
              setPolling(false)
              if (result.examWords?.length) {
                setSelectedWord(result.examWords[0].id)
                setSelectedWordIds(new Set(result.examWords.map((w: any) => w.id)))
              }
            }
          }
        } catch { /* ignore */ }
      }, 3000)
    }
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [polling, selectedDoc])

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('仅支持 PDF 文件')
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const res = await api.uploadPdf(file)
      await api.analyzePdf(res.document.id)
      setPolling(true)
      await loadDocuments()
      setSelectedDoc(res.document)
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('确定要删除此文档及其真题解析结果吗？')) return
    try {
      await api.deletePdfDocument(docId)
      setMessage('✅ 文档已删除')
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null)
        setAnalysis(null)
      }
      await loadDocuments()
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    }
  }

  const handleAddVocabulary = async (onlySelected: boolean = false) => {
    if (!analysis) return
    setAddLoading(true)
    setMessage('')
    try {
      const ids = onlySelected ? Array.from(selectedWordIds) : undefined
      const res = await api.addVocabulary({
        analysisId: analysis.id,
        wordIds: ids
      })
      setMessage(`✅ 已将 ${res.added} 个单词加入「${res.bookName}」，并进入今日复习队列！`)
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    } finally {
      setAddLoading(false)
    }
  }

  const handleExport = (format: 'markdown' | 'anki') => {
    if (!analysis) return
    const token = getToken()
    const url = `/api/pdf/result/${analysis.id}/export?format=${format}`
    if (token) {
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.blob())
        .then(blob => {
          const blobUrl = window.URL.createObjectURL(blob)
          const tempLink = document.createElement('a')
          tempLink.href = blobUrl
          const filename = (selectedDoc?.filename || '真题解析').replace(/\.pdf$/i, '')
          tempLink.download = `${filename}_${format === 'anki' ? 'anki.txt' : '精读笔记.md'}`
          tempLink.click()
          window.URL.revokeObjectURL(blobUrl)
        })
        .catch(err => setMessage(`导出失败: ${err.message}`))
    }
  }

  const filteredWords = (analysis?.examWords || []).filter(w => {
    const matchSearch = !search || w.word.toLowerCase().includes(search.toLowerCase()) || (w.meaning && w.meaning.includes(search))
    const matchCategory = categoryFilter === 'all' || w.category === categoryFilter
    return matchSearch && matchCategory
  })

  const toggleSelectWord = (id: number) => {
    setSelectedWordIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedWordIds.size === filteredWords.length) {
      setSelectedWordIds(new Set())
    } else {
      setSelectedWordIds(new Set(filteredWords.map(w => w.id)))
    }
  }

  const polyWords = analysis?.polyWords || []
  const writing = analysis?.writing || []

  return (
    <div>
      <PageHeader
        eyebrow="考研真题深度解析"
        title="真题 PDF 智能精读系统"
        desc="上传历年考研真题或外刊阅读 PDF，自动识别真题生词、核心词、熟词僻义与高级写作句式。"
        action={
          <button
            onClick={() => fileInput.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-ink-700 text-white text-sm font-medium hover:bg-ink-800 transition-colors shadow-sm"
          >
            + 上传 PDF 真题
          </button>
        }
      />

      <input
        ref={fileInput}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ''
        }}
      />

      {message && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-white border border-ink-100 text-sm flex items-center justify-between shadow-sm">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-ink-400 hover:text-ink-700 text-xs">✕</button>
        </div>
      )}

      {/* 拖拽上传区 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) handleUpload(file)
        }}
        onClick={() => fileInput.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 mb-6 text-center cursor-pointer transition-all ${
          dragOver ? 'border-ink-600 bg-ink-50 shadow-inner' : 'border-ink-200 bg-white hover:border-ink-400'
        }`}
      >
        {uploading ? (
          <div className="text-sm text-ink-600 pulse-soft font-medium">📄 正在解析 PDF 核心考点与词汇…</div>
        ) : (
          <>
            <div className="text-sm font-medium text-ink-700">点击或将考研英语真题 PDF 拖拽至此处</div>
            <div className="text-xs text-ink-400 mt-1">支持 2010-2025 历年英语一/二真题阅读、新题型、翻译与作文材料</div>
          </>
        )}
      </div>

      {/* 三栏工作台 */}
      <div className="grid lg:grid-cols-[250px_1fr_310px] gap-5">
        {/* 左栏：PDF 文档库 */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden lg:self-start lg:sticky lg:top-6">
          <div className="px-4 py-3 border-b border-ink-100 font-semibold text-sm text-ink-900 flex items-center justify-between">
            <span>真题文档库</span>
            <span className="text-xs text-ink-400">{documents.length} 篇</span>
          </div>
          <div className="divide-y divide-ink-50 max-h-[60vh] overflow-y-auto">
            {documents.length === 0 && (
              <div className="p-8 text-center text-xs text-ink-300">暂无文档，请上传</div>
            )}
            {documents.map(doc => (
              <div
                key={doc.id}
                onClick={() => openDocument(doc)}
                className={`group w-full text-left px-4 py-3 cursor-pointer transition-colors flex items-center justify-between ${
                  selectedDoc?.id === doc.id ? 'bg-ink-50 font-medium' : 'hover:bg-ink-50/50'
                }`}
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-accent-coral shrink-0">PDF</span>
                    <span className="text-xs text-ink-800 truncate">{doc.filename}</span>
                  </div>
                  <div className="text-[10px] text-ink-400 mt-0.5 ml-5">
                    {doc.status === 'done'
                      ? `${doc.analyses?.[0]?.total_words || 0} 词 · 解析完毕`
                      : doc.status === 'processing' ? '正在智能解析…' : doc.status === 'failed' ? '解析失败' : '待分析'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteDocument(doc.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-ink-300 hover:text-accent-coral transition-opacity text-xs"
                  title="删除此文档"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 中栏：分析详情与词汇表 */}
        <div className="min-w-0">
          {!selectedDoc ? (
            <EmptyState />
          ) : analysis === null ? (
            <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-16 text-center text-ink-400 text-sm">
              <div className="w-8 h-8 mx-auto rounded-full border-2 border-ink-200 border-t-ink-600 animate-spin mb-3" />
              正在加载真题分析数据…{polling && '（后台解析中）'}
            </div>
          ) : analysis.status === 'done' ? (
            <>
              {/* 概览统计卡片 */}
              <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-5 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="font-display font-bold text-ink-900 text-base truncate max-w-sm">{selectedDoc.filename}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExport('markdown')}
                      className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-xs text-ink-600 hover:bg-ink-50 transition-colors"
                      title="导出 Markdown 精读笔记"
                    >
                      导出笔记 (MD)
                    </button>
                    <button
                      onClick={() => handleExport('anki')}
                      className="px-2.5 py-1.5 rounded-lg border border-ink-200 text-xs text-ink-600 hover:bg-ink-50 transition-colors"
                      title="导出 Anki 卡片"
                    >
                      导出 Anki
                    </button>
                    <button
                      onClick={() => handleAddVocabulary(false)}
                      disabled={addLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-accent-amber text-white text-xs font-medium hover:opacity-95 disabled:opacity-50 transition-opacity"
                    >
                      {addLoading ? '加入中…' : '全部加入背诵'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-ink-500 leading-relaxed mb-4 bg-ink-50/60 p-3 rounded-xl">{analysis.summary}</p>
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-ink-100">
                  <Metric value={analysis.total_words} label="核心重点词汇" />
                  <Metric value={polyWords.length} label="熟词僻义辨析" />
                  <Metric value={writing.length} label="高分写作表达" />
                </div>
              </div>

              {/* Tab 导航 */}
              <div className="flex gap-1.5 bg-white rounded-xl border border-ink-100 p-1.5 mb-4 overflow-x-auto">
                <TabBtn active={tab === 'keywords'} onClick={() => setTab('keywords')}>核心词汇 ({analysis.total_words})</TabBtn>
                <TabBtn active={tab === 'poly'} onClick={() => setTab('poly')}>熟词僻义 ({polyWords.length})</TabBtn>
                <TabBtn active={tab === 'writing'} onClick={() => setTab('writing')}>作文表达 ({writing.length})</TabBtn>
                <TabBtn active={tab === 'sentences'} onClick={() => setTab('sentences')}>真题长难句 ({analysis.sentences?.length || 0})</TabBtn>
              </div>

              {/* Tab 1: 核心词汇 */}
              {tab === 'keywords' && (
                <>
                  {/* 分类筛选与搜索 */}
                  <div className="space-y-2 mb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-1 overflow-x-auto text-xs">
                        {(['all', 'A', 'B', 'C', 'D'] as CategoryFilter[]).map(cat => (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-2.5 py-1 rounded-lg transition-colors ${
                              categoryFilter === cat
                                ? 'bg-ink-700 text-white font-medium'
                                : 'bg-white border border-ink-100 text-ink-500 hover:bg-ink-50'
                            }`}
                          >
                            {cat === 'all' ? '全部' : `${cat} 类`}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-ink-500 hover:text-ink-800 underline"
                        >
                          {selectedWordIds.size === filteredWords.length ? '取消全选' : '全选筛选'}
                        </button>
                        {selectedWordIds.size > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAddVocabulary(true)}
                            disabled={addLoading}
                            className="px-2.5 py-1 rounded-lg bg-ink-700 text-white hover:bg-ink-800 disabled:opacity-50"
                          >
                            加入选中 ({selectedWordIds.size})
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="搜索文档中的单词或中文…"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-ink-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-ink-200"
                    />
                  </div>

                  {/* 词汇列表 */}
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {filteredWords.map(w => (
                      <WordRow
                        key={w.id}
                        word={w}
                        active={selectedWord === w.id}
                        selected={selectedWordIds.has(w.id)}
                        onToggleSelect={() => toggleSelectWord(w.id)}
                        onClick={() => setSelectedWord(w.id)}
                      />
                    ))}
                    {filteredWords.length === 0 && (
                      <div className="text-center text-ink-300 text-sm py-10">无匹配单词</div>
                    )}
                  </div>
                </>
              )}

              {/* Tab 2: 熟词僻义 */}
              {tab === 'poly' && (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                  {polyWords.map(p => (
                    <PolyCard key={p.word} p={p} />
                  ))}
                  {polyWords.length === 0 && <div className="text-center text-ink-300 text-sm py-10">此真题未识别到特殊的熟词僻义</div>}
                </div>
              )}

              {/* Tab 3: 作文表达 */}
              {tab === 'writing' && (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                  {writing.map(w => (
                    <WritingCard key={w.basic_word + w.advanced_expression} w={w} />
                  ))}
                  {writing.length === 0 && <div className="text-center text-ink-300 text-sm py-10">未识别到写作替换词汇</div>}
                </div>
              )}

              {/* Tab 4: 真题原句 */}
              {tab === 'sentences' && (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
                  {(analysis.sentences || []).map(s => (
                    <div key={s.id} className="bg-white rounded-xl border border-ink-100 p-4 hover:border-ink-300 transition-colors">
                      <div className="text-[10px] text-ink-400 mb-1 flex items-center justify-between">
                        <span>{s.position} · 第 {s.page} 页</span>
                      </div>
                      <div className="text-sm text-ink-800 leading-relaxed font-serif">{s.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : analysis.status === 'failed' ? (
            <div className="bg-white rounded-2xl border border-accent-coral/30 shadow-card p-10 text-center">
              <div className="text-accent-coral font-medium mb-2">解析失败</div>
              <div className="text-sm text-ink-400">{analysis.error_message}</div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-16 text-center">
              <div className="w-10 h-10 mx-auto rounded-full border-2 border-ink-200 border-t-ink-600 animate-spin mb-4" />
              <div className="text-ink-600 font-medium text-sm">正在深度分析真题 PDF…</div>
              <div className="text-ink-400 text-xs mt-2">智能分词 → 考频统计 → 熟词僻义识别 → 考研真题年份对照</div>
            </div>
          )}
        </div>

        {/* 右栏：选定词汇详情与原句 */}
        <div className="lg:self-start lg:sticky lg:top-6">
          {analysis?.status === 'done' && (
            <WordDetail
              analysis={analysis}
              selectedWordId={selectedWord}
              onAddSingle={async (w) => {
                try {
                  const res = await api.addVocabulary({ analysisId: analysis.id, wordIds: [w.id] })
                  setMessage(`✅ 单词 "${w.word}" 已加入今日学习队列`)
                } catch (e: any) {
                  setMessage(`❌ ${e.message}`)
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-16 text-center">
      <div className="text-4xl mb-4">❋</div>
      <div className="text-ink-700 font-medium mb-2">请在左侧选择一篇真题 PDF</div>
      <div className="text-ink-300 text-sm">或点击上方上传新的考研真题 / 外刊阅读资料</div>
    </div>
  )
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display text-xl font-bold text-ink-900">{value}</div>
      <div className="text-[11px] text-ink-400 mt-0.5">{label}</div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
        active ? 'bg-ink-700 text-white shadow-sm' : 'text-ink-500 hover:bg-ink-50'
      }`}
    >
      {children}
    </button>
  )
}

function WordRow({
  word,
  active,
  selected,
  onToggleSelect,
  onClick
}: {
  word: any
  active: boolean
  selected: boolean
  onToggleSelect: () => void
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border p-3 transition-all cursor-pointer flex items-center gap-3 ${
        active ? 'border-ink-500 shadow-card ring-1 ring-ink-200' : 'border-ink-100 hover:border-ink-300'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => {
          e.stopPropagation()
          onToggleSelect()
        }}
        onClick={(e) => e.stopPropagation()}
        className="rounded border-ink-300 text-ink-700 focus:ring-0 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-ink-900">{word.word}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                speakWord(word.word)
              }}
              className="text-ink-400 hover:text-ink-700 text-xs"
              title="发音"
            >
              🔊
            </button>
            <span className="text-xs text-ink-300">{word.phonetic}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              word.category === 'A' ? 'bg-rose-50 text-rose-600' :
              word.category === 'B' ? 'bg-amber-50 text-amber-600' :
              word.category === 'C' ? 'bg-purple-50 text-purple-600' : 'bg-ink-50 text-ink-400'
            }`}>
              {word.category}类
            </span>
            <span className="text-[10px] text-accent-amber">{'★'.repeat(word.importance)}</span>
          </div>
        </div>
        <div className="text-xs text-ink-500 mt-1 truncate">{word.meaning}</div>
      </div>
    </div>
  )
}

function PolyCard({ p }: { p: any }) {
  return (
    <div className="bg-white rounded-xl border border-ink-100 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-bold text-ink-900">{p.word}</span>
        <button
          type="button"
          onClick={() => speakWord(p.word)}
          className="text-xs text-ink-400 hover:text-ink-700"
          title="发音"
        >
          🔊
        </button>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/10 text-accent-amber font-semibold">熟词僻义</span>
        {p.source_year && <span className="text-[10px] text-ink-400">真题 {p.source_year}</span>}
      </div>
      <div className="text-xs text-ink-600 mb-1 leading-relaxed">
        常规义：{p.common_meaning} → 考研常考义：<span className="font-bold text-accent-amber underline decoration-accent-amber/40">{p.exam_meaning}</span>
      </div>
      {p.example && <div className="text-xs text-ink-400 italic mt-1 bg-ink-50/50 p-2 rounded">{p.example}</div>}
    </div>
  )
}

function WritingCard({ w }: { w: any }) {
  return (
    <div className="bg-white rounded-xl border border-ink-100 p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-ink-400 line-through">{w.basic_word}</span>
        <span className="text-ink-300">→</span>
        <span className="font-bold text-ink-900 text-sm text-emerald-700">{w.advanced_expression}</span>
        <button
          type="button"
          onClick={() => speakWord(w.advanced_expression)}
          className="text-xs text-ink-400 hover:text-ink-700"
          title="发音"
        >
          🔊
        </button>
        {w.topic && <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-50 text-ink-500 ml-auto">{w.topic}</span>}
      </div>
      <div className="text-xs text-ink-600 mb-1">{w.meaning}</div>
      <div className="text-xs text-ink-400 italic bg-ink-50/50 p-2 rounded">{w.example_sentence}</div>
    </div>
  )
}

function WordDetail({
  analysis,
  selectedWordId,
  onAddSingle
}: {
  analysis: PDFAnalysis
  selectedWordId: number | null
  onAddSingle: (w: any) => void
}) {
  const word = analysis.examWords.find(w => w.id === selectedWordId)
  if (!word) {
    return (
      <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6 text-center text-xs text-ink-300">
        点击左侧词汇卡片查看详细解析
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-ink-100 shadow-card p-6">
      <div className="text-[10px] text-ink-400 tracking-widest uppercase mb-2">词汇全维解析</div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-display text-2xl font-bold text-ink-900">{word.word}</span>
        <button
          type="button"
          onClick={() => speakWord(word.word)}
          className="p-1 text-ink-500 hover:text-ink-900 text-sm"
          title="朗读单词"
        >
          🔊
        </button>
      </div>
      <div className="text-sm text-ink-400 mb-3">{word.phonetic}</div>

      <div className="text-base font-medium text-ink-800 mb-4 bg-ink-50/60 p-3 rounded-xl">{word.meaning}</div>

      <div className="space-y-2.5 text-xs">
        <Detail label="出现频次" value={`${word.frequency} 次`} />
        <Detail label="真题位置" value={word.position || '—'} />
        <Detail label="词汇评级" value={`${word.category} 类 · ${'★'.repeat(word.importance)}`} />
        <Detail label="备考建议" value={word.suggestion || '—'} />
      </div>

      <div className="mt-4 pt-4 border-t border-ink-50">
        <div className="text-[10px] text-ink-400 mb-1.5 font-medium">真题语境原句</div>
        <div className="text-xs text-ink-600 leading-relaxed italic bg-ink-50/50 p-2.5 rounded-lg border border-ink-50">
          "{word.original_sentence || '暂无原句上下文'}"
        </div>
      </div>

      <button
        onClick={() => onAddSingle(word)}
        className="mt-5 w-full py-2.5 rounded-xl bg-ink-700 text-white text-xs font-medium hover:bg-ink-800 transition-colors shadow-sm"
      >
        单独加入今日学习
      </button>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-400 shrink-0">{label}</span>
      <span className="text-ink-800 text-right font-medium">{value}</span>
    </div>
  )
}
