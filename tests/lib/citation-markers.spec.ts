import { describe, it, expect, vi } from 'vitest'
import { isLegacyOutline } from '@/lib/types'
import { buildValidChunkIds, validateCitationMarkers } from '@/lib/citation-utils'
import type { ChapterContent } from '@/lib/types'

// ── isLegacyOutline ────────────────────────────────────────────────────────────

describe('isLegacyOutline', () => {
  it('returns true for string array', () => {
    expect(isLegacyOutline(['point A', 'point B'])).toBe(true)
  })

  it('returns true for empty array (ambiguous — treated as legacy)', () => {
    expect(isLegacyOutline([])).toBe(true)
  })

  it('returns false for OutlinePoint array', () => {
    expect(isLegacyOutline([{ point: 'A', chunks: ['chunk-0-1'] }])).toBe(false)
  })

  it('returns false for non-array', () => {
    expect(isLegacyOutline(null)).toBe(false)
    expect(isLegacyOutline('string')).toBe(false)
  })
})

// ── buildValidChunkIds ─────────────────────────────────────────────────────────

describe('buildValidChunkIds', () => {
  it('builds IDs for non-discarded items using flat index', () => {
    const contentList = [
      { type: 'text', page_idx: 0 },
      { type: 'discarded', page_idx: 0 },
      { type: 'table', page_idx: 1 },
    ]
    const ids = buildValidChunkIds(contentList)
    expect(ids.has('chunk-0-0')).toBe(true)
    expect(ids.has('chunk-0-1')).toBe(false) // discarded
    expect(ids.has('chunk-1-2')).toBe(true)
  })

  it('returns empty set for empty contentList', () => {
    expect(buildValidChunkIds([]).size).toBe(0)
  })
})

// ── validateCitationMarkers ────────────────────────────────────────────────────

function makeChapter(answer: string, detail?: string): ChapterContent {
  return {
    chapter_title: 'Test',
    lessons: [{
      lesson_title: 'Lesson 1',
      concept: { question: 'Q?', answer, detail, followUps: [] },
    }],
    quiz: { topic: 'T', questions: [] },
  }
}

describe('validateCitationMarkers', () => {
  it('does not warn when all markers are valid', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const validIds = new Set(['chunk-0-5', 'chunk-1-8'])
    validateCitationMarkers(
      makeChapter('Statin ức chế HMG-CoA.[chunk-0-5]', 'Chi tiết hơn.[chunk-1-8]'),
      validIds,
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('warns for hallucinated marker and does not throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const validIds = new Set(['chunk-0-5'])
    validateCitationMarkers(
      makeChapter('Câu này có marker bịa.[chunk-99-999]'),
      validIds,
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[chunk-99-999]'),
    )
    warn.mockRestore()
  })

  it('warns only for invalid markers when mix of valid and invalid', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const validIds = new Set(['chunk-0-5'])
    validateCitationMarkers(
      makeChapter('Câu hợp lệ.[chunk-0-5] Câu bịa.[chunk-99-999]'),
      validIds,
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[chunk-99-999]'))
    warn.mockRestore()
  })
})
