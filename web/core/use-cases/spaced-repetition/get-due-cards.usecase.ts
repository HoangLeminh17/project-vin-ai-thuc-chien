import { IProgressRepository } from '../../ports/progress-repository.port';

export class GetDueCardsUseCase {
  constructor(private readonly progressRepository: IProgressRepository) {}

  async execute(userId: string) {
    const now = new Date();
    return await this.progressRepository.getDueCards(userId, now);
  }
}
