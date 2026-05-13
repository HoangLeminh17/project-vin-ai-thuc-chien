import type { ChapterContent, CourseContent } from '@/core/models/learning-model'

export function chapterHasLegacyDetail(chapter: ChapterContent | null | undefined): boolean {
  return !!chapter?.lessons?.some(lesson => {
    const detail = lesson.concept?.detail
    return typeof detail === 'string' && detail.trim().length > 0
  })
}

export function courseContentHasLegacyDetail(content: CourseContent | null | undefined): boolean {
  return !!content?.chapters?.some(chapterHasLegacyDetail)
}
