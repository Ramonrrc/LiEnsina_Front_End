import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck,
  FileDown,
  Plus,
  Save,
  ScanLine,
  Search,
  UserRound,
  X,
  Target,
  Filter,
  Sparkles,
  GraduationCap,
  BookOpen,
  Clock,
  Layers,
  Check,
  ArrowRight,
  MoveLeft,
  Hash,
  Calendar,
  Users,
  AlertCircle,
  Trash2,
  Zap,
  Brain,
  FileText,
  PenTool,
  Eye,
  Tag,
  Timer,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ListChecks,
  Award,
  BadgeCheck,
  CircleDot,
  FileQuestion,
  Settings2,
  LayoutGrid,
  Info,
  Building2,
  MapPin,
  TrendingUp,
} from 'lucide-react'

import { resolveApiAssetUrl } from '../api'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import DateInput from '../components/ui/date-input'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { FieldMessage, fieldStateClass, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'
import { getAcademicSubjectLabel } from '../components/role-portal/portal-components'
import { formatClassGrade, normalizeClassGradeValue } from '../class-grade-options'
import { DEFAULT_OMR_CARD_VERSION, getAnswerCardEvaluationId, OMR_CARD_VERSION_OPTIONS } from '../lib/evaluation-omr'
import { MAX_EVALUATION_QUESTIONS, clampEvaluationQuestionCount, evaluationQuestionLimitMessage } from '../lib/evaluation-limits'
import {
  getQuestionDescriptorKeys,
  getQuestionSkillKeys,
  questionMatchesDescriptorFilter,
  questionMatchesEvaluationFilters,
  questionMatchesGradeFilter,
  questionMatchesSkillFilter,
  resolveGeneratedQuestionSelection,
} from '../lib/evaluation-question-filters'
import { questionMatchesEvaluationSubject } from '../lib/evaluation-subject-matching'
import { uniqueSafePrintableImages } from '../lib/markdown-media-security'
import type {
  AssessmentDescriptor,
  ClassRoom,
  CreateQuestionRequest,
  CurriculumSkill,
  Difficulty,
  Evaluation,
  EvaluationAnswerCard,
  EvaluationBuildMode,
  GenerateQuestionSelectionRequest,
  GenerateQuestionSelectionResponse,
  Question,
  QuestionBankPagePayload,
  QuestionBankPageQuery,
  QuestionImportPlan,
  QuestionSourceType,
  QuestionStatus,
  QuestionVisibility,
  Role,
  UserAccount,
} from '../types'

export interface Teacher {
  id: string
  userId: string
  name: string
  email: string
  schoolId: string
  specialty: string
  active: boolean
  avatarUrl?: string
  bannerUrl?: string
}

interface EvaluationsViewProps {
  currentUser: UserAccount
  currentRole: Role | null
  evaluations: Evaluation[]
  classes: ClassRoom[]
  teachers?: Teacher[]
  answerCards?: EvaluationAnswerCard[]
  curriculumSkills: CurriculumSkill[]
  assessmentDescriptors: AssessmentDescriptor[]
  questionBank: Question[]
  questionImportPlans: QuestionImportPlan[]
  onCreate: (draft: Partial<Evaluation>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  onDownload: (id: string) => Promise<void>
  onDownloadAnswerCards?: (id: string) => Promise<void>
  onCreateQuestion: (draft: CreateQuestionRequest) => Promise<Question>
  onGenerateQuestions: (draft: GenerateQuestionSelectionRequest) => Promise<GenerateQuestionSelectionResponse>
  onLoadQuestionsPage?: (params: QuestionBankPageQuery) => Promise<QuestionBankPagePayload>
  onDeleteQuestion?: (id: string) => Promise<void>
}

type WorkspaceTab = 'builder' | 'bank' | 'inep' | 'create'
type OptionLabel = 'A' | 'B' | 'C' | 'D' | 'E'
type QuestionOriginMode = 'system' | 'enem' | 'mixed'
type BankFilters = {
  search: string; gradeLevel: string; difficulty: string; status: string
  skillCode: string; descriptorCode: string; sourceType: string
  schoolId: string; createdById: string
}
type AutoFilters = { gradeLevel: string; difficulty: string; skillCode: string; descriptorCode: string; subject: string; sourceMode: QuestionOriginMode }
type TeacherQuestionDraft = {
  title: string; context: string; statement: string; explanation: string
  gradeLevel: string; difficulty: Difficulty; visibility: QuestionVisibility
  status: QuestionStatus; sourceName: string; keywords: string
  estimatedTimeSeconds: number; skillId: string; descriptorId: string
  options: Record<OptionLabel, string>; correctOption: OptionLabel
}

const optionLabels: OptionLabel[] = ['A', 'B', 'C', 'D', 'E']
const QUESTIONS_PER_PAGE = 10
const AUTO_ELIGIBLE_PREVIEW_LIMIT = 1
const emptyQuestionPageFacets: QuestionBankPagePayload['facets'] = {
  gradeLevels: [],
  sourceTypes: [],
  schoolIds: [],
  createdByIds: [],
  subjects: [],
  skills: [],
  descriptors: [],
}
const FUNDAMENTAL_BASE_EVALUATION_SUBJECTS = ['Língua Portuguesa','Matemática','Ciências','História','Geografia','Arte','Educação Física','Ensino Religioso']
const FUNDAMENTAL_FINAL_YEARS_EVALUATION_SUBJECTS = [...FUNDAMENTAL_BASE_EVALUATION_SUBJECTS,'Língua Inglesa','Língua Espanhola']
const HIGH_SCHOOL_EVALUATION_SUBJECTS = ['Língua Portuguesa','Redação','Literatura','Matemática','História','Geografia','Filosofia','Sociologia','Biologia','Física','Química','Arte','Educação Física','Língua Inglesa','Língua Espanhola','Projeto de Vida']
const EVALUATION_SUBJECTS_BY_GRADE: Record<string, string[]> = {
  EF1: FUNDAMENTAL_BASE_EVALUATION_SUBJECTS, EF2: FUNDAMENTAL_BASE_EVALUATION_SUBJECTS,
  EF3: FUNDAMENTAL_BASE_EVALUATION_SUBJECTS, EF4: FUNDAMENTAL_BASE_EVALUATION_SUBJECTS,
  EF5: FUNDAMENTAL_BASE_EVALUATION_SUBJECTS, EF6: FUNDAMENTAL_FINAL_YEARS_EVALUATION_SUBJECTS,
  EF7: FUNDAMENTAL_FINAL_YEARS_EVALUATION_SUBJECTS, EF8: FUNDAMENTAL_FINAL_YEARS_EVALUATION_SUBJECTS,
  EF9: FUNDAMENTAL_FINAL_YEARS_EVALUATION_SUBJECTS, EM1: HIGH_SCHOOL_EVALUATION_SUBJECTS,
  EM2: HIGH_SCHOOL_EVALUATION_SUBJECTS, EM3: HIGH_SCHOOL_EVALUATION_SUBJECTS,
}
const SCHOOL_EVALUATION_SUBJECTS = Array.from(new Set([...FUNDAMENTAL_BASE_EVALUATION_SUBJECTS,...FUNDAMENTAL_FINAL_YEARS_EVALUATION_SUBJECTS,...HIGH_SCHOOL_EVALUATION_SUBJECTS]))
const emptyEvaluation: Partial<Evaluation> = {
  title: '', classId: '', subject: SCHOOL_EVALUATION_SUBJECTS[3],
  questions: 10, scheduledAt: new Date().toISOString().slice(0, 10),
  status: 'planejado', corrected: 0, participants: 0, averageScore: 0,
  triLevel: 'Aguardando aplicacao', buildMode: 'manual_bank', questionIds: [],
  omrCardVersion: DEFAULT_OMR_CARD_VERSION,
}

function mergeQuestionsById(...groups: Question[][]) {
  const byId = new Map<string, Question>()
  for (const group of groups) for (const question of group) byId.set(question.id, question)
  return Array.from(byId.values())
}

const requiredEvaluationText = (message: string) =>
  z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim().min(1, message))

const evaluationFormSchema = z.object({
  title: requiredEvaluationText('Informe o título da prova.').pipe(z.string().min(4, 'Título deve ter pelo menos 4 caracteres.')),
  classId: requiredEvaluationText('Selecione a turma da prova.'),
  subject: requiredEvaluationText('Selecione a disciplina.'),
  questions: z.coerce.number().int('Informe um número inteiro de questões.').min(1, 'A prova precisa ter pelo menos 1 questão.'),
  omrCardVersion: requiredEvaluationText('Selecione o modelo do cartao OMR.'),
  scheduledAt: requiredEvaluationText('Selecione a data de aplicação.').pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')),
  questionIds: z.array(z.string()).max(MAX_EVALUATION_QUESTIONS, evaluationQuestionLimitMessage()),
}).superRefine((value, ctx) => {
  if (Number(value.questions) > MAX_EVALUATION_QUESTIONS) {
    ctx.addIssue({ code: 'custom', path: ['questions'], message: evaluationQuestionLimitMessage() })
  }
  if (value.questionIds.length > MAX_EVALUATION_QUESTIONS) {
    ctx.addIssue({ code: 'custom', path: ['questionIds'], message: evaluationQuestionLimitMessage() })
  }
})

const teacherQuestionStep1Schema = z.object({
  title: requiredEvaluationText('Informe o título da questão.').pipe(z.string().min(4, 'Título deve ter pelo menos 4 caracteres.')),
  gradeLevel: requiredEvaluationText('Informe o ano escolar.'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  visibility: z.enum(['PRIVATE', 'SCHOOL', 'NETWORK']),
  status: z.enum(['DRAFT', 'PENDING_REVIEW']),
  skillId: requiredEvaluationText('Selecione a habilidade BNCC.'),
  descriptorId: requiredEvaluationText('Selecione o descritor.'),
  estimatedTimeSeconds: z.coerce.number().int('Informe o tempo em segundos.').min(30, 'Tempo mínimo é 30 segundos.'),
  sourceName: requiredEvaluationText('Informe a fonte da questão.'),
})
const teacherQuestionStep2Schema = z.object({
  statement: requiredEvaluationText('Escreva o enunciado da questão.').pipe(z.string().min(8, 'Enunciado deve ter pelo menos 8 caracteres.')),
  context: z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim().max(1200, 'Contexto deve ter no máximo 1200 caracteres.')),
  explanation: z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim().max(1200, 'Explicação deve ter no máximo 1200 caracteres.')),
  keywords: z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim().max(200, 'Palavras-chave devem ter no máximo 200 caracteres.')),
})
const teacherQuestionStep3Schema = z.object({
  optionA: requiredEvaluationText('Preencha a alternativa A.'),
  optionB: requiredEvaluationText('Preencha a alternativa B.'),
  optionC: requiredEvaluationText('Preencha a alternativa C.'),
  optionD: requiredEvaluationText('Preencha a alternativa D.'),
  optionE: requiredEvaluationText('Preencha a alternativa E.'),
  correctOption: z.enum(['A', 'B', 'C', 'D', 'E']),
})
const teacherQuestionFormSchema = teacherQuestionStep1Schema.merge(teacherQuestionStep2Schema).merge(teacherQuestionStep3Schema)

type EvaluationFormField = keyof z.infer<typeof evaluationFormSchema>
type TeacherQuestionFormField = keyof z.infer<typeof teacherQuestionFormSchema>

function createEmptyQuestionDraft(skillId = '', descriptorId = ''): TeacherQuestionDraft {
  return {
    title: '', context: '', statement: '', explanation: '',
    gradeLevel: '8o ano', difficulty: 'EASY', visibility: 'SCHOOL',
    status: 'DRAFT', sourceName: 'Questao criada pelo professor',
    keywords: '', estimatedTimeSeconds: 90, skillId, descriptorId,
    options: { A: '', B: '', C: '', D: '', E: '' }, correctOption: 'A',
  }
}

