import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middlewares/with-auth'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'
import { InfrastructureError } from '@/core/errors/domain-error'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
const MINERU_OUTPUT_ERROR =
  'MinerU đã xử lý PDF nhưng không trả về nội dung đọc được. Hãy thử export PDF lại dạng text/searchable hoặc dùng file PDF khác.'

const handler = async (req: NextRequest) => {
  const { parseDocumentUseCase, verifySessionUseCase } = await import('@/infrastructure/registry')
  const session = req.cookies.get('session')?.value
  const user = await verifySessionUseCase.execute(session)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'Missing "file" field' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ success: false, error: 'Only PDF files are accepted' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ success: false, error: 'File exceeds 20 MB limit' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let result: Awaited<ReturnType<typeof parseDocumentUseCase.execute>>
  try {
    result = await parseDocumentUseCase.execute(buffer, file.name, user.id)
  } catch (error) {
    if (
      error instanceof InfrastructureError &&
      error.message.includes('MinerU output zip did not contain readable markdown or content_list JSON')
    ) {
      return NextResponse.json({
        success: false,
        error: MINERU_OUTPUT_ERROR,
        code: 'MINERU_EMPTY_OUTPUT',
      }, { status: 422 })
    }

    throw error
  }

  return NextResponse.json({ success: true, ...result })
}

export const POST = withApiLogging('/api/parse-pdf', withApiMetrics('/api/parse-pdf', withAuth(handler)))

