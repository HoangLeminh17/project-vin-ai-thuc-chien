import { NextRequest, NextResponse } from 'next/server';
import { verifySessionUseCase, saveCourseUseCase, listCoursesUseCase } from '@/infrastructure/registry';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { handleApiError } from '@/lib/api-utils';

async function getHandler(req: NextRequest) {
  const session = req.cookies.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const courses = await listCoursesUseCase.execute(user.id);
  return NextResponse.json({ success: true, courses });
}

async function postHandler(req: NextRequest) {
  const session = req.cookies.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, course, courseContent } = body;
  if (!title || !course) {
    return NextResponse.json({ success: false, error: 'Missing title or course' }, { status: 400 });
  }

  const saved = await saveCourseUseCase.execute({ userId: user.id, title, course, courseContent: courseContent ?? null });
  return NextResponse.json({ success: true, course: saved });
}

export const GET = withApiLogging('/api/courses', (req) => getHandler(req).catch(e => handleApiError(e, 'GET /api/courses')));
export const POST = withApiLogging('/api/courses', (req) => postHandler(req).catch(e => handleApiError(e, 'POST /api/courses')));
