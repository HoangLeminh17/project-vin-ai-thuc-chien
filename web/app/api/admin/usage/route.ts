import { NextRequest, NextResponse } from 'next/server'
import { usageRepository } from '@/infrastructure/di'
import { withAdminAuth } from '@/lib/middlewares/with-admin-auth'

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async function (_req: NextRequest) {
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
})

