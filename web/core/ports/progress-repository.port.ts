import { CardProgress } from '../entities/card-progress.entity';

export interface ProgressRepoStats {
  /** Docs in LEARNING status — cards that lapsed and are being re-learned. */
  learning: number;
  /** Docs with nextReviewDate <= now. */
  due: number;
  /** Total user_progress docs the user has — i.e. cards they have reviewed at least once. */
  reviewed: number;
  /** Current SRS streak in days. */
  streak: number;
}

export interface IProgressRepository {
  getByCardId(userId: string, cardId: string): Promise<CardProgress | null>;
  save(progress: CardProgress): Promise<void>;
  getDueCards(userId: string, date: Date): Promise<CardProgress[]>;
  getAllForUser(userId: string): Promise<CardProgress[]>;
  getStats(userId: string): Promise<ProgressRepoStats>;
}
