import { describe, it, expect } from 'vitest'
import { countCourseCards } from '../course-cards'
import type { ConceptCard, CourseContent } from '@/core/models/learning-model'

function makeCard(question = 'Q', answer = 'A'): ConceptCard {
  return { question, answer, followUps: [] }
}

describe('countCourseCards', () => {
  it('returns 0 for null or empty content', () => {
    expect(countCourseCards(null)).toBe(0)
    expect(countCourseCards(undefined)).toBe(0)
    expect(countCourseCards({ chapters: [] })).toBe(0)
  })

  it('sums multi-card lessons across a single chapter', () => {
    const content: CourseContent = {
      chapters: [
        {
          chapter_title: 'Ch 1',
          lessons: [
            { lesson_title: 'L1', cards: [makeCard(), makeCard(), makeCard()] },
            { lesson_title: 'L2', cards: [makeCard()] },
          ],
          quiz: { topic: 't', questions: [] },
        },
      ],
    }
    expect(countCourseCards(content)).toBe(4)
  })

  it('sums across multiple chapters and falls back to legacy single concept', () => {
    const content: CourseContent = {
      chapters: [
        {
          chapter_title: 'Ch 1',
          lessons: [
            { lesson_title: 'L1', cards: [makeCard(), makeCard()] },
            { lesson_title: 'L2', concept: makeCard() }, // legacy shape
          ],
          quiz: { topic: 't', questions: [] },
        },
        {
          chapter_title: 'Ch 2',
          lessons: [
            { lesson_title: 'L3', cards: [makeCard()] },
            { lesson_title: 'L4', cards: [] }, // skipped — no usable cards
          ],
          quiz: { topic: 't', questions: [] },
        },
      ],
    }
    expect(countCourseCards(content)).toBe(4)
  })
})
