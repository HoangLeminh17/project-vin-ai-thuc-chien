import { IProgressRepository } from '../../ports/progress-repository.port';

export class GetSRSStatsUseCase {
  constructor(private readonly progressRepository: IProgressRepository) {}

  async execute(userId: string) {
    return await this.progressRepository.getStats(userId);
  }
}
