import { describe, it, expect, vi } from 'vitest';
import { GetDueCardsUseCase } from '@/core/use-cases/spaced-repetition/get-due-cards.usecase';

describe('GetDueCardsUseCase', () => {
  it('should call repository with current date', async () => {
    const mockRepo = {
      getDueCards: vi.fn().mockResolvedValue([]),
    };

    const useCase = new GetDueCardsUseCase(mockRepo as any);
    await useCase.execute('user1');

    expect(mockRepo.getDueCards).toHaveBeenCalledWith('user1', expect.any(Date));
  });
});
