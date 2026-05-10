export type ContentItem = {
  type: string
  text?: string
  text_level?: number
  img_path?: string
  table_body?: string
  page_idx?: number
  sourceChunkIndex?: number
}

const ROMAN = String.raw`^(I{1,3}|IV|V|VI{0,3}|IX|X)\.`
const CHAPTER_RE = new RegExp(ROMAN + String.raw`\s+\S`)
const ROMAN_LESSON_RE = new RegExp(ROMAN + String.raw`\d+\.?\s+\S`)
const NUMERIC_RE = /^\d+\.(\d+\.)?\s+\S/

function classifyHeading(text: string): '##' | '###' | null {
  if (CHAPTER_RE.test(text)) return '##'
  if (ROMAN_LESSON_RE.test(text)) return '###'
  if (NUMERIC_RE.test(text)) return '###'
  return null
}

export function contentListToMarkdown(items: ContentItem[]): string {
  const seen = new Set<string>()
  const parts: string[] = []

  items.forEach((item, index) => {
    if (item.type === 'discarded') return

    const chunkId = item.sourceChunkIndex ?? 0
    const anchor = `<a id="chunk-${chunkId}-${item.page_idx ?? 0}-${index}"></a>`

    if (item.type === 'text') {
      const text = (item.text ?? '').trim()
      if (!text) return

      if (item.text_level === 1) {
        const marker = classifyHeading(text)
        if (marker && !seen.has(text)) {
          seen.add(text)
          if (marker === '##') parts.push('---')
          parts.push(`${anchor}\n${marker} ${text}`)
        } else {
          parts.push(`${anchor}\n${text}`)
        }
      } else {
        parts.push(`${anchor}\n${text}`)
      }
    } else if (item.type === 'image') {
      parts.push(`${anchor}\n![](${item.img_path ?? ''})`)
    } else if (item.type === 'table') {
      const content = (item.table_body ?? item.text ?? '').trim()
      if (content) parts.push(`${anchor}\n${content}`)
    }
  })

  return parts.join('\n\n')
}
