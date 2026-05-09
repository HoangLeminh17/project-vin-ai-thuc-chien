import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { generateDiagnosticQuizUseCase, verifySessionUseCase } from '@/infrastructure/di'

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    let userId = 'anonymous'

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1]
      try {
        const decoded = await verifySessionUseCase.execute(token)
        if (decoded && decoded.id) {
          userId = decoded.id
        }
      } catch (e) {
        // Ignored, proceed anonymously
      }
    }

    const body = await req.json()
    const { markdown } = body

    if (!markdown) {
      return NextResponse.json({ error: 'Missing markdown content' }, { status: 400 })
    }

    const quiz = await generateDiagnosticQuizUseCase.execute(markdown)

    return NextResponse.json(quiz)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
