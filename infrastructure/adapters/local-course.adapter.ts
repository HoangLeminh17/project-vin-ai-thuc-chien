import { ICourseRepository, CreateCourseInput } from '@/core/ports/course-repository.port';
import { SavedCourse } from '@/core/models/saved-course';
import { NotFoundError, BusinessRuleError } from '@/core/errors/domain-error';

const KEY = 'local_courses';

function load(): SavedCourse[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persist(courses: SavedCourse[]) {
  localStorage.setItem(KEY, JSON.stringify(courses));
}

export class LocalCourseAdapter implements ICourseRepository {
  async save(input: CreateCourseInput): Promise<SavedCourse> {
    const courses = load();
    const saved: SavedCourse = {
      id: crypto.randomUUID(),
      userId: input.userId,
      title: input.title,
      createdAt: new Date().toISOString(),
      course: input.course,
      courseContent: input.courseContent,
    };
    persist([saved, ...courses]);
    return saved;
  }

  async listByUser(userId: string): Promise<SavedCourse[]> {
    return load()
      .filter(c => c.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getById(id: string, userId: string): Promise<SavedCourse> {
    const course = load().find(c => c.id === id);
    if (!course) throw new NotFoundError(`Course ${id} not found`);
    if (course.userId !== userId) throw new BusinessRuleError('Access denied');
    return course;
  }

  async delete(id: string, userId: string): Promise<void> {
    const courses = load();
    const course = courses.find(c => c.id === id);
    if (!course) throw new NotFoundError(`Course ${id} not found`);
    if (course.userId !== userId) throw new BusinessRuleError('Access denied');
    persist(courses.filter(c => c.id !== id));
  }
}
