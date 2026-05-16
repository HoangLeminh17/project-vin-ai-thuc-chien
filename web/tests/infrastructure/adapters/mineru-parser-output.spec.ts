import JSZip from 'jszip'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MineruParserAdapter } from '@/infrastructure/adapters/mineru-parser.adapter'
import type { ParseResult } from '@/core/ports/parser.port'

type TestableMineruParser = MineruParserAdapter & {
  downloadAndSave(zipUrl: string, safeName: string): Promise<ParseResult>
}

async function buildZipResponse(files: Record<string, string | Uint8Array>): Promise<Response> {
  const zip = new JSZip()
  for (const [zipPath, content] of Object.entries(files)) {
    zip.file(zipPath, content)
  }

  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new Response(bytes, { status: 200 })
}

async function withAdapter<T>(run: (adapter: TestableMineruParser) => Promise<T>): Promise<T> {
  const outputDir = await mkdtemp(join(tmpdir(), 'mineru-output-'))
  const adapter = new MineruParserAdapter({
    baseUrl: 'https://mineru.example',
    apiKey: 'test',
    outputDir,
  }) as TestableMineruParser

  try {
    return await run(adapter)
  } finally {
    await rm(outputDir, { recursive: true, force: true })
  }
}

describe('MineruParserAdapter output zip extraction', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('extracts markdown from structured content_list JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildZipResponse({
      'content_list.json': JSON.stringify([
        { type: 'text', text: 'I. Course overview', page_idx: 0 },
      ]),
    })))

    const result = await withAdapter(adapter => adapter.downloadAndSave('https://zip.example/result.zip', 'course.pdf'))

    expect(result.markdown).toContain('Course overview')
    expect(result.contentList).toHaveLength(1)
  })

  it('falls back to full.md when content_list JSON is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildZipResponse({
      'full.md': '# Parsed Course\n\nThis text came from MinerU markdown output.',
    })))

    const result = await withAdapter(adapter => adapter.downloadAndSave('https://zip.example/result.zip', 'course.pdf'))

    expect(result.markdown).toContain('Parsed Course')
    expect(result.markdown).toContain('MinerU markdown output')
    expect(result.contentList).toEqual([])
  })

  it('prefers content_list_parsed.md over generic markdown fallbacks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildZipResponse({
      'notes.md': 'Generic notes',
      'nested/content_list_parsed.md': 'Preferred parsed markdown',
    })))

    const result = await withAdapter(adapter => adapter.downloadAndSave('https://zip.example/result.zip', 'course.pdf'))

    expect(result.markdown).toBe('Preferred parsed markdown')
  })

  it('reports zip entries when no readable markdown or content list exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildZipResponse({
      'layout.json': JSON.stringify({ pages: [] }),
      'images/page-1.png': new Uint8Array([1, 2, 3]),
    })))

    await expect(
      withAdapter(adapter => adapter.downloadAndSave('https://zip.example/result.zip', 'course.pdf')),
    ).rejects.toThrow('Entries: layout.json, images/page-1.png')
  })
})
