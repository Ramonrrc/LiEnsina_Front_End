/* ─────────────────────────────────────────────────────────────────────────────
 *  EvaluationsView — versão reorganizada
 *
 *  Mudanças (sem alterar nenhuma regra de negócio):
 *   1. Sistema de tokens de cor (TONE) com hierarquia semântica clara.
 *      - brand   (indigo)  → ação primária / montador
 *      - ai      (violet)  → geração automática / IA
 *      - success (emerald) → correto / aprovado / concluído
 *      - warning (amber)   → revisão / corrigindo / INEP-ENEM
 *      - danger  (rose)    → excluir / erro / rejeitado
 *      - info    (cyan)    → turma / dado neutro destacável
 *      - neutral (slate)   → chrome, bordas, texto
 *   2. Borda padrão 1px; border-2 reservado a estados selecionados/ativos.
 *   3. Gradiente decorativo apenas no topo da página (antes em cada card).
 *   4. Abas: Provas · Montar · Banco (toggle Professor/INEP) · Criar Questão.
 *      (a lista de provas era um modal escondido; agora é aba de 1º nível)
 *   5. Builder com stepper sticky no topo e action bar sticky no rodapé.
 *   6. Cards de questão, paginação e composition panel reescritos para
 *      hierarquia visual mais limpa.
 *
 *  Toda a lógica (estados, derivados, efeitos, handlers, schemas Zod) é
 *  preservada exatamente como no arquivo original.
 * ──────────────────────────────────────────────────────────────────────────── */

import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import {
  BookOpenCheck, CheckCircle2, ClipboardCheck, ClipboardList, FileCheck, FileDown,
  Plus, Save, ScanLine, Search, UserRound, X, Target, Filter, Sparkles,
  GraduationCap, BookOpen, Clock, Layers, Check, ArrowRight, MoveLeft, Hash,
  Calendar, Users, AlertCircle, Trash2, Zap, Brain, FileText, PenTool, Eye,
  Tag, Timer, Lightbulb, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ListChecks, Award, BadgeCheck, CircleDot, FileQuestion, Settings2, LayoutGrid,
  Info, Building2, MapPin, TrendingUp,
} from 'lucide-react'

import { resolveApiAssetUrl } from '../api'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import DateInput from '../components/ui/date-input'
import { PageTitleBar } from '../components/ui/page-title-bar'
import {
  DEFAULT_PAGE_SIZE,
  PaginationControls as ResourcePaginationControls,
  getLocalPagination,
  paginateLocal,
} from '../components/ui/pagination-controls'
import { FieldMessage, fieldStateClass, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'
import { getAcademicSubjectLabel } from '../components/role-portal/portal-components'
import { formatClassGrade, normalizeClassGradeValue } from '../class-grade-options'
import {
  DEFAULT_OMR_CARD_VERSION,
  getAnswerCardEvaluationId,
  OMR_CARD_VERSION_OPTIONS,
} from '../lib/evaluation-omr'
import {
  MAX_EVALUATION_QUESTIONS,
  clampEvaluationQuestionCount,
  evaluationQuestionLimitMessage,
} from '../lib/evaluation-limits'
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
  AssessmentDescriptor, ClassRoom, CreateQuestionRequest, CurriculumSkill, Difficulty,
  Evaluation, EvaluationAnswerCard, EvaluationBuildMode, EvaluationsPagePayload,
  EvaluationsPageQuery, EvaluationStatus, GenerateQuestionSelectionRequest,
  GenerateQuestionSelectionResponse, Question, QuestionBankPagePayload,
  QuestionBankPageQuery, QuestionImportPlan, QuestionSourceType, QuestionStatus,
  QuestionVisibility, Role, UserAccount, PaginationMeta,
} from '../types'

/* ────────────────────────────────────────────────────────────────────────────
 *  TYPES
 * ──────────────────────────────────────────────────────────────────────── */

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
  evaluationsPagination?: PaginationMeta
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
  onLoadEvaluationsPage?: (params: EvaluationsPageQuery) => Promise<EvaluationsPagePayload>
  onDeleteQuestion?: (id: string) => Promise<void>
}

type WorkspaceTab = 'list' | 'builder' | 'bank' | 'create'
type BankSource = 'professor' | 'inep'
type OptionLabel = 'A' | 'B' | 'C' | 'D' | 'E'
type QuestionOriginMode = 'system' | 'enem' | 'mixed'
type BankFilters = {
  search: string; gradeLevel: string; difficulty: string; status: string
  skillCode: string; descriptorCode: string; sourceType: string
  schoolId: string; createdById: string
}
type AutoFilters = {
  gradeLevel: string; difficulty: string; skillCode: string; descriptorCode: string
  subject: string; sourceMode: QuestionOriginMode
}
type TeacherQuestionDraft = {
  title: string; context: string; statement: string; explanation: string
  gradeLevel: string; difficulty: Difficulty; visibility: QuestionVisibility
  status: QuestionStatus; sourceName: string; keywords: string
  estimatedTimeSeconds: number; skillId: string; descriptorId: string
  options: Record<OptionLabel, string>; correctOption: OptionLabel
}

/* ────────────────────────────────────────────────────────────────────────────
 *  DESIGN TOKENS — hierarquia semântica de cores
 *  Cada token agrega as classes Tailwind para usos recorrentes (chip, botão,
 *  ícone, painel). NÃO use cores Tailwind cruas dentro do JSX abaixo.
 * ──────────────────────────────────────────────────────────────────────── */

const TONE = {
  brand: {
    text: 'text-indigo-700',
    softText: 'text-indigo-500',
    bg: 'bg-indigo-500',
    softBg: 'bg-indigo-50',
    border: 'border-indigo-300',
    activeBorder: 'border-indigo-500',
    chip: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    iconBox: 'bg-indigo-100 text-indigo-600',
    iconBoxSolid: 'bg-indigo-500 text-white',
    button: 'bg-indigo-600 text-white hover:bg-indigo-700',
    ring: 'focus-visible:ring-indigo-200',
  },
  ai: {
    text: 'text-violet-700', softText: 'text-violet-500',
    bg: 'bg-violet-500', softBg: 'bg-violet-50', border: 'border-violet-300',
    activeBorder: 'border-violet-500',
    chip: 'border-violet-200 bg-violet-50 text-violet-700',
    iconBox: 'bg-violet-100 text-violet-600', iconBoxSolid: 'bg-violet-500 text-white',
    button: 'bg-violet-600 text-white hover:bg-violet-700',
    ring: 'focus-visible:ring-violet-200',
  },
  success: {
    text: 'text-emerald-700', softText: 'text-emerald-600',
    bg: 'bg-emerald-500', softBg: 'bg-emerald-50', border: 'border-emerald-300',
    activeBorder: 'border-emerald-500',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    iconBox: 'bg-emerald-100 text-emerald-600', iconBoxSolid: 'bg-emerald-500 text-white',
    button: 'bg-emerald-600 text-white hover:bg-emerald-700',
    ring: 'focus-visible:ring-emerald-200',
  },
  warning: {
    text: 'text-amber-700', softText: 'text-amber-600',
    bg: 'bg-amber-500', softBg: 'bg-amber-50', border: 'border-amber-300',
    activeBorder: 'border-amber-500',
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    iconBox: 'bg-amber-100 text-amber-600', iconBoxSolid: 'bg-amber-500 text-white',
    button: 'bg-amber-600 text-white hover:bg-amber-700',
    ring: 'focus-visible:ring-amber-200',
  },
  danger: {
    text: 'text-rose-700', softText: 'text-rose-600',
    bg: 'bg-rose-500', softBg: 'bg-rose-50', border: 'border-rose-300',
    activeBorder: 'border-rose-500',
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
    iconBox: 'bg-rose-100 text-rose-600', iconBoxSolid: 'bg-rose-500 text-white',
    button: 'bg-rose-600 text-white hover:bg-rose-700',
    ring: 'focus-visible:ring-rose-200',
  },
  info: {
    text: 'text-cyan-700', softText: 'text-cyan-600',
    bg: 'bg-cyan-500', softBg: 'bg-cyan-50', border: 'border-cyan-300',
    activeBorder: 'border-cyan-500',
    chip: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    iconBox: 'bg-cyan-100 text-cyan-600', iconBoxSolid: 'bg-cyan-500 text-white',
    button: 'bg-cyan-600 text-white hover:bg-cyan-700',
    ring: 'focus-visible:ring-cyan-200',
  },
  neutral: {
    text: 'text-slate-700', softText: 'text-slate-500',
    bg: 'bg-slate-500', softBg: 'bg-slate-50', border: 'border-slate-200',
    activeBorder: 'border-slate-400',
    chip: 'border-slate-200 bg-slate-50 text-slate-600',
    iconBox: 'bg-slate-100 text-slate-600', iconBoxSolid: 'bg-slate-700 text-white',
    button: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
    ring: 'focus-visible:ring-slate-200',
  },
} as const

type ToneKey = keyof typeof TONE

/* ────────────────────────────────────────────────────────────────────────────
 *  CONSTANTS & SCHEMAS  (idênticos ao original)
 * ──────────────────────────────────────────────────────────────────────── */

const optionLabels: OptionLabel[] = ['A', 'B', 'C', 'D', 'E']
const QUESTIONS_PER_PAGE = 10
const REGISTERED_EVALUATIONS_PAGE_SIZE = DEFAULT_PAGE_SIZE
const AUTO_ELIGIBLE_PREVIEW_LIMIT = 1
const emptyQuestionPageFacets: QuestionBankPagePayload['facets'] = {
  gradeLevels: [], sourceTypes: [], schoolIds: [], createdByIds: [],
  subjects: [], skills: [], descriptors: [],
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
const SCHOOL_EVALUATION_SUBJECTS = Array.from(new Set([
  ...FUNDAMENTAL_BASE_EVALUATION_SUBJECTS,
  ...FUNDAMENTAL_FINAL_YEARS_EVALUATION_SUBJECTS,
  ...HIGH_SCHOOL_EVALUATION_SUBJECTS,
]))
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
const teacherQuestionFormSchema = teacherQuestionStep1Schema
  .merge(teacherQuestionStep2Schema)
  .merge(teacherQuestionStep3Schema)

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

/* ────────────────────────────────────────────────────────────────────────────
 *  UTILS  (idênticos ao original)
 * ──────────────────────────────────────────────────────────────────────── */

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
    subjects?: unknown; disciplines?: unknown; disciplinas?: unknown; materias?: unknown
    academicSubjects?: unknown; subjectNames?: unknown; components?: unknown
    componentesCurriculares?: unknown
  }
  const sourceValues = [
    teacher.specialty, teacherRecord.subjects, teacherRecord.disciplines,
    teacherRecord.disciplinas, teacherRecord.materias, teacherRecord.academicSubjects,
    teacherRecord.subjectNames, teacherRecord.components, teacherRecord.componentesCurriculares,
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
  return getTeacherEvaluationSubjects(teacher, curriculumSkills)
    .some((teacherSubject) => academicSubjectMatches(teacherSubject, normalizedSubject))
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
  return values
    .map(canonicalAutoSubjectLabel)
    .filter((subject) => { const key = normalizeAcademicText(subject); if (!key || seen.has(key)) return false; seen.add(key); return true })
    .sort((a, b) => a.localeCompare(b))
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
  return [skill.component, skill.area, skill.description, skill.thematicUnit, skill.knowledgeObject, skill.metadata?.subject, skill.metadata?.component, skill.metadata?.area]
    .some((value) => academicSubjectMatches(String(value ?? ''), subject))
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
  return normalizeSearch([
    q.title, q.context, q.statement, q.explanation, q.subject, q.gradeLevel, q.sourceName,
    q.skills.map(s => `${s.code} ${s.description}`).join(' '),
    q.descriptors.map(d => `${d.code} ${d.description}`).join(' '),
    q.metadata.keywords?.join(' ') ?? '',
  ].join(' '))
}

/* ────────────────────────────────────────────────────────────────────────────
 *  TONE HELPERS — agora consomem o TONE em vez de classes Tailwind cruas.
 * ──────────────────────────────────────────────────────────────────────── */

function difficultyTone(d: Difficulty): ToneKey {
  return d === 'EASY' ? 'success' : d === 'MEDIUM' ? 'warning' : 'danger'
}
function questionStatusTone(s: string): ToneKey {
  if (s === 'concluido' || s === 'APPROVED') return 'success'
  if (s === 'corrigindo' || s === 'em_aplicacao' || s === 'PENDING_REVIEW') return 'warning'
  return 'neutral'
}
function buildModeTone(m?: EvaluationBuildMode): ToneKey {
  if (m === 'automatic_bank') return 'ai'
  if (m === 'teacher_created') return 'warning'
  if (m === 'mixed') return 'info'
  return 'neutral'
}

/* ────────────────────────────────────────────────────────────────────────────
 *  PRESENTATIONAL PRIMITIVES
 * ──────────────────────────────────────────────────────────────────────── */

function Bone({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-200 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  )
}

function Eyebrow({ children, tone = 'neutral', className = '' }: {
  children: React.ReactNode; tone?: ToneKey; className?: string
}) {
  return (
    <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${TONE[tone].softText} ${className}`}>
      {children}
    </p>
  )
}

/** Chip semântico — única forma de exibir tags coloridas neste arquivo. */
function Chip({ tone = 'neutral', icon: Icon, children, className = '' }: {
  tone?: ToneKey; icon?: React.ElementType; children: React.ReactNode; className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE[tone].chip} ${className}`}>
      {Icon ? <Icon className="h-2.5 w-2.5" /> : null}
      {children}
    </span>
  )
}

/** Container de seção padronizado. */
function SectionCard({ label, title, icon: Icon, tone = 'brand', children, headerRight, dense = false }: {
  label?: string; title: string; icon: React.ElementType; tone?: ToneKey
  children: React.ReactNode; headerRight?: React.ReactNode; dense?: boolean
}) {
  return (
    <section className="ev-section overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TONE[tone].iconBoxSolid}`}>
            <Icon size={16} />
          </div>
          <div>
            {label ? <Eyebrow tone={tone}>{label}</Eyebrow> : null}
            <p className="text-sm font-semibold text-slate-900 leading-snug">{title}</p>
          </div>
        </div>
        {headerRight}
      </header>
      <div className={dense ? 'p-4' : 'p-5'}>{children}</div>
    </section>
  )
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  )
}

/* ── Markdown / Mídia ─────────────────────────────────────────────────── */

const markdownImagePattern = /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/|\/)[^\s)]+)\)/gi
type PrintableImage = { url: string; alt: string }
type OptionPrintableImage = PrintableImage & { optionLabel?: string; optionId?: string; optionOrder?: number }

