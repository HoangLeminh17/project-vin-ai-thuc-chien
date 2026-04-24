import { NextRequest, NextResponse } from 'next/server'
import { extractFacts } from '@/lib/ai'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

const handler = async (req: NextRequest) => {
  const { markdown } = (await req.json()) as { markdown?: string }
  if (!markdown) {
    return NextResponse.json({ success: false, error: 'Missing content' }, { status: 400 })
  }

  const facts = await extractFacts(markdown)
  return NextResponse.json({ success: true, facts })
}

export const POST = withApiLogging('/api/extract-facts', handler)
