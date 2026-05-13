// Stage 1 — Course outline
import type { KnowledgeComponentRef } from '@/core/models/knowledge'

export type OutlinePoint = {
  point: string      // factual statement
  chunks: string[]   // chunk-X-Y IDs from the source that support this point
}

export type Lesson = {
  title: string
  key_concept: string
  knowledge?: KnowledgeComponentRef
  outline: OutlinePoint[]  // structured bullets with source references; Stage 2 reads chunks to emit markers
  source_chunk_start?: string  // chunk-X-Y anchor marking the first item of this lesson in the source
  source_chunk_end?: string    // chunk-X-Y anchor marking the last item of this lesson in the source
}

// Type guard: old courses saved before OutlinePoint had plain string[] outlines
export function isLegacyOutline(outline: unknown): outline is string[] {
  return Array.isArray(outline) && (outline.length === 0 || typeof outline[0] === 'string')
}

export type Quiz = {
  topic: string  // Stage 1 chỉ cần topic, content gen ở Stage 2
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

// Stage 2 — concept card + quiz content
export type ConceptCard = {
  question: string    // active recall question e.g. "X hoạt động như thế nào?"
  answer: string      // canonical answer used for citations and SRS scoring input
  detail?: string     // legacy; no longer generated as a separate answer surface
  followUps: string[] // lightweight AI tutor prompts / follow-up questions
  kc_id?: string
  kc_name?: string
  module_id?: string
  module_name?: string
  source_chunk_start?: string  // attached post-generation from Stage 1 lesson
  source_chunk_end?: string    // attached post-generation from Stage 1 lesson
}

export type QuizQuestion = {
  question: string
  options: string[]   // exactly 4
  answer: number      // index 0-3
  explanation: string
  kc_id?: string
  kc_name?: string
  module_id?: string
  module_name?: string
  source_chunk_id?: string
}

export type LessonContent = {
  lesson_title: string
  concept: ConceptCard
}

export type ChapterContent = {
  chapter_title: string
  lessons: LessonContent[]
  quiz: {
    topic: string
    questions: QuizQuestion[]  // 3-5 questions
  }
}

export type CourseContent = {
  chapters: ChapterContent[]
}

// SRS progress entry — returned by /api/progress/map
export type ProgressEntry = {
  status: string
  isDue: boolean
  lastReviewedAt?: string
}
