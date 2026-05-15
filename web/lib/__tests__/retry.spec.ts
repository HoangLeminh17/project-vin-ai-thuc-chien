import { describe, it, expect, vi } from 'vitest'
import { withRetry } from '../retry'

describe('withRetry', () => {
  it('returns result immediately when fn succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on 429 and returns result once fn succeeds', async () => {
    const err = new Error('returned 429 Too Many Requests')
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok')
    const result = await withRetry(fn, 3)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('re-throws non-429 errors without retrying', async () => {
    const err = new Error('Internal Server Error 500')
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, 3)).rejects.toThrow('Internal Server Error 500')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws after exhausting all retries on persistent 429', async () => {
    const err = new Error('returned 429 Too Many Requests')
    const fn = vi.fn().mockRejectedValue(err)
    await expect(withRetry(fn, 2)).rejects.toThrow('429')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})
