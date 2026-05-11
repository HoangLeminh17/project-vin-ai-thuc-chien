export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export interface IRateLimitProvider {
  /**
   * Check if a user has exceeded their rate limit for a specific action.
   * @param identifier - Unique identifier (e.g., userId or IP)
   * @param action - The action being performed (e.g., 'generate-course')
   */
  check(identifier: string, action: string): Promise<RateLimitResult>
}
