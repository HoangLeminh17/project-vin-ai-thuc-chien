import { NextRequest, NextResponse } from 'next/server';
import { withApiLogging } from '@/lib/middlewares/with-api-logging';
import { handleApiError } from '@/lib/api-utils';
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics';

async function getHandler(req: NextRequest) {
  const { verifySessionUseCase, listCoursesUseCase } = await import('@/infrastructure/registry');
  const session = req.cookies.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const courses = await listCoursesUseCase.execute(user.id);
  return NextResponse.json({ success: true, courses });
}

async function postHandler(req: NextRequest) {
  const { verifySessionUseCase, saveCourseUseCase, courseRepository } = await import('@/infrastructure/registry');
  const session = req.cookies.get('session')?.value;
  const user = await verifySessionUseCase.execute(session);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, course, courseContent, contentHash, pdfStorageUrl, layoutStorageUrl } = body;
  if (!title || !course) {
    return NextResponse.json({ success: false, error: 'Missing title or course' }, { status: 400 });
  }

  const saved = await saveCourseUseCase.execute({
    userId: user.id,
    title,
    course,
    courseContent: courseContent ?? null,
    contentHash
  });

  if (pdfStorageUrl && typeof pdfStorageUrl === 'string') {
    await courseRepository.updatePdfUrl(saved.id, pdfStorageUrl);
  }

  if (layoutStorageUrl && typeof layoutStorageUrl === 'string') {
    await courseRepository.updateLayoutUrl(saved.id, layoutStorageUrl);
  }

  return NextResponse.json({ success: true, course: saved });
}

export const GET = withApiLogging('/api/courses', withApiMetrics('/api/courses', (req) => getHandler(req as any).catch(e => handleApiError(e, 'GET /api/courses')) as any));
export const POST = withApiLogging('/api/courses', withApiMetrics('/api/courses', (req) => postHandler(req as any).catch(e => handleApiError(e, 'POST /api/courses')) as any));
