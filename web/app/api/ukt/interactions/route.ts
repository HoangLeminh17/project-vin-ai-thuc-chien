import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

async function handler(req: NextRequest) {
  const { uktService, verifySessionUseCase } = await import('@/infrastructure/di')
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  const user = await verifySessionUseCase.execute(session)

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const interactions = Array.isArray(body?.interactions) ? body.interactions : []
  const now = Math.floor(Date.now() / 1000)

  const normalized = interactions
    .map((interaction: any, index: number) => ({
      question_id: typeof interaction?.question_id === 'number' ? interaction.question_id : index + 1,
      kc_id: typeof interaction?.kc_id === 'string' ? interaction.kc_id : '',
      response: interaction?.response === 1 ? 1 : 0,
      timestamp: typeof interaction?.timestamp === 'number' ? interaction.timestamp : now + index,
    }))
    .filter((interaction: { kc_id: string }) => interaction.kc_id.length > 0)

  if (normalized.length === 0) {
    return NextResponse.json({ error: 'No KC-tagged interactions provided' }, { status: 400 })
  }

  const prediction = await uktService.predict({
    student_id: user.id,
    interactions: normalized,
    total_minutes: typeof body?.total_minutes === 'number' ? body.total_minutes : 45,
  })

  return NextResponse.json({ prediction })
}

export const POST = withApiLogging('UKTInteractions', handler)
