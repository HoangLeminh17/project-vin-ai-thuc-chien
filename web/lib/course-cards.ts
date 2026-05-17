import type { ConceptCard, CourseContent, LessonContent } from '@/core/models/learning-model'

function isUsableCard(card: ConceptCard | null | undefined): card is ConceptCard {
  return Boolean(card?.question?.trim() || card?.answer?.trim())
}

export function getLessonCards(lesson: LessonContent | null | undefined): ConceptCard[] {
  const cards = Array.isArray(lesson?.cards) ? lesson.cards.filter(isUsableCard) : []
  if (cards.length > 0) return cards
  return isUsableCard(lesson?.concept) ? [lesson.concept] : []
}

export function getPrimaryLessonCard(lesson: LessonContent | null | undefined): ConceptCard | undefined {
  return getLessonCards(lesson)[0]
}

export function countCourseCards(content: CourseContent | null | undefined): number {
  if (!content?.chapters) return 0
  let total = 0
  for (const chapter of content.chapters) {
    for (const lesson of chapter.lessons ?? []) {
      total += getLessonCards(lesson).length
    }
  }
  return total
}
