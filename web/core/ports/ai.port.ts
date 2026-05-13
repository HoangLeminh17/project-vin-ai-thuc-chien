import type { Course, DiagnosticQuiz } from '../models/learning-model'

export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number }

export interface ContentChunk {
  id: string;
  text: string;
  kc_id?: string;
  kc_name?: string;
  module_id?: string;
  module_name?: string;
}

export interface IAiService {
  generateCourse(markdown: string): Promise<{ 
    course: Course; 
    tokens: TokenUsage | null;
  }>
  generateDiagnosticQuiz(chunks: ContentChunk[]): Promise<{
    quiz: DiagnosticQuiz;
    tokens: TokenUsage | null;
  }>
}
