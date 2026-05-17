import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'
import { aggregateModuleMastery } from '@/lib/ukt-module-mastery'

async function handler() {
  const {
    verifySessionUseCase,
    listCoursesUseCase,
    getSRSStatsUseCase,
    getProgressMapUseCase,
    uktService,
  } = await import('@/infrastructure/di')

  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  const user = await verifySessionUseCase.execute(session)

  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const [courses, srsStats, progressMap, uktState] = await Promise.all([
    listCoursesUseCase.execute(user.id),
    getSRSStatsUseCase.execute(user.id),
    getProgressMapUseCase.execute(user.id),
    uktService.getState(user.id).catch(() => null),
  ])

  return NextResponse.json({
    success: true,
    courses,
    srsStats,
    progressMap,
    ukt: uktState
      ? {
          student_id: uktState.student_id,
          knowledge_state: uktState.knowledge_state,
          module_mastery: aggregateModuleMastery(uktState.knowledge_state),
        }
      : {
          student_id: user.id,
          knowledge_state: {},
          module_mastery: aggregateModuleMastery({}),
        },
  })
}

export const GET = withApiLogging('/api/dashboard', withApiMetrics('/api/dashboard', handler as any))
