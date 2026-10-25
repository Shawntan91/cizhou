import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { PageHeader } from '../components/ui/PageHeader'
import type { PDFDocument } from '../types'

export function PdfUploadPage() {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [recentDocs, setRecentDocs] = useState<PDFDocument[]>([])
  const fileInput = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    try {
      const res = await api.pdfDocuments()
      setRecentDocs(res.documents)
      // 有解析中的文档则继续轮询
      if (res.documents.some(d => d.status === 'processing')) {
        setProgress(p => Math.max(p, 60))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadDocs()
    const timer = setInterval(loadDocs, 5000)
    return () => clearInterval(timer)
  }, [loadDocs])

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('仅支持 PDF 文件')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setMessage('文件超过 50MB 限制')
      return
    }

    setUploading(true)
    setProgress(15)
    setMessage('')
    try {
      const res = await api.uploadPdf(file)
      setProgress(40)
      // 自动开始分析
      await api.analyzePdf(res.document.id)
      setProgress(70)
      setMessage(`📄 已上传并开始解析：${res.document.filename}`)
      await loadDocs()
      return res.document
    } catch (e: any) {
      setMessage(`❌ ${e.message}`)
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 1500)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <div>
      <PageHeader
        eyebrow="PDF 提取"
        title="上传阅读材料"
        desc="上传 PDF，自动提取生词生成个人词库。支持考研真题、雅思阅读、论文。"
      />

      {/* 上传区域 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-colors mb-6 ${
          dragOver ? 'border-ink-500 bg-ink-50' : 'border-ink-200 bg-white hover:border-ink-300'
        }`}
      >
        <input
          ref={fileInput}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) uploadFile(file)
            e.target.value = ''
          }}
        />
        <div className="w-14 h-14 mx-auto rounded-2xl bg-ink-50 flex items-center justify-center text-2xl text-ink-500 mb-4">⇪</div>
        <div className="font-medium text-ink-800">拖拽 PDF 到此处，或点击选择文件</div>
        <div className="text-xs text-ink-400 mt-2">支持考研英语真题 · 雅思阅读 · 论文 · 最大 50MB</div>
      </div>

      {/* 进度 */}
      {uploading && (
        <div className="bg-white rounded-xl border border-ink-100 p-5 mb-6">
          <div className="flex justify-between text-xs text-ink-500 mb-2">
            <span>上传中…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-ink-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {message && (
        <div className="text-sm mb-6 px-4 py-3 rounded-xl bg-white border border-ink-100">{message}</div>
      )}

      {/* 最近文档 */}
      <div className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">已上传文档</h2>
          <Link to="/pdf-analysis" className="text-xs text-accent-amber hover:underline">去真题解析 →</Link>
        </div>
        {recentDocs.length === 0 ? (
          <div className="p-8 text-center text-ink-300 text-sm">还没有上传文档</div>
        ) : (
          <div className="divide-y divide-ink-50">
            {recentDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="w-9 h-11 rounded bg-accent-coral/10 flex items-center justify-center text-accent-coral text-[10px] font-bold shrink-0">PDF</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-800 truncate">{doc.filename}</div>
                  <div className="text-xs text-ink-400">
                    {new Date(doc.upload_time).toLocaleString('zh-CN')} · {doc.total_pages} 页
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${
                  doc.status === 'done' ? 'bg-ink-50 text-ink-600' :
                  doc.status === 'processing' ? 'bg-accent-amber/10 text-accent-amber pulse-soft' :
                  doc.status === 'failed' ? 'bg-accent-coral/10 text-accent-coral' :
                  'bg-ink-50 text-ink-400'
                }`}>
                  {doc.status === 'done' ? '已分析' : doc.status === 'processing' ? '解析中' : doc.status === 'failed' ? '失败' : '待分析'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
