import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Hash,
  ListChecks,
  Loader2,
  School,
  Star,
  Target,
  TrendingUp,
  UserRound,
  X,
  Activity,
  BarChart3,
  ChevronRight,
  ScanLine,
  Sparkles,
} from 'lucide-react'

import { resolveApiAssetUrl } from '../../api'
import { formatClassGrade } from '../../class-grade-options'
import {
  getAcademicSubjectLabel,
} from '../../components/role-portal/portal-components'
import { DEFAULT_PAGE_SIZE, PaginationControls, paginateLocal } from '../../components/ui/pagination-controls'
import { uniqueSafePrintableImages } from '../../lib/markdown-media-security'
import type { Evaluation, EvaluationAnswerKeyItem, EvaluationCorrection, Question, Student } from '../../types'
import type { RolePortalScreenModel } from './screen-model'

/* ─── Types ─────────────────────────────────────────────────────────────── */

type ConfirmedGradeRow = {
  correction: EvaluationCorrection
  evaluation: Evaluation | null
  subject: string
  score: number
  questions: Question[]
  answerKey: EvaluationAnswerKeyItem[]
}

type PrintableImage = { url: string; alt: string }
type OptionPrintableImage = PrintableImage & {
  optionId?: string
  optionLabel?: string
  optionOrder?: number
}

/* ─── Formatters ─────────────────────────────────────────────────────────── */

function formatScore(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

const markdownImagePattern = /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/|\/)[^\s)]+)\)/gi

function cleanPreviewText(value?: string | null) {
  return String(value ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

function extractMarkdownImages(value?: string | null) {
  const images: PrintableImage[] = []
  const text = String(value ?? '').replace(markdownImagePattern, (_m, alt, url) => {
    images.push({ url: String(url), alt: String(alt || 'Imagem da questão') })
    return '\n'
  })
  return { text: cleanPreviewText(text), images }
}

function uniquePrintableImages(images: PrintableImage[]) {
  return uniqueSafePrintableImages(images, {
    resolveRelativeUrl: (url) => resolveApiAssetUrl(url),
    allowBlob: true,
  })

  const seen = new Set<string>()
  return images.reduce<PrintableImage[]>((acc, img) => {
    const orig = String(img.url ?? '').trim()
    const url = resolveApiAssetUrl(orig) ?? orig
    const ok = /^(https?:\/\/|data:image\/[a-z0-9.+-]+;base64,|blob:)/i.test(url)
    if (!ok || seen.has(url)) return acc
    seen.add(url)
    acc.push({ url, alt: cleanPreviewText(img.alt || 'Imagem da questão') })
    return acc
  }, [])
}

function getAttachmentImages(question: Question, positions: Array<Question['attachments'][number]['position']>): PrintableImage[] {
  return (question.attachments ?? [])
    .filter(a => a.fileType === 'IMAGE' && positions.includes(a.position))
    .map(a => ({ url: a.fileUrl, alt: a.altText || 'Imagem da questão' }))
}

function getOptionAttachmentImages(question: Question): OptionPrintableImage[] {
  return (question.attachments ?? [])
    .filter(a => a.fileType === 'IMAGE' && a.position === 'OPTION')
    .map(a => {
      const m = a.metadata ?? {}
      const optionLabel = String(m.optionLabel ?? m.option ?? m.alternative ?? m.alternativa ?? '').trim().toUpperCase()
      const optionId = String(m.optionId ?? m.option_id ?? '').trim()
      const optionOrder = Number(m.optionOrder ?? m.order ?? a.order)
      const altLabel = a.altText?.match(/\b([A-E])\b/i)?.[1]?.toUpperCase()
      return {
        url: a.fileUrl,
        alt: a.altText || `Imagem da alternativa ${optionLabel || altLabel || ''}`.trim(),
        optionId, optionLabel: optionLabel || altLabel,
        optionOrder: Number.isFinite(optionOrder) ? optionOrder : undefined,
      }
    })
}

function getImagesForOption(option: Question['options'][number], index: number, images: OptionPrintableImage[]) {
  const explicit = images.filter(i =>
    (i.optionId && i.optionId === option.id) ||
    (i.optionLabel && i.optionLabel === option.label.toUpperCase()) ||
    (i.optionOrder && i.optionOrder === option.order),
  )
  if (explicit.length) return explicit
  const noTarget = images.filter(i => !i.optionId && !i.optionLabel && !i.optionOrder)
  return noTarget[index] ? [noTarget[index]] : []
}

function resolveQuestions(evaluation: Evaluation | null, questionBank: Question[]) {
  if (!evaluation) return []
  if (evaluation.questionSnapshots?.length) return evaluation.questionSnapshots
  const byId = new Map(questionBank.map(q => [q.id, q]))
  return (evaluation.questionIds ?? []).map(id => byId.get(id)).filter((q): q is Question => Boolean(q))
}

function resolveAnswerKey(correction: EvaluationCorrection, questions: Question[]) {
  if (correction.answerKey?.length) {
    return [...correction.answerKey].sort((a, b) => a.questionNumber - b.questionNumber)
  }
  return questions.map<EvaluationAnswerKeyItem | null>((q, i) => {
    const correct = [...(q.options ?? [])].sort((a, b) => a.order - b.order).find(o => o.isCorrect)
    if (!correct) return null
    return { questionNumber: i + 1, questionId: q.id, correctOption: String(correct.label ?? '').trim().toUpperCase() }
  }).filter((item): item is EvaluationAnswerKeyItem => Boolean(item))
}

/* ─── Tones & pills ──────────────────────────────────────────────────────── */

function scorePill(score: number) {
  if (score >= 8) return 'border-emerald-400 bg-emerald-50 text-emerald-700'
  if (score >= 6) return 'border-amber-400 bg-amber-50 text-amber-700'
  return 'border-rose-400 bg-rose-50 text-rose-700'
}

function scoreBar(score: number) {
  if (score >= 8) return 'bg-emerald-500'
  if (score >= 6) return 'bg-amber-400'
  return 'bg-rose-500'
}

function answerTone(isCorrect?: boolean | null) {
  if (isCorrect == null) return 'border-stone-300 bg-white text-stone-500'
  return isCorrect
    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
    : 'border-rose-300 bg-rose-50 text-rose-700'
}

function answerStatusLabel(isCorrect?: boolean | null) {
  if (isCorrect == null) return 'Não lida'
  return isCorrect ? 'Certa' : 'Errada'
}

/* ─── Eyebrow ────────────────────────────────────────────────────────────── */

function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold tracking-[.16em] uppercase text-stone-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

/* ─── EmptyState ─────────────────────────────────────────────────────────── */

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white text-stone-400">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-600 font-['DM_Sans']">{title}</p>
        <p className="text-xs text-stone-400 mt-0.5 font-['DM_Sans']">{sub}</p>
      </div>
    </div>
  )
}

