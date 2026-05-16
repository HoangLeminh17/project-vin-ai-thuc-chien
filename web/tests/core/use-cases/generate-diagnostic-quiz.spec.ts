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
          topic: 'testing',
          source_chunk_id: '1'
        }
      ]
    };

    const mockAiService = {
      generateCourse: vi.fn(),
      generateChapterContent: vi.fn(),
      generateDiagnosticQuiz: vi.fn().mockResolvedValue({ quiz: mockQuiz, tokens: null })
    };

    const useCase = new GenerateDiagnosticQuizUseCase(mockAiService);
    
    const chunks = [{ id: '1', text: 'test markdown content' }];
    const result = await useCase.execute(chunks);

    expect(mockAiService.generateDiagnosticQuiz).toHaveBeenCalledWith(chunks);
    expect(result).toEqual({ quiz: mockQuiz, tokens: null });
  });

  it('should assign source ids by chunk order when the AI omits them', async () => {
    const mockQuiz = {
      questions: [
        {
          question: 'Question A?',
          options: ['A', 'B', 'C', 'D'],
          answer: 0,
          explanation: 'Because A',
          topic: 'A'
        },
        {
          question: 'Question B?',
          options: ['A', 'B', 'C', 'D'],
          answer: 1,
          explanation: 'Because B',
          topic: 'B'
        }
      ]
    };

    const mockAiService = {
      generateCourse: vi.fn(),
      generateChapterContent: vi.fn(),
      generateDiagnosticQuiz: vi.fn().mockResolvedValue({ quiz: mockQuiz, tokens: null })
    };

    const useCase = new GenerateDiagnosticQuizUseCase(mockAiService);
    const chunks = [{ id: '0-0', text: 'A' }, { id: '0-1', text: 'B' }];
    const result = await useCase.execute(chunks);

    expect(result.quiz.questions.map(q => q.source_chunk_id)).toEqual(['0-0', '0-1']);
  });

  it('should replace invalid or duplicate source ids with valid lesson ids', async () => {
    const mockQuiz = {
      questions: [
        {
          question: 'Question A?',
          options: ['A', 'B', 'C', 'D'],
          answer: 0,
          explanation: 'Because A',
          topic: 'A',
          source_chunk_id: 'legacy-full'
        },
        {
          question: 'Question B?',
          options: ['A', 'B', 'C', 'D'],
          answer: 1,
          explanation: 'Because B',
          topic: 'B',
          source_chunk_id: '0-0'
        }
      ]
    };

    const mockAiService = {
      generateCourse: vi.fn(),
      generateChapterContent: vi.fn(),
      generateDiagnosticQuiz: vi.fn().mockResolvedValue({ quiz: mockQuiz, tokens: null })
    };

    const useCase = new GenerateDiagnosticQuizUseCase(mockAiService);
    const chunks = [{ id: '0-0', text: 'A' }, { id: '0-1', text: 'B' }];
    const result = await useCase.execute(chunks);

    expect(result.quiz.questions.map(q => q.source_chunk_id)).toEqual(['0-0', '0-1']);
  });

  it('should attach KC metadata from the source chunk instead of trusting AI topic text', async () => {
    const mockQuiz = {
      questions: [
        {
          question: 'Question A?',
          options: ['A', 'B', 'C', 'D'],
          answer: 0,
          explanation: 'Because A',
          topic: 'AI free text',
          kc_id: 'made.up',
          source_chunk_id: '0-0'
        }
      ]
    };

    const mockAiService = {
      generateCourse: vi.fn(),
      generateChapterContent: vi.fn(),
      generateDiagnosticQuiz: vi.fn().mockResolvedValue({ quiz: mockQuiz, tokens: null })
    };

    const useCase = new GenerateDiagnosticQuizUseCase(mockAiService);
    const chunks = [{
      id: '0-0',
      text: 'A',
      kc_id: 'physiology.homeostasis',
      kc_name: 'Homeostasis and feedback',
      module_id: 'physiology',
      module_name: 'Physiology'
    }];
    const result = await useCase.execute(chunks);

    expect(result.quiz.questions[0]).toMatchObject({
      topic: 'Homeostasis and feedback',
      kc_id: 'physiology.homeostasis',
      kc_name: 'Homeostasis and feedback',
      module_id: 'physiology',
      module_name: 'Physiology',
      source_chunk_id: '0-0'
    });
  });
});
