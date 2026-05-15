import type { KnowledgeComponentRef } from './knowledge'

/**
 * Domain models for Learning content.
 * Located in Core to prevent leakage of Infrastructure/External schemas.
 */

export type OutlinePoint = {
  point: string
  chunks: string[]
}

export type Lesson = {
  title: string
  key_concept: string
  knowledge?: KnowledgeComponentRef
  outline: OutlinePoint[]
  source_chunk_start?: string
  source_chunk_end?: string
}

export function isLegacyOutline(outline: unknown): outline is string[] {
  return Array.isArray(outline) && (outline.length === 0 || typeof outline[0] === 'string')
}

export type Quiz = {
  topic: string
}

export type Chapter = {
  title: string
  lessons: Lesson[]
  quiz: Quiz
}

export type Course = {
  title: string
  chapters: Chapter[]
}

export type ConceptCard = {
  question: string
  answer: string
  detail?: string // legacy; new cards use answer as the single source-backed response
  followUps: string[]
  kc_id?: string
  kc_name?: string
  module_id?: string
  module_name?: string
  source_chunk_start?: string  // attached post-generation from Stage 1 lesson
  source_chunk_end?: string    // attached post-generation from Stage 1 lesson
  // Legacy fields kept for backward-compat with older saved courses
  source_chunk_id?: string
  sourceExcerpt?: string
}

export type QuizQuestion = {
  question: string
  options: string[]
  answer: number
  explanation: string
  kc_id?: string
  kc_name?: string
  module_id?: string
  module_name?: string
  source_chunk_id?: string
}

export type LessonContent = {
  lesson_title: string
  // `concept` is kept as the first-card compatibility surface for older saved courses.
  concept?: ConceptCard
  cards?: ConceptCard[]
}

export type ChapterContent = {
  chapter_title: string
  lessons: LessonContent[]
  quiz: {
    topic: string
    questions: QuizQuestion[]
  }
}

export type CourseContent = {
  chapters: ChapterContent[]
}

export type DiagnosticQuestion = {
  question: string
  options: string[]
  answer: number
  explanation: string
  source_chunk_id?: string
  topic: string
  kc_id?: string
  kc_name?: string
  module_id?: string
  module_name?: string
}

export type DiagnosticQuiz = {
  questions: DiagnosticQuestion[]
}
