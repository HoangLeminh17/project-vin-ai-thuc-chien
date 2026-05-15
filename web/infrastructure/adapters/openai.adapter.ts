import { IAiService, TokenUsage, ContentChunk } from '@/core/ports/ai.port'
import { PLANNER_PROMPT, DIAGNOSTIC_QUIZ_PROMPT } from '@/lib/prompts'
import { formatDiagnosticChunk } from '@/lib/diagnostic-format'
import type { Course, DiagnosticQuiz, DiagnosticQuestion } from '@/core/models/learning-model'
import { InfrastructureError } from '@/core/errors/domain-error'
import { withRetry } from '@/lib/retry'

const QUIZ_CONCURRENCY = 4

function createSemaphore(limit: number) {
  let active = 0
  const queue: (() => void)[] = []
  return async function<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>(resolve => queue.push(resolve))
    }
    active++
    try {
      return await fn()
    } finally {
      active--
      queue.shift()?.()
    }
  }
}

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
      throw new InfrastructureError(`OpenAI-compatible API error (${this.baseUrl}) returned ${res.status}: ${msg}`)
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

    // Healer: Ensure lessons exists in each chapter and outline is OutlinePoint[]
    course.chapters = course.chapters.map(ch => ({
      ...ch,
      lessons: (ch.lessons || (ch as any).lesson || []).map((lesson: any) => {
        if (Array.isArray(lesson.outline) && (lesson.outline.length === 0 || typeof lesson.outline[0] === 'string')) {
          return {
            ...lesson,
            outline: lesson.outline.map((point: string) => ({ point, chunks: [] }))
          }
        }
        return lesson
      })
    }))

    return { course, tokens }
  }

  private async generateSingleChunkQuestion(chunk: ContentChunk): Promise<{ question: DiagnosticQuestion; tokens: TokenUsage | null }> {
    const formattedContent = formatDiagnosticChunk(chunk)

    let res: Response
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
            { role: 'system', content: DIAGNOSTIC_QUIZ_PROMPT },
            { role: 'user', content: formattedContent },
          ],
        }),
      })
    } catch (e) {
      throw new InfrastructureError(`Failed to connect to AI API for chunk ${chunk.id}`, e)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
      throw new InfrastructureError(`OpenAI-compatible API error returned ${res.status} for chunk ${chunk.id}: ${msg}`)
    }

    const data = await res.json()
    const usage = data.usage
    const tokens: TokenUsage | null = usage
      ? { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens }
      : null

    const text = data.choices?.[0]?.message?.content
    if (!text) {
      throw new InfrastructureError(`AI returned no content for chunk ${chunk.id}: ${JSON.stringify(data)}`)
    }

    let parsed: DiagnosticQuiz
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      throw new InfrastructureError(`Failed to parse AI response for chunk ${chunk.id}: ${text.slice(0, 500)}`, e)
    }

    const question = parsed.questions?.[0]
    if (!question) {
      throw new InfrastructureError(`AI returned no question for chunk ${chunk.id}`)
    }

    return { question, tokens }
  }

  async generateDiagnosticQuiz(chunks: ContentChunk[]): Promise<{ quiz: DiagnosticQuiz; tokens: TokenUsage | null }> {
    if (!this.apiKey) {
      throw new InfrastructureError('Missing OPENAI_API_KEY')
    }

    const limit = createSemaphore(QUIZ_CONCURRENCY)
    const results = await Promise.all(
      chunks.map(chunk =>
        limit(() => withRetry(() => this.generateSingleChunkQuestion(chunk)))
      )
    )

    const questions = results.map(r => r.question)
    const hasTokens = results.some(r => r.tokens !== null)
    const tokens: TokenUsage | null = hasTokens
      ? results.reduce<TokenUsage>(
          (acc, r) => ({
            promptTokens: acc.promptTokens + (r.tokens?.promptTokens ?? 0),
            completionTokens: acc.completionTokens + (r.tokens?.completionTokens ?? 0),
            totalTokens: acc.totalTokens + (r.tokens?.totalTokens ?? 0),
          }),
          { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        )
      : null

    return { quiz: { questions }, tokens }
  }
}
