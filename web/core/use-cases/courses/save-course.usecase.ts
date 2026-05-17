import { ICourseRepository, CreateCourseInput } from '@/core/ports/course-repository.port';
import { SavedCourse } from '@/core/models/saved-course';
import { countCourseCards } from '@/lib/course-cards';

export class SaveCourseUseCase {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(input: CreateCourseInput): Promise<SavedCourse> {
    if (input.contentHash) {
      const existing = await this.repo.findByHash(input.userId, input.contentHash);
      if (existing) return existing;
    }

    // Fallback: check by title for older courses or same-named courses
    const existingByTitle = await this.repo.findByTitle(input.userId, input.title);
    if (existingByTitle) return existingByTitle;

    return this.repo.save({
      ...input,
      totalCardCount: input.totalCardCount ?? countCourseCards(input.courseContent),
    });
  }
}
