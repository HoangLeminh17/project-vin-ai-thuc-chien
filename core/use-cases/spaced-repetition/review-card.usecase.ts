import { IProgressRepository } from '../../ports/progress-repository.port';
import { Rating } from '../../entities/card-progress.entity';
import { calculateNextProgress, initializeProgress } from '../../utils/sm2';

export class ReviewCardUseCase {
  constructor(private readonly progressRepository: IProgressRepository) {}

  async execute(userId: string, cardId: string, rating: Rating, question?: string, answer?: string) {
    // 1. Get current progress or initialize new
    let progress = await this.progressRepository.getByCardId(userId, cardId);
    
    if (!progress) {
      progress = initializeProgress(userId, cardId);
      progress.question = question;
      progress.answer = answer;
    }

    // 2. Calculate next state
    const nextProgress = calculateNextProgress(progress, rating);

    // 3. Save
    await this.progressRepository.save(nextProgress);

    return nextProgress;
  }
}
