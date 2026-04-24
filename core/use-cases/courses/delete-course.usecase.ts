import { ICourseRepository } from '@/core/ports/course-repository.port';

export class DeleteCourseUseCase {
  constructor(private readonly repo: ICourseRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    return this.repo.delete(id, userId);
  }
}
