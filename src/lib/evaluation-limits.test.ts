import { describe, expect, it } from 'vitest'

import { MAX_EVALUATION_QUESTIONS, clampEvaluationQuestionCount, evaluationQuestionLimitMessage } from './evaluation-limits'

describe('evaluation limits', () => {
  it('keeps evaluation question counts between 1 and 100', () => {
    expect(MAX_EVALUATION_QUESTIONS).toBe(100)
    expect(clampEvaluationQuestionCount(0)).toBe(1)
    expect(clampEvaluationQuestionCount(50)).toBe(50)
    expect(clampEvaluationQuestionCount(101)).toBe(100)
    expect(evaluationQuestionLimitMessage()).toContain('100')
  })
})
