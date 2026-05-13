import { NextRequest, NextResponse } from 'next/server'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { getBucket } from '@/lib/firebase-admin'
import { handleApiError } from '@/lib/api-utils'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'

const handler = async (req: NextRequest) => {
  const { verifySessionUseCase, courseRepository } = await import('@/infrastructure/registry')
  const session = req.cookies.get('session')?.value
  const user = await verifySessionUseCase.execute(session)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const courseId = req.nextUrl.searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'Missing courseId' }, { status: 400 })

  const course = await courseRepository.getById(courseId, user.id)
  if (!course?.layoutStorageUrl) return NextResponse.json({ error: 'No layout for this course' }, { status: 404 })

  const bucket = getBucket()
  const [buffer] = await bucket.file(course.layoutStorageUrl).download()
  const bytes = new Uint8Array(buffer)

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': bytes.byteLength.toString(),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}

export const GET = withApiLogging('/api/layout-serve', withApiMetrics('/api/layout-serve', (req) => handler(req as any).catch(e => handleApiError(e, 'GET /api/layout-serve')) as any))
