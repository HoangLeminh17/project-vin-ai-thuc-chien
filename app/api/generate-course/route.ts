import { NextRequest, NextResponse } from 'next/server'
import { generateCourse } from '@/lib/ai'

export async function POST(req: NextRequest) {
  try {
    const { markdown } = await req.json()
    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing markdown' }, { status: 400 })
    }

    const course = await generateCourse(markdown)
    return NextResponse.json({ success: true, course })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('generate-course error:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
