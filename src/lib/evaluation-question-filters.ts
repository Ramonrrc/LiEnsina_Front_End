import type {
  AssessmentDescriptor,
  CurriculumSkill,
  Difficulty,
  Question,
  QuestionSelectionSourceMode,
  QuestionStatus,
  QuestionSourceType,
} from '../types'

export type EvaluationQuestionFilterInput = {
  gradeLevel?: string | null
  difficulty?: Difficulty | 'all' | null
  status?: QuestionStatus | 'all' | null
  sourceType?: QuestionSourceType | 'all' | null
  schoolId?: string | 'all' | null
  createdById?: string | 'all' | null
  skillCode?: string | 'all' | null
  descriptorCode?: string | 'all' | null
  search?: string | null
  subject?: string | null
  sourceMode?: QuestionSelectionSourceMode | null
}

export type ResolveGeneratedQuestionSelectionInput = {
  responseQuestionIds?: string[] | null
  responseQuestions?: Question[] | null
  localEligibleQuestions: Question[]
  target: number
  filters: EvaluationQuestionFilterInput
  subject?: string | null
  skills?: CurriculumSkill[]
  descriptors?: AssessmentDescriptor[]
  questionMatchesSubject?: (question: Question, subject?: string | null) => boolean
}

function sanitizeText(value?: string | null) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
}

