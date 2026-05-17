import { IProgressRepository } from '../../ports/progress-repository.port';
import { ICourseRepository } from '../../ports/course-repository.port';
import { countCourseCards } from '@/lib/course-cards';

export interface SRSStats {
  new: number;
  learning: number;
  due: number;
  streak: number;
  totalCards: number;
}

export class GetSRSStatsUseCase {
  constructor(
    private readonly progressRepository: IProgressRepository,
    private readonly courseRepository: ICourseRepository
  ) {}

  async execute(userId: string, courseId?: string): Promise<SRSStats> {
    const [repoStats, totalCards] = await Promise.all([
      this.progressRepository.getStats(userId),
      this.computeTotalCards(userId, courseId),
    ]);

    const newCount = Math.max(0, totalCards - repoStats.reviewed);

    return {
      new: newCount,
      learning: repoStats.learning,
      due: repoStats.due,
      streak: repoStats.streak,
      totalCards,
    };
  }

  private async computeTotalCards(userId: string, courseId?: string): Promise<number> {
    if (courseId) {
      const course = await this.courseRepository.getById(courseId, userId);
      return course.totalCardCount ?? countCourseCards(course.courseContent);
    }
    const courses = await this.courseRepository.listByUser(userId);
    return courses.reduce(
      (sum, c) => sum + (c.totalCardCount ?? countCourseCards(c.courseContent)),
      0
    );
  }
}
