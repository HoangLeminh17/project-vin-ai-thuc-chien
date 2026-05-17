import { NextResponse } from 'next/server'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockEvaluate, mockVerifySession } = vi.hoisted(() => ({
  mockEvaluate: vi.fn(),
  mockVerifySession: vi.fn(),
}))

vi.mock('@/infrastructure/registry', () => ({
  verifySessionUseCase: { execute: mockVerifySession },
  evaluateAnswerUseCase: { execute: mockEvaluate },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  monitoring: {
    captureException: vi.fn(),
    trackEvent: vi.fn(),
  },
}))

vi.mock('@/infrastructure/adapters/prometheus.adapter', () => ({
  prometheusRegistry: { trackApiRequest: vi.fn() },
}))

import { POST } from '@/app/api/answer-evaluation/route'

function mockRequest(body: unknown) {
  return {
    method: 'POST',
    url: 'http://localhost/api/answer-evaluation',
    cookies: { get: vi.fn().mockReturnValue({ value: 'session-1' }) },
    json: typeof body === 'function' ? body : vi.fn().mockResolvedValue(body),
  } as any
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('/api/answer-evaluation', () => {
  it('rejects invalid JSON bodies', async () => {
    mockVerifySession.mockResolvedValue({ id: 'user-1' })
    const response = await POST(mockRequest(() => { throw new Error('bad json') }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ success: false, error: 'Invalid JSON body' })
    expect(mockEvaluate).not.toHaveBeenCalled()
  })

  it('rejects missing fields and skips evaluation', async () => {
    mockVerifySession.mockResolvedValue({ id: 'user-1' })
    const response = await POST(mockRequest({ question: 'Q', canonicalAnswer: 'A' }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'Missing or invalid evaluation payload',
    })
    expect(mockEvaluate).not.toHaveBeenCalled()
  })

  it('returns unauthorized when session is missing', async () => {
    mockVerifySession.mockResolvedValue(null)
    const response = await POST(mockRequest({ question: 'Q', canonicalAnswer: 'A', userAnswer: 'U' }))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ success: false, error: 'Unauthorized' })
    expect(mockEvaluate).not.toHaveBeenCalled()
  })

  it('evaluates valid payloads', async () => {
    mockVerifySession.mockResolvedValue({ id: 'user-1' })
    mockEvaluate.mockResolvedValue({ label: 'partial', score: 0.5, source: 'fallback' })

    const response = await POST(mockRequest({
      question: 'Q',
      canonicalAnswer: 'A',
      userAnswer: 'U',
    }))

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      label: 'partial',
      score: 0.5,
      source: 'fallback',
    })
    expect(mockEvaluate).toHaveBeenCalledWith({ question: 'Q', canonicalAnswer: 'A', userAnswer: 'U' })
  })
})
