import type { ConceptCard, LessonContent } from '@/core/models/learning-model'

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
