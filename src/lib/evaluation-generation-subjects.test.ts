import { describe, expect, it } from 'vitest'

import type { Difficulty, Question, QuestionSourceType } from '../types'
import { resolveGeneratedQuestionSelection } from './evaluation-question-filters'
import { questionMatchesEvaluationSubject } from './evaluation-subject-matching'

type SubjectFixture = {
  subject: string
  bankSubject: string
  bankComponent: string
  statement: string
  sourceType: QuestionSourceType
  gradeLevel: string
  gradeFilter: string
}

function makeQuestion(fixture: SubjectFixture, index: number): Question {
  const skillCode = `SK-${index}`
  const descriptorCode = `D-${index}`
  return {
    id: `question-${index}`,
    schoolId: 'school-1',
    networkId: 'network-1',
    createdById: 'teacher-1',
    title: `Questao de ${fixture.subject}`,
    context: '',
    statement: fixture.statement,
    explanation: fixture.statement,
    type: 'MULTIPLE_CHOICE',
    stage: fixture.gradeFilter.startsWith('EM') ? 'MEDIO' : 'FUNDAMENTAL',
    gradeLevel: fixture.gradeLevel,
    area: fixture.bankSubject,
    component: fixture.bankComponent,
    subject: fixture.bankSubject,
    difficulty: 'HARD',
    sourceType: fixture.sourceType,
    sourceName: fixture.sourceType === 'INEP_ENEM' ? 'ENEM' : 'Banco local',
    sourceYear: 2026,
    sourceExternalId: null,
    sourceUrl: null,
    licenseNotes: null,
    visibility: 'GLOBAL',
    status: 'APPROVED',
    isEditable: false,
    reviewedById: null,
    reviewedAt: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    archivedAt: null,
    metadata: { keywords: [fixture.subject] },
    options: [
      { id: `q-${index}-a`, questionId: `question-${index}`, label: 'A', text: fixture.statement, order: 1, isCorrect: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    ],
    skills: [{
      id: `skill-${index}`,
      baseId: 'base-1',
      code: skillCode,
      description: fixture.statement,
      stage: fixture.gradeFilter.startsWith('EM') ? 'MEDIO' : 'FUNDAMENTAL',
      gradeLevel: fixture.gradeLevel,
      area: fixture.bankSubject,
      component: fixture.bankComponent,
      thematicUnit: fixture.subject,
      knowledgeObject: fixture.subject,
      competence: null,
      sourceUrl: null,
      active: true,
      metadata: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      relevance: 'PRIMARY',
    }],
    descriptors: [{
      id: `descriptor-${index}`,
      matrixId: 'matrix-1',
      code: descriptorCode,
      description: fixture.statement,
      topic: fixture.subject,
      axis: fixture.subject,
      order: index,
      active: true,
      metadata: {},
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      program: 'SAEB',
      matrix: fixture.gradeLevel,
      relevance: 'PRIMARY',
    }],
    attachments: [],
    reviews: [],
  }
}

const fixtures: SubjectFixture[] = [
  { subject: 'Lingua Portuguesa', bankSubject: 'Lingua Portuguesa', bankComponent: 'Lingua Portuguesa', statement: 'Interpretacao de texto em lingua portuguesa.', sourceType: 'GLOBAL_CURATED', gradeLevel: '5o ano', gradeFilter: 'EF5' },
  { subject: 'Matematica', bankSubject: 'Matematica', bankComponent: 'Matematica', statement: 'Problema de proporcionalidade e equacoes.', sourceType: 'GLOBAL_CURATED', gradeLevel: '5o ano', gradeFilter: 'EF5' },
  { subject: 'Ciencias', bankSubject: 'Ciencias', bankComponent: 'Ciencias', statement: 'Investigacao sobre seres vivos e ambiente.', sourceType: 'GLOBAL_CURATED', gradeLevel: '5o ano', gradeFilter: 'EF5' },
  { subject: 'Historia', bankSubject: 'Ciencias Humanas', bankComponent: 'Ciencias Humanas', statement: 'A Revolucao Francesa transformou a organizacao politica europeia.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Geografia', bankSubject: 'Ciencias Humanas', bankComponent: 'Ciencias Humanas', statement: 'Cartografia, relevo e urbanizacao ajudam a compreender o territorio.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Arte', bankSubject: 'Linguagens', bankComponent: 'Linguagens', statement: 'A pintura e o teatro expressam movimentos artisticos.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Educacao Fisica', bankSubject: 'Linguagens', bankComponent: 'Linguagens', statement: 'Pratica corporal, esporte e ginastica na cultura do movimento.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Lingua Inglesa', bankSubject: 'Lingua Inglesa', bankComponent: 'Lingua Inglesa', statement: 'Reading comprehension in English language.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Redacao', bankSubject: 'Linguagens', bankComponent: 'Linguagens', statement: 'Texto dissertativo argumentativo com tese e proposta de intervencao.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Literatura', bankSubject: 'Linguagens', bankComponent: 'Linguagens', statement: 'Poema modernista com narrador e linguagem literaria.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Filosofia', bankSubject: 'Ciencias Humanas', bankComponent: 'Ciencias Humanas', statement: 'Etica, razao e pensamento de Socrates no debate filosofico.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Sociologia', bankSubject: 'Ciencias Humanas', bankComponent: 'Ciencias Humanas', statement: 'Desigualdade, classe social e cidadania na sociedade moderna.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Biologia', bankSubject: 'Ciencias da Natureza', bankComponent: 'Ciencias da Natureza', statement: 'Ecologia, genetica e evolucao de especies em um ecossistema.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Fisica', bankSubject: 'Ciencias da Natureza', bankComponent: 'Ciencias da Natureza', statement: 'Velocidade, forca e energia em um movimento acelerado.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
  { subject: 'Quimica', bankSubject: 'Ciencias da Natureza', bankComponent: 'Ciencias da Natureza', statement: 'Reacao quimica, molecula e oxidacao em uma solucao.', sourceType: 'INEP_ENEM', gradeLevel: '1a serie do Ensino Medio', gradeFilter: 'EM1' },
]

describe('evaluation generation subject coverage', () => {
  it('selects every configured school subject returned by the API without optional filters', () => {
    for (const [index, fixture] of fixtures.entries()) {
      const question = makeQuestion(fixture, index + 1)
      const sourceMode = fixture.sourceType === 'INEP_ENEM' ? 'enem' : 'system'

      const selection = resolveGeneratedQuestionSelection({
        responseQuestionIds: [question.id],
        responseQuestions: [question],
        localEligibleQuestions: [],
        target: 1,
        subject: fixture.subject,
        filters: { status: 'APPROVED', sourceMode },
        questionMatchesSubject: questionMatchesEvaluationSubject,
      })

      expect(selection.selectedIds, fixture.subject).toEqual([question.id])
    }
  })

  it('selects every configured school subject returned by the API with grade, skill, descriptor and difficulty filters', () => {
    for (const [index, fixture] of fixtures.entries()) {
      const question = makeQuestion(fixture, index + 1)
      const sourceMode = fixture.sourceType === 'INEP_ENEM' ? 'enem' : 'system'

      const selection = resolveGeneratedQuestionSelection({
        responseQuestionIds: [question.id],
        responseQuestions: [question],
        localEligibleQuestions: [],
        target: 1,
        subject: fixture.subject,
        filters: {
          gradeLevel: fixture.gradeFilter,
          difficulty: question.difficulty as Difficulty,
          status: 'APPROVED',
          skillCode: question.skills[0].code,
          descriptorCode: question.descriptors[0].code,
          sourceMode,
        },
        skills: question.skills,
        descriptors: question.descriptors,
        questionMatchesSubject: questionMatchesEvaluationSubject,
      })

      expect(selection.selectedIds, fixture.subject).toEqual([question.id])
    }
  })

  it('does not treat Ciencias da Natureza as Ciencias do Fundamental', () => {
    const question = makeQuestion({
      subject: 'Biologia',
      bankSubject: 'Ciencias da Natureza',
      bankComponent: 'Ciencias da Natureza',
      statement: 'Ecologia e genetica em um ecossistema.',
      sourceType: 'INEP_ENEM',
      gradeLevel: '1a serie do Ensino Medio',
      gradeFilter: 'EM1',
    }, 99)

    expect(questionMatchesEvaluationSubject(question, 'Ciencias')).toBe(false)
    expect(questionMatchesEvaluationSubject(question, 'Biologia')).toBe(true)
  })

  it('does not treat Ciencias Humanas as Ciencias do Fundamental', () => {
    const question = makeQuestion({
      subject: 'Historia',
      bankSubject: 'Ciencias Humanas',
      bankComponent: 'Ciencias Humanas',
      statement: 'A Revolucao Francesa transformou a politica europeia.',
      sourceType: 'INEP_ENEM',
      gradeLevel: '1a serie do Ensino Medio',
      gradeFilter: 'EM1',
    }, 100)

    expect(questionMatchesEvaluationSubject(question, 'Ciencias')).toBe(false)
    expect(questionMatchesEvaluationSubject(question, 'Historia')).toBe(true)
  })
})
