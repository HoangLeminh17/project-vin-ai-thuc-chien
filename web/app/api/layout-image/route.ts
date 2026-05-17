import { NextRequest, NextResponse } from 'next/server'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'
import { getBucket } from '@/lib/firebase-admin'
import { handleApiError } from '@/lib/api-utils'
import { mimeTypeForImagePath, normalizeMineruAssetPath } from '@/infrastructure/adapters/mineru-images'

const handler = async (req: NextRequest) => {
  const { verifySessionUseCase } = await import('@/infrastructure/registry')
  const session = req.cookies.get('session')?.value
  const user = await verifySessionUseCase.execute(session)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storagePath = normalizeMineruAssetPath(req.nextUrl.searchParams.get('path') ?? '')
  if (!storagePath) return NextResponse.json({ error: 'Missing path param' }, { status: 400 })

  const allowedPrefix = `course-layout-images/${user.id}/`
  if (
    !storagePath.startsWith(allowedPrefix) ||
    storagePath.split('/').some(segment => segment === '..')
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [buffer] = await getBucket().file(storagePath).download()
    const bytes = new Uint8Array(buffer)
    const contentType = mimeTypeForImagePath(storagePath)

    return new NextResponse(bytes, {
      headers: {
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': bytes.byteLength.toString(),
        'Content-Type': contentType,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }
}

export const GET = withApiLogging('/api/layout-image', withApiMetrics('/api/layout-image', (req: NextRequest) =>
  handler(req).catch((e: unknown) => handleApiError(e, 'GET /api/layout-image'))
))
