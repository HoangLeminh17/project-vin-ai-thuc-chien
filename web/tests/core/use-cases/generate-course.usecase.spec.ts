import { describe, it, expect, vi, afterEach } from 'vitest'
import { GenerateCourseUseCase } from '@/core/use-cases/generate-course.usecase'

describe('GenerateCourseUseCase', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls the AI service once for small markdown inputs', async () => {
    const mockCourse = {
      title: 'Small course',
      chapters: [
        {
          title: 'Chapter 1',
          lessons: [
            {
              title: 'Lesson 1',
              key_concept: 'Key idea',
              outline: [],
            },
          ],
          quiz: { topic: 'Topic 1' },
        },
      ],
    }

    const aiService = {
      generateCourse: vi.fn().mockResolvedValue({ course: mockCourse, tokens: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } }),
    }
    const usageRepo = {
      saveTokenUsage: vi.fn().mockResolvedValue(undefined),
    }

    const useCase = new GenerateCourseUseCase(aiService as any, usageRepo as any)
    const result = await useCase.execute('short markdown')

    expect(aiService.generateCourse).toHaveBeenCalledTimes(1)
    expect(result.course).toEqual(mockCourse)
    expect(usageRepo.saveTokenUsage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'course_generation',
      totalTokens: 15,
    }))
  })

  it('splits large markdown and merges chunked outlines', async () => {
    const aiService = {
      generateCourse: vi
        .fn()
        .mockResolvedValueOnce({
          course: {
            title: 'Merged course',
            chapters: [
              {
                title: 'Chapter A',
                lessons: [
                  {
                    title: 'Lesson Alpha',
                    key_concept: 'Alpha concept',
                    outline: [],
                  },
                ],
                quiz: { topic: 'Alpha topic' },
              },
            ],
          },
          tokens: { promptTokens: 8, completionTokens: 4, totalTokens: 12 },
        })
        .mockResolvedValueOnce({
          course: {
            title: 'Merged course',
            chapters: [
              {
                title: 'Chapter A',
                lessons: [
                  {
                    title: 'Lesson Alpha',
                    key_concept: 'Duplicate lesson',
                    outline: [],
                  },
                  {
                    title: 'Lesson Beta',
                    key_concept: 'Beta concept',
                    outline: [],
                  },
                ],
                quiz: { topic: 'Alpha topic' },
              },
            ],
          },
          tokens: { promptTokens: 9, completionTokens: 3, totalTokens: 12 },
        }),
    }
    const usageRepo = {
      saveTokenUsage: vi.fn().mockResolvedValue(undefined),
    }

    const useCase = new GenerateCourseUseCase(aiService as any, usageRepo as any, 10)
    const markdown = 'x'.repeat(80)
    const result = await useCase.execute(markdown)

    expect(aiService.generateCourse).toHaveBeenCalledTimes(2)
    expect(result.course.title).toBe('Merged course')
    expect(result.course.chapters).toHaveLength(1)
    expect(result.course.chapters[0].lessons).toHaveLength(2)
    expect(result.course.chapters[0].lessons.map(lesson => lesson.title)).toEqual(['Lesson Alpha', 'Lesson Beta'])
    expect(result.tokens).toEqual({ promptTokens: 17, completionTokens: 7, totalTokens: 24 })
    expect(usageRepo.saveTokenUsage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'course_generation',
      totalTokens: 24,
    }))
  })

  it('rejects empty markdown input', async () => {
    const aiService = {
      generateCourse: vi.fn(),
    }

    const useCase = new GenerateCourseUseCase(aiService as any)

    await expect(useCase.execute('')).rejects.toThrow('Missing or invalid markdown')
    expect(aiService.generateCourse).not.toHaveBeenCalled()
  })
})
