import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { generateChapterContent } from '@/lib/ai'
import type { Course, ChapterContent, CourseContent } from '@/lib/types'
import { isLegacyOutline } from '@/lib/types'
import { withAuth } from '@/lib/middlewares/with-auth'
import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'
import { chapterNeedsCardRegeneration } from '@/lib/course-content-version'

const handler = async (req: NextRequest) => {
  const { logger, courseRepository } = await import('@/infrastructure/di')
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const { course, chapterIndex, hash, rawContexts } = body as { course?: Course; chapterIndex?: number; hash?: string; rawContexts?: string[] }
  if (!course?.chapters?.length) {
    return NextResponse.json({ success: false, error: 'Missing course' }, { status: 400 })
  }

  // If chapterIndex is provided, only generate that specific chapter
  if (typeof chapterIndex === 'number') {
    if (chapterIndex < 0 || chapterIndex >= course.chapters.length) {
      return NextResponse.json({ success: false, error: 'Invalid chapterIndex' }, { status: 400 })
    }

    // Check cache if hash is provided; skip if outline is legacy (pre-OutlinePoint schema)
    const hasLegacyOutline = course.chapters[chapterIndex].lessons.some(l => isLegacyOutline(l.outline))
    if (hash && !hasLegacyOutline) {
      const cachedChapter = await courseRepository.getChapter(hash, chapterIndex)
      if (cachedChapter && !chapterNeedsCardRegeneration(cachedChapter)) {
        return NextResponse.json({ success: true, chapter: cachedChapter, fromCache: true })
      }
    }

    const chapter = await generateChapterContent(course.chapters[chapterIndex], rawContexts)

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
      lessons: course.chapters[i].lessons.map(l => {
        const answer = isLegacyOutline(l.outline)
          ? l.outline.slice(0, 2).join('. ')
          : l.outline.slice(0, 2).map(o => o.point).join('. ')
        const concept = {
          question: `${l.title} là gì?`,
          answer,
          followUps: [] as string[],
          kc_id: l.knowledge?.kc_id,
          kc_name: l.knowledge?.kc_name,
          module_id: l.knowledge?.module_id,
          module_name: l.knowledge?.module_name,
        }
        return {
          lesson_title: l.title,
          concept,
          cards: [concept],
        }
      }),
      quiz: {
        topic: course.chapters[i].quiz.topic,
        questions: [],
      },
    }
  })

  const courseContent: CourseContent = { chapters }
  return NextResponse.json({ success: true, courseContent })
}

export const POST = withApiLogging('/api/generate-content', withApiMetrics('/api/generate-content', withAuth(handler)))


