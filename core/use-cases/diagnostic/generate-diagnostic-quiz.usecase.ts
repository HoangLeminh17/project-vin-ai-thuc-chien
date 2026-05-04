import { IAiService } from '../../ports/ai.port'
import { DiagnosticQuiz } from '../../models/learning-model'

export class GenerateDiagnosticQuizUseCase {
  constructor(private readonly aiService: IAiService) {}

  async execute(markdownContent: string): Promise<DiagnosticQuiz> {
    const { quiz } = await this.aiService.generateDiagnosticQuiz(markdownContent);
    return quiz;
  }
}
