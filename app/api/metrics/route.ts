import { NextRequest, NextResponse } from 'next/server'
import { prometheusRegistry } from '@/infrastructure/adapters/prometheus.adapter'
import { withAdminAuth } from '@/lib/middlewares/with-admin-auth'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async function (req: NextRequest) {
  try {
    const metrics = await prometheusRegistry.getMetrics()
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': prometheusRegistry.contentType,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

