import type { AnswerEvaluationInput, AnswerEvaluationResult, IAnswerEvaluationPort } from '../ports/answer-evaluation.port'

export class EvaluateAnswerUseCase {
  constructor(private readonly evaluator: IAnswerEvaluationPort) {}

  async execute(input: AnswerEvaluationInput): Promise<AnswerEvaluationResult> {
    if (!input.userAnswer.trim()) {
      return { label: 'incorrect', score: 0, source: 'empty' }
    }

    return this.evaluator.evaluate(input)
  }
}
