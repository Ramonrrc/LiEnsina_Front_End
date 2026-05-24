import { describe, expect, it } from 'vitest'

import type { AssessmentDescriptor, CurriculumSkill, Question } from '../types'
import {
  getQuestionDescriptorKeys,
  getQuestionSkillKeys,
  questionMatchesGradeFilter,
  questionMatchesDescriptorFilter,
  questionMatchesEvaluationFilters,
  questionMatchesSkillFilter,
  resolveGeneratedQuestionSelection,
} from './evaluation-question-filters'

function makeSkill(overrides: Partial<CurriculumSkill> = {}): CurriculumSkill {
  return {
    id: 'skill-1',
    baseId: 'base-1',
    code: 'EF05MA07',
    description: 'Resolver problemas de multiplicação e divisão.',
    stage: 'FUNDAMENTAL',
    gradeLevel: '5o ano',
    area: 'Matemática',
    component: 'Matemática',
    thematicUnit: 'Números',
    knowledgeObject: 'Problemas de multiplicação',
    competence: null,
    sourceUrl: null,
    active: true,
    metadata: {},
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  }
}

function makeDescriptor(overrides: Partial<AssessmentDescriptor> = {}): AssessmentDescriptor {
  return {
    id: 'descriptor-1',
    matrixId: 'matrix-1',
    code: 'D001',
    description: 'Resolver problema com números naturais.',
    topic: 'Números',
    axis: 'Matemática',
    order: 1,
    active: true,
    metadata: {},
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  }
}

function makeQuestion(overrides: Partial<Question> = {}): Question {
  const skill = makeSkill()
  const descriptor = makeDescriptor()
  return {
    id: 'question-1',
    schoolId: 'school-1',
    networkId: 'network-1',
    createdById: 'teacher-1',
    title: 'Problema de multiplicação',
    context: '',
    statement: 'Resolva o problema envolvendo multiplicação.',
    explanation: 'Multiplicar as quantidades.',
    type: 'MULTIPLE_CHOICE',
    stage: 'FUNDAMENTAL',
    gradeLevel: '5o ano',
    area: 'Matemática',
    component: 'Matemática',
    subject: 'Matemática',
    difficulty: 'HARD',
    sourceType: 'SCHOOL_BANK',
    sourceName: 'Banco local',
    sourceYear: 2026,
    sourceExternalId: null,
    sourceUrl: null,
    licenseNotes: null,
    visibility: 'SCHOOL',
    status: 'APPROVED',
    isEditable: true,
    reviewedById: null,
    reviewedAt: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    archivedAt: null,
    metadata: {},
    options: [],
    skills: [{ ...skill, relevance: 'PRIMARY' }],
    descriptors: [{ ...descriptor, program: 'SAEB', matrix: '5o ano', relevance: 'PRIMARY' }],
    attachments: [],
    reviews: [],
    ...overrides,
  }
}

