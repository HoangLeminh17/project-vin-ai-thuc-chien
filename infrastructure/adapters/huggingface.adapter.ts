import { IAiService, TokenUsage } from '@/core/ports/ai.port'
import { PLANNER_PROMPT, DIAGNOSTIC_QUIZ_PROMPT } from '@/lib/prompts'
import type { Course, DiagnosticQuiz } from '@/core/models/learning-model'
import { InfrastructureError } from '@/core/errors/domain-error'

export interface HuggingFaceConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

export class HuggingFaceAdapter implements IAiService {
  private readonly apiKey: string
  private readonly model: string
  private readonly baseUrl: string

  constructor(config: HuggingFaceConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'meta-llama/Llama-3.1-8B-Instruct'
    // HF OpenAI-compatible endpoint: requires model ID in the URL for Inference API
    this.baseUrl = config.baseUrl || `https://api-inference.huggingface.co/models/${this.model}/v1/chat/completions`
  }

  async generateCourse(markdown: string): Promise<{ course: Course; tokens: TokenUsage | null }> {
    if (!this.apiKey) {
      throw new InfrastructureError('Missing HUGGINGFACE_API_KEY')
    }

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
          // Note: Some HF models might not support json_object response format
          // but many modern ones (like Llama 3) do via TGI
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: PLANNER_PROMPT },
            { role: 'user', content: markdown },
          ],
        }),
      })
    } catch (e) {
      throw new InfrastructureError('Failed to connect to Hugging Face API', e)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.error || body?.message || `HTTP ${res.status}`
      throw new InfrastructureError(`Hugging Face API error (${res.status}): ${JSON.stringify(msg)}`)
    }

    const data = await res.json()

    // HF OpenAI-compatible endpoint returns usage similar to OpenAI
    const usage = data.usage
    const tokens: TokenUsage | null = usage
      ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        }
      : null

    if (tokens) {
      console.log(`[hf-adapter] Tokens — prompt: ${tokens.promptTokens}, completion: ${tokens.completionTokens}, total: ${tokens.totalTokens}`)
    }

    const text = data.choices?.[0]?.message?.content
    if (!text) {
      throw new InfrastructureError(`Hugging Face returned no content: ${JSON.stringify(data)}`)
    }

    let course: Course
    try {
      course = JSON.parse(text)
    } catch (e) {
      throw new InfrastructureError(`Failed to parse Hugging Face JSON response: ${text.slice(0, 500)}`, e)
    }

    if (!course.chapters || !Array.isArray(course.chapters)) {
      throw new InfrastructureError('Invalid course structure: missing chapters array')
    }

    course.chapters = course.chapters.map(ch => ({
      ...ch,
      lessons: ch.lessons || (ch as any).lesson || [],
    }))

    return { course, tokens }
  }

  async generateDiagnosticQuiz(markdown: string): Promise<{ quiz: DiagnosticQuiz; tokens: TokenUsage | null }> {
    if (!this.apiKey) {
      throw new InfrastructureError('Missing HUGGINGFACE_API_KEY')
    }

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
            { role: 'user', content: markdown },
          ],
        }),
      })
    } catch (e) {
      throw new InfrastructureError('Failed to connect to Hugging Face API for diagnostic quiz', e)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.error || body?.message || `HTTP ${res.status}`
      throw new InfrastructureError(`Hugging Face API error (${res.status}): ${JSON.stringify(msg)}`)
    }

    const data = await res.json()

    const usage = data.usage
    const tokens: TokenUsage | null = usage
      ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        }
      : null

    const text = data.choices?.[0]?.message?.content
    if (!text) {
      throw new InfrastructureError(`Hugging Face returned no content for diagnostic quiz: ${JSON.stringify(data)}`)
    }

    let quiz: DiagnosticQuiz
    try {
      quiz = JSON.parse(text)
    } catch (e) {
      throw new InfrastructureError(`Failed to parse Hugging Face JSON response for diagnostic quiz: ${text.slice(0, 500)}`, e)
    }

    return { quiz, tokens }
  }
}
