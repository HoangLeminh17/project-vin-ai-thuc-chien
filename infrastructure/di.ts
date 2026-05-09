import { ParseDocumentUseCase } from '@/core/use-cases/parse-document.usecase';
import { GenerateCourseUseCase } from '@/core/use-cases/generate-course.usecase';
import { VerifySessionUseCase } from '@/core/use-cases/auth/verify-session.usecase';
import { CreateSessionUseCase } from '@/core/use-cases/auth/create-session.usecase';
import { ReviewCardUseCase } from '@/core/use-cases/spaced-repetition/review-card.usecase';
import { GetDueCardsUseCase } from '@/core/use-cases/spaced-repetition/get-due-cards.usecase';
import { GetSRSStatsUseCase } from '@/core/use-cases/spaced-repetition/get-srs-stats.usecase';
import { GetProgressMapUseCase } from '@/core/use-cases/spaced-repetition/get-progress-map.usecase';
import { GenerateDiagnosticQuizUseCase } from '@/core/use-cases/diagnostic/generate-diagnostic-quiz.usecase';
import { GetPrioritizedDueCardsUseCase } from '@/core/use-cases/spaced-repetition/get-prioritized-due-cards.usecase';

import { GeminiAdapter } from './adapters/gemini.adapter';
import { HuggingFaceAdapter } from './adapters/huggingface.adapter';
import { ChainAiAdapter } from './adapters/fallback-ai.adapter';
import type { IAiService } from '@/core/ports/ai.port';

import { OpenAiAdapter } from './adapters/openai.adapter';
import { MineruParserAdapter } from './adapters/mineru-parser.adapter';
import { FirebaseStorageAdapter } from './adapters/firebase-storage.adapter';
import { PinoLoggerAdapter } from './adapters/pino-logger.adapter';
import { WebhookAlertAdapter } from './adapters/webhook-alert.adapter';
import { ConsoleMonitoringAdapter } from './adapters/console-monitoring.adapter';
import { FirebaseAuthAdapter } from './adapters/firebase-auth.adapter';
import { FirebaseProgressRepository } from './adapters/firebase-progress-repository.adapter';
import { FirestoreCourseAdapter } from './adapters/firestore-course.adapter';
import { UKTServiceAdapter } from './adapters/ukt-service.adapter';
import { FirestoreUsageAdapter } from './adapters/firestore-usage.adapter';
import { RedisRateLimitAdapter } from './adapters/redis-ratelimit.adapter';
import { SaveCourseUseCase } from '@/core/use-cases/courses/save-course.usecase';
import { ListCoursesUseCase } from '@/core/use-cases/courses/list-courses.usecase';
import { getDb, getBucket, getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';

// Instantiate adapters
export const logger = new PinoLoggerAdapter();
export const alertAdapter = new WebhookAlertAdapter(process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || '');
export const monitoring = new ConsoleMonitoringAdapter(logger, alertAdapter);

export const rateLimiter = process.env.REDIS_URL ? new RedisRateLimitAdapter({
  url: process.env.REDIS_URL,
  limits: {
    'generate-course': { count: 5, windowSeconds: 3600 },
    'generate-quiz': { count: 10, windowSeconds: 3600 },
    'parse-pdf': { count: 15, windowSeconds: 3600 },
  }
}) : null;

const storageAdapter = new FirebaseStorageAdapter(getBucket());
const parserAdapter = new MineruParserAdapter({
  baseUrl: process.env.PDF_MINERU_BASE_URL!,
  apiKey: process.env.PDF_MINERU_API_KEY!,
});

// Setup AI Adapters with fallback chain
const provider = process.env.AI_PROVIDER?.toLowerCase();
const aiAdapters: IAiService[] = [];

const gemini = process.env.GEMINI_API_KEY ? new GeminiAdapter({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
}) : null;

const openai = process.env.OPENAI_API_KEY ? new OpenAiAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
}) : null;

const huggingface = process.env.HUGGINGFACE_API_KEY ? new HuggingFaceAdapter({
  apiKey: process.env.HUGGINGFACE_API_KEY,
  model: process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
}) : null;

