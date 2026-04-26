import { SavedCourse } from '../models/saved-course';
import { Course, ChapterContent, CourseContent } from '../models/learning-model';

export interface CreateCourseInput {
  userId: string;
  title: string;
  course: Course;
  courseContent: CourseContent | null;
  contentHash?: string;
}

export interface ICourseRepository {
  // Persistence methods (User-based)
  save(input: CreateCourseInput): Promise<SavedCourse>;
  listByUser(userId: string): Promise<SavedCourse[]>;
  getById(id: string, userId: string): Promise<SavedCourse>;
  delete(id: string, userId: string): Promise<void>;
  findByHash(userId: string, hash: string): Promise<SavedCourse | null>;
  findByTitle(userId: string, title: string): Promise<SavedCourse | null>;

  // Caching methods (Hash-based)
  saveCourse(hash: string, course: Course): Promise<void>;
  getCourse(hash: string): Promise<Course | null>;
  saveChapter(hash: string, chapterIndex: number, content: ChapterContent): Promise<void>;
  getChapter(hash: string, chapterIndex: number): Promise<ChapterContent | null>;
  getFullCachedCourse(hash: string): Promise<{ course: Course; content: CourseContent } | null>;
}
