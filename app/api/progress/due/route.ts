import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionUseCase, getDueCardsUseCase } from '@/infrastructure/di';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';

async function handler() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cards = await getDueCardsUseCase.execute(user.id);
  return NextResponse.json(cards);
}

export const GET = withApiLogging('GetDueCards', handler);
