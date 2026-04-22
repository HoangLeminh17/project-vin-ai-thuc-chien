import { IAiService, TokenUsage } from '../ports/ai.port'
import type { Course } from '../models/learning-model'

export class GenerateCourseUseCase {
  constructor(private readonly aiService: IAiService) {}

  async execute(markdown: string): Promise<{ 
    course: Course; 
    tokens: TokenUsage | null;
  }> {
    if (!markdown || typeof markdown !== 'string') {
      throw new Error('Missing or invalid markdown');
    }
    
    return await this.aiService.generateCourse(markdown);
  }
}
