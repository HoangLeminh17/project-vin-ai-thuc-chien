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
    // Sử dụng Hugging Face Router API (OpenAI compatible)
    this.baseUrl = 'https://router.huggingface.co/v1/chat/completions'
    this.timeoutMs = config.timeoutMs || 60000
  }

  /**
   * Phương thức chung để gọi HuggingFace Router API (OpenAI Compatible)
   */
  private async safeFetch(systemPrompt: string, userContent: string): Promise<{ text: string; tokens: TokenUsage | null }> {
    const url = this.baseUrl
    console.log(`[HuggingFace] Calling Router API for model: ${this.model}`)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          max_tokens: 8192,
          temperature: 0.2,
          stream: false
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        if (errorText.trim().startsWith('<!DOCTYPE')) {
          throw new InfrastructureError(`Hugging Face Router returned HTML. Status: ${response.status}`)
        }
        throw new InfrastructureError(`Hugging Face API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content?.trim()

      if (!text) {
        throw new InfrastructureError('Hugging Face returned empty content')
      }

      const usage = data.usage
      const tokens: TokenUsage | null = usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      } : null

      return { text, tokens }
    } catch (e: any) {
      throw e instanceof InfrastructureError ? e : new InfrastructureError('Network failure calling Hugging Face', e)
    }
  }

  /**
   * Tiện ích bóc tách JSON từ chuỗi có thể chứa Markdown
   */
  private parseSecureJson<T>(rawText: string): T {
    try {
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

  async generateDiagnosticQuiz(chunks: ContentChunk[]): Promise<{ quiz: DiagnosticQuiz; tokens: TokenUsage | null }> {
    const maxChars = 15000;
    let currentChars = 0;

    const formattedContent = chunks
      .filter(chunk => {
        if (currentChars >= maxChars) return false;
        currentChars += chunk.text.length;
        return true;
      })
      .map(chunk => `[ID:${chunk.id}] ${chunk.text}`)
      .join('\n');

    const { text, tokens } = await this.safeFetch(DIAGNOSTIC_QUIZ_PROMPT, formattedContent)
    const quiz = this.parseSecureJson<DiagnosticQuiz>(text)
    return { quiz, tokens }
  }
}
