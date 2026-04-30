import { IProgressRepository } from '../../ports/progress-repository.port';
import { IUKTService } from '../../ports/ukt.port';

export class GetPrioritizedDueCardsUseCase {
  constructor(
    private readonly progressRepository: IProgressRepository,
    private readonly uktService?: IUKTService
  ) {}

  async execute(userId: string, interactions?: Array<{ question_id: string; kc_id: string; response: number }>) {
    const now = new Date();
    const dueCards = await this.progressRepository.getDueCards(userId, now);

    if (!this.uktService || dueCards.length === 0) {
      return dueCards;
    }

    try {
      // If we have no recent interactions passed in, we just pass an empty array
      // UKT will return the priority_order based on existing state in the DB
      const prediction = await this.uktService.predict({
        student_id: userId,
        interactions: interactions || [],
        total_minutes: 0 // placeholder
      });

      const priorityOrder = prediction.priority_order || [];

      // Sort dueCards: 
      // If a card's topic is in priorityOrder, sort by its index (lower index = higher priority).
      // If not in priorityOrder, put it at the end.
      return dueCards.sort((a, b) => {
        const topicA = a.topic || '';
        const topicB = b.topic || '';
        
        const idxA = priorityOrder.indexOf(topicA);
        const idxB = priorityOrder.indexOf(topicB);

        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1; // a has priority
        if (idxB !== -1) return 1;  // b has priority
        return 0; // both unknown, keep original order
      });
    } catch (e) {
      return dueCards;
    }
  }
}
