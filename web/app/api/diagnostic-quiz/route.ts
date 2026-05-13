import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { generateDiagnosticQuizUseCase, verifySessionUseCase, rateLimiter } from '@/infrastructure/di'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'

export const POST = withApiMetrics('/api/diagnostic-quiz', async function POST(req: NextRequest) {
  try {
    // 1. Verify User Session
    const session = req.cookies.get('session')?.value;
    const user = await verifySessionUseCase.execute(session);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check Rate Limit
    if (rateLimiter) {
      const check = await rateLimiter.check(user.id, 'generate-quiz');
      if (!check.success) {
        return NextResponse.json({ 
          error: 'Rate limit exceeded',
          remaining: check.remaining,
          reset: check.reset 
        }, { status: 429 });
      }
    }

    const body = await req.json()
    const { markdown, chunks } = body

    // Support both old (markdown) and new (chunks) format for backward compatibility
    let inputChunks = chunks;
    if (!inputChunks && markdown) {
      inputChunks = [{ id: 'legacy-full', text: markdown }];
    }

    if (!inputChunks || !Array.isArray(inputChunks)) {
      return NextResponse.json({ error: 'Missing chunks content' }, { status: 400 })
    }

    const { quiz, tokens } = await generateDiagnosticQuizUseCase.execute(inputChunks, user.id)

    return NextResponse.json({ quiz, tokens })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
})
