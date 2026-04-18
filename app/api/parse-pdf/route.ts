import { NextRequest, NextResponse } from 'next/server'
import { parseDocumentUseCase } from '@/infrastructure/registry'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

const handler = async (req: NextRequest) => {
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
  const markdown = await parseDocumentUseCase.execute(buffer, file.name)

  return NextResponse.json({ success: true, markdown: markdown, contentList: [] })
}

export const POST = withApiLogging('/api/parse-pdf', handler)
