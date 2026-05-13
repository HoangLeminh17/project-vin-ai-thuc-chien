import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { verifySessionUseCase, getCourseUseCase, deleteCourseUseCase, updateCourseUseCase } from '@/infrastructure/registry';
import { handleApiError } from '@/lib/api-utils';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

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

async function patchHandler(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  const session = req.cookies.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { content } = await req.json();
  await updateCourseUseCase.execute(id, user.id, content);
  return NextResponse.json({ success: true });
}

export const GET = withApiLogging('/api/courses/[id]', withApiMetrics('/api/courses/[id]', (req, ctx) =>
  getHandler(req as any, ctx).catch((e: unknown) => handleApiError(e, 'GET /api/courses/[id]')) as any
));

export const PATCH = withApiLogging('/api/courses/[id]', withApiMetrics('/api/courses/[id]', (req, ctx) =>
  patchHandler(req as any, ctx).catch((e: unknown) => handleApiError(e, 'PATCH /api/courses/[id]')) as any
));

export const DELETE = withApiLogging('/api/courses/[id]', withApiMetrics('/api/courses/[id]', (req, ctx) =>
  deleteHandler(req as any, ctx).catch((e: unknown) => handleApiError(e, 'DELETE /api/courses/[id]')) as any
));
