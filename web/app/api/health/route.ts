import { NextResponse } from 'next/server'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'

export const dynamic = 'force-dynamic'

export const GET = withApiMetrics('/api/health', async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'web-app'
  }, { status: 200 })
})
