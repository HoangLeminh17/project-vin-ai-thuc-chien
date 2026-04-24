import { NextRequest, NextResponse } from 'next/server'
import { createGenerateCourseUseCase } from '@/infrastructure/registry'
import { courseRepository, logger } from '@/infrastructure/di'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { resolveAiProvider } from '@/lib/ai-provider'
import { getContentHash } from '@/lib/crypto-utils'

const handler = async (req: NextRequest) => {
  const { markdown, provider } = await req.json()
  
  if (!markdown || typeof markdown !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing or invalid markdown' }, { status: 400 })
  }

  const hash = getContentHash(markdown)
  const cached = await courseRepository.getFullCachedCourse(hash)
  
  if (cached) {
    return NextResponse.json({ 
      success: true, 
      course: cached.course, 
      courseContent: cached.content, 
      fromCache: true,
      hash 
    })
  }

  const generateCourseUseCase = createGenerateCourseUseCase(resolveAiProvider(provider))
  const { course, tokens } = await generateCourseUseCase.execute(markdown)
  
  // Save to cache asynchronously (fire-and-forget for speed)
  courseRepository.saveCourse(hash, course).catch(e => logger.error('[cache] Save failed:', { error: e }))
  
  return NextResponse.json({ success: true, course, tokens, fromCache: false, hash })
}

export const POST = withApiLogging('/api/generate-course', handler)
