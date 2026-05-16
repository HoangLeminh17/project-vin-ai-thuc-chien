import { NextRequest, NextResponse } from 'next/server'
import { monitoring } from '@/infrastructure/di'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { eventName, properties } = await req.json()
    
    if (!eventName) {
      return NextResponse.json({ error: 'Missing eventName' }, { status: 400 })
    }

    monitoring.trackEvent(eventName, properties)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
