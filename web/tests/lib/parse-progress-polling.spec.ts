import { afterEach, describe, expect, it, vi } from 'vitest'

import { pollParseProgress } from '@/lib/parse-progress-polling'

const originalWindow = globalThis.window
const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.window = originalWindow
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('pollParseProgress', () => {
  it('stops polling after abort', async () => {
    globalThis.window = {
      setTimeout: setTimeout.bind(globalThis),
      clearTimeout: clearTimeout.bind(globalThis),
    } as any

    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ success: true, progress: { currentChunk: 1, totalChunks: 4, percentComplete: 25 } }),
    })
    globalThis.fetch = fetchMock

    const controller = new AbortController()
    const onProgress = vi.fn(() => controller.abort())

    await pollParseProgress('task-1', onProgress, controller.signal, 1)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onProgress).toHaveBeenCalledWith({ currentChunk: 1, totalChunks: 4, percentComplete: 25 })
  })
})
