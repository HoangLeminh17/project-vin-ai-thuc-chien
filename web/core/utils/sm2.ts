import { CardProgress, Rating } from '../entities/card-progress.entity';

/**
 * Simplified SM-2 Algorithm for Spaced Repetition
 * Reference: https://supermemo.guru/wiki/SM-2
 */
export function calculateNextProgress(
  current: CardProgress,
  rating: Rating,
  now: Date = new Date()
): CardProgress {
  let { interval, easeFactor, repetitions, status } = current;

  // 1. Update Ease Factor (Simplified)
  // Mapping Rating (0-3) to Quality (0-5) equivalent for factor adjustment
  // rating 0 (Again) -> -0.2
  // rating 1 (Hard) -> -0.15
  // rating 2 (Good) -> 0
  // rating 3 (Easy) -> +0.15
  const factorAdjustment = [ -0.2, -0.15, 0, 0.15 ][rating];
  easeFactor = Math.max(1.3, easeFactor + factorAdjustment);

  // 2. Update Interval and Repetitions
  if (rating === 0) {
    // Again: Start over
    repetitions = 0;
    interval = 1;
    status = 'LEARNING';
  } else {
    // Hard, Good, or Easy
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    
    repetitions++;
    status = interval > 7 ? 'REVIEW' : 'LEARNING';
  }

  // 3. Calculate Next Review Date
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    ...current,
    interval,
    easeFactor,
    repetitions,
    status,
    nextReviewDate,
    lastReviewedAt: now,
  };
}

export function initializeProgress(userId: string, cardId: string): CardProgress {
  return {
    id: crypto.randomUUID(), // Or handled by DB
    cardId,
    userId,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewDate: new Date(),
    status: 'NEW',
  };
}
