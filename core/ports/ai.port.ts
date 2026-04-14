import type { Course } from '@/lib/types'

export type TokenUsage = { promptTokens: number; completionTokens: number; totalTokens: number }

export interface IAiService {
  generateCourse(markdown: string): Promise<{ course: Course; tokens: TokenUsage | null }>
}
