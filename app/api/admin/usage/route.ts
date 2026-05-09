import { NextResponse } from 'next/server'
import { usageRepository } from '@/infrastructure/di'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const daily = await usageRepository.getDailyUsage(30)
    const recent = await usageRepository.getRecentUsage(50)
    
    return NextResponse.json({
      success: true,
      daily,
      recent
    })
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch usage data' 
    }, { status: 500 })
  }
}
