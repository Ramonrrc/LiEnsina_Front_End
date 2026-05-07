import { FormEvent, useMemo, useState, useEffect, useRef } from 'react'
import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileDown,
  Plus,
  Save,
  ScanLine,
  Search,
  UserRound,
  X,
  Zap,
  BarChart3,
  TrendingUp,
  Target,
  Award,
  ChevronRight,
  Filter,
  Eye,
  Sparkles,
  GraduationCap,
  BookOpen,
  AlignLeft,
  Clock,
  Layers,
  Check,
  ArrowRight,
  Hash,
  Calendar,
  Users,
  Star,
  AlertCircle,
  Trash2,
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import DateInput from '../components/ui/date-input'
import type {
  AssessmentDescriptor,
  ClassRoom,
  CreateQuestionRequest,
  CurriculumSkill,
  Difficulty,
  Evaluation,
  EvaluationBuildMode,
  Question,
  QuestionImportPlan,
  QuestionSourceType,
  QuestionStatus,
  QuestionVisibility,
} from '../types'

/* ─── Props ─────────────────────────────────── */
interface EvaluationsViewProps {
  evaluations: Evaluation[]
  classes: ClassRoom[]
  curriculumSkills: CurriculumSkill[]
  assessmentDescriptors: AssessmentDescriptor[]
  questionBank: Question[]
  questionImportPlans: QuestionImportPlan[]
  onCreate: (draft: Partial<Evaluation>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onCreateQuestion: (draft: CreateQuestionRequest) => Promise<Question>
}

type WorkspaceTab = 'builder' | 'bank' | 'inep' | 'create'
type OptionLabel = 'A' | 'B' | 'C' | 'D' | 'E'
type QuestionOriginMode = 'system' | 'enem' | 'mixed'
type BankFilters = {
  search: string; gradeLevel: string; difficulty: string; status: string
  skillCode: string; descriptorCode: string; sourceType: string
}
type AutoFilters = { gradeLevel: string; difficulty: string; skillCode: string; descriptorCode: string; sourceMode: QuestionOriginMode }
type TeacherQuestionDraft = {
  title: string; context: string; statement: string; explanation: string
  gradeLevel: string; difficulty: Difficulty; visibility: QuestionVisibility
  status: QuestionStatus; sourceName: string; keywords: string
  estimatedTimeSeconds: number; skillId: string; descriptorId: string
  options: Record<OptionLabel, string>; correctOption: OptionLabel
}

/* ─── Constants ─────────────────────────────── */
const optionLabels: OptionLabel[] = ['A', 'B', 'C', 'D', 'E']
const emptyEvaluation: Partial<Evaluation> = {
  title: '', classId: '', subject: 'Matematica',
  questions: 10, scheduledAt: new Date().toISOString().slice(0, 10),
  status: 'planejado', corrected: 0, participants: 0, averageScore: 0,
  triLevel: 'Aguardando aplicacao', buildMode: 'manual_bank', questionIds: [],
}

function createEmptyQuestionDraft(skillId = '', descriptorId = ''): TeacherQuestionDraft {
  return {
    title: '', context: '', statement: '', explanation: '',
    gradeLevel: '8o ano', difficulty: 'EASY', visibility: 'SCHOOL',
    status: 'DRAFT', sourceName: 'Questao criada pelo professor',
    keywords: '', estimatedTimeSeconds: 90, skillId, descriptorId,
    options: { A: '', B: '', C: '', D: '', E: '' }, correctOption: 'A',
  }
}

/* ─── Helpers ───────────────────────────────── */
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
  return [
    q.subject,
    q.component,
    q.area,
    q.metadata.enemDiscipline,
    q.metadata.enemLanguage,
    metadataKeywords,
  ].map(value => String(value ?? '')).join(' ')
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
function getSkillCodes(q: Question) { return q.skills.map(s => s.code) }
function getDescriptorCodes(q: Question) { return q.descriptors.map(d => d.code) }
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

/* ─── Difficulty colors ─────────────────────── */
function diffColor(d: Difficulty) {
  return { EASY: 'bg-emerald-100 text-emerald-700 border-emerald-300', MEDIUM: 'bg-amber-100 text-amber-700 border-amber-300', HARD: 'bg-rose-100 text-rose-700 border-rose-300' }[d]
}
function statusColor(s: string) {
  if (s === 'concluido' || s === 'APPROVED') return 'bg-emerald-100 text-emerald-700 border-emerald-300'
  if (s === 'corrigindo' || s === 'em_aplicacao' || s === 'PENDING_REVIEW') return 'bg-amber-100 text-amber-700 border-amber-300'
  if (s === 'planejado' || s === 'DRAFT') return 'bg-sky-100 text-sky-700 border-sky-300'
  return 'bg-slate-100 text-slate-600 border-slate-300'
}
function buildModeColor(m?: EvaluationBuildMode) {
  if (m === 'automatic_bank') return 'bg-violet-100 text-violet-700 border-violet-300'
  if (m === 'teacher_created') return 'bg-amber-100 text-amber-700 border-amber-300'
  if (m === 'mixed') return 'bg-indigo-100 text-indigo-700 border-indigo-300'
  return 'bg-slate-100 text-slate-600 border-slate-300'
}

/* ─── Skeleton ──────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />
}
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex gap-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-12" /></div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

/* ─── Print helpers ─────────────────────────── */
type PrintableImage = { url: string; alt: string }
const markdownImagePattern = /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/gi

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
  return (q.attachments ?? [])
    .filter(attachment => attachment.fileType === 'IMAGE' && positions.includes(attachment.position))
    .map(attachment => ({ url: attachment.fileUrl, alt: attachment.altText || 'Imagem da questao' }))
}

function renderPrintableText(value?: string | null, className = 'ctx') {
  const text = sanitizeText(value ?? '')
  if (!text) return ''
  return text.split(/\n{2,}/).map(block =>
    `<p class="${className}">${escapeHtml(block).replace(/\r?\n/g, '<br/>')}</p>`,
  ).join('')
}

