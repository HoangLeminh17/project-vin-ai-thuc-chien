import { NextRequest, NextResponse } from 'next/server'
import { generateCourse } from '@/lib/ai'
import { parseContentList } from '@/lib/parsers'

export async function POST(req: NextRequest) {
  try {
    const { contentList } = await req.json()
    if (!contentList || !Array.isArray(contentList)) {
      return NextResponse.json({ success: false, error: 'Missing contentList' }, { status: 400 })
    }

    const parsedContent = parseContentList(contentList)
    const { course, tokens } = await generateCourse(parsedContent)
    return NextResponse.json({ success: true, course, tokens })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[generate-course]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
