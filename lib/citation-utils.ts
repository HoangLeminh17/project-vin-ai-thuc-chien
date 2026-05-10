import type { ChapterContent } from './types'

type ContentListItem = { type?: string; page_idx?: number; sourceChunkIndex?: number }

export function buildValidChunkIds(contentList: ContentListItem[]): Set<string> {
  const valid = new Set<string>()
  contentList.forEach((item, index) => {
    if (item.type !== 'discarded') {
      // 3-number format — matches current contentListToMarkdown (sourceChunkIndex ?? 0)
      valid.add(`chunk-${item.sourceChunkIndex ?? 0}-${item.page_idx ?? 0}-${index}`)
      // 2-number format — backward compat with courses generated before PR #84
      if (item.sourceChunkIndex === undefined) {
        valid.add(`chunk-${item.page_idx ?? 0}-${index}`)
      }
    }
  })
  return valid
}

// Matches both legacy 2-number (chunk-P-I) and current 3-number (chunk-S-P-I) formats
const CITATION_MARKER_RE = /\[(chunk-\d+-\d+(?:-\d+)?)\]/g

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
