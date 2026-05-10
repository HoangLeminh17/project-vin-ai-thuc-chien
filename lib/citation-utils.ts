import type { ChapterContent } from './types'

type ContentListItem = { type?: string; page_idx?: number; sourceChunkIndex?: number }

export function buildValidChunkIds(contentList: ContentListItem[]): Set<string> {
  const valid = new Set<string>()
  contentList.forEach((item, index) => {
    if (item.type !== 'discarded') {
      valid.add(`chunk-${item.page_idx ?? 0}-${index}`)
    }
  })
  return valid
}

const CITATION_MARKER_RE = /\[(chunk-\d+-\d+)\]/g

export function validateCitationMarkers(
  chapter: ChapterContent,
  validChunkIds: Set<string>,
): void {
  chapter.lessons.forEach(lesson => {
    const fields: Array<string | undefined> = [lesson.concept.answer, lesson.concept.detail]
    fields.forEach(text => {
      if (!text) return
      CITATION_MARKER_RE.lastIndex = 0
      let match
      while ((match = CITATION_MARKER_RE.exec(text)) !== null) {
        if (!validChunkIds.has(match[1])) {
          console.warn(`[citation] Hallucinated marker [${match[1]}] in lesson "${lesson.lesson_title}" — kept in text, rendered disabled`)
        }
      }
    })
  })
}
