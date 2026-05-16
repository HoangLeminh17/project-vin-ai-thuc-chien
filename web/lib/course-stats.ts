import { SavedCourse } from '@/core/models/saved-course'
import { ProgressMap } from '@/lib/hooks/use-progress-map'
import { getLessonCards } from '@/lib/course-cards'

export function courseStats(saved: SavedCourse, map: ProgressMap) {
  const chapters = saved.courseContent?.chapters ?? []
  let total = 0,
    due = 0,
    mature = 0
  chapters.forEach((ch, ci) => {
    ch.lessons.forEach((lesson, li) => {
      const cards = getLessonCards(lesson)
      const hasGeneratedCards = Array.isArray(lesson.cards) && lesson.cards.length > 0
      cards.forEach((_, cardIndex) => {
        total++
        const cardId = hasGeneratedCards ? `${ci}-${li}-${cardIndex}` : `${ci}-${li}`
        const legacyCardId = `${ci}-${li}`
        const e = map[cardId] ?? (cardIndex === 0 ? map[legacyCardId] : undefined)
        if (!e) return
        if (e.isDue) due++
        else if (e.status === 'REVIEW') mature++
      })
    })
  })
  return {
    total,
    due,
    masteryPct: total === 0 ? 0 : Math.round((mature / total) * 100),
  }
}
