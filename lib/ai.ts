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

export async function generateCourse_UNUSED(
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

    // Stricter validation
    course.chapters = course.chapters.map(ch => ({
      ...ch,
      lessons: Array.isArray(ch.lessons) ? ch.lessons : []
    }))

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

  // Stricter validation
  course.chapters = course.chapters.map(ch => ({
    ...ch,
    lessons: Array.isArray(ch.lessons) ? ch.lessons : []
  }))

  return { course, tokens }
}


async function generateChapterContentGemini(chapter: Chapter, input: string): Promise<ChapterContent> {
  const { apiKey, model } = getGeminiConfig()
  const res = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: STAGE2_CHAPTER_PROMPT }] },
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      contents: [{ role: 'user', parts: [{ text: input }] }],
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(`Gemini API error (${res.status}): ${body?.error?.message?.split('\n')[0] || 'Unknown'}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text ?? '').join('').trim()
  if (!text) throw new Error('Gemini returned no content')
  const raw: ChapterContent = JSON.parse(text)
  if (!Array.isArray(raw.lessons) || !raw.quiz) throw new Error(`Invalid structure`)
  const lessons = raw.lessons.map((l: any, i: number) => {
    if (l.concept) return l
    const src = chapter.lessons[i]
    return { ...l, concept: { question: `${src?.title ?? l.lesson_title} là gì?`, answer: src?.outline.slice(0, 2).join('. ') ?? '', followUps: [] } }
  })
  return { ...raw, lessons }
}

async function generateChapterContentOpenAI(chapter: Chapter, input: string): Promise<ChapterContent> {
  const { apiKey, model } = getOpenAiConfig()
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model, temperature: 0.3, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: STAGE2_CHAPTER_PROMPT }, { role: 'user', content: input }],
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(`OpenAI API error (${res.status}): ${body?.error?.message?.split('\\n')[0] || 'Unknown'}`)
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI returned no content')
  const raw: ChapterContent = JSON.parse(text)
  if (!Array.isArray(raw.lessons) || !raw.quiz) throw new Error(`Invalid structure`)
  const lessons = raw.lessons.map((l: any, i: number) => {
    if (l.concept) return l
    const src = chapter.lessons[i]
    return { ...l, concept: { question: `${src?.title ?? l.lesson_title} là gì?`, answer: src?.outline.slice(0, 2).join('. ') ?? '', followUps: [] } }
  })
  return { ...raw, lessons }
}

async function generateChapterContentLocal(chapter: Chapter, input: string): Promise<ChapterContent> {
  const baseUrl = process.env.LOCAL_AI_BASE_URL!
  const model = process.env.LOCAL_AI_MODEL || 'qwen2.5:0.5b'
  
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer local` },
    body: JSON.stringify({
      model, temperature: 0.3, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: STAGE2_CHAPTER_PROMPT }, { role: 'user', content: input }],
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(`Local AI error (${res.status}): ${body?.error?.message?.split('\\n')[0] || 'Unknown'}`)
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Local AI returned no content')
  const raw: ChapterContent = JSON.parse(text)
  if (!Array.isArray(raw.lessons) || !raw.quiz) throw new Error(`Invalid structure`)
  const lessons = raw.lessons.map((l: any, i: number) => {
    if (l.concept) return l
    const src = chapter.lessons[i]
    return { ...l, concept: { question: `${src?.title ?? l.lesson_title} là gì?`, answer: src?.outline.slice(0, 2).join('. ') ?? '', followUps: [] } }
  })
  return { ...raw, lessons }
}

export async function generateChapterContent(chapter: Chapter): Promise<ChapterContent> {
  const chapterInput = {
    chapter_title: chapter.title,
    quiz_topic: chapter.quiz.topic,
    lessons: chapter.lessons.map(l => ({ title: l.title, key_concept: l.key_concept, outline: l.outline })),
  }
  const input = JSON.stringify(chapterInput)

  let lastError: unknown;

  if (process.env.OPENAI_API_KEY) {
    try {
      console.log('[generate-content] Trying OpenAI...')
      return await generateChapterContentOpenAI(chapter, input)
    } catch (e) {
      console.warn('[generate-content] OpenAI failed:', e)
      lastError = e
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('[generate-content] Trying Gemini...')
      return await generateChapterContentGemini(chapter, input)
    } catch (e) {
      console.warn('[generate-content] Gemini failed:', e)
      lastError = e
    }
  }

  if (process.env.LOCAL_AI_BASE_URL) {
    try {
      console.log('[generate-content] Trying Local AI...')
      return await generateChapterContentLocal(chapter, input)
    } catch (e) {
      console.warn('[generate-content] Local AI failed:', e)
      lastError = e
    }
  }

  throw new Error(`All chapter generation providers failed. Last error: ${lastError}`)
}
export async function extractFacts(content: string): Promise<string[]> {
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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
