import { NextRequest, NextResponse } from 'next/server'
import { generateCourse } from '@/lib/ai'

type ContentItem = {
  type: string
  text?: string
  table_body?: string
  page_idx?: number
}

function contentListToString(contentList: ContentItem[]): string {
  const parts: string[] = []
  for (const item of contentList) {
    if (item.type === 'discarded') continue
    if ((item.type === 'text' || item.type === 'title') && item.text) {
      parts.push(item.text)
    } else if (item.type === 'table' && item.table_body) {
      parts.push(item.table_body)
    } else if (item.type === 'image') {
      parts.push(`[IMAGE: page ${item.page_idx ?? '?'}]`)
    }
  }
  return parts.join('\n\n').substring(0, 50000)
}

export async function POST(req: NextRequest) {
  try {
    const { contentList } = await req.json()
    if (!contentList || !Array.isArray(contentList)) {
      return NextResponse.json({ success: false, error: 'Missing contentList' }, { status: 400 })
    }

    const parsedContent = contentListToString(contentList as ContentItem[])
    const { course, tokens } = await generateCourse(parsedContent)
    return NextResponse.json({ success: true, course, tokens })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[generate-course]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
