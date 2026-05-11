import { NextRequest, NextResponse } from 'next/server'
import { progressStore } from '@/infrastructure/di/progress.di'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

const handler = async (req: NextRequest) => {
  const taskId = req.nextUrl.searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json({ success: false, error: 'Missing taskId' }, { status: 400 })
  }

  const progress = await progressStore.getProgress(taskId)

  if (!progress) {
    return NextResponse.json({ success: false, error: 'Task not found or not started' }, { status: 404 })
  }

  return NextResponse.json({ success: true, progress })
}

export const GET = withApiLogging('/api/parse-pdf/progress', handler)
