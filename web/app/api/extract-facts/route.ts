import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middlewares/with-auth'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'

const handler = async (req: NextRequest) => {
  const { markdown } = (await req.json()) as { markdown?: string }
  if (!markdown) {
    return NextResponse.json({ success: false, error: 'Missing content' }, { status: 400 })
  }

  const { extractFactsService } = await import('@/infrastructure/registry')
  const facts = await extractFactsService.execute(markdown)
  return NextResponse.json({ success: true, facts })
}

export const POST = withApiLogging('/api/extract-facts', withApiMetrics('/api/extract-facts', withAuth(handler)))

