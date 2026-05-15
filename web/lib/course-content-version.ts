import type { ChapterContent, CourseContent } from '@/core/models/learning-model'
import { getLessonCards } from '@/lib/course-cards'

export function chapterHasLegacyDetail(chapter: ChapterContent | null | undefined): boolean {
  return !!chapter?.lessons?.some(lesson => {
    return getLessonCards(lesson).some(card => (
      typeof card.detail === 'string' && card.detail.trim().length > 0
    ))
  })
}

export function courseContentHasLegacyDetail(content: CourseContent | null | undefined): boolean {
  return !!content?.chapters?.some(chapterHasLegacyDetail)
}

export function chapterNeedsCardRegeneration(chapter: ChapterContent | null | undefined): boolean {
  if (!chapter) return true
  return chapterHasLegacyDetail(chapter) || !!chapter.lessons?.some(lesson => (
    !Array.isArray(lesson.cards) || lesson.cards.length === 0
  ))
}

export function courseContentNeedsCardRegeneration(content: CourseContent | null | undefined): boolean {
  return !content?.chapters?.length || content.chapters.some(chapterNeedsCardRegeneration)
}
