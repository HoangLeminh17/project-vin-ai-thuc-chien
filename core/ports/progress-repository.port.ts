import { CardProgress } from '../entities/card-progress.entity';

export interface IProgressRepository {
  getByCardId(userId: string, cardId: string): Promise<CardProgress | null>;
  save(progress: CardProgress): Promise<void>;
  getDueCards(userId: string, date: Date): Promise<CardProgress[]>;
  getAllForUser(userId: string): Promise<CardProgress[]>;
  getStats(userId: string): Promise<{
    new: number;
    learning: number;
    due: number;
  }>;
}
