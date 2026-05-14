import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { aggregateModuleMastery } from '@/lib/ukt-module-mastery'

async function handler() {
  const { uktService, verifySessionUseCase } = await import('@/infrastructure/di')
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  const user = await verifySessionUseCase.execute(session)

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = await uktService.getState(user.id)
  const moduleMastery = aggregateModuleMastery(state.knowledge_state)

  return NextResponse.json({
    student_id: state.student_id,
    knowledge_state: state.knowledge_state,
    module_mastery: moduleMastery,
  })
}

export const GET = withApiLogging('UKTMastery', handler)
