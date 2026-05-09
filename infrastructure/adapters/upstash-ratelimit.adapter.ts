import { IRateLimitProvider, RateLimitResult } from '@/core/ports/rate-limit.port'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { InfrastructureError } from '@/core/errors/domain-error'

export interface UpstashRateLimitConfig {
  url: string
  token: string
  // Map of action names to their limits (e.g., { 'generate-course': '5 h' })
  limits?: Record<string, string>
}

export class UpstashRateLimitAdapter implements IRateLimitProvider {
  private readonly redis: Redis
  private readonly limiters: Map<string, Ratelimit> = new Map()
  private readonly defaultLimit = '10 h'

  constructor(config: UpstashRateLimitConfig) {
    if (!config.url || !config.token) {
      throw new InfrastructureError('Upstash Redis URL and Token are required for rate limiting')
    }

    this.redis = new Redis({
      url: config.url,
      token: config.token,
    })

    // Pre-initialize limiters if provided
    if (config.limits) {
      for (const [action, limitStr] of Object.entries(config.limits)) {
        this.getOrCreateLimiter(action, limitStr)
      }
    }
  }

  private getOrCreateLimiter(action: string, limitStr?: string): Ratelimit {
    if (this.limiters.has(action)) {
      return this.limiters.get(action)!
    }

    const [requests, window] = (limitStr || this.defaultLimit).split(' ')
    const limiter = new Ratelimit({
      redis: this.redis,
      limiter: Ratelimit.slidingWindow(parseInt(requests), `${window}` as any),
      prefix: `@synapsy/ratelimit/${action}`,
      analytics: true,
    })

    this.limiters.set(action, limiter)
    return limiter
  }

  async check(identifier: string, action: string): Promise<RateLimitResult> {
    try {
      const limiter = this.getOrCreateLimiter(action)
      const result = await limiter.limit(identifier)

      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      }
    } catch (e) {
      // In case of Redis failure, we fail-open (allow the request) but log the error
      console.error(`[RateLimitAdapter] Failed to check limit for ${identifier}/${action}:`, e)
      return {
        success: true,
        limit: 0,
        remaining: 1,
        reset: Date.now(),
      }
    }
  }
}
