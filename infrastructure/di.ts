import { ParseDocumentUseCase } from '@/core/use-cases/parse-document.usecase';
import { GenerateCourseUseCase } from '@/core/use-cases/generate-course.usecase';

import { OpenAiAdapter } from './adapters/openai.adapter';
import { MineruParserAdapter } from './adapters/mineru-parser.adapter';

// Comment this out to disable Firebase
import { FirebaseStorageAdapter } from './adapters/firebase-storage.adapter';
// import { LocalFsStorageAdapter } from './adapters/local-storage.adapter';

// Instantiate adapters
const storageAdapter = new FirebaseStorageAdapter();
//const storageAdapter = new LocalFsStorageAdapter(); // Fully dropped Firebase
const parserAdapter = new MineruParserAdapter();
const aiAdapter = new OpenAiAdapter();

// Instantiate Use Cases
export const parseDocumentUseCase = new ParseDocumentUseCase(storageAdapter, parserAdapter);
export const generateCourseUseCase = new GenerateCourseUseCase(aiAdapter);
