import { describe, expect, it } from 'vitest'

import type { CourseContent } from '@/core/models/learning-model'
import { hasReusableCachedCourseContent } from '@/lib/generation-cache'

function cacheContent(): CourseContent {
  return {
    chapters: [
      {
        chapter_title: 'A',
        lessons: [
          {
            lesson_title: 'L1',
            concept: {
              question: 'Q',
              answer: 'A',
              followUps: [],
            },
            cards: [
              {
                question: 'Q',
                answer: 'A',
                followUps: [],
              },
            ],
          },
        ],
        quiz: { topic: 'A', questions: [] },
      },
    ],
  }
}

describe('hasReusableCachedCourseContent', () => {
  it('accepts a fully reusable cached course result', () => {
    expect(hasReusableCachedCourseContent(true, cacheContent(), false)).toBe(true)
  })

  it('rejects legacy or regenerating cached results', () => {
    expect(hasReusableCachedCourseContent(true, null, false)).toBe(false)
    expect(hasReusableCachedCourseContent(true, cacheContent(), true)).toBe(false)
    expect(hasReusableCachedCourseContent(false, cacheContent(), false)).toBe(false)
  })
})
