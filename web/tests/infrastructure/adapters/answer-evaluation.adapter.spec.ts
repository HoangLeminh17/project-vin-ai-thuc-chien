import { afterEach, describe, expect, it, vi } from 'vitest'

import { AnswerEvaluationAdapter } from '@/infrastructure/adapters/answer-evaluation.adapter'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

function adapter(maxCacheEntries = 2) {
  return new AnswerEvaluationAdapter({
    provider: 'openai',
    timeoutMs: 1000,
    cacheTtlMs: 60_000,
    maxCacheEntries,
    providers: {
      openai: { apiKey: 'test-key', model: 'test-model', baseUrl: 'https://api.example.test/v1' },
      gemini: { model: 'gemini-test' },
      deepseek: { model: 'deepseek-test' },
      huggingface: { model: 'hf-test' },
    },
  })
}

function mockEvaluationFetch(label = 'correct', score = 0.9) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ label, score }) } }],
  }), { status: 200 }))
  globalThis.fetch = fetchMock
  return fetchMock
}

describe('AnswerEvaluationAdapter cache', () => {
  it('uses hashed cache key and avoids repeated provider calls', async () => {
    const fetchMock = mockEvaluationFetch()
    const evaluator = adapter()
    const input = { question: 'Q', canonicalAnswer: 'Reference answer', userAnswer: 'student answer' }

    await expect(evaluator.evaluate(input)).resolves.toMatchObject({ source: 'openai' })
    await expect(evaluator.evaluate(input)).resolves.toMatchObject({ source: 'cache' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('bounds cache size and evicts oldest entries', async () => {
    const fetchMock = mockEvaluationFetch()
    const evaluator = adapter(1)

    await evaluator.evaluate({ question: 'Q1', canonicalAnswer: 'A1', userAnswer: 'U1' })
    await evaluator.evaluate({ question: 'Q2', canonicalAnswer: 'A2', userAnswer: 'U2' })
    await evaluator.evaluate({ question: 'Q1', canonicalAnswer: 'A1', userAnswer: 'U1' })

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
