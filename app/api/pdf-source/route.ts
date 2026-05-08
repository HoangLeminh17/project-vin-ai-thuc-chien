import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const OUTPUT_DIR = path.join(process.cwd(), '.mineru-output')

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path')
  if (!filePath) {
    return NextResponse.json({ error: 'Missing path param' }, { status: 400 })
  }

  // Security: path must be inside .mineru-output
  const resolved = path.resolve(filePath)
  if (!resolved.startsWith(OUTPUT_DIR)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const buf = await fs.readFile(resolved)
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': buf.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
