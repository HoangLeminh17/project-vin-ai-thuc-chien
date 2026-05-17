import { NextResponse } from 'next/server'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

export const dynamic = 'force-dynamic'

export const GET = withApiLogging('/api/health', withApiMetrics('/api/health', async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'web-app'
  }, { status: 200 })
}))
