export type CardStatus = 'NEW' | 'LEARNING' | 'REVIEW';

export type Rating = 0 | 1 | 2 | 3; // 0: Again, 1: Hard, 2: Good, 3: Easy

export interface CardProgress {
  id: string;
  cardId: string;
  userId: string;
  interval: number; // in days
  easeFactor: number;
  repetitions: number;
  nextReviewDate: Date;
  status: CardStatus;
  lastReviewedAt?: Date;
  question?: string; // Cache content for easy retrieval in SRS
  answer?: string;
  topic?: string; // Knowledge Component ID for UKT
  kcId?: string;
  moduleId?: string;
}
