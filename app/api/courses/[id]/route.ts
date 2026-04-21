import { NextRequest, NextResponse } from 'next/server';
import { verifySessionUseCase, getCourseUseCase, deleteCourseUseCase } from '@/infrastructure/registry';
import { handleApiError } from '@/lib/api-utils';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';

type Context = { params: Promise<{ id: string }> };

async function getHandler(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const session = req.cookies.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const course = await getCourseUseCase.execute(id, user.id);
  return NextResponse.json({ success: true, course });
}

async function deleteHandler(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const session = req.cookies.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  await deleteCourseUseCase.execute(id, user.id);
  return NextResponse.json({ success: true });
}

export const GET = withApiLogging('/api/courses/[id]', (req, ctx) =>
  getHandler(req, ctx).catch((e: unknown) => handleApiError(e, 'GET /api/courses/[id]'))
);

export const DELETE = withApiLogging('/api/courses/[id]', (req, ctx) =>
  deleteHandler(req, ctx).catch((e: unknown) => handleApiError(e, 'DELETE /api/courses/[id]'))
);
