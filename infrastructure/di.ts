import { ParseDocumentUseCase } from '@/core/use-cases/parse-document.usecase';
import { GenerateCourseUseCase } from '@/core/use-cases/generate-course.usecase';
import { VerifySessionUseCase } from '@/core/use-cases/auth/verify-session.usecase';
import { CreateSessionUseCase } from '@/core/use-cases/auth/create-session.usecase';

import { OpenAiAdapter } from './adapters/openai.adapter';
import { MineruParserAdapter } from './adapters/mineru-parser.adapter';

// Comment this out to disable Firebase
import { FirebaseStorageAdapter } from './adapters/firebase-storage.adapter';
// import { LocalFsStorageAdapter } from './adapters/local-storage.adapter';

import { PinoLoggerAdapter } from './adapters/pino-logger.adapter';
import { ConsoleMonitoringAdapter } from './adapters/console-monitoring.adapter';
import { FirebaseAuthAdapter } from './adapters/firebase-auth.adapter';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';

// Instantiate adapters
export const logger = new PinoLoggerAdapter();
export const monitoring = new ConsoleMonitoringAdapter(logger);

const storageAdapter = new FirebaseStorageAdapter();
//const storageAdapter = new LocalFsStorageAdapter(); // Fully dropped Firebase
const parserAdapter = new MineruParserAdapter();
const aiAdapter = new OpenAiAdapter();
const authAdapter = new FirebaseAuthAdapter();

// Instantiate Use Cases
const rawParseDocumentUseCase = new ParseDocumentUseCase(storageAdapter, parserAdapter);
export const parseDocumentUseCase = withUseCaseLogging(rawParseDocumentUseCase, 'ParseDocumentUseCase', logger, monitoring);

const rawGenerateCourseUseCase = new GenerateCourseUseCase(aiAdapter);
export const generateCourseUseCase = withUseCaseLogging(rawGenerateCourseUseCase, 'GenerateCourseUseCase', logger, monitoring);

const rawVerifySessionUseCase = new VerifySessionUseCase(authAdapter);
export const verifySessionUseCase = withUseCaseLogging(rawVerifySessionUseCase, 'VerifySessionUseCase', logger, monitoring);

const rawCreateSessionUseCase = new CreateSessionUseCase(authAdapter);
export const createSessionUseCase = withUseCaseLogging(rawCreateSessionUseCase, 'CreateSessionUseCase', logger, monitoring);
