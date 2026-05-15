// Retries fn on 429 rate-limit errors using exponential backoff.
// All other errors are re-thrown immediately.
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (e: any) {
      const is429 = typeof e?.message === 'string' && e.message.includes('429')
      if (!is429 || attempt === maxRetries) throw e
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('withRetry: unreachable')
}
