import { ParseDocumentUseCase } from '@/core/use-cases/parse-document.usecase';
import { GenerateCourseUseCase } from '@/core/use-cases/generate-course.usecase';

import { OpenAiAdapter } from './adapters/openai.adapter';
import { MineruParserAdapter } from './adapters/mineru-parser.adapter';

// Comment this out to disable Firebase
import { FirebaseStorageAdapter } from './adapters/firebase-storage.adapter';
// import { LocalFsStorageAdapter } from './adapters/local-storage.adapter';

import { PinoLoggerAdapter } from './adapters/pino-logger.adapter';
import { ConsoleMonitoringAdapter } from './adapters/console-monitoring.adapter';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';

// Instantiate adapters
export const logger = new PinoLoggerAdapter();
export const monitoring = new ConsoleMonitoringAdapter(logger);

const storageAdapter = new FirebaseStorageAdapter();
//const storageAdapter = new LocalFsStorageAdapter(); // Fully dropped Firebase
const parserAdapter = new MineruParserAdapter();
const aiAdapter = new OpenAiAdapter();

// Instantiate Use Cases
const rawParseDocumentUseCase = new ParseDocumentUseCase(storageAdapter, parserAdapter);
export const parseDocumentUseCase = withUseCaseLogging(rawParseDocumentUseCase, 'ParseDocumentUseCase', logger, monitoring);

const rawGenerateCourseUseCase = new GenerateCourseUseCase(aiAdapter);
export const generateCourseUseCase = withUseCaseLogging(rawGenerateCourseUseCase, 'GenerateCourseUseCase', logger, monitoring);
