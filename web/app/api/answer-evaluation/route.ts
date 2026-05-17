import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'

const handler = async (req: NextRequest) => {
  const { verifySessionUseCase, evaluateAnswerUseCase } = await import('@/infrastructure/registry')

  const session = req.cookies.get('session')?.value
  const user = await verifySessionUseCase.execute(session)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { question, canonicalAnswer, userAnswer } = body as {
    question?: unknown
    canonicalAnswer?: unknown
    userAnswer?: unknown
  }

  if (typeof question !== 'string' || typeof canonicalAnswer !== 'string' || typeof userAnswer !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing or invalid evaluation payload' }, { status: 400 })
  }

  const result = await evaluateAnswerUseCase.execute({ question, canonicalAnswer, userAnswer })
  return NextResponse.json({ success: true, ...result })
}

export const POST = withApiLogging('/api/answer-evaluation', withApiMetrics('/api/answer-evaluation', handler))
