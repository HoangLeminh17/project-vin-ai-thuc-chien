import { OpenAiAdapter } from '../adapters/openai.adapter';
import { GenerateCourseUseCase } from '@/core/use-cases/generate-course.usecase';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';
import { logger, monitoring } from './logger.di';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.warn('[DI-AI] Warning: OPENAI_API_KEY is not defined');
}

export const aiAdapter = new OpenAiAdapter({
  apiKey: apiKey || '',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
});

const rawGenerateCourseUseCase = new GenerateCourseUseCase(aiAdapter);

export const generateCourseUseCase = withUseCaseLogging(
  rawGenerateCourseUseCase, 
  'GenerateCourseUseCase', 
  logger, 
  monitoring
);
