export interface TokenUsageRecord {
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  type: 'course_generation' | 'course_generation_chunked' | 'quiz_generation' | 'other';
  userId?: string;
}

export interface IUsageRepository {
  saveTokenUsage(record: TokenUsageRecord): Promise<void>;
  getDailyUsage(days?: number): Promise<any[]>;
  getRecentUsage(limit?: number): Promise<TokenUsageRecord[]>;
}
