import { PLANNER_PROMPT, STAGE2_CHAPTER_PROMPT } from './prompts'
import type { Chapter, ChapterContent, Course } from './types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number }

export async function generateCourse(parsedContent: string): Promise<{ 
  course: Course; 
  tokens: TokenUsage | null;
}> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 16000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PLANNER_PROMPT },
        { role: 'user', content: parsedContent },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
    throw new Error(`OpenAI API error (${res.status}): ${msg}`)
  }

  const data = await res.json()

  const usage = data.usage
  const tokens: TokenUsage | null = usage
    ? { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens }
    : null
  
  const text = data.choices?.[0]?.message?.content
  if (!text) {
    throw new Error(`OpenAI returned no content: ${JSON.stringify(data)}`)
  }

  let course: Course
  try {
    course = JSON.parse(text)
  } catch {
    throw new Error(`Failed to parse OpenAI JSON response: ${text.slice(0, 500)}`)
  }

  if (!course.chapters || !Array.isArray(course.chapters)) {
    throw new Error(`Invalid course structure: missing chapters array`)
  }

  // Stricter validation
  course.chapters = course.chapters.map(ch => ({
    ...ch,
    lessons: Array.isArray(ch.lessons) ? ch.lessons : []
  }))

  return { course, tokens }
}

export async function generateChapterContent(chapter: Chapter): Promise<ChapterContent> {
  const chapterInput = {
    chapter_title: chapter.title,
    quiz_topic: chapter.quiz.topic,
    lessons: chapter.lessons.map(l => ({
      title: l.title,
      key_concept: l.key_concept,
      outline: l.outline,
    })),
  }
  console.log('[Stage2 Input]', JSON.stringify(chapterInput, null, 2))
  const input = JSON.stringify(chapterInput)

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: STAGE2_CHAPTER_PROMPT },
        { role: 'user', content: input },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
    throw new Error(`OpenAI API error (${res.status}): ${msg}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI returned no content for chapter content')

  const raw: ChapterContent = JSON.parse(text)

  if (!Array.isArray(raw.lessons) || !raw.quiz) {
    throw new Error(`Invalid ChapterContent structure for chapter: ${chapter.title}`)
  }

  // Ensure each lesson has a concept; apply fallback if the model omitted it
  const lessons = raw.lessons.map((l, i) => {
    if (l.concept) return l
    const src = chapter.lessons[i]
    return {
      ...l,
      concept: {
        question: `${src?.title ?? l.lesson_title} là gì?`,
        answer: src?.outline.slice(0, 2).join('. ') ?? '',
        followUps: [] as string[],
      },
    }
  })

  const content: ChapterContent = { ...raw, lessons }

  console.log(`[generate-content] Chapter done: ${chapter.title}`)
  return content
}

export async function extractFacts(content: string): Promise<string[]> {
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'Extract 5 interesting, short, and surprising facts or key takeaways from the provided text. Return them as a JSON object with a "facts" array of strings. Keep each fact under 15 words and in Vietnamese.' },
          { role: 'user', content: content.slice(0, 5000) }, 
        ],
        response_format: { type: 'json_object' },
      }),
    })
    
    if (!res.ok) throw new Error('AI extraction failed')
    
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content
    const obj = JSON.parse(text)
    return obj.facts || []
  } catch (e) {
    console.error('[extractFacts] Error:', e)
    return [
      "Hệ thống đang chắt lọc những kiến thức tinh túy nhất cho bạn...",
      "Sắp có một hành trình khám phá tri thức thú vị dành riêng cho bạn!",
      "Học tập là hạt giống của sự phát triển, hãy cùng kiên nhẫn nhé.",
      "Mỗi trang sách là một cửa sổ mở ra thế giới mới.",
      "Kiến thức sẽ giúp bạn đi xa hơn những gì bạn tưởng tượng."
    ]
  }
}
