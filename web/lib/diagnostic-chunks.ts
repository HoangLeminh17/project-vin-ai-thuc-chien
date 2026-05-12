import type { ContentChunk } from '@/core/ports/ai.port'
import type { ChapterContent, Course, CourseContent, DiagnosticQuestion } from '@/core/models/learning-model'
import type { SavedCourse } from '@/core/models/saved-course'

const CITATION_MARKER_RE = /\[chunk-[^\]\s]+\]/g
const WHITESPACE_RE = /[ \t]{2,}/g

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
        outlinePoints ? `Outline:\n${outlinePoints}` : '',
        concept?.question ? `Concept question: ${stripCitationMarkers(concept.question)}` : '',
        concept?.answer ? `Concept answer: ${stripCitationMarkers(concept.answer)}` : '',
        concept?.detail ? `Detail: ${stripCitationMarkers(concept.detail)}` : '',
      ].filter(Boolean)

      chunks.push({
        id: `${ci}-${li}`,
        text: parts.join('\n'),
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

export function diagnosticResultsCoverChunks(results: unknown, chunks: ContentChunk[]): results is Record<string, number> {
  if (!results || typeof results !== 'object' || chunks.length === 0) return false

  const resultMap = results as Record<string, unknown>
  return chunks.every(chunk => typeof resultMap[chunk.id] === 'number')
}
