import { PDFDocument } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'
import { MineruParserAdapter } from '@/infrastructure/adapters/mineru-parser.adapter'

async function createPdfBuffer(pageCount: number): Promise<Buffer> {
  const pdf = await PDFDocument.create()
  for (let index = 0; index < pageCount; index += 1) {
    pdf.addPage([595, 842])
  }
  return Buffer.from(await pdf.save())
}

describe('MineruParserAdapter large PDF handling', () => {
  it('auto-splits a 201-page PDF instead of failing on the MinerU limit', async () => {
    const adapter = new MineruParserAdapter({ baseUrl: 'https://mineru.example', apiKey: 'test' })
    const pdfBuffer = await createPdfBuffer(201)
    const parsedChunks: string[] = []

    ;(adapter as any).downloadPdfBuffer = vi.fn().mockResolvedValue(pdfBuffer)
    ;(adapter as any).uploadTempPdf = vi.fn().mockImplementation(async (_chunkBuffer: Buffer, destPath: string) => ({
      publicUrl: `https://storage.example/${destPath}`,
      filePath: destPath,
    }))
    ;(adapter as any).deleteTempFile = vi.fn().mockResolvedValue(undefined)
    ;(adapter as any).parseSingleDocument = vi.fn().mockImplementation(async (_fileUrl: string, safeName: string) => {
      parsedChunks.push(safeName)
      if (parsedChunks.length === 1) {
        return {
          markdown: 'shared boundary\n\nchunk-a',
          contentList: [
            { type: 'text', text: 'Shared boundary' },
            { type: 'text', text: 'Chunk A' },
          ],
        }
      }

      return {
        markdown: 'shared boundary\n\nchunk-b',
        contentList: [
          { type: 'text', text: 'Shared boundary' },
          { type: 'text', text: 'Chunk B' },
        ],
      }
    })

    const result = await adapter.extractMarkdown('https://storage.example/input.pdf', 'large-course.pdf')

    expect(parsedChunks).toHaveLength(2)
    expect(parsedChunks[0]).toContain('part-01_1-200')
    expect(parsedChunks[1]).toContain('part-02_198-201')
    expect(result.markdown).toContain('Chunk A')
    expect(result.markdown).toContain('Chunk B')
    expect(result.markdown).toContain('Shared boundary')
    expect(result.contentList).toHaveLength(3)
  })
})