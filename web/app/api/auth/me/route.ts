import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionUseCase } from '@/infrastructure/di';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

async function meHandler() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;

  const user = await verifySessionUseCase.execute(session);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({ user });
}

export const GET = withApiLogging('MeAPI', withApiMetrics('/api/auth/me', meHandler as any));
