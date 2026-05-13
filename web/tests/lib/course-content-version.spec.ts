import { describe, expect, it } from 'vitest'
import { chapterHasLegacyDetail, courseContentHasLegacyDetail } from '@/lib/course-content-version'
import type { ChapterContent } from '@/core/models/learning-model'

function makeChapter(detail?: string): ChapterContent {
  return {
    chapter_title: 'Chapter',
    lessons: [
      {
        lesson_title: 'Lesson',
        concept: {
          question: 'Question?',
          answer: 'Canonical answer.',
          ...(detail !== undefined ? { detail } : {}),
          followUps: [],
        },
      },
    ],
    quiz: { topic: 'Topic', questions: [] },
  }
}

describe('course content version guards', () => {
  it('detects cached chapters with legacy detail text', () => {
    expect(chapterHasLegacyDetail(makeChapter('Extra detail.'))).toBe(true)
  })

  it('does not treat missing or blank detail as legacy content', () => {
    expect(chapterHasLegacyDetail(makeChapter())).toBe(false)
    expect(chapterHasLegacyDetail(makeChapter('   '))).toBe(false)
  })

  it('detects legacy detail anywhere in course content', () => {
    expect(courseContentHasLegacyDetail({ chapters: [makeChapter(), makeChapter('Old detail.')] })).toBe(true)
    expect(courseContentHasLegacyDetail({ chapters: [makeChapter()] })).toBe(false)
  })
})