export function normalizeEvaluationFilterText(value?: string | null) {
  return sanitizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function metadataStrings(question: Question, keys: string[]) {
  const values: string[] = []
  for (const key of keys) {
    const value = question.metadata?.[key]
    if (Array.isArray(value)) values.push(...value.map((item) => String(item ?? '')))
    else if (value !== undefined && value !== null) values.push(String(value))
  }
  return values.filter(Boolean)
}

export function getQuestionSkillKeys(question: Question) {
  return Array.from(new Set([
    ...question.skills.flatMap((skill) => [skill.id, skill.code]),
    ...metadataStrings(question, ['skillId', 'skillIds', 'skillCode', 'skillCodes', 'habilidade', 'habilidades']),
  ].filter(Boolean)))
}

export function getQuestionDescriptorKeys(question: Question) {
  return Array.from(new Set([
    ...question.descriptors.flatMap((descriptor) => [descriptor.id, descriptor.code]),
    ...metadataStrings(question, ['descriptorId', 'descriptorIds', 'descriptorCode', 'descriptorCodes', 'descritor', 'descritores']),
  ].filter(Boolean)))
}

export function questionAcademicSearchText(question: Question) {
  return normalizeEvaluationFilterText([
    question.title,
    question.context,
    question.statement,
    question.explanation,
    question.subject,
    question.component,
    question.area,
    question.gradeLevel,
    question.sourceName,
    question.skills.map((skill) => `${skill.id} ${skill.code} ${skill.description} ${skill.component} ${skill.thematicUnit} ${skill.knowledgeObject}`).join(' '),
    question.descriptors.map((descriptor) => `${descriptor.id} ${descriptor.code} ${descriptor.description} ${descriptor.topic} ${descriptor.axis}`).join(' '),
    metadataStrings(question, ['enemDiscipline', 'enemLanguage', 'keywords']).join(' '),
  ].join(' '))
}

function matchesAnyKey(candidate: string, values: string[]) {
  const target = normalizeEvaluationFilterText(candidate)
  if (!target || target === 'all') return true
  return values.some((value) => normalizeEvaluationFilterText(value) === target)
}

export function normalizeEvaluationGradeKey(value?: string | null) {
  const text = normalizeEvaluationFilterText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  if (!text) return ''

  const direct = text.replace(/\s+/g, '')
  if (/^e[fm][1-9]$/.test(direct)) return direct

  const year = text.match(/\b([1-9])(?:o|a)?\b/)?.[1] ?? text.match(/\b([1-9])\b/)?.[1]
  if (text.includes('medio') && year && Number(year) >= 1 && Number(year) <= 3) return `em${year}`
  if ((text.includes('fundamental') || text.includes('ano')) && year && Number(year) >= 1 && Number(year) <= 9) return `ef${year}`
  if (text.includes('serie') && year && Number(year) >= 1 && Number(year) <= 3) return `em${year}`

  return direct
}

export function questionMatchesGradeFilter(questionGrade?: string | null, gradeFilter?: string | null) {
  if (!gradeFilter || gradeFilter === 'all') return true
  const target = normalizeEvaluationGradeKey(gradeFilter)
  const current = normalizeEvaluationGradeKey(questionGrade)
  if (!target || !current) return true
  if (target === current) return true
  if (target.startsWith('em')) return current.startsWith('em') || current.includes('ensino medio') || current.includes('serie')

  const targetYear = target.match(/^ef([1-9])$/)?.[1]
  return Boolean(targetYear && (current === `ef${targetYear}` || current.includes(`${targetYear}oano`) || current.includes(`${targetYear}ano`)))
}

export function questionMatchesSkillFilter(question: Question, skillCode?: string | null, skills: CurriculumSkill[] = []) {
  if (!skillCode || skillCode === 'all') return true

  const directKeys = getQuestionSkillKeys(question)
  if (matchesAnyKey(skillCode, directKeys)) return true

  const selectedSkill = skills.find((skill) => (
    normalizeEvaluationFilterText(skill.code) === normalizeEvaluationFilterText(skillCode)
    || normalizeEvaluationFilterText(skill.id) === normalizeEvaluationFilterText(skillCode)
  ))
  if (!selectedSkill || directKeys.length > 0) return false

  const questionText = questionAcademicSearchText(question)
  const skillTerms = [
    selectedSkill.area,
    selectedSkill.component,
    selectedSkill.thematicUnit,
    selectedSkill.knowledgeObject,
    selectedSkill.description,
  ].map(normalizeEvaluationFilterText).filter(Boolean)

  return skillTerms.some((term) => questionText.includes(term) || term.includes(questionText))
}

export function questionMatchesDescriptorFilter(question: Question, descriptorCode?: string | null, descriptors: AssessmentDescriptor[] = []) {
  if (!descriptorCode || descriptorCode === 'all') return true

  const directKeys = getQuestionDescriptorKeys(question)
  if (matchesAnyKey(descriptorCode, directKeys)) return true

  const selectedDescriptor = descriptors.find((descriptor) => (
    normalizeEvaluationFilterText(descriptor.code) === normalizeEvaluationFilterText(descriptorCode)
    || normalizeEvaluationFilterText(descriptor.id) === normalizeEvaluationFilterText(descriptorCode)
  ))
  if (!selectedDescriptor || directKeys.length > 0) return false

  const questionText = questionAcademicSearchText(question)
  const descriptorTerms = [
    selectedDescriptor.code,
    selectedDescriptor.description,
    selectedDescriptor.topic,
    selectedDescriptor.axis,
  ].map(normalizeEvaluationFilterText).filter(Boolean)

  return descriptorTerms.some((term) => questionText.includes(term) || term.includes(questionText))
}

export function questionMatchesEvaluationFilters(
  question: Question,
  filters: EvaluationQuestionFilterInput,
  skills: CurriculumSkill[] = [],
  descriptors: AssessmentDescriptor[] = [],
) {
  if (filters.sourceMode === 'enem' && question.sourceType !== 'INEP_ENEM') return false
  if (filters.sourceMode === 'system' && question.sourceType === 'INEP_ENEM') return false
  if (filters.gradeLevel && filters.gradeLevel !== 'all' && !questionMatchesGradeFilter(question.gradeLevel, filters.gradeLevel)) return false
  if (filters.difficulty && filters.difficulty !== 'all' && question.difficulty !== filters.difficulty) return false
  if (filters.status && filters.status !== 'all' && question.status !== filters.status) return false
  if (filters.sourceType && filters.sourceType !== 'all' && question.sourceType !== filters.sourceType) return false
  if (filters.schoolId && filters.schoolId !== 'all' && question.schoolId !== filters.schoolId) return false
  if (filters.createdById && filters.createdById !== 'all' && question.createdById !== filters.createdById) return false
  if (!questionMatchesSkillFilter(question, filters.skillCode, skills)) return false
  if (!questionMatchesDescriptorFilter(question, filters.descriptorCode, descriptors)) return false
  if (filters.search && !questionAcademicSearchText(question).includes(normalizeEvaluationFilterText(filters.search))) return false
  return true
}

function uniqueIds(ids: string[]) {
  const seen = new Set<string>()
  return ids.filter((id) => {
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function resolveGeneratedQuestionSelection({
  responseQuestionIds,
  responseQuestions,
  localEligibleQuestions,
  target,
  filters,
  subject,
  skills = [],
  descriptors = [],
  questionMatchesSubject,
}: ResolveGeneratedQuestionSelectionInput) {
  const safeTarget = Math.max(1, Number(target) || 1)
  const localEligibleIds = localEligibleQuestions.slice(0, safeTarget).map((question) => question.id)
  const localEligibleSet = new Set(localEligibleIds)
  const apiQuestions = responseQuestions ?? []
  const apiIds = responseQuestionIds?.length ? responseQuestionIds : apiQuestions.map((question) => question.id)
  const acceptedLocalApiIds = apiIds.filter((id) => localEligibleSet.has(id))
  const acceptedApiQuestionIds = apiQuestions
    .filter((question) => (
      questionMatchesEvaluationFilters(question, filters, skills, descriptors)
      && (!questionMatchesSubject || questionMatchesSubject(question, subject))
    ))
    .map((question) => question.id)
  const acceptedApiIds = uniqueIds([...acceptedLocalApiIds, ...acceptedApiQuestionIds]).slice(0, safeTarget)

  if (acceptedApiIds.length) {
    const fillIds = localEligibleIds.filter((id) => !acceptedApiIds.includes(id))
    return {
      selectedIds: uniqueIds([...acceptedApiIds, ...fillIds]).slice(0, safeTarget),
      selectedFromApi: true,
      localEligibleIds,
      acceptedApiIds,
    }
  }

  return {
    selectedIds: localEligibleIds,
    selectedFromApi: false,
    localEligibleIds,
    acceptedApiIds,
  }
}
