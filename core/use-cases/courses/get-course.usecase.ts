import { ICourseRepository } from '@/core/ports/course-repository.port';
import { SavedCourse } from '@/core/models/saved-course';

export class GetCourseUseCase {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(id: string, userId: string): Promise<SavedCourse> {
    return this.repo.getById(id, userId);
  }
}
