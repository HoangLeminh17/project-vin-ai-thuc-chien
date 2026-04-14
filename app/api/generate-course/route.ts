import { NextRequest, NextResponse } from 'next/server'
import { generateCourseUseCase } from '@/infrastructure/di'

export async function POST(req: NextRequest) {
  try {
    const { contentList } = await req.json()
    if (!contentList || !Array.isArray(contentList)) {
      return NextResponse.json({ success: false, error: 'Missing contentList' }, { status: 400 })
    }

    const { course, tokens } = await generateCourseUseCase.execute(markdown)
    return NextResponse.json({ success: true, course, tokens })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[generate-course]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