function sanitizeText(v: string) { return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() }
function normalizeSearch(v: string) { return sanitizeText(v).toLowerCase() }
function normalizeAcademicText(v?: string | null) { return sanitizeText(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
function isSameAcademicText(a?: string | null, b?: string | null) { return normalizeAcademicText(a) === normalizeAcademicText(b) }
function splitAcademicSubjects(value?: string | null, curriculumSkills: CurriculumSkill[] = []) {
  const text = sanitizeText(value ?? '')
  if (!text) return []
  const chunks = text.split(/[,;|/]+|\s+-\s+|\s+(?:e|ou)\s+/i).map((item) => item.trim()).filter(Boolean)
  const knownSubjects = getKnownEvaluationSubjectsFromText(text, curriculumSkills)
  if (knownSubjects.length > 1) return getUniqueValues([...chunks.filter((item) => academicSubjectCodes(item).length === 0), ...knownSubjects])
  return getUniqueValues([...chunks, ...knownSubjects])
}
function subjectValueStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(subjectValueStrings)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return ['name', 'label', 'subject', 'discipline', 'materia', 'component', 'title', 'code']
      .flatMap((key) => subjectValueStrings(record[key]))
  }
  return value === undefined || value === null ? [] : [String(value)]
}
function academicSubjectCodes(value?: string | null): string[] {
  const text = normalizeAcademicText(value).replace(/[^a-z0-9-]+/g, ' ').trim()
  if (!text) return []
  const codes: string[] = []
  const withoutPhysicalEducation = text.replace(/educacao fisica|ed fisica|educacao-fisica/g, ' ')
  if (/(educacao fisica|ed fisica|educacao-fisica)/.test(text)) codes.push('EDUCACAO_FISICA')
  if (/(lingua portuguesa|portugues|portuguesa|portugues-brasil)/.test(text)) codes.push('LINGUA_PORTUGUESA')
  if (/(lingua inglesa|ingles|inglesa|english)/.test(text)) codes.push('LINGUA_INGLESA')
  if (/(lingua espanhola|espanhol|espanhola|espanol|spanish)/.test(text)) codes.push('LINGUA_ESPANHOLA')
  if (/(ensino religioso|religiao|religioso)/.test(text)) codes.push('ENSINO_RELIGIOSO')
  if (/(projeto de vida|projeto vida)/.test(text)) codes.push('PROJETO_DE_VIDA')
  if (/literatura/.test(text)) codes.push('LITERATURA')
  if (/redacao/.test(text)) codes.push('REDACAO')
  if (/matematica/.test(text)) codes.push('MATEMATICA')
  if (/biologia/.test(text)) codes.push('BIOLOGIA')
  if (/(^|[\s-])fisica([\s-]|$)/.test(withoutPhysicalEducation)) codes.push('FISICA')
  if (/quimica/.test(text)) codes.push('QUIMICA')
  if (/historia/.test(text)) codes.push('HISTORIA')
  if (/geografia/.test(text)) codes.push('GEOGRAFIA')
  if (/filosofia/.test(text)) codes.push('FILOSOFIA')
  if (/sociologia/.test(text)) codes.push('SOCIOLOGIA')
  if (/ciencias/.test(text) && !/(ciencias da natureza|natureza|ciencias humanas|humanas|sociais aplicadas)/.test(text)) codes.push('CIENCIAS')
  if (/(^|[\s-])arte(s)?([\s-]|$)/.test(text)) codes.push('ARTE')
  return Array.from(new Set(codes))
}
function academicSubjectCode(value?: string | null): string | null { return academicSubjectCodes(value)[0] ?? null }
function academicSubjectMatches(first?: string | null, second?: string | null) {
  const firstCodes = academicSubjectCodes(first); const secondCodes = academicSubjectCodes(second)
  if (firstCodes.length || secondCodes.length) return firstCodes.some((code) => secondCodes.includes(code))
  const firstKey = normalizeAcademicText(first).replace(/[^a-z0-9-]+/g, ' ').trim()
  const secondKey = normalizeAcademicText(second).replace(/[^a-z0-9-]+/g, ' ').trim()
  if (!firstKey || !secondKey) return false
  if (firstKey === secondKey || firstKey.includes(secondKey) || secondKey.includes(firstKey)) return true
  const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'ensino', 'anos', 'area', 'lingua'])
  const firstWords = firstKey.split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word))
  const secondWords = secondKey.split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word))
  return firstWords.some((fw) => secondWords.some((sw) => fw === sw || fw.includes(sw) || sw.includes(fw)))
}
function canonicalEvaluationSubjectLabel(value?: string | null, curriculumSkills: CurriculumSkill[] = []) {
  const readableValue = getAcademicSubjectLabel(value, curriculumSkills)
  const direct = SCHOOL_EVALUATION_SUBJECTS.find((subject) => academicSubjectMatches(subject, readableValue || value))
  return direct ?? sanitizeText(readableValue || value || '')
}
function getKnownEvaluationSubjectsFromText(value?: string | null, curriculumSkills: CurriculumSkill[] = []) {
  const readableValue = getAcademicSubjectLabel(value, curriculumSkills)
  const codes = new Set([...academicSubjectCodes(value), ...academicSubjectCodes(readableValue)])
  if (!codes.size) return []
  return SCHOOL_EVALUATION_SUBJECTS.filter((subject) => academicSubjectCodes(subject).some((code) => codes.has(code)))
}
function getEvaluationSubjectsForGrade(grade?: string | null) {
  const normalizedGrade = normalizeClassGradeValue(grade)
  return EVALUATION_SUBJECTS_BY_GRADE[normalizedGrade] ?? SCHOOL_EVALUATION_SUBJECTS
}
function subjectIsAllowedForGrade(subject: string, grade?: string | null) {
  return getEvaluationSubjectsForGrade(grade).some((allowedSubject) => academicSubjectMatches(allowedSubject, subject))
}
function getTeacherEvaluationSubjects(teacher: Teacher, curriculumSkills: CurriculumSkill[] = []) {
  const teacherRecord = teacher as Teacher & {
    subjects?: unknown
    disciplines?: unknown
    disciplinas?: unknown
    materias?: unknown
    academicSubjects?: unknown
    subjectNames?: unknown
    components?: unknown
    componentesCurriculares?: unknown
  }
  const sourceValues = [
    teacher.specialty,
    teacherRecord.subjects,
    teacherRecord.disciplines,
    teacherRecord.disciplinas,
    teacherRecord.materias,
    teacherRecord.academicSubjects,
    teacherRecord.subjectNames,
    teacherRecord.components,
    teacherRecord.componentesCurriculares,
  ].flatMap(subjectValueStrings)
  const subjects = sourceValues
    .flatMap((value) => splitAcademicSubjects(value, curriculumSkills))
    .map((subject) => canonicalEvaluationSubjectLabel(subject, curriculumSkills))
    .filter(Boolean)
  sourceValues.forEach((value) => {
    const wholeSubject = canonicalEvaluationSubjectLabel(value, curriculumSkills)
    if (wholeSubject) subjects.unshift(wholeSubject)
  })
  return getUniqueValues(subjects)
}
function teacherCanUseEvaluationSubject(teacher: Teacher, subject?: string | null, curriculumSkills: CurriculumSkill[] = []) {
  const normalizedSubject = canonicalEvaluationSubjectLabel(subject, curriculumSkills)
  if (!normalizedSubject) return false
  return getTeacherEvaluationSubjects(teacher, curriculumSkills).some((teacherSubject) => academicSubjectMatches(teacherSubject, normalizedSubject))
}
function teacherIsDirectlyLinkedToClass(teacher: Teacher, classRoom?: ClassRoom | null) {
  if (!classRoom) return false
  return classRoom.teacherId === teacher.id || (classRoom.teacherIds ?? []).includes(teacher.id)
}
function teacherMatchesEvaluationClass(teacher: Teacher, classRoom: ClassRoom, curriculumSkills: CurriculumSkill[] = []) {
  const classSubjects = (classRoom.bnccFocus ?? [])
    .flatMap((subject) => splitAcademicSubjects(subject, curriculumSkills))
    .map((subject) => canonicalEvaluationSubjectLabel(subject, curriculumSkills))
    .filter(Boolean)
  if (!classSubjects.length) return false
  return getTeacherEvaluationSubjects(teacher, curriculumSkills).some((teacherSubject) => (
    classSubjects.some((classSubject) => academicSubjectMatches(teacherSubject, classSubject))
  ))
}
function teacherCanUseClassSubject(teacher: Teacher, classRoom: ClassRoom | null | undefined, subject?: string | null, curriculumSkills: CurriculumSkill[] = []) {
  if (!classRoom || !teacherIsDirectlyLinkedToClass(teacher, classRoom)) return false
  const normalizedSubject = canonicalEvaluationSubjectLabel(subject, curriculumSkills)
  if (!normalizedSubject) return false
  const classSubjects = (classRoom.bnccFocus ?? [])
    .flatMap((value) => splitAcademicSubjects(value, curriculumSkills))
    .map((value) => canonicalEvaluationSubjectLabel(value, curriculumSkills))
    .filter(Boolean)
  return (
    subjectIsAllowedForGrade(normalizedSubject, classRoom.grade) ||
    classSubjects.some((classSubject) => academicSubjectMatches(classSubject, normalizedSubject))
  )
}
function canonicalAutoSubjectLabel(value?: string | null) {
  const label = getAcademicSubjectLabel(String(value ?? ''))
  const text = normalizeAcademicText(label)
  if (!text) return ''
  if (text.includes('matematica')) return 'Matemática'
  if (text.includes('ciencias humanas') || text.includes('humanas') || text.includes('sociais aplicadas') || text === 'ciencias-humanas') return 'Ciências Humanas'
  if (text.includes('ciencias da natureza') || text.includes('natureza') || text === 'ciencias-natureza') return 'Ciências da Natureza'
  if (text.includes('linguagens')) return 'Linguagens'
  if (text.includes('ingles') || text.includes('english') || text.includes('lingua inglesa')) return 'Inglês'
  if (text.includes('espanhol') || text.includes('espanol') || text.includes('spanish') || text.includes('lingua espanhola')) return 'Espanhol'
  if (text.includes('portugues') || text.includes('lingua portuguesa')) return 'Língua Portuguesa'
  if (text.includes('redacao')) return 'Redação'
  if (text.includes('educacao fisica')) return 'Educação Física'
  if (text.includes('ensino religioso') || text.includes('religiao') || text.includes('religioso')) return 'Ensino Religioso'
  if (text.includes('projeto de vida') || text.includes('projeto vida')) return 'Projeto de Vida'
  if (text === 'ciencias') return 'Ciências'
  return label
}
function getUniqueCanonicalSubjects(values: string[]) {
  const seen = new Set<string>()
  return values.map(canonicalAutoSubjectLabel).filter((subject) => { const key = normalizeAcademicText(subject); if (!key || seen.has(key)) return false; seen.add(key); return true }).sort((a, b) => a.localeCompare(b))
}
function getUniqueValues(vs: string[]) { return Array.from(new Set(vs.filter(Boolean))).sort((a, b) => a.localeCompare(b)) }
function shortId(id?: string | null) { return id ? id.slice(0, 8) : 'sem-id' }
function getSkillCodes(q: Question) { return q.skills.map(s => s.code) }
function getDescriptorCodes(q: Question) { return q.descriptors.map(d => d.code) }
function questionMatchesSkill(q: Question, skillCode: string, skills: CurriculumSkill[]) { return questionMatchesSkillFilter(q, skillCode, skills) }
function filterKey(value?: string | null) { return normalizeAcademicText(value) }
function createQuestionSkillKeySet(questions: Question[]) { return new Set(questions.flatMap(getQuestionSkillKeys).map(filterKey).filter(Boolean)) }
function createQuestionDescriptorKeySet(questions: Question[]) { return new Set(questions.flatMap(getQuestionDescriptorKeys).map(filterKey).filter(Boolean)) }
function skillMatchesSubject(skill: CurriculumSkill, subject?: string | null) {
  if (!subject) return true
  return [skill.component, skill.area, skill.description, skill.thematicUnit, skill.knowledgeObject, skill.metadata?.subject, skill.metadata?.component, skill.metadata?.area].some((value) => academicSubjectMatches(String(value ?? ''), subject))
}
function skillMatchesGrade(skill: CurriculumSkill, gradeLevel?: string | null) { return questionMatchesGradeFilter(skill.gradeLevel, gradeLevel) }
function optionMatchesKeySet(option: { id: string; code: string }, keys: Set<string>) { return keys.has(filterKey(option.id)) || keys.has(filterKey(option.code)) }
function getSkillOptionLabel(skill: CurriculumSkill) { return `${skill.code} - ${skill.knowledgeObject || skill.description || skill.component}` }
function getSkillOptionDescription(skill: CurriculumSkill) { return [skill.component, skill.thematicUnit, skill.description].filter(Boolean).join(' | ') }
function clampPage(page: number, totalItems: number) { return Math.min(Math.max(1, page), Math.max(1, Math.ceil(totalItems / QUESTIONS_PER_PAGE))) }
function sourceSummary(qs: Question[]) {
  if (!qs.length) return 'Sem questoes'
  const src = getUniqueValues(qs.map(q => formatSourceType(q.sourceType)))
  return src.length > 2 ? `${src.slice(0, 2).join(', ')} +${src.length - 2}` : src.join(', ')
}
function formatDifficulty(d: Difficulty) { return { EASY: 'Fácil', MEDIUM: 'Médio', HARD: 'Difícil' }[d] }
function formatQStatus(s: QuestionStatus) { return { DRAFT: 'Rascunho', PENDING_REVIEW: 'Em revisão', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', ARCHIVED: 'Arquivada' }[s] }
function formatBuildMode(m?: EvaluationBuildMode) { return m ? ({ automatic_bank: 'Automático', manual_bank: 'Manual', teacher_created: 'Professor', mixed: 'Misto' }[m]) : 'Planejado' }
function formatSourceType(t: QuestionSourceType) { return { TEACHER_CREATED: 'Professor', SECRETARY_CREATED: 'Secretaria', AI_GENERATED: 'IA', INEP_ENEM: 'INEP/ENEM', IMPORTED_SPREADSHEET: 'Planilha', SCHOOL_BANK: 'Escola', GLOBAL_CURATED: 'Curadoria' }[t] }
function formatPrintDate(v?: string | null) { if (!v) return ''; const d = new Date(v.includes('T') ? v : `${v}T00:00:00`); return isNaN(d.getTime()) ? v : new Intl.DateTimeFormat('pt-BR').format(d) }
function questionMatchesSubject(q: Question, subject?: string | null) { return questionMatchesEvaluationSubject(q, subject) }
function questionSearchText(q: Question) {
  return normalizeSearch([q.title, q.context, q.statement, q.explanation, q.subject, q.gradeLevel, q.sourceName,
    q.skills.map(s => `${s.code} ${s.description}`).join(' '),
    q.descriptors.map(d => `${d.code} ${d.description}`).join(' '),
    q.metadata.keywords?.join(' ') ?? ''].join(' '))
}

function diffColor(d: Difficulty) {
  return { EASY: 'border-emerald-400 bg-emerald-50 text-emerald-700', MEDIUM: 'border-amber-400 bg-amber-50 text-amber-700', HARD: 'border-rose-400 bg-rose-50 text-rose-700' }[d]
}
function statusColor(s: string) {
  if (s === 'concluido' || s === 'APPROVED') return 'border-emerald-400 bg-emerald-50 text-emerald-700'
  if (s === 'corrigindo' || s === 'em_aplicacao' || s === 'PENDING_REVIEW') return 'border-amber-400 bg-amber-50 text-amber-700'
  if (s === 'planejado' || s === 'DRAFT') return 'border-slate-400 bg-slate-100 text-slate-600'
  return 'border-slate-400 bg-slate-50 text-slate-500'
}
function buildModeColor(m?: EvaluationBuildMode) {
  if (m === 'automatic_bank') return 'border-violet-400 bg-violet-50 text-violet-700'
  if (m === 'teacher_created') return 'border-amber-400 bg-amber-50 text-amber-700'
  if (m === 'mixed') return 'border-cyan-400 bg-cyan-50 text-cyan-700'
  return 'border-slate-400 bg-slate-50 text-slate-500'
}

/* ── Skeleton ── */
function Bone({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-200 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  )
}

/* ── Eyebrow label ── */
function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 font-['DM_Sans',system-ui,sans-serif] ${className}`}>{children}</p>
}

/* ── Section card ── */
function SectionCard({ label, title, icon: Icon, iconBg, children, delay = 0, headerRight }: {
  label: string; title: string; icon: React.ElementType; iconBg: string
  children: React.ReactNode; delay?: number; headerRight?: React.ReactNode
}) {
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className="ev-section overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm"
    >
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      <div className="flex items-center justify-between gap-3 border-b-2 border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${iconBg}`}>
            <Icon size={16} className="text-white" />
          </div>
          <div>
            <Eyebrow className="!text-indigo-500">{label}</Eyebrow>
            <p className="font-['Lora',Georgia,serif] text-sm font-semibold text-slate-900 leading-snug mt-0.5">{title}</p>
          </div>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ── Empty state ── */
function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400">
        {icon}
      </div>
      <div>
        <p className="font-['Lora',Georgia,serif] text-sm font-semibold text-slate-600">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  )
}

/* ── Markdown images ── */
const markdownImagePattern = /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/|\/)[^\s)]+)\)/gi
type PrintableImage = { url: string; alt: string }
type OptionPrintableImage = PrintableImage & { optionLabel?: string; optionId?: string; optionOrder?: number }

function extractMarkdownImages(value?: string | null) {
  const images: PrintableImage[] = []
  const text = String(value ?? '').replace(markdownImagePattern, (_match, alt, url) => { images.push({ url: String(url), alt: String(alt || 'Imagem da questao') }); return '\n' })
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), images }
}
function uniquePrintableImages(images: PrintableImage[]) {
  return uniqueSafePrintableImages(images, { resolveRelativeUrl: (url) => resolveApiAssetUrl(url) })
}
function getAttachmentImages(q: Question, positions: string[]) {
  return (q.attachments ?? []).filter(a => a.fileType === 'IMAGE' && positions.includes(a.position)).map(a => ({ url: a.fileUrl, alt: a.altText || 'Imagem da questao' }))
}
function getOptionAttachmentImages(q: Question): OptionPrintableImage[] {
  return (q.attachments ?? []).filter(a => a.fileType === 'IMAGE' && a.position === 'OPTION').map((attachment) => {
    const metadata = attachment.metadata ?? {}
    const optionLabel = String(metadata.optionLabel ?? metadata.option ?? metadata.alternative ?? metadata.alternativa ?? '').trim().toUpperCase()
    const optionId = String(metadata.optionId ?? metadata.option_id ?? '').trim()
    const optionOrder = Number(metadata.optionOrder ?? metadata.order ?? attachment.order)
    const altLabel = attachment.altText?.match(/\b([A-E])\b/i)?.[1]?.toUpperCase()
    return { url: attachment.fileUrl, alt: attachment.altText || `Imagem da alternativa ${optionLabel || altLabel || ''}`.trim(), optionLabel: optionLabel || altLabel, optionId, optionOrder: Number.isFinite(optionOrder) ? optionOrder : undefined }
  })
}
function getImagesForOption(option: Question['options'][number], index: number, images: OptionPrintableImage[]) {
  const explicit = images.filter((image) => (image.optionId && image.optionId === option.id) || (image.optionLabel && image.optionLabel === option.label.toUpperCase()) || (image.optionOrder && image.optionOrder === option.order))
  if (explicit.length) return explicit
  const imagesWithoutExplicitTarget = images.filter((image) => !image.optionId && !image.optionLabel && !image.optionOrder)
  return imagesWithoutExplicitTarget[index] ? [imagesWithoutExplicitTarget[index]] : []
}
function getQuestionPreviewText(value?: string | null) {
  const extracted = extractMarkdownImages(value)
  return extracted.text || (extracted.images.length ? 'Questao com imagem' : sanitizeText(value ?? ''))
}

function QuestionMedia({ images }: { images: PrintableImage[] }) {
  const visibleImages = uniquePrintableImages(images)
  if (!visibleImages.length) return null
  return (
    <div className="grid gap-3">
      {visibleImages.map((image) => (
        <figure key={image.url} className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white p-2">
          <img src={image.url} alt={image.alt} referrerPolicy="no-referrer" loading="eager" className="max-h-[420px] w-full object-contain" />
        </figure>
      ))}
    </div>
  )
}

function OptionThumbnailMedia({ images }: { images: PrintableImage[] }) {
  const visibleImages = uniquePrintableImages(images).slice(0, 3)
  if (!visibleImages.length) return null
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {visibleImages.map((image) => (
        <figure key={image.url} className="grid h-20 w-24 place-items-center overflow-hidden rounded-lg border-2 border-slate-200 bg-white p-1 shadow-sm">
          <img src={image.url} alt={image.alt} referrerPolicy="no-referrer" loading="eager" className="max-h-full max-w-full object-contain" />
        </figure>
      ))}
    </div>
  )
}

function QuestionTextMediaBlock({ value, images = [], textClassName = 'whitespace-pre-wrap text-sm leading-6 text-slate-700' }: { value?: string | null; images?: PrintableImage[]; textClassName?: string }) {
  const extracted = extractMarkdownImages(value)
  const visibleImages = uniquePrintableImages([...extracted.images, ...images])
  if (!extracted.text && visibleImages.length === 0) return null
  return (
    <div className="grid gap-3">
      {extracted.text && <p className={textClassName}>{extracted.text}</p>}
      <QuestionMedia images={visibleImages} />
    </div>
  )
}

/* ── Skill summary ── */
function SkillSummaryList({ question, compact = false }: { question: Question; compact?: boolean }) {
  const skills = question.skills.slice(0, compact ? 1 : 2)
  const descriptors = question.descriptors.slice(0, compact ? 1 : 2)
  return (
    <div className="grid gap-1.5">
      {skills.map(skill => (
        <div key={skill.id} className="rounded-lg border-2 border-indigo-300 bg-indigo-50 px-2.5 py-1.5">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
            <Target className="h-3 w-3" />{skill.code}
          </div>
          {!compact && <div className="mt-0.5 line-clamp-1 text-[11px] text-indigo-700/70">{skill.description || skill.knowledgeObject}</div>}
        </div>
      ))}
      {descriptors.map(descriptor => (
        <div key={descriptor.id} className="rounded-lg border-2 border-amber-300 bg-amber-50 px-2.5 py-1.5">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
            <Layers className="h-3 w-3" />{descriptor.code}
          </div>
          {!compact && <div className="mt-0.5 line-clamp-1 text-[11px] text-amber-700/70">{descriptor.description}</div>}
        </div>
      ))}
    </div>
  )
}

