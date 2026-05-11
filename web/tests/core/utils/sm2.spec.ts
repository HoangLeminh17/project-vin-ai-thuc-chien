import { describe, it, expect } from 'vitest';
import { calculateNextProgress, initializeProgress } from '@/core/utils/sm2';
import { CardProgress } from '@/core/entities/card-progress.entity';

describe('SM-2 Algorithm', () => {
  const mockNow = new Date('2024-01-01T12:00:00Z');

  it('should initialize progress correctly', () => {
    const progress = initializeProgress('user1', 'card1');
    expect(progress.userId).toBe('user1');
    expect(progress.cardId).toBe('card1');
    expect(progress.easeFactor).toBe(2.5);
    expect(progress.repetitions).toBe(0);
    expect(progress.status).toBe('NEW');
  });

  it('should handle "Again" (rating 0) by resetting interval', () => {
    const current: CardProgress = {
      id: '1',
      cardId: 'c1',
      userId: 'u1',
      interval: 10,
      easeFactor: 2.5,
      repetitions: 5,
      nextReviewDate: mockNow,
      status: 'REVIEW',
    };

    const next = calculateNextProgress(current, 0, mockNow);
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(0);
    expect(next.status).toBe('LEARNING');
    expect(next.easeFactor).toBe(2.3); // 2.5 - 0.2
  });

  it('should handle "Good" (rating 2) correctly', () => {
    const current = initializeProgress('u1', 'c1');
    
    // First review
    let next = calculateNextProgress(current, 2, mockNow);
    expect(next.interval).toBe(1);
    expect(next.repetitions).toBe(1);

    // Second review
    next = calculateNextProgress(next, 2, mockNow);
    expect(next.interval).toBe(6);
    expect(next.repetitions).toBe(2);

    // Third review
    next = calculateNextProgress(next, 2, mockNow);
    expect(next.interval).toBe(Math.round(6 * 2.5)); // 15
    expect(next.status).toBe('REVIEW');
  });

  it('should increase easeFactor for "Easy" (rating 3)', () => {
    const current = initializeProgress('u1', 'c1');
    const next = calculateNextProgress(current, 3, mockNow);
    expect(next.easeFactor).toBe(2.65); // 2.5 + 0.15
  });
});
