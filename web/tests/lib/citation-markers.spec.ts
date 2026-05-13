import { describe, it, expect, vi } from 'vitest'
import { isLegacyOutline } from '@/lib/types'
import { buildValidChunkIds, validateCitationMarkers } from '@/lib/citation-utils'
import { parseCitations } from '@/lib/citations'
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
  it('items without sourceChunkIndex generate both 3-number (default 0) and 2-number IDs', () => {
    const contentList = [
      { type: 'text', page_idx: 0 },
      { type: 'discarded', page_idx: 0 },
      { type: 'table', page_idx: 1 },
    ]
    const ids = buildValidChunkIds(contentList)
    expect(ids.has('chunk-0-0-0')).toBe(true)  // 3-number, sourceChunkIndex defaults to 0
    expect(ids.has('chunk-0-0')).toBe(true)    // 2-number, backward compat
    expect(ids.has('chunk-0-0-1')).toBe(false) // discarded
    expect(ids.has('chunk-0-1-2')).toBe(true)  // 3-number
    expect(ids.has('chunk-1-2')).toBe(true)    // 2-number
  })

  it('builds 3-number IDs only for items with sourceChunkIndex (current format)', () => {
    const contentList = [
      { type: 'text', page_idx: 2, sourceChunkIndex: 0 },
      { type: 'discarded', page_idx: 2, sourceChunkIndex: 0 },
      { type: 'text', page_idx: 5, sourceChunkIndex: 1 },
    ]
    const ids = buildValidChunkIds(contentList)
    expect(ids.has('chunk-0-2-0')).toBe(true)
    expect(ids.has('chunk-0-2-1')).toBe(false) // discarded
    expect(ids.has('chunk-1-5-2')).toBe(true)
    expect(ids.has('chunk-2-0')).toBe(false)   // no 2-number when sourceChunkIndex is set
  })

  it('returns empty set for empty contentList', () => {
    expect(buildValidChunkIds([]).size).toBe(0)
  })
})

// ── parseCitations ─────────────────────────────────────────────────────────────

describe('parseCitations', () => {
  it('parses 3-number chunk IDs into cite segments', () => {
    const valid = new Set(['chunk-0-1-12'])
    const segs = parseCitations('Câu trả lời.[chunk-0-1-12]', valid)
    expect(segs).toHaveLength(2)
    expect(segs[0]).toEqual({ type: 'text', value: 'Câu trả lời.' })
    expect(segs[1]).toMatchObject({ type: 'cite', chunkId: 'chunk-0-1-12', displayNum: 1, valid: true })
  })

  it('parses legacy 2-number chunk IDs (backward compat)', () => {
    const valid = new Set(['chunk-2-5'])
    const segs = parseCitations('Nội dung.[chunk-2-5]', valid)
    expect(segs[1]).toMatchObject({ type: 'cite', chunkId: 'chunk-2-5', valid: true })
  })

  it('numbers are globally continuous when sharedMap is passed across calls', () => {
    const valid = new Set(['chunk-0-0-1', 'chunk-0-0-5', 'chunk-0-1-3'])
    const sharedMap = new Map<string, number>()
    parseCitations('Câu 1.[chunk-0-0-1]', valid, sharedMap)
    const segs2 = parseCitations('Câu 2.[chunk-0-0-5] Câu 3.[chunk-0-1-3]', valid, sharedMap)
    const cite2 = segs2.find(s => s.type === 'cite' && s.chunkId === 'chunk-0-0-5')
    const cite3 = segs2.find(s => s.type === 'cite' && s.chunkId === 'chunk-0-1-3')
    expect(cite2).toMatchObject({ displayNum: 2 })
    expect(cite3).toMatchObject({ displayNum: 3 })
  })

  it('returns only a text segment for text with no markers', () => {
    const segs = parseCitations('Không có trích dẫn nào.', new Set())
    expect(segs).toHaveLength(1)
    expect(segs[0]).toEqual({ type: 'text', value: 'Không có trích dẫn nào.' })
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
  it('does not warn when all markers are valid (legacy 2-number format)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const validIds = new Set(['chunk-0-5', 'chunk-1-8'])
    validateCitationMarkers(
      makeChapter('Statin ức chế HMG-CoA.[chunk-0-5]', 'Chi tiết hơn.[chunk-1-8]'),
      validIds,
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does not warn when all markers are valid (current 3-number format)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const validIds = new Set(['chunk-0-1-12', 'chunk-0-2-5'])
    validateCitationMarkers(
      makeChapter('Giải pháp tự động.[chunk-0-1-12]', 'Chi tiết.[chunk-0-2-5]'),
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

  it('ignores legacy detail markers because answer is the canonical source surface', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const validIds = new Set(['chunk-0-5'])
    validateCitationMarkers(
      makeChapter('Câu hợp lệ.[chunk-0-5]', 'Legacy detail marker.[chunk-99-999]'),
      validIds,
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
