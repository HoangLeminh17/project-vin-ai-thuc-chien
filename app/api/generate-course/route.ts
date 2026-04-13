import { NextRequest, NextResponse } from 'next/server'
import { generateCourseUseCase } from '@/infrastructure/di'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

const handler = async (req: NextRequest) => {
  const { markdown } = await req.json()
  
  if (!markdown || typeof markdown !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing or invalid markdown' }, { status: 400 })
  }

  const { course, tokens } = await generateCourseUseCase.execute(markdown)
  return NextResponse.json({ success: true, course, tokens })
}

export const POST = withApiLogging('/api/generate-course', handler)
