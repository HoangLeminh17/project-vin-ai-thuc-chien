import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { verifySessionUseCase, getProgressMapUseCase } from '@/infrastructure/di';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

async function handler() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const map = await getProgressMapUseCase.execute(user.id);
  return NextResponse.json(map);
}

export const GET = withApiLogging('GetProgressMap', withApiMetrics('/api/progress/map', handler as any));