describe('evaluation question filters', () => {
  it('matches skills by code and by id', () => {
    const question = makeQuestion()

    expect(questionMatchesSkillFilter(question, 'EF05MA07', [makeSkill()])).toBe(true)
    expect(questionMatchesSkillFilter(question, 'skill-1', [makeSkill()])).toBe(true)
    expect(questionMatchesSkillFilter(question, 'EF05LP01', [makeSkill({ code: 'EF05LP01' })])).toBe(false)
  })

  it('matches descriptors by code, id and metadata fallback', () => {
    const metadataOnlyQuestion = makeQuestion({
      descriptors: [],
      metadata: { descriptorCodes: ['D002'], descriptorIds: ['descriptor-2'] },
    })

    expect(questionMatchesDescriptorFilter(makeQuestion(), 'D001', [makeDescriptor()])).toBe(true)
    expect(questionMatchesDescriptorFilter(makeQuestion(), 'descriptor-1', [makeDescriptor()])).toBe(true)
    expect(questionMatchesDescriptorFilter(metadataOnlyQuestion, 'D002', [makeDescriptor({ code: 'D002' })])).toBe(true)
    expect(questionMatchesDescriptorFilter(metadataOnlyQuestion, 'D003', [makeDescriptor({ code: 'D003' })])).toBe(false)
  })

  it('applies difficulty, status and source mode together', () => {
    const systemQuestion = makeQuestion({ difficulty: 'MEDIUM', sourceType: 'SCHOOL_BANK', status: 'APPROVED' })
    const enemQuestion = makeQuestion({ id: 'enem-1', sourceType: 'INEP_ENEM', status: 'APPROVED' })

    expect(questionMatchesEvaluationFilters(systemQuestion, {
      difficulty: 'MEDIUM',
      status: 'APPROVED',
      sourceMode: 'system',
    })).toBe(true)
    expect(questionMatchesEvaluationFilters(systemQuestion, {
      difficulty: 'EASY',
      status: 'APPROVED',
      sourceMode: 'system',
    })).toBe(false)
    expect(questionMatchesEvaluationFilters(enemQuestion, { sourceMode: 'system' })).toBe(false)
    expect(questionMatchesEvaluationFilters(enemQuestion, { sourceMode: 'enem' })).toBe(true)
  })

  it('matches equivalent grade formats used by the backend and UI', () => {
    expect(questionMatchesGradeFilter('5o ano', 'EF5')).toBe(true)
    expect(questionMatchesGradeFilter('5º Ano do Ensino Fundamental', '5o ano')).toBe(true)
    expect(questionMatchesGradeFilter('1ª serie do Ensino Medio', 'EM1')).toBe(true)
    expect(questionMatchesGradeFilter('8o ano', 'EF9')).toBe(false)
  })

  it('keeps selected generation filters aligned with eligible questions', () => {
    const questions = [
      makeQuestion({ id: 'ok', difficulty: 'HARD', metadata: { descriptorCodes: ['D001'] } }),
      makeQuestion({ id: 'wrong-difficulty', difficulty: 'EASY', metadata: { descriptorCodes: ['D001'] } }),
      makeQuestion({ id: 'wrong-descriptor', difficulty: 'HARD', descriptors: [], metadata: { descriptorCodes: ['D999'] } }),
    ]

    const eligibleIds = questions
      .filter((question) => questionMatchesEvaluationFilters(question, {
        difficulty: 'HARD',
        status: 'APPROVED',
        skillCode: 'EF05MA07',
        descriptorCode: 'D001',
        sourceMode: 'system',
      }, [makeSkill()], [makeDescriptor()]))
      .map((question) => question.id)

    expect(eligibleIds).toEqual(['ok'])
  })

  it('exposes skill and descriptor keys from summaries and metadata', () => {
    const question = makeQuestion({
      metadata: {
        skillCodes: ['EF05MA99'],
        descriptorIds: ['descriptor-extra'],
      },
    })

    expect(getQuestionSkillKeys(question)).toEqual(expect.arrayContaining(['skill-1', 'EF05MA07', 'EF05MA99']))
    expect(getQuestionDescriptorKeys(question)).toEqual(expect.arrayContaining(['descriptor-1', 'D001', 'descriptor-extra']))
  })

  it('keeps API-created questions visible even when they were not in the local eligible list yet', () => {
    const apiQuestion = makeQuestion({ id: 'api-created', gradeLevel: '5º Ano do Ensino Fundamental' })
    const localQuestion = makeQuestion({ id: 'local-existing' })

    const selection = resolveGeneratedQuestionSelection({
      responseQuestionIds: ['api-created'],
      responseQuestions: [apiQuestion],
      localEligibleQuestions: [localQuestion],
      target: 2,
      subject: 'Matemática',
      filters: {
        gradeLevel: 'EF5',
        difficulty: 'HARD',
        status: 'APPROVED',
        skillCode: 'EF05MA07',
        descriptorCode: 'D001',
        sourceMode: 'system',
      },
      skills: [makeSkill()],
      descriptors: [makeDescriptor()],
      questionMatchesSubject: () => true,
    })

    expect(selection.selectedFromApi).toBe(true)
    expect(selection.selectedIds).toEqual(['api-created', 'local-existing'])
  })
})
