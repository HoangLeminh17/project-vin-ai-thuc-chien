import { describe, expect, it, vi } from 'vitest'

import { EvaluateAnswerUseCase } from '@/core/use-cases/evaluate-answer.usecase'
import type { IAnswerEvaluationPort } from '@/core/ports/answer-evaluation.port'

describe('EvaluateAnswerUseCase', () => {
  it('returns incorrect empty result without calling adapter for blank answers', async () => {
    const evaluator: IAnswerEvaluationPort = { evaluate: vi.fn() }
    const useCase = new EvaluateAnswerUseCase(evaluator)

    await expect(useCase.execute({ question: 'Q', canonicalAnswer: 'A', userAnswer: '   ' })).resolves.toEqual({
      label: 'incorrect',
      score: 0,
      source: 'empty',
    })
    expect(evaluator.evaluate).not.toHaveBeenCalled()
  })

  it('delegates non-empty answers to the evaluation port', async () => {
    const evaluator: IAnswerEvaluationPort = {
      evaluate: vi.fn().mockResolvedValue({ label: 'partial', score: 0.5, source: 'fallback' }),
    }
    const useCase = new EvaluateAnswerUseCase(evaluator)
    const input = { question: 'Q', canonicalAnswer: 'A', userAnswer: 'A-ish' }

    await expect(useCase.execute(input)).resolves.toEqual({ label: 'partial', score: 0.5, source: 'fallback' })
    expect(evaluator.evaluate).toHaveBeenCalledWith(input)
  })
})
