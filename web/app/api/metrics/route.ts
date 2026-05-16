import { NextRequest, NextResponse } from 'next/server'
import { prometheusRegistry } from '@/infrastructure/adapters/prometheus.adapter'
import { withAdminAuth } from '@/lib/middlewares/with-admin-auth'
import { handleApiError } from '@/lib/api-utils'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

export const dynamic = 'force-dynamic'

export const GET = withApiLogging('/api/metrics', withAdminAuth(async function (_req: NextRequest) {
  try {
    const metrics = await prometheusRegistry.getMetrics()
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': prometheusRegistry.contentType,
      },
    })
  } catch (error: any) {
    // Avoid leaking internal details (e.g., registry errors) to clients.
    return handleApiError(error, 'GET /api/metrics')
  }
}))