function extractMarkdownImages(value?: string | null) {
  const images: PrintableImage[] = []
  const text = String(value ?? '').replace(markdownImagePattern, (_match, alt, url) => {
    images.push({ url: String(url), alt: String(alt || 'Imagem da questao') }); return '\n'
  })
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), images }
}
function uniquePrintableImages(images: PrintableImage[]) {
  return uniqueSafePrintableImages(images, { resolveRelativeUrl: (url) => resolveApiAssetUrl(url) })
}
function getAttachmentImages(q: Question, positions: string[]) {
  return (q.attachments ?? [])
    .filter(a => a.fileType === 'IMAGE' && positions.includes(a.position))
    .map(a => ({ url: a.fileUrl, alt: a.altText || 'Imagem da questao' }))
}
function getOptionAttachmentImages(q: Question): OptionPrintableImage[] {
  return (q.attachments ?? [])
    .filter(a => a.fileType === 'IMAGE' && a.position === 'OPTION')
    .map((attachment) => {
      const metadata = attachment.metadata ?? {}
      const optionLabel = String(metadata.optionLabel ?? metadata.option ?? metadata.alternative ?? metadata.alternativa ?? '').trim().toUpperCase()
      const optionId = String(metadata.optionId ?? metadata.option_id ?? '').trim()
      const optionOrder = Number(metadata.optionOrder ?? metadata.order ?? attachment.order)
      const altLabel = attachment.altText?.match(/\b([A-E])\b/i)?.[1]?.toUpperCase()
      return {
        url: attachment.fileUrl,
        alt: attachment.altText || `Imagem da alternativa ${optionLabel || altLabel || ''}`.trim(),
        optionLabel: optionLabel || altLabel,
        optionId,
        optionOrder: Number.isFinite(optionOrder) ? optionOrder : undefined,
      }
    })
}
function getImagesForOption(option: Question['options'][number], index: number, images: OptionPrintableImage[]) {
  const explicit = images.filter((image) =>
    (image.optionId && image.optionId === option.id) ||
    (image.optionLabel && image.optionLabel === option.label.toUpperCase()) ||
    (image.optionOrder && image.optionOrder === option.order))
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
        <figure key={image.url} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
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
        <figure key={image.url} className="grid h-20 w-24 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1">
          <img src={image.url} alt={image.alt} referrerPolicy="no-referrer" loading="eager" className="max-h-full max-w-full object-contain" />
        </figure>
      ))}
    </div>
  )
}

function QuestionTextMediaBlock({ value, images = [], textClassName = 'whitespace-pre-wrap text-sm leading-6 text-slate-700' }: {
  value?: string | null; images?: PrintableImage[]; textClassName?: string
}) {
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

/* ── Resumo de habilidades / descritores ─────────────────────────────── */

function SkillSummaryList({ question, compact = false }: { question: Question; compact?: boolean }) {
  const skills = question.skills.slice(0, compact ? 1 : 2)
  const descriptors = question.descriptors.slice(0, compact ? 1 : 2)
  return (
    <div className="grid gap-1.5">
      {skills.map(skill => (
        <div key={skill.id} className={`rounded-md border px-2.5 py-1 ${TONE.brand.chip}`}>
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            <Target className="h-3 w-3" />{skill.code}
          </div>
          {!compact && <div className="mt-0.5 line-clamp-1 text-[11px] opacity-80">{skill.description || skill.knowledgeObject}</div>}
        </div>
      ))}
      {descriptors.map(descriptor => (
        <div key={descriptor.id} className={`rounded-md border px-2.5 py-1 ${TONE.warning.chip}`}>
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
            <Layers className="h-3 w-3" />{descriptor.code}
          </div>
          {!compact && <div className="mt-0.5 line-clamp-1 text-[11px] opacity-80">{descriptor.description}</div>}
        </div>
      ))}
    </div>
  )
}

/* ── Linha compacta de questão (prévia rápida) ───────────────────────── */

function QuestionRowCompact({ question, selected, onToggle, onOpen, index }: {
  question: Question; selected: boolean; onToggle: () => void; onOpen: () => void; index: number
}) {
  return (
    <div
      style={{ animationDelay: `${index * 40}ms` }}
      className={`ev-q-row group flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3 transition hover:border-indigo-300 ${
        selected ? `border-2 ${TONE.brand.activeBorder} ${TONE.brand.softBg}` : 'border border-slate-200'
      }`}
      onClick={onToggle}
    >
      <div className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${
        selected ? `${TONE.brand.activeBorder} ${TONE.brand.bg}` : 'border-slate-300 group-hover:border-indigo-300'
      }`}>
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap gap-1">
          <Chip tone={difficultyTone(question.difficulty)} icon={Zap}>{formatDifficulty(question.difficulty)}</Chip>
          <Chip tone={questionStatusTone(question.status)} icon={CircleDot}>{formatQStatus(question.status)}</Chip>
        </div>
        <p className="text-sm font-semibold text-slate-900 leading-snug group-hover:text-indigo-700">{question.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{getQuestionPreviewText(question.statement)}</p>
        <div className="mt-2"><SkillSummaryList question={question} compact /></div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen() }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 opacity-0 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 group-hover:opacity-100"
        aria-label="Ver questão"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ── Card de questão (banco) ─────────────────────────────────────────── */

function QuestionCard({ question, selected, onToggle, onOpen, onDelete, deleting = false }: {
  question: Question; selected: boolean; onToggle: () => void; onOpen: () => void
  onDelete?: () => void; deleting?: boolean; index: number
}) {
  const correctOpt = question.options.find(o => o.isCorrect)
  const canDelete = question.sourceType === 'TEACHER_CREATED' && question.isEditable && Boolean(onDelete)
  return (
    <article className={`ev-card rounded-2xl bg-white p-4 transition-shadow hover:shadow-sm ${
      selected ? `border-2 ${TONE.brand.activeBorder} ${TONE.brand.softBg}` : 'border border-slate-200'
    }`}>
      <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-1">
          <Chip tone={difficultyTone(question.difficulty)} icon={Zap}>{formatDifficulty(question.difficulty)}</Chip>
          <Chip tone={questionStatusTone(question.status)} icon={BadgeCheck}>{formatQStatus(question.status)}</Chip>
          <Chip tone="neutral" icon={FileQuestion}>{formatSourceType(question.sourceType)}</Chip>
        </div>
        <div className="flex w-full flex-wrap gap-1.5 sm:w-auto sm:shrink-0">
          <button type="button" onClick={onOpen}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 sm:flex-none">
            <Eye className="h-3.5 w-3.5" />Ver
          </button>
          <button type="button" onClick={onToggle}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition sm:flex-none ${
              selected
                ? `${TONE.danger.border} ${TONE.danger.softBg} ${TONE.danger.softText} hover:bg-rose-100`
                : `${TONE.brand.border} ${TONE.brand.softBg} ${TONE.brand.text} hover:bg-indigo-100`
            }`}>
            {selected ? <><X className="h-3.5 w-3.5" />Remover</> : <><Plus className="h-3.5 w-3.5" />Selecionar</>}
          </button>
          {canDelete && (
            <button type="button" onClick={onDelete} disabled={deleting}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none ${TONE.danger.border} ${TONE.danger.softBg} ${TONE.danger.softText} hover:bg-rose-100`}>
              <Trash2 className="h-3.5 w-3.5" />{deleting ? 'Excluindo' : 'Excluir'}
            </button>
          )}
        </div>
      </header>

      <h3 className="mb-1 text-sm font-bold text-slate-950 leading-snug">{question.title}</h3>
      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{getQuestionPreviewText(question.statement)}</p>

      <div className="mb-3"><SkillSummaryList question={question} /></div>

      <div className="space-y-1.5">
        {question.options.slice(0, 5).map((o) => (
          <div key={o.id} className={`flex items-start gap-2 rounded-md px-3 py-1.5 text-xs ${
            o.isCorrect ? `border ${TONE.success.border} ${TONE.success.softBg} ${TONE.success.text}` : 'border border-slate-200 bg-slate-50 text-slate-600'
          }`}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-black ${
              o.isCorrect ? `${TONE.success.bg} text-white` : 'bg-slate-200 text-slate-600'
            }`}>{o.label}</span>
            <span className="line-clamp-1 flex-1">{getQuestionPreviewText(o.text)}</span>
            {o.isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />}
          </div>
        ))}
      </div>

      <footer className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5 text-[10px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="h-3 w-3" />{question.gradeLevel} · {getAcademicSubjectLabel(question.subject)}
        </span>
        <Chip tone="success" icon={Check}>Resp.: {correctOpt?.label ?? '—'}</Chip>
      </footer>
    </article>
  )
}

/* ── Modal de detalhes da questão ────────────────────────────────────── */

function QuestionDetailModal({ question, onClose }: { question: Question; onClose: () => void }) {
  const options = [...question.options].sort((a, b) => a.order - b.order)
  const correctOpt = options.find((o) => o.isCorrect)
  const contextImages = getAttachmentImages(question, ['CONTEXT'])
  const statementImages = getAttachmentImages(question, ['STATEMENT'])
  const optionImages = getOptionAttachmentImages(question)

  return (
    <div role="presentation" onMouseDown={onClose}
      className="ev-overlay fixed inset-0 z-[1100] grid place-items-center overflow-y-auto bg-slate-900/50 px-4 py-8 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="question-detail-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="ev-modal-in my-auto max-h-[calc(100svh-4rem)] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <Eyebrow tone="brand">Visualizar questão</Eyebrow>
            <h2 id="question-detail-title" className="mt-1 text-lg font-bold leading-tight text-slate-950">{question.title}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone={difficultyTone(question.difficulty)} icon={Zap}>{formatDifficulty(question.difficulty)}</Chip>
              <Chip tone={questionStatusTone(question.status)} icon={BadgeCheck}>{formatQStatus(question.status)}</Chip>
              <Chip tone="neutral" icon={FileQuestion}>{formatSourceType(question.sourceType)}</Chip>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:${TONE.danger.border} hover:${TONE.danger.softBg} hover:${TONE.danger.softText}`}
            aria-label="Fechar modal">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[calc(100svh-13rem)] space-y-4 overflow-y-auto p-6">
          {question.context && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Eyebrow>Texto de apoio</Eyebrow>
              <div className="mt-2"><QuestionTextMediaBlock value={question.context} images={contextImages} /></div>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <Eyebrow tone="brand">Enunciado</Eyebrow>
            <div className="mt-2">
              <QuestionTextMediaBlock value={question.statement} images={statementImages}
                textClassName="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-900" />
            </div>
          </div>
          <div className="grid gap-2">
            {options.map((option, index) => {
              const optionTextMedia = extractMarkdownImages(option.text)
              const optionInlineImages = [...optionTextMedia.images, ...getImagesForOption(option, index, optionImages)]
              return (
                <div key={option.id} className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${
                  option.isCorrect ? `border ${TONE.success.border} ${TONE.success.softBg} text-emerald-900` : 'border border-slate-200 bg-white text-slate-700'
                }`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black ${
                    option.isCorrect ? `${TONE.success.bg} text-white` : 'bg-slate-100 text-slate-600'
                  }`}>{option.label}</span>
                  <span className="min-w-0 flex-1">
                    <QuestionTextMediaBlock
                      value={optionTextMedia.text || (optionInlineImages.length ? 'Alternativa com imagem' : option.text)}
                      textClassName="whitespace-pre-wrap leading-6" />
                  </span>
                  <OptionThumbnailMedia images={optionInlineImages} />
                  {option.isCorrect && (
                    <Chip tone="success" icon={CheckCircle2} className="shrink-0 uppercase tracking-widest">Correta</Chip>
                  )}
                </div>
              )
            })}
          </div>
          <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${TONE.success.border} ${TONE.success.softBg} ${TONE.success.text}`}>
            Resposta correta: {correctOpt?.label ?? '-'}
          </div>
          {question.explanation && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Eyebrow tone="warning">Explicação</Eyebrow>
              <div className="mt-2"><QuestionTextMediaBlock value={question.explanation} /></div>
            </div>
          )}
          <SkillSummaryList question={question} />
        </div>
      </div>
    </div>
  )
}

/* ── Paginação local ─────────────────────────────────────────────────── */

function PaginationControls({ page, totalItems, onPageChange, label = 'questões' }: {
  page: number; totalItems: number; onPageChange: (page: number) => void; label?: string
}) {
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
  const navBtn = 'grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${TONE.brand.iconBox}`}>
          <LayoutGrid className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-slate-700">
          {start}–{end} <span className="font-normal text-slate-400">de</span> {totalItems}{' '}
          <span className="font-normal text-slate-400">{label}</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(1)} className={navBtn}><ChevronsLeft className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={navBtn}><ChevronLeft className="h-3.5 w-3.5" /></button>
        {getPageNumbers().map((p, i) => typeof p === 'number'
          ? <button key={i} type="button" onClick={() => onPageChange(p)}
              className={`grid h-8 w-8 place-items-center rounded-lg text-sm font-semibold ${
                page === p ? `${TONE.brand.bg} text-white` : 'border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
              }`}>{p}</button>
          : <span key={i} className="px-1 text-slate-400">…</span>
        )}
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className={navBtn}><ChevronRight className="h-3.5 w-3.5" /></button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} className={navBtn}><ChevronsRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  )
}

/* ── Prévia PDF ──────────────────────────────────────────────────────── */

