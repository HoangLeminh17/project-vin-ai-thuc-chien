import type { ChapterContent } from '@/core/models/learning-model'

export function toCompleteChapterList(results: Array<ChapterContent | null>): ChapterContent[] | null {
  return results.every((chapter): chapter is ChapterContent => chapter !== null) ? results : null
}
