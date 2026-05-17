import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

async function handler(req: NextRequest) {
  const { verifySessionUseCase, reviewCardUseCase } = await import('@/infrastructure/di');
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { cardId, rating, question, answer, kcId, moduleId, topic } = await req.json();
  const nextProgress = await reviewCardUseCase.execute(user.id, cardId, rating, question, answer, kcId ?? topic, moduleId);
  
  return NextResponse.json(nextProgress);
}

export const POST = withApiLogging('ReviewCard', withApiMetrics('/api/progress/review', handler));
