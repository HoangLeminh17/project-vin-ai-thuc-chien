import { IRateLimitProvider, RateLimitResult } from '@/core/ports/rate-limit.port'
import Redis from 'ioredis'
import { logger } from '@/infrastructure/di/logger.di'

export interface RedisRateLimitConfig {
  url: string
  // Map of action names to their limits (e.g., { 'generate-course': { count: 5, windowSeconds: 3600 } })
  limits?: Record<string, { count: number; windowSeconds: number }>
}

export class RedisRateLimitAdapter implements IRateLimitProvider {
  private readonly redis: Redis
  private readonly limits: Record<string, { count: number; windowSeconds: number }>
  private readonly defaultLimit = { count: 10, windowSeconds: 3600 }

  constructor(config: RedisRateLimitConfig) {
    let url = config.url
    if (!url.startsWith('redis://') && !url.startsWith('rediss://') && !url.startsWith('unix://')) {
      logger.info('[RedisRateLimitAdapter] REDIS_URL missing prefix, auto-fixing to redis://')
      url = `redis://${url}`
    }

    this.redis = new Redis(url)
    this.limits = config.limits || {}

    this.redis.on('error', (err) => {
      logger.error('[RedisRateLimitAdapter] Redis connection error', { err })
    })
  }

  async check(identifier: string, action: string): Promise<RateLimitResult> {
    const limit = this.limits[action] || this.defaultLimit
    const key = `@synapsy:ratelimit:${action}:${identifier}`
    const now = Date.now()
    const windowStart = now - (limit.windowSeconds * 1000)

    try {
      /**
       * Lua script for atomic sliding window rate limiting
       * ARGV[1]: current timestamp
       * ARGV[2]: window start timestamp
       * ARGV[3]: max requests allowed
       * ARGV[4]: window duration in seconds (for TTL)
       */
      const script = `
        redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[2])
        local count = redis.call('ZCARD', KEYS[1])
        if count < tonumber(ARGV[3]) then
          redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1])
          redis.call('EXPIRE', KEYS[1], ARGV[4])
          return {1, tonumber(ARGV[3]) - count - 1}
        else
          return {0, 0}
        end
      `

      const [allowed, remaining] = await this.redis.eval(
        script,
        1,
        key,
        now.toString(),
        windowStart.toString(),
        limit.count.toString(),
        limit.windowSeconds.toString()
      ) as [number, number]

      return {
        success: allowed === 1,
        limit: limit.count,
        remaining: remaining,
        reset: now + (limit.windowSeconds * 1000), // Approximate reset time
      }
    } catch (e) {
      logger.error('[RedisRateLimitAdapter] Failed to check limit', { identifier, action, err: e })
      // Fail-open strategy
      return {
        success: true,
        limit: limit.count,
        remaining: 1,
        reset: now,
      }
    }
  }
}
