import { describe, it, expect, vi } from 'vitest';
import { GetPrioritizedDueCardsUseCase } from '@/core/use-cases/spaced-repetition/get-prioritized-due-cards.usecase';

describe('GetPrioritizedDueCardsUseCase', () => {
  const mockDueCards = [
    { id: '1', topic: 'topic-c' },
    { id: '2', topic: 'topic-a' },
    { id: '3', topic: 'topic-b' },
    { id: '4', topic: undefined }, // No topic
  ];

  it('should return raw due cards if no UKT service is provided', async () => {
    const mockRepo = {
      getDueCards: vi.fn().mockResolvedValue(mockDueCards),
    };

    const useCase = new GetPrioritizedDueCardsUseCase(mockRepo as any);
    const result = await useCase.execute('user1');

    expect(result).toEqual(mockDueCards);
  });

  it('should sort cards based on UKT priority order', async () => {
    const mockRepo = {
      getDueCards: vi.fn().mockResolvedValue([...mockDueCards]),
    };

    const mockUktService = {
      predict: vi.fn().mockResolvedValue({
        priority_order: ['topic-a', 'topic-b', 'topic-c']
      }),
      update: vi.fn()
    };

    const useCase = new GetPrioritizedDueCardsUseCase(mockRepo as any, mockUktService as any);
    const result = await useCase.execute('user1');

    // Expected order: topic-a (id: 2), topic-b (id: 3), topic-c (id: 1), undefined (id: 4)
    expect(result[0].id).toBe('2');
    expect(result[1].id).toBe('3');
    expect(result[2].id).toBe('1');
    expect(result[3].id).toBe('4');
    
    expect(mockUktService.predict).toHaveBeenCalledWith({
      student_id: 'user1',
      interactions: [],
      total_minutes: 0
    });
  });

  it('should fallback to original order if UKT predict fails', async () => {
    const mockRepo = {
      getDueCards: vi.fn().mockResolvedValue([...mockDueCards]),
    };

    const mockUktService = {
      predict: vi.fn().mockRejectedValue(new Error('UKT timeout')),
      update: vi.fn()
    };

    const useCase = new GetPrioritizedDueCardsUseCase(mockRepo as any, mockUktService as any);
    const result = await useCase.execute('user1');

    expect(result).toEqual(mockDueCards);
  });
});