/* ── Question row compact ── */
function QuestionRowCompact({ question, selected, onToggle, onOpen, index }: { question: Question; selected: boolean; onToggle: () => void; onOpen: () => void; index: number }) {
  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className={`ev-q-row group flex cursor-pointer items-start gap-3 rounded-xl border-2 bg-white p-3.5 transition-all hover:border-indigo-400 hover:shadow-md ${selected ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200' : 'border-slate-300'}`}
      onClick={onToggle}
    >
      <div className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all ${selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-400 group-hover:border-indigo-400'}`}>
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap gap-1">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${diffColor(question.difficulty)}`}>
            <Zap className="h-2.5 w-2.5" />{formatDifficulty(question.difficulty)}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusColor(question.status)}`}>
            <CircleDot className="h-2.5 w-2.5" />{formatQStatus(question.status)}
          </span>
        </div>
        <p className="text-sm font-bold text-slate-900 leading-snug group-hover:text-indigo-700">{question.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{getQuestionPreviewText(question.statement)}</p>
        <div className="mt-2">
          <SkillSummaryList question={question} compact />
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen() }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-slate-300 bg-white text-slate-400 opacity-0 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 group-hover:opacity-100"
        aria-label="Ver questão"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ── Question card (bank) ── */
function QuestionCard({ question, selected, onToggle, onOpen, onDelete, deleting = false }: { question: Question; selected: boolean; onToggle: () => void; onOpen: () => void; onDelete?: () => void; deleting?: boolean; index: number }) {
  const correctOpt = question.options.find(o => o.isCorrect)
  const canDelete = question.sourceType === 'TEACHER_CREATED' && question.isEditable && Boolean(onDelete)
  return (
    <article className={`ev-card group rounded-2xl bg-white p-5 transition-all hover:shadow-lg ${selected ? 'border-2 border-indigo-500 shadow-lg ring-2 ring-indigo-100' : 'border-2 border-slate-300 hover:border-indigo-400'}`}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-1">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${diffColor(question.difficulty)}`}>
            <Zap className="h-3 w-3" />{formatDifficulty(question.difficulty)}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusColor(question.status)}`}>
            <BadgeCheck className="h-3 w-3" />{formatQStatus(question.status)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-400 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            <FileQuestion className="h-3 w-3" />{formatSourceType(question.sourceType)}
          </span>
        </div>
        <div className="flex w-full flex-wrap gap-1.5 sm:w-auto sm:shrink-0">
          <button type="button" onClick={onOpen} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 sm:flex-none">
            <Eye className="h-3.5 w-3.5" />Ver
          </button>
          <button type="button" onClick={onToggle} className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-[11px] font-bold transition sm:flex-none ${selected ? 'border-rose-400 bg-rose-50 text-rose-600 hover:bg-rose-100' : 'border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
            {selected ? <><X className="h-3.5 w-3.5" />Remover</> : <><Plus className="h-3.5 w-3.5" />Selecionar</>}
          </button>
          {canDelete && (
            <button type="button" onClick={onDelete} disabled={deleting} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-600 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none">
              <Trash2 className="h-3.5 w-3.5" />{deleting ? 'Excluindo' : 'Excluir'}
            </button>
          )}
        </div>
      </div>
      <h3 className="mb-1.5 text-sm font-black text-slate-950 leading-snug group-hover:text-indigo-800">{question.title}</h3>
      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{getQuestionPreviewText(question.statement)}</p>
      <div className="mb-3">
        <SkillSummaryList question={question} />
      </div>
      <div className="space-y-1.5">
        {question.options.slice(0, 5).map((o) => (
          <div key={o.id} className={`flex items-start gap-2 rounded-lg border-2 px-3 py-1.5 text-xs ${o.isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-slate-50 text-slate-600'}`}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-black ${o.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{o.label}</span>
            <span className="line-clamp-1 flex-1">{getQuestionPreviewText(o.text)}</span>
            {o.isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t-2 border-slate-200 pt-3 text-[10px] font-bold text-slate-400">
        <span className="inline-flex items-center gap-1"><GraduationCap className="h-3 w-3" />{question.gradeLevel} · {getAcademicSubjectLabel(question.subject)}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700"><Check className="h-3 w-3" />Resp.: {correctOpt?.label ?? '—'}</span>
      </div>
    </article>
  )
}

