// 共享类型定义

export interface User {
  id: number
  username: string
  email: string
}

export interface Word {
  id: number
  word: string
  phonetic?: string
  meaning?: string
  example?: string
  frequency: number
  level?: string
  root?: string
  mnemonic?: string
  exam_years?: string
  category?: string
}

export interface LearningWord {
  word: Word
  status: number
  interval_index: number
  next_review_time: string
  review_count: number
}

export interface VocabularyBook {
  id: number
  name: string
  type: string
  created_time: string
}

export interface PDFDocument {
  id: number
  filename: string
  total_pages: number
  status: string
  upload_time: string
  analyses?: PDFAnalysis[]
}

export interface ExamWord {
  id: number
  word: string
  phonetic?: string
  meaning?: string
  frequency: number
  position?: string
  original_sentence?: string
  importance: number
  category?: string
  suggestion?: string
}

export interface PDFAnalysis {
  id: number
  status: string
  summary?: string
  total_words: number
  error_message?: string
  created_time: string
  document?: PDFDocument
  examWords: ExamWord[]
  sentences: ArticleSentence[]
  polyWords?: WordMeaning[]
  writing?: WritingExpression[]
}

export interface ArticleSentence {
  id: number
  page: number
  text: string
  position?: string
}

export interface WordMeaning {
  word: string
  common_meaning: string
  exam_meaning: string
  example?: string
  source_year?: string
  frequency: number
}

export interface WritingExpression {
  basic_word: string
  advanced_expression: string
  meaning: string
  example_sentence?: string
  topic?: string
}

export interface WordExplanation {
  word: string
  simple_explanation: string
  memory_method: string
  root_analysis: string
  example_sentence: string
  synonyms: string[]
  poly_meaning?: {
    common: string
    exam: string
    example: string
    years: string
  } | null
  exam_years?: string | null
  frequency: number
}

export interface Statistics {
  total_learned: number
  today_reviewed: number
  due_today: number
  mastery_rate: number
  streak_days: number
  heatmap: Record<string, number>
  intervals: { interval_index: number; _count: number }[]
}
