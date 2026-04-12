import { NextRequest, NextResponse } from 'next/server'
import { generateChapterContent } from '@/lib/ai'
import type { Course, ChapterContent, CourseContent } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
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

      console.error(`[generate-content] Chapter ${i} ("${course.chapters[i].title}") failed:`, result.reason)
      // Graceful fallback: return a minimal structure so the UI doesn't break
      return {
        chapter_title: course.chapters[i].title,
        lessons: course.chapters[i].lessons.map(l => ({
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
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    console.error('[generate-content]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
