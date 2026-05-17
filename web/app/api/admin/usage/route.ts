import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/middlewares/with-admin-auth'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'
import { handleApiError } from '@/lib/api-utils'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

export const dynamic = 'force-dynamic'

export const GET = withApiLogging('/api/admin/usage', withApiMetrics('/api/admin/usage', withAdminAuth(async function (_req: NextRequest) {
  try {
    const { usageRepository } = await import('@/infrastructure/di')
    const daily = await usageRepository.getDailyUsage(30)
    const recent = await usageRepository.getRecentUsage(50)
    
    return NextResponse.json({
      success: true,
      daily,
      recent
    })
  } catch (error: any) {
    return handleApiError(error, 'GET /api/admin/usage')
  }
})))

