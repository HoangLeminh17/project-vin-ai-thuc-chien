import { IAiService, TokenUsage, ContentChunk } from '../../ports/ai.port'
import { DiagnosticQuiz } from '../../models/learning-model'
import { IUsageRepository } from '../../ports/usage-repository.port'

export class GenerateDiagnosticQuizUseCase {
  constructor(
    private readonly aiService: IAiService,
    private readonly usageRepo?: IUsageRepository
  ) {}

  async execute(chunks: ContentChunk[], userId?: string): Promise<{ quiz: DiagnosticQuiz; tokens: TokenUsage | null }> {
    const result = await this.aiService.generateDiagnosticQuiz(chunks);
    
    if (result.tokens && this.usageRepo) {
      this.usageRepo.saveTokenUsage({
        timestamp: new Date().toISOString(),
        model: (this.aiService as any).model || 'unknown',
        promptTokens: result.tokens.promptTokens,
        completionTokens: result.tokens.completionTokens,
        totalTokens: result.tokens.totalTokens,
        type: 'quiz_generation',
        userId
      }).catch(() => {});
    }

    return result;
  }
}
