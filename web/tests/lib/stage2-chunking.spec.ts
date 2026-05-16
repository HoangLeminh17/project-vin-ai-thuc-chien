import { describe, expect, it } from 'vitest'
import { buildStage2ChapterInput, mergeStage2ChapterOutputs, splitStage2ChapterInput } from '@/lib/stage2-chunking'

describe('stage2 chunking helpers', () => {
  it('splits oversized chapter inputs into lesson batches', () => {
    const input = buildStage2ChapterInput(
      {
        title: 'Chapter 1',
        lessons: [
          { title: 'Lesson 1', key_concept: 'A', outline: [] },
          { title: 'Lesson 2', key_concept: 'B', outline: [] },
          { title: 'Lesson 3', key_concept: 'C', outline: [] },
        ],
        quiz: { topic: 'Topic' },
      },
      ['x'.repeat(20), 'y'.repeat(20), 'z'.repeat(20)],
    )

    const batches = splitStage2ChapterInput(input, 220)

    expect(batches.length).toBeGreaterThan(1)
    expect(batches[0].lessons.length).toBe(1)
    expect(batches[1].lessons.length).toBeGreaterThan(0)
    expect(batches.every(batch => JSON.stringify(batch).length <= 220 || batch.lessons.length === 1)).toBe(true)
  })

  it('keeps a single batch for compact chapter inputs', () => {
    const input = buildStage2ChapterInput({
      title: 'Compact',
      lessons: [{ title: 'Lesson 1', key_concept: 'A', outline: [] }],
      quiz: { topic: 'Topic' },
    })

    expect(splitStage2ChapterInput(input, 1000)).toHaveLength(1)
  })

  it('merges lesson content and deduplicates quiz questions', () => {
    const merged = mergeStage2ChapterOutputs('Chapter 1', 'Topic', [
      {
        chapter_title: 'Chapter 1',
        lessons: [
          {
            lesson_title: 'Lesson 1',
            concept: {
              question: 'Q1?',
              answer: 'A1',
              followUps: [],
            },
            cards: [
              {
                question: 'Q1?',
                answer: 'A1',
                followUps: [],
              },
              {
                question: 'Q1b?',
                answer: 'A1b',
                followUps: [],
              },
            ],
          },
        ],
        quiz: {
          topic: 'Topic',
          questions: [
            {
              question: 'What is A?',
              options: ['A', 'B', 'C', 'D'],
              answer: 0,
              explanation: 'A is correct',
            },
          ],
        },
      },
      {
        chapter_title: 'Chapter 1',
        lessons: [
          {
            lesson_title: 'Lesson 2',
            concept: {
              question: 'Q2?',
              answer: 'A2',
              followUps: [],
            },
          },
        ],
        quiz: {
          topic: 'Topic',
          questions: [
            {
              question: 'What is A?',
              options: ['A', 'B', 'C', 'D'],
              answer: 0,
              explanation: 'A is still correct',
            },
            {
              question: 'What is B?',
              options: ['A', 'B', 'C', 'D'],
              answer: 1,
              explanation: 'B is correct',
            },
          ],
        },
      },
    ])

    expect(merged.chapter_title).toBe('Chapter 1')
    expect(merged.lessons.map(lesson => lesson.lesson_title)).toEqual(['Lesson 1', 'Lesson 2'])
    expect(merged.lessons[0].cards).toHaveLength(2)
    expect(merged.quiz.questions).toHaveLength(2)
    expect(merged.quiz.questions[0].question).toBe('What is A?')
    expect(merged.quiz.questions[1].question).toBe('What is B?')
  })
})
