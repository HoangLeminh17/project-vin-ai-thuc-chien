import { NextRequest, NextResponse } from 'next/server'
import { monitoring } from '@/infrastructure/di'
import { handleApiError } from '@/lib/api-utils'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'

export const dynamic = 'force-dynamic'
const ALLOWED_METRIC_NAME = 'course_generation_duration_ms'

const handler = async (req: NextRequest) => {
  try {
    const { metricName, value, tags } = await req.json()

    if (!metricName || typeof metricName !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing metricName' }, { status: 400 })
    }

    if (metricName !== ALLOWED_METRIC_NAME) {
      return NextResponse.json({ success: false, error: 'Unsupported metricName' }, { status: 400 })
    }

    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return NextResponse.json({ success: false, error: 'Invalid value' }, { status: 400 })
    }

    monitoring.recordMetric(metricName, value, tags)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return handleApiError(error, 'POST /api/metrics/record')
  }
}

export const POST = withApiLogging('/api/metrics/record', withApiMetrics('/api/metrics/record', handler))
