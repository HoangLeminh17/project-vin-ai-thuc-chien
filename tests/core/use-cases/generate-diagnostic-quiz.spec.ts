import { describe, it, expect, vi } from 'vitest';
import { GenerateDiagnosticQuizUseCase } from '@/core/use-cases/diagnostic/generate-diagnostic-quiz.usecase';

describe('GenerateDiagnosticQuizUseCase', () => {
  it('should call aiService and return the generated quiz', async () => {
    const mockQuiz = {
      questions: [
        {
          question: 'What is Test?',
          options: ['A', 'B', 'C', 'D'],
          answer: 0,
          explanation: 'Because A',
          topic: 'testing'
        }
      ]
    };

    const mockAiService = {
      generateCourse: vi.fn(),
      generateDiagnosticQuiz: vi.fn().mockResolvedValue({ quiz: mockQuiz, tokens: null })
    };

    const useCase = new GenerateDiagnosticQuizUseCase(mockAiService);
    
    const result = await useCase.execute('test markdown content');

    expect(mockAiService.generateDiagnosticQuiz).toHaveBeenCalledWith('test markdown content');
    expect(result).toEqual({ quiz: mockQuiz, tokens: null });
  });
});
