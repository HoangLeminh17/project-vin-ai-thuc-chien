import { ConceptCard } from '@/core/models/learning-model'

export interface FlatCard {
  id: string
  ci: number
  chapterTitle: string
  li: number
  lessonTitle: string
  concept: ConceptCard
}

export type SRSRatingIndex = 0 | 1 | 2 | 3

export const RATING_META = [
  { label: 'Again', sub: 'không nhớ', interval: '1 phút',  color: 'var(--sy-again)'  },
  { label: 'Hard',  sub: 'lờ mờ',     interval: '10 phút', color: 'var(--sy-hard)'   },
  { label: 'Good',  sub: 'nhớ rồi',   interval: '1 ngày',  color: 'var(--sy-good)'   },
  { label: 'Easy',  sub: 'quá dễ',    interval: '4 ngày',  color: 'var(--sy-easy)'   },
] as const

export async function submitRating(card: FlatCard, ratingIndex: number) {
  await fetch('/api/progress/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cardId: card.id,
      rating: ratingIndex,
      question: card.concept.question,
      answer: card.concept.answer,
      kcId: card.concept.kc_id,
      moduleId: card.concept.module_id,
      topic: card.concept.kc_id,
    }),
  })
}
