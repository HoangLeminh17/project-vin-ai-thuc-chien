import { OpenAiAdapter } from '../adapters/openai.adapter'
import { GeminiAdapter } from '../adapters/gemini.adapter'
import { HuggingFaceAdapter } from '../adapters/huggingface.adapter'
import { ChainAiAdapter } from '../adapters/fallback-ai.adapter'
import { GenerateCourseUseCase } from '@/core/use-cases/generate-course.usecase'
import { withUseCaseLogging } from '@/core/utils/use-case-logger'
import { logger, monitoring } from './logger.di'
import type { IAiService } from '@/core/ports/ai.port'

const adapters: IAiService[] = []

// 1. Gemini (Primary)
if (process.env.GEMINI_API_KEY) {
  adapters.push(new GeminiAdapter({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  }))
}

// 2. OpenAI (Secondary)
if (process.env.OPENAI_API_KEY) {
  adapters.push(new OpenAiAdapter({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  }))
}

// 3. Hugging Face (Open Source)
if (process.env.HUGGINGFACE_API_KEY) {
  adapters.push(new HuggingFaceAdapter({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
  }))
}

// 4. Local AI (Ollama)
if (process.env.LOCAL_AI_BASE_URL) {
  adapters.push(new OpenAiAdapter({
    apiKey: 'local', // API key is usually ignored for local Ollama
    baseUrl: process.env.LOCAL_AI_BASE_URL,
    model: process.env.LOCAL_AI_MODEL || 'qwen2.5:0.5b',
  }))
}

const chainAiAdapter = new ChainAiAdapter(adapters)

export const generateCourseUseCase = withUseCaseLogging(
  new GenerateCourseUseCase(chainAiAdapter),
  'GenerateCourseUseCase',
  logger,
  monitoring,
)
