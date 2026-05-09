import { NextResponse } from 'next/server'
import { prometheusRegistry } from '@/infrastructure/adapters/prometheus.adapter'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const metrics = await prometheusRegistry.getMetrics()
    return new Response(metrics, {
      headers: {
        'Content-Type': prometheusRegistry.contentType,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
