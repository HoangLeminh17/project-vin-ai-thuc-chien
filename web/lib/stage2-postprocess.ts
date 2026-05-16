/**
 * Stage 2 post-processing utilities.
 *
 * Normalizes the raw ChapterContent returned by AI adapters:
 * - Attaches KC metadata (kc_id, module_id…) from the Stage 1 lesson outline
 * - Propagates source_chunk_start / source_chunk_end from the lesson
 * - Builds a fallback ConceptCard when the AI omits cards entirely
 */

import type { Chapter, ChapterContent, ConceptCard, LessonContent } from './types'

function buildFallbackCard(
  src: Chapter['lessons'][number] | undefined,
  lessonTitle: string,
): ConceptCard {
  return {
    question: `${src?.title ?? lessonTitle} là gì?`,
    answer:
      src?.outline
        .slice(0, 2)
        .map(point => point.point)
        .join('. ') ?? '',
    followUps: [],
  }
}

function normalizeCard(
  card: ConceptCard,
  src: Chapter['lessons'][number] | undefined,
): ConceptCard {
  const knowledge = src?.knowledge
  return {
    ...card,
    followUps: Array.isArray(card.followUps) ? card.followUps : [],
    kc_id: knowledge?.kc_id,
    kc_name: knowledge?.kc_name,
    module_id: knowledge?.module_id,
    module_name: knowledge?.module_name,
    source_chunk_start: src?.source_chunk_start,
    source_chunk_end: src?.source_chunk_end,
  }
}

function normalizeLessonCards(
  lesson: LessonContent,
  src: Chapter['lessons'][number] | undefined,
): ConceptCard[] {
  const generatedCards =
    Array.isArray(lesson.cards) && lesson.cards.length > 0
      ? lesson.cards
      : lesson.concept
        ? [lesson.concept]
        : [buildFallbackCard(src, lesson.lesson_title)]

  const usableCards = generatedCards.filter(
    card => Boolean(card?.question?.trim() || card?.answer?.trim()),
  )
  return (usableCards.length > 0 ? usableCards : [buildFallbackCard(src, lesson.lesson_title)]).map(
    card => normalizeCard(card, src),
  )
}

/**
 * Takes the raw AI response (ChapterContent) and the original Stage 1 chapter
 * definition, then enriches every lesson with KC metadata and a normalised
 * cards[] array.
 */
export function attachChunkRange(raw: ChapterContent, chapter: Chapter): ChapterContent {
  const lessons = raw.lessons.map((l, i) => {
    const src = chapter.lessons[i]
    const cards = normalizeLessonCards(l, src)
    return {
      ...l,
      concept: cards[0],
      cards,
    }
  })
  return { ...raw, lessons }
}
