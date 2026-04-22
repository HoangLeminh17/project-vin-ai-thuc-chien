import { NextRequest, NextResponse } from 'next/server'
import { generateChapterContent } from '@/lib/ai'
import type { Course, ChapterContent, CourseContent } from '@/lib/types'
import { logger, courseRepository } from '@/infrastructure/di'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'

const handler = async (req: NextRequest) => {
  const { course, chapterIndex, hash } = (await req.json()) as { course?: Course; chapterIndex?: number; hash?: string }
  if (!course?.chapters?.length) {
    return NextResponse.json({ success: false, error: 'Missing course' }, { status: 400 })
  }

  // If chapterIndex is provided, only generate that specific chapter
  if (typeof chapterIndex === 'number') {
    if (chapterIndex < 0 || chapterIndex >= course.chapters.length) {
      return NextResponse.json({ success: false, error: 'Invalid chapterIndex' }, { status: 400 })
    }

    // Check cache if hash is provided
    if (hash) {
      const cachedChapter = await courseRepository.getChapter(hash, chapterIndex)
      if (cachedChapter) {
        return NextResponse.json({ success: true, chapter: cachedChapter, fromCache: true })
      }
    }

    const chapter = await generateChapterContent(course.chapters[chapterIndex])

    // Save to cache asynchronously
    if (hash) {
      courseRepository.saveChapter(hash, chapterIndex, chapter).catch(e => logger.error('[cache] Save chapter failed:', { error: e }))
    }

    return NextResponse.json({ success: true, chapter, fromCache: false })
  }

  // Fallback: Generate all chapters in parallel (backward compatibility)
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
