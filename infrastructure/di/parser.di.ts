import { MineruParserAdapter } from '../adapters/mineru-parser.adapter';
import { ParseDocumentUseCase } from '@/core/use-cases/parse-document.usecase';
import { withUseCaseLogging } from '@/core/utils/use-case-logger';
import { logger, monitoring } from './logger.di';
import { storageAdapter } from './storage.di';
import path from 'path';

const baseUrl = process.env.PDF_MINERU_BASE_URL;
const apiKey = process.env.PDF_MINERU_API_KEY;

if (!baseUrl || !apiKey) {
  console.warn('[DI-Parser] Warning: MinerU configuration is incomplete');
}

export const parserAdapter = new MineruParserAdapter({
  baseUrl: baseUrl || '',
  apiKey: apiKey || '',
  outputDir: path.join(process.cwd(), '.mineru-output')
});

const rawParseDocumentUseCase = new ParseDocumentUseCase(storageAdapter, parserAdapter);

export const parseDocumentUseCase = withUseCaseLogging(
  rawParseDocumentUseCase,
  'ParseDocumentUseCase',
  logger,
  monitoring
);
