import { PLANNER_PROMPT, STAGE2_CHAPTER_PROMPT } from './prompts'
import type { Chapter, ChapterContent, Course } from './types'
import { resolveAiProvider, type AiProvider } from './ai-provider'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number }

function getOpenAiConfig() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY')
  }

  return {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  }
}

function getGeminiConfig() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  return {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  }
}

export async function generateCourse(
  parsedContent: string,
  provider?: AiProvider,
): Promise<{ course: Course; tokens: TokenUsage | null }> {
  const resolvedProvider = resolveAiProvider(provider)

  if (resolvedProvider === 'gemini') {
    const { apiKey, model } = getGeminiConfig()
    const res = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: PLANNER_PROMPT }],
        },
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: parsedContent }],
          },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
      throw new Error(`Gemini API error (${res.status}): ${msg}`)
    }

    const data = await res.json()
    const usage = data.usageMetadata
    const tokens: TokenUsage | null = usage
      ? {
          promptTokens: usage.promptTokenCount ?? 0,
          completionTokens: usage.candidatesTokenCount ?? 0,
          totalTokens: usage.totalTokenCount ?? 0,
        }
      : null
    if (tokens) {
      console.log(`[generate-course] Tokens - prompt: ${tokens.promptTokens}, completion: ${tokens.completionTokens}, total: ${tokens.totalTokens}`)
    }

    const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim()
    if (!text) {
      throw new Error(`Gemini returned no content: ${JSON.stringify(data)}`)
    }

    let course: Course
    try {
      course = JSON.parse(text)
    } catch {
      throw new Error(`Failed to parse Gemini JSON response: ${text.slice(0, 500)}`)
    }

    if (!course.chapters || !Array.isArray(course.chapters)) {
      throw new Error('Invalid course structure: missing chapters array')
    }

    return { course, tokens }
  }

  const { apiKey, model } = getOpenAiConfig()
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
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

export async function generateChapterContent(chapter: Chapter, provider?: AiProvider): Promise<ChapterContent> {
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

  const resolvedProvider = resolveAiProvider(provider)

  if (resolvedProvider === 'gemini') {
    const { apiKey, model } = getGeminiConfig()
    const res = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: STAGE2_CHAPTER_PROMPT }],
        },
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: input }],
          },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
      throw new Error(`Gemini API error (${res.status}): ${msg}`)
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim()
    if (!text) throw new Error('Gemini returned no content for chapter content')

    const raw: ChapterContent = JSON.parse(text)

    if (!Array.isArray(raw.lessons) || !raw.quiz) {
      throw new Error(`Invalid ChapterContent structure for chapter: ${chapter.title}`)
    }

    const lessons = raw.lessons.map((l, i) => {
      if (l.concept) return l
      const src = chapter.lessons[i]
      return {
        ...l,
        concept: {
          question: `${src?.title ?? l.lesson_title} lĂ  gĂ¬?`,
          answer: src?.outline.slice(0, 2).join('. ') ?? '',
          followUps: [] as string[],
        },
      }
    })

    const content: ChapterContent = { ...raw, lessons }
    console.log(`[generate-content] Chapter done: ${chapter.title}`)
    return content
  }

  const { apiKey, model } = getOpenAiConfig()

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
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
