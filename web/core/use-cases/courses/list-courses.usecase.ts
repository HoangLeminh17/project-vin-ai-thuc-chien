import { ICourseRepository } from '@/core/ports/course-repository.port';
import { SavedCourse } from '@/core/models/saved-course';

export class ListCoursesUseCase {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(userId: string): Promise<SavedCourse[]> {
    return this.repo.listByUser(userId);
  }
}
