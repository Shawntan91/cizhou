// PDF 文本提取服务
// 引擎优先级：
//   1) pdfjs-dist（纯 JS，Mozilla PDF.js）— 主引擎，无需 Python
//   2) pdf-parse（Node）— 回退
//   3) PyMuPDF（Python）— 回退（需 python3 + pymupdf）
// 无文字层（扫描版）时：调用 Tesseract OCR（需系统安装 tesseract）

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getPythonCommands() {
  if (process.env.PYTHON_BIN) return [process.env.PYTHON_BIN]
  return process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python']
}

async function execPython(scriptPath, args, options = {}) {
  const commands = getPythonCommands()
  let lastErr = null
  for (const cmd of commands) {
    try {
      return await execFileAsync(cmd, [scriptPath, ...args], options)
    } catch (err) {
      lastErr = err
      if (err.code === 'ENOENT') continue
      throw err
    }
  }
  throw lastErr || new Error('未找到 Python 命令，请确认已安装 Python 并已添加至环境变量 PATH')
}

/**
 * 用 pdfjs-dist 提取文本（纯 JS，无需 Python）
 */
async function extractWithPdfjs(filePath) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const buffer = fs.readFileSync(filePath)
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true })
  const pdf = await loadingTask.promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map(item => (item.str || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    pages.push(text)
  }
  const text = pages.join('\n')
  return { pages, text, totalPages: pdf.numPages, hasTextLayer: text.replace(/\s+/g, '').length > 20, method: 'pdfjs' }
}

async function extractWithPdfParse(filePath) {
  const pdfParse = (await import('pdf-parse')).default
  const dataBuffer = fs.readFileSync(filePath)
  const result = await pdfParse(dataBuffer)
  const text = result.text || ''
  const pages = result.text ? [text] : []
  const hasTextLayer = text.replace(/\s+/g, '').length > 20
  return { pages, text, totalPages: result.numpages || pages.length, hasTextLayer, method: 'pdfparse' }
}

async function extractWithPyMuPDF(filePath) {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'pymupdf_extract.py')
  if (!fs.existsSync(scriptPath)) {
    throw new Error('pymupdf_extract.py 不存在')
  }
  const { stdout } = await execPython(scriptPath, [filePath], { timeout: 60000, maxBuffer: 50 * 1024 * 1024 })
  const data = JSON.parse(stdout)
  const text = (data.pages || []).join('\n')
  const hasTextLayer = text.replace(/\s+/g, '').length > 20
  return { pages: data.pages || [], text, totalPages: data.total_pages || (data.pages || []).length, hasTextLayer, method: 'pymupdf' }
}

/**
 * 提取 PDF 文本，返回按页的文本数组
 * @param {string} filePath
 * @returns {Promise<{ pages: string[], text: string, hasTextLayer: boolean, method: string }>}
 */
export async function extractPdfText(filePath) {
  const engines = []
  const engineNames = []
  // pdfjs-dist 是主引擎，始终优先
  engines.push(extractWithPdfjs)
  engineNames.push('pdfjs')

  // 若环境变量指定旧引擎，则其优先
  const override = process.env.PDF_USE_PYMUPDF === '1' ? 'pymupdf' : process.env.PDF_USE_PDFPARSE === '1' ? 'pdfparse' : null
  if (override === 'pymupdf') {
    engines.unshift(extractWithPyMuPDF)
    engineNames.unshift('pymupdf')
  } else if (override === 'pdfparse') {
    engines.unshift(extractWithPdfParse)
    engineNames.unshift('pdfparse')
  } else {
    // 默认顺序：pdfjs → pdf-parse → PyMuPDF
    engines.push(extractWithPdfParse)
    engines.push(extractWithPyMuPDF)
    engineNames.push('pdfparse', 'pymupdf')
  }

  for (let i = 0; i < engines.length; i++) {
    try {
      const result = await engines[i](filePath)
      if (result.hasTextLayer) return result
    } catch (e) {
      console.warn(`[pdf] ${engineNames[i]} 提取失败:`, e.message)
    }
  }

  // 都没有文字层 — 返回空 pages，标记需要 OCR
  return { pages: [], text: '', hasTextLayer: false, method: 'none' }
}

/**
 * 调用 Tesseract OCR 识别扫描版 PDF
 * @param {string} filePath
 * @returns {Promise<{ pages: string[], text: string }>}
 */
export async function ocrPdf(filePath) {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'tesseract_ocr.py')
  if (!fs.existsSync(scriptPath)) {
    throw new Error('tesseract_ocr.py 不存在')
  }
  const { stdout } = await execPython(scriptPath, [filePath], { timeout: 180000, maxBuffer: 50 * 1024 * 1024 })
  const data = JSON.parse(stdout)
  const text = (data.pages || []).join('\n')
  return { pages: data.pages || [], text, totalPages: (data.pages || []).length }
}
