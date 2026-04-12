export interface ParsePDFResult {
  markdown: string
  contentList?: any[]
}

export type ParsePDF = (file: Buffer, filename: string) => Promise<ParsePDFResult>

export { parsePDF } from './mineru'

export type ContentItem = {
  type: string
  text?: string
  text_level?: number   // 1 = section heading (MinerU signal)
  table_body?: string
  page_idx?: number
}

/**
 * Convert a MinerU content_list array into a structured string for the LLM.
 *
 * Items with text_level === 1 or type === 'title' are emitted as ## headings
 * so the LLM can see explicit lesson-boundary markers instead of a flat blob.
 */
export function parseContentList(contentList: ContentItem[]): string {
  const parts: string[] = []
  for (const item of contentList) {
    if (item.type === 'discarded') continue
    if ((item.type === 'text' || item.type === 'title') && item.text) {
      if (item.type === 'title' || item.text_level === 1) {
        parts.push(`## ${item.text}`)
      } else {
        parts.push(item.text)
      }
    } else if (item.type === 'table' && item.table_body) {
      parts.push(item.table_body)
    } else if (item.type === 'image') {
      parts.push(`[IMAGE: page ${item.page_idx ?? '?'}]`)
    }
  }
  return parts.join('\n\n').substring(0, 50000)
}
