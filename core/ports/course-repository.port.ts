import { SavedCourse } from '../models/saved-course';
import { Course, CourseContent } from '../models/learning-model';

export interface CreateCourseInput {
  userId: string;
  title: string;
  course: Course;
  courseContent: CourseContent | null;
}

export interface ICourseRepository {
  save(input: CreateCourseInput): Promise<SavedCourse>;
  listByUser(userId: string): Promise<SavedCourse[]>;
  getById(id: string, userId: string): Promise<SavedCourse>;
  delete(id: string, userId: string): Promise<void>;
}
