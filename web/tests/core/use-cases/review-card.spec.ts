import { describe, it, expect, vi } from 'vitest';
import { ReviewCardUseCase } from '@/core/use-cases/spaced-repetition/review-card.usecase';

describe('ReviewCardUseCase', () => {
  it('should initialize and save progress if it does not exist', async () => {
    // 1. Mock Repository
    const mockRepo = {
      getByCardId: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      getDueCards: vi.fn(),
      getStats: vi.fn(),
    };

    const useCase = new ReviewCardUseCase(mockRepo as any);
    
    // 2. Execute
    const result = await useCase.execute('user1', 'card1', 2, 'Is this a test?', 'Yes');

    // 3. Expect
    expect(mockRepo.getByCardId).toHaveBeenCalledWith('user1', 'card1');
    expect(mockRepo.save).toHaveBeenCalled();
    expect(result.question).toBe('Is this a test?');
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
  });

  it('should update existing progress', async () => {
    const existingProgress = {
      id: 'p1',
      userId: 'user1',
      cardId: 'card1',
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      nextReviewDate: new Date(),
      status: 'LEARNING' as const,
    };

    const mockRepo = {
      getByCardId: vi.fn().mockResolvedValue(existingProgress),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new ReviewCardUseCase(mockRepo as any);
    
    const result = await useCase.execute('user1', 'card1', 2);

    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);
    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p1',
      interval: 6,
    }));
  });

  it('should call UKT update if service is provided and topic exists', async () => {
    const mockRepo = {
      getByCardId: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };

    const mockUktService = {
      predict: vi.fn(),
      update: vi.fn().mockResolvedValue({ kc_id: 'topic1', updated_mu: 1, updated_sigma: 0.1, p_correct: 0.8 })
    };

    const useCase = new ReviewCardUseCase(mockRepo as any, mockUktService as any);
    
    // Test with rating 1 (Hard) -> uktRating 'hard'
    const result = await useCase.execute('user1', 'card1', 1, 'Q', 'A', 'topic1', 'module1');

    expect(mockUktService.update).toHaveBeenCalledWith({
      student_id: 'user1',
      kc_id: 'topic1',
      rating: 'hard'
    });
    expect(result.kcId).toBe('topic1');
    expect(result.moduleId).toBe('module1');

    // Test with rating 3 (Easy) -> uktRating 'easy'
    await useCase.execute('user1', 'card2', 3, 'Q2', 'A2', 'topic2');

    expect(mockUktService.update).toHaveBeenCalledWith({
      student_id: 'user1',
      kc_id: 'topic2',
      rating: 'easy'
    });
  });
});
