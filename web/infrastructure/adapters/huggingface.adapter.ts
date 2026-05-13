import { IAiService, TokenUsage, ContentChunk } from '@/core/ports/ai.port'
import { PLANNER_PROMPT_LIGHTWEIGHT, DIAGNOSTIC_QUIZ_PROMPT_LIGHTWEIGHT } from '@/lib/prompts'
import { formatDiagnosticChunk } from '@/lib/diagnostic-format'
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
    // HuggingFace Router has 8192 token limit
    // System prompt is ~600 tokens, so we have ~5600 tokens for content + buffer
    // Conservative estimate: 1 token per 3.5 chars (accounting for system prompt overhead)
    const PLANNER_TOKENS = 600;
    const MAX_TOTAL_TOKENS = 8000;
    const RESPONSE_BUFFER = 1000;
    const maxContentTokens = MAX_TOTAL_TOKENS - PLANNER_TOKENS - RESPONSE_BUFFER;
    const MAX_CHARS = Math.max(maxContentTokens * 3, 5000); // at least 5k chars
    
    const truncatedMarkdown = markdown.length > MAX_CHARS 
      ? markdown.slice(0, MAX_CHARS) + '\n\n[CONTENT TRUNCATED DUE TO LENGTH]' 
      : markdown;

    const { text, tokens } = await this.safeFetch(PLANNER_PROMPT_LIGHTWEIGHT, truncatedMarkdown)
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
    // HuggingFace has 8192 token limit
    // Lightweight prompt ~300 tokens, need buffer for response
    // Safe limit: 4000 chars (~1000 tokens) for content
    const maxChars = 3500;
    let currentChars = 0;

    const formattedContent = chunks
      .filter(chunk => {
        if (currentChars >= maxChars) return false;
        currentChars += chunk.id.length + chunk.text.length;
        return true;
      })
      .map(formatDiagnosticChunk)
      .join('\n\n---\n\n');

    const { text, tokens } = await this.safeFetch(DIAGNOSTIC_QUIZ_PROMPT_LIGHTWEIGHT, formattedContent)
    const quiz = this.parseSecureJson<DiagnosticQuiz>(text)
    return { quiz, tokens }
  }
}
