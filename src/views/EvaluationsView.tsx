import { FormEvent, useMemo, useState, useEffect } from 'react'
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
  Star,
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
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import DateInput from '../components/ui/date-input'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { FieldMessage, fieldStateClass, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'
import { formatClassGrade } from '../class-grade-options'
import type {
  AssessmentDescriptor,
  ClassRoom,
  CreateQuestionRequest,
  CurriculumSkill,
  Difficulty,
  Evaluation,
  EvaluationBuildMode,
  GenerateQuestionSelectionRequest,
  GenerateQuestionSelectionResponse,
  Question,
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
  curriculumSkills: CurriculumSkill[]
  assessmentDescriptors: AssessmentDescriptor[]
  questionBank: Question[]
  questionImportPlans: QuestionImportPlan[]
  onCreate: (draft: Partial<Evaluation>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onCreateQuestion: (draft: CreateQuestionRequest) => Promise<Question>
  onGenerateQuestions: (draft: GenerateQuestionSelectionRequest) => Promise<GenerateQuestionSelectionResponse>
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
type AutoFilters = { gradeLevel: string; difficulty: string; skillCode: string; descriptorCode: string; sourceMode: QuestionOriginMode }
type TeacherQuestionDraft = {
  title: string; context: string; statement: string; explanation: string
  gradeLevel: string; difficulty: Difficulty; visibility: QuestionVisibility
  status: QuestionStatus; sourceName: string; keywords: string
  estimatedTimeSeconds: number; skillId: string; descriptorId: string
  options: Record<OptionLabel, string>; correctOption: OptionLabel
}

const optionLabels: OptionLabel[] = ['A', 'B', 'C', 'D', 'E']
const QUESTIONS_PER_PAGE = 10
const emptyEvaluation: Partial<Evaluation> = {
  title: '', classId: '', subject: 'Matematica',
  questions: 10, scheduledAt: new Date().toISOString().slice(0, 10),
  status: 'planejado', corrected: 0, participants: 0, averageScore: 0,
  triLevel: 'Aguardando aplicacao', buildMode: 'manual_bank', questionIds: [],
}

const requiredEvaluationText = (message: string) =>
  z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim().min(1, message))

const evaluationFormSchema = z.object({
  title: requiredEvaluationText('Informe o título da prova.').pipe(z.string().min(4, 'Título deve ter pelo menos 4 caracteres.')),
  classId: requiredEvaluationText('Selecione a turma da prova.'),
  subject: requiredEvaluationText('Selecione ou informe a disciplina.'),
  questions: z.coerce.number().int('Informe um número inteiro de questões.').min(1, 'A prova precisa ter pelo menos 1 questão.'),
  scheduledAt: requiredEvaluationText('Selecione a data de aplicação.').pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')),
  questionIds: z.array(z.string()),
})

const teacherQuestionStep1Schema = z.object({
  title: requiredEvaluationText('Informe o título da questão.').pipe(z.string().min(4, 'Título deve ter pelo menos 4 caracteres.')),
  gradeLevel: requiredEvaluationText('Informe o ano escolar.'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  visibility: z.enum(['PRIVATE', 'SCHOOL', 'NETWORK', 'GLOBAL']),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'APPROVED']),
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

function sanitizeText(v: string) { return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() }
function normalizeSearch(v: string) { return sanitizeText(v).toLowerCase() }
function normalizeAcademicText(v?: string | null) { return sanitizeText(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
function isSameAcademicText(a?: string | null, b?: string | null) { return normalizeAcademicText(a) === normalizeAcademicText(b) }
function getSubjectGroup(value?: string | null) {
  const text = normalizeAcademicText(value)
  if (!text) return null
  if (text.includes('matematica')) return 'matematica'
  if (/(linguagens|portugues|literatura|redacao|ingles|espanhol|arte|educacao fisica)/.test(text)) return 'linguagens'
  if (/(humanas|historia|geografia|filosofia|sociologia|sociais)/.test(text)) return 'humanas'
  if (/(natureza|biologia|fisica|quimica|ciencias naturais)/.test(text) || text === 'ciencias') return 'natureza'
  return null
}
function getLanguageSubject(value?: string | null) {
  const text = normalizeAcademicText(value)
  if (/(ingles|lingua inglesa)/.test(text)) return 'ingles'
  if (/(espanhol|lingua espanhola)/.test(text)) return 'espanhol'
  if (/(portugues|lingua portuguesa|literatura|redacao)/.test(text)) return 'portugues'
  return null
}
function questionAcademicText(q: Question) {
  const metadataKeywords = Array.isArray(q.metadata.keywords) ? q.metadata.keywords.join(' ') : ''
  return [q.subject, q.component, q.area, q.metadata.enemDiscipline, q.metadata.enemLanguage, metadataKeywords].map(value => String(value ?? '')).join(' ')
}
function questionMatchesSubject(q: Question, subject?: string | null) {
  const target = normalizeAcademicText(subject)
  if (!target) return true
  const source = normalizeAcademicText(questionAcademicText(q))
  if (source.includes(target) || isSameAcademicText(q.subject, subject)) return true
  const targetGroup = getSubjectGroup(subject)
  const questionGroup = getSubjectGroup(source)
  const targetLanguage = getLanguageSubject(subject)
  if (targetLanguage) {
    const questionLanguage = getLanguageSubject(source)
    if (targetLanguage === 'portugues') return questionGroup === 'linguagens' && questionLanguage !== 'ingles' && questionLanguage !== 'espanhol'
    return questionLanguage === targetLanguage
  }
  return Boolean(targetGroup && questionGroup && targetGroup === questionGroup)
}
function questionSearchText(q: Question) {
  return normalizeSearch([q.title, q.context, q.statement, q.explanation, q.subject, q.gradeLevel, q.sourceName,
    q.skills.map(s => `${s.code} ${s.description}`).join(' '),
    q.descriptors.map(d => `${d.code} ${d.description}`).join(' '),
    q.metadata.keywords?.join(' ') ?? ''].join(' '))
}
function getUniqueValues(vs: string[]) { return Array.from(new Set(vs.filter(Boolean))).sort((a, b) => a.localeCompare(b)) }
function shortId(id?: string | null) { return id ? id.slice(0, 8) : 'sem-id' }
function getSkillCodes(q: Question) { return q.skills.map(s => s.code) }
function getDescriptorCodes(q: Question) { return q.descriptors.map(d => d.code) }
function questionMatchesSkill(q: Question, skillCode: string, skills: CurriculumSkill[]) {
  if (skillCode === 'all') return true
  if (getSkillCodes(q).includes(skillCode)) return true

  const skill = skills.find((item) => item.code === skillCode)
  if (!skill || q.skills.length > 0) return false

  const questionStage = normalizeAcademicText(q.stage)
  const skillStage = normalizeAcademicText(skill.stage)
  const stageMatches = !questionStage || !skillStage || questionStage === skillStage
  if (!stageMatches) return false

  const questionText = normalizeAcademicText(questionAcademicText(q))
  const skillTerms = [
    skill.area,
    skill.component,
    skill.thematicUnit,
    skill.knowledgeObject,
    skill.description,
  ].map(normalizeAcademicText).filter(Boolean)

  return skillTerms.some((term) => questionText.includes(term) || term.includes(questionText))
}
function getSkillOptionLabel(skill: CurriculumSkill) {
  return `${skill.code} - ${skill.knowledgeObject || skill.description || skill.component}`
}
function getSkillOptionDescription(skill: CurriculumSkill) {
  return [skill.component, skill.thematicUnit, skill.description].filter(Boolean).join(' | ')
}
function clampPage(page: number, totalItems: number) {
  return Math.min(Math.max(1, page), Math.max(1, Math.ceil(totalItems / QUESTIONS_PER_PAGE)))
}
function shuffleQuestions<T>(items: T[]) {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
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
function escapeHtml(v?: string | number | null) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') }

function diffColor(d: Difficulty) {
  return {
    EASY: 'border-emerald-400 bg-emerald-50 text-emerald-700',
    MEDIUM: 'border-amber-400 bg-amber-50 text-amber-700',
    HARD: 'border-rose-400 bg-rose-50 text-rose-700'
  }[d]
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

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-lg bg-slate-200 ${className}`} />
}

const markdownImagePattern = /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/gi
type PrintableImage = { url: string; alt: string }

function extractMarkdownImages(value?: string | null) {
  const images: PrintableImage[] = []
  const text = String(value ?? '').replace(markdownImagePattern, (_match, alt, url) => {
    images.push({ url: String(url), alt: String(alt || 'Imagem da questao') })
    return '\n'
  })
  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), images }
}
function uniquePrintableImages(images: PrintableImage[]) {
  const seen = new Set<string>()
  const unique: PrintableImage[] = []
  for (const image of images) {
    const url = String(image.url ?? '').trim()
    if (!(/^https?:\/\//i.test(url) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(url)) || seen.has(url)) continue
    seen.add(url)
    unique.push({ url, alt: sanitizeText(image.alt || 'Imagem da questao') })
  }
  return unique
}
function getAttachmentImages(q: Question, positions: string[]) {
  return (q.attachments ?? []).filter(a => a.fileType === 'IMAGE' && positions.includes(a.position)).map(a => ({ url: a.fileUrl, alt: a.altText || 'Imagem da questao' }))
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
        <figure key={image.url} className="overflow-hidden rounded-xl border border-slate-300 bg-white p-2">
          <img
            src={image.url}
            alt={image.alt}
            referrerPolicy="no-referrer"
            loading="eager"
            className="max-h-[420px] w-full object-contain"
          />
        </figure>
      ))}
    </div>
  )
}
function QuestionTextMediaBlock({
  value,
  images = [],
  textClassName = 'whitespace-pre-wrap text-sm leading-6 text-slate-700',
}: {
  value?: string | null
  images?: PrintableImage[]
  textClassName?: string
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
function renderPrintableText(value?: string | null, className = 'ctx') {
  const text = sanitizeText(value ?? '')
  if (!text) return ''
  return text.split(/\n{2,}/).map(block => `<p class="${className}">${escapeHtml(block).replace(/\r?\n/g, '<br/>')}</p>`).join('')
}
function renderPrintableImages(images: PrintableImage[], className = 'media') {
  return uniquePrintableImages(images).map(image => `<figure class="${className}"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" referrerpolicy="no-referrer" loading="eager"/></figure>`).join('')
}
function renderPrintableQuestion(q: Question, i: number) {
  const statement = extractMarkdownImages(q.statement)
  const context = extractMarkdownImages(q.context)
  const statementImages = [...statement.images, ...getAttachmentImages(q, ['STATEMENT'])]
  const contextImages = [...context.images, ...getAttachmentImages(q, ['CONTEXT'])]
  const optionImages = getAttachmentImages(q, ['OPTION'])
  const opts = [...q.options].sort((a, b) => a.order - b.order).map(o => {
    const option = extractMarkdownImages(o.text)
    return `<li><span class="ol">${escapeHtml(o.label)})</span><span>${escapeHtml(option.text)}${renderPrintableImages(option.images, 'media option-media')}</span></li>`
  }).join('')
  return `<article class="q"><h2>${i + 1}. ${escapeHtml(statement.text)}</h2>${renderPrintableImages(statementImages)}${renderPrintableText(context.text)}${renderPrintableImages(contextImages)}<ol class="opts">${opts}</ol>${renderPrintableImages(optionImages, 'media option-media')}</article>`
}
function exportEvaluationToA4(ev: Evaluation, qs: Question[], cls: string) {
  const w = window.open('', '_blank', 'width=900,height=1200')
  if (!w) return
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>${escapeHtml(ev.title)}</title><style>
    @page{size:A4;margin:14mm 13mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111827;font-family:Arial,sans-serif;font-size:11pt;line-height:1.35}
    header{border-bottom:1.5pt solid #111827;padding-bottom:8mm;margin-bottom:8mm}h1{margin:0 0 4mm;font-size:18pt;text-align:center;text-transform:uppercase}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;font-size:10pt}.line{border-bottom:1pt solid #111827;min-height:7mm;padding-top:1.5mm}
    .q{break-inside:avoid;margin:0 0 7mm}.q h2{margin:0 0 3mm;font-size:11.5pt;font-weight:700}.ctx{margin:0 0 3mm;color:#334155}
    .media{break-inside:avoid;margin:3mm 0 4mm}.media img{display:block;max-width:100%;max-height:112mm;object-fit:contain;margin:0 auto}
    .option-media img{max-height:52mm}
    .opts{display:grid;gap:2mm;margin:0;padding:0;list-style:none}.opts li{display:grid;grid-template-columns:8mm 1fr;gap:2mm}.ol{font-weight:700}
    .ag{break-inside:avoid;margin-top:9mm;border:1pt solid #111827;padding:4mm}.ag h2{margin:0 0 3mm;font-size:11pt}
    .ai{display:grid;grid-template-columns:repeat(5,1fr);gap:2mm 4mm;font-size:9.5pt}
    @media print{body,html{background:#fff}}
  </style></head><body>
  <header><h1>${escapeHtml(ev.title)}</h1><div class="meta">
    <div><strong>Aluno:</strong><div class="line"></div></div>
    <div><strong>Data:</strong><div class="line">${escapeHtml(formatPrintDate(ev.scheduledAt))}</div></div>
    <div><strong>Turma:</strong><div class="line">${escapeHtml(cls)}</div></div>
    <div><strong>Disciplina:</strong><div class="line">${escapeHtml(ev.subject)}</div></div>
  </div></header>
  ${qs.map(renderPrintableQuestion).join('')}
  <section class="ag"><h2>Cartão de respostas</h2><div class="ai">
    ${qs.map((_, i) => `<div>${i + 1}. A() B() C() D() E()</div>`).join('')}
  </div></section>
  <script>
    function printWhenImagesAreReady(){var printed=false;var printOnce=function(){if(printed)return;printed=true;window.focus();window.print();};var imgs=Array.prototype.slice.call(document.images||[]);if(!imgs.length){printOnce();return;}var pending=imgs.length;var done=function(){pending-=1;if(pending<=0)printOnce();};window.setTimeout(printOnce,5000);imgs.forEach(function(img){if(img.complete){done();return;}img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});});}
    window.addEventListener('load',printWhenImagesAreReady);
  </script></body></html>`
  w.document.open(); w.document.write(html); w.document.close()
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative">
        <div className="relative grid h-16 w-16 place-items-center rounded-2xl border-2 border-dashed border-slate-400 bg-gradient-to-br from-slate-50 to-white text-slate-400 shadow-inner">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-base font-black text-slate-600">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{sub}</p>
      </div>
    </div>
  )
}

function QuestionRowCompact({ question, selected, onToggle, onOpen, index }: { question: Question; selected: boolean; onToggle: () => void; onOpen: () => void; index: number }) {
  return (
    <div
      className={`group flex cursor-pointer items-start gap-4 rounded-xl border-2 bg-white p-4 transition-colors hover:border-indigo-400 ${selected ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-white ring-2 ring-indigo-200' : 'border-slate-300'}`}
      onClick={onToggle}
    >
      <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors ${selected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-400 group-hover:border-indigo-400'}`}>
        {selected && <Check className="h-3.5 w-3.5 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${diffColor(question.difficulty)}`}>
            <Zap className="h-3 w-3" />
            {formatDifficulty(question.difficulty)}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${statusColor(question.status)}`}>
            <CircleDot className="h-3 w-3" />
            {formatQStatus(question.status)}
          </span>
        </div>
        <p className="text-sm font-bold text-slate-900 leading-snug group-hover:text-indigo-700">{question.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{getQuestionPreviewText(question.statement)}</p>
        <div className="mt-3">
          <SkillSummaryList question={question} compact />
        </div>
      </div>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onOpen() }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border-2 border-slate-300 bg-white text-slate-500 opacity-0 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 group-hover:opacity-100"
        aria-label="Ver questão"
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  )
}

function QuestionCard({
  question,
  selected,
  onToggle,
  onOpen,
  onDelete,
  deleting = false,
}: {
  question: Question
  selected: boolean
  onToggle: () => void
  onOpen: () => void
  onDelete?: () => void
  deleting?: boolean
  index: number
}) {
  const correctOpt = question.options.find(o => o.isCorrect)
  const canDelete = question.sourceType === 'TEACHER_CREATED' && question.isEditable && Boolean(onDelete)
  return (
    <article
      className={`group rounded-xl bg-white p-5 transition-shadow hover:shadow-lg ${selected ? 'border-2 border-indigo-500 shadow-lg ring-2 ring-indigo-200' : 'border-2 border-slate-300 hover:border-indigo-300'}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${diffColor(question.difficulty)}`}>
            <Zap className="h-3 w-3" />
            {formatDifficulty(question.difficulty)}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusColor(question.status)}`}>
            <BadgeCheck className="h-3 w-3" />
            {formatQStatus(question.status)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-400 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200">
            <FileQuestion className="h-3 w-3" />
            {formatSourceType(question.sourceType)}
          </span>
        </div>
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:shrink-0">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border-2 border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 sm:flex-none"
          >
            <Eye className="h-3.5 w-3.5" />Ver
          </button>
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border-2 px-3 py-1.5 text-[11px] font-bold transition-colors sm:flex-none ${selected ? 'border-rose-400 bg-rose-50 text-rose-600 hover:bg-rose-100' : 'border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
          >
            {selected ? <><X className="h-3.5 w-3.5" />Remover</> : <><Plus className="h-3.5 w-3.5" />Selecionar</>}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border-2 border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Excluindo' : 'Excluir'}
            </button>
          )}
        </div>
      </div>
      <h3 className="mb-2 text-sm font-black text-slate-950 leading-snug group-hover:text-indigo-800">{question.title}</h3>
      <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-slate-500">{getQuestionPreviewText(question.statement)}</p>
      <div className="mb-4">
        <SkillSummaryList question={question} />
      </div>
      <div className="space-y-1.5">
        {question.options.slice(0, 5).map((o, idx) => (
          <div
            key={o.id}
            className={`flex items-start gap-2.5 rounded-lg border-2 px-3 py-2 text-xs ${
              o.isCorrect
                ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-800 shadow-sm'
                : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-slate-400'
            }`}
          >
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-black ${o.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{o.label}</span>
            <span className="line-clamp-1 flex-1">{getQuestionPreviewText(o.text)}</span>
            {o.isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t-2 border-slate-300 pt-4 text-[10px] font-bold text-slate-400">
        <span className="inline-flex items-center gap-1">
          <GraduationCap className="h-3 w-3" />
          {question.gradeLevel} · {question.subject}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
          <Check className="h-3 w-3" />
          Resposta: {correctOpt?.label ?? '—'}
        </span>
      </div>
    </article>
  )
}

function QuestionDetailModal({ question, onClose }: { question: Question; onClose: () => void }) {
  const options = [...question.options].sort((a, b) => a.order - b.order)
  const correctOpt = options.find((option) => option.isCorrect)
  const contextImages = getAttachmentImages(question, ['CONTEXT'])
  const statementImages = getAttachmentImages(question, ['STATEMENT'])
  const optionImages = getAttachmentImages(question, ['OPTION'])

  return (
    <div role="presentation" onMouseDown={onClose} className="fixed inset-0 z-[1100] grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="my-auto max-h-[calc(100svh-4rem)] w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Visualizar questao</p>
            <h2 id="question-detail-title" className="mt-1 font-['Sora',system-ui,sans-serif] text-lg font-black leading-tight text-slate-950">{question.title}</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${diffColor(question.difficulty)}`}>
                <Zap className="h-3 w-3" />
                {formatDifficulty(question.difficulty)}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusColor(question.status)}`}>
                <BadgeCheck className="h-3 w-3" />
                {formatQStatus(question.status)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                <FileQuestion className="h-3 w-3" />
                {formatSourceType(question.sourceType)}
              </span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-slate-300 bg-white text-slate-500 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Fechar modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100svh-13rem)] overflow-y-auto p-6">
          {question.context && (
            <div className="mb-4 rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Texto de apoio</p>
              <QuestionTextMediaBlock value={question.context} images={contextImages} />
            </div>
          )}

          <div className="rounded-xl border-2 border-slate-300 bg-white px-4 py-3">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Enunciado</p>
            <QuestionTextMediaBlock
              value={question.statement}
              images={statementImages}
              textClassName="whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-900"
            />
          </div>

          <div className="mt-4 grid gap-2">
            {options.map((option) => (
              <div
                key={option.id}
                className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-sm ${
                  option.isCorrect
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-black ${option.isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{option.label}</span>
                <span className="min-w-0 flex-1">
                  <QuestionTextMediaBlock
                    value={option.text}
                    textClassName="whitespace-pre-wrap leading-6"
                  />
                </span>
                {option.isCorrect && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-white/70 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Correta
                  </span>
                )}
              </div>
            ))}
          </div>

          {optionImages.length > 0 && (
            <div className="mt-4 rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Imagens das alternativas</p>
              <QuestionMedia images={optionImages} />
            </div>
          )}

          <div className="mt-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            Resposta correta: {correctOpt?.label ?? '-'}
          </div>

          {question.explanation && (
            <div className="mt-4 rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Explicação</p>
              <QuestionTextMediaBlock value={question.explanation} />
            </div>
          )}

          <div className="mt-4">
            <SkillSummaryList question={question} />
          </div>
        </div>
      </div>
    </div>
  )
}

function PaginationControls({
  page,
  totalItems,
  onPageChange,
  label = 'questões',
}: {
  page: number
  totalItems: number
  onPageChange: (page: number) => void
  label?: string
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / QUESTIONS_PER_PAGE))
  const start = totalItems === 0 ? 0 : (page - 1) * QUESTIONS_PER_PAGE + 1
  const end = Math.min(totalItems, page * QUESTIONS_PER_PAGE)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-100 text-indigo-600">
          <LayoutGrid className="h-5 w-5" />
        </div>
        <div>
          <span className="text-sm font-black text-slate-800">
            {start}-{end} <span className="font-medium text-slate-400">de</span> {totalItems}
          </span>
          <span className="ml-1 text-sm font-medium text-slate-400">{label}</span>
        </div>
      </div>
      <div className="flex w-full items-center gap-1.5 overflow-x-auto sm:w-auto">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className="grid h-9 w-9 place-items-center rounded-sm border-2 border-slate-300 bg-white text-slate-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="grid h-9 w-9 place-items-center rounded-sm border-2 border-slate-300 bg-white text-slate-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1 px-2">
          {getPageNumbers().map((p, i) => (
            typeof p === 'number' ? (
              <button
                key={i}
                type="button"
                onClick={() => onPageChange(p)}
                className={`grid h-9 w-9 place-items-center rounded-sm text-sm font-bold ${
                  page === p
                    ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'border-2 border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={i} className="px-1 text-slate-400">...</span>
            )
          ))}
        </div>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="grid h-9 w-9 place-items-center rounded-sm border-2 border-slate-300 bg-white text-slate-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="grid h-9 w-9 place-items-center rounded-sm border-2 border-slate-300 bg-white text-slate-500 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function SkillSummaryList({ question, compact = false }: { question: Question; compact?: boolean }) {
  const skills = question.skills.slice(0, compact ? 1 : 2)
  const descriptors = question.descriptors.slice(0, compact ? 1 : 2)

  return (
    <div className="grid gap-2">
      {skills.map(skill => (
        <div key={skill.id} className="group rounded-lg border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-white px-3 py-2 hover:border-indigo-400">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600">
            <Target className="h-3 w-3" />
            {skill.code}
          </div>
          {!compact && <div className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-indigo-900/70">{skill.description || skill.knowledgeObject}</div>}
        </div>
      ))}
      {descriptors.map(descriptor => (
        <div key={descriptor.id} className="group rounded-lg border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-white px-3 py-2 hover:border-amber-400">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600">
            <Layers className="h-3 w-3" />
            {descriptor.code}
          </div>
          {!compact && <div className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-amber-900/70">{descriptor.description}</div>}
        </div>
      ))}
    </div>
  )
}

function EvaluationPdfPreview({
  draft,
  selectedQuestions,
  classLabel,
}: {
  draft: Partial<Evaluation>
  selectedQuestions: Question[]
  classLabel: string
}) {
  const previewQuestions = selectedQuestions.slice(0, 3)

  return (
    <div className="rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-100 to-slate-50 p-3 shadow-inner sm:p-4">
      <div className="mx-auto min-h-[420px] w-full max-w-[320px] rounded-lg bg-white px-5 py-6 shadow-xl ring-1 ring-slate-300 sm:px-7">
        <div className="border-b-2 border-slate-900 pb-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Prévia A4</p>
          <h3 className="mt-1 line-clamp-2 font-['Sora',system-ui,sans-serif] text-sm font-black uppercase leading-snug text-slate-950">
            {draft.title || 'Título da prova'}
          </h3>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] text-slate-600">
          <div className="border-b border-slate-400 pb-1"><strong>Aluno:</strong></div>
          <div className="border-b border-slate-400 pb-1"><strong>Data:</strong> {formatPrintDate(draft.scheduledAt)}</div>
          <div className="border-b border-slate-400 pb-1"><strong>Turma:</strong> {classLabel}</div>
          <div className="border-b border-slate-400 pb-1"><strong>Disciplina:</strong> {draft.subject || '-'}</div>
        </div>
        <div className="mt-4 space-y-3">
          {previewQuestions.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-slate-400 bg-slate-50 p-4 text-center text-[10px] font-bold text-slate-400">
              <FileQuestion className="mx-auto mb-2 h-6 w-6 text-slate-300" />
              Selecione questões para visualizar.
            </div>
          ) : previewQuestions.map((q, index) => (
            <div key={q.id} className="break-inside-avoid">
              <p className="line-clamp-3 text-[10px] font-bold leading-snug text-slate-900">{index + 1}. {getQuestionPreviewText(q.statement) || q.title}</p>
              <div className="mt-2 grid gap-1">
                {q.options.slice(0, 4).map(option => (
                  <div key={option.id} className="flex gap-1 text-[9px] leading-snug text-slate-600">
                    <strong>{option.label})</strong>
                    <span className="line-clamp-1">{getQuestionPreviewText(option.text)}</span>
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

function CompositionPanel({
  draft,
  selectedQuestions,
  selectedSkillCodes,
  selectedDescriptorCodes,
  estimatedMinutes,
  buildMode,
  classLabel,
  onRemoveQuestion,
  onOpenQuestion,
  onClear,
}: {
  draft: Partial<Evaluation>
  selectedQuestions: Question[]
  selectedSkillCodes: string[]
  selectedDescriptorCodes: string[]
  estimatedMinutes: number
  buildMode: EvaluationBuildMode
  classLabel: string
  onRemoveQuestion: (id: string) => void
  onOpenQuestion: (question: Question) => void
  onClear: () => void
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-sm">
        <div className="border-b-2 border-slate-300 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-200">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Composição da Prova</p>
                <h2 className="text-base font-black text-slate-900">
                  {selectedQuestions.length} quest{selectedQuestions.length !== 1 ? 'ões' : 'ão'}
                </h2>
              </div>
            </div>
            {selectedQuestions.length > 0 && (
              <button type="button" onClick={onClear} className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm border-2 border-rose-400 bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 transition-colors hover:bg-rose-100 sm:w-auto">
                <Trash2 className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b-2 border-slate-300 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Tempo', value: estimatedMinutes ? `${estimatedMinutes}min` : '-', icon: Timer, color: 'text-cyan-600 bg-cyan-100' },
            { label: 'Habilidades', value: String(selectedSkillCodes.length), icon: Target, color: 'text-indigo-600 bg-indigo-100' },
            { label: 'Descritores', value: String(selectedDescriptorCodes.length), icon: Layers, color: 'text-amber-600 bg-amber-100' },
            { label: 'Modo', value: formatBuildMode(buildMode), icon: Settings2, color: 'text-violet-600 bg-violet-100' },
          ].map((s, i) => (
            <div key={i} className="group rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white p-3 hover:border-indigo-300">
              <div className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${s.color}`}>
                <s.icon className="h-3.5 w-3.5" />{s.label}
              </div>
              <div className="mt-1.5 text-lg font-black text-slate-800">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="max-h-[560px] space-y-2 overflow-y-auto p-3 sm:p-4">
          {selectedQuestions.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-7 w-7" />}
              title="Prova vazia"
              sub="Use a geração automática ou selecione questões"
            />
          ) : selectedQuestions.map((q, idx) => (
            <div key={q.id} className="group flex items-start gap-3 rounded-xl border-2 border-slate-300 bg-white p-3 hover:border-indigo-300">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 text-sm font-black text-indigo-600 group-hover:from-indigo-500 group-hover:to-indigo-400 group-hover:text-white">
                {idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-700">{q.title}</p>
                <div className="mt-2">
                  <SkillSummaryList question={q} compact />
                </div>
              </div>
              <button type="button" onClick={() => onOpenQuestion(q)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-slate-300 text-slate-400 opacity-0 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 group-hover:opacity-100" aria-label="Ver questão">
                <Eye className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onRemoveQuestion(q.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-slate-300 text-slate-400 opacity-0 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <EvaluationPdfPreview draft={draft} selectedQuestions={selectedQuestions} classLabel={classLabel} />
    </div>
  )
}

export default function EvaluationsView({
  currentUser,
  currentRole,
  evaluations, classes, curriculumSkills, assessmentDescriptors,
  questionBank, questionImportPlans, onCreate, onDelete, onCreateQuestion, onDeleteQuestion,
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
  const [deleteTarget, setDeleteTarget] = useState<Evaluation | null>(null)
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null)
  const [deleteQuestionTarget, setDeleteQuestionTarget] = useState<Question | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [evaluationsModalOpen, setEvaluationsModalOpen] = useState(false)
  const [questionPreview, setQuestionPreview] = useState<Question | null>(null)
  const [bankPage, setBankPage] = useState(1)
  const [inepPage, setInepPage] = useState(1)
  const [bankFilters, setBankFilters] = useState<BankFilters>({ search: '', gradeLevel: 'all', difficulty: 'all', status: 'all', skillCode: 'all', descriptorCode: 'all', sourceType: 'all', schoolId: 'all', createdById: 'all' })
  const [autoFilters, setAutoFilters] = useState<AutoFilters>({ gradeLevel: 'all', difficulty: 'all', skillCode: 'all', descriptorCode: 'all', sourceMode: 'system' })
  const [teacherQuestionDraft, setTeacherQuestionDraft] = useState<TeacherQuestionDraft>(createEmptyQuestionDraft(firstSkillId, firstDescriptorId))
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1)

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    setBankPage(1)
  }, [bankFilters])

  const currentRoleText = normalizeAcademicText(`${currentRole?.code ?? ''} ${currentRole?.name ?? ''}`)
  const canSeeAllBankQuestions = currentRoleText.includes('admin')
    || currentRoleText.includes('diretor')
    || currentRoleText.includes('coordenador')
    || currentRoleText.includes('pedagog')
  const currentQuestionCreatorIds = useMemo(
    () => [currentUser.id, currentUser.linkedTeacherId].filter((id): id is string => Boolean(id)),
    [currentUser.id, currentUser.linkedTeacherId],
  )
  const bankQuestionPool = useMemo(() => questionBank.filter(q => q.sourceType !== 'INEP_ENEM'), [questionBank])
  const visibleBankQuestionPool = useMemo(
    () => canSeeAllBankQuestions ? bankQuestionPool : bankQuestionPool.filter(q => currentQuestionCreatorIds.includes(q.createdById)),
    [bankQuestionPool, canSeeAllBankQuestions, currentQuestionCreatorIds],
  )
  const inepPlan = questionImportPlans.find(p => p.active && p.sourceType === 'INEP_ENEM') ?? null
  const inepQuestions = questionBank.filter(q => q.sourceType === 'INEP_ENEM')

  const filteredEvaluations = useMemo(() => statusFilter === 'all' ? evaluations : evaluations.filter(e => e.status === statusFilter), [evaluations, statusFilter])
  const gradeLevels = useMemo(() => getUniqueValues(questionBank.map(q => q.gradeLevel)), [questionBank])
  const sourceTypes = useMemo(() => getUniqueValues(visibleBankQuestionPool.map(q => q.sourceType)), [visibleBankQuestionPool])
  const bankSchoolIds = useMemo(() => getUniqueValues(visibleBankQuestionPool.map(q => q.schoolId)), [visibleBankQuestionPool])
  const bankCreatorIds = useMemo(() => getUniqueValues(visibleBankQuestionPool.map(q => q.createdById)), [visibleBankQuestionPool])
  const activeSkills = useMemo(() => curriculumSkills.filter(s => s.active), [curriculumSkills])
  const activeDescriptors = useMemo(() => assessmentDescriptors.filter(d => d.active), [assessmentDescriptors])

  const classOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: '', label: 'Selecionar turma...' }, ...classes.map(c => ({ value: c.id, label: c.name, description: `${formatClassGrade(c.grade)} · ${c.shift}` }))], [classes])
  const subjectOptions = useMemo<Array<CompactSelectOption<string>>>(() => getUniqueValues(['Matematica', 'Lingua Portuguesa', 'Ciencias da Natureza', 'Ciencias Humanas', 'Linguagens', ...questionBank.map(q => q.subject)]).map(subject => ({ value: subject, label: subject })), [questionBank])
  const gradeLevelOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos' }, ...gradeLevels.map(value => ({ value, label: value }))], [gradeLevels])
  const difficultyOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos' }, ...(['EASY', 'MEDIUM', 'HARD'] as const).map(value => ({ value, label: formatDifficulty(value) }))], [])
  const questionStatusOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos' }, ...(['APPROVED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED', 'ARCHIVED'] as const).map(value => ({ value, label: formatQStatus(value) }))], [])
  const sourceTypeOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos' }, ...sourceTypes.map(value => ({ value, label: formatSourceType(value as QuestionSourceType) }))], [sourceTypes])
  const schoolFilterOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todas' }, ...bankSchoolIds.map(id => ({ value: id, label: id === currentUser.schoolId ? 'Minha escola' : `Escola ${shortId(id)}`, description: id }))], [bankSchoolIds, currentUser.schoolId])
  const creatorFilterOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos' }, ...bankCreatorIds.map(id => ({ value: id, label: id === currentUser.id ? 'Minhas questões' : `Professor ${shortId(id)}`, description: id }))], [bankCreatorIds, currentUser.id])
  const skillCodeOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos' }, ...activeSkills.map(skill => ({ value: skill.code, label: getSkillOptionLabel(skill), description: getSkillOptionDescription(skill) }))], [activeSkills])
  const descriptorCodeOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: 'all', label: 'Todos' }, ...activeDescriptors.map(descriptor => ({ value: descriptor.code, label: descriptor.code, description: descriptor.description }))], [activeDescriptors])
  const teacherDifficultyOptions = useMemo<Array<CompactSelectOption<Difficulty>>>(() => (['EASY', 'MEDIUM', 'HARD'] as const).map(value => ({ value, label: formatDifficulty(value) })), [])
  const teacherVisibilityOptions = useMemo<Array<CompactSelectOption<QuestionVisibility>>>(() => [{ value: 'PRIVATE', label: 'Privada' }, { value: 'SCHOOL', label: 'Escola' }, { value: 'NETWORK', label: 'Rede' }, { value: 'GLOBAL', label: 'Global' }], [])
  const teacherStatusOptions = useMemo<Array<CompactSelectOption<QuestionStatus>>>(() => [{ value: 'DRAFT', label: 'Rascunho' }, { value: 'PENDING_REVIEW', label: 'Em revisão' }, { value: 'APPROVED', label: 'Aprovada' }], [])
  const teacherSkillOptions = useMemo<Array<CompactSelectOption<string>>>(() => activeSkills.map(skill => ({ value: skill.id, label: getSkillOptionLabel(skill), description: getSkillOptionDescription(skill) })), [activeSkills])
  const teacherDescriptorOptions = useMemo<Array<CompactSelectOption<string>>>(() => activeDescriptors.map(descriptor => ({ value: descriptor.id, label: descriptor.code, description: descriptor.description })), [activeDescriptors])

  const filteredQuestions = useMemo(() => {
    const s = normalizeSearch(bankFilters.search)
    return visibleBankQuestionPool.filter(q => {
      if (bankFilters.gradeLevel !== 'all' && q.gradeLevel !== bankFilters.gradeLevel) return false
      if (bankFilters.difficulty !== 'all' && q.difficulty !== bankFilters.difficulty) return false
      if (bankFilters.status !== 'all' && q.status !== bankFilters.status) return false
      if (bankFilters.sourceType !== 'all' && q.sourceType !== bankFilters.sourceType) return false
      if (bankFilters.schoolId !== 'all' && q.schoolId !== bankFilters.schoolId) return false
      if (bankFilters.createdById !== 'all' && q.createdById !== bankFilters.createdById) return false
      if (!questionMatchesSkill(q, bankFilters.skillCode, activeSkills)) return false
      if (bankFilters.descriptorCode !== 'all' && !getDescriptorCodes(q).includes(bankFilters.descriptorCode)) return false
      if (s && !questionSearchText(q).includes(s)) return false
      return true
    })
  }, [visibleBankQuestionPool, bankFilters, activeSkills])

  const autoSourcePool = useMemo(() => (
    autoFilters.sourceMode === 'enem'
      ? inepQuestions
      : autoFilters.sourceMode === 'mixed'
        ? [...inepQuestions, ...visibleBankQuestionPool]
        : visibleBankQuestionPool
  ), [autoFilters.sourceMode, inepQuestions, visibleBankQuestionPool])

  const autoEligible = useMemo(() => {
    return autoSourcePool.filter(q => {
      if (q.status !== 'APPROVED') return false
      if (autoFilters.gradeLevel !== 'all' && q.gradeLevel !== autoFilters.gradeLevel) return false
      if (autoFilters.difficulty !== 'all' && q.difficulty !== autoFilters.difficulty) return false
      if (!questionMatchesSkill(q, autoFilters.skillCode, activeSkills)) return false
      if (autoFilters.descriptorCode !== 'all' && !getDescriptorCodes(q).includes(autoFilters.descriptorCode)) return false
      if (draft.subject && !questionMatchesSubject(q, draft.subject)) return false
      return true
    })
  }, [autoFilters, autoSourcePool, draft.subject, activeSkills])

  const selectedQuestions = useMemo(() => selectedQuestionIds.map(id => questionBank.find(q => q.id === id)).filter((q): q is Question => Boolean(q)), [questionBank, selectedQuestionIds])
  const safeBankPage = clampPage(bankPage, filteredQuestions.length)
  const paginatedQuestions = filteredQuestions.slice((safeBankPage - 1) * QUESTIONS_PER_PAGE, safeBankPage * QUESTIONS_PER_PAGE)
  const safeInepPage = clampPage(inepPage, inepQuestions.length)
  const paginatedInepQuestions = inepQuestions.slice((safeInepPage - 1) * QUESTIONS_PER_PAGE, safeInepPage * QUESTIONS_PER_PAGE)
  const selectedSkillCodes = useMemo(() => getUniqueValues(selectedQuestions.flatMap(getSkillCodes)), [selectedQuestions])
  const selectedDescriptorCodes = useMemo(() => getUniqueValues(selectedQuestions.flatMap(getDescriptorCodes)), [selectedQuestions])
  const estimatedMinutes = useMemo(() => Math.max(0, Math.ceil(selectedQuestions.reduce((t, q) => t + Number(q.metadata.estimatedTimeSeconds ?? 0), 0) / 60)), [selectedQuestions])

  const teacherSkillId = teacherQuestionDraft.skillId || firstSkillId
  const teacherDescriptorId = teacherQuestionDraft.descriptorId || firstDescriptorId

  function getClassName(id: string) { return classes.find(c => c.id === id)?.name ?? 'Turma não encontrada' }
  function getEvaluationQuestions(ev: Evaluation) { return (ev.questionIds ?? []).map(id => questionBank.find(q => q.id === id)).filter((q): q is Question => Boolean(q)) }

  function handleExportEvaluation(ev: Evaluation) {
    const qs = getEvaluationQuestions(ev)
    if (!qs.length) { setFormNotice('Esta prova não possui questões carregadas para exportação A4.'); return }
    exportEvaluationToA4(ev, qs, getClassName(ev.classId))
  }

  function handleDeleteEvaluation(ev: Evaluation) {
    setDeleteTarget(ev)
  }

  function handleDeleteQuestion(question: Question) {
    setDeleteQuestionTarget(question)
  }

  async function confirmDeleteEvaluation() {
    if (!deleteTarget) return
    setDeletingEvaluationId(deleteTarget.id)
    try {
      await onDelete(deleteTarget.id)
      setFormNotice('Prova excluida com sucesso.')
      setDeleteTarget(null)
    } finally {
      setDeletingEvaluationId(null)
    }
  }

  async function confirmDeleteQuestion() {
    if (!deleteQuestionTarget || !onDeleteQuestion) return
    setDeletingQuestionId(deleteQuestionTarget.id)
    try {
      await onDeleteQuestion(deleteQuestionTarget.id)
      setSelectedQuestionIds((current) => current.filter((questionId) => questionId !== deleteQuestionTarget.id))
      setEvaluationFieldErrors((current) => ({ ...current, questionIds: undefined }))
      setFormNotice('Questao excluida do banco.')
      setDeleteQuestionTarget(null)
    } finally {
      setDeletingQuestionId(null)
    }
  }

  function toggleQuestion(id: string) {
    setSelectedQuestionIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])
    setEvaluationFieldErrors((current) => ({ ...current, questionIds: undefined }))
    setBuildMode(cur => cur === 'automatic_bank' ? 'mixed' : cur)
    setFormNotice(null)
  }

  function clearEvaluationError(field: EvaluationFormField) {
    setEvaluationFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  function scrollToEvaluationError(errors: FieldErrors<EvaluationFormField>) {
    const fieldOrder: EvaluationFormField[] = ['title', 'classId', 'subject', 'questions', 'scheduledAt', 'questionIds']
    const firstField = fieldOrder.find((field) => Boolean(errors[field]))
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
    setQuestionFieldErrors((current) => ({ ...current, [field]: undefined }))
    setTeacherQuestionDraft((current) => ({ ...current, [field]: value }))
  }

  function teacherQuestionValues() {
    return {
      ...teacherQuestionDraft,
      optionA: teacherQuestionDraft.options.A,
      optionB: teacherQuestionDraft.options.B,
      optionC: teacherQuestionDraft.options.C,
      optionD: teacherQuestionDraft.options.D,
      optionE: teacherQuestionDraft.options.E,
    }
  }

  function validateQuestionStep(step: 1 | 2 | 3) {
    const schema = step === 1 ? teacherQuestionStep1Schema : step === 2 ? teacherQuestionStep2Schema : teacherQuestionStep3Schema
    const result = schema.safeParse(teacherQuestionValues())
    if (!result.success) {
      setQuestionFieldErrors((current) => ({ ...current, ...zodFieldErrors<TeacherQuestionFormField>(result.error) }))
      return false
    }
    setQuestionFormError(null)
    return true
  }

  function handleAutoSelect() {
    const target = Math.max(1, Number(draft.questions ?? 1))
    const shuffledEligible = shuffleQuestions(autoEligible)
    const next = autoFilters.sourceMode === 'mixed' ? buildMixedQuestionSelection(shuffledEligible, target) : shuffledEligible.slice(0, target)
    if (!next.length) {
      const approvedCount = autoSourcePool.filter(q => q.status === 'APPROVED').length
      if (!questionBank.length) setFormNotice('O banco de questões está vazio.')
      else if (!autoSourcePool.length) {
        if (autoFilters.sourceMode === 'enem') setFormNotice('Não há questões INEP/ENEM disponíveis para gerar.')
        else if (autoFilters.sourceMode === 'mixed') setFormNotice('Não há questões disponíveis para mesclar nesta seleção.')
        else setFormNotice(canSeeAllBankQuestions ? 'Não há questões disponíveis no banco interno.' : 'Você ainda não possui questões cadastradas no banco.')
      }
      else if (!approvedCount) setFormNotice('Nenhuma questão aprovada no banco.')
      else setFormNotice('Os filtros atuais não retornam questões compatíveis.')
      return
    }
    setSelectedQuestionIds(next.map(q => q.id))
    setEvaluationFieldErrors((current) => ({ ...current, questionIds: undefined }))
    setBuildMode('automatic_bank')
    setDraft(c => ({ ...c, questions: next.length, subject: c.subject || next[0]?.subject || 'Matematica' }))
    setFormNotice(`${next.length} questões selecionadas automaticamente.`)
  }

  function buildMixedQuestionSelection(questions: Question[], target: number) {
    const enemPool = questions.filter(q => q.sourceType === 'INEP_ENEM')
    const systemPool = questions.filter(q => q.sourceType !== 'INEP_ENEM')
    const enemTarget = Math.ceil(target / 2)
    const systemTarget = target - enemTarget
    const selected = [...enemPool.slice(0, enemTarget), ...systemPool.slice(0, systemTarget)]
    const selectedIds = new Set(selected.map(q => q.id))
    const remainder = questions.filter(q => !selectedIds.has(q.id)).slice(0, target - selected.length)
    return shuffleQuestions([...selected, ...remainder]).slice(0, target)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validation = evaluationFormSchema.safeParse({ ...draft, questionIds: selectedQuestionIds })
    if (!validation.success) {
      const errors = zodFieldErrors<EvaluationFormField>(validation.error)
      setEvaluationFieldErrors(errors)
      setFormNotice(Object.values(errors)[0] ?? 'Revise os campos da prova.')
      scrollToEvaluationError(errors)
      return
    }
    if (buildMode !== 'teacher_created' && selectedQuestionIds.length === 0) {
      const errors: FieldErrors<EvaluationFormField> = { questionIds: 'Selecione questões ou use a geração automática.' }
      setEvaluationFieldErrors(errors)
      setFormNotice(errors.questionIds ?? 'Revise os campos da prova.')
      scrollToEvaluationError(errors)
      return
    }
    setEvaluationFieldErrors({})
    const zTitle = sanitizeText(validation.data.title)
    const zClassId = sanitizeText(validation.data.classId)
    const zSubject = sanitizeText(validation.data.subject)
    const zScheduledAt = sanitizeText(validation.data.scheduledAt)
    const zQuestionCount = selectedQuestions.length || Math.max(1, Number(validation.data.questions))
    const zResolvedMode = selectedQuestions.some(q => q.sourceType === 'TEACHER_CREATED') && buildMode !== 'teacher_created' ? 'mixed' : buildMode
    await onCreate({ title: zTitle, classId: zClassId, subject: zSubject, questions: zQuestionCount, scheduledAt: zScheduledAt, status: 'planejado', corrected: 0, participants: 0, averageScore: 0, triLevel: selectedQuestions.length > 0 ? `Banco: ${zQuestionCount} itens` : 'Criação do professor', buildMode: zResolvedMode, questionIds: selectedQuestionIds, skillCodes: selectedSkillCodes, descriptorCodes: selectedDescriptorCodes, sourceSummary: sourceSummary(selectedQuestions) })
    setDraft({ ...emptyEvaluation }); setSelectedQuestionIds([]); setEvaluationFieldErrors({}); setBuildMode('manual_bank'); setFormNotice('Prova criada com sucesso!')
    return
    const title = sanitizeText(draft.title ?? '')
    const classId = sanitizeText(draft.classId ?? '')
    const subject = sanitizeText(draft.subject ?? '')
    const scheduledAt = sanitizeText(draft.scheduledAt ?? '')
    if (!title || !classId || !subject || !scheduledAt) { setFormNotice('Preencha título, turma, disciplina e data.'); return }
    if (buildMode !== 'teacher_created' && !selectedQuestions.length) { setFormNotice('Selecione questões ou use a geração automática.'); return }
    const qCount = selectedQuestions.length || Math.max(1, Number(draft.questions ?? 1))
    const resolvedMode = selectedQuestions.some(q => q.sourceType === 'TEACHER_CREATED') && buildMode !== 'teacher_created' ? 'mixed' : buildMode
    await onCreate({ title, classId, subject, questions: qCount, scheduledAt, status: 'planejado', corrected: 0, participants: 0, averageScore: 0, triLevel: selectedQuestions.length > 0 ? `Banco: ${qCount} itens` : 'Criação do professor', buildMode: resolvedMode, questionIds: selectedQuestionIds, skillCodes: selectedSkillCodes, descriptorCodes: selectedDescriptorCodes, sourceSummary: sourceSummary(selectedQuestions) })
    setDraft({ ...emptyEvaluation }); setSelectedQuestionIds([]); setBuildMode('manual_bank'); setFormNotice('Prova criada com sucesso!')
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
      setQuestionFieldErrors(errors)
      setQuestionFormError(Object.values(errors)[0] ?? 'Revise os campos da questão.')
      if (errors.title || errors.gradeLevel || errors.skillId || errors.descriptorId || errors.estimatedTimeSeconds || errors.sourceName) setCreateStep(1)
      else if (errors.statement || errors.context || errors.explanation || errors.keywords) setCreateStep(2)
      else setCreateStep(3)
      return
    }
    setQuestionFieldErrors({})
    const cleanTitle = sanitizeText(teacherQuestionDraft.title)
    const cleanStatement = sanitizeText(teacherQuestionDraft.statement)
    const cleanOptions = optionLabels.map((label, i) => ({ label, text: sanitizeText(teacherQuestionDraft.options[label]), order: i + 1, isCorrect: label === teacherQuestionDraft.correctOption }))
    if (cleanTitle.length < 4 || cleanStatement.length < 8) { setQuestionFormError('Informe um título e enunciado válidos.'); return }
    if (cleanOptions.some(o => o.text.length < 1)) { setQuestionFormError('Preencha todas as alternativas.'); return }
    const skill = activeSkills.find(s => s.id === teacherSkillId) ?? activeSkills[0]
    const descriptor = activeDescriptors.find(d => d.id === teacherDescriptorId) ?? activeDescriptors[0]
    if (!skill || !descriptor) { setQuestionFormError('Cadastre ao menos uma habilidade e um descritor.'); return }
    const keywords = teacherQuestionDraft.keywords.split(',').map(sanitizeText).filter(Boolean)
    const payload: CreateQuestionRequest = { title: cleanTitle, context: sanitizeText(teacherQuestionDraft.context), statement: cleanStatement, explanation: sanitizeText(teacherQuestionDraft.explanation), type: 'MULTIPLE_CHOICE', stage: 'FUNDAMENTAL', gradeLevel: sanitizeText(teacherQuestionDraft.gradeLevel) || skill.gradeLevel, area: skill.area, component: skill.component, subject: skill.component, difficulty: teacherQuestionDraft.difficulty, sourceType: 'TEACHER_CREATED', sourceName: sanitizeText(teacherQuestionDraft.sourceName) || 'Questão criada pelo professor', sourceYear: new Date().getFullYear(), sourceExternalId: null, sourceUrl: null, licenseNotes: null, visibility: teacherQuestionDraft.visibility, options: cleanOptions, skillIds: [skill.id], descriptorIds: [descriptor.id], attachments: [], metadata: { estimatedTimeSeconds: Number(teacherQuestionDraft.estimatedTimeSeconds) || 90, hasImage: false, hasTable: false, hasFormula: false, keywords } }
    const created = await onCreateQuestion({ ...payload, metadata: { ...payload.metadata, requestedStatus: teacherQuestionDraft.status } })
    setSelectedQuestionIds(c => [created.id, ...c])
    setBuildMode(c => c === 'manual_bank' ? 'teacher_created' : 'mixed')
    setDraft(c => ({ ...c, subject: c.subject || created.subject, questions: Math.max(Number(c.questions ?? 0), selectedQuestionIds.length + 1) }))
    setTeacherQuestionDraft(createEmptyQuestionDraft(firstSkillId, firstDescriptorId))
    setQuestionFieldErrors({}); setQuestionFormError(null); setWorkspace('builder'); setFormNotice('Questão criada e adicionada à prova.'); setCreateStep(1)
  }

  const inp = 'min-h-10 w-full min-w-0 rounded-sm border-2 border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 hover:border-slate-400'
  const inp2 = `${inp} min-h-[100px] py-3 leading-relaxed`

  const tabs = [
    { id: 'builder' as const, label: 'Montar Prova', icon: ClipboardCheck, color: 'text-indigo-600', bg: 'bg-indigo-500' },
    { id: 'bank' as const, label: 'Banco', icon: BookOpen, color: 'text-cyan-600', bg: 'bg-cyan-500' },
    { id: 'inep' as const, label: 'INEP/ENEM', icon: Award, color: 'text-amber-600', bg: 'bg-amber-500' },
    { id: 'create' as const, label: 'Criar Questão', icon: PenTool, color: 'text-violet-600', bg: 'bg-violet-500' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');

        .ev-root { font-family: 'DM Sans', system-ui, sans-serif; }

        .ev-tab-btn { position:relative }
        .ev-tab-btn.active::after {
          content:''; position:absolute; bottom:0; left:8px; right:8px;
          height:3px; border-radius:3px 3px 0 0; background:currentColor;
        }
        .ev-tab-btn:not(.active):hover { background:rgba(0,0,0,.04) }

        .ev-table-row:hover { background:linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%) }

        ::-webkit-scrollbar { width:6px; height:6px }
        ::-webkit-scrollbar-track { background:#f1f5f9; border-radius:10px }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px }
        ::-webkit-scrollbar-thumb:hover { background:#94a3b8 }
      `}</style>

      <div className="ev-root mx-auto grid min-h-screen w-full max-w-[1680px] gap-4 bg-gradient-to-br from-slate-100 via-slate-50 to-white px-[clamp(10px,2.5vw,40px)] py-3 pb-16 text-slate-900 sm:gap-5 sm:py-4">

        <PageTitleBar
          label="Avaliação inteligente"
          title="Provas & Simulados"
          icon={<GraduationCap />}
          actions={(
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setEvaluationsModalOpen(true)}
                className="group inline-flex items-center gap-2 rounded-sm hover:bg-indigo-100 border border-slate-500 px-4 py-2.5 text-sm font-bold text-slate-700 hover:text-indigo-700 transition-colors hover:border-indigo-400 hover:shadow-lg"
              >
                <ClipboardList className="h-4 w-4" />
                Provas cadastradas
                <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-black text-white">{evaluations.length}</span>
              </button>
              <div className="flex items-center gap-2 rounded-full border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-white px-4 py-2 text-xs font-bold text-emerald-700">
                <ScanLine className="h-4 w-4" />
                Correção automática
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
          )}
        />

        <div className="grid items-start gap-5">

          <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-xl">
            <div className="flex overflow-x-auto border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white">
              {tabs.map(tab => (
                <button key={tab.id} type="button" onClick={() => { setWorkspace(tab.id); if (tab.id === 'create') setCreateStep(1) }}
                  className={`ev-tab-btn flex min-w-[86px] flex-1 items-center justify-center gap-2 border-r border-slate-300 px-3 py-3 text-[10px] font-bold uppercase tracking-wider last:border-r-0 sm:min-w-0 sm:gap-2.5 sm:px-5 sm:py-4 sm:text-xs ${workspace === tab.id ? `active ${tab.color}` : 'text-slate-400 hover:text-slate-600'}`}>
                  <div className={`grid h-7 w-7 place-items-center rounded-lg ${workspace === tab.id ? `${tab.bg} text-white shadow-md` : 'bg-slate-100 text-slate-400'}`}>
                    <tab.icon className="h-4 w-4" />
                  </div>
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              ))}
            </div>

            {workspace === 'builder' && (
              <form onSubmit={handleSubmit} noValidate>

                {/* ── Seção 1: Identificação ── */}
                <div className="border-b-2 border-slate-300 p-4 sm:p-5">
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100 text-indigo-600">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">Identificação da Prova</h3>
                  </div>

                  {/* Linha 1: Título (span completo) */}
                  <label className="mb-3 block scroll-mt-24" data-evaluation-field="title">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <PenTool className="h-3 w-3 text-indigo-400" />
                      Título
                    </span>
                    <input
                      className={`${inp} ${fieldStateClass(evaluationFieldErrors.title)}`}
                      placeholder="Ex: Simulado 1 — Matemática 8º Ano"
                      value={draft.title ?? ''}
                      onChange={e => { clearEvaluationError('title'); setDraft({ ...draft, title: e.target.value }) }}
                      required
                      aria-invalid={Boolean(evaluationFieldErrors.title) || undefined}
                    />
                    <FieldMessage hint="Digite um título claro para identificar a prova." error={evaluationFieldErrors.title} />
                  </label>

                  {/* Linha 2: Turma · Disciplina · Nº Questões · Data — tudo na mesma linha */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="classId">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <Users className="h-3 w-3 text-cyan-500" />
                        Turma
                      </span>
                      <CompactSelect
                        className={`${inp} ${fieldStateClass(evaluationFieldErrors.classId)}`}
                        value={draft.classId ?? ''}
                        onChange={classId => { clearEvaluationError('classId'); setDraft({ ...draft, classId }) }}
                        options={classOptions}
                        hint="Selecione a turma que fará a avaliação."
                        error={evaluationFieldErrors.classId}
                        dropdownMinWidth={240}
                      />
                    </label>

                    <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="subject">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <BookOpen className="h-3 w-3 text-amber-500" />
                        Disciplina
                      </span>
                      <CompactSelect
                        className={`${inp} ${fieldStateClass(evaluationFieldErrors.subject)}`}
                        value={draft.subject ?? ''}
                        onChange={subject => { clearEvaluationError('subject'); setDraft({ ...draft, subject }) }}
                        options={subjectOptions}
                        hint="Selecione a disciplina principal da prova."
                        error={evaluationFieldErrors.subject}
                        dropdownMinWidth={240}
                      />
                    </label>

                    <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="questions">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <Hash className="h-3 w-3 text-violet-500" />
                        Nº de Questões
                      </span>
                      <div className="relative">
                        <Hash className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          className={`${inp} pl-9 ${fieldStateClass(evaluationFieldErrors.questions)}`}
                          type="number"
                          min={1}
                          value={draft.questions ?? 10}
                          onChange={e => { clearEvaluationError('questions'); setDraft({ ...draft, questions: Number(e.target.value) }) }}
                          required
                          aria-invalid={Boolean(evaluationFieldErrors.questions) || undefined}
                        />
                      </div>
                      <FieldMessage hint="Informe quantas questões a prova deve ter." error={evaluationFieldErrors.questions} />
                    </label>

                    <label className="flex scroll-mt-24 flex-col gap-1.5" data-evaluation-field="scheduledAt">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <Calendar className="h-3 w-3 text-rose-500" />
                        Data de Aplicação
                      </span>
                      <div className="relative">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <DateInput
                          className={`${inp} pl-9 ${fieldStateClass(evaluationFieldErrors.scheduledAt)}`}
                          value={draft.scheduledAt ?? ''}
                          onChange={e => { clearEvaluationError('scheduledAt'); setDraft({ ...draft, scheduledAt: e.target.value }) }}
                          required
                        />
                      </div>
                      <FieldMessage hint="Selecione a data prevista para aplicação." error={evaluationFieldErrors.scheduledAt} />
                    </label>
                  </div>
                </div>

                {/* ── Seção 2: Modo de Montagem + Geração Automática (lado a lado, compactos) ── */}
                <div className="border-b-2 border-slate-300 p-4 sm:p-5">
                  <div className="grid gap-5 xl:grid-cols-[minmax(240px,280px)_1fr]">

                    {/* Modo de montagem — compacto, horizontal */}
                    <div className="min-w-0">
                      <div className="mb-3 flex items-center gap-2.5">
                        <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600">
                          <Settings2 className="h-3.5 w-3.5" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">Modo de Montagem</h3>
                      </div>
                      <div className="flex flex-col gap-2">
                        {[
                          { id: 'manual_bank' as const, label: 'Manual', desc: 'Selecione do banco', icon: BookOpenCheck, active: 'indigo' },
                          { id: 'automatic_bank' as const, label: 'Automático', desc: 'IA seleciona por filtros', icon: Brain, active: 'violet' },
                          { id: 'teacher_created' as const, label: 'Professor', desc: 'Questões próprias', icon: UserRound, active: 'amber' },
                        ].map(m => {
                          const isActive = buildMode === m.id
                          const colorMap: Record<string, string> = {
                            indigo: 'border-indigo-400 bg-indigo-50 text-indigo-700',
                            violet: 'border-violet-400 bg-violet-50 text-violet-700',
                            amber: 'border-amber-400 bg-amber-50 text-amber-700',
                          }
                          const iconMap: Record<string, string> = {
                            indigo: 'bg-indigo-500 text-white',
                            violet: 'bg-violet-500 text-white',
                            amber: 'bg-amber-500 text-white',
                          }
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setBuildMode(m.id)}
                              className={`group flex items-center gap-3 rounded-lg border-2 px-4 py-2.5 text-left transition-colors ${isActive ? colorMap[m.active] : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50'}`}
                            >
                              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isActive ? iconMap[m.active] : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                <m.icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="block text-sm font-bold leading-none">{m.label}</span>
                                <span className="block text-[10px] font-medium text-slate-400 mt-0.5">{m.desc}</span>
                              </div>
                              {isActive && (
                                <div className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white shadow">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Geração automática — à direita */}
                    <div className="rounded-xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-4">
                      {/* Cabeçalho com botão Gerar em destaque */}
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100 text-violet-600">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wide text-violet-700">Geração Automática</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              <span className="font-bold text-violet-600">{autoEligible.length}</span> questões elegíveis com os filtros atuais
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoSelect}
                          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-sm bg-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all hover:bg-violet-600 hover:shadow-xl sm:w-auto"
                        >
                          <Sparkles className="h-4 w-4" />
                          Gerar {draft.questions ?? 10} questões
                        </button>
                      </div>

                      {/* Origem das questões */}
                      <div className="mb-3 grid gap-2 sm:grid-cols-3">
                        {[
                          { id: 'system' as const, label: 'Professor', desc: canSeeAllBankQuestions ? 'Banco interno' : 'Minhas questões', icon: UserRound },
                          { id: 'enem' as const, label: 'ENEM', desc: `${inepQuestions.length} questões`, icon: Award },
                          { id: 'mixed' as const, label: 'Mesclar', desc: 'ENEM + banco', icon: Layers },
                        ].map(origin => (
                          <button
                            key={origin.id}
                            type="button"
                            onClick={() => setAutoFilters({ ...autoFilters, sourceMode: origin.id })}
                            className={`group flex flex-1 items-center gap-2 rounded-lg border-2 px-3 py-2 text-left transition-colors ${autoFilters.sourceMode === origin.id ? 'border-violet-400 bg-white shadow-sm' : 'border-slate-300 bg-white/60 hover:border-violet-300 hover:bg-white'}`}
                          >
                            <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${autoFilters.sourceMode === origin.id ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <origin.icon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <span className={`block text-[11px] font-bold leading-none ${autoFilters.sourceMode === origin.id ? 'text-violet-700' : 'text-slate-600'}`}>{origin.label}</span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">{origin.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Filtros em linha única */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          { label: 'Ano', value: autoFilters.gradeLevel, key: 'gradeLevel', options: gradeLevelOptions, icon: GraduationCap },
                          { label: 'Dificuldade', value: autoFilters.difficulty, key: 'difficulty', options: difficultyOptions, icon: Zap },
                          { label: 'Habilidade', value: autoFilters.skillCode, key: 'skillCode', options: skillCodeOptions, icon: Target },
                          { label: 'Descritor', value: autoFilters.descriptorCode, key: 'descriptorCode', options: descriptorCodeOptions, icon: Layers },
                        ].map(f => (
                          <label key={f.key} className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              <f.icon className="h-2.5 w-2.5" />
                              {f.label}
                            </span>
                            <CompactSelect
                              className={inp}
                              value={f.value}
                              onChange={value => setAutoFilters({ ...autoFilters, [f.key]: value })}
                              options={f.options}
                              dropdownMinWidth={180}
                              dropdownWidth={f.key === 'skillCode' || f.key === 'descriptorCode' ? 'trigger' : 'content'}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Seção 3: Questões do banco (preview) + Composição ── */}
                <div className="p-4 sm:p-5">
                  {autoFilters.sourceMode === 'system' ? (
                    <>
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600">
                            <BookOpen className="h-3.5 w-3.5" />
                          </div>
                          <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">
                            {canSeeAllBankQuestions ? 'Questões de professores' : 'Minhas questões'}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWorkspace('bank')}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-sm border-2 border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-600 sm:w-auto"
                        >
                          <Search className="h-3.5 w-3.5" />
                          Explorar banco completo
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="space-y-2 mb-6">
                        {isLoading
                          ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                          : filteredQuestions.slice(0, 4).map((q, i) => (
                            <QuestionRowCompact
                              key={q.id}
                              question={q}
                              selected={selectedQuestionIds.includes(q.id)}
                              onToggle={() => toggleQuestion(q.id)}
                              onOpen={() => setQuestionPreview(q)}
                              index={i}
                            />
                          ))
                        }
                        {!isLoading && filteredQuestions.length === 0 && (
                          <EmptyState icon={<Search className="h-7 w-7" />} title="Nenhuma questão encontrada" sub="Ajuste os filtros ou explore o banco completo" />
                        )}
                      </div>

                      {/* Composição da prova logo abaixo das questões */}
                      <CompositionPanel
                        draft={draft}
                        selectedQuestions={selectedQuestions}
                        selectedSkillCodes={selectedSkillCodes}
                        selectedDescriptorCodes={selectedDescriptorCodes}
                        estimatedMinutes={estimatedMinutes}
                        buildMode={buildMode}
                        classLabel={getClassName(draft.classId ?? '')}
                        onRemoveQuestion={toggleQuestion}
                        onOpenQuestion={setQuestionPreview}
                        onClear={() => { setSelectedQuestionIds([]); setEvaluationFieldErrors((current) => ({ ...current, questionIds: undefined })) }}
                      />
                    </>
                  ) : (
                    <CompositionPanel
                      draft={draft}
                      selectedQuestions={selectedQuestions}
                      selectedSkillCodes={selectedSkillCodes}
                      selectedDescriptorCodes={selectedDescriptorCodes}
                      estimatedMinutes={estimatedMinutes}
                      buildMode={buildMode}
                      classLabel={getClassName(draft.classId ?? '')}
                      onRemoveQuestion={toggleQuestion}
                      onOpenQuestion={setQuestionPreview}
                      onClear={() => { setSelectedQuestionIds([]); setEvaluationFieldErrors((current) => ({ ...current, questionIds: undefined })) }}
                    />
                  )}
                </div>

                {/* ── Rodapé: ações ── */}
                <div className="scroll-mt-24 border-t-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white px-5 py-4" data-evaluation-field="questionIds">
                  <FieldMessage
                    hint="Selecione questões no banco, crie uma questão ou use a seleção automática antes de salvar a prova."
                    error={evaluationFieldErrors.questionIds}
                    className="mb-3"
                  />
                  {formNotice && (
                    <div className={`mb-4 flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-bold ${formNotice.includes('sucesso') || formNotice.includes('selecionadas') ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-amber-400 bg-amber-50 text-amber-700'}`}>
                      {formNotice.includes('sucesso') || formNotice.includes('selecionadas')
                        ? <CheckCircle2 className="h-5 w-5 shrink-0" />
                        : <AlertCircle className="h-5 w-5 shrink-0" />
                      }
                      {formNotice}
                    </div>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                    <button
                      type="submit"
                      className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-violet-500 px-6 text-sm font-black text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-600 hover:shadow-xl sm:w-auto"
                    >
                      <FileCheck className="h-5 w-5" />
                      Criar prova
                    </button>
                  </div>
                </div>
              </form>
            )}

            {workspace === 'bank' && (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-cyan-300 bg-gradient-to-r from-cyan-50 to-white px-5 py-4 shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-200">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div className="sm:flex sm:flex-col">
                      <h2 className="font-['Sora',system-ui,sans-serif] text-lg font-black text-slate-900">Banco de Questões</h2>
                      <p className="text-sm text-slate-500">
                        <span className="font-bold text-cyan-600">{filteredQuestions.length}</span> de {visibleBankQuestionPool.length} questões
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setWorkspace('builder')} className="group inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-cyan-500 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-200 transition-colors hover:shadow-xl">
                    <CheckCircle2 className="h-5 w-5" />
                    Usar seleção
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-black">{selectedQuestionIds.length}</span>
                  </button>
                </div>

                <div className="rounded-xl border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-200 text-slate-600">
                      <Filter className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500">Filtros</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-8">
                    <label className="col-span-2 sm:col-span-3 lg:col-span-2 flex flex-col gap-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <Search className="h-3 w-3" />
                        Busca
                      </span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className={`${inp} pl-11`} value={bankFilters.search} onChange={e => setBankFilters({ ...bankFilters, search: e.target.value })} placeholder="Título, enunciado, código…" />
                      </div>
                    </label>
                    {[
                      { label: 'Ano', key: 'gradeLevel', options: gradeLevelOptions, icon: GraduationCap },
                      { label: 'Dificuldade', key: 'difficulty', options: difficultyOptions, icon: Zap },
                      { label: 'Status', key: 'status', options: questionStatusOptions, icon: BadgeCheck },
                      { label: 'Fonte', key: 'sourceType', options: sourceTypeOptions, icon: FileQuestion },
                      { label: 'Escola', key: 'schoolId', options: schoolFilterOptions, icon: GraduationCap },
                      { label: 'Professor', key: 'createdById', options: creatorFilterOptions, icon: UserRound },
                    ].map(f => (
                      <label key={f.key} className="flex flex-col gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                          <f.icon className="h-3 w-3" />
                          {f.label}
                        </span>
                        <CompactSelect className={inp} value={(bankFilters as Record<string, string>)[f.key]} onChange={value => setBankFilters({ ...bankFilters, [f.key]: value })} options={f.options} dropdownMinWidth={180} />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {isLoading
                    ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)
                    : paginatedQuestions.map((q, i) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        selected={selectedQuestionIds.includes(q.id)}
                        onToggle={() => toggleQuestion(q.id)}
                        onOpen={() => setQuestionPreview(q)}
                        onDelete={onDeleteQuestion ? () => handleDeleteQuestion(q) : undefined}
                        deleting={deletingQuestionId === q.id}
                        index={i}
                      />
                    ))
                  }
                  {!isLoading && filteredQuestions.length === 0 && (
                    <div className="col-span-2"><EmptyState icon={<BookOpen className="h-7 w-7" />} title="Nenhuma questão encontrada" sub="Tente outros filtros ou crie uma questão" /></div>
                  )}
                </div>
                {!isLoading && filteredQuestions.length > QUESTIONS_PER_PAGE && (
                  <PaginationControls page={safeBankPage} totalItems={filteredQuestions.length} onPageChange={setBankPage} />
                )}
              </div>
            )}

            {workspace === 'inep' && (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-white px-5 py-4 shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-200">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="font-['Sora',system-ui,sans-serif] text-lg font-black text-slate-900">INEP / ENEM</h2>
                      <p className="text-sm text-slate-500"><span className="font-bold text-amber-600">{inepQuestions.length}</span> questões oficiais disponíveis</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setAutoFilters({ ...autoFilters, sourceMode: 'enem' }); setWorkspace('builder') }} className="group inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-200 transition-colors hover:shadow-xl">
                    <Sparkles className="h-5 w-5" />
                    Usar no builder
                  </button>
                </div>
                {inepQuestions.length > 0 ? (
                  <>
                    <div>
                      <h3 className="mb-4 flex items-center gap-2 text-base font-black text-slate-700">
                        <Award className="h-5 w-5 text-amber-500" />
                        Questões INEP no banco ({inepQuestions.length})
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {paginatedInepQuestions.map((q, i) => (
                          <QuestionCard
                            key={q.id}
                            question={q}
                            selected={selectedQuestionIds.includes(q.id)}
                            onToggle={() => toggleQuestion(q.id)}
                            onOpen={() => setQuestionPreview(q)}
                            onDelete={onDeleteQuestion ? () => handleDeleteQuestion(q) : undefined}
                            deleting={deletingQuestionId === q.id}
                            index={i}
                          />
                        ))}
                      </div>
                      {inepQuestions.length > QUESTIONS_PER_PAGE && (
                        <div className="mt-4">
                          <PaginationControls page={safeInepPage} totalItems={inepQuestions.length} onPageChange={setInepPage} />
                        </div>
                      )}
                    </div>
                  </>
                ) : <EmptyState icon={<FileDown className="h-7 w-7" />} title="Nenhuma questão INEP encontrada" sub="O banco ainda não possui questões oficiais importadas." />}
              </div>
            )}

            {workspace === 'create' && (
              <form onSubmit={handleTeacherQuestionSubmit} noValidate>
                {/* Step Progress */}
                <div className="border-b-2 border-slate-300 bg-gradient-to-r from-violet-50 to-white px-6 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="flex items-center gap-3 text-lg font-black text-slate-900">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-200">
                        <PenTool className="h-5 w-5" />
                      </div>
                      Criar Nova Questão
                    </h2>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3].map(step => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => setCreateStep(step as 1 | 2 | 3)}
                          className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-bold ${createStep === step ? 'bg-violet-500 text-white shadow-lg shadow-violet-200' : createStep > step ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {createStep > step ? <Check className="h-4 w-4" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-xs font-black">{step}</span>}
                          {step === 1 ? 'Configuração' : step === 2 ? 'Conteúdo' : 'Alternativas'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 1: Configuration */}
                {createStep === 1 && (
                  <div className="p-6">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600">
                        <Settings2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-800">Configuração da Questão</h3>
                        <p className="text-sm text-slate-500">Defina o título, nível de dificuldade e classificação</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                          <PenTool className="h-4 w-4 text-violet-500" />
                          Título da questão
                        </span>
                        <input className={`${inp} ${fieldStateClass(questionFieldErrors.title)}`} value={teacherQuestionDraft.title} onChange={e => setTeacherQuestionField('title', e.target.value)} placeholder="Ex: Porcentagem — Desconto em compras" required aria-invalid={Boolean(questionFieldErrors.title) || undefined} />
                        <FieldMessage hint="Digite um título curto para localizar a questão depois." error={questionFieldErrors.title} className="mt-1.5" />
                      </label>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <GraduationCap className="h-4 w-4 text-cyan-500" />
                            Ano escolar
                          </span>
                          <input className={`${inp} ${fieldStateClass(questionFieldErrors.gradeLevel)}`} value={teacherQuestionDraft.gradeLevel} onChange={e => setTeacherQuestionField('gradeLevel', e.target.value)} required aria-invalid={Boolean(questionFieldErrors.gradeLevel) || undefined} />
                          <FieldMessage hint="Informe o ano escolar, por exemplo 8o ano." error={questionFieldErrors.gradeLevel} className="mt-1.5" />
                        </label>
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Dificuldade
                          </span>
                          <CompactSelect<Difficulty> className={`${inp} ${fieldStateClass(questionFieldErrors.difficulty)}`} value={teacherQuestionDraft.difficulty} onChange={difficulty => setTeacherQuestionField('difficulty', difficulty)} options={teacherDifficultyOptions} hint="Selecione a dificuldade estimada." error={questionFieldErrors.difficulty} dropdownMinWidth={180} />
                        </label>
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Eye className="h-4 w-4 text-indigo-500" />
                            Visibilidade
                          </span>
                          <CompactSelect<QuestionVisibility> className={`${inp} ${fieldStateClass(questionFieldErrors.visibility)}`} value={teacherQuestionDraft.visibility} onChange={visibility => setTeacherQuestionField('visibility', visibility)} options={teacherVisibilityOptions} hint="Defina quem poderá usar a questão." error={questionFieldErrors.visibility} dropdownMinWidth={180} />
                        </label>
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <BadgeCheck className="h-4 w-4 text-emerald-500" />
                            Status
                          </span>
                          <CompactSelect<QuestionStatus> className={`${inp} ${fieldStateClass(questionFieldErrors.status)}`} value={teacherQuestionDraft.status} onChange={status => setTeacherQuestionField('status', status)} options={teacherStatusOptions} hint="Escolha se ficará como rascunho, revisão ou aprovada." error={questionFieldErrors.status} dropdownMinWidth={200} />
                        </label>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Target className="h-4 w-4 text-indigo-500" />
                            Habilidade BNCC
                          </span>
                          <CompactSelect className={`${inp} ${fieldStateClass(questionFieldErrors.skillId)}`} value={teacherSkillId} onChange={skillId => setTeacherQuestionField('skillId', skillId)} options={teacherSkillOptions} placeholder="Selecione a habilidade" hint="Selecione a habilidade BNCC relacionada." error={questionFieldErrors.skillId} dropdownWidth="trigger" />
                        </label>
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Layers className="h-4 w-4 text-amber-500" />
                            Descritor
                          </span>
                          <CompactSelect className={`${inp} ${fieldStateClass(questionFieldErrors.descriptorId)}`} value={teacherDescriptorId} onChange={descriptorId => setTeacherQuestionField('descriptorId', descriptorId)} options={teacherDescriptorOptions} placeholder="Selecione o descritor" hint="Selecione o descritor da avaliação." error={questionFieldErrors.descriptorId} dropdownWidth="trigger" />
                        </label>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Timer className="h-4 w-4 text-rose-500" />
                            Tempo estimado (segundos)
                          </span>
                          <input className={`${inp} ${fieldStateClass(questionFieldErrors.estimatedTimeSeconds)}`} type="number" min={30} step={15} value={teacherQuestionDraft.estimatedTimeSeconds} onChange={e => setTeacherQuestionField('estimatedTimeSeconds', Number(e.target.value))} aria-invalid={Boolean(questionFieldErrors.estimatedTimeSeconds) || undefined} />
                          <FieldMessage hint="Informe o tempo estimado para resolver a questão." error={questionFieldErrors.estimatedTimeSeconds} className="mt-1.5" />
                        </label>
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Info className="h-4 w-4 text-slate-500" />
                            Fonte
                          </span>
                          <input className={`${inp} ${fieldStateClass(questionFieldErrors.sourceName)}`} value={teacherQuestionDraft.sourceName} onChange={e => setTeacherQuestionField('sourceName', e.target.value)} aria-invalid={Boolean(questionFieldErrors.sourceName) || undefined} />
                          <FieldMessage hint="Informe a origem da questão, por exemplo criação própria." error={questionFieldErrors.sourceName} className="mt-1.5" />
                        </label>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                      <button type="button" onClick={() => { if (validateQuestionStep(1)) setCreateStep(2) }} className="group inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-colors hover:shadow-xl">
                        Próximo: Conteúdo
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Content */}
                {createStep === 2 && (
                  <div className="p-6">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-800">Conteúdo da Questão</h3>
                        <p className="text-sm text-slate-500">Escreva o enunciado, contexto e explicação</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                          <FileText className="h-4 w-4 text-indigo-500" />
                          Enunciado
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">Obrigatório</span>
                        </span>
                        <textarea className={`${inp2} min-h-[140px] ${fieldStateClass(questionFieldErrors.statement)}`} value={teacherQuestionDraft.statement} onChange={e => setTeacherQuestionField('statement', e.target.value)} placeholder="Escreva a pergunta da questão aqui…" required aria-invalid={Boolean(questionFieldErrors.statement) || undefined} />
                        <FieldMessage hint="Escreva o enunciado completo que o aluno responderá." error={questionFieldErrors.statement} className="mt-1.5" />
                      </label>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <BookOpen className="h-4 w-4 text-cyan-500" />
                            Contexto
                            <span className="text-xs font-normal text-slate-400">(opcional)</span>
                          </span>
                          <textarea className={`${inp2} ${fieldStateClass(questionFieldErrors.context)}`} value={teacherQuestionDraft.context} onChange={e => setTeacherQuestionField('context', e.target.value)} placeholder="Texto de apoio, situação problema…" aria-invalid={Boolean(questionFieldErrors.context) || undefined} />
                          <FieldMessage hint="Opcional: inclua texto de apoio ou situação-problema." error={questionFieldErrors.context} className="mt-1.5" />
                        </label>
                        <label className="block">
                          <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            Explicação / Gabarito
                          </span>
                          <textarea className={`${inp2} ${fieldStateClass(questionFieldErrors.explanation)}`} value={teacherQuestionDraft.explanation} onChange={e => setTeacherQuestionField('explanation', e.target.value)} placeholder="Explique a resposta correta…" aria-invalid={Boolean(questionFieldErrors.explanation) || undefined} />
                          <FieldMessage hint="Opcional: explique o raciocínio da alternativa correta." error={questionFieldErrors.explanation} className="mt-1.5" />
                        </label>
                      </div>

                      <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                          <Tag className="h-4 w-4 text-violet-500" />
                          Palavras-chave
                          <span className="text-xs font-normal text-slate-400">(separadas por vírgula)</span>
                        </span>
                        <input className={`${inp} ${fieldStateClass(questionFieldErrors.keywords)}`} value={teacherQuestionDraft.keywords} onChange={e => setTeacherQuestionField('keywords', e.target.value)} placeholder="porcentagem, desconto, razão…" aria-invalid={Boolean(questionFieldErrors.keywords) || undefined} />
                        <FieldMessage hint="Opcional: separe palavras-chave por vírgula." error={questionFieldErrors.keywords} className="mt-1.5" />
                      </label>
                    </div>

                    <div className="mt-8 flex justify-between">
                      <button type="button" onClick={() => setCreateStep(1)} className="inline-flex items-center gap-2 rounded-sm border-2 border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-slate-400">
                        <MoveLeft className="h-4 w-4" />
                        Voltar
                      </button>
                      <button type="button" onClick={() => { if (validateQuestionStep(2)) setCreateStep(3) }} className="group inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-violet-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-colors hover:shadow-xl">
                        Próximo: Alternativas
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Alternatives */}
                {createStep === 3 && (
                  <div className="p-6">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                        <ListChecks className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-800">Alternativas</h3>
                        <p className="text-sm text-slate-500">Preencha as 5 alternativas e marque a correta</p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {optionLabels.map((label, idx) => {
                        const isCorrect = teacherQuestionDraft.correctOption === label
                        const optionField = `option${label}` as TeacherQuestionFormField
                        return (
                          <div
                            key={label}
                            className={`group flex items-center gap-4 rounded-xl border-2 p-4 ${isCorrect ? 'border-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-100/30 shadow-lg' : 'border-slate-300 bg-white hover:border-slate-400'}`}
                          >
                            <button
                              type="button"
                              onClick={() => { setQuestionFieldErrors((current) => ({ ...current, correctOption: undefined })); setTeacherQuestionDraft({ ...teacherQuestionDraft, correctOption: label }) }}
                              className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg text-lg font-black ${isCorrect ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                              {label}
                            </button>
                            <input
                              className={`min-h-12 flex-1 rounded-sm border-2 border-slate-300 bg-transparent px-4 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white ${fieldStateClass(questionFieldErrors[optionField])}`}
                              value={teacherQuestionDraft.options[label]}
                              onChange={e => updateOption(label, e.target.value)}
                              placeholder={`Digite a alternativa ${label}…`}
                              aria-invalid={Boolean(questionFieldErrors[optionField]) || undefined}
                              required
                            />
                            <FieldMessage hint={`Preencha o texto da alternativa ${label}.`} error={questionFieldErrors[optionField]} className="max-w-[180px] shrink-0" />
                            {isCorrect && (
                              <div className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-lg">
                                <CheckCircle2 className="h-4 w-4" />
                                Correta
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-6 rounded-xl border-2 border-dashed border-slate-400 bg-slate-50 p-4 text-center">
                      <p className="text-sm text-slate-500">
                        <span className="font-bold text-slate-700">Dica:</span> Clique na letra para marcar a alternativa correta. A alternativa marcada ficará destacada em verde.
                      </p>
                      <FieldMessage hint="Selecione a letra correta antes de salvar a questão." error={questionFieldErrors.correctOption} className="mt-2 justify-center" />
                    </div>

                    <div className="mt-8 border-t-2 border-slate-300 pt-6">
                      {questionFormError && (
                        <div className="mb-4 flex items-center gap-3 rounded-xl border-2 border-rose-400 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                          <AlertCircle className="h-5 w-5 shrink-0" />{questionFormError}
                        </div>
                      )}
                      <div className="flex justify-between">
                        <button type="button" onClick={() => setCreateStep(2)} className="inline-flex items-center gap-2 rounded-sm border-2 border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-slate-400">
                          <MoveLeft className="h-4 w-4" />
                          Voltar
                        </button>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setWorkspace('builder')} className="inline-flex items-center gap-2 rounded-sm border-2 border-slate-400 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:border-slate-500">
                            Cancelar
                          </button>
                          <button type="submit" className="group inline-flex items-center gap-2 rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-colors hover:shadow-xl">
                            <Save className="h-5 w-5" />
                            Adicionar ao banco
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        {questionPreview && (
          <QuestionDetailModal question={questionPreview} onClose={() => setQuestionPreview(null)} />
        )}

        {evaluationsModalOpen && (
          <div role="presentation" onMouseDown={() => setEvaluationsModalOpen(false)} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="evaluations-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
              className="relative my-auto max-h-[calc(100svh-4rem)] w-full max-w-6xl overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-2xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-white shadow-lg">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 id="evaluations-modal-title" className="font-['Sora',system-ui,sans-serif] text-lg font-black text-slate-900">Provas cadastradas</h2>
                    <p className="text-sm text-slate-400">{filteredEvaluations.length} resultado{filteredEvaluations.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'all', label: 'Todos', icon: LayoutGrid, color: 'slate' },
                    { id: 'planejado', label: 'Planejado', icon: Calendar, color: 'slate' },
                    { id: 'em_aplicacao', label: 'Em aplicação', icon: Clock, color: 'cyan' },
                    { id: 'corrigindo', label: 'Corrigindo', icon: ScanLine, color: 'amber' },
                    { id: 'concluido', label: 'Concluído', icon: CheckCircle2, color: 'emerald' },
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatusFilter(s.id)}
                      className={`inline-flex items-center gap-2 rounded-sm border-2 px-4 py-2 text-xs font-bold ${
                        statusFilter === s.id
                          ? s.color === 'emerald' ? 'border-emerald-400 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200'
                            : s.color === 'amber' ? 'border-amber-400 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-200'
                            : s.color === 'cyan' ? 'border-cyan-400 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-200'
                            : 'border-slate-600 bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-200'
                          : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <s.icon className="h-4 w-4" />
                      {s.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setEvaluationsModalOpen(false)} className="ml-2 grid h-10 w-10 place-items-center rounded-xl border-2 border-slate-300 bg-white text-slate-500 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(100svh-14rem)] overflow-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-slate-50">
                      {['Título', 'Turma', 'Disciplina', 'Modo', 'Questões', 'Correção', 'Média', 'Status', 'Ações'].map(h => (
                        <th key={h} className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      [...Array(4)].map((_, i) => (
                        <tr key={i} className="border-b border-slate-300">
                          {[...Array(9)].map((_, j) => <td key={j} className="px-5 py-4"><Skeleton className={`h-5 ${j === 0 ? 'w-40' : 'w-20'}`} /></td>)}
                        </tr>
                      ))
                    ) : filteredEvaluations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-20 text-center">
                          <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="Nenhuma prova encontrada" sub="Crie sua primeira prova no montador" />
                        </td>
                      </tr>
                    ) : filteredEvaluations.map((ev, idx) => {
                      const pqs = getEvaluationQuestions(ev)
                      const corrPct = ev.participants > 0 ? (ev.corrected / ev.participants) * 100 : 0
                      return (
                        <tr key={ev.id} className="ev-table-row border-b border-slate-300">
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                            <p className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Calendar className="h-3 w-3" />
                              {formatPrintDate(ev.scheduledAt)}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-slate-400" />
                              <span className="text-sm text-slate-600">{getClassName(ev.classId)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">{ev.subject}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-[10px] font-black ${buildModeColor(ev.buildMode)}`}>
                              {ev.buildMode === 'automatic_bank' ? <Brain className="h-3 w-3" /> : ev.buildMode === 'teacher_created' ? <UserRound className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                              {formatBuildMode(ev.buildMode)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-slate-700">{ev.questions}</td>
                          <td className="px-5 py-4">
                            <div className="space-y-1.5">
                              <p className="text-xs font-bold text-slate-600">{ev.corrected}/{ev.participants}</p>
                              <div className="h-2 w-16 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400" style={{ width: `${corrPct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-base font-black ${ev.averageScore >= 7 ? 'text-emerald-600' : ev.averageScore >= 5 ? 'text-amber-600' : 'text-rose-600'}`}>{ev.averageScore.toFixed(1)}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-[10px] font-black ${statusColor(ev.status)}`}>
                              {ev.status === 'concluido' ? <CheckCircle2 className="h-3 w-3" /> : ev.status === 'corrigindo' ? <ScanLine className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {ev.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <button type="button" disabled={pqs.length === 0} onClick={() => handleExportEvaluation(ev)} className="group inline-flex items-center gap-1.5 rounded-sm border-2 border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition-colors hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                                <FileDown className="h-4 w-4" />
                                Exportar
                              </button>
                              <button type="button" disabled={deletingEvaluationId === ev.id} onClick={() => handleDeleteEvaluation(ev)} className="group inline-flex items-center gap-1.5 rounded-sm border-2 border-rose-300 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-600 transition-colors hover:border-rose-400 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60">
                                <Trash2 className="h-4 w-4" />
                                {deletingEvaluationId === ev.id ? 'Excluindo' : 'Excluir'}
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
            description={`Excluir a prova "${deleteTarget.title}"? Esta acao nao pode ser desfeita.`}
            confirmLabel="Excluir prova"
            loading={deletingEvaluationId === deleteTarget.id}
            onCancel={() => {
              if (!deletingEvaluationId) setDeleteTarget(null)
            }}
            onConfirm={confirmDeleteEvaluation}
          />
        )}

        {deleteQuestionTarget && (
          <ConfirmDialog
            title="Excluir questão"
            description={`Excluir a questão "${deleteQuestionTarget.title}"? Ela será removida do banco e das provas que usam essa questão.`}
            confirmLabel="Excluir questão"
            loading={deletingQuestionId === deleteQuestionTarget.id}
            onCancel={() => {
              if (!deletingQuestionId) setDeleteQuestionTarget(null)
            }}
            onConfirm={confirmDeleteQuestion}
          />
        )}
      </div>
    </>
  )
}
