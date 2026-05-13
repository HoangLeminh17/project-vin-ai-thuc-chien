import { IProgressRepository } from '../../ports/progress-repository.port';
import { Rating } from '../../entities/card-progress.entity';
import { calculateNextProgress, initializeProgress } from '../../utils/sm2';
import { IUKTService } from '../../ports/ukt.port';

export class ReviewCardUseCase {
  constructor(
    private readonly progressRepository: IProgressRepository,
    private readonly uktService?: IUKTService
  ) {}

  async execute(userId: string, cardId: string, rating: Rating, question?: string, answer?: string, kcId?: string, moduleId?: string) {
    // 1. Get current progress or initialize new
    let progress = await this.progressRepository.getByCardId(userId, cardId);
    
    if (!progress) {
      progress = initializeProgress(userId, cardId);
      progress.question = question;
      progress.answer = answer;
      progress.topic = kcId;
      progress.kcId = kcId;
      progress.moduleId = moduleId;
    } else {
      progress.question = progress.question ?? question;
      progress.answer = progress.answer ?? answer;
      progress.topic = progress.topic ?? kcId;
      progress.kcId = progress.kcId ?? kcId;
      progress.moduleId = progress.moduleId ?? moduleId;
    }

    // 2. Calculate next state
    const nextProgress = calculateNextProgress(progress, rating);

    // 3. Save
    await this.progressRepository.save(nextProgress);

    // 4. Update UKT State if applicable
    const updateKcId = nextProgress.kcId ?? nextProgress.topic;
    if (this.uktService && updateKcId) {
      let uktRating: 'hard' | 'ok' | 'easy' = 'ok';
      if (rating === 0 || rating === 1) uktRating = 'hard';
      else if (rating === 3) uktRating = 'easy';

      try {
        await this.uktService.update({
          student_id: userId,
          kc_id: updateKcId,
          rating: uktRating
        });
      } catch {
        // Ignored
      }
    }

    return nextProgress;
  }
}
