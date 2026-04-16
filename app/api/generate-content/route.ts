import { NextRequest, NextResponse } from 'next/server'
import { generateChapterContent } from '@/lib/ai'
import { extractSection } from '@/lib/markdown-sections'
import type { Course, ChapterContent, CourseContent, ChapterWithText } from '@/lib/types'
import { logger } from '@/infrastructure/di'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

const handler = async (req: NextRequest) => {
  const { course, markdown } = (await req.json()) as { course?: Course; markdown?: string }
  if (!course?.chapters?.length) {
    return NextResponse.json({ success: false, error: 'Missing course' }, { status: 400 })
  }
  if (!markdown) {
    return NextResponse.json({ success: false, error: 'Missing markdown' }, { status: 400 })
  }

  // Enrich each chapter's lessons with source text extracted from the original markdown
  const chaptersWithText: ChapterWithText[] = course.chapters.map(ch => ({
    ...ch,
    lessons: ch.lessons.map(l => ({
      ...l,
      source_text: extractSection(markdown, l.source_heading),
    })),
  }))

  // Generate all chapters in parallel; skip failures instead of crashing
  const results = await Promise.allSettled(
    chaptersWithText.map(ch => generateChapterContent(ch))
  )

  const chapters: ChapterContent[] = results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value

    logger.error(`Chapter ${i} ("${course.chapters[i].title}") failed`, { reason: result.reason, context: 'generate-content' })
    // Graceful fallback: return a minimal structure so the UI doesn't break
    return {
      chapter_title: chaptersWithText[i].title,
      lessons: chaptersWithText[i].lessons.map(l => ({
        lesson_title: l.title,
        slides: [
          {
            heading: l.title,
            bullets: [l.key_concept],
            speaker_notes: l.source_text.slice(0, 300),
          },
        ],
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
