import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { verifySessionUseCase, getDueCardsUseCase } from '@/infrastructure/di';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

async function handler() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cards = await getDueCardsUseCase.execute(user.id);
  return NextResponse.json(cards);
}

export const GET = withApiLogging('GetDueCards', withApiMetrics('/api/progress/due', handler as any));
