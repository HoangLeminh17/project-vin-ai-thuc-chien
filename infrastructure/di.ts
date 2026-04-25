import { ParseDocumentUseCase } from '@/core/use-cases/parse-document.usecase';
import { GenerateCourseUseCase } from '@/core/use-cases/generate-course.usecase';
import { VerifySessionUseCase } from '@/core/use-cases/auth/verify-session.usecase';
import { CreateSessionUseCase } from '@/core/use-cases/auth/create-session.usecase';
import { ReviewCardUseCase } from '@/core/use-cases/spaced-repetition/review-card.usecase';
import { GetDueCardsUseCase } from '@/core/use-cases/spaced-repetition/get-due-cards.usecase';
import { GetSRSStatsUseCase } from '@/core/use-cases/spaced-repetition/get-srs-stats.usecase';
import { GetProgressMapUseCase } from '@/core/use-cases/spaced-repetition/get-progress-map.usecase';

import { OpenAiAdapter } from './adapters/openai.adapter';
import { MineruParserAdapter } from './adapters/mineru-parser.adapter';

// Comment this out to disable Firebase
import { FirebaseStorageAdapter } from './adapters/firebase-storage.adapter';
// import { LocalFsStorageAdapter } from './adapters/local-storage.adapter';

import { PinoLoggerAdapter } from './adapters/pino-logger.adapter';
import { ConsoleMonitoringAdapter } from './adapters/console-monitoring.adapter';
import { FirebaseAuthAdapter } from './adapters/firebase-auth.adapter';
import { FirebaseProgressRepository } from './adapters/firebase-progress-repository.adapter';
import { FirestoreCourseAdapter } from './adapters/firestore-course.adapter';
import { UKTServiceAdapter } from './adapters/ukt-service.adapter';
import { SaveCourseUseCase } from '@/core/use-cases/courses/save-course.usecase';
import { ListCoursesUseCase } from '@/core/use-cases/courses/list-courses.usecase';
import { getDb, getBucket, getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';

// Instantiate adapters
export const logger = new PinoLoggerAdapter();
export const monitoring = new ConsoleMonitoringAdapter(logger);

const storageAdapter = new FirebaseStorageAdapter(getBucket());
const parserAdapter = new MineruParserAdapter({
  baseUrl: process.env.PDF_MINERU_BASE_URL!,
  apiKey: process.env.PDF_MINERU_API_KEY!,
});
const aiAdapter = new OpenAiAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
});
const authAdapter = new FirebaseAuthAdapter(getFirebaseAdminAuth());
const progressRepository = new FirebaseProgressRepository();
export const courseRepository = new FirestoreCourseAdapter(getDb());
export const uktService = new UKTServiceAdapter(process.env.UKT_SERVICE_URL || 'http://localhost:8000');

// Instantiate Use Cases
const rawParseDocumentUseCase = new ParseDocumentUseCase(storageAdapter, parserAdapter);
export const parseDocumentUseCase = withUseCaseLogging(rawParseDocumentUseCase, 'ParseDocumentUseCase', logger, monitoring);

const rawGenerateCourseUseCase = new GenerateCourseUseCase(aiAdapter);
export const generateCourseUseCase = withUseCaseLogging(rawGenerateCourseUseCase, 'GenerateCourseUseCase', logger, monitoring);

const rawVerifySessionUseCase = new VerifySessionUseCase(authAdapter);
export const verifySessionUseCase = withUseCaseLogging(rawVerifySessionUseCase, 'VerifySessionUseCase', logger, monitoring);

const rawCreateSessionUseCase = new CreateSessionUseCase(authAdapter);
export const createSessionUseCase = withUseCaseLogging(rawCreateSessionUseCase, 'CreateSessionUseCase', logger, monitoring);

// SRS Use Cases
const rawReviewCardUseCase = new ReviewCardUseCase(progressRepository);
export const reviewCardUseCase = withUseCaseLogging(rawReviewCardUseCase, 'ReviewCardUseCase', logger, monitoring);

const rawGetDueCardsUseCase = new GetDueCardsUseCase(progressRepository);
export const getDueCardsUseCase = withUseCaseLogging(rawGetDueCardsUseCase, 'GetDueCardsUseCase', logger, monitoring);

const rawGetSRSStatsUseCase = new GetSRSStatsUseCase(progressRepository);
export const getSRSStatsUseCase = withUseCaseLogging(rawGetSRSStatsUseCase, 'GetSRSStatsUseCase', logger, monitoring);

const rawGetProgressMapUseCase = new GetProgressMapUseCase(progressRepository);
export const getProgressMapUseCase = withUseCaseLogging(rawGetProgressMapUseCase, 'GetProgressMapUseCase', logger, monitoring);

// Persistence Use Cases
export const saveCourseUseCase = withUseCaseLogging(new SaveCourseUseCase(courseRepository), 'SaveCourseUseCase', logger, monitoring);
export const listCoursesUseCase = withUseCaseLogging(new ListCoursesUseCase(courseRepository), 'ListCoursesUseCase', logger, monitoring);
