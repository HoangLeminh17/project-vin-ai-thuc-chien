import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { contentListToMarkdown, type ContentItem } from '../content-list-converter'

function makeText(text: string, text_level?: number): ContentItem {
  return { type: 'text', text, text_level }
}

describe('contentListToMarkdown — classifier', () => {
  it('Roman numeral chapter → --- then ##', () => {
    const out = contentListToMarkdown([makeText('I. INSULIN', 1)])
    expect(out).toBe('---\n\n## I. INSULIN')
  })

  it('numeric lesson (N.) → ###', () => {
    const out = contentListToMarkdown([makeText('1. Nhóm biguanid', 1)])
    expect(out).toBe('### 1. Nhóm biguanid')
  })

  it('numeric sub-lesson (N.N.) → ###', () => {
    const out = contentListToMarkdown([makeText('1.1. Thế hệ:', 1)])
    expect(out).toBe('### 1.1. Thế hệ:')
  })

  it('Roman + digit sub → ###', () => {
    const out = contentListToMarkdown([makeText('I.1 Phân loại', 1)])
    expect(out).toBe('### I.1 Phân loại')
  })

  it('non-pattern text_level=1 → plain text, no marker', () => {
    const out = contentListToMarkdown([makeText('INSULIN REGULAR', 1)])
    expect(out).toBe('INSULIN REGULAR')
    expect(out).not.toContain('##')
    expect(out).not.toContain('###')
  })
})

describe('contentListToMarkdown — dedupe', () => {
  it('second occurrence of same heading text → plain text', () => {
    const items: ContentItem[] = [
      makeText('I. INSULIN', 1),
      makeText('I. INSULIN', 1),
    ]
    const out = contentListToMarkdown(items)
    const lines = out.split('\n\n')
    expect(lines[0]).toBe('---')
    expect(lines[1]).toBe('## I. INSULIN')
    expect(lines[2]).toBe('I. INSULIN')
  })

  it('dedupe also applies to ### headings', () => {
    const items: ContentItem[] = [
      makeText('1. Nhóm glinid', 1),
      makeText('1. Nhóm glinid', 1),
    ]
    const out = contentListToMarkdown(items)
    const lines = out.split('\n\n')
    expect(lines[0]).toBe('### 1. Nhóm glinid')
    expect(lines[1]).toBe('1. Nhóm glinid')
  })
})

describe('contentListToMarkdown — other item types', () => {
  it('image uses img_path directly (no extra images/ prefix)', () => {
    const item: ContentItem = { type: 'image', img_path: 'images/abc.jpg' }
    expect(contentListToMarkdown([item])).toBe('![](images/abc.jpg)')
  })

  it('table uses table_body', () => {
    const item: ContentItem = { type: 'table', table_body: '| A | B |\n|---|---|\n| 1 | 2 |' }
    expect(contentListToMarkdown([item])).toBe('| A | B |\n|---|---|\n| 1 | 2 |')
  })

  it('discarded items are skipped', () => {
    const items: ContentItem[] = [
      { type: 'discarded', text: 'noise' },
      makeText('real content'),
    ]
    expect(contentListToMarkdown(items)).toBe('real content')
  })
})

describe('contentListToMarkdown — ĐTĐ fixture', () => {
  const fixturePath = join(__dirname, 'fixtures', 'dtd_content_list.json')
  const fixture: ContentItem[] = JSON.parse(readFileSync(fixturePath, 'utf-8'))
  const output = contentListToMarkdown(fixture)
  const lines = output.split('\n\n')

  it('produces exactly 8 unique ## chapters', () => {
    const h2Lines = lines.filter(l => l.startsWith('## '))
    expect(h2Lines).toHaveLength(8)
  })

  it('produces exactly 20 unique ### lessons', () => {
    const h3Lines = lines.filter(l => l.startsWith('### '))
    expect(h3Lines).toHaveLength(20)
  })

  it('Glinid is present in output', () => {
    expect(output.toLowerCase()).toContain('glinid')
  })

  it('Amylin chapter is present in output', () => {
    expect(output).toContain('V.')
    expect(output.toLowerCase()).toContain('amylin')
  })

  it('no duplicate ## headings', () => {
    const h2Texts = lines.filter(l => l.startsWith('## ')).map(l => l.slice(3))
    const unique = new Set(h2Texts)
    expect(unique.size).toBe(h2Texts.length)
  })
})
