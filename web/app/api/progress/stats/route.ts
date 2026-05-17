import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

async function handler(_req: NextRequest) {
  const { verifySessionUseCase, getSRSStatsUseCase } = await import('@/infrastructure/di');
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stats = await getSRSStatsUseCase.execute(user.id);
  return NextResponse.json(stats);
}

export const GET = withApiLogging('GetSRSStats', withApiMetrics('/api/progress/stats', handler));
