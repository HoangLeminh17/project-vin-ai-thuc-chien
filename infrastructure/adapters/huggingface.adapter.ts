import { IAiService, TokenUsage, ContentChunk } from '@/core/ports/ai.port'
import { PLANNER_PROMPT, DIAGNOSTIC_QUIZ_PROMPT } from '@/lib/prompts'
import type { Course, DiagnosticQuiz } from '@/core/models/learning-model'
import { InfrastructureError } from '@/core/errors/domain-error'

export interface HuggingFaceConfig {
  apiKey: string
  model?: string
  baseUrl?: string
  timeoutMs?: number
}

export class HuggingFaceAdapter implements IAiService {
  private readonly apiKey: string
  private readonly model: string
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(config: HuggingFaceConfig) {
    if (!config.apiKey) {
      throw new InfrastructureError('HUGGINGFACE_API_KEY is required at initialization')
    }
    this.apiKey = config.apiKey
    this.model = config.model || 'meta-llama/Llama-3.1-8B-Instruct'
    // Linh hoạt giữa Inference API chuẩn và Dedicated Endpoints
    this.baseUrl = config.baseUrl || `https://api-inference.huggingface.co/models/${this.model}/v1/chat/completions`
    this.timeoutMs = config.timeoutMs || 60000 // Mặc định 60s
  }

  /**
   * Phương thức chung để gọi HuggingFace Inference API
   */
  private async safeFetch(systemPrompt: string, userContent: string): Promise<{ text: string; tokens: TokenUsage | null }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const errorDetail = JSON.stringify(body?.error || body?.message || `HTTP ${res.status}`)
        throw new InfrastructureError(`Hugging Face API error (${res.status}): ${errorDetail}`)
      }

      const data = await res.json()
      const text = data.choices?.[0]?.message?.content
      if (!text) throw new InfrastructureError('Hugging Face returned empty content')

      const usage = data.usage
      const tokens = usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      } : null

      return { text, tokens }
    } catch (e: any) {
      if (e.name === 'AbortError') throw new InfrastructureError(`Hugging Face request timed out after ${this.timeoutMs}ms`)
      throw e instanceof InfrastructureError ? e : new InfrastructureError('Network failure calling Hugging Face', e)
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Tiện ích bóc tách JSON từ chuỗi có thể chứa Markdown
   */
  private parseSecureJson<T>(rawText: string): T {
    try {
      // Loại bỏ markdown code blocks nếu AI trả về nhầm
      const cleanJson = rawText.replace(/```json\n?|```/g, '').trim()
      return JSON.parse(cleanJson)
    } catch (e) {
      throw new InfrastructureError(`Failed to parse AI JSON response. Raw snippet: ${rawText.slice(0, 100)}...`, e)
    }
  }

  async generateCourse(markdown: string): Promise<{ course: Course; tokens: TokenUsage | null }> {
    const { text, tokens } = await this.safeFetch(PLANNER_PROMPT, markdown)
    const course = this.parseSecureJson<Course>(text)

    if (!course.chapters || !Array.isArray(course.chapters)) {
      throw new InfrastructureError('Invalid course structure: missing chapters')
    }

    // Đảm bảo tính nhất quán của schema
    course.chapters = course.chapters.map(ch => ({
      ...ch,
      lessons: (ch.lessons || (ch as any).lesson || []).map((lesson: any) => {
        // Heal outline: convert string[] to OutlinePoint[] if necessary
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

  async generateDiagnosticQuiz(chunks: ContentChunk[]): Promise<{ quiz: DiagnosticQuiz; tokens: TokenUsage | null }> {
    // Format chunks for AI to maintain traceability
    const formattedContent = chunks
      .map(chunk => `[[SOURCE_CHUNK_ID: ${chunk.id}]]\n${chunk.text}`)
      .join('\n\n---\n\n')

    const { text, tokens } = await this.safeFetch(DIAGNOSTIC_QUIZ_PROMPT, formattedContent)
    const quiz = this.parseSecureJson<DiagnosticQuiz>(text)
    return { quiz, tokens }
  }
}
