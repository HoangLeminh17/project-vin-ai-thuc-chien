import type { ContentChunk } from '@/core/ports/ai.port'
import type { ChapterContent, Course, CourseContent, DiagnosticQuestion } from '@/core/models/learning-model'
import type { SavedCourse } from '@/core/models/saved-course'
import { normalizeKnowledgeRef } from '@/core/models/knowledge'

const CITATION_MARKER_RE = /\[chunk-[^\]\s]+\]/g
const WHITESPACE_RE = /[ \t]{2,}/g
// Keep each chunk small enough to avoid bloated prompts for large courses.
// Title + key_concept + first outline bullets fit comfortably within this limit.
const CHUNK_TEXT_MAX_LEN = 400

export function stripCitationMarkers(text: string | undefined): string {
  if (!text) return ''

  return text
    .replace(CITATION_MARKER_RE, '')
    .replace(WHITESPACE_RE, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

export function courseContentToMap(content: CourseContent | null | undefined): Record<number, ChapterContent> {
  const map: Record<number, ChapterContent> = {}
  content?.chapters?.forEach((chapter, index) => {
    if (chapter) map[index] = chapter
  })
  return map
}

export function buildDiagnosticChunks(
  title: string,
  course: Course,
  contentMap: Record<number, ChapterContent> = {},
): ContentChunk[] {
  const chunks: ContentChunk[] = []

  course.chapters.forEach((chapter, ci) => {
    const chapterContent = contentMap[ci]

    chapter.lessons.forEach((lesson, li) => {
      const lessonContent = chapterContent?.lessons?.[li]
      const concept = lessonContent?.concept
      const normalizedKnowledge = normalizeKnowledgeRef(lesson.knowledge)
      const kc_id = concept?.kc_id ?? normalizedKnowledge.kc_id
      const kc_name = concept?.kc_name ?? normalizedKnowledge.kc_name
      const module_id = concept?.module_id ?? normalizedKnowledge.module_id
      const module_name = concept?.module_name ?? normalizedKnowledge.module_name
      const outlinePoints = lesson.outline
        ?.map(point => stripCitationMarkers(point.point))
        .filter(Boolean)
        .map(point => `- ${point}`)
        .join('\n')

      const parts = [
        `Course: ${title}`,
        `Chapter: ${chapter.title}`,
        `Lesson: ${lesson.title}`,
        `Key concept: ${lesson.key_concept}`,
        `Knowledge component: ${kc_name}`,
        `Medical module: ${module_name}`,
        outlinePoints ? `Outline:\n${outlinePoints}` : '',
        concept?.question ? `Concept question: ${stripCitationMarkers(concept.question)}` : '',
        concept?.answer ? `Concept answer: ${stripCitationMarkers(concept.answer)}` : '',
        concept?.detail ? `Detail: ${stripCitationMarkers(concept.detail)}` : '',
      ].filter(Boolean)

      chunks.push({
        id: `${ci}-${li}`,
        text: parts.join('\n').slice(0, CHUNK_TEXT_MAX_LEN),
        kc_id,
        kc_name,
        module_id,
        module_name,
      })
    })
  })

  return chunks.filter(chunk => chunk.text.trim().length > 0)
}

export function buildDiagnosticChunksFromSavedCourse(course: SavedCourse): ContentChunk[] {
  return buildDiagnosticChunks(course.title, course.course, courseContentToMap(course.courseContent))
}

export function diagnosticQuestionsCoverChunks(questions: unknown, chunks: ContentChunk[]): questions is DiagnosticQuestion[] {
  if (!Array.isArray(questions) || questions.length === 0 || chunks.length === 0) return false

  const expectedIds = new Set(chunks.map(chunk => chunk.id))
  const coveredIds = new Set<string>()

  questions.forEach(question => {
    const sourceId = (question as Partial<DiagnosticQuestion>)?.source_chunk_id
    if (sourceId && expectedIds.has(sourceId)) coveredIds.add(sourceId)
  })

  return coveredIds.size === expectedIds.size
}

// Returns true when questions is a non-empty array — accepts partial coverage for large courses
// where the AI may not reliably generate exactly one question per chunk.
export function diagnosticQuestionsAreValid(questions: unknown): questions is DiagnosticQuestion[] {
  return Array.isArray(questions) && questions.length > 0
}

export function diagnosticResultsCoverChunks(results: unknown, chunks: ContentChunk[]): results is Record<string, number> {
  if (!results || typeof results !== 'object' || chunks.length === 0) return false

  const resultMap = results as Record<string, unknown>
  return chunks.every(chunk => typeof resultMap[chunk.id] === 'number')
}

// Returns true when at least one result key matches a current chunk — keeps partial
// diagnostic results rather than clearing them when a course has many lessons.
export function diagnosticResultsAreRelevant(results: unknown, chunks: ContentChunk[]): results is Record<string, number> {
  if (!results || typeof results !== 'object' || chunks.length === 0) return false
  const validIds = new Set(chunks.map(c => c.id))
  const resultMap = results as Record<string, unknown>
  return Object.keys(resultMap).some(k => validIds.has(k) && typeof resultMap[k] === 'number')
}