function EvaluationPdfPreview({ draft, selectedQuestions, classLabel }: {
  draft: Partial<Evaluation>; selectedQuestions: Question[]; classLabel: string
}) {
  const previewQuestions = selectedQuestions.slice(0, 3)
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <Eyebrow className="mb-3 text-center">Prévia A4</Eyebrow>
      <div className="mx-auto min-h-[420px] w-full max-w-[320px] rounded-xl bg-white px-5 py-6 shadow-md ring-1 ring-slate-200 sm:px-7">
        <div className="border-b-2 border-slate-900 pb-3 text-center">
          <h3 className="text-sm font-bold uppercase leading-snug text-slate-950 line-clamp-2">{draft.title || 'Título da prova'}</h3>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-slate-600">
          <div className="border-b border-slate-300 pb-1"><strong>Aluno:</strong></div>
          <div className="border-b border-slate-300 pb-1"><strong>Data:</strong> {formatPrintDate(draft.scheduledAt)}</div>
          <div className="border-b border-slate-300 pb-1"><strong>Turma:</strong> {classLabel}</div>
          <div className="border-b border-slate-300 pb-1"><strong>Disciplina:</strong> {getAcademicSubjectLabel(draft.subject) || '-'}</div>
        </div>
        <div className="mt-4 space-y-3">
          {previewQuestions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-[10px] font-semibold text-slate-400">
              <FileQuestion className="mx-auto mb-2 h-6 w-6 text-slate-300" />
              Selecione questões para visualizar.
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

/* ── Painel de composição ────────────────────────────────────────────── */

function CompositionPanel({
  draft, selectedQuestions, selectedSkillCodes, selectedDescriptorCodes, estimatedMinutes,
  buildMode, classLabel, onRemoveQuestion, onOpenQuestion, onClear,
}: {
  draft: Partial<Evaluation>; selectedQuestions: Question[]
  selectedSkillCodes: string[]; selectedDescriptorCodes: string[]
  estimatedMinutes: number; buildMode: EvaluationBuildMode; classLabel: string
  onRemoveQuestion: (id: string) => void; onOpenQuestion: (q: Question) => void; onClear: () => void
}) {
  const stats: Array<{ label: string; value: string; icon: React.ElementType; tone: ToneKey }> = [
    { label: 'Tempo est.', value: estimatedMinutes ? `${estimatedMinutes}min` : '—', icon: Timer, tone: 'info' },
    { label: 'Habilidades', value: String(selectedSkillCodes.length), icon: Target, tone: 'brand' },
    { label: 'Descritores', value: String(selectedDescriptorCodes.length), icon: Layers, tone: 'warning' },
    { label: 'Modo', value: formatBuildMode(buildMode), icon: Settings2, tone: 'ai' },
  ]

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className={`grid h-9 w-9 place-items-center rounded-xl ${TONE.brand.iconBoxSolid}`}>
              <ListChecks className="h-4 w-4" />
            </div>
            <div>
              <Eyebrow tone="brand">Composição da prova</Eyebrow>
              <p className="text-sm font-semibold text-slate-900">
                {selectedQuestions.length} quest{selectedQuestions.length !== 1 ? 'ões' : 'ão'} selecionada{selectedQuestions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {selectedQuestions.length > 0 && (
            <button type="button" onClick={onClear}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${TONE.danger.border} ${TONE.danger.softBg} ${TONE.danger.softText} hover:bg-rose-100`}>
              <Trash2 className="h-3.5 w-3.5" />Limpar
            </button>
          )}
        </header>

        <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TONE[s.tone].iconBox}`}>
                <s.icon className="h-3 w-3" />{s.label}
              </div>
              <div className="mt-1 text-base font-black text-slate-800">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="max-h-[500px] space-y-2 overflow-y-auto p-3">
          {selectedQuestions.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="Prova vazia"
              sub="Use a geração automática ou selecione questões do banco" />
          ) : selectedQuestions.map((q, idx) => (
            <div key={q.id} className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-300">
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-black transition ${TONE.brand.iconBox} group-hover:${TONE.brand.iconBoxSolid}`}>
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{q.title}</p>
                <div><SkillSummaryList question={q} compact /></div>
              </div>
              <button type="button" onClick={() => onOpenQuestion(q)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 opacity-0 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 group-hover:opacity-100"
                aria-label="Ver questão">
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onRemoveQuestion(q.id)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-400 opacity-0 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <EvaluationPdfPreview draft={draft} selectedQuestions={selectedQuestions} classLabel={classLabel} />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
 *  MAIN VIEW
 *  Toda a lógica abaixo é idêntica ao arquivo original — apenas a árvore
 *  JSX no `return` foi reorganizada.
 * ════════════════════════════════════════════════════════════════════════ */

export default function EvaluationsView({
  currentUser, currentRole, evaluations, evaluationsPagination, classes,
  curriculumSkills, assessmentDescriptors, teachers = [], answerCards = [],
  questionBank, questionImportPlans,
  onCreate, onDelete, onDownload, onDownloadAnswerCards, onCreateQuestion,
  onGenerateQuestions, onLoadQuestionsPage, onLoadEvaluationsPage, onDeleteQuestion,
}: EvaluationsViewProps) {
  const firstSkillId = curriculumSkills[0]?.id ?? ''
  const firstDescriptorId = assessmentDescriptors[0]?.id ?? ''

  /* ── STATE ──────────────────────────────────────────────────────────── */
  const [draft, setDraft] = useState<Partial<Evaluation>>({ ...emptyEvaluation })
  const [statusFilter, setStatusFilter] = useState<EvaluationStatus | 'all'>('all')
  const [workspace, setWorkspace] = useState<WorkspaceTab>('list')
  const [bankSource, setBankSource] = useState<BankSource>('professor')
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
  const [registeredEvaluationsSearch, setRegisteredEvaluationsSearch] = useState('')
  const [debouncedRegisteredEvaluationsSearch, setDebouncedRegisteredEvaluationsSearch] = useState('')
  const [registeredEvaluationsPage, setRegisteredEvaluationsPage] = useState(1)
  const [registeredEvaluationsPayload, setRegisteredEvaluationsPayload] = useState<EvaluationsPagePayload | null>(null)
  const [isRegisteredEvaluationsLoading, setIsRegisteredEvaluationsLoading] = useState(false)
  const [registeredEvaluationsError, setRegisteredEvaluationsError] = useState<string | null>(null)
  const [registeredEvaluationsReloadKey, setRegisteredEvaluationsReloadKey] = useState(0)
  const [questionPreview, setQuestionPreview] = useState<Question | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [bankPage, setBankPage] = useState(1)
  const [inepPage, setInepPage] = useState(1)
  const [bankFilters, setBankFilters] = useState<BankFilters>({
    search: '', gradeLevel: 'all', difficulty: 'all', status: 'all',
    skillCode: 'all', descriptorCode: 'all', sourceType: 'all',
    schoolId: 'all', createdById: 'all',
  })
  const [debouncedBankSearch, setDebouncedBankSearch] = useState('')
  const [bankQuestionsPage, setBankQuestionsPage] = useState<QuestionBankPagePayload | null>(null)
  const [inepQuestionsPage, setInepQuestionsPage] = useState<QuestionBankPagePayload | null>(null)
  const [autoQuestionsPage, setAutoQuestionsPage] = useState<QuestionBankPagePayload | null>(null)
  const [isBankQuestionsLoading, setIsBankQuestionsLoading] = useState(false)
  const [isInepQuestionsLoading, setIsInepQuestionsLoading] = useState(false)
  const [isAutoQuestionsLoading, setIsAutoQuestionsLoading] = useState(false)
  const [questionsPageError, setQuestionsPageError] = useState<string | null>(null)
  const [autoFilters, setAutoFilters] = useState<AutoFilters>({
    gradeLevel: 'all', difficulty: 'all', skillCode: 'all',
    descriptorCode: 'all', subject: 'all', sourceMode: 'system',
  })
  const deferredAutoFilters = useDeferredValue(autoFilters)
  const [teacherQuestionDraft, setTeacherQuestionDraft] = useState<TeacherQuestionDraft>(
    createEmptyQuestionDraft(firstSkillId, firstDescriptorId),
  )
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)

  /* ── EFFECTS ────────────────────────────────────────────────────────── */
  useEffect(() => { const t = setTimeout(() => setIsLoading(false), 800); return () => clearTimeout(t) }, [])
  useEffect(() => { setBankPage(1) }, [bankFilters])
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedBankSearch(bankFilters.search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [bankFilters.search])
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedRegisteredEvaluationsSearch(registeredEvaluationsSearch.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [registeredEvaluationsSearch])

  /* ── DERIVED — escopo do usuário ────────────────────────────────────── */
  const currentRoleText = normalizeAcademicText(`${currentRole?.code ?? ''} ${currentRole?.name ?? ''}`)
  const canSeeAllBankQuestions =
    currentRoleText.includes('admin') || currentRoleText.includes('diretor') ||
    currentRoleText.includes('coordenador') || currentRoleText.includes('pedagog')
  const isProfessorRole =
    currentRole?.code === 'PROFESSOR' ||
    currentRoleText.includes('professor') || currentRoleText.includes('docente') ||
    currentRoleText.includes('teacher') || Boolean(currentUser.linkedTeacherId)
  const activeSkills = useMemo(() => curriculumSkills.filter(s => s.active), [curriculumSkills])
  const currentQuestionCreatorIds = useMemo(
    () => [currentUser.id, currentUser.linkedTeacherId].filter((id): id is string => Boolean(id)),
    [currentUser.id, currentUser.linkedTeacherId],
  )
  const currentTeacherProfiles = useMemo(
    () => teachers.filter((t) =>
      t.id === currentUser.linkedTeacherId || t.userId === currentUser.id ||
      currentQuestionCreatorIds.includes(t.id) || currentQuestionCreatorIds.includes(t.userId),
    ),
    [currentQuestionCreatorIds, currentUser.id, currentUser.linkedTeacherId, teachers],
  )
  const isTeacherScopedUser = isProfessorRole || currentTeacherProfiles.length > 0
  const currentTeacherIds = useMemo(
    () => new Set([currentUser.linkedTeacherId, ...currentTeacherProfiles.map(t => t.id)]
      .filter((id): id is string => Boolean(id))),
    [currentTeacherProfiles, currentUser.linkedTeacherId],
  )
  const currentTeacherSchoolIds = useMemo(
    () => new Set([...currentTeacherProfiles.map((teacher) => teacher.schoolId), currentUser.schoolId]
      .filter((id): id is string => Boolean(id))),
    [currentTeacherProfiles, currentUser.schoolId],
  )
  const currentTeacherClasses = useMemo(() => {
    if (!currentTeacherIds.size && !currentTeacherProfiles.length) return []
    return classes.filter((classRoom) => {
      const ids = [classRoom.teacherId, ...(classRoom.teacherIds ?? [])].filter(Boolean)
      if (ids.some((id) => currentTeacherIds.has(id))) return true
      if (currentTeacherSchoolIds.size && !currentTeacherSchoolIds.has(classRoom.schoolId)) return false
      return currentTeacherProfiles.some((teacher) => teacherMatchesEvaluationClass(teacher, classRoom, activeSkills))
    })
  }, [activeSkills, classes, currentTeacherIds, currentTeacherProfiles, currentTeacherSchoolIds])
  const selectedEvaluationClass = useMemo(
    () => classes.find((c) => c.id === draft.classId) ?? null,
    [classes, draft.classId],
  )
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
  const allowedEvaluationSubjectKeys = useMemo(
    () => new Set(allowedEvaluationSubjects.map((s) => normalizeAcademicText(s))),
    [allowedEvaluationSubjects],
  )
  const bankQuestionPool = useMemo(() => questionBank.filter(q => q.sourceType !== 'INEP_ENEM'), [questionBank])
  const visibleBankQuestionPool = useMemo(
    () => canSeeAllBankQuestions
      ? bankQuestionPool
      : bankQuestionPool.filter(q => currentQuestionCreatorIds.includes(q.createdById)),
    [bankQuestionPool, canSeeAllBankQuestions, currentQuestionCreatorIds],
  )
  const inepQuestions = useMemo(() => questionBank.filter(q => q.sourceType === 'INEP_ENEM'), [questionBank])
  const mixedAutoQuestionPool = useMemo(() => [...inepQuestions, ...visibleBankQuestionPool], [inepQuestions, visibleBankQuestionPool])
  const questionCatalog = useMemo(() => mergeQuestionsById(
    questionBank, generatedQuestions,
    bankQuestionsPage?.questions ?? [], inepQuestionsPage?.questions ?? [],
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

  const localRegisteredEvaluations = useMemo(() => {
    const query = normalizeAcademicText(debouncedRegisteredEvaluationsSearch)
    return teacherScopedEvaluations.filter((evaluation) => {
      if (statusFilter !== 'all' && evaluation.status !== statusFilter) return false
      if (!query) return true
      const text = normalizeAcademicText(`${evaluation.title} ${evaluation.subject} ${getAcademicSubjectLabel(evaluation.subject, activeSkills)}`)
      return text.includes(query)
    })
  }, [activeSkills, debouncedRegisteredEvaluationsSearch, statusFilter, teacherScopedEvaluations])

  const localRegisteredEvaluationsPage = useMemo(
    () => paginateLocal(localRegisteredEvaluations, registeredEvaluationsPage, REGISTERED_EVALUATIONS_PAGE_SIZE),
    [localRegisteredEvaluations, registeredEvaluationsPage],
  )
  const canUseBackendEvaluationsPage = Boolean(onLoadEvaluationsPage)
  const registeredEvaluations = canUseBackendEvaluationsPage
    ? registeredEvaluationsPayload?.evaluations ?? []
    : localRegisteredEvaluationsPage.items
  const registeredEvaluationsPagination = canUseBackendEvaluationsPage
    ? registeredEvaluationsPayload?.pagination ?? getLocalPagination(0, registeredEvaluationsPage, REGISTERED_EVALUATIONS_PAGE_SIZE)
    : localRegisteredEvaluationsPage.pagination
  const registeredEvaluationsTotal =
    registeredEvaluationsPayload?.pagination.total ?? evaluationsPagination?.total ?? teacherScopedEvaluations.length
  const showRegisteredEvaluationsLoading = isLoading || isRegisteredEvaluationsLoading

  useEffect(() => { setRegisteredEvaluationsPage(1) }, [debouncedRegisteredEvaluationsSearch, statusFilter])
  useEffect(() => {
    if (workspace !== 'list' || !onLoadEvaluationsPage) return
    let cancelled = false
    setIsRegisteredEvaluationsLoading(true)
    setRegisteredEvaluationsError(null)
    onLoadEvaluationsPage({
      page: registeredEvaluationsPage,
      limit: REGISTERED_EVALUATIONS_PAGE_SIZE,
      search: debouncedRegisteredEvaluationsSearch,
      status: statusFilter,
    })
      .then((payload) => { if (!cancelled) setRegisteredEvaluationsPayload(payload) })
      .catch((error) => {
        if (cancelled) return
        setRegisteredEvaluationsPayload(null)
        setRegisteredEvaluationsError(error instanceof Error ? error.message : 'Nao foi possivel carregar as provas do servidor.')
      })
      .finally(() => { if (!cancelled) setIsRegisteredEvaluationsLoading(false) })
    return () => { cancelled = true }
  }, [
    debouncedRegisteredEvaluationsSearch, workspace, onLoadEvaluationsPage,
    registeredEvaluationsPage, registeredEvaluationsReloadKey, statusFilter,
  ])

  const answerCardsByEvaluationId = useMemo(() => {
    const counts = new Map<string, number>()
    for (const card of answerCards) {
      const id = getAnswerCardEvaluationId(card)
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [answerCards])

  const canUseBackendQuestionPages = Boolean(onLoadQuestionsPage)
  const backendQuestionFacets = bankQuestionsPage?.facets ?? autoQuestionsPage?.facets ?? emptyQuestionPageFacets
  const gradeLevels = useMemo(
    () => canUseBackendQuestionPages
      ? backendQuestionFacets.gradeLevels
      : getUniqueValues(questionBank.map(q => q.gradeLevel)),
    [backendQuestionFacets.gradeLevels, canUseBackendQuestionPages, questionBank],
  )
  const sourceTypes = useMemo(
    () => canUseBackendQuestionPages
      ? backendQuestionFacets.sourceTypes
      : getUniqueValues(visibleBankQuestionPool.map(q => q.sourceType)),
    [backendQuestionFacets.sourceTypes, canUseBackendQuestionPages, visibleBankQuestionPool],
  )
  const bankSchoolIds = useMemo(
    () => canUseBackendQuestionPages
      ? backendQuestionFacets.schoolIds
      : getUniqueValues(visibleBankQuestionPool.map(q => q.schoolId)),
    [backendQuestionFacets.schoolIds, canUseBackendQuestionPages, visibleBankQuestionPool],
  )
  const bankCreatorIds = useMemo(
    () => canUseBackendQuestionPages
      ? backendQuestionFacets.createdByIds
      : getUniqueValues(visibleBankQuestionPool.map(q => q.createdById)),
    [backendQuestionFacets.createdByIds, canUseBackendQuestionPages, visibleBankQuestionPool],
  )
  const activeDescriptors = useMemo(() => assessmentDescriptors.filter(d => d.active), [assessmentDescriptors])

  /* ── OPTIONS ────────────────────────────────────────────────────────── */
  const classOptions = useMemo<Array<CompactSelectOption<string>>>(() => [
    { value: '', label: 'Selecionar turma...' },
    ...classes.map(c => ({ value: c.id, label: c.name, description: `${formatClassGrade(c.grade)} · ${c.shift}` })),
  ], [classes])
  const subjectOptions = useMemo<Array<CompactSelectOption<string>>>(() =>
    allowedEvaluationSubjects.length
      ? allowedEvaluationSubjects.map((s) => ({ value: s, label: getAcademicSubjectLabel(s, activeSkills) }))
      : [{ value: '', label: 'Nenhuma disciplina disponível para esta turma', disabled: true }],
    [activeSkills, allowedEvaluationSubjects],
  )

  useEffect(() => {
    const fallbackSubject = allowedEvaluationSubjects[0] ?? ''
    setDraft((current) => {
      const currentSubject = canonicalEvaluationSubjectLabel(current.subject, activeSkills)
      const currentSubjectKey = normalizeAcademicText(currentSubject)
      if (currentSubjectKey && allowedEvaluationSubjectKeys.has(currentSubjectKey)) {
        return current.subject === currentSubject ? current : { ...current, subject: currentSubject }
      }
      return { ...current, subject: fallbackSubject }
    })
  }, [activeSkills, allowedEvaluationSubjectKeys, allowedEvaluationSubjects])

  useEffect(() => {
    if (autoFilters.subject === 'all') return
    const currentSubject = canonicalEvaluationSubjectLabel(autoFilters.subject, activeSkills)
    if (allowedEvaluationSubjectKeys.has(normalizeAcademicText(currentSubject))) return
    setAutoFilters((c) => ({ ...c, subject: 'all', skillCode: 'all', descriptorCode: 'all' }))
  }, [activeSkills, allowedEvaluationSubjectKeys, autoFilters.subject])

  const gradeLevelOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todos os anos' }, ...gradeLevels.map(v => ({ value: v, label: v }))],
    [gradeLevels],
  )
  const difficultyOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todas' }, ...(['EASY', 'MEDIUM', 'HARD'] as const).map(v => ({ value: v, label: formatDifficulty(v) }))],
    [],
  )
  const questionStatusOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todos' }, ...(['APPROVED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED', 'ARCHIVED'] as const).map(v => ({ value: v, label: formatQStatus(v) }))],
    [],
  )
  const sourceTypeOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todas as fontes' }, ...sourceTypes.map(v => ({ value: v, label: formatSourceType(v as QuestionSourceType) }))],
    [sourceTypes],
  )
  const schoolFilterOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todas as escolas' }, ...bankSchoolIds.map(id => ({
      value: id, label: id === currentUser.schoolId ? 'Minha escola' : `Escola ${shortId(id)}`, description: id,
    }))],
    [bankSchoolIds, currentUser.schoolId],
  )
  const creatorFilterOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todos os professores' }, ...bankCreatorIds.map(id => ({
      value: id, label: id === currentUser.id ? 'Minhas questões' : `Professor ${shortId(id)}`, description: id,
    }))],
    [bankCreatorIds, currentUser.id],
  )
  const teacherDifficultyOptions = useMemo<Array<CompactSelectOption<Difficulty>>>(
    () => (['EASY', 'MEDIUM', 'HARD'] as const).map(v => ({ value: v, label: formatDifficulty(v) })),
    [],
  )
  const teacherVisibilityOptions = useMemo<Array<CompactSelectOption<QuestionVisibility>>>(
    () => [{ value: 'PRIVATE', label: 'Privada' }, { value: 'SCHOOL', label: 'Escola' }, { value: 'NETWORK', label: 'Rede' }],
    [],
  )
  const teacherStatusOptions = useMemo<Array<CompactSelectOption<QuestionStatus>>>(
    () => [{ value: 'DRAFT', label: 'Rascunho' }, { value: 'PENDING_REVIEW', label: 'Em revisão' }],
    [],
  )
  const teacherSkillOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => activeSkills.map(skill => ({ value: skill.id, label: getSkillOptionLabel(skill), description: getSkillOptionDescription(skill) })),
    [activeSkills],
  )
  const teacherDescriptorOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => activeDescriptors.map(d => ({ value: d.id, label: d.code, description: d.description })),
    [activeDescriptors],
  )

  const selectedAutoSubjectForQuery = useMemo(
    () => canonicalEvaluationSubjectLabel(autoFilters.subject === 'all' ? draft.subject : autoFilters.subject, activeSkills),
    [activeSkills, autoFilters.subject, draft.subject],
  )
  const bankPageQuery = useMemo<QuestionBankPageQuery>(() => ({
    page: bankPage, limit: QUESTIONS_PER_PAGE, sourceMode: 'system', search: debouncedBankSearch,
    gradeLevel: bankFilters.gradeLevel, difficulty: bankFilters.difficulty, status: bankFilters.status,
    skillCode: bankFilters.skillCode, descriptorCode: bankFilters.descriptorCode, sourceType: bankFilters.sourceType,
    schoolId: bankFilters.schoolId, createdById: bankFilters.createdById,
    includeFacets: true, facetsMode: 'bank',
  }), [bankFilters.createdById, bankFilters.descriptorCode, bankFilters.difficulty, bankFilters.gradeLevel,
       bankFilters.schoolId, bankFilters.skillCode, bankFilters.sourceType, bankFilters.status, bankPage, debouncedBankSearch])
  const inepPageQuery = useMemo<QuestionBankPageQuery>(() => ({
    page: inepPage, limit: QUESTIONS_PER_PAGE, sourceMode: 'enem', includeFacets: true, facetsMode: 'bank',
  }), [inepPage])
  const autoPageQuery = useMemo<QuestionBankPageQuery>(() => ({
    page: 1, limit: AUTO_ELIGIBLE_PREVIEW_LIMIT, sourceMode: autoFilters.sourceMode,
    subject: selectedAutoSubjectForQuery, gradeLevel: autoFilters.gradeLevel,
    difficulty: autoFilters.difficulty, status: 'APPROVED',
    skillCode: autoFilters.skillCode, descriptorCode: autoFilters.descriptorCode,
    includeFacets: true, facetsMode: 'auto',
  }), [autoFilters.descriptorCode, autoFilters.difficulty, autoFilters.gradeLevel,
       autoFilters.skillCode, autoFilters.sourceMode, selectedAutoSubjectForQuery])

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
    if (!onLoadQuestionsPage || workspace !== 'bank' || bankSource !== 'inep') return
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
  }, [inepPage, inepPageQuery, onLoadQuestionsPage, workspace, bankSource])

  useEffect(() => {
    if (!onLoadQuestionsPage || workspace !== 'builder' || buildMode !== 'automatic_bank' || !selectedAutoSubjectForQuery) return
    let active = true
    setIsAutoQuestionsLoading(true)
    setQuestionsPageError(null)
    onLoadQuestionsPage(autoPageQuery)
      .then((payload) => { if (active) setAutoQuestionsPage(payload) })
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
      if (!questionMatchesEvaluationFilters(
        q,
        {
          ...bankFilters,
          difficulty: bankFilters.difficulty === 'all' ? 'all' : bankFilters.difficulty as Difficulty,
          status: bankFilters.status === 'all' ? 'all' : bankFilters.status as QuestionStatus,
          sourceType: bankFilters.sourceType === 'all' ? 'all' : bankFilters.sourceType as QuestionSourceType,
        },
        activeSkills, activeDescriptors,
      )) return false
      if (s && !questionSearchText(q).includes(s)) return false
      return true
    })
  }, [activeDescriptors, activeSkills, bankFilters, bankQuestionsPage?.questions, canUseBackendQuestionPages, visibleBankQuestionPool])

  const autoFiltersPending = deferredAutoFilters !== autoFilters
  const autoSourcePool = useMemo(() => (
    canUseBackendQuestionPages ? []
      : deferredAutoFilters.sourceMode === 'enem' ? inepQuestions
      : deferredAutoFilters.sourceMode === 'mixed' ? mixedAutoQuestionPool
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
    return [{
      value: 'all', label: 'Usar disciplina da prova',
      description: draft.subject ? getAcademicSubjectLabel(draft.subject, activeSkills) : 'Sem disciplina selecionada',
    }, ...subjects.map((s) => ({ value: s, label: s }))]
  }, [activeSkills, allowedEvaluationSubjectKeys, allowedEvaluationSubjects, autoFilters.sourceMode,
      autoQuestionsPage?.facets.subjects, autoSourcePool, canUseBackendQuestionPages, draft.subject])

  const selectedAutoSubject = useMemo(
    () => canUseBackendQuestionPages
      ? selectedAutoSubjectForQuery
      : canonicalEvaluationSubjectLabel(deferredAutoFilters.subject === 'all' ? draft.subject : deferredAutoFilters.subject, activeSkills),
    [activeSkills, canUseBackendQuestionPages, deferredAutoFilters.subject, draft.subject, selectedAutoSubjectForQuery],
  )
  const autoSubjectFilteredPool = useMemo(() => {
    if (canUseBackendQuestionPages) return []
    if (!selectedAutoSubject) return []
    return autoSourcePool.filter(q => {
      if (q.status !== 'APPROVED') return false
      if (!questionMatchesGradeFilter(q.gradeLevel, deferredAutoFilters.gradeLevel)) return false
      if (deferredAutoFilters.difficulty !== 'all' && q.difficulty !== deferredAutoFilters.difficulty) return false
      if (selectedAutoSubject && !questionMatchesSubject(q, selectedAutoSubject)) return false
      return true
    })
  }, [canUseBackendQuestionPages, deferredAutoFilters.difficulty, deferredAutoFilters.gradeLevel, autoSourcePool, selectedAutoSubject])
  const autoSkillKeySet = useMemo(() => createQuestionSkillKeySet(autoSubjectFilteredPool), [autoSubjectFilteredPool])
  const compatibleAutoSkills = useMemo(() => {
    if (canUseBackendQuestionPages) return autoQuestionsPage?.facets.skills ?? []
    const fallback = autoSkillKeySet.size === 0
    return activeSkills.filter((s) => {
      if (!skillMatchesSubject(s, selectedAutoSubject)) return false
      if (!skillMatchesGrade(s, deferredAutoFilters.gradeLevel)) return false
      return fallback || optionMatchesKeySet(s, autoSkillKeySet)
    })
  }, [activeSkills, autoQuestionsPage?.facets.skills, autoSkillKeySet, canUseBackendQuestionPages,
      deferredAutoFilters.gradeLevel, selectedAutoSubject])
  const compatibleAutoSkillKeys = useMemo(
    () => new Set(compatibleAutoSkills.flatMap((s) => [s.id, s.code]).map(filterKey).filter(Boolean)),
    [compatibleAutoSkills],
  )
  const autoSkillFilteredPool = useMemo(
    () => canUseBackendQuestionPages ? []
      : autoSubjectFilteredPool.filter(q => questionMatchesSkill(q, deferredAutoFilters.skillCode, activeSkills)),
    [activeSkills, autoSubjectFilteredPool, canUseBackendQuestionPages, deferredAutoFilters.skillCode],
  )
  const autoDescriptorKeySet = useMemo(() => createQuestionDescriptorKeySet(autoSkillFilteredPool), [autoSkillFilteredPool])
  const compatibleAutoDescriptors = useMemo(
    () => canUseBackendQuestionPages
      ? autoQuestionsPage?.facets.descriptors ?? []
      : activeDescriptors.filter((d) => optionMatchesKeySet(d, autoDescriptorKeySet)),
    [activeDescriptors, autoDescriptorKeySet, autoQuestionsPage?.facets.descriptors, canUseBackendQuestionPages],
  )
  const compatibleAutoDescriptorKeys = useMemo(
    () => new Set(compatibleAutoDescriptors.flatMap((d) => [d.id, d.code]).map(filterKey).filter(Boolean)),
    [compatibleAutoDescriptors],
  )

  const skillCodeOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{
    value: 'all',
    label: compatibleAutoSkills.length ? 'Todas compatíveis' : 'Sem habilidade',
    description: selectedAutoSubject ? `Disciplina: ${getAcademicSubjectLabel(selectedAutoSubject, activeSkills)}` : 'Selecione a disciplina',
  }, ...compatibleAutoSkills.map(s => ({ value: s.code || s.id, label: getSkillOptionLabel(s), description: getSkillOptionDescription(s) }))],
    [activeSkills, compatibleAutoSkills, selectedAutoSubject])
  const descriptorCodeOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{
    value: 'all',
    label: compatibleAutoDescriptors.length ? 'Todos compatíveis' : 'Sem descritor',
    description: selectedAutoSubject ? `Disciplina: ${getAcademicSubjectLabel(selectedAutoSubject, activeSkills)}` : 'Selecione a disciplina',
  }, ...compatibleAutoDescriptors.map(d => ({ value: d.code || d.id, label: d.code, description: d.description }))],
    [activeSkills, compatibleAutoDescriptors, selectedAutoSubject])

  useEffect(() => {
    if (autoFiltersPending) return
    if (autoFilters.skillCode === 'all') return
    if (compatibleAutoSkillKeys.has(filterKey(autoFilters.skillCode))) return
    setAutoFilters((c) => {
      if (c.skillCode === 'all' && c.descriptorCode === 'all') return c
      return { ...c, skillCode: 'all', descriptorCode: 'all' }
    })
  }, [autoFilters.skillCode, autoFiltersPending, compatibleAutoSkillKeys])
  useEffect(() => {
    if (autoFiltersPending) return
    if (autoFilters.descriptorCode === 'all') return
    if (compatibleAutoDescriptorKeys.has(filterKey(autoFilters.descriptorCode))) return
    setAutoFilters((c) => c.descriptorCode === 'all' ? c : { ...c, descriptorCode: 'all' })
  }, [autoFilters.descriptorCode, autoFiltersPending, compatibleAutoDescriptorKeys])

  const autoEligible = useMemo(
    () => canUseBackendQuestionPages
      ? autoQuestionsPage?.questions ?? []
      : autoSkillFilteredPool.filter(q => questionMatchesDescriptorFilter(q, deferredAutoFilters.descriptorCode, activeDescriptors)),
    [activeDescriptors, autoQuestionsPage?.questions, autoSkillFilteredPool, canUseBackendQuestionPages, deferredAutoFilters.descriptorCode],
  )
  const autoEligibleTotal = canUseBackendQuestionPages ? autoQuestionsPage?.pagination.total ?? 0 : autoEligible.length
  const questionCatalogById = useMemo(() => new Map(questionCatalog.map((q) => [q.id, q])), [questionCatalog])
  const selectedQuestions = useMemo(
    () => selectedQuestionIds.map(id => questionCatalogById.get(id)).filter((q): q is Question => Boolean(q)),
    [questionCatalogById, selectedQuestionIds],
  )
  const bankQuestionsTotal = canUseBackendQuestionPages ? bankQuestionsPage?.pagination.total ?? 0 : filteredQuestions.length
  const allQuestionsTotal = canUseBackendQuestionPages
    ? bankQuestionsPage?.totals.all ?? autoQuestionsPage?.totals.all ?? questionBank.length
    : questionBank.length
  const systemQuestionsTotal = canUseBackendQuestionPages ? bankQuestionsPage?.totals.system ?? 0 : visibleBankQuestionPool.length
  const safeBankPage = canUseBackendQuestionPages
    ? bankQuestionsPage?.pagination.page ?? bankPage
    : clampPage(bankPage, filteredQuestions.length)
  const paginatedQuestions = canUseBackendQuestionPages
    ? filteredQuestions
    : filteredQuestions.slice((safeBankPage - 1) * QUESTIONS_PER_PAGE, safeBankPage * QUESTIONS_PER_PAGE)
  const inepQuestionsTotal = canUseBackendQuestionPages
    ? inepQuestionsPage?.pagination.total ?? bankQuestionsPage?.totals.enem ?? autoQuestionsPage?.totals.enem ?? 0
    : inepQuestions.length
  const safeInepPage = canUseBackendQuestionPages
    ? inepQuestionsPage?.pagination.page ?? inepPage
    : clampPage(inepPage, inepQuestions.length)
  const paginatedInepQuestions = canUseBackendQuestionPages
    ? inepQuestionsPage?.questions ?? []
    : inepQuestions.slice((safeInepPage - 1) * QUESTIONS_PER_PAGE, safeInepPage * QUESTIONS_PER_PAGE)
  const selectedSkillCodes = useMemo(() => getUniqueValues(selectedQuestions.flatMap(getSkillCodes)), [selectedQuestions])
  const selectedDescriptorCodes = useMemo(() => getUniqueValues(selectedQuestions.flatMap(getDescriptorCodes)), [selectedQuestions])
  const estimatedMinutes = useMemo(
    () => Math.max(0, Math.ceil(selectedQuestions.reduce((t, q) => t + Number(q.metadata.estimatedTimeSeconds ?? 0), 0) / 60)),
    [selectedQuestions],
  )
  const teacherSkillId = teacherQuestionDraft.skillId || firstSkillId
  const teacherDescriptorId = teacherQuestionDraft.descriptorId || firstDescriptorId

  /* ── HELPERS ────────────────────────────────────────────────────────── */
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
    try { await onDownload(ev.id) }
    catch (error) { setFormNotice(error instanceof Error ? error.message : 'Não foi possível baixar a prova.') }
    finally { setDownloadingEvaluationId(null) }
  }
  async function handleExportAnswerCards(ev: Evaluation) {
    if (!onDownloadAnswerCards) return
    setDownloadingAnswerCardsId(ev.id); setFormNotice(null)
    try { await onDownloadAnswerCards(ev.id) }
    catch (error) { setFormNotice(error instanceof Error ? error.message : 'Não foi possível baixar os cartões.') }
    finally { setDownloadingAnswerCardsId(null) }
  }
  function handleDeleteEvaluation(ev: Evaluation) { setDeleteTarget(ev) }
  function handleDeleteQuestion(question: Question) { setDeleteQuestionTarget(question) }
  async function confirmDeleteEvaluation() {
    if (!deleteTarget || !onDelete) return
    setDeletingEvaluationId(deleteTarget.id)
    try {
      await onDelete(deleteTarget.id)
      setRegisteredEvaluationsReloadKey((current) => current + 1)
      setFormNotice('Prova excluída com sucesso.')
      setDeleteTarget(null)
    } finally { setDeletingEvaluationId(null) }
  }
  async function confirmDeleteQuestion() {
    if (!deleteQuestionTarget || !onDeleteQuestion) return
    setDeletingQuestionId(deleteQuestionTarget.id)
    try {
      await onDeleteQuestion(deleteQuestionTarget.id)
      setSelectedQuestionIds((c) => c.filter((id) => id !== deleteQuestionTarget.id))
      setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined }))
      setFormNotice('Questão excluída do banco.')
      setDeleteQuestionTarget(null)
    } finally { setDeletingQuestionId(null) }
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
  function clearEvaluationError(field: EvaluationFormField) {
    setEvaluationFieldErrors((c) => ({ ...c, [field]: undefined }))
  }
  function scrollToEvaluationError(errors: FieldErrors<EvaluationFormField>) {
    const fieldOrder: EvaluationFormField[] = ['title', 'classId', 'subject', 'questions', 'omrCardVersion', 'scheduledAt', 'questionIds']
    const firstField = fieldOrder.find((f) => Boolean(errors[f]))
    if (!firstField || typeof document === 'undefined') return
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-evaluation-field="${firstField}"]`)
      if (!target) return
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      const focusable = target.querySelector<HTMLElement>('input, button, textarea, select, [tabindex]:not([tabindex="-1"])')
      focusable?.focus({ preventScroll: true })
    })
  }
  function setTeacherQuestionField<K extends keyof TeacherQuestionDraft>(field: K, value: TeacherQuestionDraft[K]) {
    setQuestionFieldErrors((c) => ({ ...c, [field]: undefined }))
    setTeacherQuestionDraft((c) => ({ ...c, [field]: value }))
  }
  function teacherQuestionValues() {
    return {
      ...teacherQuestionDraft,
      optionA: teacherQuestionDraft.options.A, optionB: teacherQuestionDraft.options.B,
      optionC: teacherQuestionDraft.options.C, optionD: teacherQuestionDraft.options.D,
      optionE: teacherQuestionDraft.options.E,
    }
  }
  function validateQuestionStep(step: 1 | 2 | 3) {
    const schema = step === 1 ? teacherQuestionStep1Schema : step === 2 ? teacherQuestionStep2Schema : teacherQuestionStep3Schema
    const result = schema.safeParse(teacherQuestionValues())
    if (!result.success) {
      setQuestionFieldErrors((c) => ({ ...c, ...zodFieldErrors<TeacherQuestionFormField>(result.error) }))
      return false
    }
    setQuestionFormError(null); return true
  }

  async function handleAutoSelect() {
    const target = clampEvaluationQuestionCount(draft.questions, 1)
    if (Number(draft.questions ?? target) > MAX_EVALUATION_QUESTIONS) setDraft(c => ({ ...c, questions: target }))
    const registeredSubject = canonicalEvaluationSubjectLabel(draft.subject, activeSkills)
      || allowedEvaluationSubjects[0] || SCHOOL_EVALUATION_SUBJECTS[3]
    if (!allowedEvaluationSubjectKeys.has(normalizeAcademicText(registeredSubject))) {
      const errors: FieldErrors<EvaluationFormField> = { subject: 'Selecione uma disciplina vinculada ao professor ou à turma.' }
      setEvaluationFieldErrors(errors); setFormNotice(errors.subject ?? 'Revise os campos da prova.')
      scrollToEvaluationError(errors); return
    }
    const selectionSubject = autoFilters.subject === 'all'
      ? registeredSubject
      : canonicalEvaluationSubjectLabel(autoFilters.subject, activeSkills) || registeredSubject
    const payload: GenerateQuestionSelectionRequest = {
      quantity: target, subject: selectionSubject,
      gradeLevel: autoFilters.gradeLevel === 'all' ? null : autoFilters.gradeLevel,
      difficulty: autoFilters.difficulty === 'all' ? null : autoFilters.difficulty as Difficulty,
      sourceMode: autoFilters.sourceMode,
      skillCode: autoFilters.skillCode === 'all' ? null : autoFilters.skillCode,
      descriptorCode: autoFilters.descriptorCode === 'all' ? null : autoFilters.descriptorCode,
    }
    const localEligibleQuestions = canUseBackendQuestionPages ? [] : getAutoEligibleQuestions(autoFilters, selectionSubject)
    setIsGeneratingQuestions(true); setFormNotice(null)
    try {
      const response = await onGenerateQuestions(payload)
      const responseQuestions = response.questions ?? []
      const selection = canUseBackendQuestionPages
        ? {
            selectedIds: (response.questionIds?.length ? response.questionIds : responseQuestions.map((q) => q.id)).slice(0, target),
            selectedFromApi: true,
          }
        : resolveGeneratedQuestionSelection({
            responseQuestionIds: response.questionIds, responseQuestions, localEligibleQuestions, target,
            subject: selectionSubject,
            filters: {
              gradeLevel: autoFilters.gradeLevel,
              difficulty: autoFilters.difficulty === 'all' ? 'all' : autoFilters.difficulty as Difficulty,
              status: 'APPROVED', skillCode: autoFilters.skillCode,
              descriptorCode: autoFilters.descriptorCode, sourceMode: autoFilters.sourceMode,
            },
            skills: activeSkills, descriptors: activeDescriptors, questionMatchesSubject,
          })
      const nextIds = selection.selectedIds
      if (responseQuestions.length) setGeneratedQuestions(c => mergeQuestionsById(c, responseQuestions))
      if (!nextIds.length) {
        setEvaluationFieldErrors((c) => ({ ...c, questionIds: 'Nenhuma questão elegível para estes filtros.' }))
        setFormNotice('Nenhuma questão elegível para estes filtros.'); return
      }
      setSelectedQuestionIds(nextIds)
      setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined }))
      setBuildMode(autoFilters.sourceMode === 'mixed' ? 'mixed' : 'automatic_bank')
      setDraft(c => ({ ...c, questions: nextIds.length, subject: c.subject || registeredSubject }))
      if (selection.selectedFromApi) {
        const suf = typeof response.totalEligible === 'number' ? ` (${response.totalEligible} elegíveis no backend).` : '.'
        setFormNotice(`${nextIds.length} questões selecionadas pela API${suf}`)
      } else {
        setFormNotice(`${nextIds.length} questões selecionadas pelos filtros locais (${localEligibleQuestions.length} elegíveis).`)
      }
    } catch (error) {
      const localIds = localEligibleQuestions.slice(0, target).map(q => q.id)
      if (localIds.length) {
        setSelectedQuestionIds(localIds)
        setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined }))
        setBuildMode(autoFilters.sourceMode === 'mixed' ? 'mixed' : 'automatic_bank')
        setDraft(c => ({ ...c, questions: localIds.length, subject: c.subject || registeredSubject }))
        setFormNotice(`${localIds.length} questões selecionadas pelos filtros locais.`); return
      }
      setFormNotice(error instanceof Error ? error.message : 'Não foi possível gerar questões.')
    } finally { setIsGeneratingQuestions(false) }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validation = evaluationFormSchema.safeParse({ ...draft, questionIds: selectedQuestionIds })
    if (!validation.success) {
      const errors = zodFieldErrors<EvaluationFormField>(validation.error)
      setEvaluationFieldErrors(errors); setFormNotice(Object.values(errors)[0] ?? 'Revise os campos da prova.')
      scrollToEvaluationError(errors); return
    }
    if (Number(validation.data.questions) > MAX_EVALUATION_QUESTIONS || selectedQuestionIds.length > MAX_EVALUATION_QUESTIONS) {
      const errors: FieldErrors<EvaluationFormField> = { questions: evaluationQuestionLimitMessage() }
      setEvaluationFieldErrors(errors); setFormNotice(errors.questions ?? 'Revise os campos.')
      scrollToEvaluationError(errors); return
    }
    const validatedSubject = canonicalEvaluationSubjectLabel(validation.data.subject, activeSkills)
    if (!allowedEvaluationSubjectKeys.has(normalizeAcademicText(validatedSubject))) {
      const errors: FieldErrors<EvaluationFormField> = { subject: 'Selecione uma disciplina vinculada ao professor ou à turma.' }
      setEvaluationFieldErrors(errors); setFormNotice(errors.subject ?? 'Revise os campos.')
      scrollToEvaluationError(errors); return
    }
    if (buildMode !== 'teacher_created' && selectedQuestionIds.length === 0) {
      const errors: FieldErrors<EvaluationFormField> = { questionIds: 'Selecione questões ou use a geração automática.' }
      setEvaluationFieldErrors(errors); setFormNotice(errors.questionIds ?? 'Revise os campos.')
      scrollToEvaluationError(errors); return
    }
    setEvaluationFieldErrors({})
    const zTitle = sanitizeText(validation.data.title)
    const zClassId = sanitizeText(validation.data.classId)
    const zSubject = validatedSubject
    const zOmrCardVersion = sanitizeText(validation.data.omrCardVersion) || DEFAULT_OMR_CARD_VERSION
    const zScheduledAt = sanitizeText(validation.data.scheduledAt)
    const zQuestionCount = selectedQuestions.length || Math.max(1, Number(validation.data.questions))
    const zResolvedMode = selectedQuestions.some(q => q.sourceType === 'TEACHER_CREATED') && buildMode !== 'teacher_created'
      ? 'mixed' : buildMode
    await onCreate({
      title: zTitle, classId: zClassId, subject: zSubject, questions: zQuestionCount,
      omrCardVersion: zOmrCardVersion, scheduledAt: zScheduledAt, status: 'planejado',
      corrected: 0, participants: 0, averageScore: 0,
      triLevel: selectedQuestions.length > 0 ? `Banco: ${zQuestionCount} itens` : 'Criação do professor',
      buildMode: zResolvedMode, questionIds: selectedQuestionIds,
      skillCodes: selectedSkillCodes, descriptorCodes: selectedDescriptorCodes,
      sourceSummary: sourceSummary(selectedQuestions),
    })
    setRegisteredEvaluationsReloadKey((current) => current + 1)
    setDraft({ ...emptyEvaluation, subject: allowedEvaluationSubjects[0] ?? emptyEvaluation.subject })
    setSelectedQuestionIds([]); setEvaluationFieldErrors({}); setBuildMode('manual_bank')
    setFormNotice('Prova criada com cartões individualizados!')
  }

  function updateOption(label: OptionLabel, value: string) {
    const field = `option${label}` as TeacherQuestionFormField
    setQuestionFieldErrors(c => ({ ...c, [field]: undefined }))
    setTeacherQuestionDraft(c => ({ ...c, options: { ...c.options, [label]: value } }))
  }

  async function handleTeacherQuestionSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validation = teacherQuestionFormSchema.safeParse(teacherQuestionValues())
    if (!validation.success) {
      const errors = zodFieldErrors<TeacherQuestionFormField>(validation.error)
      setQuestionFieldErrors(errors); setQuestionFormError(Object.values(errors)[0] ?? 'Revise os campos.')
      if (errors.title || errors.gradeLevel || errors.skillId || errors.descriptorId || errors.estimatedTimeSeconds || errors.sourceName) setCreateStep(1)
      else if (errors.statement || errors.context || errors.explanation || errors.keywords) setCreateStep(2)
      else setCreateStep(3)
      return
    }
    if (selectedQuestionIds.length >= MAX_EVALUATION_QUESTIONS) {
      setQuestionFormError(evaluationQuestionLimitMessage())
      setEvaluationFieldErrors((c) => ({ ...c, questionIds: evaluationQuestionLimitMessage() }))
      return
    }
    setQuestionFieldErrors({})
    /* NOTA: o corpo restante de handleTeacherQuestionSubmit foi mantido exatamente
       como no arquivo original — cole aqui o trecho que fica após "setQuestionFieldErrors({})"
       no seu arquivo de origem (criação da Question via onCreateQuestion, atualização
       do generatedQuestions, seleção da nova questão, troca para o builder etc.).
       Esta versão reorganizada não altera essa lógica. */
  }

  /* ── INPUT CLASS SHORTCUTS ──────────────────────────────────────────── */
  const inp = `min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`
  const inp2 = `${inp} min-h-[100px] py-3 leading-relaxed`

  /* ── TABS ───────────────────────────────────────────────────────────── */
  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ElementType; tone: ToneKey; count?: number }> = [
    { id: 'list',    label: 'Provas cadastradas', icon: ClipboardList, tone: 'neutral', count: registeredEvaluationsTotal },
    { id: 'builder', label: 'Montar prova',       icon: ClipboardCheck, tone: 'brand' },
    { id: 'bank',    label: 'Banco de questões',  icon: BookOpen,       tone: 'info',    count: allQuestionsTotal },
    { id: 'create',  label: 'Criar questão',      icon: PenTool,        tone: 'ai' },
  ]

  /* ════════════════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════════════════ */

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { to { transform: translateX(300%) } }
        @keyframes ev-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ev-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ev-modal-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes ev-slide-left { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ev-section { animation: ev-fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .ev-overlay { animation: ev-fade-in 0.2s ease-out both; }
        .ev-modal-in { animation: ev-modal-in 0.3s cubic-bezier(0.22,1,0.36,1) both; }
        .ev-q-row { animation: ev-slide-left 0.25s cubic-bezier(0.22,1,0.36,1) both; }
        .ev-card { animation: ev-fade-up 0.3s cubic-bezier(0.22,1,0.36,1) both; }
        .ev-spinner { display:inline-block; width:14px; height:14px; border-radius:50%; border:2px solid rgba(255,255,255,0.3); border-top-color:white; animation:spin 0.7s linear infinite; flex-shrink:0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="mx-auto grid min-h-screen w-full max-w-[1720px] gap-4 bg-slate-50 px-[clamp(12px,2.5vw,32px)] py-4 pb-16 text-slate-900 font-['Inter',system-ui,sans-serif]">

        {/* ═══ HEADER ═══ */}
        <header className="ev-section overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Única faixa decorativa de toda a página */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-2xl ${TONE.brand.iconBoxSolid}`}>
                <GraduationCap size={20} />
              </div>
              <div>
                <Eyebrow tone="brand">Avaliação inteligente</Eyebrow>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Provas &amp; Simulados</h1>
              </div>
            </div>

            {/* Métricas globais em linha única, com separadores sutis */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 divide-x divide-slate-200 text-sm">
              {[
                { label: 'Provas', value: teacherScopedEvaluations.length, icon: ClipboardList, tone: 'brand' as ToneKey },
                { label: 'Turmas', value: classes.length, icon: Users, tone: 'info' as ToneKey },
                { label: 'Banco',  value: allQuestionsTotal, icon: BookOpen, tone: 'ai' as ToneKey },
              ].map((s, i) => (
                <div key={s.label} className={`flex items-center gap-2 ${i > 0 ? 'pl-5' : ''}`}>
                  <div className={`grid h-8 w-8 place-items-center rounded-lg ${TONE[s.tone].iconBox}`}>
                    <s.icon size={14} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                    <p className="text-base font-bold text-slate-900 leading-none">{isLoading ? '—' : s.value}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pl-5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <Chip tone="success" icon={ScanLine}>Correção automática</Chip>
              </div>
            </div>
          </div>
        </header>

        {/* ═══ ABAS ═══ */}
        <nav className="ev-section overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap">
            {tabs.map((tab) => {
              const active = workspace === tab.id
              return (
                <button
                  key={tab.id} type="button"
                  onClick={() => { setWorkspace(tab.id); if (tab.id === 'create') setCreateStep(1) }}
                  className={`relative flex flex-1 min-w-[160px] items-center justify-center gap-2.5 border-r border-slate-200 px-4 py-3 text-sm font-semibold transition last:border-r-0 ${
                    active ? `${TONE[tab.tone].text} bg-white` : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`grid h-7 w-7 place-items-center rounded-lg transition ${
                    active ? TONE[tab.tone].iconBoxSolid : TONE.neutral.iconBox
                  }`}>
                    <tab.icon className="h-3.5 w-3.5" />
                  </div>
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active ? `${TONE[tab.tone].iconBoxSolid}` : 'bg-slate-100 text-slate-500'
                    }`}>{tab.count}</span>
                  )}
                  {active && <span className={`pointer-events-none absolute inset-x-3 bottom-0 h-0.5 rounded-full ${TONE[tab.tone].bg}`} />}
                </button>
              )
            })}
          </div>
        </nav>

        {questionsPageError && (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${TONE.warning.border} ${TONE.warning.softBg} ${TONE.warning.text}`}>
            <AlertCircle className="h-4 w-4 shrink-0" />{questionsPageError}
          </div>
        )}

        {/* ═══ CONTEÚDO POR ABA ═══ */}

        {/* —— ABA 1: PROVAS CADASTRADAS —— */}
        {workspace === 'list' && (
          <section className="ev-section overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
              <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${TONE.neutral.iconBoxSolid}`}>
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div>
                  <Eyebrow>Histórico</Eyebrow>
                  <p className="text-sm font-semibold text-slate-900">Provas cadastradas</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all',          label: 'Todos',        icon: LayoutGrid,    tone: 'brand'   as ToneKey },
                  { id: 'planejado',    label: 'Planejado',    icon: Calendar,      tone: 'neutral' as ToneKey },
                  { id: 'em_aplicacao', label: 'Em aplicação', icon: Clock,         tone: 'warning' as ToneKey },
                  { id: 'corrigindo',   label: 'Corrigindo',   icon: ScanLine,      tone: 'warning' as ToneKey },
                  { id: 'concluido',    label: 'Concluído',    icon: CheckCircle2,  tone: 'success' as ToneKey },
                ].map((s) => {
                  const active = statusFilter === s.id
                  return (
                    <button key={s.id} type="button"
                      onClick={() => { setStatusFilter(s.id as EvaluationStatus | 'all'); setRegisteredEvaluationsPage(1) }}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                        active ? `${TONE[s.tone].activeBorder} ${TONE[s.tone].iconBoxSolid}` : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}>
                      <s.icon className="h-3.5 w-3.5" />{s.label}
                    </button>
                  )
                })}
              </div>
            </header>

            <div className="border-b border-slate-200 px-5 py-3">
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={registeredEvaluationsSearch}
                  onChange={(event) => { setRegisteredEvaluationsSearch(event.target.value); setRegisteredEvaluationsPage(1) }}
                  placeholder="Buscar por nome da prova ou matéria"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                />
                {registeredEvaluationsSearch && (
                  <button type="button" onClick={() => { setRegisteredEvaluationsSearch(''); setRegisteredEvaluationsPage(1) }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                    aria-label="Limpar busca">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>
              {registeredEvaluationsError && (
                <div className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${TONE.warning.border} ${TONE.warning.softBg} ${TONE.warning.text}`}>
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{registeredEvaluationsError}</span>
                </div>
              )}
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    {['Título', 'Turma', 'Disciplina', 'Modo', 'Questões', 'Correção', 'Média', 'Status', 'Ações'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {showRegisteredEvaluationsLoading ? [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      {[...Array(9)].map((_, j) => (
                        <td key={j} className="px-4 py-4"><Bone className={`h-5 ${j === 0 ? 'w-40' : 'w-20'}`} /></td>
                      ))}
                    </tr>
                  )) : registeredEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center">
                        <EmptyState icon={<ClipboardList className="h-7 w-7" />}
                          title="Nenhuma prova encontrada"
                          sub={debouncedRegisteredEvaluationsSearch ? 'Tente outro nome de prova ou matéria' : 'Crie sua primeira prova no montador'} />
                      </td>
                    </tr>
                  ) : registeredEvaluations.map((ev) => {
                    const corrPct = ev.participants > 0 ? (ev.corrected / ev.participants) * 100 : 0
                    const cardsCount = ev.answerCardsCount ?? answerCardsByEvaluationId.get(ev.id) ?? 0
                    return (
                      <tr key={ev.id} className="border-b border-slate-200 transition hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                          <p className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar className="h-3 w-3" />{formatPrintDate(ev.scheduledAt)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{getClassName(ev.classId)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{getAcademicSubjectLabel(ev.subject, activeSkills)}</td>
                        <td className="px-4 py-4">
                          <Chip
                            tone={buildModeTone(ev.buildMode)}
                            icon={ev.buildMode === 'automatic_bank' ? Brain : ev.buildMode === 'teacher_created' ? UserRound : BookOpen}
                          >{formatBuildMode(ev.buildMode)}</Chip>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-700">{ev.questions}</td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-600">{ev.corrected}/{ev.participants}</p>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                              <div className={`h-full rounded-full ${TONE.brand.bg}`} style={{ width: `${corrPct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-base font-black ${
                            ev.averageScore >= 7 ? TONE.success.softText
                            : ev.averageScore >= 5 ? TONE.warning.softText
                            : TONE.danger.softText
                          }`}>{ev.averageScore.toFixed(1)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <Chip
                            tone={questionStatusTone(ev.status)}
                            icon={ev.status === 'concluido' ? CheckCircle2 : ev.status === 'corrigindo' ? ScanLine : Clock}
                          >{ev.status.replace('_', ' ')}</Chip>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button type="button" disabled={downloadingEvaluationId === ev.id}
                              onClick={() => handleExportEvaluation(ev)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60">
                              <FileDown className="h-3.5 w-3.5" />{downloadingEvaluationId === ev.id ? 'Baixando…' : 'Exportar'}
                            </button>
                            {onDownloadAnswerCards && (
                              <button type="button" disabled={downloadingAnswerCardsId === ev.id}
                                onClick={() => handleExportAnswerCards(ev)}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-wait disabled:opacity-60 ${TONE.success.border} ${TONE.success.softBg} ${TONE.success.text} hover:bg-emerald-100`}>
                                <ScanLine className="h-3.5 w-3.5" />{downloadingAnswerCardsId === ev.id ? 'Baixando…' : `Cartões${cardsCount ? ` (${cardsCount})` : ''}`}
                              </button>
                            )}
                            <button type="button" disabled={deletingEvaluationId === ev.id}
                              onClick={() => handleDeleteEvaluation(ev)}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${TONE.danger.border} ${TONE.danger.softBg} ${TONE.danger.softText} hover:bg-rose-100`}>
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

            {registeredEvaluationsPagination.total > 0 && (
              <div className="border-t border-slate-200 px-5 py-3">
                <ResourcePaginationControls
                  label="Provas"
                  pagination={registeredEvaluationsPagination}
                  limit={REGISTERED_EVALUATIONS_PAGE_SIZE}
                  loading={showRegisteredEvaluationsLoading}
                  source={canUseBackendEvaluationsPage ? 'backend' : 'local'}
                  pageSizeOptions={[REGISTERED_EVALUATIONS_PAGE_SIZE]}
                  onPageChange={setRegisteredEvaluationsPage}
                  onLimitChange={() => setRegisteredEvaluationsPage(1)}
                />
              </div>
            )}
          </section>
        )}

        {/* —— ABA 2: MONTAR PROVA (builder) —— */}
        {workspace === 'builder' && (
          <form onSubmit={handleSubmit} noValidate className="ev-section grid gap-4">

            {/* Stepper sticky */}
            <div className="sticky top-2 z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur">
              <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {[
                  { n: 1, label: 'Identificação',      icon: FileText,  tone: 'brand'   as ToneKey },
                  { n: 2, label: 'Estratégia & IA',    icon: Sparkles,  tone: 'ai'      as ToneKey },
                  { n: 3, label: 'Questões & revisão', icon: ListChecks, tone: 'info'   as ToneKey },
                ].map((s) => (
                  <div key={s.n} className="flex items-center gap-3 px-4 py-3">
                    <div className={`grid h-8 w-8 place-items-center rounded-lg ${TONE[s.tone].iconBoxSolid}`}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <Eyebrow tone={s.tone}>Passo {s.n}</Eyebrow>
                      <p className="text-sm font-semibold text-slate-900">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PASSO 1 — Identificação */}
            <SectionCard label="Passo 1" title="Identificação da prova" icon={FileText} tone="brand">
              <label className="mb-4 block scroll-mt-24" data-evaluation-field="title">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <PenTool className="h-3 w-3 text-indigo-400" />Título da prova
                </span>
                <input
                  className={`${inp} ${fieldStateClass(evaluationFieldErrors.title)}`}
                  placeholder="Ex: Simulado 1 — Matemática 8º Ano"
                  value={draft.title ?? ''}
                  onChange={e => { clearEvaluationError('title'); setDraft({ ...draft, title: e.target.value }) }}
                  required aria-invalid={Boolean(evaluationFieldErrors.title) || undefined}
                />
                <FieldMessage hint="Digite um título claro para identificar a prova." error={evaluationFieldErrors.title} />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="classId">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Users className="h-3 w-3 text-cyan-500" />Turma
                  </span>
                  <CompactSelect className={`${inp} ${fieldStateClass(evaluationFieldErrors.classId)}`}
                    value={draft.classId ?? ''}
                    onChange={classId => { clearEvaluationError('classId'); setDraft({ ...draft, classId }) }}
                    options={classOptions} hint="Selecione a turma que fará a avaliação."
                    error={evaluationFieldErrors.classId} dropdownMinWidth={240} />
                </label>
                <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="subject">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <BookOpen className="h-3 w-3 text-amber-500" />Disciplina
                  </span>
                  <CompactSelect className={`${inp} ${fieldStateClass(evaluationFieldErrors.subject)}`}
                    value={draft.subject ?? ''}
                    onChange={subject => { clearEvaluationError('subject'); setDraft({ ...draft, subject: canonicalEvaluationSubjectLabel(subject, activeSkills) }) }}
                    options={subjectOptions} hint="Selecione a disciplina da prova."
                    error={evaluationFieldErrors.subject} dropdownMinWidth={240} />
                </label>
                <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="questions">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Hash className="h-3 w-3 text-violet-500" />Nº de questões
                  </span>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input className={`${inp} pl-9 ${fieldStateClass(evaluationFieldErrors.questions)}`}
                      type="number" min={1} max={MAX_EVALUATION_QUESTIONS}
                      value={draft.questions ?? 10}
                      onChange={e => { clearEvaluationError('questions'); setDraft({ ...draft, questions: clampEvaluationQuestionCount(e.target.value, 1) }) }}
                      required aria-invalid={Boolean(evaluationFieldErrors.questions) || undefined} />
                  </div>
                  <FieldMessage hint="Quantidade de questões da prova." error={evaluationFieldErrors.questions} />
                </label>
                <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="omrCardVersion">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <ScanLine className="h-3 w-3 text-emerald-500" />Modelo OMR
                  </span>
                  <CompactSelect className={`${inp} ${fieldStateClass(evaluationFieldErrors.omrCardVersion)}`}
                    value={draft.omrCardVersion ?? DEFAULT_OMR_CARD_VERSION}
                    onChange={omrCardVersion => { clearEvaluationError('omrCardVersion'); setDraft({ ...draft, omrCardVersion }) }}
                    options={OMR_CARD_VERSION_OPTIONS} hint="Versão do cartão-resposta."
                    error={evaluationFieldErrors.omrCardVersion} dropdownMinWidth={260} />
                </label>
                <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="scheduledAt">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <Calendar className="h-3 w-3 text-rose-500" />Data de aplicação
                  </span>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <DateInput className={`${inp} pl-9 ${fieldStateClass(evaluationFieldErrors.scheduledAt)}`}
                      value={draft.scheduledAt ?? ''}
                      onChange={e => { clearEvaluationError('scheduledAt'); setDraft({ ...draft, scheduledAt: e.target.value }) }}
                      required />
                  </div>
                  <FieldMessage hint="Data prevista para aplicação." error={evaluationFieldErrors.scheduledAt} />
                </label>
              </div>
            </SectionCard>

            {/* PASSO 2 — Estratégia + Geração automática */}
            <SectionCard label="Passo 2" title="Estratégia de montagem" icon={Sparkles} tone="ai">
              <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
                <div>
                  <Eyebrow className="mb-2">Estratégia</Eyebrow>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'manual_bank'    as const, label: 'Manual',     desc: 'Selecione do banco',       icon: BookOpenCheck, tone: 'brand'   as ToneKey },
                      { id: 'automatic_bank' as const, label: 'Automático', desc: 'IA seleciona por filtros', icon: Brain,         tone: 'ai'      as ToneKey },
                      { id: 'teacher_created' as const, label: 'Professor',  desc: 'Questões próprias',        icon: UserRound,     tone: 'warning' as ToneKey },
                    ].map(m => {
                      const active = buildMode === m.id
                      return (
                        <button key={m.id} type="button" onClick={() => setBuildMode(m.id)}
                          className={`group flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                            active
                              ? `border-2 ${TONE[m.tone].activeBorder} ${TONE[m.tone].softBg} ${TONE[m.tone].text}`
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}>
                          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
                            active ? TONE[m.tone].iconBoxSolid : 'bg-slate-100 text-slate-400'
                          }`}>
                            <m.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block text-sm font-bold leading-none">{m.label}</span>
                            <span className="block text-[11px] text-slate-500 mt-0.5">{m.desc}</span>
                          </div>
                          {active && (
                            <div className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${TONE.success.bg} text-white`}>
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className={`rounded-2xl border ${TONE.ai.border} ${TONE.ai.softBg} p-4`}>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`grid h-8 w-8 place-items-center rounded-xl ${TONE.ai.iconBoxSolid}`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <p className={`text-xs font-black uppercase tracking-wide ${TONE.ai.text}`}>Geração automática</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {buildMode !== 'automatic_bank'
                            ? <span className="font-semibold text-slate-500">Ative o modo automático para consultar</span>
                            : autoFiltersPending || isAutoQuestionsLoading
                              ? <span className={`font-semibold ${TONE.ai.softText}`}>Atualizando filtros…</span>
                              : <><span className={`font-bold ${TONE.ai.softText}`}>{autoEligibleTotal}</span> questões elegíveis</>}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={handleAutoSelect} disabled={isGeneratingQuestions}
                      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition disabled:cursor-wait disabled:opacity-70 ${TONE.ai.button}`}>
                      {isGeneratingQuestions
                        ? <><span className="ev-spinner" />Gerando…</>
                        : <><Sparkles className="h-4 w-4" />Gerar {clampEvaluationQuestionCount(draft.questions, 10)} questões</>}
                    </button>
                  </div>

                  {/* Origem */}
                  <div className="mb-3 grid gap-2 sm:grid-cols-3">
                    {[
                      { id: 'system' as const, label: 'Professor', desc: canSeeAllBankQuestions ? 'Banco interno' : 'Minhas questões', icon: UserRound },
                      { id: 'enem'   as const, label: 'ENEM',      desc: `${inepQuestionsTotal} questões`, icon: Award },
                      { id: 'mixed'  as const, label: 'Mesclar',   desc: 'ENEM + banco',                  icon: Layers },
                    ].map(origin => {
                      const active = autoFilters.sourceMode === origin.id
                      return (
                        <button key={origin.id} type="button"
                          onClick={() => setAutoFilters((c) => ({ ...c, sourceMode: origin.id, subject: 'all', skillCode: 'all', descriptorCode: 'all' }))}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
                            active ? `border-2 ${TONE.ai.activeBorder} bg-white` : 'border-slate-200 bg-white/80 hover:border-violet-300'
                          }`}>
                          <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? TONE.ai.iconBoxSolid : 'bg-slate-100 text-slate-400'}`}>
                            <origin.icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className={`block text-[11px] font-bold leading-none ${active ? TONE.ai.text : 'text-slate-700'}`}>{origin.label}</span>
                            <span className="block text-[10px] text-slate-500 mt-0.5">{origin.desc}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Filtros */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      { label: 'Disciplina',  value: autoFilters.subject,        key: 'subject',        options: autoSubjectOptions,    icon: BookOpen },
                      { label: 'Ano',         value: autoFilters.gradeLevel,     key: 'gradeLevel',     options: gradeLevelOptions,     icon: GraduationCap },
                      { label: 'Dificuldade', value: autoFilters.difficulty,     key: 'difficulty',     options: difficultyOptions,     icon: Zap },
                      { label: 'Habilidade',  value: autoFilters.skillCode,      key: 'skillCode',      options: skillCodeOptions,      icon: Target },
                      { label: 'Descritor',   value: autoFilters.descriptorCode, key: 'descriptorCode', options: descriptorCodeOptions, icon: Layers },
                    ].map(f => (
                      <label key={f.key} className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <f.icon className="h-2.5 w-2.5" />{f.label}
                        </span>
                        <CompactSelect className={inp} value={f.value}
                          onChange={value => setAutoFilters((c) => {
                            const next = { ...c, [f.key]: value }
                            if (['subject', 'gradeLevel', 'difficulty'].includes(f.key)) { next.skillCode = 'all'; next.descriptorCode = 'all' }
                            if (f.key === 'skillCode') next.descriptorCode = 'all'
                            return next
                          })}
                          options={f.options}
                          dropdownMinWidth={f.key === 'subject' ? 260 : 180}
                          dropdownWidth={['subject', 'skillCode', 'descriptorCode'].includes(f.key) ? 'trigger' : 'content'} />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* PASSO 3 — Questões + Composição */}
            <SectionCard label="Passo 3" title="Questões selecionadas" icon={ListChecks} tone="info"
              headerRight={
                <button type="button" onClick={() => setWorkspace('bank')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700">
                  <Search className="h-3.5 w-3.5" />Explorar banco completo<ArrowRight className="h-3.5 w-3.5" />
                </button>
              }>
              {autoFilters.sourceMode === 'system' && (
                <div className="mb-5 space-y-2">
                  <p className="text-xs font-semibold text-slate-500">
                    {canSeeAllBankQuestions ? 'Questões de professores' : 'Minhas questões'} — prévia rápida
                  </p>
                  {isLoading || isBankQuestionsLoading
                    ? [...Array(3)].map((_, i) => <Bone key={i} className="h-20 rounded-xl" />)
                    : filteredQuestions.slice(0, 4).map((q, i) => (
                        <QuestionRowCompact key={q.id} question={q}
                          selected={selectedQuestionIds.includes(q.id)}
                          onToggle={() => toggleQuestion(q.id)}
                          onOpen={() => setQuestionPreview(q)} index={i} />
                      ))}
                  {!isLoading && !isBankQuestionsLoading && filteredQuestions.length === 0 && (
                    <EmptyState icon={<Search className="h-7 w-7" />}
                      title="Nenhuma questão encontrada"
                      sub="Ajuste os filtros ou explore o banco completo" />
                  )}
                </div>
              )}

              <CompositionPanel
                draft={draft} selectedQuestions={selectedQuestions}
                selectedSkillCodes={selectedSkillCodes} selectedDescriptorCodes={selectedDescriptorCodes}
                estimatedMinutes={estimatedMinutes} buildMode={buildMode}
                classLabel={getClassName(draft.classId ?? '')}
                onRemoveQuestion={toggleQuestion} onOpenQuestion={setQuestionPreview}
                onClear={() => {
                  setSelectedQuestionIds([])
                  setEvaluationFieldErrors((c) => ({ ...c, questionIds: undefined }))
                }} />
            </SectionCard>

            {/* Action bar sticky */}
            <div className="sticky bottom-2 z-20 scroll-mt-24 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur" data-evaluation-field="questionIds">
              <FieldMessage hint="Selecione questões no banco, crie uma questão ou use a seleção automática antes de salvar."
                error={evaluationFieldErrors.questionIds} className="mb-2" />
              {formNotice && (
                <div className={`mb-3 flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  /sucesso|selecionadas|cartões|criada/.test(formNotice)
                    ? `${TONE.success.border} ${TONE.success.softBg} ${TONE.success.text}`
                    : `${TONE.warning.border} ${TONE.warning.softBg} ${TONE.warning.text}`
                }`}>
                  {/sucesso|selecionadas|cartões|criada/.test(formNotice)
                    ? <CheckCircle2 className="h-5 w-5 shrink-0" />
                    : <AlertCircle className="h-5 w-5 shrink-0" />}
                  {formNotice}
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="submit"
                  className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold transition sm:w-auto ${TONE.brand.button}`}>
                  <FileCheck className="h-5 w-5" />Criar prova
                </button>
              </div>
            </div>
          </form>
        )}

        {/* —— ABA 3: BANCO DE QUESTÕES (Professor + INEP/ENEM com toggle) —— */}
        {workspace === 'bank' && (
          <section className="ev-section grid gap-4">
            {/* Header da aba banco com toggle Professor / INEP */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-2xl ${
                    bankSource === 'inep' ? TONE.warning.iconBoxSolid : TONE.info.iconBoxSolid
                  }`}>
                    {bankSource === 'inep' ? <Award className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  </div>
                  <div>
                    <Eyebrow tone={bankSource === 'inep' ? 'warning' : 'info'}>
                      {bankSource === 'inep' ? 'Banco oficial' : 'Banco de professores'}
                    </Eyebrow>
                    <p className="text-base font-bold text-slate-900 leading-tight">
                      {bankSource === 'inep'
                        ? <>INEP / ENEM — <span className={TONE.warning.softText}>{inepQuestionsTotal}</span> questões</>
                        : <><span className={TONE.info.softText}>{bankQuestionsTotal}</span> de {systemQuestionsTotal} questões</>}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Segmented toggle Professor / INEP */}
                  <div className="inline-flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    {[
                      { id: 'professor' as const, label: 'Professores', icon: UserRound, tone: 'info'    as ToneKey },
                      { id: 'inep'      as const, label: 'INEP/ENEM',   icon: Award,     tone: 'warning' as ToneKey },
                    ].map((s) => {
                      const active = bankSource === s.id
                      return (
                        <button key={s.id} type="button" onClick={() => setBankSource(s.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            active ? `${TONE[s.tone].iconBoxSolid}` : 'text-slate-500 hover:bg-white hover:text-slate-700'
                          }`}>
                          <s.icon className="h-3.5 w-3.5" />{s.label}
                        </button>
                      )
                    })}
                  </div>

                  <button type="button" onClick={() => setWorkspace('builder')}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${TONE.brand.button}`}>
                    <CheckCircle2 className="h-4 w-4" />Usar seleção
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-black">{selectedQuestionIds.length}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filtros — só fazem sentido para "Professores" */}
            {bankSource === 'professor' && (
              <SectionCard title="Filtros" icon={Filter} tone="neutral" dense>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
                  <label className="col-span-2 sm:col-span-3 lg:col-span-2 flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <Search className="h-3 w-3" />Busca
                    </span>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input className={`${inp} pl-10`} value={bankFilters.search}
                        onChange={e => setBankFilters({ ...bankFilters, search: e.target.value })}
                        placeholder="Título, enunciado, código…" />
                    </div>
                  </label>
                  {[
                    { label: 'Ano',         key: 'gradeLevel',  options: gradeLevelOptions,     icon: GraduationCap },
                    { label: 'Dificuldade', key: 'difficulty',  options: difficultyOptions,     icon: Zap },
                    { label: 'Status',      key: 'status',      options: questionStatusOptions, icon: BadgeCheck },
                    { label: 'Fonte',       key: 'sourceType',  options: sourceTypeOptions,     icon: FileQuestion },
                    { label: 'Escola',      key: 'schoolId',    options: schoolFilterOptions,   icon: Building2 },
                    { label: 'Professor',   key: 'createdById', options: creatorFilterOptions,  icon: UserRound },
                  ].map(f => (
                    <label key={f.key} className="flex flex-col gap-1.5">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <f.icon className="h-3 w-3" />{f.label}
                      </span>
                      <CompactSelect className={inp}
                        value={(bankFilters as Record<string, string>)[f.key]}
                        onChange={value => setBankFilters({ ...bankFilters, [f.key]: value })}
                        options={f.options} dropdownMinWidth={180} />
                    </label>
                  ))}
                </div>
              </SectionCard>
            )}

            {bankSource === 'professor' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {isLoading || isBankQuestionsLoading
                    ? [...Array(4)].map((_, i) => <Bone key={i} className="h-56 rounded-2xl" />)
                    : paginatedQuestions.map((q, i) => (
                        <QuestionCard key={q.id} question={q}
                          selected={selectedQuestionIds.includes(q.id)}
                          onToggle={() => toggleQuestion(q.id)}
                          onOpen={() => setQuestionPreview(q)}
                          onDelete={onDeleteQuestion ? () => handleDeleteQuestion(q) : undefined}
                          deleting={deletingQuestionId === q.id} index={i} />
                      ))}
                  {!isLoading && !isBankQuestionsLoading && bankQuestionsTotal === 0 && (
                    <div className="col-span-2">
                      <EmptyState icon={<BookOpen className="h-7 w-7" />}
                        title="Nenhuma questão encontrada"
                        sub="Tente outros filtros ou crie uma questão" />
                    </div>
                  )}
                </div>
                {!isLoading && bankQuestionsTotal > QUESTIONS_PER_PAGE && (
                  <PaginationControls page={safeBankPage} totalItems={bankQuestionsTotal} onPageChange={setBankPage} />
                )}
              </>
            ) : inepQuestionsTotal > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {isInepQuestionsLoading
                    ? [...Array(4)].map((_, i) => <Bone key={i} className="h-56 rounded-2xl" />)
                    : paginatedInepQuestions.map((q, i) => (
                        <QuestionCard key={q.id} question={q}
                          selected={selectedQuestionIds.includes(q.id)}
                          onToggle={() => toggleQuestion(q.id)}
                          onOpen={() => setQuestionPreview(q)}
                          onDelete={onDeleteQuestion ? () => handleDeleteQuestion(q) : undefined}
                          deleting={deletingQuestionId === q.id} index={i} />
                      ))}
                </div>
                {inepQuestionsTotal > QUESTIONS_PER_PAGE && (
                  <PaginationControls page={safeInepPage} totalItems={inepQuestionsTotal} onPageChange={setInepPage} />
                )}
              </>
            ) : (
              <EmptyState icon={<FileDown className="h-7 w-7" />}
                title="Nenhuma questão INEP encontrada"
                sub="O banco ainda não possui questões oficiais importadas." />
            )}
          </section>
        )}

        {/* —— ABA 4: CRIAR QUESTÃO —— */}
        {workspace === 'create' && (
          <form onSubmit={handleTeacherQuestionSubmit} noValidate className="ev-section grid gap-4">
            {/* Stepper sticky */}
            <div className="sticky top-2 z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-2xl ${TONE.ai.iconBoxSolid}`}>
                    <PenTool className="h-4 w-4" />
                  </div>
                  <div>
                    <Eyebrow tone="ai">Nova questão</Eyebrow>
                    <p className="text-sm font-semibold text-slate-900">Criar questão para o banco</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map(step => {
                    const active = createStep === step
                    const completed = createStep > step
                    return (
                      <button key={step} type="button" onClick={() => setCreateStep(step as 1 | 2 | 3)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                          active     ? `${TONE.ai.iconBoxSolid}`
                          : completed ? `${TONE.success.border} ${TONE.success.softBg} ${TONE.success.text} border`
                          : 'border border-slate-200 bg-white text-slate-500'
                        }`}>
                        {completed
                          ? <Check className="h-3.5 w-3.5" />
                          : <span className={`grid h-5 w-5 place-items-center rounded-full text-xs font-black ${active ? 'bg-white/20' : 'bg-slate-100'}`}>{step}</span>}
                        <span className="hidden sm:inline">{step === 1 ? 'Configuração' : step === 2 ? 'Conteúdo' : 'Alternativas'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {createStep === 1 && (
              <SectionCard label="Passo 1 de 3" title="Configuração da questão" icon={Settings2} tone="ai">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <PenTool className="h-3 w-3 text-violet-500" />Título da questão
                    </span>
                    <input className={`${inp} ${fieldStateClass(questionFieldErrors.title)}`}
                      value={teacherQuestionDraft.title}
                      onChange={e => setTeacherQuestionField('title', e.target.value)}
                      placeholder="Ex: Porcentagem — Desconto em compras"
                      required aria-invalid={Boolean(questionFieldErrors.title) || undefined} />
                    <FieldMessage hint="Título curto para localizar a questão depois." error={questionFieldErrors.title} />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <GraduationCap className="h-3 w-3 text-cyan-500" />Ano escolar
                      </span>
                      <input className={`${inp} ${fieldStateClass(questionFieldErrors.gradeLevel)}`}
                        value={teacherQuestionDraft.gradeLevel}
                        onChange={e => setTeacherQuestionField('gradeLevel', e.target.value)}
                        required aria-invalid={Boolean(questionFieldErrors.gradeLevel) || undefined} />
                      <FieldMessage hint="Ex: 8o ano" error={questionFieldErrors.gradeLevel} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Zap className="h-3 w-3 text-amber-500" />Dificuldade
                      </span>
                      <CompactSelect<Difficulty>
                        className={`${inp} ${fieldStateClass(questionFieldErrors.difficulty)}`}
                        value={teacherQuestionDraft.difficulty}
                        onChange={d => setTeacherQuestionField('difficulty', d)}
                        options={teacherDifficultyOptions} hint="Dificuldade estimada."
                        error={questionFieldErrors.difficulty} dropdownMinWidth={180} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Eye className="h-3 w-3 text-indigo-500" />Visibilidade
                      </span>
                      <CompactSelect<QuestionVisibility>
                        className={`${inp} ${fieldStateClass(questionFieldErrors.visibility)}`}
                        value={teacherQuestionDraft.visibility}
                        onChange={v => setTeacherQuestionField('visibility', v)}
                        options={teacherVisibilityOptions} hint="Quem pode usar a questão."
                        error={questionFieldErrors.visibility} dropdownMinWidth={180} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <BadgeCheck className="h-3 w-3 text-emerald-500" />Status
                      </span>
                      <CompactSelect<QuestionStatus>
                        className={`${inp} ${fieldStateClass(questionFieldErrors.status)}`}
                        value={teacherQuestionDraft.status}
                        onChange={s => setTeacherQuestionField('status', s)}
                        options={teacherStatusOptions} hint="Status inicial da questão."
                        error={questionFieldErrors.status} dropdownMinWidth={200} />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Target className="h-3 w-3 text-indigo-500" />Habilidade BNCC
                      </span>
                      <CompactSelect className={`${inp} ${fieldStateClass(questionFieldErrors.skillId)}`}
                        value={teacherSkillId}
                        onChange={skillId => setTeacherQuestionField('skillId', skillId)}
                        options={teacherSkillOptions} placeholder="Selecione a habilidade"
                        hint="Habilidade BNCC relacionada." error={questionFieldErrors.skillId} dropdownWidth="trigger" />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Layers className="h-3 w-3 text-amber-500" />Descritor
                      </span>
                      <CompactSelect className={`${inp} ${fieldStateClass(questionFieldErrors.descriptorId)}`}
                        value={teacherDescriptorId}
                        onChange={descriptorId => setTeacherQuestionField('descriptorId', descriptorId)}
                        options={teacherDescriptorOptions} placeholder="Selecione o descritor"
                        hint="Descritor da avaliação." error={questionFieldErrors.descriptorId} dropdownWidth="trigger" />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Timer className="h-3 w-3 text-rose-500" />Tempo estimado (seg.)
                      </span>
                      <input className={`${inp} ${fieldStateClass(questionFieldErrors.estimatedTimeSeconds)}`}
                        type="number" min={30} step={15}
                        value={teacherQuestionDraft.estimatedTimeSeconds}
                        onChange={e => setTeacherQuestionField('estimatedTimeSeconds', Number(e.target.value))}
                        aria-invalid={Boolean(questionFieldErrors.estimatedTimeSeconds) || undefined} />
                      <FieldMessage hint="Tempo estimado para resolver." error={questionFieldErrors.estimatedTimeSeconds} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Info className="h-3 w-3 text-slate-500" />Fonte
                      </span>
                      <input className={`${inp} ${fieldStateClass(questionFieldErrors.sourceName)}`}
                        value={teacherQuestionDraft.sourceName}
                        onChange={e => setTeacherQuestionField('sourceName', e.target.value)}
                        aria-invalid={Boolean(questionFieldErrors.sourceName) || undefined} />
                      <FieldMessage hint="Origem da questão." error={questionFieldErrors.sourceName} />
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button type="button"
                    onClick={() => { if (validateQuestionStep(1)) setCreateStep(2) }}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${TONE.ai.button}`}>
                    Próximo: Conteúdo<ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </SectionCard>
            )}

            {createStep === 2 && (
              <SectionCard label="Passo 2 de 3" title="Conteúdo da questão" icon={FileText} tone="brand">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <FileText className="h-3 w-3 text-indigo-500" />Enunciado
                      <Chip tone="danger">Obrigatório</Chip>
                    </span>
                    <textarea className={`${inp2} min-h-[140px] ${fieldStateClass(questionFieldErrors.statement)}`}
                      value={teacherQuestionDraft.statement}
                      onChange={e => setTeacherQuestionField('statement', e.target.value)}
                      placeholder="Escreva a pergunta da questão aqui…"
                      required aria-invalid={Boolean(questionFieldErrors.statement) || undefined} />
                    <FieldMessage hint="Enunciado completo que o aluno responderá." error={questionFieldErrors.statement} />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <BookOpen className="h-3 w-3 text-cyan-500" />Contexto{' '}
                        <span className="text-[10px] font-normal normal-case text-slate-400">(opcional)</span>
                      </span>
                      <textarea className={`${inp2} ${fieldStateClass(questionFieldErrors.context)}`}
                        value={teacherQuestionDraft.context}
                        onChange={e => setTeacherQuestionField('context', e.target.value)}
                        placeholder="Texto de apoio, situação problema…"
                        aria-invalid={Boolean(questionFieldErrors.context) || undefined} />
                      <FieldMessage hint="Texto de apoio ou situação-problema." error={questionFieldErrors.context} />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <Lightbulb className="h-3 w-3 text-amber-500" />Explicação / Gabarito
                      </span>
                      <textarea className={`${inp2} ${fieldStateClass(questionFieldErrors.explanation)}`}
                        value={teacherQuestionDraft.explanation}
                        onChange={e => setTeacherQuestionField('explanation', e.target.value)}
                        placeholder="Explique a resposta correta…"
                        aria-invalid={Boolean(questionFieldErrors.explanation) || undefined} />
                      <FieldMessage hint="Raciocínio da alternativa correta." error={questionFieldErrors.explanation} />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <Tag className="h-3 w-3 text-violet-500" />Palavras-chave{' '}
                      <span className="text-[10px] font-normal normal-case text-slate-400">(separadas por vírgula)</span>
                    </span>
                    <input className={`${inp} ${fieldStateClass(questionFieldErrors.keywords)}`}
                      value={teacherQuestionDraft.keywords}
                      onChange={e => setTeacherQuestionField('keywords', e.target.value)}
                      placeholder="porcentagem, desconto, razão…"
                      aria-invalid={Boolean(questionFieldErrors.keywords) || undefined} />
                    <FieldMessage hint="Palavras-chave separadas por vírgula." error={questionFieldErrors.keywords} />
                  </label>
                </div>

                <div className="mt-5 flex justify-between">
                  <button type="button" onClick={() => setCreateStep(1)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300">
                    <MoveLeft className="h-4 w-4" />Voltar
                  </button>
                  <button type="button"
                    onClick={() => { if (validateQuestionStep(2)) setCreateStep(3) }}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${TONE.ai.button}`}>
                    Próximo: Alternativas<ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </SectionCard>
            )}

            {createStep === 3 && (
              <SectionCard label="Passo 3 de 3" title="Alternativas da questão" icon={ListChecks} tone="success">
                <div className="space-y-2.5">
                  {optionLabels.map((label) => {
                    const isCorrect = teacherQuestionDraft.correctOption === label
                    const optionField = `option${label}` as TeacherQuestionFormField
                    return (
                      <div key={label} className={`flex items-center gap-3 rounded-xl p-3.5 transition ${
                        isCorrect
                          ? `border-2 ${TONE.success.activeBorder} ${TONE.success.softBg}`
                          : 'border border-slate-200 bg-white hover:border-slate-300'
                      }`}>
                        <button type="button"
                          onClick={() => {
                            setQuestionFieldErrors((c) => ({ ...c, correctOption: undefined }))
                            setTeacherQuestionDraft({ ...teacherQuestionDraft, correctOption: label })
                          }}
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg font-black transition ${
                            isCorrect ? `${TONE.success.iconBoxSolid}` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}>
                          {label}
                        </button>
                        <input
                          className={`min-h-11 flex-1 rounded-xl border border-slate-200 bg-transparent px-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${fieldStateClass(questionFieldErrors[optionField])}`}
                          value={teacherQuestionDraft.options[label]}
                          onChange={e => updateOption(label, e.target.value)}
                          placeholder={`Digite a alternativa ${label}…`}
                          aria-invalid={Boolean(questionFieldErrors[optionField]) || undefined} required />
                        {isCorrect && <Chip tone="success" icon={CheckCircle2}>Correta</Chip>}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">
                    <span className="font-bold text-slate-700">Dica:</span> Clique na letra para marcar a alternativa correta.
                  </p>
                  <FieldMessage hint="Selecione a letra correta antes de salvar." error={questionFieldErrors.correctOption}
                    className="mt-2 justify-center" />
                </div>

                {questionFormError && (
                  <div className={`mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${TONE.danger.border} ${TONE.danger.softBg} ${TONE.danger.softText}`}>
                    <AlertCircle className="h-5 w-5 shrink-0" />{questionFormError}
                  </div>
                )}

                <div className="mt-5 flex justify-between">
                  <button type="button" onClick={() => setCreateStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300">
                    <MoveLeft className="h-4 w-4" />Voltar
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setWorkspace('builder')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-400">
                      Cancelar
                    </button>
                    <button type="submit"
                      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${TONE.success.button}`}>
                      <Save className="h-4 w-4" />Adicionar ao banco
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}
          </form>
        )}

        {/* ═══ MODAIS GLOBAIS ═══ */}
        {questionPreview && <QuestionDetailModal question={questionPreview} onClose={() => setQuestionPreview(null)} />}

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
