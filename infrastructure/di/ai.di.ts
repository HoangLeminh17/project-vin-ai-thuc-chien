import { OpenAiAdapter } from '../adapters/openai.adapter'
import { GeminiAdapter } from '../adapters/gemini.adapter'
import { GenerateCourseUseCase } from '@/core/use-cases/generate-course.usecase'
import { withUseCaseLogging } from '@/core/utils/use-case-logger'
import { logger, monitoring } from './logger.di'
import { resolveAiProvider, type AiProvider } from '@/lib/ai-provider'
import type { IAiService } from '@/core/ports/ai.port'

function createAiAdapter(provider?: AiProvider): IAiService {
  const resolvedProvider = resolveAiProvider(provider)

  if (resolvedProvider === 'gemini') {
    return new GeminiAdapter({
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    })
  }

  return new OpenAiAdapter({
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  })
}

export function createGenerateCourseUseCase(provider?: AiProvider) {
  const aiAdapter = createAiAdapter(provider)
  const rawGenerateCourseUseCase = new GenerateCourseUseCase(aiAdapter)

  return withUseCaseLogging(
    rawGenerateCourseUseCase,
    'GenerateCourseUseCase',
    logger,
    monitoring,
  )
}

export const generateCourseUseCase = createGenerateCourseUseCase()
