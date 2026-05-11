import { Course, CourseContent } from './learning-model';

export type SavedCourse = {
  id: string;
  userId: string;
  title: string;
  createdAt: string; // ISO 8601
  course: Course;
  courseContent: CourseContent | null;
  contentHash?: string;
  pdfStorageUrl?: string;
  layoutStorageUrl?: string;
};
