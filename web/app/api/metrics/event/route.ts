import { NextRequest, NextResponse } from 'next/server'
import { monitoring } from '@/infrastructure/di'
import { handleApiError } from '@/lib/api-utils'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'

export const dynamic = 'force-dynamic'

const handler = async (req: NextRequest) => {
  try {
    const { eventName, properties } = await req.json()
    
    if (!eventName) {
      return NextResponse.json({ error: 'Missing eventName' }, { status: 400 })
    }

    monitoring.trackEvent(eventName, properties)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    // Do not return error.message to clients.
    return handleApiError(error, 'POST /api/metrics/event')
  }
}

export const POST = withApiLogging('/api/metrics/event', withApiMetrics('/api/metrics/event', handler))
