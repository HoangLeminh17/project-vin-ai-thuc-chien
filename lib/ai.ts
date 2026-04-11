import { PLANNER_PROMPT } from './prompts'
import type { Course } from './types'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number }

export async function generateCourse(markdown: string): Promise<{ course: Course; tokens: TokenUsage | null }> {
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
        { role: 'user', content: markdown },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
    throw new Error(`OpenAI API error (${res.status}): ${msg}`)
  }

  const data = await res.json()

  // Log token usage
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
