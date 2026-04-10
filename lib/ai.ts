import { PLANNER_PROMPT } from './prompts'
import type { Course } from './types'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number }

export async function generateCourse(markdown: string): Promise<{ course: Course; tokens: TokenUsage | null }> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: PLANNER_PROMPT + markdown }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
    throw new Error(`Gemini API error (${res.status}): ${msg}`)
  }

  const data = await res.json()

  // Log token usage
  const usage = data.usageMetadata
  const tokens: TokenUsage | null = usage
    ? { promptTokens: usage.promptTokenCount, completionTokens: usage.candidatesTokenCount, totalTokens: usage.totalTokenCount }
    : null
  if (tokens) {
    console.log(`[generate-course] Tokens — prompt: ${tokens.promptTokens}, completion: ${tokens.completionTokens}, total: ${tokens.totalTokens}`)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
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
    throw new Error(`Invalid course structure: missing chapters array`)
  }

  return { course, tokens }
}
