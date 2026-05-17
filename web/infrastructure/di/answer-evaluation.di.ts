import { EvaluateAnswerUseCase } from '@/core/use-cases/evaluate-answer.usecase'
import { AnswerEvaluationAdapter } from '../adapters/answer-evaluation.adapter'
import { resolveAiProvider } from '@/lib/ai-provider'
import { withUseCaseLogging } from '@/core/utils/use-case-logger'
import { logger, monitoring } from './logger.di'
import { numberEnv } from '@/lib/config/server'

export const answerEvaluationAdapter = new AnswerEvaluationAdapter({
  provider: resolveAiProvider(process.env.AI_PROVIDER, {
    gemini: !!process.env.GEMINI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    huggingface: !!process.env.HUGGINGFACE_API_KEY,
    fallbackProvider: process.env.AI_PROVIDER,
  }),
  timeoutMs: numberEnv('ANSWER_EVALUATION_TIMEOUT_MS', 5000),
  maxCacheEntries: numberEnv('ANSWER_EVALUATION_CACHE_MAX_ENTRIES', 500),
  providers: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_EVALUATION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_EVALUATION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_EVALUATION_MODEL || process.env.DEEPSEEK_PLANNER_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    },
    huggingface: {
      apiKey: process.env.HUGGINGFACE_API_KEY,
      model: process.env.HUGGINGFACE_EVALUATION_MODEL || process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
      baseUrl: 'https://router.huggingface.co/v1/chat/completions',
    },
  },
})

export const evaluateAnswerUseCase = withUseCaseLogging(
  new EvaluateAnswerUseCase(answerEvaluationAdapter),
  'EvaluateAnswerUseCase',
  logger,
  monitoring,
)
