import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { verifySessionUseCase, getSRSStatsUseCase } from '@/infrastructure/di';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';

async function handler() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stats = await getSRSStatsUseCase.execute(user.id);
  return NextResponse.json(stats);
}

export const GET = withApiLogging('GetSRSStats', handler);
