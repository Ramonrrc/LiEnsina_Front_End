export const MAX_EVALUATION_QUESTIONS = 100

export function clampEvaluationQuestionCount(value: unknown, fallback = 1) {
  const parsed = Math.trunc(Number(value ?? fallback))
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(MAX_EVALUATION_QUESTIONS, Math.max(1, parsed))
}

export function evaluationQuestionLimitMessage() {
  return `A prova pode ter no maximo ${MAX_EVALUATION_QUESTIONS} questoes.`
}
