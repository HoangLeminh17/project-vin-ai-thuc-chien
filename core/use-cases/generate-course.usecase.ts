import { IAiService, TokenUsage } from '../ports/ai.port'
import type { Course } from '../models/learning-model'
import { IUsageRepository } from '../ports/usage-repository.port'

export class GenerateCourseUseCase {
  constructor(
    private readonly aiService: IAiService,
    private readonly usageRepo?: IUsageRepository
  ) {}

  async execute(markdown: string, userId?: string): Promise<{ 
    course: Course; 
    tokens: TokenUsage | null;
  }> {
    if (!markdown || typeof markdown !== 'string') {
      throw new Error('Missing or invalid markdown');
    }
    
    const result = await this.aiService.generateCourse(markdown);
    
    if (result.tokens && this.usageRepo) {
      this.usageRepo.saveTokenUsage({
        timestamp: new Date().toISOString(),
        model: (this.aiService as any).model || 'unknown',
        promptTokens: result.tokens.promptTokens,
        completionTokens: result.tokens.completionTokens,
        totalTokens: result.tokens.totalTokens,
        type: 'course_generation',
        userId
      }).catch(() => {});
    }

    return result;
  }
}
