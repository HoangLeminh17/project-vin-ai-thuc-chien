import { IProgressRepository } from '../../ports/progress-repository.port';
import { CardStatus } from '../../entities/card-progress.entity';

export interface ProgressMapEntry {
  status: CardStatus;
  nextReviewDate: string;
  lastReviewedAt?: string;
  isDue: boolean;
}

export type ProgressMap = Record<string, ProgressMapEntry>;

export class GetProgressMapUseCase {
  constructor(private readonly progressRepository: IProgressRepository) {}

  async execute(userId: string): Promise<ProgressMap> {
    const rows = await this.progressRepository.getAllForUser(userId);
    const now = new Date();
    const out: ProgressMap = {};
    for (const r of rows) {
      out[r.cardId] = {
        status: r.status,
        nextReviewDate: r.nextReviewDate.toISOString(),
        lastReviewedAt: r.lastReviewedAt?.toISOString(),
        isDue: r.nextReviewDate <= now,
      };
    }
    return out;
  }
}
