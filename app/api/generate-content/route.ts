import { NextRequest, NextResponse } from 'next/server'
import { generateChapterContent } from '@/lib/ai'
import type { Course, ChapterContent, CourseContent } from '@/lib/types'
import { logger } from '@/infrastructure/registry'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

const handler = async (req: NextRequest) => {
  const { course } = (await req.json()) as { course?: Course }
  if (!course?.chapters?.length) {
    return NextResponse.json({ success: false, error: 'Missing course' }, { status: 400 })
  }

  // Generate all chapters in parallel; skip failures instead of crashing
  const results = await Promise.allSettled(
    course.chapters.map(ch => generateChapterContent(ch))
  )

  const chapters: ChapterContent[] = results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value

    logger.error(`Chapter ${i} ("${course.chapters[i].title}") failed`, { reason: result.reason, context: 'generate-content' })
    // Graceful fallback: return a minimal structure so the UI doesn't break
    return {
      chapter_title: course.chapters[i].title,
      lessons: course.chapters[i].lessons.map(l => ({
        lesson_title: l.title,
        concept: {
          question: `${l.title} là gì?`,
          answer: l.outline.slice(0, 2).join('. '),
          followUps: [] as string[],
        },
      })),
      quiz: {
        topic: course.chapters[i].quiz.topic,
        questions: [],
      },
    }
  })

  const courseContent: CourseContent = { chapters }
  return NextResponse.json({ success: true, courseContent })
}

export const POST = withApiLogging('/api/generate-content', handler)