/* ─── Bone / Shimmer ─────────────────────────────────────────────────────── */

function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-stone-200 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  )
}

/* ─── QuestionMedia ──────────────────────────────────────────────────────── */

function QuestionMedia({ images }: { images: PrintableImage[] }) {
  const visible = uniquePrintableImages(images)
  if (!visible.length) return null
  return (
    <div className="grid gap-3">
      {visible.map(img => (
        <figure key={img.url} className="overflow-hidden rounded-xl border border-stone-200 bg-white p-2">
          <img src={img.url} alt={img.alt} referrerPolicy="no-referrer" loading="eager"
            className="max-h-[320px] w-full object-contain" />
        </figure>
      ))}
    </div>
  )
}

function QuestionTextMediaBlock({ value, images = [], textClassName }: {
  value?: string | null; images?: PrintableImage[]; textClassName: string
}) {
  const extracted = extractMarkdownImages(value)
  const visible = uniquePrintableImages([...extracted.images, ...images])
  if (!extracted.text && visible.length === 0) return null
  return (
    <div className="grid gap-3">
      {extracted.text && <p className={textClassName}>{extracted.text}</p>}
      <QuestionMedia images={visible} />
    </div>
  )
}

function getQuestionMainText(q: Question) {
  return q.statement?.trim() || q.title?.trim() || q.context?.trim() || 'Questão sem enunciado'
}

