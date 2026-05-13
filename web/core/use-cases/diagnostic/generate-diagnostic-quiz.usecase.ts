import { IAiService, TokenUsage, ContentChunk } from '../../ports/ai.port'
import { DiagnosticQuiz } from '../../models/learning-model'
import { IUsageRepository } from '../../ports/usage-repository.port'

function normalizeDiagnosticQuiz(quiz: DiagnosticQuiz, chunks: ContentChunk[]): DiagnosticQuiz {
  const orderedIds = chunks.map(chunk => chunk.id).filter(Boolean)
  if (orderedIds.length === 0) return quiz

  const validIds = new Set(orderedIds)
  const chunkById = new Map(chunks.map(chunk => [chunk.id, chunk]))
  const usedIds = new Set<string>()

  return {
    ...quiz,
    questions: quiz.questions.map((question, index) => {
      const sourceId = question.source_chunk_id?.trim()
      const indexedFallback = orderedIds[index]
      const unusedFallback = orderedIds.find(id => !usedIds.has(id))

      const normalizedId = sourceId && validIds.has(sourceId) && (!usedIds.has(sourceId) || usedIds.size >= validIds.size)
        ? sourceId
        : indexedFallback && !usedIds.has(indexedFallback)
          ? indexedFallback
          : unusedFallback ?? sourceId

      if (normalizedId && validIds.has(normalizedId)) {
        usedIds.add(normalizedId)
      }

      const sourceChunk = normalizedId ? chunkById.get(normalizedId) : undefined

      return {
        ...question,
        topic: sourceChunk?.kc_name ?? question.topic,
        kc_id: sourceChunk?.kc_id ?? question.kc_id,
        kc_name: sourceChunk?.kc_name ?? question.kc_name,
        module_id: sourceChunk?.module_id ?? question.module_id,
        module_name: sourceChunk?.module_name ?? question.module_name,
        source_chunk_id: normalizedId,
      }
    }),
  }
}

export class GenerateDiagnosticQuizUseCase {
  constructor(
    private readonly aiService: IAiService,
    private readonly usageRepo?: IUsageRepository
  ) {}

  async execute(chunks: ContentChunk[], userId?: string): Promise<{ quiz: DiagnosticQuiz; tokens: TokenUsage | null }> {
    const result = await this.aiService.generateDiagnosticQuiz(chunks);
    const quiz = normalizeDiagnosticQuiz(result.quiz, chunks);
    
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

    return { quiz, tokens: result.tokens };
  }
}
