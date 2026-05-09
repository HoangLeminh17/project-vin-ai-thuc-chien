import { FirestoreCourseAdapter } from '../adapters/firestore-course.adapter';
import { SaveCourseUseCase } from '@/core/use-cases/courses/save-course.usecase';
import { ListCoursesUseCase } from '@/core/use-cases/courses/list-courses.usecase';
import { GetCourseUseCase } from '@/core/use-cases/courses/get-course.usecase';
import { DeleteCourseUseCase } from '@/core/use-cases/courses/delete-course.usecase';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';
import { logger, monitoring } from './logger.di';

import { UpdateCourseUseCase } from '@/core/use-cases/courses/update-course.usecase';

const courseRepo = new FirestoreCourseAdapter(getFirebaseAdminFirestore());
export const courseRepository = courseRepo;

export const saveCourseUseCase = withUseCaseLogging(
  new SaveCourseUseCase(courseRepo),
  'SaveCourseUseCase',
  logger,
  monitoring
);

export const updateCourseUseCase = withUseCaseLogging(
  new UpdateCourseUseCase(courseRepo),
  'UpdateCourseUseCase',
  logger,
  monitoring
);

export const listCoursesUseCase = withUseCaseLogging(
  new ListCoursesUseCase(courseRepo),
  'ListCoursesUseCase',
  logger,
  monitoring
);

export const getCourseUseCase = withUseCaseLogging(
  new GetCourseUseCase(courseRepo),
  'GetCourseUseCase',
  logger,
  monitoring
);

export const deleteCourseUseCase = withUseCaseLogging(
  new DeleteCourseUseCase(courseRepo),
  'DeleteCourseUseCase',
  logger,
  monitoring
);
