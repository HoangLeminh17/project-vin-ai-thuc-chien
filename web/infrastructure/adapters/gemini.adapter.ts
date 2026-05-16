import { IAiService, TokenUsage, ContentChunk } from '@/core/ports/ai.port'
import { PLANNER_PROMPT, STAGE2_CHAPTER_PROMPT, DIAGNOSTIC_QUIZ_PROMPT } from '@/lib/prompts'
import { formatDiagnosticChunk } from '@/lib/diagnostic-format'
import type { Course, ChapterContent, DiagnosticQuiz } from '@/core/models/learning-model'
import { InfrastructureError } from '@/core/errors/domain-error'
import { logger } from '@/infrastructure/di/logger.di'

export interface GeminiConfig {
  apiKey: string
  model?: string
  baseUrl?: string
}

export class GeminiAdapter implements IAiService {
  private readonly apiKey: string
  private readonly model: string
  private readonly baseUrl: string

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey
    this.model = config.model || 'gemini-2.0-flash'
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'
  }

  async generateCourse(markdown: string): Promise<{ course: Course; tokens: TokenUsage | null }> {
    if (!this.apiKey) {
      throw new InfrastructureError('Missing GEMINI_API_KEY')
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`

    let res: Response
    try {
      res = await fetch(url, {
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
              parts: [{ text: markdown }],
            },
          ],
        }),
      })
    } catch (e) {
      throw new InfrastructureError('Failed to connect to Gemini API', e)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
      throw new InfrastructureError(`Gemini API error (${res.status}): ${msg}`)
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
      logger.info('[gemini-adapter] token usage', tokens)
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim()

    if (!text) {
      throw new InfrastructureError(`Gemini returned no content: ${JSON.stringify(data)}`)
    }

    let course: Course
    try {
      course = JSON.parse(text);
    } catch (e) {
      logger.warn('[GeminiAdapter] JSON parse error', { textPreview: text.slice(0, 2000) })
      throw new InfrastructureError('Failed to process AI service response', e);
    }

    if (!course.chapters || !Array.isArray(course.chapters)) {
      throw new InfrastructureError('Invalid course structure: missing chapters array')
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

  async generateChapterContent(input: string): Promise<ChapterContent> {
    if (!this.apiKey) {
      throw new InfrastructureError('Missing GEMINI_API_KEY')
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: STAGE2_CHAPTER_PROMPT }] },
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
          contents: [{ role: 'user', parts: [{ text: input }] }],
        }),
      })
    } catch (e) {
      throw new InfrastructureError('Failed to connect to Gemini API for chapter content', e)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
      throw new InfrastructureError(`Gemini API error (${res.status}): ${msg}`)
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim()
    if (!text) throw new InfrastructureError('Gemini returned no content for chapter generation')

    const raw: ChapterContent = JSON.parse(text)
    if (!Array.isArray(raw.lessons) || !raw.quiz) {
      throw new InfrastructureError('Invalid chapter content structure from Gemini')
    }
    return raw
  }

  async generateDiagnosticQuiz(chunks: ContentChunk[]): Promise<{ quiz: DiagnosticQuiz; tokens: TokenUsage | null }> {
    if (!this.apiKey) {
      throw new InfrastructureError('Missing GEMINI_API_KEY')
    }

    const formattedContent = chunks
      .map(formatDiagnosticChunk)
      .join('\n\n---\n\n')

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: DIAGNOSTIC_QUIZ_PROMPT }],
          },
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: formattedContent }],
            },
          ],
        }),
      })
    } catch (e) {
      throw new InfrastructureError('Failed to connect to Gemini API', e)
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      const msg = body?.error?.message?.split('\n')[0] || `HTTP ${res.status}`
      throw new InfrastructureError(`Gemini API error (${res.status}): ${msg}`)
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

    const text = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim()

    if (!text) {
      throw new InfrastructureError(`Gemini returned no content: ${JSON.stringify(data)}`)
    }

    let quiz: DiagnosticQuiz
    try {
      quiz = JSON.parse(text)
    } catch (e) {
      throw new InfrastructureError(`Failed to parse Gemini JSON response for diagnostic quiz: ${text.slice(0, 500)}`, e)
    }

    return { quiz, tokens }
  }
}
