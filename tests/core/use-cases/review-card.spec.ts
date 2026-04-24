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
});