/* ── Question detail modal ── */
function QuestionDetailModal({ question, onClose }: { question: Question; onClose: () => void }) {
  const options = [...question.options].sort((a, b) => a.order - b.order)
  const correctOpt = options.find((o) => o.isCorrect)
  const contextImages = getAttachmentImages(question, ['CONTEXT'])
  const statementImages = getAttachmentImages(question, ['STATEMENT'])
  const optionImages = getOptionAttachmentImages(question)

  return (
    <div role="presentation" onMouseDown={onClose} className="ev-overlay fixed inset-0 z-[1100] grid place-items-center overflow-y-auto bg-slate-900/50 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog" aria-modal="true" aria-labelledby="question-detail-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="ev-modal-in my-auto max-h-[calc(100svh-4rem)] w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-2xl"
      >
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-200 bg-slate-50 px-6 py-5">
          <div className="min-w-0">
            <Eyebrow className="!text-indigo-500">Visualizar questão</Eyebrow>
            <h2 id="question-detail-title" className="mt-1 font-['Lora',Georgia,serif] text-lg font-bold leading-tight text-slate-950">{question.title}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${diffColor(question.difficulty)}`}><Zap className="h-3 w-3" />{formatDifficulty(question.difficulty)}</span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusColor(question.status)}`}><BadgeCheck className="h-3 w-3" />{formatQStatus(question.status)}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600"><FileQuestion className="h-3 w-3" />{formatSourceType(question.sourceType)}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-slate-300 bg-white text-slate-500 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all" aria-label="Fechar modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(100svh-13rem)] overflow-y-auto p-6 space-y-4">
          {question.context && (
            <div className="rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
              <Eyebrow className="mb-2">Texto de apoio</Eyebrow>
              <QuestionTextMediaBlock value={question.context} images={contextImages} />
            </div>
          )}
          <div className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3">
            <Eyebrow className="mb-2">Enunciado</Eyebrow>
            <QuestionTextMediaBlock value={question.statement} images={statementImages} textClassName="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-900" />
          </div>
          <div className="grid gap-2">
            {options.map((option, index) => {
              const optionTextMedia = extractMarkdownImages(option.text)
              const optionInlineImages = [...optionTextMedia.images, ...getImagesForOption(option, index, optionImages)]
              return (
                <div key={option.id} className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-sm ${option.isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-white text-slate-700'}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black ${option.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{option.label}</span>
                  <span className="min-w-0 flex-1">
                    <QuestionTextMediaBlock value={optionTextMedia.text || (optionInlineImages.length ? 'Alternativa com imagem' : option.text)} textClassName="whitespace-pre-wrap leading-6" />
                  </span>
                  <OptionThumbnailMedia images={optionInlineImages} />
                  {option.isCorrect && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />Correta
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            Resposta correta: {correctOpt?.label ?? '-'}
          </div>
          {question.explanation && (
            <div className="rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
              <Eyebrow className="mb-2">Explicação</Eyebrow>
              <QuestionTextMediaBlock value={question.explanation} />
            </div>
          )}
          <SkillSummaryList question={question} />
        </div>
      </div>
    </div>
  )
}

/* ── Pagination ── */
function PaginationControls({ page, totalItems, onPageChange, label = 'questões' }: { page: number; totalItems: number; onPageChange: (page: number) => void; label?: string }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / QUESTIONS_PER_PAGE))
  const start = totalItems === 0 ? 0 : (page - 1) * QUESTIONS_PER_PAGE + 1
  const end = Math.min(totalItems, page * QUESTIONS_PER_PAGE)
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i) }
    else if (page <= 3) pages.push(1, 2, 3, 4, '...', totalPages)
    else if (page >= totalPages - 2) pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    else pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
    return pages
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-100 text-indigo-600">
          <LayoutGrid className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold text-slate-700">{start}–{end} <span className="font-normal text-slate-400">de</span> {totalItems} <span className="font-normal text-slate-400">{label}</span></span>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(1)} className="grid h-8 w-8 place-items-center rounded-lg border-2 border-slate-300 bg-white text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"><ChevronsLeft className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="grid h-8 w-8 place-items-center rounded-lg border-2 border-slate-300 bg-white text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
        {getPageNumbers().map((p, i) => typeof p === 'number'
          ? <button key={i} type="button" onClick={() => onPageChange(p)} className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-bold ${page === p ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'border-2 border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}>{p}</button>
          : <span key={i} className="px-1 text-slate-400">…</span>
        )}
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="grid h-8 w-8 place-items-center rounded-lg border-2 border-slate-300 bg-white text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} className="grid h-8 w-8 place-items-center rounded-lg border-2 border-slate-300 bg-white text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"><ChevronsRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

/* ── PDF Preview ── */
function EvaluationPdfPreview({ draft, selectedQuestions, classLabel }: { draft: Partial<Evaluation>; selectedQuestions: Question[]; classLabel: string }) {
  const previewQuestions = selectedQuestions.slice(0, 3)
  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-gradient-to-br from-slate-100 to-slate-50 p-3 shadow-inner sm:p-4">
      <Eyebrow className="mb-3 text-center">Prévia A4</Eyebrow>
      <div className="mx-auto min-h-[420px] w-full max-w-[320px] rounded-xl bg-white px-5 py-6 shadow-xl ring-1 ring-slate-300 sm:px-7">
        <div className="border-b-2 border-slate-900 pb-3 text-center">
          <h3 className="font-['Lora',Georgia,serif] text-sm font-bold uppercase leading-snug text-slate-950 line-clamp-2">{draft.title || 'Título da prova'}</h3>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-slate-600">
          <div className="border-b border-slate-300 pb-1"><strong>Aluno:</strong></div>
          <div className="border-b border-slate-300 pb-1"><strong>Data:</strong> {formatPrintDate(draft.scheduledAt)}</div>
          <div className="border-b border-slate-300 pb-1"><strong>Turma:</strong> {classLabel}</div>
          <div className="border-b border-slate-300 pb-1"><strong>Disciplina:</strong> {getAcademicSubjectLabel(draft.subject) || '-'}</div>
        </div>
        <div className="mt-4 space-y-3">
          {previewQuestions.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-[10px] font-bold text-slate-400">
              <FileQuestion className="mx-auto mb-2 h-6 w-6 text-slate-300" />Selecione questões para visualizar.
            </div>
          ) : previewQuestions.map((q, index) => (
            <div key={q.id} className="break-inside-avoid">
              <p className="line-clamp-3 text-[10px] font-bold leading-snug text-slate-900">{index + 1}. {getQuestionPreviewText(q.statement) || q.title}</p>
              <div className="mt-1.5 grid gap-1">
                {q.options.slice(0, 4).map(option => (
                  <div key={option.id} className="flex gap-1 text-[9px] leading-snug text-slate-600">
                    <strong>{option.label})</strong><span className="line-clamp-1">{getQuestionPreviewText(option.text)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-slate-900 p-2">
          <p className="mb-1 text-[9px] font-black uppercase text-slate-800">Cartão de respostas</p>
          <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-700">
            {Array.from({ length: Math.max(4, Math.min(10, Number(draft.questions ?? (selectedQuestions.length || 4)))) }).map((_, i) => (
              <span key={i}>{i + 1}. A() B() C() D() E()</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Composition panel ── */
function CompositionPanel({ draft, selectedQuestions, selectedSkillCodes, selectedDescriptorCodes, estimatedMinutes, buildMode, classLabel, registeredEvaluationsCount, onRemoveQuestion, onOpenQuestion, onOpenRegisteredEvaluations, onClear }: {
  draft: Partial<Evaluation>; selectedQuestions: Question[]; selectedSkillCodes: string[]; selectedDescriptorCodes: string[]
  estimatedMinutes: number; buildMode: EvaluationBuildMode; classLabel: string; registeredEvaluationsCount: number
  onRemoveQuestion: (id: string) => void; onOpenQuestion: (q: Question) => void; onOpenRegisteredEvaluations: () => void; onClear: () => void
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className="border-b-2 border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-200">
                <ListChecks className="h-4 w-4" />
              </div>
              <div>
                <Eyebrow className="!text-indigo-500">Composição da Prova</Eyebrow>
                <p className="font-DMSans text-sm font-semibold text-slate-900 mt-0.5">{selectedQuestions.length} quest{selectedQuestions.length !== 1 ? 'ões' : 'ão'} selecionada{selectedQuestions.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={onOpenRegisteredEvaluations} className="inline-flex items-center gap-2 rounded-xl font-DMSans border-2 border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50">
                <ClipboardList className="h-3.5 w-3.5" />Provas cadastradas
                <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-black text-white">{registeredEvaluationsCount}</span>
              </button>
              {selectedQuestions.length > 0 && (
                <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-rose-400 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100">
                  <Trash2 className="h-3.5 w-3.5" />Limpar
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b-2 border-slate-200 p-4 sm:grid-cols-4">
          {[
            { label: 'Tempo est.', value: estimatedMinutes ? `${estimatedMinutes}min` : '—', icon: Timer, color: 'text-cyan-600 bg-cyan-100' },
            { label: 'Habilidades', value: String(selectedSkillCodes.length), icon: Target, color: 'text-indigo-600 bg-indigo-100' },
            { label: 'Descritores', value: String(selectedDescriptorCodes.length), icon: Layers, color: 'text-amber-600 bg-amber-100' },
            { label: 'Modo', value: formatBuildMode(buildMode), icon: Settings2, color: 'text-violet-600 bg-violet-100' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3 hover:border-indigo-300 transition-colors">
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.color}`}>
                <s.icon className="h-3 w-3" />{s.label}
              </div>
              <div className="mt-1 text-base font-black text-slate-800">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="max-h-[500px] space-y-2 overflow-y-auto p-4">
          {selectedQuestions.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="Prova vazia" sub="Use a geração automática ou selecione questões do banco" />
          ) : selectedQuestions.map((q, idx) => (
            <div key={q.id} className="group flex items-start gap-3 rounded-xl border-2 border-slate-300 bg-white p-3 hover:border-indigo-300 transition-all">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-100 text-sm font-black text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-all">{idx + 1}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-700">{q.title}</p>
                <div className="mt-1.5"><SkillSummaryList question={q} compact /></div>
              </div>
              <button type="button" onClick={() => onOpenQuestion(q)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-slate-300 text-slate-400 opacity-0 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 group-hover:opacity-100 transition-all" aria-label="Ver questão"><Eye className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => onRemoveQuestion(q.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-slate-300 text-slate-400 opacity-0 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 transition-all"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </div>
      <EvaluationPdfPreview draft={draft} selectedQuestions={selectedQuestions} classLabel={classLabel} />
    </div>
  )
}

/* ════════════════════════════════════════════
   MAIN VIEW
════════════════════════════════════════════ */
export default function EvaluationsView({
  currentUser, currentRole, evaluations, classes, curriculumSkills, assessmentDescriptors,
  teachers = [], answerCards = [], questionBank, questionImportPlans,
  onCreate, onDelete, onDownload, onDownloadAnswerCards, onCreateQuestion, onGenerateQuestions, onLoadQuestionsPage, onDeleteQuestion,
}: EvaluationsViewProps) {
  const firstSkillId = curriculumSkills[0]?.id ?? ''
  const firstDescriptorId = assessmentDescriptors[0]?.id ?? ''

  const [draft, setDraft] = useState<Partial<Evaluation>>({ ...emptyEvaluation })
  const [statusFilter, setStatusFilter] = useState('all')
  const [workspace, setWorkspace] = useState<WorkspaceTab>('builder')
  const [buildMode, setBuildMode] = useState<EvaluationBuildMode>('manual_bank')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [formNotice, setFormNotice] = useState<string | null>(null)
  const [evaluationFieldErrors, setEvaluationFieldErrors] = useState<FieldErrors<EvaluationFormField>>({})
  const [questionFormError, setQuestionFormError] = useState<string | null>(null)
  const [questionFieldErrors, setQuestionFieldErrors] = useState<FieldErrors<TeacherQuestionFormField>>({})
  const [deletingEvaluationId, setDeletingEvaluationId] = useState<string | null>(null)
  const [downloadingEvaluationId, setDownloadingEvaluationId] = useState<string | null>(null)
  const [downloadingAnswerCardsId, setDownloadingAnswerCardsId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Evaluation | null>(null)
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null)
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<Question | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [evaluationsModalOpen, setEvaluationsModalOpen] = useState(false)
  const [questionPreview, setQuestionPreview] = useState<Question | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [bankPage, setBankPage] = useState(1)
  const [inepPage, setInepPage] = useState(1)
  const [bankFilters, setBankFilters] = useState<BankFilters>({ search: '', gradeLevel: 'all', difficulty: 'all', status: 'all', skillCode: 'all', descriptorCode: 'all', sourceType: 'all', schoolId: 'all', createdById: 'all' })
  const [debouncedBankSearch, setDebouncedBankSearch] = useState('')
  const [bankQuestionsPage, setBankQuestionsPage] = useState<QuestionBankPagePayload | null>(null)
  const [inepQuestionsPage, setInepQuestionsPage] = useState<QuestionBankPagePayload | null>(null)
  const [autoQuestionsPage, setAutoQuestionsPage] = useState<QuestionBankPagePayload | null>(null)
  const [isBankQuestionsLoading, setIsBankQuestionsLoading] = useState(false)
  const [isInepQuestionsLoading, setIsInepQuestionsLoading] = useState(false)
  const [isAutoQuestionsLoading, setIsAutoQuestionsLoading] = useState(false)
  const [questionsPageError, setQuestionsPageError] = useState<string | null>(null)
  const [autoFilters, setAutoFilters] = useState<AutoFilters>({ gradeLevel: 'all', difficulty: 'all', skillCode: 'all', descriptorCode: 'all', subject: 'all', sourceMode: 'system' })
  const deferredAutoFilters = useDeferredValue(autoFilters)
  const [teacherQuestionDraft, setTeacherQuestionDraft] = useState<TeacherQuestionDraft>(createEmptyQuestionDraft(firstSkillId, firstDescriptorId))
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)

  useEffect(() => { const t = setTimeout(() => setIsLoading(false), 800); return () => clearTimeout(t) }, [])
  useEffect(() => { setBankPage(1) }, [bankFilters])
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedBankSearch(bankFilters.search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [bankFilters.search])

  const currentRoleText = normalizeAcademicText(`${currentRole?.code ?? ''} ${currentRole?.name ?? ''}`)
  const canSeeAllBankQuestions = currentRoleText.includes('admin') || currentRoleText.includes('diretor') || currentRoleText.includes('coordenador') || currentRoleText.includes('pedagog')
  const isProfessorRole = currentRole?.code === 'PROFESSOR' || currentRoleText.includes('professor') || currentRoleText.includes('docente') || currentRoleText.includes('teacher') || Boolean(currentUser.linkedTeacherId)
  const activeSkills = useMemo(() => curriculumSkills.filter(s => s.active), [curriculumSkills])
  const currentQuestionCreatorIds = useMemo(() => [currentUser.id, currentUser.linkedTeacherId].filter((id): id is string => Boolean(id)), [currentUser.id, currentUser.linkedTeacherId])
  const currentTeacherProfiles = useMemo(() => teachers.filter((t) => t.id === currentUser.linkedTeacherId || t.userId === currentUser.id || currentQuestionCreatorIds.includes(t.id) || currentQuestionCreatorIds.includes(t.userId)), [currentQuestionCreatorIds, currentUser.id, currentUser.linkedTeacherId, teachers])
  const isTeacherScopedUser = isProfessorRole || currentTeacherProfiles.length > 0
  const currentTeacherIds = useMemo(() => new Set([currentUser.linkedTeacherId, ...currentTeacherProfiles.map(t => t.id)].filter((id): id is string => Boolean(id))), [currentTeacherProfiles, currentUser.linkedTeacherId])
  const currentTeacherSchoolIds = useMemo(() => new Set([...currentTeacherProfiles.map((teacher) => teacher.schoolId), currentUser.schoolId].filter((id): id is string => Boolean(id))), [currentTeacherProfiles, currentUser.schoolId])
  const currentTeacherClasses = useMemo(() => {
    if (!currentTeacherIds.size && !currentTeacherProfiles.length) return []
    return classes.filter((classRoom) => {
      const ids = [classRoom.teacherId, ...(classRoom.teacherIds ?? [])].filter(Boolean)
      if (ids.some((id) => currentTeacherIds.has(id))) return true
      if (currentTeacherSchoolIds.size && !currentTeacherSchoolIds.has(classRoom.schoolId)) return false
      return currentTeacherProfiles.some((teacher) => teacherMatchesEvaluationClass(teacher, classRoom, activeSkills))
    })
  }, [activeSkills, classes, currentTeacherIds, currentTeacherProfiles, currentTeacherSchoolIds])
  const selectedEvaluationClass = useMemo(() => classes.find((c) => c.id === draft.classId) ?? null, [classes, draft.classId])
  const allowedEvaluationSubjects = useMemo(() => {
    const gradeSubjects = getEvaluationSubjectsForGrade(selectedEvaluationClass?.grade)
    if (!isTeacherScopedUser) return gradeSubjects
    const teacherSubjects = getUniqueValues(currentTeacherProfiles.flatMap((t) => getTeacherEvaluationSubjects(t, activeSkills)))
    const teacherSubjectKeys = new Set(teacherSubjects.map((subject) => normalizeAcademicText(subject)))
    const classSubjects = currentTeacherClasses
      .flatMap((classRoom) => {
        const rawSubjects = (classRoom.bnccFocus ?? [])
          .flatMap((subject) => splitAcademicSubjects(subject, activeSkills))
          .map((subject) => canonicalEvaluationSubjectLabel(subject, activeSkills))
          .filter(Boolean)
        const isDirectClassLink = currentTeacherProfiles.some((teacher) => teacherIsDirectlyLinkedToClass(teacher, classRoom))
        return isDirectClassLink ? [...rawSubjects, ...getEvaluationSubjectsForGrade(classRoom.grade)] : rawSubjects
      })
      .filter(Boolean)
    const subjectBase = teacherSubjects.length ? teacherSubjects : SCHOOL_EVALUATION_SUBJECTS
    const subjects = getUniqueValues([...subjectBase, ...classSubjects])
    if (!selectedEvaluationClass?.grade) return subjects
    return subjects.filter((subject) => (
      teacherSubjectKeys.has(normalizeAcademicText(subject)) ||
      !teacherSubjects.length ||
      subjectIsAllowedForGrade(subject, selectedEvaluationClass.grade)
    ))
  }, [activeSkills, currentTeacherClasses, currentTeacherProfiles, isTeacherScopedUser, selectedEvaluationClass?.grade])
  const allowedEvaluationSubjectKeys = useMemo(() => new Set(allowedEvaluationSubjects.map((s) => normalizeAcademicText(s))), [allowedEvaluationSubjects])
  const bankQuestionPool = useMemo(() => questionBank.filter(q => q.sourceType !== 'INEP_ENEM'), [questionBank])
  const visibleBankQuestionPool = useMemo(() => canSeeAllBankQuestions ? bankQuestionPool : bankQuestionPool.filter(q => currentQuestionCreatorIds.includes(q.createdById)), [bankQuestionPool, canSeeAllBankQuestions, currentQuestionCreatorIds])
  const inepQuestions = useMemo(() => questionBank.filter(q => q.sourceType === 'INEP_ENEM'), [questionBank])
  const mixedAutoQuestionPool = useMemo(() => [...inepQuestions, ...visibleBankQuestionPool], [inepQuestions, visibleBankQuestionPool])
  const questionCatalog = useMemo(() => mergeQuestionsById(
    questionBank,
    generatedQuestions,
    bankQuestionsPage?.questions ?? [],
    inepQuestionsPage?.questions ?? [],
    autoQuestionsPage?.questions ?? [],
  ), [autoQuestionsPage?.questions, bankQuestionsPage?.questions, generatedQuestions, inepQuestionsPage?.questions, questionBank])
  const teacherScopedEvaluations = useMemo(() => {
    if (!isTeacherScopedUser || !currentTeacherProfiles.length) return evaluations
    return evaluations.filter((evaluation) => {
      const classRoom = classes.find((item) => item.id === evaluation.classId)
      const schoolId = evaluation.schoolId ?? classRoom?.schoolId
      if (schoolId && currentTeacherSchoolIds.size && !currentTeacherSchoolIds.has(schoolId)) return false
      return currentTeacherProfiles.some((teacher) => {
        if (schoolId && teacher.schoolId !== schoolId) return false
        return (
          teacherCanUseEvaluationSubject(teacher, evaluation.subject, activeSkills) ||
          teacherCanUseClassSubject(teacher, classRoom, evaluation.subject, activeSkills)
        )
      })
    })
  }, [activeSkills, classes, currentTeacherProfiles, currentTeacherSchoolIds, evaluations, isTeacherScopedUser])
  const filteredEvaluations = useMemo(() => statusFilter === 'all' ? teacherScopedEvaluations : teacherScopedEvaluations.filter(e => e.status === statusFilter), [statusFilter, teacherScopedEvaluations])
  const answerCardsByEvaluationId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const card of answerCards) { const id = getAnswerCardEvaluationId(card); if (id) counts.set(id, (counts.get(id) ?? 0) + 1) }
    return counts
  }, [answerCards])
  const canUseBackendQuestionPages = Boolean(onLoadQuestionsPage)
  const backendQuestionFacets = bankQuestionsPage?.facets ?? autoQuestionsPage?.facets ?? emptyQuestionPageFacets
  const gradeLevels = useMemo(() => canUseBackendQuestionPages ? backendQuestionFacets.gradeLevels : getUniqueValues(questionBank.map(q => q.gradeLevel)), [backendQuestionFacets.gradeLevels, canUseBackendQuestionPages, questionBank])
  const sourceTypes = useMemo(() => canUseBackendQuestionPages ? backendQuestionFacets.sourceTypes : getUniqueValues(visibleBankQuestionPool.map(q => q.sourceType)), [backendQuestionFacets.sourceTypes, canUseBackendQuestionPages, visibleBankQuestionPool])
  const bankSchoolIds = useMemo(() => canUseBackendQuestionPages ? backendQuestionFacets.schoolIds : getUniqueValues(visibleBankQuestionPool.map(q => q.schoolId)), [backendQuestionFacets.schoolIds, canUseBackendQuestionPages, visibleBankQuestionPool])
  const bankCreatorIds = useMemo(() => canUseBackendQuestionPages ? backendQuestionFacets.createdByIds : getUniqueValues(visibleBankQuestionPool.map(q => q.createdById)), [backendQuestionFacets.createdByIds, canUseBackendQuestionPages, visibleBankQuestionPool])
  const activeDescriptors = useMemo(() => assessmentDescriptors.filter(d => d.active), [assessmentDescriptors])
  const classOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: '', label: 'Selecionar turma...' }, ...classes.map(c => ({ value: c.id, label: c.name, description: `${formatClassGrade(c.grade)} · ${c.shift}` }))], [classes])
  const subjectOptions = useMemo<Array<CompactSelectOption<string>>>(() => allowedEvaluationSubjects.length ? allowedEvaluationSubjects.map((s) => ({ value: s, label: getAcademicSubjectLabel(s, activeSkills) })) : [{ value: '', label: 'Nenhuma disciplina disponível para esta turma', disabled: true }], [activeSkills, allowedEvaluationSubjects])
  useEffect(() => {
    const fallbackSubject = allowedEvaluationSubjects[0] ?? ''
    setDraft((current) => {
      const currentSubject = canonicalEvaluationSubjectLabel(current.subject, activeSkills)
      const currentSubjectKey = normalizeAcademicText(currentSubject)
      if (currentSubjectKey && allowedEvaluationSubjectKeys.has(currentSubjectKey)) return current.subject === currentSubject ? current : { ...current, subject: currentSubject }
      return { ...current, subject: fallbackSubject }
    })
  }, [activeSkills, allowedEvaluationSubjectKeys, allowedEvaluationSubjects])
  useEffect(() => {
    if (autoFilters.subject === 'all') return
    const currentSubject = canonicalEvaluationSubjectLabel(autoFilters.subject, activeSkills)
    if (allowedEvaluationSubjectKeys.has(normalizeAcademicText(currentSubject))) return
    setAutoFilters((c) => ({ ...c, subject: 'all', skillCode: 'all', descriptorCode: 'all' }))
  }, [activeSkills, allowedEvaluationSubjectKeys, autoFilters.subject])

  const gradeLevelOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos os anos' }, ...gradeLevels.map(v => ({ value: v, label: v }))], [gradeLevels])
  const difficultyOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todas' }, ...(['EASY', 'MEDIUM', 'HARD'] as const).map(v => ({ value: v, label: formatDifficulty(v) }))], [])
  const questionStatusOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos' }, ...(['APPROVED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED', 'ARCHIVED'] as const).map(v => ({ value: v, label: formatQStatus(v) }))], [])
  const sourceTypeOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todas as fontes' }, ...sourceTypes.map(v => ({ value: v, label: formatSourceType(v as QuestionSourceType) }))], [sourceTypes])
  const schoolFilterOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todas as escolas' }, ...bankSchoolIds.map(id => ({ value: id, label: id === currentUser.schoolId ? 'Minha escola' : `Escola ${shortId(id)}`, description: id }))], [bankSchoolIds, currentUser.schoolId])
  const creatorFilterOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos os professores' }, ...bankCreatorIds.map(id => ({ value: id, label: id === currentUser.id ? 'Minhas questões' : `Professor ${shortId(id)}`, description: id }))], [bankCreatorIds, currentUser.id])
  const teacherDifficultyOptions = useMemo<Array<CompactSelectOption<Difficulty>>>(() => (['EASY', 'MEDIUM', 'HARD'] as const).map(v => ({ value: v, label: formatDifficulty(v) })), [])
  const teacherVisibilityOptions = useMemo<Array<CompactSelectOption<QuestionVisibility>>>(() => [{ value: 'PRIVATE', label: 'Privada' }, { value: 'SCHOOL', label: 'Escola' }, { value: 'NETWORK', label: 'Rede' }], [])
  const teacherStatusOptions = useMemo<Array<CompactSelectOption<QuestionStatus>>>(() => [{ value: 'DRAFT', label: 'Rascunho' }, { value: 'PENDING_REVIEW', label: 'Em revisão' }], [])
  const teacherSkillOptions = useMemo<Array<CompactSelectOption<string>>>(() => activeSkills.map(skill => ({ value: skill.id, label: getSkillOptionLabel(skill), description: getSkillOptionDescription(skill) })), [activeSkills])
  const teacherDescriptorOptions = useMemo<Array<CompactSelectOption<string>>>(() => activeDescriptors.map(d => ({ value: d.id, label: d.code, description: d.description })), [activeDescriptors])
  const selectedAutoSubjectForQuery = useMemo(() => canonicalEvaluationSubjectLabel(autoFilters.subject === 'all' ? draft.subject : autoFilters.subject, activeSkills), [activeSkills, autoFilters.subject, draft.subject])
  const bankPageQuery = useMemo<QuestionBankPageQuery>(() => ({
    page: bankPage,
    limit: QUESTIONS_PER_PAGE,
    sourceMode: 'system',
    search: debouncedBankSearch,
    gradeLevel: bankFilters.gradeLevel,
    difficulty: bankFilters.difficulty,
    status: bankFilters.status,
    skillCode: bankFilters.skillCode,
    descriptorCode: bankFilters.descriptorCode,
    sourceType: bankFilters.sourceType,
    schoolId: bankFilters.schoolId,
    createdById: bankFilters.createdById,
    includeFacets: true,
    facetsMode: 'bank',
  }), [bankFilters.createdById, bankFilters.descriptorCode, bankFilters.difficulty, bankFilters.gradeLevel, bankFilters.schoolId, bankFilters.skillCode, bankFilters.sourceType, bankFilters.status, bankPage, debouncedBankSearch])
  const inepPageQuery = useMemo<QuestionBankPageQuery>(() => ({
    page: inepPage,
    limit: QUESTIONS_PER_PAGE,
    sourceMode: 'enem',
    includeFacets: true,
    facetsMode: 'bank',
  }), [inepPage])
  const autoPageQuery = useMemo<QuestionBankPageQuery>(() => ({
    page: 1,
    limit: AUTO_ELIGIBLE_PREVIEW_LIMIT,
    sourceMode: autoFilters.sourceMode,
    subject: selectedAutoSubjectForQuery,
    gradeLevel: autoFilters.gradeLevel,
    difficulty: autoFilters.difficulty,
    status: 'APPROVED',
    skillCode: autoFilters.skillCode,
    descriptorCode: autoFilters.descriptorCode,
    includeFacets: true,
    facetsMode: 'auto',
  }), [autoFilters.descriptorCode, autoFilters.difficulty, autoFilters.gradeLevel, autoFilters.skillCode, autoFilters.sourceMode, selectedAutoSubjectForQuery])

  useEffect(() => {
    if (!onLoadQuestionsPage) return
    let active = true
    setIsBankQuestionsLoading(true)
    setQuestionsPageError(null)
    onLoadQuestionsPage(bankPageQuery)
      .then((payload) => {
        if (!active) return
        setBankQuestionsPage(payload)
        if (payload.pagination.page !== bankPage) setBankPage(payload.pagination.page)
      })
      .catch((error) => {
        if (!active) return
        setQuestionsPageError(error instanceof Error ? error.message : 'Nao foi possivel buscar questoes no banco.')
      })
      .finally(() => { if (active) setIsBankQuestionsLoading(false) })
    return () => { active = false }
  }, [bankPage, bankPageQuery, onLoadQuestionsPage, questionBank.length])

  useEffect(() => {
    if (!onLoadQuestionsPage || workspace !== 'inep') return
    let active = true
    setIsInepQuestionsLoading(true)
    setQuestionsPageError(null)
    onLoadQuestionsPage(inepPageQuery)
      .then((payload) => {
        if (!active) return
        setInepQuestionsPage(payload)
        if (payload.pagination.page !== inepPage) setInepPage(payload.pagination.page)
      })
      .catch((error) => {
        if (!active) return
        setQuestionsPageError(error instanceof Error ? error.message : 'Nao foi possivel buscar questoes do ENEM.')
      })
      .finally(() => { if (active) setIsInepQuestionsLoading(false) })
    return () => { active = false }
  }, [inepPage, inepPageQuery, onLoadQuestionsPage, workspace])

  useEffect(() => {
    if (!onLoadQuestionsPage || workspace !== 'builder' || buildMode !== 'automatic_bank' || !selectedAutoSubjectForQuery) return
    let active = true
    setIsAutoQuestionsLoading(true)
    setQuestionsPageError(null)
    onLoadQuestionsPage(autoPageQuery)
      .then((payload) => {
        if (!active) return
        setAutoQuestionsPage(payload)
      })
      .catch((error) => {
        if (!active) return
        setQuestionsPageError(error instanceof Error ? error.message : 'Nao foi possivel atualizar os filtros de questoes.')
      })
      .finally(() => { if (active) setIsAutoQuestionsLoading(false) })
    return () => { active = false }
  }, [autoPageQuery, buildMode, onLoadQuestionsPage, questionBank.length, selectedAutoSubjectForQuery, workspace])

  const filteredQuestions = useMemo(() => {
    if (canUseBackendQuestionPages) return bankQuestionsPage?.questions ?? []
    const s = normalizeSearch(bankFilters.search)
    return visibleBankQuestionPool.filter(q => {
      if (!questionMatchesEvaluationFilters(q, { ...bankFilters, difficulty: bankFilters.difficulty === 'all' ? 'all' : bankFilters.difficulty as Difficulty, status: bankFilters.status === 'all' ? 'all' : bankFilters.status as QuestionStatus, sourceType: bankFilters.sourceType === 'all' ? 'all' : bankFilters.sourceType as QuestionSourceType }, activeSkills, activeDescriptors)) return false
      if (s && !questionSearchText(q).includes(s)) return false
      return true
    })
  }, [activeDescriptors, activeSkills, bankFilters, bankQuestionsPage?.questions, canUseBackendQuestionPages, visibleBankQuestionPool])

  const autoFiltersPending = deferredAutoFilters !== autoFilters
  const autoSourcePool = useMemo(() => (
    canUseBackendQuestionPages
      ? []
      : deferredAutoFilters.sourceMode === 'enem'
      ? inepQuestions
      : deferredAutoFilters.sourceMode === 'mixed'
        ? mixedAutoQuestionPool
        : visibleBankQuestionPool
  ), [canUseBackendQuestionPages, deferredAutoFilters.sourceMode, inepQuestions, mixedAutoQuestionPool, visibleBankQuestionPool])
  const autoSubjectOptions = useMemo<Array<CompactSelectOption<string>>>(() => {
    const subjectCandidates = canUseBackendQuestionPages
      ? autoQuestionsPage?.facets.subjects ?? []
      : autoSourcePool.flatMap((q) => [q.subject, q.component, q.area, q.metadata.enemDiscipline, q.metadata.enemLanguage])
    const subjects = getUniqueCanonicalSubjects([
      ...allowedEvaluationSubjects,
      ...subjectCandidates.map((s) => getAcademicSubjectLabel(String(s ?? ''), activeSkills)),
      ...(autoFilters.sourceMode === 'system' ? [] : ['Inglês', 'Espanhol']),
    ])
      .map((s) => canonicalEvaluationSubjectLabel(s, activeSkills))
      .filter((s) => allowedEvaluationSubjectKeys.has(normalizeAcademicText(s)))
    return [{ value: 'all', label: 'Usar disciplina da prova', description: draft.subject ? getAcademicSubjectLabel(draft.subject, activeSkills) : 'Sem disciplina selecionada' }, ...subjects.map((s) => ({ value: s, label: s }))]
  }, [activeSkills, allowedEvaluationSubjectKeys, allowedEvaluationSubjects, autoFilters.sourceMode, autoQuestionsPage?.facets.subjects, autoSourcePool, canUseBackendQuestionPages, draft.subject])
  const selectedAutoSubject = useMemo(() => canUseBackendQuestionPages ? selectedAutoSubjectForQuery : canonicalEvaluationSubjectLabel(deferredAutoFilters.subject === 'all' ? draft.subject : deferredAutoFilters.subject, activeSkills), [activeSkills, canUseBackendQuestionPages, deferredAutoFilters.subject, draft.subject, selectedAutoSubjectForQuery])
  const autoSubjectFilteredPool = useMemo(() => {
    if (canUseBackendQuestionPages) return []
    if (!selectedAutoSubject) return []
    return autoSourcePool.filter(q => { if (q.status !== 'APPROVED') return false; if (!questionMatchesGradeFilter(q.gradeLevel, deferredAutoFilters.gradeLevel)) return false; if (deferredAutoFilters.difficulty !== 'all' && q.difficulty !== deferredAutoFilters.difficulty) return false; if (selectedAutoSubject && !questionMatchesSubject(q, selectedAutoSubject)) return false; return true })
  }, [canUseBackendQuestionPages, deferredAutoFilters.difficulty, deferredAutoFilters.gradeLevel, autoSourcePool, selectedAutoSubject])
  const autoSkillKeySet = useMemo(() => createQuestionSkillKeySet(autoSubjectFilteredPool), [autoSubjectFilteredPool])
  const compatibleAutoSkills = useMemo(() => {
    if (canUseBackendQuestionPages) return autoQuestionsPage?.facets.skills ?? []
    const fallback = autoSkillKeySet.size === 0
    return activeSkills.filter((s) => { if (!skillMatchesSubject(s, selectedAutoSubject)) return false; if (!skillMatchesGrade(s, deferredAutoFilters.gradeLevel)) return false; return fallback || optionMatchesKeySet(s, autoSkillKeySet) })
  }, [activeSkills, autoQuestionsPage?.facets.skills, autoSkillKeySet, canUseBackendQuestionPages, deferredAutoFilters.gradeLevel, selectedAutoSubject])
  const compatibleAutoSkillKeys = useMemo(() => new Set(compatibleAutoSkills.flatMap((s) => [s.id, s.code]).map(filterKey).filter(Boolean)), [compatibleAutoSkills])
  const autoSkillFilteredPool = useMemo(() => canUseBackendQuestionPages ? [] : autoSubjectFilteredPool.filter(q => questionMatchesSkill(q, deferredAutoFilters.skillCode, activeSkills)), [activeSkills, autoSubjectFilteredPool, canUseBackendQuestionPages, deferredAutoFilters.skillCode])
  const autoDescriptorKeySet = useMemo(() => createQuestionDescriptorKeySet(autoSkillFilteredPool), [autoSkillFilteredPool])
  const compatibleAutoDescriptors = useMemo(() => canUseBackendQuestionPages ? autoQuestionsPage?.facets.descriptors ?? [] : activeDescriptors.filter((d) => optionMatchesKeySet(d, autoDescriptorKeySet)), [activeDescriptors, autoDescriptorKeySet, autoQuestionsPage?.facets.descriptors, canUseBackendQuestionPages])
  const compatibleAutoDescriptorKeys = useMemo(() => new Set(compatibleAutoDescriptors.flatMap((d) => [d.id, d.code]).map(filterKey).filter(Boolean)), [compatibleAutoDescriptors])
  const skillCodeOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: compatibleAutoSkills.length ? 'Todas compatíveis' : 'Sem habilidade', description: selectedAutoSubject ? `Disciplina: ${getAcademicSubjectLabel(selectedAutoSubject, activeSkills)}` : 'Selecione a disciplina' }, ...compatibleAutoSkills.map(s => ({ value: s.code || s.id, label: getSkillOptionLabel(s), description: getSkillOptionDescription(s) }))], [activeSkills, compatibleAutoSkills, selectedAutoSubject])
  const descriptorCodeOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: compatibleAutoDescriptors.length ? 'Todos compatíveis' : 'Sem descritor', description: selectedAutoSubject ? `Disciplina: ${getAcademicSubjectLabel(selectedAutoSubject, activeSkills)}` : 'Selecione a disciplina' }, ...compatibleAutoDescriptors.map(d => ({ value: d.code || d.id, label: d.code, description: d.description }))], [activeSkills, compatibleAutoDescriptors, selectedAutoSubject])
  useEffect(() => { if (autoFiltersPending) return; if (autoFilters.skillCode === 'all') return; if (compatibleAutoSkillKeys.has(filterKey(autoFilters.skillCode))) return; setAutoFilters((c) => { if (c.skillCode === 'all' && c.descriptorCode === 'all') return c; return { ...c, skillCode: 'all', descriptorCode: 'all' } }) }, [autoFilters.skillCode, autoFiltersPending, compatibleAutoSkillKeys])
  useEffect(() => { if (autoFiltersPending) return; if (autoFilters.descriptorCode === 'all') return; if (compatibleAutoDescriptorKeys.has(filterKey(autoFilters.descriptorCode))) return; setAutoFilters((c) => c.descriptorCode === 'all' ? c : { ...c, descriptorCode: 'all' }) }, [autoFilters.descriptorCode, autoFiltersPending, compatibleAutoDescriptorKeys])
  const autoEligible = useMemo(() => canUseBackendQuestionPages ? autoQuestionsPage?.questions ?? [] : autoSkillFilteredPool.filter(q => questionMatchesDescriptorFilter(q, deferredAutoFilters.descriptorCode, activeDescriptors)), [activeDescriptors, autoQuestionsPage?.questions, autoSkillFilteredPool, canUseBackendQuestionPages, deferredAutoFilters.descriptorCode])
  const autoEligibleTotal = canUseBackendQuestionPages ? autoQuestionsPage?.pagination.total ?? 0 : autoEligible.length
  const questionCatalogById = useMemo(() => new Map(questionCatalog.map((question) => [question.id, question])), [questionCatalog])
  const selectedQuestions = useMemo(() => selectedQuestionIds.map(id => questionCatalogById.get(id)).filter((q): q is Question => Boolean(q)), [questionCatalogById, selectedQuestionIds])
  const bankQuestionsTotal = canUseBackendQuestionPages ? bankQuestionsPage?.pagination.total ?? 0 : filteredQuestions.length
  const allQuestionsTotal = canUseBackendQuestionPages ? bankQuestionsPage?.totals.all ?? autoQuestionsPage?.totals.all ?? questionBank.length : questionBank.length
  const systemQuestionsTotal = canUseBackendQuestionPages ? bankQuestionsPage?.totals.system ?? 0 : visibleBankQuestionPool.length
  const safeBankPage = canUseBackendQuestionPages ? bankQuestionsPage?.pagination.page ?? bankPage : clampPage(bankPage, filteredQuestions.length)
  const paginatedQuestions = canUseBackendQuestionPages ? filteredQuestions : filteredQuestions.slice((safeBankPage - 1) * QUESTIONS_PER_PAGE, safeBankPage * QUESTIONS_PER_PAGE)
  const inepQuestionsTotal = canUseBackendQuestionPages ? inepQuestionsPage?.pagination.total ?? bankQuestionsPage?.totals.enem ?? autoQuestionsPage?.totals.enem ?? 0 : inepQuestions.length
  const safeInepPage = canUseBackendQuestionPages ? inepQuestionsPage?.pagination.page ?? inepPage : clampPage(inepPage, inepQuestions.length)
  const paginatedInepQuestions = canUseBackendQuestionPages ? inepQuestionsPage?.questions ?? [] : inepQuestions.slice((safeInepPage - 1) * QUESTIONS_PER_PAGE, safeInepPage * QUESTIONS_PER_PAGE)
  const selectedSkillCodes = useMemo(() => getUniqueValues(selectedQuestions.flatMap(getSkillCodes)), [selectedQuestions])
  const selectedDescriptorCodes = useMemo(() => getUniqueValues(selectedQuestions.flatMap(getDescriptorCodes)), [selectedQuestions])
  const estimatedMinutes = useMemo(() => Math.max(0, Math.ceil(selectedQuestions.reduce((t, q) => t + Number(q.metadata.estimatedTimeSeconds ?? 0), 0) / 60)), [selectedQuestions])
  const teacherSkillId = teacherQuestionDraft.skillId || firstSkillId
  const teacherDescriptorId = teacherQuestionDraft.descriptorId || firstDescriptorId

  function getClassName(id: string) { return classes.find(c => c.id === id)?.name ?? 'Turma não encontrada' }

  function getAutoSourcePoolForFilters(filters: AutoFilters) {
    if (filters.sourceMode === 'enem') return inepQuestions
    if (filters.sourceMode === 'mixed') return mixedAutoQuestionPool
    return visibleBankQuestionPool
  }
  function getAutoEligibleQuestions(filters: AutoFilters, subject: string) {
    return getAutoSourcePoolForFilters(filters)
      .filter(q => {
        if (q.status !== 'APPROVED') return false
        if (!questionMatchesGradeFilter(q.gradeLevel, filters.gradeLevel)) return false
        if (filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false
        if (subject && !questionMatchesSubject(q, subject)) return false
        return true
      })
      .filter(q => questionMatchesSkill(q, filters.skillCode, activeSkills))
      .filter(q => questionMatchesDescriptorFilter(q, filters.descriptorCode, activeDescriptors))
  }

  async function handleExportEvaluation(ev: Evaluation) {
    setDownloadingEvaluationId(ev.id); setFormNotice(null)
    try { await onDownload(ev.id) } catch (error) { setFormNotice(error instanceof Error ? error.message : 'Não foi possível baixar a prova.') } finally { setDownloadingEvaluationId(null) }
  }
  async function handleExportAnswerCards(ev: Evaluation) {
    if (!onDownloadAnswerCards) return
    setDownloadingAnswerCardsId(ev.id); setFormNotice(null)
    try { await onDownloadAnswerCards(ev.id) } catch (error) { setFormNotice(error instanceof Error ? error.message : 'Não foi possível baixar os cartões.') } finally { setDownloadingAnswerCardsId(null) }
  }
  function handleDeleteEvaluation(ev: Evaluation) { setDeleteTarget(ev) }
  function handleDeleteQuestion(question: Question) { setDeleteQuestionTarget(question) }
  async function confirmDeleteEvaluation() {
    if (!deleteTarget || !onDelete) return
    setDeletingEvaluationId(deleteTarget.id)
    try { await onDelete(deleteTarget.id); setFormNotice('Prova excluída com sucesso.'); setDeleteTarget(null) } finally { setDeletingEvaluationId(null) }
  }
  async function confirmDeleteQuestion() {
    if (!deleteQuestionTarget || !onDeleteQuestion) return
    setDeletingQuestionId(deleteQuestionTarget.id)
    try { await onDeleteQuestion(deleteQuestionTarget.id); setSelectedQuestionIds((c) => c.filter((id) => id !== deleteQuestionTarget.id)); setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined })); setFormNotice('Questão excluída do banco.'); setDeleteQuestionTarget(null) } finally { setDeletingQuestionId(null) }
  }
  function toggleQuestion(id: string) {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(c => c.filter(x => x !== id))
      setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined }))
      setFormNotice(null)
      return
    }
    if (selectedQuestionIds.length >= MAX_EVALUATION_QUESTIONS) {
      setEvaluationFieldErrors((c) => ({ ...c, questionIds: evaluationQuestionLimitMessage() }))
      setFormNotice(evaluationQuestionLimitMessage())
      return
    }
    setSelectedQuestionIds(c => [...c, id])
    setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined }))
    setBuildMode(c => c === 'automatic_bank' ? 'mixed' : c)
    setFormNotice(null)
  }
  function clearEvaluationError(field: EvaluationFormField) { setEvaluationFieldErrors((c) => ({ ...c, [field]: undefined })) }
  function scrollToEvaluationError(errors: FieldErrors<EvaluationFormField>) {
    const fieldOrder: EvaluationFormField[] = ['title', 'classId', 'subject', 'questions', 'omrCardVersion', 'scheduledAt', 'questionIds']
    const firstField = fieldOrder.find((f) => Boolean(errors[f]))
    if (!firstField || typeof document === 'undefined') return
    window.requestAnimationFrame(() => { const target = document.querySelector<HTMLElement>(`[data-evaluation-field="${firstField}"]`); if (!target) return; target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); const focusable = target.querySelector<HTMLElement>('input, button, textarea, select, [tabindex]:not([tabindex="-1"])'); focusable?.focus({ preventScroll: true }) })
  }
  function setTeacherQuestionField<K extends keyof TeacherQuestionDraft>(field: K, value: TeacherQuestionDraft[K]) { setQuestionFieldErrors((c) => ({ ...c, [field]: undefined })); setTeacherQuestionDraft((c) => ({ ...c, [field]: value })) }
  function teacherQuestionValues() { return { ...teacherQuestionDraft, optionA: teacherQuestionDraft.options.A, optionB: teacherQuestionDraft.options.B, optionC: teacherQuestionDraft.options.C, optionD: teacherQuestionDraft.options.D, optionE: teacherQuestionDraft.options.E } }
  function validateQuestionStep(step: 1 | 2 | 3) {
    const schema = step === 1 ? teacherQuestionStep1Schema : step === 2 ? teacherQuestionStep2Schema : teacherQuestionStep3Schema
    const result = schema.safeParse(teacherQuestionValues())
    if (!result.success) { setQuestionFieldErrors((c) => ({ ...c, ...zodFieldErrors<TeacherQuestionFormField>(result.error) })); return false }
    setQuestionFormError(null); return true
  }

  async function handleAutoSelect() {
    const target = clampEvaluationQuestionCount(draft.questions, 1)
    if (Number(draft.questions ?? target) > MAX_EVALUATION_QUESTIONS) setDraft(c => ({ ...c, questions: target }))
    const registeredSubject = canonicalEvaluationSubjectLabel(draft.subject, activeSkills) || allowedEvaluationSubjects[0] || SCHOOL_EVALUATION_SUBJECTS[3]
    if (!allowedEvaluationSubjectKeys.has(normalizeAcademicText(registeredSubject))) {
      const errors: FieldErrors<EvaluationFormField> = { subject: 'Selecione uma disciplina vinculada ao professor ou à turma.' }
      setEvaluationFieldErrors(errors); setFormNotice(errors.subject ?? 'Revise os campos da prova.'); scrollToEvaluationError(errors); return
    }
    const selectionSubject = autoFilters.subject === 'all' ? registeredSubject : canonicalEvaluationSubjectLabel(autoFilters.subject, activeSkills) || registeredSubject
    const payload: GenerateQuestionSelectionRequest = { quantity: target, subject: selectionSubject, gradeLevel: autoFilters.gradeLevel === 'all' ? null : autoFilters.gradeLevel, difficulty: autoFilters.difficulty === 'all' ? null : autoFilters.difficulty as Difficulty, sourceMode: autoFilters.sourceMode, skillCode: autoFilters.skillCode === 'all' ? null : autoFilters.skillCode, descriptorCode: autoFilters.descriptorCode === 'all' ? null : autoFilters.descriptorCode }
    const localEligibleQuestions = canUseBackendQuestionPages ? [] : getAutoEligibleQuestions(autoFilters, selectionSubject)
    setIsGeneratingQuestions(true); setFormNotice(null)
    try {
      const response = await onGenerateQuestions(payload)
      const responseQuestions = response.questions ?? []
      const selection = canUseBackendQuestionPages
        ? {
            selectedIds: (response.questionIds?.length ? response.questionIds : responseQuestions.map((question) => question.id)).slice(0, target),
            selectedFromApi: true,
          }
        : resolveGeneratedQuestionSelection({ responseQuestionIds: response.questionIds, responseQuestions, localEligibleQuestions, target, subject: selectionSubject, filters: { gradeLevel: autoFilters.gradeLevel, difficulty: autoFilters.difficulty === 'all' ? 'all' : autoFilters.difficulty as Difficulty, status: 'APPROVED', skillCode: autoFilters.skillCode, descriptorCode: autoFilters.descriptorCode, sourceMode: autoFilters.sourceMode }, skills: activeSkills, descriptors: activeDescriptors, questionMatchesSubject })
      const nextIds = selection.selectedIds
      if (responseQuestions.length) setGeneratedQuestions(c => mergeQuestionsById(c, responseQuestions))
      if (!nextIds.length) { setEvaluationFieldErrors((c) => ({ ...c, questionIds: 'Nenhuma questão elegível para estes filtros.' })); setFormNotice('Nenhuma questão elegível para estes filtros.'); return }
      setSelectedQuestionIds(nextIds); setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined })); setBuildMode(autoFilters.sourceMode === 'mixed' ? 'mixed' : 'automatic_bank'); setDraft(c => ({ ...c, questions: nextIds.length, subject: c.subject || registeredSubject }))
      if (selection.selectedFromApi) { const suf = typeof response.totalEligible === 'number' ? ` (${response.totalEligible} elegíveis no backend).` : '.'; setFormNotice(`${nextIds.length} questões selecionadas pela API${suf}`) }
      else setFormNotice(`${nextIds.length} questões selecionadas pelos filtros locais (${localEligibleQuestions.length} elegíveis).`)
    } catch (error) {
      const localIds = localEligibleQuestions.slice(0, target).map(q => q.id)
      if (localIds.length) { setSelectedQuestionIds(localIds); setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined })); setBuildMode(autoFilters.sourceMode === 'mixed' ? 'mixed' : 'automatic_bank'); setDraft(c => ({ ...c, questions: localIds.length, subject: c.subject || registeredSubject })); setFormNotice(`${localIds.length} questões selecionadas pelos filtros locais.`); return }
      setFormNotice(error instanceof Error ? error.message : 'Não foi possível gerar questões.')
    } finally { setIsGeneratingQuestions(false) }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validation = evaluationFormSchema.safeParse({ ...draft, questionIds: selectedQuestionIds })
    if (!validation.success) { const errors = zodFieldErrors<EvaluationFormField>(validation.error); setEvaluationFieldErrors(errors); setFormNotice(Object.values(errors)[0] ?? 'Revise os campos da prova.'); scrollToEvaluationError(errors); return }
    if (Number(validation.data.questions) > MAX_EVALUATION_QUESTIONS || selectedQuestionIds.length > MAX_EVALUATION_QUESTIONS) { const errors: FieldErrors<EvaluationFormField> = { questions: evaluationQuestionLimitMessage() }; setEvaluationFieldErrors(errors); setFormNotice(errors.questions ?? 'Revise os campos.'); scrollToEvaluationError(errors); return }
    const validatedSubject = canonicalEvaluationSubjectLabel(validation.data.subject, activeSkills)
    if (!allowedEvaluationSubjectKeys.has(normalizeAcademicText(validatedSubject))) { const errors: FieldErrors<EvaluationFormField> = { subject: 'Selecione uma disciplina vinculada ao professor ou à turma.' }; setEvaluationFieldErrors(errors); setFormNotice(errors.subject ?? 'Revise os campos.'); scrollToEvaluationError(errors); return }
    if (buildMode !== 'teacher_created' && selectedQuestionIds.length === 0) { const errors: FieldErrors<EvaluationFormField> = { questionIds: 'Selecione questões ou use a geração automática.' }; setEvaluationFieldErrors(errors); setFormNotice(errors.questionIds ?? 'Revise os campos.'); scrollToEvaluationError(errors); return }
    setEvaluationFieldErrors({})
    const zTitle = sanitizeText(validation.data.title); const zClassId = sanitizeText(validation.data.classId); const zSubject = validatedSubject; const zOmrCardVersion = sanitizeText(validation.data.omrCardVersion) || DEFAULT_OMR_CARD_VERSION; const zScheduledAt = sanitizeText(validation.data.scheduledAt); const zQuestionCount = selectedQuestions.length || Math.max(1, Number(validation.data.questions)); const zResolvedMode = selectedQuestions.some(q => q.sourceType === 'TEACHER_CREATED') && buildMode !== 'teacher_created' ? 'mixed' : buildMode
    await onCreate({ title: zTitle, classId: zClassId, subject: zSubject, questions: zQuestionCount, omrCardVersion: zOmrCardVersion, scheduledAt: zScheduledAt, status: 'planejado', corrected: 0, participants: 0, averageScore: 0, triLevel: selectedQuestions.length > 0 ? `Banco: ${zQuestionCount} itens` : 'Criação do professor', buildMode: zResolvedMode, questionIds: selectedQuestionIds, skillCodes: selectedSkillCodes, descriptorCodes: selectedDescriptorCodes, sourceSummary: sourceSummary(selectedQuestions) })
    setDraft({ ...emptyEvaluation, subject: allowedEvaluationSubjects[0] ?? emptyEvaluation.subject }); setSelectedQuestionIds([]); setEvaluationFieldErrors({}); setBuildMode('manual_bank'); setFormNotice('Prova criada com cartões individualizados!')
  }

  function updateOption(label: OptionLabel, value: string) { const field = `option${label}` as TeacherQuestionFormField; setQuestionFieldErrors(c => ({ ...c, [field]: undefined })); setTeacherQuestionDraft(c => ({ ...c, options: { ...c.options, [label]: value } })) }

  async function handleTeacherQuestionSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validation = teacherQuestionFormSchema.safeParse(teacherQuestionValues())
    if (!validation.success) { const errors = zodFieldErrors<TeacherQuestionFormField>(validation.error); setQuestionFieldErrors(errors); setQuestionFormError(Object.values(errors)[0] ?? 'Revise os campos.'); if (errors.title || errors.gradeLevel || errors.skillId || errors.descriptorId || errors.estimatedTimeSeconds || errors.sourceName) setCreateStep(1); else if (errors.statement || errors.context || errors.explanation || errors.keywords) setCreateStep(2); else setCreateStep(3); return }
    if (selectedQuestionIds.length >= MAX_EVALUATION_QUESTIONS) { setQuestionFormError(evaluationQuestionLimitMessage()); setEvaluationFieldErrors((c) => ({ ...c, questionIds: evaluationQuestionLimitMessage() })); return }
    setQuestionFieldErrors({})
    const cleanTitle = sanitizeText(teacherQuestionDraft.title); const cleanStatement = sanitizeText(teacherQuestionDraft.statement); const cleanOptions = optionLabels.map((label, i) => ({ label, text: sanitizeText(teacherQuestionDraft.options[label]), order: i + 1, isCorrect: label === teacherQuestionDraft.correctOption }))
    if (cleanTitle.length > 160 || cleanStatement.length > 3000 || cleanOptions.some(o => o.text.length > 1000)) { setQuestionFormError('Reduza o tamanho dos textos da questao antes de salvar.'); return }
    if (cleanTitle.length < 4 || cleanStatement.length < 8) { setQuestionFormError('Informe um título e enunciado válidos.'); return }
    if (cleanOptions.some(o => o.text.length < 1)) { setQuestionFormError('Preencha todas as alternativas.'); return }
    const skill = activeSkills.find(s => s.id === teacherSkillId) ?? activeSkills[0]; const descriptor = activeDescriptors.find(d => d.id === teacherDescriptorId) ?? activeDescriptors[0]
    if (!skill || !descriptor) { setQuestionFormError('Cadastre ao menos uma habilidade e um descritor.'); return }
    const keywords = teacherQuestionDraft.keywords.split(',').map(sanitizeText).filter(Boolean)
    const payload: CreateQuestionRequest = { title: cleanTitle, context: sanitizeText(teacherQuestionDraft.context), statement: cleanStatement, explanation: sanitizeText(teacherQuestionDraft.explanation), type: 'MULTIPLE_CHOICE', stage: 'FUNDAMENTAL', gradeLevel: sanitizeText(teacherQuestionDraft.gradeLevel) || skill.gradeLevel, area: skill.area, component: skill.component, subject: skill.component, difficulty: teacherQuestionDraft.difficulty, sourceType: 'TEACHER_CREATED', sourceName: sanitizeText(teacherQuestionDraft.sourceName) || 'Questão criada pelo professor', sourceYear: new Date().getFullYear(), sourceExternalId: null, sourceUrl: null, licenseNotes: null, visibility: teacherQuestionDraft.visibility, options: cleanOptions, skillIds: [skill.id], descriptorIds: [descriptor.id], attachments: [], metadata: { estimatedTimeSeconds: Number(teacherQuestionDraft.estimatedTimeSeconds) || 90, hasImage: false, hasTable: false, hasFormula: false, keywords } }
    const created = await onCreateQuestion(payload)
    setSelectedQuestionIds(c => [created.id, ...c]); setBuildMode(c => c === 'manual_bank' ? 'teacher_created' : 'mixed'); setDraft(c => ({ ...c, subject: c.subject || created.subject, questions: Math.max(Number(c.questions ?? 0), selectedQuestionIds.length + 1) })); setTeacherQuestionDraft(createEmptyQuestionDraft(firstSkillId, firstDescriptorId)); setQuestionFieldErrors({}); setQuestionFormError(null); setWorkspace('builder'); setFormNotice('Questão criada e adicionada à prova.'); setCreateStep(1)
  }

  /* ── field input classes ── */
  const inp = 'min-h-11 w-full min-w-0 rounded-xl border-2 border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 hover:border-slate-400'
  const inp2 = `${inp} min-h-[100px] py-3 leading-relaxed`

  const tabs = [
    { id: 'builder' as const, label: 'Montar Prova', icon: ClipboardCheck, color: 'text-indigo-600', activeBg: 'bg-indigo-500' },
    { id: 'bank' as const, label: 'Banco', icon: BookOpen, color: 'text-cyan-600', activeBg: 'bg-cyan-500' },
    { id: 'inep' as const, label: 'INEP/ENEM', icon: Award, color: 'text-amber-600', activeBg: 'bg-amber-500' },
    { id: 'create' as const, label: 'Criar Questão', icon: PenTool, color: 'text-violet-600', activeBg: 'bg-violet-500' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes shimmer { to { transform: translateX(300%) } }
        @keyframes ev-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ev-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ev-modal-in { from { opacity: 0; transform: scale(0.95) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes ev-slide-left { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .ev-section { animation: ev-fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .ev-overlay { animation: ev-fade-in 0.2s ease-out both; }
        .ev-modal-in { animation: ev-modal-in 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .ev-q-row { animation: ev-slide-left 0.3s cubic-bezier(0.22,1,0.36,1) both; }
        .ev-card { animation: ev-fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .ev-spinner { display:inline-block; width:14px; height:14px; border-radius:50%; border:2px solid rgba(255,255,255,0.3); border-top-color:white; animation:spin 0.7s linear infinite; flex-shrink:0; }

        .ev-tab-btn { position: relative; }
        .ev-tab-btn.active::after { content: ''; position: absolute; bottom: 0; left: 12px; right: 12px; height: 2px; border-radius: 2px 2px 0 0; background: currentColor; }
        .ev-tab-btn:not(.active):hover { background: rgba(0,0,0,.03); }

        .ev-table-row:hover { background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%); }
        .ev-table-row { transition: background 0.15s; }

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        .ev-save-btn { transition: all 0.18s cubic-bezier(0.22,1,0.36,1); }
        .ev-save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(109,40,217,0.35); }
        .ev-save-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <div className="mx-auto grid min-h-screen w-full max-w-[1720px] gap-5 bg-gradient-to-br from-slate-100 via-white to-slate-50 px-[clamp(12px,2.5vw,40px)] py-4 pb-16 text-slate-900 font-['DM_Sans',system-ui,sans-serif]">

        {/* ══ HEADER BAR ══ */}
        <div className="ev-section overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
                <GraduationCap size={20} className="text-white" />
              </div>
              <div>
                <Eyebrow className="!text-indigo-500">Avaliação inteligente</Eyebrow>
                <p className="font-DMSans text-lg font-bold text-slate-900 leading-tight mt-0.5">Provas &amp; Simulados</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 divide-x divide-slate-200">
              {[
                { label: 'Provas', value: teacherScopedEvaluations.length, icon: ClipboardList, color: 'bg-indigo-100 text-indigo-600' },
                { label: 'Turmas', value: classes.length, icon: Users, color: 'bg-cyan-100 text-cyan-600' },
                { label: 'Banco', value: allQuestionsTotal, icon: BookOpen, color: 'bg-violet-100 text-violet-600' },
              ].map((s, i) => (
                <div key={i} className={`flex items-center gap-2 ${i > 0 ? 'pl-4' : ''}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.color}`}><s.icon size={14} /></div>
                  <div>
                    <Eyebrow>{s.label}</Eyebrow>
                    <p className="font-['Lora',Georgia,serif] text-base font-bold text-slate-900 leading-none">{isLoading ? '—' : s.value}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pl-4">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-300 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700"><ScanLine className="h-3 w-3" />Correção automática</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ MAIN WORKSPACE ══ */}
        <div className="ev-section overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm" style={{ animationDelay: '60ms' }}>
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

          {/* Tab nav */}
          <div className="flex overflow-x-auto border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white">
            {tabs.map(tab => (
              <button
                key={tab.id} type="button"
                onClick={() => { setWorkspace(tab.id); if (tab.id === 'create') setCreateStep(1) }}
                className={`ev-tab-btn flex min-w-[86px] flex-1 items-center justify-center gap-2 border-r-2 border-slate-200 px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider last:border-r-0 sm:min-w-0 sm:gap-2.5 sm:px-5 sm:text-xs transition-colors ${workspace === tab.id ? `active ${tab.color}` : 'text-slate-400 hover:text-slate-600'}`}
              >
                <div className={`grid h-7 w-7 place-items-center rounded-xl transition-all ${workspace === tab.id ? `${tab.activeBg} text-white shadow-md` : 'bg-slate-100 text-slate-400'}`}>
                  <tab.icon className="h-3.5 w-3.5" />
                </div>
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── BUILDER TAB ── */}
          {questionsPageError && (
            <div className="flex items-center gap-2 border-b-2 border-amber-300 bg-amber-50 px-5 py-3 text-xs font-bold text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
              {questionsPageError}
            </div>
          )}

          {workspace === 'builder' && (
            <form onSubmit={handleSubmit} noValidate>

              {/* Seção 1: Identificação */}
              <div className="border-b-2 border-slate-200 p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100 text-indigo-600"><FileText className="h-3.5 w-3.5" /></div>
                  <div>
                    <Eyebrow className="!text-indigo-500">Passo 1</Eyebrow>
                    <p className="font-DMSans text-sm font-semibold text-slate-800 leading-tight mt-0.5">Identificação da Prova</p>
                  </div>
                </div>

                <label className="mb-4 block scroll-mt-24" data-evaluation-field="title">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <PenTool className="h-3 w-3 text-indigo-400" />Título da Prova
                  </span>
                  <input className={`${inp} ${fieldStateClass(evaluationFieldErrors.title)}`} placeholder="Ex: Simulado 1 — Matemática 8º Ano" value={draft.title ?? ''} onChange={e => { clearEvaluationError('title'); setDraft({ ...draft, title: e.target.value }) }} required aria-invalid={Boolean(evaluationFieldErrors.title) || undefined} />
                  <FieldMessage hint="Digite um título claro para identificar a prova." error={evaluationFieldErrors.title} />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="classId">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Users className="h-3 w-3 text-cyan-500" />Turma</span>
                    <CompactSelect className={`${inp} ${fieldStateClass(evaluationFieldErrors.classId)}`} value={draft.classId ?? ''} onChange={classId => { clearEvaluationError('classId'); setDraft({ ...draft, classId }) }} options={classOptions} hint="Selecione a turma que fará a avaliação." error={evaluationFieldErrors.classId} dropdownMinWidth={240} />
                  </label>
                  <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="subject">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><BookOpen className="h-3 w-3 text-amber-500" />Disciplina</span>
                    <CompactSelect className={`${inp} ${fieldStateClass(evaluationFieldErrors.subject)}`} value={draft.subject ?? ''} onChange={subject => { clearEvaluationError('subject'); setDraft({ ...draft, subject: canonicalEvaluationSubjectLabel(subject, activeSkills) }) }} options={subjectOptions} hint="Selecione a disciplina da prova." error={evaluationFieldErrors.subject} dropdownMinWidth={240} />
                  </label>
                  <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="questions">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Hash className="h-3 w-3 text-violet-500" />Nº de Questões</span>
                    <div className="relative">
                      <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input className={`${inp} pl-9 ${fieldStateClass(evaluationFieldErrors.questions)}`} type="number" min={1} max={MAX_EVALUATION_QUESTIONS} value={draft.questions ?? 10} onChange={e => { clearEvaluationError('questions'); setDraft({ ...draft, questions: clampEvaluationQuestionCount(e.target.value, 1) }) }} required aria-invalid={Boolean(evaluationFieldErrors.questions) || undefined} />
                    </div>
                    <FieldMessage hint="Quantidade de questões da prova." error={evaluationFieldErrors.questions} />
                  </label>
                  <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="omrCardVersion">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><ScanLine className="h-3 w-3 text-emerald-500" />Modelo OMR</span>
                    <CompactSelect className={`${inp} ${fieldStateClass(evaluationFieldErrors.omrCardVersion)}`} value={draft.omrCardVersion ?? DEFAULT_OMR_CARD_VERSION} onChange={omrCardVersion => { clearEvaluationError('omrCardVersion'); setDraft({ ...draft, omrCardVersion }) }} options={OMR_CARD_VERSION_OPTIONS} hint="Versão do cartão-resposta." error={evaluationFieldErrors.omrCardVersion} dropdownMinWidth={260} />
                  </label>
                  <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="scheduledAt">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Calendar className="h-3 w-3 text-rose-500" />Data de Aplicação</span>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <DateInput className={`${inp} pl-9 ${fieldStateClass(evaluationFieldErrors.scheduledAt)}`} value={draft.scheduledAt ?? ''} onChange={e => { clearEvaluationError('scheduledAt'); setDraft({ ...draft, scheduledAt: e.target.value }) }} required />
                    </div>
                    <FieldMessage hint="Data prevista para aplicação." error={evaluationFieldErrors.scheduledAt} />
                  </label>
                </div>
              </div>

              {/* Seção 2: Modo + Geração Automática */}
              <div className="border-b-2 border-slate-200 p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 text-violet-600"><Sparkles className="h-3.5 w-3.5" /></div>
                  <div>
                    <Eyebrow className="!text-violet-500">Passo 2</Eyebrow>
                    <p className="font-['Lora',Georgia,serif] text-sm font-semibold text-slate-800 leading-tight mt-0.5">Modo de Montagem &amp; Geração</p>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
                  {/* Modos */}
                  <div>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Estratégia</p>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'manual_bank' as const, label: 'Manual', desc: 'Selecione do banco', icon: BookOpenCheck, colors: { active: 'border-indigo-400 bg-indigo-50 text-indigo-700', icon: 'bg-indigo-500 text-white', dot: 'bg-emerald-500' } },
                        { id: 'automatic_bank' as const, label: 'Automático', desc: 'IA seleciona por filtros', icon: Brain, colors: { active: 'border-violet-400 bg-violet-50 text-violet-700', icon: 'bg-violet-500 text-white', dot: 'bg-emerald-500' } },
                        { id: 'teacher_created' as const, label: 'Professor', desc: 'Questões próprias', icon: UserRound, colors: { active: 'border-amber-400 bg-amber-50 text-amber-700', icon: 'bg-amber-500 text-white', dot: 'bg-emerald-500' } },
                      ].map(m => {
                        const isActive = buildMode === m.id
                        return (
                          <button key={m.id} type="button" onClick={() => setBuildMode(m.id)} className={`group flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${isActive ? m.colors.active : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50'}`}>
                            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all ${isActive ? m.colors.icon : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}><m.icon className="h-4 w-4" /></div>
                            <div className="min-w-0 flex-1">
                              <span className="block text-sm font-bold leading-none">{m.label}</span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">{m.desc}</span>
                            </div>
                            {isActive && <div className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${m.colors.dot} text-white shadow-sm`}><Check className="h-3 w-3" /></div>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Geração automática */}
                  <div className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50/80 to-white p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-violet-500 text-white shadow-md shadow-violet-200"><Sparkles className="h-4 w-4" /></div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-violet-700">Geração Automática</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {buildMode !== 'automatic_bank' ? (
                              <span className="font-bold text-slate-500">Ative o modo automático para consultar</span>
                            ) : autoFiltersPending || isAutoQuestionsLoading ? (
                              <span className="font-bold text-violet-600">Atualizando filtros...</span>
                            ) : (
                              <><span className="font-bold text-violet-600">{autoEligibleTotal}</span> questões elegíveis</>
                            )}
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={handleAutoSelect} disabled={isGeneratingQuestions} className="ev-save-btn inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 disabled:cursor-wait disabled:opacity-70 sm:w-auto">
                        {isGeneratingQuestions ? <><span className="ev-spinner" />Gerando…</> : <><Sparkles className="h-4 w-4" />Gerar {clampEvaluationQuestionCount(draft.questions, 10)} questões</>}
                      </button>
                    </div>

                    {/* Origem */}
                    <div className="mb-3 grid gap-2 sm:grid-cols-3">
                      {[
                        { id: 'system' as const, label: 'Professor', desc: canSeeAllBankQuestions ? 'Banco interno' : 'Minhas questões', icon: UserRound },
                        { id: 'enem' as const, label: 'ENEM', desc: `${inepQuestionsTotal} questões`, icon: Award },
                        { id: 'mixed' as const, label: 'Mesclar', desc: 'ENEM + banco', icon: Layers },
                      ].map(origin => (
                        <button key={origin.id} type="button" onClick={() => setAutoFilters((c) => ({ ...c, sourceMode: origin.id, subject: 'all', skillCode: 'all', descriptorCode: 'all' }))} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left transition-all ${autoFilters.sourceMode === origin.id ? 'border-violet-400 bg-white shadow-sm' : 'border-slate-300 bg-white/70 hover:border-violet-300'}`}>
                          <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-all ${autoFilters.sourceMode === origin.id ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-400'}`}><origin.icon className="h-3.5 w-3.5" /></div>
                          <div>
                            <span className={`block text-[11px] font-bold leading-none ${autoFilters.sourceMode === origin.id ? 'text-violet-700' : 'text-slate-600'}`}>{origin.label}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">{origin.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Filtros */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      {[
                        { label: 'Disciplina', value: autoFilters.subject, key: 'subject', options: autoSubjectOptions, icon: BookOpen },
                        { label: 'Ano', value: autoFilters.gradeLevel, key: 'gradeLevel', options: gradeLevelOptions, icon: GraduationCap },
                        { label: 'Dificuldade', value: autoFilters.difficulty, key: 'difficulty', options: difficultyOptions, icon: Zap },
                        { label: 'Habilidade', value: autoFilters.skillCode, key: 'skillCode', options: skillCodeOptions, icon: Target },
                        { label: 'Descritor', value: autoFilters.descriptorCode, key: 'descriptorCode', options: descriptorCodeOptions, icon: Layers },
                      ].map(f => (
                        <label key={f.key} className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400"><f.icon className="h-2.5 w-2.5" />{f.label}</span>
                          <CompactSelect className={inp} value={f.value} onChange={value => setAutoFilters((c) => { const next = { ...c, [f.key]: value }; if (['subject', 'gradeLevel', 'difficulty'].includes(f.key)) { next.skillCode = 'all'; next.descriptorCode = 'all' } if (f.key === 'skillCode') next.descriptorCode = 'all'; return next })} options={f.options} dropdownMinWidth={f.key === 'subject' ? 260 : 180} dropdownWidth={['subject', 'skillCode', 'descriptorCode'].includes(f.key) ? 'trigger' : 'content'} />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção 3: Questões + Composição */}
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-100 text-cyan-600"><ListChecks className="h-3.5 w-3.5" /></div>
                  <div>
                    <Eyebrow className="!text-cyan-500">Passo 3</Eyebrow>
                    <p className="font-DMSans text-sm font-semibold text-slate-800 leading-tight mt-0.5">Questões &amp; Composição</p>
                  </div>
                </div>

                {autoFilters.sourceMode === 'system' && (
                  <>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-bold text-slate-600">{canSeeAllBankQuestions ? 'Questões de professores' : 'Minhas questões'} — prévia rápida</p>
                      <button type="button" onClick={() => setWorkspace('bank')} className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
                        <Search className="h-3.5 w-3.5" />Explorar banco completo<ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mb-5 space-y-2">
                      {isLoading || isBankQuestionsLoading ? [...Array(3)].map((_, i) => <Bone key={i} className="h-20 rounded-xl" />) : filteredQuestions.slice(0, 4).map((q, i) => (
                        <QuestionRowCompact key={q.id} question={q} selected={selectedQuestionIds.includes(q.id)} onToggle={() => toggleQuestion(q.id)} onOpen={() => setQuestionPreview(q)} index={i} />
                      ))}
                      {!isLoading && !isBankQuestionsLoading && filteredQuestions.length === 0 && <EmptyState icon={<Search className="h-7 w-7" />} title="Nenhuma questão encontrada" sub="Ajuste os filtros ou explore o banco completo" />}
                    </div>
                  </>
                )}

                <CompositionPanel draft={draft} selectedQuestions={selectedQuestions} selectedSkillCodes={selectedSkillCodes} selectedDescriptorCodes={selectedDescriptorCodes} estimatedMinutes={estimatedMinutes} buildMode={buildMode} classLabel={getClassName(draft.classId ?? '')} registeredEvaluationsCount={teacherScopedEvaluations.length} onRemoveQuestion={toggleQuestion} onOpenQuestion={setQuestionPreview} onOpenRegisteredEvaluations={() => setEvaluationsModalOpen(true)} onClear={() => { setSelectedQuestionIds([]); setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined })) }} />
              </div>

              {/* Rodapé / Submit */}
              <div className="scroll-mt-24 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4" data-evaluation-field="questionIds">
                <FieldMessage hint="Selecione questões no banco, crie uma questão ou use a seleção automática antes de salvar." error={evaluationFieldErrors.questionIds} className="mb-3" />
                {formNotice && (
                  <div className={`mb-4 flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-bold ${formNotice.includes('sucesso') || formNotice.includes('selecionadas') || formNotice.includes('cartões') || formNotice.includes('criada') ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-amber-400 bg-amber-50 text-amber-700'}`}>
                    {formNotice.includes('sucesso') || formNotice.includes('selecionadas') || formNotice.includes('cartões') || formNotice.includes('criada') ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                    {formNotice}
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                  <button type="submit" className="ev-save-btn group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-200 sm:w-auto">
                    <FileCheck className="h-5 w-5" />Criar Prova
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ── BANK TAB ── */}
          {workspace === 'bank' && (
            <div className="p-5 sm:p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-cyan-300 bg-gradient-to-r from-cyan-50 to-white px-5 py-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-white shadow-lg shadow-cyan-200"><BookOpen className="h-5 w-5" /></div>
                  <div>
                    <Eyebrow className="!text-cyan-600">Banco de questões</Eyebrow>
                    <p className="font-['Lora',Georgia,serif] text-lg font-bold text-slate-900 leading-tight mt-0.5"><span className="text-cyan-600">{bankQuestionsTotal}</span> de {systemQuestionsTotal} questões</p>
                  </div>
                </div>
                <button type="button" onClick={() => setWorkspace('builder')} className="ev-save-btn inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-200">
                  <CheckCircle2 className="h-4 w-4" />Usar seleção
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-black">{selectedQuestionIds.length}</span>
                </button>
              </div>

              {/* Filtros */}
              <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-200 text-slate-600"><Filter className="h-3.5 w-3.5" /></div>
                  <Eyebrow>Filtros</Eyebrow>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
                  <label className="col-span-2 sm:col-span-3 lg:col-span-2 flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider"><Search className="h-3 w-3" />Busca</span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input className={`${inp} pl-10`} value={bankFilters.search} onChange={e => setBankFilters({ ...bankFilters, search: e.target.value })} placeholder="Título, enunciado, código…" />
                    </div>
                  </label>
                  {[
                    { label: 'Ano', key: 'gradeLevel', options: gradeLevelOptions, icon: GraduationCap },
                    { label: 'Dificuldade', key: 'difficulty', options: difficultyOptions, icon: Zap },
                    { label: 'Status', key: 'status', options: questionStatusOptions, icon: BadgeCheck },
                    { label: 'Fonte', key: 'sourceType', options: sourceTypeOptions, icon: FileQuestion },
                    { label: 'Escola', key: 'schoolId', options: schoolFilterOptions, icon: Building2 },
                    { label: 'Professor', key: 'createdById', options: creatorFilterOptions, icon: UserRound },
                  ].map(f => (
                    <label key={f.key} className="flex flex-col gap-1.5">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider"><f.icon className="h-3 w-3" />{f.label}</span>
                      <CompactSelect className={inp} value={(bankFilters as Record<string, string>)[f.key]} onChange={value => setBankFilters({ ...bankFilters, [f.key]: value })} options={f.options} dropdownMinWidth={180} />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {isLoading || isBankQuestionsLoading ? [...Array(4)].map((_, i) => <Bone key={i} className="h-56 rounded-2xl" />) : paginatedQuestions.map((q, i) => (
                  <QuestionCard key={q.id} question={q} selected={selectedQuestionIds.includes(q.id)} onToggle={() => toggleQuestion(q.id)} onOpen={() => setQuestionPreview(q)} onDelete={onDeleteQuestion ? () => handleDeleteQuestion(q) : undefined} deleting={deletingQuestionId === q.id} index={i} />
                ))}
                {!isLoading && !isBankQuestionsLoading && bankQuestionsTotal === 0 && <div className="col-span-2"><EmptyState icon={<BookOpen className="h-7 w-7" />} title="Nenhuma questão encontrada" sub="Tente outros filtros ou crie uma questão" /></div>}
              </div>
              {!isLoading && bankQuestionsTotal > QUESTIONS_PER_PAGE && <PaginationControls page={safeBankPage} totalItems={bankQuestionsTotal} onPageChange={setBankPage} />}
            </div>
          )}

          {/* ── INEP TAB ── */}
          {workspace === 'inep' && (
            <div className="p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-white px-5 py-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200"><Award className="h-5 w-5" /></div>
                  <div>
                    <Eyebrow className="!text-amber-600">Banco oficial</Eyebrow>
                    <p className="font-['Lora',Georgia,serif] text-lg font-bold text-slate-900 leading-tight mt-0.5">INEP / ENEM — <span className="text-amber-600">{inepQuestionsTotal}</span> questões</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setAutoFilters((c) => ({ ...c, sourceMode: 'enem', subject: 'all', skillCode: 'all', descriptorCode: 'all' })); setWorkspace('builder') }} className="ev-save-btn inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-200">
                  <Sparkles className="h-4 w-4" />Usar no builder
                </button>
              </div>
              {inepQuestionsTotal > 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {isInepQuestionsLoading ? [...Array(4)].map((_, i) => <Bone key={i} className="h-56 rounded-2xl" />) : paginatedInepQuestions.map((q, i) => <QuestionCard key={q.id} question={q} selected={selectedQuestionIds.includes(q.id)} onToggle={() => toggleQuestion(q.id)} onOpen={() => setQuestionPreview(q)} onDelete={onDeleteQuestion ? () => handleDeleteQuestion(q) : undefined} deleting={deletingQuestionId === q.id} index={i} />)}
                  </div>
                  {inepQuestionsTotal > QUESTIONS_PER_PAGE && <PaginationControls page={safeInepPage} totalItems={inepQuestionsTotal} onPageChange={setInepPage} />}
                </>
              ) : <EmptyState icon={<FileDown className="h-7 w-7" />} title="Nenhuma questão INEP encontrada" sub="O banco ainda não possui questões oficiais importadas." />}
            </div>
          )}

          {/* ── CREATE TAB ── */}
          {workspace === 'create' && (
            <form onSubmit={handleTeacherQuestionSubmit} noValidate>
              {/* Step progress */}
              <div className="border-b-2 border-slate-200 bg-gradient-to-r from-violet-50 to-white px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-200"><PenTool className="h-4 w-4" /></div>
                    <div>
                      <Eyebrow className="!text-violet-500">Nova questão</Eyebrow>
                      <p className="font-['Lora',Georgia,serif] text-base font-bold text-slate-900 leading-tight mt-0.5">Criar Questão para o Banco</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map(step => (
                      <button key={step} type="button" onClick={() => setCreateStep(step as 1 | 2 | 3)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${createStep === step ? 'bg-violet-500 text-white shadow-lg shadow-violet-200' : createStep > step ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300' : 'bg-slate-100 text-slate-400 border-2 border-slate-300'}`}>
                        {createStep > step ? <Check className="h-3.5 w-3.5" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-xs font-black">{step}</span>}
                        <span className="hidden sm:inline">{step === 1 ? 'Configuração' : step === 2 ? 'Conteúdo' : 'Alternativas'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {createStep === 1 && (
                <div className="p-5 sm:p-6 space-y-5">
                  <SectionCard label="Passo 1 de 3" title="Configuração da Questão" icon={Settings2} iconBg="bg-violet-500" delay={0}>
                    <div className="space-y-4">
                      <label className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><PenTool className="h-3 w-3 text-violet-500" />Título da questão</span>
                        <input className={`${inp} ${fieldStateClass(questionFieldErrors.title)}`} value={teacherQuestionDraft.title} onChange={e => setTeacherQuestionField('title', e.target.value)} placeholder="Ex: Porcentagem — Desconto em compras" required aria-invalid={Boolean(questionFieldErrors.title) || undefined} />
                        <FieldMessage hint="Título curto para localizar a questão depois." error={questionFieldErrors.title} className="mt-1.5" />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><GraduationCap className="h-3 w-3 text-cyan-500" />Ano escolar</span>
                          <input className={`${inp} ${fieldStateClass(questionFieldErrors.gradeLevel)}`} value={teacherQuestionDraft.gradeLevel} onChange={e => setTeacherQuestionField('gradeLevel', e.target.value)} required aria-invalid={Boolean(questionFieldErrors.gradeLevel) || undefined} />
                          <FieldMessage hint="Ex: 8o ano" error={questionFieldErrors.gradeLevel} className="mt-1.5" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Zap className="h-3 w-3 text-amber-500" />Dificuldade</span>
                          <CompactSelect<Difficulty> className={`${inp} ${fieldStateClass(questionFieldErrors.difficulty)}`} value={teacherQuestionDraft.difficulty} onChange={d => setTeacherQuestionField('difficulty', d)} options={teacherDifficultyOptions} hint="Dificuldade estimada." error={questionFieldErrors.difficulty} dropdownMinWidth={180} />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Eye className="h-3 w-3 text-indigo-500" />Visibilidade</span>
                          <CompactSelect<QuestionVisibility> className={`${inp} ${fieldStateClass(questionFieldErrors.visibility)}`} value={teacherQuestionDraft.visibility} onChange={v => setTeacherQuestionField('visibility', v)} options={teacherVisibilityOptions} hint="Quem pode usar a questão." error={questionFieldErrors.visibility} dropdownMinWidth={180} />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><BadgeCheck className="h-3 w-3 text-emerald-500" />Status</span>
                          <CompactSelect<QuestionStatus> className={`${inp} ${fieldStateClass(questionFieldErrors.status)}`} value={teacherQuestionDraft.status} onChange={s => setTeacherQuestionField('status', s)} options={teacherStatusOptions} hint="Status inicial da questão." error={questionFieldErrors.status} dropdownMinWidth={200} />
                        </label>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Target className="h-3 w-3 text-indigo-500" />Habilidade BNCC</span>
                          <CompactSelect className={`${inp} ${fieldStateClass(questionFieldErrors.skillId)}`} value={teacherSkillId} onChange={skillId => setTeacherQuestionField('skillId', skillId)} options={teacherSkillOptions} placeholder="Selecione a habilidade" hint="Habilidade BNCC relacionada." error={questionFieldErrors.skillId} dropdownWidth="trigger" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Layers className="h-3 w-3 text-amber-500" />Descritor</span>
                          <CompactSelect className={`${inp} ${fieldStateClass(questionFieldErrors.descriptorId)}`} value={teacherDescriptorId} onChange={descriptorId => setTeacherQuestionField('descriptorId', descriptorId)} options={teacherDescriptorOptions} placeholder="Selecione o descritor" hint="Descritor da avaliação." error={questionFieldErrors.descriptorId} dropdownWidth="trigger" />
                        </label>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Timer className="h-3 w-3 text-rose-500" />Tempo estimado (seg.)</span>
                          <input className={`${inp} ${fieldStateClass(questionFieldErrors.estimatedTimeSeconds)}`} type="number" min={30} step={15} value={teacherQuestionDraft.estimatedTimeSeconds} onChange={e => setTeacherQuestionField('estimatedTimeSeconds', Number(e.target.value))} aria-invalid={Boolean(questionFieldErrors.estimatedTimeSeconds) || undefined} />
                          <FieldMessage hint="Tempo estimado para resolver." error={questionFieldErrors.estimatedTimeSeconds} className="mt-1.5" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Info className="h-3 w-3 text-slate-500" />Fonte</span>
                          <input className={`${inp} ${fieldStateClass(questionFieldErrors.sourceName)}`} value={teacherQuestionDraft.sourceName} onChange={e => setTeacherQuestionField('sourceName', e.target.value)} aria-invalid={Boolean(questionFieldErrors.sourceName) || undefined} />
                          <FieldMessage hint="Origem da questão." error={questionFieldErrors.sourceName} className="mt-1.5" />
                        </label>
                      </div>
                    </div>
                  </SectionCard>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => { if (validateQuestionStep(1)) setCreateStep(2) }} className="ev-save-btn inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200">
                      Próximo: Conteúdo<ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div className="p-5 sm:p-6 space-y-5">
                  <SectionCard label="Passo 2 de 3" title="Conteúdo da Questão" icon={FileText} iconBg="bg-indigo-500" delay={0}>
                    <div className="space-y-4">
                      <label className="block">
                        <span className="mb-1.5 flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><FileText className="h-3 w-3 text-indigo-500" />Enunciado <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">Obrigatório</span></span>
                        <textarea className={`${inp2} min-h-[140px] ${fieldStateClass(questionFieldErrors.statement)}`} value={teacherQuestionDraft.statement} onChange={e => setTeacherQuestionField('statement', e.target.value)} placeholder="Escreva a pergunta da questão aqui…" required aria-invalid={Boolean(questionFieldErrors.statement) || undefined} />
                        <FieldMessage hint="Enunciado completo que o aluno responderá." error={questionFieldErrors.statement} className="mt-1.5" />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><BookOpen className="h-3 w-3 text-cyan-500" />Contexto <span className="text-[10px] font-normal text-slate-400 normal-case">(opcional)</span></span>
                          <textarea className={`${inp2} ${fieldStateClass(questionFieldErrors.context)}`} value={teacherQuestionDraft.context} onChange={e => setTeacherQuestionField('context', e.target.value)} placeholder="Texto de apoio, situação problema…" aria-invalid={Boolean(questionFieldErrors.context) || undefined} />
                          <FieldMessage hint="Texto de apoio ou situação-problema." error={questionFieldErrors.context} className="mt-1.5" />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Lightbulb className="h-3 w-3 text-amber-500" />Explicação / Gabarito</span>
                          <textarea className={`${inp2} ${fieldStateClass(questionFieldErrors.explanation)}`} value={teacherQuestionDraft.explanation} onChange={e => setTeacherQuestionField('explanation', e.target.value)} placeholder="Explique a resposta correta…" aria-invalid={Boolean(questionFieldErrors.explanation) || undefined} />
                          <FieldMessage hint="Raciocínio da alternativa correta." error={questionFieldErrors.explanation} className="mt-1.5" />
                        </label>
                      </div>
                      <label className="block">
                        <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider"><Tag className="h-3 w-3 text-violet-500" />Palavras-chave <span className="text-[10px] font-normal text-slate-400 normal-case">(separadas por vírgula)</span></span>
                        <input className={`${inp} ${fieldStateClass(questionFieldErrors.keywords)}`} value={teacherQuestionDraft.keywords} onChange={e => setTeacherQuestionField('keywords', e.target.value)} placeholder="porcentagem, desconto, razão…" aria-invalid={Boolean(questionFieldErrors.keywords) || undefined} />
                        <FieldMessage hint="Palavras-chave separadas por vírgula." error={questionFieldErrors.keywords} className="mt-1.5" />
                      </label>
                    </div>
                  </SectionCard>
                  <div className="flex justify-between">
                    <button type="button" onClick={() => setCreateStep(1)} className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-400">
                      <MoveLeft className="h-4 w-4" />Voltar
                    </button>
                    <button type="button" onClick={() => { if (validateQuestionStep(2)) setCreateStep(3) }} className="ev-save-btn inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200">
                      Próximo: Alternativas<ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {createStep === 3 && (
                <div className="p-5 sm:p-6 space-y-5">
                  <SectionCard label="Passo 3 de 3" title="Alternativas da Questão" icon={ListChecks} iconBg="bg-emerald-500" delay={0}>
                    <div className="space-y-2.5">
                      {optionLabels.map((label) => {
                        const isCorrect = teacherQuestionDraft.correctOption === label
                        const optionField = `option${label}` as TeacherQuestionFormField
                        return (
                          <div key={label} className={`flex items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${isCorrect ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
                            <button type="button" onClick={() => { setQuestionFieldErrors((c) => ({ ...c, correctOption: undefined })); setTeacherQuestionDraft({ ...teacherQuestionDraft, correctOption: label }) }} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-black transition-all ${isCorrect ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                              {label}
                            </button>
                            <input className={`min-h-11 flex-1 rounded-xl border-2 border-slate-300 bg-transparent px-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all ${fieldStateClass(questionFieldErrors[optionField])}`} value={teacherQuestionDraft.options[label]} onChange={e => updateOption(label, e.target.value)} placeholder={`Digite a alternativa ${label}…`} aria-invalid={Boolean(questionFieldErrors[optionField]) || undefined} required />
                            {isCorrect && <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-black text-white shadow-md"><CheckCircle2 className="h-3.5 w-3.5" />Correta</span>}
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-500"><span className="font-bold text-slate-700">Dica:</span> Clique na letra para marcar a alternativa correta.</p>
                      <FieldMessage hint="Selecione a letra correta antes de salvar." error={questionFieldErrors.correctOption} className="mt-2 justify-center" />
                    </div>
                  </SectionCard>

                  {questionFormError && (
                    <div className="flex items-center gap-3 rounded-xl border-2 border-rose-400 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                      <AlertCircle className="h-5 w-5 shrink-0" />{questionFormError}
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button type="button" onClick={() => setCreateStep(2)} className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-400">
                      <MoveLeft className="h-4 w-4" />Voltar
                    </button>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setWorkspace('builder')} className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-400 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-500">
                        Cancelar
                      </button>
                      <button type="submit" className="ev-save-btn inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-200">
                        <Save className="h-4 w-4" />Adicionar ao banco
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* ══ MODALS ══ */}
        {questionPreview && <QuestionDetailModal question={questionPreview} onClose={() => setQuestionPreview(null)} />}

        {evaluationsModalOpen && (
          <div role="presentation" onMouseDown={() => setEvaluationsModalOpen(false)} className="ev-overlay fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-900/50 px-4 py-8 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="evaluations-modal-title" onMouseDown={(e) => e.stopPropagation() } className="ev-modal-in relative my-auto max-h-[calc(100svh-4rem)] w-full max-w-6xl overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-2xl">
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
              <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-800 text-white shadow-lg"><ClipboardList className="h-4 w-4" /></div>
                  <div>
                    <Eyebrow>Histórico</Eyebrow>
                    <h2 id="evaluations-modal-title" className="font-DMSans text-base font-bold text-slate-900 leading-tight mt-0.5">Provas cadastradas</h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'all', label: 'Todos', icon: LayoutGrid },
                    { id: 'planejado', label: 'Planejado', icon: Calendar },
                    { id: 'em_aplicacao', label: 'Em aplicação', icon: Clock },
                    { id: 'corrigindo', label: 'Corrigindo', icon: ScanLine },
                    { id: 'concluido', label: 'Concluído', icon: CheckCircle2 },
                  ].map(s => (
                    <button key={s.id} type="button" onClick={() => setStatusFilter(s.id)} className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-bold transition-all ${statusFilter === s.id ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50'}`}>
                      <s.icon className="h-3.5 w-3.5" />{s.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setEvaluationsModalOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border-2 border-slate-300 bg-white text-slate-500 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all ml-2"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="max-h-[calc(100svh-14rem)] overflow-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      {['Título', 'Turma', 'Disciplina', 'Modo', 'Questões', 'Correção', 'Média', 'Status', 'Ações'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? [...Array(4)].map((_, i) => (
                      <tr key={i} className="border-b border-slate-200">
                        {[...Array(9)].map((_, j) => <td key={j} className="px-4 py-4"><Bone className={`h-5 ${j === 0 ? 'w-40' : 'w-20'}`} /></td>)}
                      </tr>
                    )) : filteredEvaluations.length === 0 ? (
                      <tr><td colSpan={9} className="py-20 text-center"><EmptyState icon={<ClipboardList className="h-7 w-7" />} title="Nenhuma prova encontrada" sub="Crie sua primeira prova no montador" /></td></tr>
                    ) : filteredEvaluations.map((ev) => {
                      const corrPct = ev.participants > 0 ? (ev.corrected / ev.participants) * 100 : 0
                      const cardsCount = ev.answerCardsCount ?? answerCardsByEvaluationId.get(ev.id) ?? 0
                      return (
                        <tr key={ev.id} className="ev-table-row border-b border-slate-200">
                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                            <p className="flex items-center gap-1 text-[10px] text-slate-400"><Calendar className="h-3 w-3" />{formatPrintDate(ev.scheduledAt)}</p>
                          </td>
                          <td className="px-4 py-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-600">{getClassName(ev.classId)}</span></div></td>
                          <td className="px-4 py-4 text-sm text-slate-600">{getAcademicSubjectLabel(ev.subject, activeSkills)}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-[10px] font-black ${buildModeColor(ev.buildMode)}`}>
                              {ev.buildMode === 'automatic_bank' ? <Brain className="h-3 w-3" /> : ev.buildMode === 'teacher_created' ? <UserRound className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                              {formatBuildMode(ev.buildMode)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-bold text-slate-700">{ev.questions}</td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-600">{ev.corrected}/{ev.participants}</p>
                              <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${corrPct}%` }} /></div>
                            </div>
                          </td>
                          <td className="px-4 py-4"><span className={`text-base font-black ${ev.averageScore >= 7 ? 'text-emerald-600' : ev.averageScore >= 5 ? 'text-amber-600' : 'text-rose-600'}`}>{ev.averageScore.toFixed(1)}</span></td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-[10px] font-black ${statusColor(ev.status)}`}>
                              {ev.status === 'concluido' ? <CheckCircle2 className="h-3 w-3" /> : ev.status === 'corrigindo' ? <ScanLine className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {ev.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button type="button" disabled={downloadingEvaluationId === ev.id} onClick={() => handleExportEvaluation(ev)} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60">
                                <FileDown className="h-3.5 w-3.5" />{downloadingEvaluationId === ev.id ? 'Baixando…' : 'Exportar'}
                              </button>
                              {onDownloadAnswerCards && (
                                <button type="button" disabled={downloadingAnswerCardsId === ev.id} onClick={() => handleExportAnswerCards(ev)} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60">
                                  <ScanLine className="h-3.5 w-3.5" />{downloadingAnswerCardsId === ev.id ? 'Baixando…' : `Cartões${cardsCount ? ` (${cardsCount})` : ''}`}
                                </button>
                              )}
                              <button type="button" disabled={deletingEvaluationId === ev.id} onClick={() => handleDeleteEvaluation(ev)} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-600 transition hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60">
                                <Trash2 className="h-3.5 w-3.5" />{deletingEvaluationId === ev.id ? 'Excluindo…' : 'Excluir'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <ConfirmDialog
            title="Excluir prova"
            description={`Excluir a prova "${deleteTarget.title}"? Esta ação não pode ser desfeita.`}
            confirmLabel="Excluir prova"
            loading={deletingEvaluationId === deleteTarget.id}
            onCancel={() => { if (!deletingEvaluationId) setDeleteTarget(null) }}
            onConfirm={confirmDeleteEvaluation}
          />
        )}

        {deleteQuestionTarget && (
          <ConfirmDialog
            title="Excluir questão"
            description={`Excluir a questão "${deleteQuestionTarget.title}"? Ela será removida do banco e das provas que usam essa questão.`}
            confirmLabel="Excluir questão"
            loading={deletingQuestionId === deleteQuestionTarget.id}
            onCancel={() => { if (!deletingQuestionId) setDeleteQuestionTarget(null) }}
            onConfirm={confirmDeleteQuestion}
          />
        )}
      </div>
    </>
  )
}