function renderPrintableImages(images: PrintableImage[], className = 'media') {
  return uniquePrintableImages(images).map(image =>
    `<figure class="${className}"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" referrerpolicy="no-referrer" loading="eager"/></figure>`,
  ).join('')
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
    function printWhenImagesAreReady(){
      var printed=false;
      var printOnce=function(){ if(printed) return; printed=true; window.focus(); window.print(); };
      var imgs=Array.prototype.slice.call(document.images || []);
      if(!imgs.length){ printOnce(); return; }
      var pending=imgs.length;
      var done=function(){ pending-=1; if(pending<=0) printOnce(); };
      window.setTimeout(printOnce,5000);
      imgs.forEach(function(img){
        if(img.complete){ done(); return; }
        img.addEventListener('load',done,{once:true});
        img.addEventListener('error',done,{once:true});
      });
    }
    window.addEventListener('load',printWhenImagesAreReady);
  </script>
  </body></html>`
  w.document.open(); w.document.write(html); w.document.close()
}

/* ════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════ */
export default function EvaluationsView({
  evaluations, classes, curriculumSkills, assessmentDescriptors,
  questionBank, questionImportPlans, onCreate, onDelete, onCreateQuestion,
}: EvaluationsViewProps) {
  const firstSkillId = curriculumSkills[0]?.id ?? ''
  const firstDescriptorId = assessmentDescriptors[0]?.id ?? ''

  const [draft, setDraft] = useState<Partial<Evaluation>>({ ...emptyEvaluation })
  const [statusFilter, setStatusFilter] = useState('all')
  const [workspace, setWorkspace] = useState<WorkspaceTab>('builder')
  const [buildMode, setBuildMode] = useState<EvaluationBuildMode>('manual_bank')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [formNotice, setFormNotice] = useState<string | null>(null)
  const [questionFormError, setQuestionFormError] = useState<string | null>(null)
  const [deletingEvaluationId, setDeletingEvaluationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [bankFilters, setBankFilters] = useState<BankFilters>({
    search: '', gradeLevel: 'all', difficulty: 'all', status: 'all',
    skillCode: 'all', descriptorCode: 'all', sourceType: 'all',
  })
  const [autoFilters, setAutoFilters] = useState<AutoFilters>({
    gradeLevel: 'all', difficulty: 'all', skillCode: 'all', descriptorCode: 'all', sourceMode: 'system',
  })
  const [teacherQuestionDraft, setTeacherQuestionDraft] = useState<TeacherQuestionDraft>(
    createEmptyQuestionDraft(firstSkillId, firstDescriptorId),
  )

  // Simulate skeleton loading on mount
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const inepPlan = questionImportPlans.find(p => p.active && p.sourceType === 'INEP_ENEM') ?? null
  const inepQuestions = questionBank.filter(q => q.sourceType === 'INEP_ENEM')
  const inepPlannedQty = inepPlan?.itemsToImport.reduce((t, i) => t + i.quantity, 0) ?? 0

  const filteredEvaluations = useMemo(() => statusFilter === 'all' ? evaluations : evaluations.filter(e => e.status === statusFilter), [evaluations, statusFilter])
  const gradeLevels = useMemo(() => getUniqueValues(questionBank.map(q => q.gradeLevel)), [questionBank])
  const sourceTypes = useMemo(() => getUniqueValues(questionBank.map(q => q.sourceType)), [questionBank])
  const activeSkills = useMemo(() => curriculumSkills.filter(s => s.active), [curriculumSkills])
  const activeDescriptors = useMemo(() => assessmentDescriptors.filter(d => d.active), [assessmentDescriptors])
  const classOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [
      { value: '', label: 'Selecionar turma...' },
      ...classes.map(c => ({ value: c.id, label: c.name, description: `${c.grade} · ${c.shift}` })),
    ],
    [classes],
  )
  const subjectOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => getUniqueValues([
      'Matematica',
      'Lingua Portuguesa',
      'Ciencias da Natureza',
      'Ciencias Humanas',
      'Linguagens',
      ...questionBank.map(q => q.subject),
    ]).map(subject => ({ value: subject, label: subject })),
    [questionBank],
  )
  const gradeLevelOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todos' }, ...gradeLevels.map(value => ({ value, label: value }))],
    [gradeLevels],
  )
  const difficultyOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todos' }, ...(['EASY', 'MEDIUM', 'HARD'] as const).map(value => ({ value, label: formatDifficulty(value) }))],
    [],
  )
  const questionStatusOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todos' }, ...(['APPROVED', 'PENDING_REVIEW', 'DRAFT', 'REJECTED', 'ARCHIVED'] as const).map(value => ({ value, label: formatQStatus(value) }))],
    [],
  )
  const sourceTypeOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todos' }, ...sourceTypes.map(value => ({ value, label: formatSourceType(value as QuestionSourceType) }))],
    [sourceTypes],
  )
  const skillCodeOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todos' }, ...activeSkills.map(skill => ({ value: skill.code, label: skill.code, description: skill.knowledgeObject }))],
    [activeSkills],
  )
  const descriptorCodeOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todos' }, ...activeDescriptors.map(descriptor => ({ value: descriptor.code, label: descriptor.code, description: descriptor.description }))],
    [activeDescriptors],
  )
  const teacherDifficultyOptions = useMemo<Array<CompactSelectOption<Difficulty>>>(
    () => (['EASY', 'MEDIUM', 'HARD'] as const).map(value => ({ value, label: formatDifficulty(value) })),
    [],
  )
  const teacherVisibilityOptions = useMemo<Array<CompactSelectOption<QuestionVisibility>>>(
    () => [
      { value: 'PRIVATE', label: 'Privada' },
      { value: 'SCHOOL', label: 'Escola' },
      { value: 'NETWORK', label: 'Rede' },
      { value: 'GLOBAL', label: 'Global' },
    ],
    [],
  )
  const teacherStatusOptions = useMemo<Array<CompactSelectOption<QuestionStatus>>>(
    () => [
      { value: 'DRAFT', label: 'Rascunho' },
      { value: 'PENDING_REVIEW', label: 'Em revisão' },
      { value: 'APPROVED', label: 'Aprovada' },
    ],
    [],
  )
  const teacherSkillOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => activeSkills.map(skill => ({ value: skill.id, label: skill.code, description: skill.knowledgeObject })),
    [activeSkills],
  )
  const teacherDescriptorOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => activeDescriptors.map(descriptor => ({ value: descriptor.id, label: descriptor.code, description: descriptor.description })),
    [activeDescriptors],
  )

  const filteredQuestions = useMemo(() => {
    const s = normalizeSearch(bankFilters.search)
    return questionBank.filter(q => {
      if (bankFilters.gradeLevel !== 'all' && q.gradeLevel !== bankFilters.gradeLevel) return false
      if (bankFilters.difficulty !== 'all' && q.difficulty !== bankFilters.difficulty) return false
      if (bankFilters.status !== 'all' && q.status !== bankFilters.status) return false
      if (bankFilters.sourceType !== 'all' && q.sourceType !== bankFilters.sourceType) return false
      if (bankFilters.skillCode !== 'all' && !getSkillCodes(q).includes(bankFilters.skillCode)) return false
      if (bankFilters.descriptorCode !== 'all' && !getDescriptorCodes(q).includes(bankFilters.descriptorCode)) return false
      if (s && !questionSearchText(q).includes(s)) return false
      return true
    })
  }, [questionBank, bankFilters])

  const autoEligible = useMemo(() => questionBank.filter(q => {
    if (q.status !== 'APPROVED') return false
    if (autoFilters.sourceMode === 'enem' && q.sourceType !== 'INEP_ENEM') return false
    if (autoFilters.sourceMode === 'system' && q.sourceType === 'INEP_ENEM') return false
    if (autoFilters.gradeLevel !== 'all' && q.gradeLevel !== autoFilters.gradeLevel) return false
    if (autoFilters.difficulty !== 'all' && q.difficulty !== autoFilters.difficulty) return false
    if (autoFilters.skillCode !== 'all' && !getSkillCodes(q).includes(autoFilters.skillCode)) return false
    if (autoFilters.descriptorCode !== 'all' && !getDescriptorCodes(q).includes(autoFilters.descriptorCode)) return false
    if (draft.subject && !questionMatchesSubject(q, draft.subject)) return false
    return true
  }), [questionBank, autoFilters, draft.subject])

  const selectedQuestions = useMemo(() => selectedQuestionIds.map(id => questionBank.find(q => q.id === id)).filter((q): q is Question => Boolean(q)), [questionBank, selectedQuestionIds])
  const selectedSkillCodes = useMemo(() => getUniqueValues(selectedQuestions.flatMap(getSkillCodes)), [selectedQuestions])
  const selectedDescriptorCodes = useMemo(() => getUniqueValues(selectedQuestions.flatMap(getDescriptorCodes)), [selectedQuestions])
  const estimatedMinutes = useMemo(() => Math.max(0, Math.ceil(selectedQuestions.reduce((t, q) => t + Number(q.metadata.estimatedTimeSeconds ?? 0), 0) / 60)), [selectedQuestions])

  const teacherSkillId = teacherQuestionDraft.skillId || firstSkillId
  const teacherDescriptorId = teacherQuestionDraft.descriptorId || firstDescriptorId

  function getClassName(id: string) { return classes.find(c => c.id === id)?.name ?? 'Turma não encontrada' }
  function getEvaluationQuestions(ev: Evaluation) {
    return (ev.questionIds ?? []).map(id => questionBank.find(q => q.id === id)).filter((q): q is Question => Boolean(q))
  }

  function handleExportEvaluation(ev: Evaluation) {
    const qs = getEvaluationQuestions(ev)
    if (!qs.length) { setFormNotice('Esta prova não possui questões carregadas para exportação A4.'); return }
    exportEvaluationToA4(ev, qs, getClassName(ev.classId))
  }

  async function handleDeleteEvaluation(ev: Evaluation) {
    const confirmed = window.confirm(`Excluir a prova "${ev.title}"? Esta acao nao pode ser desfeita.`)
    if (!confirmed) return

    setDeletingEvaluationId(ev.id)
    try {
      await onDelete(ev.id)
      setFormNotice('Prova excluida com sucesso.')
    } finally {
      setDeletingEvaluationId(null)
    }
  }

  function toggleQuestion(id: string) {
    setSelectedQuestionIds(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])
    setBuildMode(cur => cur === 'automatic_bank' ? 'mixed' : cur)
    setFormNotice(null)
  }

  function handleAutoSelect() {
    const target = Math.max(1, Number(draft.questions ?? 1))
    const shuffledEligible = shuffleQuestions(autoEligible)
    const next = autoFilters.sourceMode === 'mixed'
      ? buildMixedQuestionSelection(shuffledEligible, target)
      : shuffledEligible.slice(0, target)
    if (!next.length) {
      const approvedCount = questionBank.filter(q => q.status === 'APPROVED').length
      if (!questionBank.length) setFormNotice('O banco de questões está vazio.')
      else if (!approvedCount) setFormNotice('Nenhuma questão aprovada no banco.')
      else setFormNotice('Os filtros atuais não retornam questões compatíveis.')
      return
    }
    setSelectedQuestionIds(next.map(q => q.id))
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
    setTeacherQuestionDraft(c => ({ ...c, options: { ...c.options, [label]: value } }))
  }

  async function handleTeacherQuestionSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
    setQuestionFormError(null); setWorkspace('builder'); setFormNotice('Questão criada e adicionada à prova.')
  }

  /* ─── Stats for header ──────────────────────── */
  const stats = useMemo(() => ({
    total: evaluations.length,
    approved: evaluations.filter(e => e.status === 'concluido').length,
    pending: evaluations.filter(e => e.status === 'planejado').length,
    avgScore: evaluations.length ? evaluations.reduce((s, e) => s + e.averageScore, 0) / evaluations.length : 0,
    bankSize: questionBank.length,
    approvedQ: questionBank.filter(q => q.status === 'APPROVED').length,
  }), [evaluations, questionBank])

  /* Input styles */
  const inp = 'min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100/60 hover:border-slate-600'
  const inp2 = `${inp} min-h-[88px] resize-y py-2.5 leading-relaxed`

  const tabs = [
    { id: 'builder' as const, label: 'Montar Prova', icon: ClipboardCheck, color: 'text-emerald-600' },
    { id: 'bank' as const, label: 'Banco', icon: BookOpen, color: 'text-indigo-600' },
    { id: 'inep' as const, label: 'INEP/ENEM', icon: FileDown, color: 'text-amber-600' },
    { id: 'create' as const, label: 'Criar Questão', icon: UserRound, color: 'text-violet-600' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Fraunces:wght@700;800;900&display=swap');

        .ev-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }

        @keyframes ev-in { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes ev-slide-r { from { opacity:0; transform:translateX(-10px) } to { opacity:1; transform:translateX(0) } }
        @keyframes ev-scale { from { opacity:0; transform:scale(.95) } to { opacity:1; transform:scale(1) } }
        @keyframes ev-shimmer { 0%,100% { opacity:.6 } 50% { opacity:1 } }
        @keyframes ev-pulse-ring { 0% { box-shadow:0 0 0 0 rgba(16,185,129,.35) } 70% { box-shadow:0 0 0 10px rgba(16,185,129,0) } 100% { box-shadow:0 0 0 0 rgba(16,185,129,0) } }
        @keyframes ev-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-3px) } }
        @keyframes ev-badge-in { from { opacity:0; transform:scale(.7) translateY(-4px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes ev-progress { from { width:0 } to { width:var(--w) } }
        @keyframes ev-glow { 0%,100% { box-shadow:0 0 0 0 rgba(16,185,129,0) } 50% { box-shadow:0 0 20px 4px rgba(16,185,129,.12) } }

        .ev-in { animation: ev-in .45s cubic-bezier(.22,1,.36,1) both }
        .ev-in-1 { animation-delay:.05s }
        .ev-in-2 { animation-delay:.1s }
        .ev-in-3 { animation-delay:.15s }
        .ev-in-4 { animation-delay:.2s }
        .ev-in-5 { animation-delay:.25s }
        .ev-scale { animation: ev-scale .35s cubic-bezier(.22,1,.36,1) both }
        .ev-slide-r { animation: ev-slide-r .3s cubic-bezier(.22,1,.36,1) both }

        .ev-stat-card { transition: transform .2s, box-shadow .2s }
        .ev-stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px -8px rgba(0,0,0,.12) }

        .ev-tab-btn { position:relative; transition: color .2s, background .2s }
        .ev-tab-btn.active::after { content:''; position:absolute; bottom:-1px; left:16px; right:16px; height:3px; border-radius:3px 3px 0 0; background:currentColor }
        .ev-tab-btn:not(.active):hover { background:rgba(0,0,0,.04) }

        .ev-q-card { transition: transform .18s, box-shadow .18s, border-color .18s }
        .ev-q-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px -6px rgba(0,0,0,.1) }
        .ev-q-card.selected { border-color:#34d399; box-shadow:0 0 0 3px rgba(52,211,153,.16) }

        .ev-build-btn { transition: all .2s }
        .ev-build-btn.active { animation: ev-glow 2s ease infinite }

        .ev-check-anim { animation: ev-badge-in .3s cubic-bezier(.34,1.56,.64,1) both }
        .ev-float { animation: ev-float 3s ease-in-out infinite }

        .ev-progress-bar::after { content:''; display:block; height:100%; border-radius:inherit; background:inherit; animation: ev-progress .8s cubic-bezier(.22,1,.36,1) both; width: var(--w) }

        .ev-table-row { transition: background .15s }
        .ev-table-row:hover { background: #f8fafc }

        .ev-notice-success { animation: ev-in .3s ease both }
        .ev-notice-warn { animation: ev-in .3s ease both }

        .ev-option-row { transition: border-color .15s, background .15s }
        .ev-option-row:focus-within { border-color:#10b981; background:#f0fdf4 }
        .ev-option-row.correct { border-color:#10b981; background:#f0fdf4 }

        .ev-selected-pill { animation: ev-badge-in .25s cubic-bezier(.34,1.56,.64,1) both }

        ::-webkit-scrollbar { width:5px; height:5px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:#d1d5db; border-radius:99px }
        ::-webkit-scrollbar-thumb:hover { background:#9ca3af }
      `}</style>

      <div className="ev-root min-h-screen bg-[#f5f6fa]">

        {/* ══ HEADER ══ */}
        <header className="ev-in sticky top-0 z-30 border-b-2 border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[1680px] px-6 py-4">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-200 ev-float">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="font-['Fraunces',serif] text-xl font-black leading-none text-slate-950">
                    Provas & Simulados
                  </h1>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-600">
                    Avaliação inteligente
                  </p>
                </div>
              </div>

              {/* Quick stats strip */}
              <div className="hidden items-center gap-3 lg:flex">
                {[
                  { icon: ClipboardList, label: 'Provas', value: stats.total, color: 'text-slate-700' },
                  { icon: BookOpen, label: 'Questões', value: stats.bankSize, color: 'text-indigo-700' },
                  { icon: CheckCircle2, label: 'Aprovadas', value: stats.approvedQ, color: 'text-emerald-700' },
                  { icon: TrendingUp, label: 'Média geral', value: `${stats.avgScore.toFixed(1)}`, color: 'text-amber-700' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2">
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</div>
                      <div className={`text-sm font-black ${s.color}`}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-emerald-700">
                <ScanLine className="h-4 w-4" />
                Correção automática
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1680px] px-6 py-6 space-y-6">

          {/* ══ STAT CARDS ══ */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[
                { icon: ClipboardCheck, label: 'Total de Provas', value: stats.total, sub: `${stats.approved} concluídas`, color: 'from-slate-700 to-slate-900', ring: 'ring-slate-200', text: 'text-slate-700' },
                { icon: Award, label: 'Banco de Questões', value: stats.bankSize, sub: `${stats.approvedQ} aprovadas`, color: 'from-indigo-500 to-indigo-700', ring: 'ring-indigo-100', text: 'text-indigo-700' },
                { icon: Target, label: 'Pendentes', value: stats.pending, sub: 'aguardando aplicação', color: 'from-amber-500 to-amber-700', ring: 'ring-amber-100', text: 'text-amber-700' },
                { icon: BarChart3, label: 'Média da Rede', value: `${stats.avgScore.toFixed(1)}`, sub: 'pontos por prova', color: 'from-emerald-500 to-emerald-700', ring: 'ring-emerald-100', text: 'text-emerald-700' },
              ].map((card, i) => (
                <div key={i} className={`ev-in ev-in-${i + 1} ev-stat-card rounded-2xl border-2 border-white bg-white p-5 ring-4 ${card.ring} shadow-sm`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
                      <p className={`mt-2 font-['Fraunces',serif] text-3xl font-black ${card.text}`}>{card.value}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{card.sub}</p>
                    </div>
                    <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${card.color} shadow-md`}>
                      <card.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ WORKSPACE TABS ══ */}
          <div className="ev-in ev-in-2 rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-300">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setWorkspace(tab.id)}
                  className={`ev-tab-btn flex flex-1 items-center justify-center gap-2 border-r border-slate-300 px-4 py-3.5 text-sm font-bold transition-all last:border-r-0 ${workspace === tab.id ? `active ${tab.color} bg-slate-50/80` : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ── BUILDER ── */}
            {workspace === 'builder' && (
              <div className="ev-scale grid gap-0 xl:grid-cols-[1fr_380px]">
                {/* Left: form */}
                <form onSubmit={handleSubmit} className="min-w-0 border-r-2 border-slate-100">
                  {/* Section: Identificação */}
                  <div className="border-b-2 border-slate-100 p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-emerald-500" />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Identificação da Prova</h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="sm:col-span-2 flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-slate-600">Título</span>
                        <input className={inp} placeholder="Ex: Simulado 1 — Matemática 8º Ano" value={draft.title ?? ''} onChange={e => setDraft({ ...draft, title: e.target.value })} required />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-slate-600">Turma</span>
                        <CompactSelect
                          className={inp}
                          value={draft.classId ?? ''}
                          onChange={classId => setDraft({ ...draft, classId })}
                          options={classOptions}
                          dropdownMinWidth={260}
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-slate-600">Disciplina</span>
                        <CompactSelect
                          className={inp}
                          value={draft.subject ?? ''}
                          onChange={subject => setDraft({ ...draft, subject })}
                          options={subjectOptions}
                          dropdownMinWidth={260}
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-slate-600">Nº de Questões</span>
                        <div className="relative">
                          <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input className={`${inp} pl-9`} type="number" min={1} value={draft.questions ?? 10} onChange={e => setDraft({ ...draft, questions: Number(e.target.value) })} required />
                        </div>
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-slate-600">Data de Aplicação</span>
                        <div className="relative">
                          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <DateInput className={`${inp} pl-9`} value={draft.scheduledAt ?? ''} onChange={e => setDraft({ ...draft, scheduledAt: e.target.value })} required />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Section: Modo de montagem */}
                  <div className="border-b-2 border-slate-100 p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-1 w-4 rounded-full bg-indigo-500" />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Modo de Montagem</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'manual_bank' as const, label: 'Manual', desc: 'Selecione do banco', icon: BookOpenCheck, color: 'indigo' },
                        { id: 'automatic_bank' as const, label: 'Automático', desc: 'IA seleciona por filtros', icon: Sparkles, color: 'violet' },
                        { id: 'teacher_created' as const, label: 'Professor', desc: 'Questões próprias', icon: UserRound, color: 'amber' },
                      ].map(m => {
                        const active = buildMode === m.id
                        const colors: Record<string, string> = {
                          indigo: 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-indigo-100',
                          violet: 'border-violet-400 bg-violet-50 text-violet-700 ring-violet-100',
                          amber: 'border-amber-400 bg-amber-50 text-amber-700 ring-amber-100',
                        }
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setBuildMode(m.id)}
                            className={`ev-build-btn flex flex-col items-center gap-2 rounded-xl border-2 p-3.5 text-center transition-all ${active ? `${colors[m.color]} ring-4 ev-build-btn active` : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}
                          >
                            <m.icon className={`h-5 w-5 ${active ? '' : 'text-slate-400'}`} />
                            <div>
                              <div className="text-sm font-black">{m.label}</div>
                              <div className="mt-0.5 text-[10px] font-medium opacity-70">{m.desc}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Section: Auto select */}
                  <div className="border-b-2 border-slate-100 p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-violet-500" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Seleção Automática</h3>
                      </div>
                      <button type="button" onClick={handleAutoSelect} className="inline-flex items-center gap-2 rounded-sm border-2 border-violet-400 bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 transition-all hover:bg-violet-100 active:scale-95">
                        <Sparkles className="h-4 w-4" />
                        Gerar {draft.questions ?? 10} questões
                      </button>
                    </div>
                    <div className="mb-4 grid gap-2 sm:grid-cols-3">
                      {[
                        { id: 'system' as const, label: 'Sistema/Professor', desc: 'Banco interno' },
                        { id: 'enem' as const, label: 'ENEM', desc: 'Somente INEP/ENEM' },
                        { id: 'mixed' as const, label: 'Mesclar', desc: 'ENEM + banco interno' },
                      ].map(origin => {
                        const active = autoFilters.sourceMode === origin.id
                        return (
                          <button
                            key={origin.id}
                            type="button"
                            onClick={() => setAutoFilters({ ...autoFilters, sourceMode: origin.id })}
                            className={`rounded-xl border-2 px-3 py-2 text-left transition-all ${active ? 'border-violet-400 bg-violet-50 text-violet-700 ring-4 ring-violet-100' : 'border-slate-200 bg-white text-slate-500 hover:border-violet-300'}`}
                          >
                            <span className="block text-sm font-black">{origin.label}</span>
                            <span className="mt-0.5 block text-[10px] font-bold opacity-70">{origin.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: 'Ano', value: autoFilters.gradeLevel, key: 'gradeLevel', options: gradeLevelOptions },
                        { label: 'Dificuldade', value: autoFilters.difficulty, key: 'difficulty', options: difficultyOptions },
                        { label: 'Habilidade', value: autoFilters.skillCode, key: 'skillCode', options: skillCodeOptions },
                        { label: 'Descritor', value: autoFilters.descriptorCode, key: 'descriptorCode', options: descriptorCodeOptions },
                      ].map(f => (
                        <label key={f.key} className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</span>
                          <CompactSelect
                            className={inp}
                            value={f.value}
                            onChange={value => setAutoFilters({ ...autoFilters, [f.key]: value })}
                            options={f.options}
                            dropdownMinWidth={f.key === 'skillCode' || f.key === 'descriptorCode' ? 280 : 180}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        { label: `${autoEligible.length} elegíveis`, color: 'bg-violet-100 text-violet-700' },
                        { label: `${inepQuestions.length} ENEM no banco`, color: 'bg-amber-100 text-amber-700' },
                        { label: `${selectedSkillCodes.length} habilidades`, color: 'bg-sky-100 text-sky-700' },
                        { label: `${selectedDescriptorCodes.length} descritores`, color: 'bg-amber-100 text-amber-700' },
                      ].map(b => (
                        <span key={b.label} className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${b.color}`}>{b.label}</span>
                      ))}
                    </div>
                  </div>

                  {/* Section: Manual selection preview */}
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full bg-slate-400" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Questões do Banco</h3>
                      </div>
                      <button type="button" onClick={() => setWorkspace('bank')} className="inline-flex items-center gap-2 rounded-sm border border-slate-400 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:border-indigo-500 hover:text-indigo-600">
                        <Search className="h-4 w-4" />
                        Explorar banco
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {isLoading ? [...Array(3)].map((_, i) => <SkeletonCard key={i} />) : filteredQuestions.slice(0, 3).map(q => (
                        <QuestionRowV2 key={q.id} question={q} selected={selectedQuestionIds.includes(q.id)} onToggle={() => toggleQuestion(q.id)} />
                      ))}
                      {!isLoading && filteredQuestions.length === 0 && (
                        <EmptyState icon={<Search className="h-8 w-8" />} title="Nenhuma questão encontrada" sub="Ajuste os filtros ou explore o banco completo" />
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t-2 border-slate-100 bg-slate-50/80 px-6 py-4">
                    {formNotice && (
                      <div className={`ev-notice-success mb-3 flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold ${formNotice.includes('sucesso') || formNotice.includes('selecionadas') ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                        {formNotice.includes('sucesso') || formNotice.includes('selecionadas') ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                        {formNotice}
                      </div>
                    )}
                    <div className="flex flex-wrap md:justify-end items-center sm:w-full gap-3">
                      <button type="submit" className="inline-flex w-full md:w-auto justify-center min-h-11 items-center gap-2 rounded-sm bg-violet-500 px-6 text-sm font-black text-white shadow-lg shadow-violet-200 transition-all hover:from-violet-600 hover:to-violet-800 hover:shadow-violet-300 active:scale-95">
                        <Plus className="h-4 w-4" />
                        Criar prova
                      </button>
                      <button type="button" onClick={() => setWorkspace('create')} className="inline-flex min-h-11 w-full md:w-auto justify-center items-center gap-2 rounded-sm border border-slate-400 bg-white px-5 text-sm font-bold text-slate-600 transition-all hover:border-violet-400 hover:text-violet-700">
                        <UserRound className="h-4 w-4" />
                        Criar questão
                      </button>
                    </div>
                  </div>
                </form>

                {/* Right: composition panel */}
                <aside className="flex min-h-0 flex-col bg-slate-50/50">
                  <div className="border-b-2 border-slate-100 bg-white px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Composição da Prova</p>
                        <h2 className="mt-0.5 text-base font-black text-slate-900">{selectedQuestions.length} quest{selectedQuestions.length !== 1 ? 'ões' : 'ão'}</h2>
                      </div>
                      {selectedQuestions.length > 0 && (
                        <button type="button" onClick={() => setSelectedQuestionIds([])} className="rounded-lg border-2 border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-600 transition-all hover:bg-red-100">
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-2 gap-2 border-b-2 border-slate-200 p-4">
                    {[
                      { label: 'Tempo est.', value: estimatedMinutes ? `${estimatedMinutes}min` : '—', icon: Clock },
                      { label: 'Habilidades', value: String(selectedSkillCodes.length), icon: Target },
                      { label: 'Descritores', value: String(selectedDescriptorCodes.length), icon: Layers },
                      { label: 'Modo', value: formatBuildMode(buildMode), icon: Star },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl border-2 border-slate-300 bg-white p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <s.icon className="h-3 w-3" />
                          {s.label}
                        </div>
                        <div className="mt-1 text-sm font-black text-slate-800">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Selected questions list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {selectedQuestions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                        <div className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white">
                          <ClipboardList className="h-6 w-6 text-slate-300" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-400">Prova vazia</p>
                          <p className="text-xs text-slate-300">Selecione questões do banco</p>
                        </div>
                      </div>
                    ) : selectedQuestions.map((q, idx) => (
                      <div key={q.id} className="ev-selected-pill group flex items-start gap-3 rounded-xl border-2 border-slate-300 bg-white p-3 transition-all hover:border-emerald-300">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{q.title}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${diffColor(q.difficulty)}`}>{formatDifficulty(q.difficulty)}</span>
                            {getSkillCodes(q).slice(0, 1).map(c => <span key={c} className="rounded-md border border-sky-300 bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{c}</span>)}
                          </div>
                        </div>
                        <button type="button" onClick={() => toggleQuestion(q.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-400 text-slate-400 opacity-0 transition-all hover:border-red-500 hover:text-red-500 group-hover:opacity-100">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
            )}

            {/* ── BANK ── */}
            {workspace === 'bank' && (
              <div className="ev-scale p-6 space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-300 bg-indigo-50/40 p-4">
                  <div>
                    <h2 className="font-['Fraunces',serif] text-lg font-black text-slate-900">Banco de Questões</h2>
                    <p className="text-sm text-slate-500">{filteredQuestions.length} de {questionBank.length} questões</p>
                  </div>
                  <button type="button" onClick={() => setWorkspace('builder')} className="inline-flex items-center gap-2 rounded-sm bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition-all hover:bg-blue-800 active:scale-95">
                    <CheckCircle2 className="h-4 w-4" />
                    Usar seleção ({selectedQuestionIds.length})
                  </button>
                </div>

                {/* Filters */}
                <div className="rounded-2xl border border-slate-300 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Filtros</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                    <label className="col-span-2 sm:col-span-3 lg:col-span-2 flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500">Busca</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className={`${inp} pl-9`} value={bankFilters.search} onChange={e => setBankFilters({ ...bankFilters, search: e.target.value })} placeholder="Título, enunciado, código…" />
                      </div>
                    </label>
                    {[
                      { label: 'Ano', key: 'gradeLevel', options: gradeLevelOptions },
                      { label: 'Dificuldade', key: 'difficulty', options: difficultyOptions },
                      { label: 'Status', key: 'status', options: questionStatusOptions },
                      { label: 'Fonte', key: 'sourceType', options: sourceTypeOptions },
                      { label: 'Habilidade', key: 'skillCode', options: skillCodeOptions },
                    ].map(f => (
                      <label key={f.key} className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-slate-600">{f.label}</span>
                        <CompactSelect
                          className={inp}
                          value={(bankFilters as Record<string, string>)[f.key]}
                          onChange={value => setBankFilters({ ...bankFilters, [f.key]: value })}
                          options={f.options}
                          dropdownMinWidth={f.key === 'skillCode' ? 280 : 180}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Questions grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {isLoading ? [...Array(4)].map((_, i) => <SkeletonCard key={i} />) :
                    filteredQuestions.map(q => (
                      <QuestionCardV2 key={q.id} question={q} selected={selectedQuestionIds.includes(q.id)} onToggle={() => toggleQuestion(q.id)} />
                    ))
                  }
                  {!isLoading && filteredQuestions.length === 0 && (
                    <div className="col-span-2">
                      <EmptyState icon={<BookOpen className="h-8 w-8" />} title="Nenhuma questão encontrada" sub="Tente outros filtros ou crie uma questão" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── INEP ── */}
            {workspace === 'inep' && (
              <div className="ev-scale p-6 space-y-5">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50/40 p-4">
                  <div>
                    <h2 className="font-['Fraunces',serif] text-lg font-black text-slate-900">INEP / ENEM</h2>
                    <p className="text-sm text-slate-500">Questões oficiais e plano de importação</p>
                  </div>
                  <button type="button" onClick={() => { setBankFilters({ ...bankFilters, sourceType: 'INEP_ENEM' }); setWorkspace('bank') }} className="inline-flex items-center gap-2 rounded-sm bg-blue-700 px-4 py-2.5 text-sm font-black text-white transition-all hover:bg-blue-800 active:scale-95">
                    <ClipboardList className="h-4 w-4" />
                    Ver no banco
                  </button>
                </div>

                {inepPlan ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      {inepPlan.itemsToImport.map(item => (
                        <div key={`${item.sourceYear}-${item.examDay}`} className="rounded-2xl border border-slate-300 bg-white p-4 space-y-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ENEM {item.sourceYear}</p>
                            <p className="mt-1 text-sm font-black text-slate-900">Dia {item.examDay} — {item.notebookColor}</p>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 rounded-lg border border-slate-300 bg-slate-50 p-2 text-center">
                              <div className="text-[9px] font-bold text-slate-400">Previstas</div>
                              <div className="text-base font-black text-slate-800">{item.quantity}</div>
                            </div>
                            <div className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-center">
                              <div className="text-[9px] font-bold text-emerald-500">No banco</div>
                              <div className="text-base font-black text-emerald-700">{item.importedCount}</div>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${item.quantity > 0 ? Math.min(100, (item.importedCount / item.quantity) * 100) : 0}%` }} />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400">{item.quantity > 0 ? Math.round((item.importedCount / item.quantity) * 100) : 0}% importado</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {inepQuestions.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-sm font-black text-slate-700">Questões INEP no banco ({inepQuestions.length})</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {inepQuestions.slice(0, 6).map(q => (
                            <QuestionCardV2 key={q.id} question={q} selected={selectedQuestionIds.includes(q.id)} onToggle={() => toggleQuestion(q.id)} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState icon={<FileDown className="h-8 w-8" />} title="Plano INEP não encontrado" sub="Nenhum plano de importação ativo localizado" />
                )}
              </div>
            )}

            {/* ── CREATE QUESTION ── */}
            {workspace === 'create' && (
              <form onSubmit={handleTeacherQuestionSubmit} className="ev-scale">
                <div className="border-b-2 border-slate-100 p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <div className="h-1 w-4 rounded-full bg-violet-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Identificação & Configuração</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="lg:col-span-2 flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Título da questão</span>
                      <input className={inp} value={teacherQuestionDraft.title} onChange={e => setTeacherQuestionDraft({ ...teacherQuestionDraft, title: e.target.value })} placeholder="Ex: Porcentagem — Desconto em compras" required />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Ano escolar</span>
                      <input className={inp} value={teacherQuestionDraft.gradeLevel} onChange={e => setTeacherQuestionDraft({ ...teacherQuestionDraft, gradeLevel: e.target.value })} required />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Dificuldade</span>
                      <CompactSelect<Difficulty>
                        className={inp}
                        value={teacherQuestionDraft.difficulty}
                        onChange={difficulty => setTeacherQuestionDraft({ ...teacherQuestionDraft, difficulty })}
                        options={teacherDifficultyOptions}
                        dropdownMinWidth={180}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Visibilidade</span>
                      <CompactSelect<QuestionVisibility>
                        className={inp}
                        value={teacherQuestionDraft.visibility}
                        onChange={visibility => setTeacherQuestionDraft({ ...teacherQuestionDraft, visibility })}
                        options={teacherVisibilityOptions}
                        dropdownMinWidth={180}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Status</span>
                      <CompactSelect<QuestionStatus>
                        className={inp}
                        value={teacherQuestionDraft.status}
                        onChange={status => setTeacherQuestionDraft({ ...teacherQuestionDraft, status })}
                        options={teacherStatusOptions}
                        dropdownMinWidth={200}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Habilidade BNCC</span>
                      <CompactSelect
                        className={inp}
                        value={teacherSkillId}
                        onChange={skillId => setTeacherQuestionDraft({ ...teacherQuestionDraft, skillId })}
                        options={teacherSkillOptions}
                        placeholder="Selecione a habilidade"
                        dropdownMinWidth={320}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Descritor</span>
                      <CompactSelect
                        className={inp}
                        value={teacherDescriptorId}
                        onChange={descriptorId => setTeacherQuestionDraft({ ...teacherQuestionDraft, descriptorId })}
                        options={teacherDescriptorOptions}
                        placeholder="Selecione o descritor"
                        dropdownMinWidth={320}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Tempo estimado (s)</span>
                      <div className="relative">
                        <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className={`${inp} pl-9`} type="number" min={30} step={15} value={teacherQuestionDraft.estimatedTimeSeconds} onChange={e => setTeacherQuestionDraft({ ...teacherQuestionDraft, estimatedTimeSeconds: Number(e.target.value) })} />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="border-b-2 border-slate-100 p-6 grid gap-4 sm:grid-cols-2">
                  <div className="mb-5 sm:col-span-2 flex items-center gap-2">
                    <div className="h-1 w-4 rounded-full bg-indigo-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Conteúdo da Questão</h3>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Contexto <span className="text-slate-400 font-normal">(opcional)</span></span>
                    <textarea className={inp2} value={teacherQuestionDraft.context} onChange={e => setTeacherQuestionDraft({ ...teacherQuestionDraft, context: e.target.value })} placeholder="Texto de apoio, situação problema…" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Explicação / Gabarito comentado</span>
                    <textarea className={inp2} value={teacherQuestionDraft.explanation} onChange={e => setTeacherQuestionDraft({ ...teacherQuestionDraft, explanation: e.target.value })} placeholder="Explique a resposta correta…" />
                  </label>
                  <label className="sm:col-span-2 flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Enunciado</span>
                    <textarea className={`${inp2} min-h-28`} value={teacherQuestionDraft.statement} onChange={e => setTeacherQuestionDraft({ ...teacherQuestionDraft, statement: e.target.value })} placeholder="Enuncie a questão aqui…" required />
                  </label>
                </div>

                <div className="border-b-2 border-slate-100 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-1 w-4 rounded-full bg-amber-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Alternativas — marque a correta</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {optionLabels.map(label => {
                      const isCorrect = teacherQuestionDraft.correctOption === label
                      return (
                        <label key={label} className={`ev-option-row flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${isCorrect ? 'correct' : 'border-slate-200 bg-slate-50'}`}>
                          <input type="radio" name="correctOption" value={label} checked={isCorrect} onChange={() => setTeacherQuestionDraft({ ...teacherQuestionDraft, correctOption: label })} className="h-4 w-4 accent-emerald-600" />
                          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-black transition-colors ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{label}</div>
                          <input className="min-h-9 min-w-0 flex-1 rounded-lg border-2 border-transparent bg-transparent px-2 text-sm font-medium text-slate-900 outline-none transition-all focus:border-emerald-400 focus:bg-white" value={teacherQuestionDraft.options[label]} onChange={e => updateOption(label, e.target.value)} placeholder={`Alternativa ${label}…`} required />
                          {isCorrect && <Check className="h-4 w-4 shrink-0 text-emerald-600 ev-check-anim" />}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="border-b-2 border-slate-100 p-6 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Palavras-chave <span className="text-slate-400 font-normal">(separadas por vírgula)</span></span>
                    <input className={inp} value={teacherQuestionDraft.keywords} onChange={e => setTeacherQuestionDraft({ ...teacherQuestionDraft, keywords: e.target.value })} placeholder="porcentagem, desconto, razão…" />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Fonte</span>
                    <input className={inp} value={teacherQuestionDraft.sourceName} onChange={e => setTeacherQuestionDraft({ ...teacherQuestionDraft, sourceName: e.target.value })} />
                  </label>
                </div>

                <div className="bg-slate-50/80 px-6 py-4">
                  {questionFormError && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {questionFormError}
                    </div>
                  )}
                  <div className="flex flex-wrap md:justify-end sm:justify-center gap-3">
                    <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-violet-500 px-6 text-sm font-black text-white shadow-lg shadow-violet-200 transition-all hover:from-violet-600 hover:to-violet-800 active:scale-95">
                      <Save className="h-4 w-4" />
                      Adicionar ao banco
                    </button>
                    <button type="button" onClick={() => setWorkspace('builder')} className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-slate-400 bg-white px-5 text-sm font-bold text-slate-600 transition-all hover:border-slate-500">
                      Voltar ao builder
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* ══ EVALUATIONS TABLE ══ */}
          <div className="ev-in ev-in-4 rounded-2xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b-2 border-slate-200 bg-slate-50/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-md">
                  <ClipboardList className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-['Fraunces',serif] text-base font-black text-slate-900">Provas cadastradas</h2>
                  <p className="text-xs text-slate-400">{filteredEvaluations.length} resultado{filteredEvaluations.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {['all', 'planejado', 'em_aplicacao', 'corrigindo', 'concluido'].map(s => (
                  <button key={s} type="button" onClick={() => setStatusFilter(s)} className={`rounded-xl border-2 px-3 py-1.5 text-[11px] font-black transition-all ${statusFilter === s ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                    {s === 'all' ? 'Todos' : s === 'planejado' ? 'Planejado' : s === 'em_aplicacao' ? 'Em aplicação' : s === 'corrigindo' ? 'Corrigindo' : 'Concluído'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    {['Título', 'Turma', 'Disciplina', 'Modo', 'Questões', 'Correção', 'Média', 'Status', 'Acoes'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {[...Array(9)].map((_, j) => (
                          <td key={j} className="px-4 py-3.5"><Skeleton className={`h-4 ${j === 0 ? 'w-32' : 'w-16'}`} /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <EmptyState icon={<ClipboardList className="h-8 w-8" />} title="Nenhuma prova encontrada" sub="Crie sua primeira prova no montador acima" />
                      </td>
                    </tr>
                  ) : filteredEvaluations.map(ev => {
                    const pqs = getEvaluationQuestions(ev)
                    const corrPct = ev.participants > 0 ? (ev.corrected / ev.participants) * 100 : 0
                    return (
                      <tr key={ev.id} className="ev-table-row border-b border-slate-100">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                          <p className="text-[10px] text-slate-400">{formatPrintDate(ev.scheduledAt)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-sm text-slate-600">{getClassName(ev.classId)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">{ev.subject}</td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${buildModeColor(ev.buildMode)}`}>
                            {formatBuildMode(ev.buildMode)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-bold text-slate-700">{ev.questions}</td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-1">
                            <p className="text-sm text-slate-600">{ev.corrected}/{ev.participants}</p>
                            <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${corrPct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-black ${ev.averageScore >= 7 ? 'text-emerald-600' : ev.averageScore >= 5 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {ev.averageScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${statusColor(ev.status)}`}>
                            {ev.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <button type="button" disabled={pqs.length === 0} onClick={() => handleExportEvaluation(ev)} className="inline-flex items-center gap-1.5 rounded-sm border border-slate-400 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 transition-all hover:border-emerald-500 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95">
                              <FileDown className="h-3.5 w-3.5" />
                              Exportar
                            </button>
                            <button type="button" disabled={deletingEvaluationId === ev.id} onClick={() => void handleDeleteEvaluation(ev)} className="inline-flex items-center gap-1.5 rounded-sm border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-black text-red-600 transition-all hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95">
                              <Trash2 className="h-3.5 w-3.5" />
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
      </div>
    </>
  )
}

/* ─── Sub-components ────────────────────────── */
function QuestionRowV2({ question, selected, onToggle }: { question: Question; selected: boolean; onToggle: () => void }) {
  return (
    <div className={`ev-q-card flex items-start gap-3 rounded-lg border bg-white p-3.5 cursor-pointer ${selected ? 'selected' : 'border-slate-300 hover:border-slate-500'}`} onClick={onToggle}>
      <div className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all ${selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
        {selected && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black ${diffColor(question.difficulty)}`}>{formatDifficulty(question.difficulty)}</span>
          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black ${statusColor(question.status)}`}>{formatQStatus(question.status)}</span>
        </div>
        <p className="text-sm font-bold text-slate-900 leading-snug">{question.title}</p>
        <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{question.statement}</p>
      </div>
    </div>
  )
}

function QuestionCardV2({ question, selected, onToggle }: { question: Question; selected: boolean; onToggle: () => void }) {
  const correctOpt = question.options.find(o => o.isCorrect)
  return (
    <article className={`ev-q-card rounded-2xl bg-white p-5 ${selected ? 'selected border-2 border-emerald-400' : 'border border-slate-300'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${diffColor(question.difficulty)}`}>{formatDifficulty(question.difficulty)}</span>
          <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${statusColor(question.status)}`}>{formatQStatus(question.status)}</span>
          <span className="rounded-lg border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{formatSourceType(question.sourceType)}</span>
        </div>
        <button type="button" onClick={onToggle} className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-black transition-all active:scale-95 ${selected ? 'border-red-400 bg-red-50 text-red-600 hover:bg-red-100' : 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
          {selected ? <><X className="h-3.5 w-3.5" />Remover</> : <><Plus className="h-3.5 w-3.5" />Selecionar</>}
        </button>
      </div>
      <h3 className="text-sm font-black text-slate-950 leading-snug mb-1">{question.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{question.statement}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {getSkillCodes(question).map(c => <span key={c} className="rounded-md border border-sky-300 bg-sky-100 px-1.5 py-0.5 text-[10px] font-black text-sky-700">{c}</span>)}
        {getDescriptorCodes(question).map(c => <span key={c} className="rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700">{c}</span>)}
      </div>
      <div className="space-y-1.5">
        {question.options.slice(0, 4).map(o => (
          <div key={o.id} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${o.isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-slate-300 bg-slate-50 text-slate-600'}`}>
            <span className="shrink-0 font-black">{o.label}</span>
            <span className="line-clamp-1">{o.text}</span>
            {o.isCorrect && <Check className="h-3.5 w-3.5 shrink-0 ml-auto text-emerald-600" />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-3 text-[10px] font-bold text-slate-400">
        <span>{question.gradeLevel} · {question.subject}</span>
        <span>Resposta: {correctOpt?.label ?? '—'}</span>
      </div>
    </article>
  )
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-300">
        {icon}
      </div>
      <div>
        <p className="text-sm font-black text-slate-500">{title}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  )
}
