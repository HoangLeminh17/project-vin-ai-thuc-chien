import { IAiService, TokenUsage, ContentChunk } from '@/core/ports/ai.port'
import type { Course, DiagnosticQuiz } from '@/core/models/learning-model'

export class ChainAiAdapter implements IAiService {
  constructor(private adapters: IAiService[]) {
    if (adapters.length === 0) {
      console.warn('[ChainAiAdapter] ⚠️  No AI adapters provided! API calls will fail.')
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
        console.log(`[ChainAiAdapter] Trying AI provider: ${name}`)
        return await adapter.generateCourse(markdown)
      } catch (e: any) {
        const errorMsg = e?.message || String(e);
        console.warn(`[ChainAiAdapter] Provider ${adapter.constructor.name} failed: ${errorMsg}`)
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
        console.log(`[ChainAiAdapter] Trying AI provider for diagnostic: ${name}`)
        return await adapter.generateDiagnosticQuiz(chunks)
      } catch (e: any) {
        const errorMsg = e?.message || String(e);
        console.warn(`[ChainAiAdapter] Provider ${adapter.constructor.name} failed diagnostic: ${errorMsg}`)
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
