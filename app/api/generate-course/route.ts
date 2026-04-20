import { NextRequest, NextResponse } from 'next/server'
import { createGenerateCourseUseCase } from '@/infrastructure/registry'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { resolveAiProvider } from '@/lib/ai-provider'

const handler = async (req: NextRequest) => {
  const { markdown, provider } = await req.json()
  
  if (!markdown || typeof markdown !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing or invalid markdown' }, { status: 400 })
  }

  const generateCourseUseCase = createGenerateCourseUseCase(resolveAiProvider(provider))
  const { course, tokens } = await generateCourseUseCase.execute(markdown)
  return NextResponse.json({ success: true, course, tokens })
}

export const POST = withApiLogging('/api/generate-course', handler)
