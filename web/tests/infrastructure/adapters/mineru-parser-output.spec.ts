import JSZip from 'jszip'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MineruParserAdapter } from '@/infrastructure/adapters/mineru-parser.adapter'
import type { ParseResult } from '@/core/ports/parser.port'

// No specialized type needed, we'll cast to any for private access

async function buildZipResponse(files: Record<string, string | Uint8Array>): Promise<Response> {
  const zip = new JSZip()
  for (const [zipPath, content] of Object.entries(files)) {
    zip.file(zipPath, content)
  }

  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new Response(bytes as any, { status: 200 })
}

async function withAdapter<T = any>(run: (adapter: any) => Promise<T>): Promise<T> {
  const outputDir = await mkdtemp(join(tmpdir(), 'mineru-output-'))
  const adapter = new MineruParserAdapter({
    baseUrl: 'https://mineru.example',
    apiKey: 'test',
    outputDir,
  }) as any

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

    const result = await withAdapter<ParseResult>(adapter => (adapter as any).downloadAndSave('https://zip.example/result.zip', 'course.pdf'))

    expect(result.markdown).toContain('Course overview')
    expect(result.contentList).toHaveLength(1)
  })

  it('submits precision tasks with the current MinerU VLM model contract', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: { task_id: 'task-123' },
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await withAdapter(async adapter => {
      const taskId = await (adapter as any).submitExtractTask('https://storage.example/input.pdf')
      expect(taskId).toBe('task-123')
    })

    expect(fetchMock).toHaveBeenCalledWith('https://mineru.example/extract/task', expect.objectContaining({
      method: 'POST',
    }))
    const requestInit = (fetchMock.mock.calls[0] as any[])[1] as RequestInit
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      url: 'https://storage.example/input.pdf',
      model_version: 'vlm',
      enable_formula: true,
      enable_table: true,
      language: 'vi',
    })
    expect(String(requestInit.body)).not.toContain('make_mode')
  })

  it('falls back to full.md when content_list JSON is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildZipResponse({
      'full.md': '# Parsed Course\n\nThis text came from MinerU markdown output.',
    })))

    const result = await withAdapter<ParseResult>(adapter => (adapter as any).downloadAndSave('https://zip.example/result.zip', 'course.pdf'))

    expect(result.markdown).toContain('Parsed Course')
    expect(result.markdown).toContain('MinerU markdown output')
    expect(result.contentList).toEqual([])
  })

  it('prefers content_list_parsed.md over generic markdown fallbacks', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildZipResponse({
      'notes.md': 'Generic notes',
      'nested/content_list_parsed.md': 'Preferred parsed markdown',
    })))

    const result = await withAdapter<ParseResult>(adapter => (adapter as any).downloadAndSave('https://zip.example/result.zip', 'course.pdf'))

    expect(result.markdown).toBe('Preferred parsed markdown')
  })

  it('normalizes page-grouped content_list_v2 into the flat pipeline content list', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildZipResponse({
      'demo_content_list_v2.json': JSON.stringify([
        [
          {
            type: 'title',
            content: { title_content: [{ type: 'text', content: '1 Introduction' }], level: 1 },
            bbox: [83, 121, 917, 156],
          },
          {
            type: 'paragraph',
            content: { paragraph_content: [{ type: 'text', content: 'VLM paragraph' }] },
            bbox: [80, 200, 900, 260],
          },
        ],
        [
          {
            type: 'table',
            content: { table_body: '| A | B |' },
            bbox: [100, 100, 800, 300],
          },
        ],
      ]),
    })))

    const result = await withAdapter<ParseResult>(adapter => (adapter as any).downloadAndSave('https://zip.example/result.zip', 'course.pdf'))

    expect(result.markdown).toContain('1 Introduction')
    expect(result.markdown).toContain('VLM paragraph')
    expect(result.markdown).toContain('| A | B |')
    expect(result.contentList).toMatchObject([
      { type: 'text', text: '1 Introduction', text_level: 1, page_idx: 0 },
      { type: 'text', text: 'VLM paragraph', page_idx: 0 },
      { type: 'table', table_body: '| A | B |', page_idx: 1 },
    ])
  })

  it('normalizes V2 chart items into image type so downstream image rendering works', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildZipResponse({
      'demo_content_list_v2.json': JSON.stringify([
        [
          {
            type: 'chart',
            content: {
              img_path: 'images/chart1.png',
              chart_caption: [{ type: 'text', content: 'Hinh 1: bieu do tuoi' }],
            },
            bbox: [83, 121, 917, 456],
          },
          {
            type: 'image',
            content: {
              img_path: 'images/photo1.png',
              image_caption: [{ type: 'text', content: 'Hinh 2: anh chup' }],
            },
            bbox: [83, 500, 917, 800],
          },
        ],
      ]),
    })))

    const result = await withAdapter<ParseResult>(adapter => (adapter as any).downloadAndSave('https://zip.example/result.zip', 'course.pdf'))

    expect(result.contentList).toMatchObject([
      { type: 'image', sub_type: 'chart', img_path: 'images/chart1.png', page_idx: 0 },
      { type: 'image', img_path: 'images/photo1.png', page_idx: 0 },
    ])
    expect((result.contentList[0] as any).sub_type).toBe('chart')
    expect((result.contentList[1] as any).sub_type).not.toBe('chart')
  })

  it('reports zip entries when no readable markdown or content list exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildZipResponse({
      'layout.json': JSON.stringify({ pages: [] }),
      'images/page-1.png': new Uint8Array([1, 2, 3]),
    })))

    await expect(
      withAdapter<ParseResult>(adapter => (adapter as any).downloadAndSave('https://zip.example/result.zip', 'course.pdf')),
    ).rejects.toThrow('Entries: layout.json, images/page-1.png')
  })
})
