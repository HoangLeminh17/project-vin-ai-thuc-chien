import { describe, expect, it } from 'vitest'
import {
  buildDiagnosticChunks,
  buildDiagnosticChunksFromSavedCourse,
  diagnosticQuestionsCoverChunks,
  diagnosticResultsCoverChunks,
  stripCitationMarkers,
} from '@/lib/diagnostic-chunks'
import type { Course, ChapterContent } from '@/core/models/learning-model'
import type { SavedCourse } from '@/core/models/saved-course'

const course: Course = {
  title: 'Sample Course',
  chapters: [
    {
      title: 'Chapter One',
      quiz: { topic: 'chapter topic' },
      lessons: [
        {
          title: 'Lesson A',
          key_concept: 'Concept A',
          knowledge: {
            kc_id: 'physiology.homeostasis',
            kc_name: 'Homeostasis and feedback',
            module_id: 'physiology',
            module_name: 'Physiology',
            map_version: 'medical-v1',
            confidence: 0.9,
          },
          source_chunk_start: 'chunk-0-1',
          source_chunk_end: 'chunk-0-2',
          outline: [{ point: 'Outline A [chunk-0-1]', chunks: ['chunk-0-1'] }],
        },
        {
          title: 'Lesson B',
          key_concept: 'Concept B',
          knowledge: {
            kc_id: 'pharmacology.pharmacodynamics',
            kc_name: 'Pharmacodynamics',
            module_id: 'pharmacology',
            module_name: 'Pharmacology',
            map_version: 'medical-v1',
            confidence: 0.8,
          },
          source_chunk_start: 'chunk-0-3',
          source_chunk_end: 'chunk-0-4',
          outline: [{ point: 'Outline B', chunks: ['chunk-0-3'] }],
        },
      ],
    },
  ],
}

const chapterContent: ChapterContent = {
  chapter_title: 'Chapter One',
  lessons: [
    {
      lesson_title: 'Lesson A',
      concept: {
        question: 'What is A?',
        answer: 'A is first.[chunk-0-1][chunk-0-2]',
        detail: 'More detail about A.[chunk-0-2]',
        followUps: [],
      },
      cards: [
        {
          question: 'What is A?',
          answer: 'A is first.[chunk-0-1][chunk-0-2]',
          followUps: [],
        },
        {
          question: 'How does A work?',
          answer: 'A works through a source-backed mechanism.[chunk-0-2]',
          followUps: [],
        },
      ],
    },
    {
      lesson_title: 'Lesson B',
      concept: {
        question: 'What is B?',
        answer: 'B is second.',
        followUps: [],
      },
    },
  ],
  quiz: { topic: 'chapter topic', questions: [] },
}

describe('diagnostic chunks', () => {
  it('strips inline citation markers from diagnostic text', () => {
    expect(stripCitationMarkers('Answer.[chunk-0-1] More.[chunk-2-4-8]')).toBe('Answer. More.')
  })

  it('builds one lesson-scoped chunk per lesson', () => {
    const chunks = buildDiagnosticChunks(course.title, course, { 0: chapterContent })

    expect(chunks).toHaveLength(2)
    expect(chunks.map(chunk => chunk.id)).toEqual(['0-0', '0-1'])
    expect(chunks[0].text).toContain('Lesson: Lesson A')
    expect(chunks[0].text).toContain('Knowledge component: Cân bằng nội môi và phản hồi')
    expect(chunks[0].text).toContain('Concept card 1 answer: A is first.')
    expect(chunks[0].text).toContain('Concept card 2 question: How does A work?')
    expect(chunks[0].text).not.toContain('Detail:')
    expect(chunks[0].text).not.toContain('[chunk-0-1]')
    expect(chunks[0]).toMatchObject({
      kc_id: 'physiology.homeostasis',
      kc_name: 'Cân bằng nội môi và phản hồi',
      module_id: 'physiology',
      module_name: 'Sinh lý',
    })
  })

  it('can build chunks directly from a saved course', () => {
    const savedCourse: SavedCourse = {
      id: 'course-1',
      userId: 'user-1',
      title: course.title,
      createdAt: '2026-05-12T00:00:00.000Z',
      course,
      courseContent: { chapters: [chapterContent] },
    }

    expect(buildDiagnosticChunksFromSavedCourse(savedCourse).map(chunk => chunk.id)).toEqual(['0-0', '0-1'])
  })

  it('checks whether cached questions and results cover all lesson chunks', () => {
    const chunks = buildDiagnosticChunks(course.title, course, { 0: chapterContent })

    expect(diagnosticQuestionsCoverChunks([
      { question: 'A?', options: [], answer: 0, explanation: '', topic: 'A', source_chunk_id: '0-0' },
      { question: 'B?', options: [], answer: 0, explanation: '', topic: 'B', source_chunk_id: '0-1' },
    ], chunks)).toBe(true)

    expect(diagnosticQuestionsCoverChunks([
      { question: 'A?', options: [], answer: 0, explanation: '', topic: 'A', source_chunk_id: 'legacy-full' },
    ], chunks)).toBe(false)

    expect(diagnosticResultsCoverChunks({ '0-0': 100, '0-1': 0 }, chunks)).toBe(true)
    expect(diagnosticResultsCoverChunks({ 'legacy-full': 50 }, chunks)).toBe(false)
  })
})
