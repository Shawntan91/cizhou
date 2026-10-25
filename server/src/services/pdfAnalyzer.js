// PDF 分析编排服务
// pipeline: 提取文本 → (需要OCR则OCR) → 文本分析 → 保存结果

import fs from 'node:fs'
import prisma from '../lib/prisma.js'
import { extractPdfText, ocrPdf } from './pdfService.js'
import { analyzeText } from './textAnalyzer.js'

/**
 * 分析 PDF 文档，结果写入 PDFAnalysis + ExamWord + ArticleSentence
 * @param {number} documentId
 * @returns {Promise<object>} 分析摘要
 */
export async function analyzePdfDocument(documentId) {
  const doc = await prisma.pDFDocument.findUnique({ where: { id: documentId } })
  if (!doc) throw new Error('PDF 文档不存在')

  // 标记处理中
  await prisma.pDFDocument.update({ where: { id: documentId }, data: { status: 'processing' } })

  const analysis = await prisma.pDFAnalysis.create({
    data: { documentId, status: 'running' }
  })

  try {
    // Step 1: 文本提取
    const extracted = await extractPdfText(doc.file_path)
    const { text, hasTextLayer } = extracted
    let actualPages = extracted.totalPages || extracted.pages?.length || 0

    // Step 2: 无文字层 → OCR
    let fullText = text
    let ocrUsed = false
    if (!hasTextLayer) {
      try {
        const ocrResult = await ocrPdf(doc.file_path)
        fullText = ocrResult.text
        if (ocrResult.totalPages) actualPages = ocrResult.totalPages
        ocrUsed = true
      } catch (e) {
        const msg = e.message || ''
        // 区分缺哪个依赖，给出可执行的修复提示
        if (/pymupdf|ImportError|ModuleNotFoundError/.test(msg)) {
          console.warn('[pdf] OCR 需要 PyMuPDF:', e.message)
        } else if (/tesseract|not found|command not found|returned non-zero/.test(msg)) {
          console.warn('[pdf] OCR 需要 Tesseract:', e.message)
        } else {
          console.warn('[pdf] OCR 失败:', e.message)
        }
      }
    }

    if (!fullText.replace(/\s+/g, '')) {
      const isScan = !hasTextLayer
      throw new Error(
        isScan
          ? '未能从 PDF 中提取到文字：此文件是扫描版（无文字层），需要 OCR。请确保已安装 PyMuPDF(pip3 install pymupdf) 和 Tesseract(brew install tesseract)，然后用 diagnose.sh 检查'
          : '未能从 PDF 中提取到文字，请确认文件是正常的文字版 PDF'
      )
    }

    // Step 3: 文本分析
    const result = await analyzeText(fullText)

    // Step 4: 保存结果
    await prisma.$transaction(async tx => {
      for (const w of result.words) {
        await tx.examWord.upsert({
          where: { analysisId_word: { analysisId: analysis.id, word: w.word } },
          create: {
            analysisId: analysis.id,
            word: w.word,
            phonetic: w.phonetic,
            meaning: w.meaning,
            frequency: w.frequency,
            position: w.position,
            original_sentence: w.original_sentence?.slice(0, 500),
            importance: w.importance,
            category: w.category,
            suggestion: w.suggestion
          },
          update: {}
        })
      }

      for (const s of result.sentences) {
        await tx.articleSentence.create({
          data: {
            analysisId: analysis.id,
            page: s.page,
            text: s.text.slice(0, 1000),
            position: s.position
          }
        })
      }
    })

    // 更新状态
    const done = await prisma.pDFAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: 'done',
        total_words: result.words.length,
        summary: `共 ${result.stats.total_sentences} 句，提取 ${result.words.length} 个核心词汇，识别 ${result.poly.length} 个熟词僻义，${result.writing.length} 条作文高级表达${ocrUsed ? '（OCR 识别）' : ''}`
      }
    })

    await prisma.pDFDocument.update({
      where: { id: documentId },
      data: { status: 'done', total_pages: actualPages || estimatePages(doc.file_path) }
    })

    return { analysisId: done.id, summary: done.summary, total_words: done.total_words, ocrUsed }
  } catch (e) {
    await prisma.pDFAnalysis.update({
      where: { id: analysis.id },
      data: { status: 'failed', error_message: e.message }
    })
    await prisma.pDFDocument.update({
      where: { id: documentId },
      data: { status: 'failed' }
    })
    throw e
  }
}

function estimatePages(filePath) {
  // 粗略估算页数（不影响主流程）
  try {
    const buf = fs.readFileSync(filePath)
    const match = buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)
    return match ? match.length : 0
  } catch {
    return 0
  }
}
