import type {
  CreateEvaluationApiResponse,
  CreateEvaluationResponse,
  Evaluation,
  EvaluationAnswerCard,
  EvaluationCorrection,
  EvaluationOmrBatchResponse,
  EvaluationOmrBatchResultItem,
} from '../types'

export const DEFAULT_OMR_CARD_VERSION = 'OMR_V1'

export const OMR_CARD_VERSION_OPTIONS = [
  {
    value: DEFAULT_OMR_CARD_VERSION,
    label: 'OMR padrao v1',
    description: 'QR fixo, marcadores de canto e alternativas A-E',
  },
  {
    value: 'OMR_V1_LARGE',
    label: 'OMR ampliado v1',
    description: 'Espacamento maior para fotos de celular',
  },
]

export function isCreateEvaluationResponse(value: CreateEvaluationApiResponse): value is CreateEvaluationResponse {
  return Boolean(value && typeof value === 'object' && 'evaluation' in value)
}

export function getCreatedEvaluation(value: CreateEvaluationApiResponse): Evaluation {
  return isCreateEvaluationResponse(value) ? value.evaluation : value
}

export function getCreatedAnswerCards(value: CreateEvaluationApiResponse): EvaluationAnswerCard[] {
  if (!isCreateEvaluationResponse(value)) return []
  return value.answerCards ?? value.cartoesResposta ?? []
}

export function getAnswerCardId(card?: EvaluationAnswerCard | null) {
  return card?.cardId ?? card?.cartao_id ?? card?.id ?? ''
}

export function getAnswerCardEvaluationId(card?: EvaluationAnswerCard | null) {
  return card?.evaluationId ?? card?.prova_id ?? ''
}

export function getAnswerCardStudentId(card?: EvaluationAnswerCard | null) {
  return card?.studentId ?? card?.aluno_id ?? ''
}

export function getAnswerCardStudentName(card?: EvaluationAnswerCard | null) {
  return card?.studentName ?? card?.aluno_nome ?? ''
}

export function getAnswerCardSchoolId(card?: EvaluationAnswerCard | null) {
  return card?.schoolId ?? card?.escola_id ?? ''
}

export function getBatchResults(response?: EvaluationOmrBatchResponse | null): EvaluationOmrBatchResultItem[] {
  return response?.results ?? response?.resultados ?? []
}

export function getBatchCorrections(response?: EvaluationOmrBatchResponse | null): EvaluationCorrection[] {
  const explicitCorrections = response?.corrections ?? []
  const resultCorrections = getBatchResults(response)
    .map((item) => item.correction)
    .filter((item): item is EvaluationCorrection => Boolean(item))

  return [...explicitCorrections, ...resultCorrections]
}

export function getBatchTotalSent(response?: EvaluationOmrBatchResponse | null) {
  return response?.totalSent ?? response?.total_enviados ?? getBatchResults(response).length
}

export function getBatchCorrected(response?: EvaluationOmrBatchResponse | null) {
  return response?.corrected ?? response?.corrigidos ?? getBatchResults(response).filter((item) => item.status === 'corrigido').length
}

export function getBatchNeedsReview(response?: EvaluationOmrBatchResponse | null) {
  return response?.needsReview ?? response?.precisam_revisao ?? getBatchResults(response).filter((item) => item.status === 'precisa_revisao').length
}

export function getBatchErrorCount(response?: EvaluationOmrBatchResponse | null) {
  return response?.errorCount ?? response?.total_com_erro ?? getBatchResults(response).filter((item) => item.status !== 'corrigido').length
}