// Add by priority: 1. Specified provider, 2. Others as fallback
if (provider === 'gemini' && gemini) aiAdapters.push(gemini);
else if (provider === 'openai' && openai) aiAdapters.push(openai);
else if (provider === 'huggingface' && huggingface) aiAdapters.push(huggingface);

// Add remainders if they weren't already added (if AI_PROVIDER is not set or to provide fallback)
if (gemini && !aiAdapters.includes(gemini)) aiAdapters.push(gemini);
if (openai && !aiAdapters.includes(openai)) aiAdapters.push(openai);
if (huggingface && !aiAdapters.includes(huggingface)) aiAdapters.push(huggingface);

export const aiAdapter = new ChainAiAdapter(aiAdapters);

const authAdapter = new FirebaseAuthAdapter(getFirebaseAdminAuth());
const progressRepository = new FirebaseProgressRepository();
export const courseRepository = new FirestoreCourseAdapter(getDb());
export const usageRepository = new FirestoreUsageAdapter(getDb());
export const uktService = new UKTServiceAdapter(process.env.UKT_SERVICE_URL || 'http://localhost:8000');

// Instantiate Use Cases
const rawParseDocumentUseCase = new ParseDocumentUseCase(storageAdapter, parserAdapter);
export const parseDocumentUseCase = withUseCaseLogging(rawParseDocumentUseCase, 'ParseDocumentUseCase', logger, monitoring);

const rawGenerateCourseUseCase = new GenerateCourseUseCase(aiAdapter, usageRepository);
export const generateCourseUseCase = withUseCaseLogging(rawGenerateCourseUseCase, 'GenerateCourseUseCase', logger, monitoring);

const rawVerifySessionUseCase = new VerifySessionUseCase(authAdapter);
export const verifySessionUseCase = withUseCaseLogging(rawVerifySessionUseCase, 'VerifySessionUseCase', logger, monitoring);

const rawCreateSessionUseCase = new CreateSessionUseCase(authAdapter);
export const createSessionUseCase = withUseCaseLogging(rawCreateSessionUseCase, 'CreateSessionUseCase', logger, monitoring);

// SRS Use Cases
const rawReviewCardUseCase = new ReviewCardUseCase(progressRepository, uktService);
export const reviewCardUseCase = withUseCaseLogging(rawReviewCardUseCase, 'ReviewCardUseCase', logger, monitoring);

const rawGetDueCardsUseCase = new GetDueCardsUseCase(progressRepository);
export const getDueCardsUseCase = withUseCaseLogging(rawGetDueCardsUseCase, 'GetDueCardsUseCase', logger, monitoring);

const rawGetPrioritizedDueCardsUseCase = new GetPrioritizedDueCardsUseCase(progressRepository, uktService);
export const getPrioritizedDueCardsUseCase = withUseCaseLogging(rawGetPrioritizedDueCardsUseCase, 'GetPrioritizedDueCardsUseCase', logger, monitoring);

// Diagnostic Loop
const rawGenerateDiagnosticQuizUseCase = new GenerateDiagnosticQuizUseCase(aiAdapter, usageRepository);
export const generateDiagnosticQuizUseCase = withUseCaseLogging(rawGenerateDiagnosticQuizUseCase, 'GenerateDiagnosticQuizUseCase', logger, monitoring);

const rawGetSRSStatsUseCase = new GetSRSStatsUseCase(progressRepository);
export const getSRSStatsUseCase = withUseCaseLogging(rawGetSRSStatsUseCase, 'GetSRSStatsUseCase', logger, monitoring);

const rawGetProgressMapUseCase = new GetProgressMapUseCase(progressRepository);
export const getProgressMapUseCase = withUseCaseLogging(rawGetProgressMapUseCase, 'GetProgressMapUseCase', logger, monitoring);

// Persistence Use Cases
export const saveCourseUseCase = withUseCaseLogging(new SaveCourseUseCase(courseRepository), 'SaveCourseUseCase', logger, monitoring);
export const listCoursesUseCase = withUseCaseLogging(new ListCoursesUseCase(courseRepository), 'ListCoursesUseCase', logger, monitoring);
