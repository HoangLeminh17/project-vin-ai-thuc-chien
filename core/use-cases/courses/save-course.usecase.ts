import { ICourseRepository, CreateCourseInput } from '@/core/ports/course-repository.port';
import { SavedCourse } from '@/core/models/saved-course';

export class SaveCourseUseCase {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(input: CreateCourseInput): Promise<SavedCourse> {
    return this.repo.save(input);
  }
}
