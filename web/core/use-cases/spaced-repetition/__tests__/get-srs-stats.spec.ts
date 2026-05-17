import { describe, it, expect } from 'vitest'
import { GetSRSStatsUseCase } from '../get-srs-stats.usecase'
import type { IProgressRepository, ProgressRepoStats } from '@/core/ports/progress-repository.port'
import type { ICourseRepository } from '@/core/ports/course-repository.port'
import type { SavedCourse } from '@/core/models/saved-course'

function makeProgressRepo(stats: ProgressRepoStats): IProgressRepository {
  return {
    getStats: async () => stats,
    getByCardId: async () => null,
    save: async () => {},
    getDueCards: async () => [],
    getAllForUser: async () => [],
  }
}

function makeCourse(id: string, total: number): SavedCourse {
  return {
    id,
    userId: 'u1',
    title: `Course ${id}`,
    createdAt: new Date().toISOString(),
    course: { title: `Course ${id}`, chapters: [] },
    courseContent: null,
    totalCardCount: total,
  }
}

function makeCourseRepo(courses: SavedCourse[]): ICourseRepository {
  return {
    save: async () => courses[0],
    update: async () => {},
    updatePdfUrl: async () => {},
    updateLayoutUrl: async () => {},
    listByUser: async () => courses,
    getById: async (id) => courses.find(c => c.id === id)!,
    delete: async () => {},
    findByHash: async () => null,
    findByTitle: async () => null,
    saveCourse: async () => {},
    getCourse: async () => null,
    saveChapter: async () => {},
    getChapter: async () => null,
    getFullCachedCourse: async () => null,
  }
}

describe('GetSRSStatsUseCase', () => {
  it('sums totalCardCount across courses and derives NEW = total - reviewed', async () => {
    const progress = makeProgressRepo({ learning: 2, due: 4, reviewed: 27, streak: 3 })
    const courses = makeCourseRepo([makeCourse('a', 50), makeCourse('b', 80), makeCourse('c', 10)])
    const uc = new GetSRSStatsUseCase(progress, courses)

    const stats = await uc.execute('u1')

    expect(stats.totalCards).toBe(140)
    expect(stats.new).toBe(113)
    expect(stats.learning).toBe(2)
    expect(stats.due).toBe(4)
    expect(stats.streak).toBe(3)
  })

  it('NEW clamps to zero when reviewed exceeds total (legacy/stale docs)', async () => {
    const progress = makeProgressRepo({ learning: 0, due: 0, reviewed: 999, streak: 0 })
    const courses = makeCourseRepo([makeCourse('a', 10)])
    const uc = new GetSRSStatsUseCase(progress, courses)

    const stats = await uc.execute('u1')

    expect(stats.totalCards).toBe(10)
    expect(stats.new).toBe(0)
  })

  it('with courseId, only that deck contributes to totalCards', async () => {
    const progress = makeProgressRepo({ learning: 0, due: 0, reviewed: 5, streak: 0 })
    const courses = makeCourseRepo([makeCourse('a', 50), makeCourse('b', 80)])
    const uc = new GetSRSStatsUseCase(progress, courses)

    const stats = await uc.execute('u1', 'b')

    expect(stats.totalCards).toBe(80)
    expect(stats.new).toBe(75)
  })
})
