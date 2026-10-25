// API 客户端封装

const TOKEN_KEY = 'vocab_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>)
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api${path}`, { ...options, headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(data.error || '请求失败')
  }
  return res.json()
}

export const api = {
  // 认证
  register: (data: { username: string; email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  // 单词
  todayWords: (params?: { bookId?: number; limit?: number }) => {
    const sp = new URLSearchParams()
    if (params?.bookId) sp.set('bookId', String(params.bookId))
    if (params?.limit) sp.set('limit', String(params.limit))
    const query = sp.toString() ? `?${sp.toString()}` : ''
    return request<{ words: any[]; total: number }>(`/words/today${query}`)
  },
  reviewWord: (wordId: number, answer: 1 | 2 | 3) =>
    request<{ record: any }>('/words/review', { method: 'POST', body: JSON.stringify({ wordId, answer }) }),
  explainWord: (word: string) =>
    request<any>('/words/explain', { method: 'POST', body: JSON.stringify({ word }) }),
  searchWords: (params: { q?: string; category?: string; level?: string; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.category) sp.set('category', params.category)
    if (params.level) sp.set('level', params.level)
    if (params.page) sp.set('page', String(params.page))
    if (params.pageSize) sp.set('pageSize', String(params.pageSize))
    return request<{ words: any[]; total: number; page: number; pageSize: number }>(`/words/search?${sp.toString()}`)
  },
  addCustomWord: (data: { word: string; meaning?: string; phonetic?: string; example?: string; bookId?: number }) =>
    request<{ word: any; record: any }>('/words/custom', { method: 'POST', body: JSON.stringify(data) }),
  deleteWordRecord: (wordId: number) =>
    request<{ message: string }>(`/words/${wordId}`, { method: 'DELETE' }),

  // 词书
  getBooks: () => request<{ books: any[] }>('/books'),
  getBookWords: (id: number) => request<{ book: any; words: any[] }>(`/books/${id}/words`),
  createBook: (name: string, type: string = 'custom') =>
    request<{ book: any }>('/books', { method: 'POST', body: JSON.stringify({ name, type }) }),
  deleteBook: (id: number) =>
    request<{ message: string }>(`/books/${id}`, { method: 'DELETE' }),
  removeWordFromBook: (bookId: number, wordId: number) =>
    request<{ message: string }>(`/books/${bookId}/words/${wordId}`, { method: 'DELETE' }),

  // PDF
  uploadPdf: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ document: any }>('/pdf/upload', { method: 'POST', body: form })
  },
  analyzePdf: (documentId: number) =>
    request<{ status: string; documentId: number }>('/pdf/analyze', { method: 'POST', body: JSON.stringify({ documentId }) }),
  pdfResult: (analysisId: number) => request<any>(`/pdf/result/${analysisId}`),
  pdfDocuments: () => request<{ documents: any[] }>('/pdf/documents'),
  deletePdfDocument: (docId: number) =>
    request<{ message: string }>(`/pdf/documents/${docId}`, { method: 'DELETE' }),
  addVocabulary: (data: { analysisId: number; wordIds?: number[]; bookName?: string; category?: string }) =>
    request<{ added: number; bookName: string }>('/pdf/add-vocabulary', { method: 'POST', body: JSON.stringify(data) }),

  // 统计
  statistics: () => request<any>('/statistics')
}
