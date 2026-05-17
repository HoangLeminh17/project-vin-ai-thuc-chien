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
import type { IMonitoringPort } from '@/core/ports/monitoring.port';

import { OpenAiAdapter } from './adapters/openai.adapter';
import { MineruParserAdapter } from './adapters/mineru-parser.adapter';
import { FirebaseStorageAdapter } from './adapters/firebase-storage.adapter';
import { PinoLoggerAdapter } from './adapters/pino-logger.adapter';
import { WebhookAlertAdapter } from './adapters/webhook-alert.adapter';
import { RedisRateLimitAdapter } from './adapters/redis-ratelimit.adapter';
import { CompositeMonitoringAdapter } from './adapters/composite-monitoring.adapter';
import { ConsoleMonitoringAdapter } from './adapters/console-monitoring.adapter';
import { prometheusRegistry } from './adapters/prometheus.adapter';
import { FirebaseAuthAdapter } from './adapters/firebase-auth.adapter';
import { FirebaseProgressRepository } from './adapters/firebase-progress-repository.adapter';
import { FirestoreCourseAdapter } from './adapters/firestore-course.adapter';
import { UKTServiceAdapter } from './adapters/ukt-service.adapter';
import { FirestoreUsageAdapter } from './adapters/firestore-usage.adapter';
import { SaveCourseUseCase } from '@/core/use-cases/courses/save-course.usecase';
import { ListCoursesUseCase } from '@/core/use-cases/courses/list-courses.usecase';
import { getDb, getBucket, getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';
import { numberEnv } from '@/lib/config/server';

// Helpers
const normalizeBaseUrl = (url: string | undefined): string => {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
};

const normalizeChatCompletionUrl = (url: string): string => {
  const normalized = url.trim().replace(/\/$/, '')
  if (normalized.endsWith('/chat/completions')) return normalized
  return `${normalized}/chat/completions`
}

// Instantiate adapters
export const logger = new PinoLoggerAdapter();
export const alertAdapter = new WebhookAlertAdapter(process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || '');

let monitoringInstance: IMonitoringPort;
try {
  const consoleMonitoring = new ConsoleMonitoringAdapter(logger, alertAdapter);
  monitoringInstance = new CompositeMonitoringAdapter([consoleMonitoring, prometheusRegistry]);
} catch (e) {
  logger.error('[DI] Failed to initialize Monitoring', { err: e })
  monitoringInstance = new ConsoleMonitoringAdapter(logger, alertAdapter);
}
export const monitoring = monitoringInstance;

let rateLimiterInstance = null;
if (process.env.REDIS_URL) {
  try {
    rateLimiterInstance = new RedisRateLimitAdapter({
      url: process.env.REDIS_URL,
      limits: {
        'generate-course': { count: 5, windowSeconds: 3600 },
        'generate-quiz': { count: 10, windowSeconds: 3600 },
        'parse-pdf': { count: 15, windowSeconds: 3600 },
      }
    });
  } catch (e) {
    logger.error('[DI] Failed to initialize Redis Rate Limiter', { err: e })
  }
}
export const rateLimiter = rateLimiterInstance;

const storageAdapter = new FirebaseStorageAdapter(getBucket());
const parserAdapter = new MineruParserAdapter({
  baseUrl: normalizeBaseUrl(process.env.PDF_MINERU_BASE_URL),
  apiKey: process.env.PDF_MINERU_API_KEY!,
  modelVersion: (process.env.PDF_MINERU_MODEL_VERSION as 'pipeline' | 'vlm' | 'MinerU-HTML' | undefined) ?? 'vlm',
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
  plannerModel: process.env.OPENAI_PLANNER_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
  generatorModel: process.env.OPENAI_GENERATOR_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
  diagnosticModel: process.env.OPENAI_DIAGNOSTIC_MODEL || process.env.OPENAI_GENERATOR_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
}) : null;

const huggingface = process.env.HUGGINGFACE_API_KEY ? new HuggingFaceAdapter({
  apiKey: process.env.HUGGINGFACE_API_KEY,
  model: process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
}) : null;

const deepseek = process.env.DEEPSEEK_API_KEY ? new OpenAiAdapter({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseUrl: normalizeChatCompletionUrl(normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1')),
  model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
  plannerModel: process.env.DEEPSEEK_PLANNER_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
  generatorModel: process.env.DEEPSEEK_GENERATOR_MODEL || 'deepseek-v4-flash',
  diagnosticModel: process.env.DEEPSEEK_DIAGNOSTIC_MODEL || process.env.DEEPSEEK_GENERATOR_MODEL || 'deepseek-v4-flash',
}) : null;

// If AI_PROVIDER is explicitly set, use ONLY that provider (strict mode)
// Otherwise, use fallback chain with available providers
if (provider) {
  // Strict mode: AI_PROVIDER explicitly set, use only that provider
  if (provider === 'gemini') {
    if (!gemini) {
      logger.error('AI_PROVIDER=gemini but GEMINI_API_KEY is not configured; will fail at runtime')
    } else {
      aiAdapters.push(gemini);
    }
  } else if (provider === 'openai') {
    if (!openai) {
      logger.error('AI_PROVIDER=openai but OPENAI_API_KEY is not configured; will fail at runtime')
    } else {
      aiAdapters.push(openai);
    }
  } else if (provider === 'huggingface') {
    if (!huggingface) {
      logger.error('AI_PROVIDER=huggingface but HUGGINGFACE_API_KEY is not configured; will fail at runtime')
    } else {
      aiAdapters.push(huggingface);
    }
  } else if (provider === 'deepseek') {
    if (!deepseek) {
      logger.error('AI_PROVIDER=deepseek but DEEPSEEK_API_KEY is not configured; will fail at runtime')
    } else {
      aiAdapters.push(deepseek);
    }
  } else {
    logger.error('Unknown AI_PROVIDER', { provider, valid: ['gemini', 'openai', 'deepseek', 'huggingface'] })
  }
  
  if (aiAdapters.length > 0) {
    logger.info('[DI] Using AI_PROVIDER (strict mode, no fallback)', { provider })
  }
} else {
  // Fallback mode: no AI_PROVIDER set, try all available providers
  if (gemini) aiAdapters.push(gemini);
  if (openai) aiAdapters.push(openai);
  if (deepseek) aiAdapters.push(deepseek);
  if (huggingface) aiAdapters.push(huggingface);
  
  if (aiAdapters.length > 0) {
    logger.info('[DI] AI_PROVIDER not set; using fallback chain')
  } else {
    logger.warn('[DI] No AI providers configured; API calls will fail at runtime', {
      required: ['OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'GEMINI_API_KEY', 'HUGGINGFACE_API_KEY'],
    })
  }
}

export const aiAdapter = new ChainAiAdapter(aiAdapters);

const authAdapter = new FirebaseAuthAdapter(getFirebaseAdminAuth());
const progressRepository = new FirebaseProgressRepository();
export const courseRepository = new FirestoreCourseAdapter(getDb());
export const usageRepository = new FirestoreUsageAdapter(getDb());
if (!process.env.UKT_SERVICE_URL) {
  console.warn('[DI] ⚠️  UKT_SERVICE_URL is not set — falling back to http://localhost:8000. UKT routes will fail in production.');
}
export const uktService = new UKTServiceAdapter(normalizeBaseUrl(process.env.UKT_SERVICE_URL || 'http://localhost:8000'));

// Instantiate Use Cases
const rawParseDocumentUseCase = new ParseDocumentUseCase(storageAdapter, parserAdapter);
export const parseDocumentUseCase = withUseCaseLogging(rawParseDocumentUseCase, 'ParseDocumentUseCase', logger, monitoring);

const rawGenerateCourseUseCase = new GenerateCourseUseCase(aiAdapter, usageRepository, numberEnv('OPENAI_MAX_TOKENS', 120000));
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

const rawGetSRSStatsUseCase = new GetSRSStatsUseCase(progressRepository, courseRepository);
export const getSRSStatsUseCase = withUseCaseLogging(rawGetSRSStatsUseCase, 'GetSRSStatsUseCase', logger, monitoring);

const rawGetProgressMapUseCase = new GetProgressMapUseCase(progressRepository);
export const getProgressMapUseCase = withUseCaseLogging(rawGetProgressMapUseCase, 'GetProgressMapUseCase', logger, monitoring);

// Persistence Use Cases
export const saveCourseUseCase = withUseCaseLogging(new SaveCourseUseCase(courseRepository), 'SaveCourseUseCase', logger, monitoring);
export const listCoursesUseCase = withUseCaseLogging(new ListCoursesUseCase(courseRepository), 'ListCoursesUseCase', logger, monitoring);
