import { IAiService, TokenUsage } from '@/core/ports/ai.port'
import type { Course } from '@/core/models/learning-model'

export class ChainAiAdapter implements IAiService {
  constructor(private adapters: IAiService[]) {
    if (adapters.length === 0) {
      console.warn('[ChainAiAdapter] No AI adapters provided!')
    }
  }

  async generateCourse(markdown: string): Promise<{ course: Course; tokens: TokenUsage | null }> {
    let lastError: unknown;
    for (const adapter of this.adapters) {
      try {
        const name = adapter.constructor.name
        console.log(`[ChainAiAdapter] Trying AI provider: ${name}`)
        return await adapter.generateCourse(markdown)
      } catch (e) {
        console.warn(`[ChainAiAdapter] Provider ${adapter.constructor.name} failed:`, e)
        lastError = e
      }
    }
    throw new Error(`All AI adapters failed. Last error: ${lastError}`)
  }
}
