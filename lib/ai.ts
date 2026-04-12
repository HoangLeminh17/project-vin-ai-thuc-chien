import { PLANNER_PROMPT, STAGE2_CHAPTER_PROMPT } from './prompts'
import type { Chapter, ChapterContent, Course } from './types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number }

export async function generateCourse(parsedContent: string): Promise<{ course: Course; tokens: TokenUsage | null }> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.2,
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
  if (tokens) {
    console.log(`[generate-course] Tokens — prompt: ${tokens.promptTokens}, completion: ${tokens.completionTokens}, total: ${tokens.totalTokens}`)
  }

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

  return { course, tokens }
}

export async function generateChapterContent(chapter: Chapter): Promise<ChapterContent> {
  const chapterInput = {
    chapter_title: chapter.title,
    quiz_topic: chapter.quiz.topic,
    lessons: chapter.lessons.map(l => ({
      title: l.title,
      key_concept: l.key_concept,
      source_text: l.source_text,
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
      model: 'gpt-4o',
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

  const content: ChapterContent = JSON.parse(text)

  if (!content.lessons || !content.quiz) {
    throw new Error(`Invalid ChapterContent structure for chapter: ${chapter.title}`)
  }

  console.log(`[generate-content] Chapter done: ${chapter.title}`)
  return content
}
