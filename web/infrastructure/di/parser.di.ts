import { MineruParserAdapter } from '../adapters/mineru-parser.adapter';
import { ParseDocumentUseCase } from '@/core/use-cases/parse-document.usecase';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';
import { logger, monitoring } from './logger.di';
import { storageAdapter } from './storage.di';
import { progressStore } from './progress.di';
import path from 'path';

const baseUrl = process.env.PDF_MINERU_BASE_URL;
const apiKey = process.env.PDF_MINERU_API_KEY;

export const parserAdapter = new MineruParserAdapter({
  baseUrl: baseUrl || '',
  apiKey: apiKey || '',
  outputDir: path.join(process.cwd(), '.mineru-output'),
  modelVersion: (process.env.PDF_MINERU_MODEL_VERSION as 'pipeline' | 'vlm' | 'MinerU-HTML' | undefined) ?? 'vlm',
}, progressStore);

const rawParseDocumentUseCase = new ParseDocumentUseCase(storageAdapter, parserAdapter);

export const parseDocumentUseCase = withUseCaseLogging(
  rawParseDocumentUseCase,
  'ParseDocumentUseCase',
  logger,
  monitoring
);