function getQuestionContext(q: Question) {
  const c = q.context?.trim()
  const s = q.statement?.trim()
  if (!c || c === s) return ''
  return c
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */

function GradeDetailModal({
  row, downloading, onClose, onDownloadEvaluation, onDownloadAnswerKey,
}: {
  row: ConfirmedGradeRow
  downloading: 'evaluation' | 'answer_key' | null
  onClose: () => void
  onDownloadEvaluation: (row: ConfirmedGradeRow) => void
  onDownloadAnswerKey: (row: ConfirmedGradeRow) => void
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  if (typeof document === 'undefined') return null

  const detectedByQuestion = new Map((row.correction.detectedAnswers ?? []).map(a => [a.questionNumber, a]))
  const correctPct = row.correction.totalQuestions > 0
    ? Math.round((row.correction.correctCount / row.correction.totalQuestions) * 100)
    : 0

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      style={{ background: 'rgba(15,23,42,0.22)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-3 duration-200">

        {/* Gradient accent strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 shrink-0" />

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50">
              <Eye className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <Eyebrow className="text-indigo-400">Prova corrigida</Eyebrow>
              <h3 className="truncate text-sm font-semibold text-stone-900 font-['DM_Sans']">
                {row.evaluation?.title ?? 'Prova não localizada'}
              </h3>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-stone-300 bg-white text-stone-500 transition hover:border-rose-300 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-stone-100 p-4 space-y-4">

          {/* Hero card */}
          <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
            <div className="grid gap-0 divide-y divide-stone-200 sm:grid-cols-[1fr_1fr_auto] sm:divide-x sm:divide-y-0">
              {/* Matéria + status */}
              <div className="p-5">
                <Eyebrow className="mb-2">Matéria</Eyebrow>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 font-['DM_Sans']">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-500" /> {row.subject}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 font-['DM_Sans']">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirmada
                  </span>
                </div>
              </div>

              {/* Data */}
              <div className="p-5">
                <Eyebrow className="mb-2">Data</Eyebrow>
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-700 font-['DM_Sans']">
                  <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                  {formatDate(row.evaluation?.scheduledAt ?? row.correction.reviewedAt)}
                </p>
              </div>

              {/* Nota */}
              <div className="flex flex-col justify-center p-5 min-w-[160px]">
                <Eyebrow className="mb-1">Nota final</Eyebrow>
                <p className={`text-4xl font-bold leading-none font-['Lora'] ${scorePill(row.score).includes('emerald') ? 'text-emerald-700' : scorePill(row.score).includes('amber') ? 'text-amber-700' : 'text-rose-700'}`}>
                  {formatScore(row.score)}
                </p>
              </div>
            </div>

            {/* Acertos + downloads */}
            <div className="border-t border-stone-200 bg-stone-50 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Eyebrow className="mb-2">Resultado da leitura</Eyebrow>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-stone-200">
                      <div className={`h-full rounded-full transition-all duration-700 ${scoreBar(row.score)}`}
                        style={{ width: `${correctPct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-stone-600 font-['DM_Sans']">
                      {row.correction.correctCount}/{row.correction.totalQuestions} acertos · {correctPct}%
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={!row.evaluation || downloading === 'evaluation'}
                    onClick={() => onDownloadEvaluation(row)}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-['DM_Sans']">
                    {downloading === 'evaluation' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Baixar prova
                  </button>
                  <button type="button" disabled={!row.evaluation || downloading === 'answer_key'}
                    onClick={() => onDownloadAnswerKey(row)}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed font-['DM_Sans']">
                    {downloading === 'answer_key' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Baixar gabarito
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Questões + Gabarito */}
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">

            {/* Visualização da prova */}
            <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-stone-500" />
                  <Eyebrow>Visualização da prova</Eyebrow>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-400 font-['DM_Sans']">
                  <Hash className="h-3 w-3" /> {row.questions.length} questões
                </span>
              </div>

              {row.questions.length === 0 ? (
                <div className="p-8">
                  <EmptyState icon={<FileText className="h-6 w-6" />}
                    title="Questões não disponíveis"
                    sub="O PDF completo está disponível no botão Baixar prova." />
                </div>
              ) : (
                <div className="max-h-[440px] overflow-y-auto divide-y divide-stone-100">
                  {row.questions.map((question, idx) => {
                    const context = getQuestionContext(question)
                    const mainText = getQuestionMainText(question)
                    const contextImages = context ? getAttachmentImages(question, ['CONTEXT']) : []
                    const mainImages = question.statement?.trim()
                      ? getAttachmentImages(question, ['STATEMENT'])
                      : mainText === question.context?.trim()
                        ? getAttachmentImages(question, ['CONTEXT'])
                        : []
                    const optionImages = getOptionAttachmentImages(question)
                    const answer = row.answerKey.find(a => a.questionId === question.id || a.questionNumber === idx + 1)
                    return (
                      <article key={`${question.id}-${idx}`} className="group/q p-5 transition hover:bg-indigo-50/30">
                        <div className="flex items-start gap-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-700 transition group-hover/q:border-indigo-300 group-hover/q:bg-indigo-600 group-hover/q:text-white font-['DM_Sans']">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            {context && (
                              <div className="mb-3">
                                <QuestionTextMediaBlock value={context} images={contextImages}
                                  textClassName="whitespace-pre-wrap text-xs font-medium leading-relaxed text-stone-500 font-['DM_Sans']" />
                              </div>
                            )}
                            <QuestionTextMediaBlock value={mainText} images={mainImages}
                              textClassName="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-stone-900 font-['DM_Sans']" />
                            <div className="mt-3 grid gap-1.5">
                              {[...(question.options ?? [])].sort((a, b) => a.order - b.order).map((opt, oi) => {
                                const isCorrect = answer?.correctOption === opt.label
                                return (
                                  <div key={opt.id}
                                    className={`grid grid-cols-[24px_1fr] gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition
                                      ${isCorrect
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                        : 'border-stone-200 bg-white text-stone-600'}`}
                                  >
                                    <strong className="font-bold font-['DM_Sans']">{opt.label}</strong>
                                    <QuestionTextMediaBlock
                                      value={opt.text || 'Alternativa sem texto'}
                                      images={getImagesForOption(opt, oi, optionImages)}
                                      textClassName="whitespace-pre-wrap text-xs font-medium leading-relaxed font-['DM_Sans']"
                                    />
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Gabarito e Correção */}
            <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-stone-500" />
                  <Eyebrow>Gabarito e Correção</Eyebrow>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-400 font-['DM_Sans']">
                  <Hash className="h-3 w-3" /> {row.answerKey.length} itens
                </span>
              </div>

              {row.answerKey.length === 0 ? (
                <div className="p-8">
                  <EmptyState icon={<Target className="h-6 w-6" />}
                    title="Gabarito não disponível" sub="Nenhum item retornado pela API." />
                </div>
              ) : (
                <div className="max-h-[440px] overflow-y-auto">
                  {/* Table header */}
                  <div className="grid grid-cols-[40px_64px_64px_1fr] gap-2 border-b border-stone-200 bg-stone-50/70 px-4 py-2">
                    {['Nº', 'Gabarito', 'Marcada', 'Status'].map(h => (
                      <span key={h} className="text-[10px] font-semibold tracking-wide uppercase text-stone-400 font-['DM_Sans']">{h}</span>
                    ))}
                  </div>
                  <div className="divide-y divide-stone-100">
                    {row.answerKey.map((ans, i) => {
                      const detected = detectedByQuestion.get(ans.questionNumber)
                      return (
                        <div key={`${ans.questionId}-${ans.questionNumber}`}
                          style={{ animationDelay: `${i * 10}ms` }}
                          className={`grid grid-cols-[40px_64px_64px_1fr] items-center gap-2 px-4 py-2.5 animate-in fade-in duration-150 fill-mode-both transition-colors
                            ${detected?.isCorrect === true ? 'bg-white hover:bg-stone-50' : detected?.isCorrect === false ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'bg-white'}`}
                        >
                          <span className="text-[11px] font-semibold text-stone-400 font-['DM_Sans']">#{ans.questionNumber}</span>
                          <span className="w-8 h-8 flex items-center justify-center rounded-lg border border-stone-300 bg-white text-sm font-bold text-stone-700 font-['DM_Sans']">
                            {ans.correctOption}
                          </span>
                          <span className={`w-8 h-8 flex items-center justify-center rounded-lg border text-sm font-bold font-['DM_Sans'] ${answerTone(detected?.isCorrect)}`}>
                            {detected?.detectedOption ?? '—'}
                          </span>
                          <span className={`text-[11px] font-semibold inline-flex items-center px-2 py-0.5 rounded border font-['DM_Sans'] ${answerTone(detected?.isCorrect)}`}>
                            {answerStatusLabel(detected?.isCorrect)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ─── StudentGradesView — main ───────────────────────────────────────────── */

export function StudentGradesView({ model }: { model: RolePortalScreenModel }) {
  const {
    currentUser, students, classes, evaluationsData,
    selectedStudent, getSchoolName, getClassName,
    onDownloadEvaluation, onDownloadAnswerKey,
  } = model

  const [gradePage, setGradePage] = useState(1)
  const [gradeLimit, setGradeLimit] = useState(DEFAULT_PAGE_SIZE)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<'evaluation' | 'answer_key' | null>(null)

  const student = selectedStudent
    ?? students.find(s => s.id === currentUser.linkedStudentId || s.userId === currentUser.id)
    ?? students[0]

  const evaluations = evaluationsData?.evaluations ?? []
  const corrections = evaluationsData?.evaluationCorrections ?? []
  const curriculumSkills = evaluationsData?.curriculumSkills ?? []
  const questionBank = evaluationsData?.questionBank ?? []
  const evaluationById = useMemo(() => new Map(evaluations.map(e => [e.id, e])), [evaluations])
  const classRoom = student ? classes.find(c => c.id === student.classId) : undefined

  const confirmedRows: ConfirmedGradeRow[] = useMemo(() => (
    student
      ? corrections
          .filter(c => c.studentId === student.id && c.status === 'CONFIRMED' && c.finalScore != null)
          .map(correction => {
            const evaluation = evaluationById.get(correction.evaluationId) ?? null
            const questions = resolveQuestions(evaluation, questionBank)
            return {
              correction, evaluation,
              subject: getAcademicSubjectLabel(evaluation?.subject ?? correction.subject, curriculumSkills) || 'Matéria não informada',
              score: Number(correction.finalScore ?? 0),
              questions,
              answerKey: resolveAnswerKey(correction, questions),
            }
          })
          .sort((a, b) => {
            const da = a.evaluation?.scheduledAt ?? a.correction.reviewedAt ?? a.correction.updatedAt
            const db = b.evaluation?.scheduledAt ?? b.correction.reviewedAt ?? b.correction.updatedAt
            return String(db ?? '').localeCompare(String(da ?? ''))
          })
      : []
  ), [corrections, curriculumSkills, evaluationById, questionBank, student])

  const average = confirmedRows.length
    ? confirmedRows.reduce((t, r) => t + r.score, 0) / confirmedRows.length
    : null

  const highest = confirmedRows.length ? Math.max(...confirmedRows.map(r => r.score)) : null
  const lowest  = confirmedRows.length ? Math.min(...confirmedRows.map(r => r.score)) : null

  const gradePageData = useMemo(
    () => paginateLocal(confirmedRows, gradePage, gradeLimit),
    [confirmedRows, gradeLimit, gradePage],
  )
  const visibleRows = gradePageData.items
  const selectedRow = selectedRowId
    ? confirmedRows.find(r => r.correction.id === selectedRowId) ?? null
    : null

  useEffect(() => { setGradePage(1) }, [student?.id])
  useEffect(() => {
    setGradePage(p => Math.min(p, gradePageData.pagination.totalPages))
  }, [gradePageData.pagination.totalPages])
  useEffect(() => {
    if (selectedRowId && !confirmedRows.some(r => r.correction.id === selectedRowId)) setSelectedRowId(null)
  }, [confirmedRows, selectedRowId])

  async function handleDownloadEvaluation(row: ConfirmedGradeRow) {
    if (!row.evaluation || !onDownloadEvaluation) return
    setDownloading('evaluation')
    try { await onDownloadEvaluation(row.evaluation.id) } catch { /* handled upstream */ }
    finally { setDownloading(null) }
  }

  async function handleDownloadAnswerKey(row: ConfirmedGradeRow) {
    if (!row.evaluation || !onDownloadAnswerKey) return
    setDownloading('answer_key')
    try { await onDownloadAnswerKey(row.evaluation.id) } catch { /* handled upstream */ }
    finally { setDownloading(null) }
  }

  const initials = student ? getInitials(student.name) : ''
  const avatarUrl = student ? resolveApiAssetUrl(student.avatarUrl) : null

  /* ── Render ── */
  return (
    <>
      <style>{`
        @keyframes shimmer { to { transform: translateX(200%) } }
        .fill-mode-both { animation-fill-mode: both }
      `}</style>

      <div className="min-h-screen w-full bg-stone-100 text-stone-900">
        <div className="px-[clamp(12px,3vw,48px)] py-6 pb-20 space-y-4">

          {/* ── Header ── */}
          <header className="animate-in fade-in slide-in-from-top-3 duration-500">
            <Eyebrow className="mb-1">Portal do aluno · Boletim individual</Eyebrow>
            <h1 className="text-3xl font-semibold text-stone-900 leading-none font-['Lora']">
              Notas
            </h1>
          </header>

          {!student ? (
            <EmptyState icon={<UserRound className="h-8 w-8" />}
              title="Nenhum aluno vinculado"
              sub="Não foi possível identificar o aluno para este perfil." />
          ) : (
            <>
              {/* ── Context bar (same structure as EvaluationCorrectionsView) ── */}
              <div className="rounded-2xl border border-stone-300 bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500 delay-75">
                <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <div className="grid gap-0 divide-x divide-stone-200 sm:grid-cols-[1fr_1fr_1fr_auto]">

                  {/* Aluno */}
                  <div className="flex items-center gap-4 p-5">
                    <span className="flex h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 items-center justify-center text-lg font-bold text-white shadow-sm ring-2 ring-stone-200">
                      {avatarUrl
                        ? <img src={avatarUrl} alt={student.name} className="h-full w-full object-cover" draggable={false} />
                        : (initials || <UserRound className="h-6 w-6" />)
                      }
                    </span>
                    <div className="min-w-0">
                      <Eyebrow className="mb-0.5">Aluno</Eyebrow>
                      <p className="truncate text-base font-semibold text-stone-900 leading-tight font-['Lora']">{student.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-stone-400 font-['DM_Sans'] inline-flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" /> {getClassName(student.classId)}
                        </span>
                        <span className="text-[11px] text-stone-400 font-['DM_Sans'] inline-flex items-center gap-1">
                          <School className="h-3 w-3" /> {getSchoolName(student.schoolId)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Média */}
                  <div className="flex flex-col justify-center p-5">
                    <Eyebrow className="mb-1">Média geral</Eyebrow>
                    <div className="flex items-baseline gap-2">
                      <Sparkles className="h-4 w-4 text-violet-500 mb-0.5 shrink-0" />
                      <p className={`text-4xl font-bold leading-none font-['Lora']
                        ${average == null ? 'text-stone-400' : average >= 6 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {average == null ? '—' : formatScore(average)}
                      </p>
                    </div>
                    {average != null && (
                      <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${scoreBar(average)}`}
                          style={{ width: `${(average / 10) * 100}%` }} />
                      </div>
                    )}
                  </div>

                  {/* Turma + confirmadas */}
                  <div className="flex flex-col justify-center p-5 gap-1">
                    <Eyebrow className="mb-1">Turma</Eyebrow>
                    <p className="text-base font-semibold text-stone-900 font-['DM_Sans']">{classRoom?.name ?? getClassName(student.classId)}</p>
                    {classRoom && (
                      <span className="text-[11px] text-stone-400 font-['DM_Sans']">{formatClassGrade(classRoom.grade)} · {classRoom.shift}</span>
                    )}
                  </div>

                  {/* Métricas */}
                  <div className="flex flex-col justify-between gap-3 p-5 min-w-[260px]">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { l: 'Provas',    v: confirmedRows.length,               cls: 'text-stone-900' },
                        { l: 'Maior',     v: highest != null ? formatScore(highest) : '—', cls: 'text-emerald-700' },
                        { l: 'Menor',     v: lowest  != null ? formatScore(lowest)  : '—', cls: 'text-rose-600' },
                      ].map(s => (
                        <div key={s.l} className="text-center">
                          <p className={`text-xl font-bold leading-none font-['Lora'] ${s.cls}`}>{s.v}</p>
                          <Eyebrow className="mt-1">{s.l}</Eyebrow>
                        </div>
                      ))}
                    </div>
                    {confirmedRows.length > 0 && average != null && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Eyebrow>Desempenho geral</Eyebrow>
                          <span className="text-[10px] font-bold text-indigo-700 font-['DM_Sans']">{Math.round((average / 10) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000"
                            style={{ width: `${(average / 10) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Tabela de notas ── */}
              <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
                {/* Panel header */}
                <div className="flex items-center gap-2.5 border-b border-stone-200 bg-stone-50 px-5 py-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
                    <Award className="h-3.5 w-3.5 text-white" />
                  </div>
                  <Eyebrow>Provas confirmadas</Eyebrow>
                  {confirmedRows.length > 0 && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-stone-300 shrink-0" />
                      <span className="text-xs font-semibold text-indigo-700 font-['DM_Sans']">
                        {confirmedRows.length} nota{confirmedRows.length !== 1 ? 's' : ''} lançada{confirmedRows.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>

                {confirmedRows.length === 0 ? (
                  <div className="p-8">
                    <EmptyState icon={<Award className="h-8 w-8" />}
                      title="Nenhuma nota confirmada ainda"
                      sub="Assim que o professor confirmar a correção, ela aparece aqui." />
                  </div>
                ) : (
                  <>
                    {/* Column headers */}
                    <div className="grid grid-cols-[1.2fr_0.9fr_1fr_110px_56px] gap-3 border-b border-stone-200 bg-stone-50/70 px-5 py-2.5 max-md:hidden">
                      {['Prova', 'Matéria', 'Data', 'Nota', 'Abrir'].map(h => (
                        <span key={h} className="text-[10px] font-semibold tracking-wide uppercase text-stone-400 font-['DM_Sans']">{h}</span>
                      ))}
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-stone-100">
                      {visibleRows.map((row, i) => (
                        <button
                          key={row.correction.id}
                          type="button"
                          onClick={() => setSelectedRowId(row.correction.id)}
                          style={{ animationDelay: `${i * 35}ms` }}
                          className="group w-full text-left animate-in fade-in slide-in-from-bottom-1 fill-mode-both grid gap-3 border-l-[3px] border-l-stone-200 border-y-0 border-r-0 px-5 py-3.5 transition-all duration-200 hover:border-l-indigo-400 hover:bg-indigo-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 md:grid-cols-[1.2fr_0.9fr_1fr_110px_56px] md:items-center"
                        >
                          {/* Prova */}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-900 leading-tight font-['DM_Sans'] transition-colors group-hover:text-indigo-800">
                              {row.evaluation?.title ?? 'Prova não localizada'}
                            </p>
                          </div>

                          {/* Matéria */}
                          <div className="min-w-0">
                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 transition group-hover:border-indigo-200 font-['DM_Sans']">
                              <BookOpen className="h-3 w-3 shrink-0 text-indigo-500" />
                              <span className="truncate">{row.subject}</span>
                            </span>
                          </div>

                          {/* Data */}
                          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-['DM_Sans'] font-medium">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                            {formatDate(row.evaluation?.scheduledAt ?? row.correction.reviewedAt)}
                          </div>

                          {/* Nota */}
                          <div className="flex items-center justify-start md:justify-start">
                            <span className={`inline-flex min-w-[72px] justify-center rounded-full border px-3 py-1 text-sm font-bold font-['Lora'] ${scorePill(row.score)}`}>
                              {formatScore(row.score)}
                            </span>
                          </div>

                          {/* Abrir */}
                          <div className="flex items-center justify-start md:justify-center">
                            <span className="grid h-9 w-9 place-items-center rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 transition-all duration-200 group-hover:scale-105 group-hover:border-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-sm">
                              <Eye className="h-4 w-4" />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Pagination */}
                    {gradePageData.pagination.total > 0 && (
                      <div className="border-t border-stone-200">
                        <PaginationControls
                          label="Provas"
                          pagination={gradePageData.pagination}
                          limit={gradeLimit}
                          loading={false}
                          source="local"
                          pageSizeOptions={[DEFAULT_PAGE_SIZE]}
                          onPageChange={setGradePage}
                          onLimitChange={limit => { setGradeLimit(limit); setGradePage(1) }}
                        />
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </div>

        {/* Modal */}
        {selectedRow && (
          <GradeDetailModal
            row={selectedRow}
            downloading={downloading}
            onClose={() => setSelectedRowId(null)}
            onDownloadEvaluation={handleDownloadEvaluation}
            onDownloadAnswerKey={handleDownloadAnswerKey}
          />
        )}
      </div>
    </>
  )
}
