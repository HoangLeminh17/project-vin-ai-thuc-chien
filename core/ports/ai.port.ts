import type { Course, ChapterContent, DiagnosticQuiz } from '../models/learning-model'

export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number }

export interface IAiService {
  generateCourse(markdown: string): Promise<{ 
    course: Course; 
    tokens: TokenUsage | null;
  }>
  generateDiagnosticQuiz(markdown: string): Promise<{
    quiz: DiagnosticQuiz;
    tokens: TokenUsage | null;
  }>
}
