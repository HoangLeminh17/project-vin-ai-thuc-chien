import { ICourseRepository } from '../../ports/course-repository.port';
import { CourseContent } from '../../models/learning-model';
import { countCourseCards } from '@/lib/course-cards';

export class UpdateCourseUseCase {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(id: string, userId: string, content: CourseContent): Promise<void> {
    return this.repo.update(id, userId, content, countCourseCards(content));
  }
}
