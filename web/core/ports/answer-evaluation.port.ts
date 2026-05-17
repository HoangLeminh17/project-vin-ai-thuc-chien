export type AnswerEvaluationLabel = 'correct' | 'partial' | 'incorrect'

export type AnswerEvaluationInput = {
  question: string
  canonicalAnswer: string
  userAnswer: string
}

export type AnswerEvaluationResult = {
  label: AnswerEvaluationLabel
  score: number
  source: string
}

export interface IAnswerEvaluationPort {
  evaluate(input: AnswerEvaluationInput): Promise<AnswerEvaluationResult>
}
