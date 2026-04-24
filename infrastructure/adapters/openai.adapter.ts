import { IAiService, TokenUsage } from '@/core/ports/ai.port'
import { PLANNER_PROMPT } from '@/lib/prompts'
import type { Course } from '@/core/models/learning-model'
import { InfrastructureError } from '@/core/errors/domain-error'

export interface OpenAiConfig {
  apiKey: string
  baseUrl?: string
  model?: string
}

export class OpenAiAdapter implements IAiService {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly model: string

  constructor(config: OpenAiConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1/chat/completions'
    this.model = config.model || 'gpt-4o-mini'
  }

  async generateCourse(markdown: string): Promise<{ course: Course; tokens: TokenUsage | null }> {
    if (!this.apiKey) {
      throw new InfrastructureError('Missing OPENAI_API_KEY')
    }

    let res: Response;
    try {
      res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: PLANNER_PROMPT },
            { role: 'user', content: markdown },
          ],
        }),
      })
    } catch (e) {
      throw new InfrastructureError('Failed to connect to OpenAI API', e)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
      throw new InfrastructureError(`OpenAI API error (${res.status}): ${msg}`)
    }

    const data = await res.json()

    // Log token usage
    const usage = data.usage
    const tokens: TokenUsage | null = usage
      ? { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens }
      : null

    if (tokens) {
      console.log(`[openai-adapter] Tokens — prompt: ${tokens.promptTokens}, completion: ${tokens.completionTokens}, total: ${tokens.totalTokens}`)
    }

    const text = data.choices?.[0]?.message?.content
    if (!text) {
      throw new InfrastructureError(`OpenAI returned no content: ${JSON.stringify(data)}`)
    }

    let course: Course
    try {
      course = JSON.parse(text)
    } catch (e) {
      throw new InfrastructureError(`Failed to parse OpenAI JSON response: ${text.slice(0, 500)}`, e)
    }

    if (!course.chapters || !Array.isArray(course.chapters)) {
      throw new InfrastructureError(`Invalid course structure: missing chapters array`)
    }

    // Healer: Ensure lessons exists in each chapter
    course.chapters = course.chapters.map(ch => ({
      ...ch,
      lessons: ch.lessons || (ch as any).lesson || []
    }))

    return { course, tokens }
  }
}
