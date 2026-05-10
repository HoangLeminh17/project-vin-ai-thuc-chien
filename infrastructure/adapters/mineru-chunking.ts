import { PDFDocument } from 'pdf-lib'
import type { ContentItem } from './content-list-converter'

export interface PdfPageRange {
  startPage: number
  endPage: number
}

export interface MineruChunkResult {
  chunkIndex: number
  pageRange: PdfPageRange
  contentList: ContentItem[]
  markdown: string
  pdfLocalPath?: string
}

export interface AnnotatedContentItem extends ContentItem {
  sourceChunkIndex?: number
}

const DEFAULT_MAX_PAGES_PER_CHUNK = 200
const DEFAULT_OVERLAP_PAGES = 3
const DEFAULT_SIGNATURE_WINDOW = 2000

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function normalizeFileName(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? ''
}

function getItemSignature(item: ContentItem): string | null {
  if (item.type === 'discarded') return null

  if (item.type === 'text') {
    const text = normalizeWhitespace(item.text ?? '')
    if (!text) return null
    return `text|${item.text_level ?? 0}|${text}`
  }

  if (item.type === 'table') {
    const body = normalizeWhitespace(item.table_body ?? item.text ?? '')
    if (!body) return null
    return `table|${body}`
  }

  if (item.type === 'image') {
    const imagePath = normalizeFileName(item.img_path ?? '')
    if (!imagePath) return null
    return `image|${imagePath}`
  }

  const fallback = normalizeWhitespace(JSON.stringify(item))
  return fallback ? `${item.type}|${fallback}` : null
}

export function buildPdfPageRanges(
  pageCount: number,
  maxPagesPerChunk = DEFAULT_MAX_PAGES_PER_CHUNK,
  overlapPages = DEFAULT_OVERLAP_PAGES
): PdfPageRange[] {
  if (pageCount <= 0) return []
  if (maxPagesPerChunk <= 0) {
    throw new Error('maxPagesPerChunk must be greater than 0')
  }
  if (overlapPages < 0) {
    throw new Error('overlapPages must be 0 or greater')
  }
  if (overlapPages >= maxPagesPerChunk) {
    throw new Error('overlapPages must be smaller than maxPagesPerChunk')
  }

  if (pageCount <= maxPagesPerChunk) {
    return [{ startPage: 1, endPage: pageCount }]
  }

  const ranges: PdfPageRange[] = []
  const step = maxPagesPerChunk - overlapPages

  for (let startPage = 1; startPage <= pageCount; startPage += step) {
    const endPage = Math.min(pageCount, startPage + maxPagesPerChunk - 1)
    ranges.push({ startPage, endPage })
    if (endPage === pageCount) break
  }

  return ranges
}

export async function splitPdfBufferByRanges(pdfBuffer: Buffer, ranges: PdfPageRange[]): Promise<Buffer[]> {
  const sourcePdf = await PDFDocument.load(pdfBuffer)
  const chunkBuffers: Buffer[] = []

  for (const range of ranges) {
    const chunkPdf = await PDFDocument.create()
    const pageIndexes = Array.from(
      { length: range.endPage - range.startPage + 1 },
      (_, index) => range.startPage - 1 + index
    )
    const copiedPages = await chunkPdf.copyPages(sourcePdf, pageIndexes)
    copiedPages.forEach((page: any) => chunkPdf.addPage(page))
    const bytes = await chunkPdf.save()
    chunkBuffers.push(Buffer.from(bytes))
  }

  return chunkBuffers
}

export function mergeMineruChunkResults(chunks: MineruChunkResult[]): AnnotatedContentItem[] {
  const merged: AnnotatedContentItem[] = []
  let previousChunkTail = new Set<string>()

  for (const chunk of chunks) {
    const nextTail: string[] = []
    const nextTailCounts = new Map<string, number>()

    for (const item of chunk.contentList) {
      const signature = getItemSignature(item)
      if (signature && previousChunkTail.has(signature)) {
        continue
      }

      merged.push({
        ...item,
        sourceChunkIndex: chunk.chunkIndex,
      })

      if (!signature) continue

      nextTail.push(signature)
      nextTailCounts.set(signature, (nextTailCounts.get(signature) ?? 0) + 1)

      if (nextTail.length > DEFAULT_SIGNATURE_WINDOW) {
        const removed = nextTail.shift()
        if (removed) {
          const currentCount = nextTailCounts.get(removed)
          if (currentCount === 1) {
            nextTailCounts.delete(removed)
          } else if (typeof currentCount === 'number') {
            nextTailCounts.set(removed, currentCount - 1)
          }
        }
      }
    }

    previousChunkTail = new Set(nextTailCounts.keys())
  }

  return merged
}