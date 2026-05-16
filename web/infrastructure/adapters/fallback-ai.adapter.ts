import { IAiService, TokenUsage, ContentChunk } from '@/core/ports/ai.port'
import type { Course, ChapterContent, DiagnosticQuiz } from '@/core/models/learning-model'
import { logger } from '@/infrastructure/di/logger.di'

export class ChainAiAdapter implements IAiService {
  constructor(private adapters: IAiService[]) {
    if (adapters.length === 0) {
      logger.warn('[ChainAiAdapter] No AI adapters provided; API calls will fail')
    }
  }

  async generateCourse(markdown: string): Promise<{ course: Course; tokens: TokenUsage | null }> {
    if (this.adapters.length === 0) {
      throw new Error(
        'No AI providers configured.\n' +
        'Configure at least one: OPENAI_API_KEY, DEEPSEEK_API_KEY, GEMINI_API_KEY, or HUGGINGFACE_API_KEY'
      )
    }
    
    const errors: { adapter: string; error: string }[] = [];
    
    for (const adapter of this.adapters) {
      try {
        const name = adapter.constructor.name
        logger.info('[ChainAiAdapter] trying AI provider', { provider: name })
        return await adapter.generateCourse(markdown)
      } catch (e: any) {
        const errorMsg = e?.message || String(e);
        logger.warn('[ChainAiAdapter] provider failed', { provider: adapter.constructor.name, error: errorMsg })
        errors.push({ 
          adapter: adapter.constructor.name, 
          error: errorMsg 
        });
      }
    }
    
    // Provide detailed error message showing all failures
    const errorSummary = errors
      .map(e => `${e.adapter}: ${e.error}`)
      .join('\n');
    
    throw new Error(
      `All AI adapters failed.\n\nAttempted providers:\n${errorSummary}\n\n` +
      `Ensure at least one of these is configured: OPENAI_API_KEY, DEEPSEEK_API_KEY, GEMINI_API_KEY, or HUGGINGFACE_API_KEY`
    )
  }

  async generateChapterContent(input: string): Promise<ChapterContent> {
    if (this.adapters.length === 0) {
      throw new Error(
        'No AI providers configured.\n' +
        'Configure at least one: OPENAI_API_KEY, DEEPSEEK_API_KEY, GEMINI_API_KEY, or HUGGINGFACE_API_KEY'
      )
    }

    const errors: { adapter: string; error: string }[] = []

    for (const adapter of this.adapters) {
      try {
        const name = adapter.constructor.name
        logger.info('[ChainAiAdapter] trying AI provider for chapter content', { provider: name })
        return await adapter.generateChapterContent(input)
      } catch (e: any) {
        const errorMsg = e?.message || String(e)
        logger.warn('[ChainAiAdapter] provider failed chapter content', { provider: adapter.constructor.name, error: errorMsg })
        errors.push({ adapter: adapter.constructor.name, error: errorMsg })
      }
    }

    const errorSummary = errors.map(e => `${e.adapter}: ${e.error}`).join('\n')
    throw new Error(
      `All AI adapters failed for chapter content.\n\nAttempted providers:\n${errorSummary}`
    )
  }

  async generateDiagnosticQuiz(chunks: ContentChunk[]): Promise<{ quiz: DiagnosticQuiz; tokens: TokenUsage | null }> {
    if (this.adapters.length === 0) {
      throw new Error(
        'No AI providers configured.\n' +
        'Configure at least one: OPENAI_API_KEY, DEEPSEEK_API_KEY, GEMINI_API_KEY, or HUGGINGFACE_API_KEY'
      )
    }
    
    const errors: { adapter: string; error: string }[] = [];
    
    for (const adapter of this.adapters) {
      try {
        const name = adapter.constructor.name
        logger.info('[ChainAiAdapter] trying AI provider for diagnostic', { provider: name })
        return await adapter.generateDiagnosticQuiz(chunks)
      } catch (e: any) {
        const errorMsg = e?.message || String(e);
        logger.warn('[ChainAiAdapter] provider failed diagnostic', { provider: adapter.constructor.name, error: errorMsg })
        errors.push({ 
          adapter: adapter.constructor.name, 
          error: errorMsg 
        });
      }
    }
    
    const errorSummary = errors
      .map(e => `${e.adapter}: ${e.error}`)
      .join('\n');
    
    throw new Error(
      `All AI adapters failed diagnostic.\n\nAttempted providers:\n${errorSummary}`
    )
  }
}
