import { describe, expect, it } from 'vitest'
import { buildPdfPageRanges } from '@/infrastructure/adapters/mineru-chunking'
import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

describe('MineruParserAdapter with real PDFs', () => {
  it('demonstrates how reinforcement_learning.pdf (352 pages) would be split into overlapping chunks', async () => {
    const pdfPath = path.join(process.cwd(), 'doc-for-testing', 'reinforcement_learning.pdf')

    if (!fs.existsSync(pdfPath)) {
      console.warn(`[SKIP] ${pdfPath} not found`)
      return
    }

    const pdfBuffer = fs.readFileSync(pdfPath)
    const pdf = await PDFDocument.load(pdfBuffer)
    const pageCount = pdf.getPageCount()

    console.log(`\n✓ reinforcement_learning.pdf: ${pageCount} pages`)

    if (pageCount > 200) {
      const ranges = buildPdfPageRanges(pageCount)
      console.log(`✓ Auto-split into ${ranges.length} chunks:`)
      ranges.forEach((range, index) => {
        const overlap = index > 0 ? `(${200 - (range.startPage - ranges[index - 1].endPage)} pages overlap)` : ''
        console.log(`  Chunk ${index + 1}: pages ${range.startPage}–${range.endPage} ${overlap}`)
      })

      expect(ranges.length).toBeGreaterThan(1)
      expect(ranges[0].startPage).toBe(1)
      expect(ranges[ranges.length - 1].endPage).toBe(pageCount)
    } else {
      console.log(`✓ Single-shot parse (no split needed)`)
      expect(pageCount).toBeLessThanOrEqual(200)
    }
  })
})
