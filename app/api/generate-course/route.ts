import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { generateCourseUseCase, courseRepository, logger, verifySessionUseCase, rateLimiter } from '@/infrastructure/di'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { getContentHash } from '@/lib/crypto-utils'

const handler = async (req: NextRequest) => {
  // 1. Verify User Session
  const session = req.cookies.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Check Rate Limit
  if (rateLimiter) {
    const check = await rateLimiter.check(user.id, 'generate-course');
    if (!check.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Rate limit exceeded',
        remaining: check.remaining,
        reset: check.reset 
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': check.limit.toString(),
          'X-RateLimit-Remaining': check.remaining.toString(),
          'X-RateLimit-Reset': check.reset.toString(),
        }
      });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const { markdown, force } = body;

  if (!markdown || typeof markdown !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing or invalid markdown' }, { status: 400 })
  }

  const hash = getContentHash(markdown)
  if (!force) {
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
  }

  const { course, tokens } = await generateCourseUseCase.execute(markdown)
  
  // Send notification to Discord
  const { alertAdapter } = await import('@/infrastructure/di')
  alertAdapter.sendSuccessAlert(`New course generated: **${course.title}**`, {
    lessons: course.chapters.reduce((acc, c) => acc + c.lessons.length, 0),
    tokens: tokens?.totalTokens || 0
  }).catch(e => logger.error('[alert] Notification failed:', { error: e }))

  // Save to cache asynchronously (fire-and-forget for speed)
  courseRepository.saveCourse(hash, course).catch(e => logger.error('[cache] Save failed:', { error: e }))
  
  return NextResponse.json({ success: true, course, tokens, fromCache: false, hash })
}

export const POST = withApiLogging('/api/generate-course', handler)
