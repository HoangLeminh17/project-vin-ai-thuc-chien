import { describe, expect, it } from 'vitest'

import { toCompleteChapterList } from '@/lib/stage2-results'
import type { ChapterContent } from '@/core/models/learning-model'

function chapter(title: string): ChapterContent {
  return {
    chapter_title: title,
    lessons: [],
    quiz: { topic: title, questions: [] },
  }
}

describe('toCompleteChapterList', () => {
  it('returns chapters unchanged when every result is present', () => {
    const chapters = [chapter('A'), chapter('B')]

    expect(toCompleteChapterList(chapters)).toBe(chapters)
  })

  it('returns null instead of compressing failed chapter indexes', () => {
    const chapters = [chapter('A'), null, chapter('C')]

    expect(toCompleteChapterList(chapters)).toBeNull()
  })
})
