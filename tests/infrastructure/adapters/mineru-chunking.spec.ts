import { describe, expect, it } from 'vitest'
import { buildPdfPageRanges, mergeMineruChunkResults } from '@/infrastructure/adapters/mineru-chunking'

describe('mineru chunking helpers', () => {
  it('builds overlapping ranges for oversized PDFs', () => {
    expect(buildPdfPageRanges(450, 200, 3)).toEqual([
      { startPage: 1, endPage: 200 },
      { startPage: 198, endPage: 397 },
      { startPage: 395, endPage: 450 },
    ])
  })

  it('keeps a single range when the PDF is within the limit', () => {
    expect(buildPdfPageRanges(120, 200, 3)).toEqual([
      { startPage: 1, endPage: 120 },
    ])
  })

  it('deduplicates overlap content while preserving chunk metadata', () => {
    const merged = mergeMineruChunkResults([
      {
        chunkIndex: 0,
        pageRange: { startPage: 1, endPage: 3 },
        markdown: '',
        contentList: [
          { type: 'text', text: 'Intro', text_level: 1 },
          { type: 'text', text: 'Shared boundary' },
          { type: 'text', text: 'Chunk A only' },
        ],
      },
      {
        chunkIndex: 1,
        pageRange: { startPage: 2, endPage: 4 },
        markdown: '',
        contentList: [
          { type: 'text', text: 'Shared boundary' },
          { type: 'text', text: 'Chunk B only' },
        ],
      },
    ])

    expect(merged.map((item) => item.text)).toEqual([
      'Intro',
      'Shared boundary',
      'Chunk A only',
      'Chunk B only',
    ])
    expect(merged[0].sourceChunkIndex).toBe(0)
    expect(merged[3].sourceChunkIndex).toBe(1)
  })

  it('rejects overlap values that would consume the whole chunk budget', () => {
    expect(() => buildPdfPageRanges(10, 5, 5)).toThrow('overlapPages must be smaller than maxPagesPerChunk')
  })
})