import { describe, expect, it } from 'vitest'
import { getStudyDeck, hasStudyDeckCards } from '@/app/components/course/types'

describe('Study deck selection', () => {
  it('uses due cards when reviews are scheduled', () => {
    const dueCards = [{ id: 'due-1' }]
    const allCards = [{ id: 'new-1' }, { id: 'new-2' }]

    expect(getStudyDeck(dueCards, allCards)).toBe(dueCards)
    expect(hasStudyDeckCards(dueCards, allCards)).toBe(true)
  })

  it('falls back to all cards when nothing is due yet', () => {
    const allCards = [{ id: 'new-1' }, { id: 'new-2' }]

    expect(getStudyDeck([], allCards)).toBe(allCards)
    expect(hasStudyDeckCards([], allCards)).toBe(true)
  })

  it('does not start study mode for an empty course', () => {
    expect(getStudyDeck([], [])).toEqual([])
    expect(hasStudyDeckCards([], [])).toBe(false)
  })
})
