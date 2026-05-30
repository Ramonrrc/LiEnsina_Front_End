import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  ExternalLink,
  FileText,
  GraduationCap,
  Hash,
  ListChecks,
  Loader2,
  School,
  Search,
  Target,
  UserRound,
  X,
  ChevronRight,
} from 'lucide-react'

import { resolveApiAssetUrl, safeApiFilePreviewKind, type ApiFileResponse } from '../../api'
import { formatClassGrade } from '../../class-grade-options'
import {
  getAcademicSubjectLabel,
  getOfficialAcademicSubjectListForGrade,
  getOfficialAcademicSubjectsForGrade,
  getSubjectAccent,
  getSubjectIcon,
  getSubjectIconBg,
  normalizeAcademicText,
} from '../../components/role-portal/portal-components'
import { DEFAULT_PAGE_SIZE, PaginationControls, paginateLocal } from '../../components/ui/pagination-controls'
import { uniqueSafePrintableImages } from '../../lib/markdown-media-security'
import type { ClassRoom, Evaluation, EvaluationAnswerKeyItem, EvaluationCorrection, Question, Student, StudentSubjectCardsPagePayload } from '../../types'
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

type EvaluationCorrectionDetail = EvaluationCorrection & {
  evaluation?: Evaluation | null
  exam?: Evaluation | null
  questionSnapshots?: Question[]
}

type PrintableImage = { url: string; alt: string }
type OptionPrintableImage = PrintableImage & {
  optionId?: string
  optionLabel?: string
  optionOrder?: number
}

type StudentSubjectCard = {
  id: string
  subject: string
  rows: ConfirmedGradeRow[]
  classRoom?: ClassRoom
}

type FilePreview = {
  url: string
  filename: string
  kind: 'image' | 'pdf' | 'unknown'
}

type PreviewKind = 'evaluation'
const studentSubjectsPageSize = 6

function getErrorStatusCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return null
  const statusCode = Number((error as { statusCode?: unknown }).statusCode)
  return Number.isFinite(statusCode) ? statusCode : null
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

function resolveAnswerKey(
  correction: EvaluationCorrection,
  questions: Question[],
  evaluationAnswerKey: EvaluationAnswerKeyItem[] = [],
) {
  if (correction.answerKey?.length) {
    return [...correction.answerKey].sort((a, b) => a.questionNumber - b.questionNumber)
  }
  if (evaluationAnswerKey.length) {
    return [...evaluationAnswerKey].sort((a, b) => a.questionNumber - b.questionNumber)
  }
  if (correction.detectedAnswers?.length) {
    return correction.detectedAnswers
      .map<EvaluationAnswerKeyItem>((answer) => ({
        questionNumber: answer.questionNumber,
        questionId: answer.questionId ?? '',
        correctOption: String(answer.correctOption ?? '').trim().toUpperCase(),
      }))
      .filter((answer) => answer.questionNumber > 0 && answer.correctOption)
      .sort((a, b) => a.questionNumber - b.questionNumber)
  }
  return questions.map<EvaluationAnswerKeyItem | null>((q, i) => {
    const correct = [...(q.options ?? [])].sort((a, b) => a.order - b.order).find(o => o.isCorrect)
    if (!correct) return null
    return { questionNumber: i + 1, questionId: q.id, correctOption: String(correct.label ?? '').trim().toUpperCase() }
  }).filter((item): item is EvaluationAnswerKeyItem => Boolean(item))
}

function mergeCorrectionDetail(base: EvaluationCorrection, detail: EvaluationCorrectionDetail): EvaluationCorrectionDetail {
  return {
    ...base,
    ...detail,
    answerKey: detail.answerKey?.length ? detail.answerKey : base.answerKey,
    detectedAnswers: detail.detectedAnswers?.length ? detail.detectedAnswers : base.detectedAnswers,
    failures: detail.failures?.length ? detail.failures : base.failures,
  }
}

function getDetailEvaluation(detail?: EvaluationCorrectionDetail) {
  const nested = detail?.evaluation ?? detail?.exam ?? null
  const topSnapshots = detail?.questionSnapshots
  if (!nested && !topSnapshots?.length) return null
  return {
    ...(nested ?? {}),
    questionSnapshots: nested?.questionSnapshots?.length ? nested.questionSnapshots : topSnapshots,
  } as Evaluation
}

function mergeEvaluationWithDetail(
  base: Evaluation | null,
  correction: EvaluationCorrection,
  detail?: EvaluationCorrectionDetail,
) {
  const detailEvaluation = getDetailEvaluation(detail)
  if (!base && !detailEvaluation) return null

  const fallback: Evaluation = base ?? {
    id: correction.evaluationId,
    title: 'Prova corrigida',
    classId: correction.classId,
    schoolId: correction.schoolId,
    subject: correction.subject ?? '',
    questions: correction.totalQuestions,
    scheduledAt: correction.reviewedAt ?? correction.updatedAt ?? '',
    status: 'concluido',
    corrected: 0,
    participants: 0,
    averageScore: 0,
    triLevel: '',
  }
  const merged = detailEvaluation ? { ...fallback, ...detailEvaluation } : fallback

  return {
    ...merged,
    answerKey: detail?.answerKey?.length ? detail.answerKey : merged.answerKey,
    questionSnapshots: detailEvaluation?.questionSnapshots?.length
      ? detailEvaluation.questionSnapshots
      : merged.questionSnapshots,
  }
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

function createFilePreview(file: ApiFileResponse): FilePreview {
  return {
    url: URL.createObjectURL(file.blob),
    filename: file.filename,
    kind: safeApiFilePreviewKind(file.contentType),
  }
}

function FilePreviewPanel({
  preview,
  loading,
  error,
  emptyTitle,
  emptySub,
  title,
  className = '',
}: {
  preview: FilePreview | null
  loading: boolean
  error: string | null
  emptyTitle: string
  emptySub: string
  title: string
  className?: string
}) {
  if (loading) {
    return (
      <div className={`flex min-h-[360px] items-center justify-center rounded-xl border border-stone-200 bg-stone-50 ${className}`}>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 font-['DM_Sans']">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando arquivo...
        </span>
      </div>
    )
  }

  if (!preview) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title={error ? 'Arquivo não disponível' : emptyTitle}
        sub={error ?? emptySub}
      />
    )
  }

  if (preview.kind === 'image') {
    return (
      <figure className={`flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 p-3 ${className}`}>
        <img src={preview.url} alt={title} className="max-h-[620px] w-full object-contain" />
      </figure>
    )
  }

  if (preview.kind === 'pdf') {
    return (
      <div className={`overflow-hidden rounded-xl border border-stone-200 bg-white ${className}`}>
        <object
          data={`${preview.url}#toolbar=1&navpanes=0`}
          type="application/pdf"
          aria-label={title}
          className="h-[620px] w-full bg-white"
        >
          <div className="flex h-[620px] flex-col items-center justify-center gap-3 bg-stone-50 p-6 text-center">
            <FileText className="h-7 w-7 text-stone-300" />
            <p className="text-sm font-semibold text-stone-700 font-['DM_Sans']">O navegador nao exibiu o PDF embutido.</p>
            <a
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 font-['DM_Sans']"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir prova
            </a>
          </div>
        </object>
      </div>
    )
  }

  return (
    <div className={`flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-6 text-center ${className}`}>
      <FileText className="h-7 w-7 text-stone-300" />
      <div>
        <p className="text-sm font-semibold text-stone-700 font-['DM_Sans']">{preview.filename}</p>
        <p className="mt-1 text-xs text-stone-400 font-['DM_Sans']">Use o link abaixo para abrir o arquivo.</p>
      </div>
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 font-['DM_Sans']"
      >
        <ExternalLink className="h-3.5 w-3.5" /> Abrir arquivo
      </a>
    </div>
  )
}

function StudentSubjectCardView({
  card,
  index,
  onOpenRow,
}: {
  card: StudentSubjectCard
  index: number
  onOpenRow: (row: ConfirmedGradeRow) => void
}) {
  const iconStyle = getSubjectIconBg(index)
  const accent = getSubjectAccent(index)
  const latest = card.rows[0] ?? null
  const latestScoreTextClass = !latest
    ? 'text-stone-400'
    : latest.score >= 8
      ? 'text-emerald-700'
      : latest.score >= 6
        ? 'text-amber-700'
        : 'text-rose-700'

  return (
    <article
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
      style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0, transform: 'translateY(16px)', animationDelay: `${index * 70}ms` }}
    >
      <div className={`absolute left-0 top-0 h-full w-[3px] ${accent.strip} transition-all duration-300 group-hover:w-1`} />

      <div className="flex flex-1 flex-col gap-4 p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${iconStyle.bg} ${iconStyle.text} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
              {getSubjectIcon(card.subject)}
            </span>
            <div className="min-w-0">
              <Eyebrow className="mb-0.5">Matéria</Eyebrow>
              <h2 className="truncate text-base font-semibold leading-tight text-stone-900 font-['DM_Sans']">
                {card.subject}
              </h2>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700 font-['DM_Sans']">
            <BookOpen className="h-3 w-3" />
            Ativa
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
          <div>
            <Eyebrow className="mb-1">Provas</Eyebrow>
            <strong className="text-lg font-bold leading-none text-stone-900 font-['Lora']">{card.rows.length}</strong>
          </div>
          <div>
            <Eyebrow className="mb-1">Última nota</Eyebrow>
            <strong className={`text-lg font-bold leading-none font-['Lora'] ${latestScoreTextClass}`}>
              {latest ? formatScore(latest.score) : '—'}
            </strong>
          </div>
          <div className="min-w-0">
            <Eyebrow className="mb-1">Turma</Eyebrow>
            <strong className="block truncate text-xs font-bold text-stone-700 font-['DM_Sans']">
              {card.classRoom?.name ?? 'Turma'}
            </strong>
          </div>
        </div>

        <div className="grid gap-2">
          {card.rows.slice(0, 3).map((row) => (
            <button
              key={row.correction.id}
              type="button"
              onClick={() => onOpenRow(row)}
              className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50/60"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-stone-800 font-['DM_Sans']">{row.evaluation?.title ?? 'Prova não localizada'}</span>
                <span className="block truncate text-[10px] font-medium text-stone-400 font-['DM_Sans']">{formatDate(row.evaluation?.scheduledAt ?? row.correction.reviewedAt)}</span>
              </span>
              <span className={`inline-flex min-w-[56px] justify-center rounded-full border px-2.5 py-1 text-xs font-bold font-['Lora'] ${scorePill(row.score)}`}>
                {formatScore(row.score)}
              </span>
            </button>
          ))}

          {card.rows.length === 0 && (
            <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-3 text-xs font-semibold text-stone-400 font-['DM_Sans']">
              Nenhuma nota confirmada nesta matéria.
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-stone-200 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  )
}

/* ─── QuestionMedia ──────────────────────────────────────────────────────── */

function StudentSubjectCardSkeleton({ index }: { index: number }) {
  return (
    <article
      className="relative flex min-h-[250px] flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-indigo-200 to-violet-200" />
      <div className="flex flex-1 flex-col gap-4 p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bone className="h-11 w-11 shrink-0 rounded-lg" />
            <div className="space-y-2">
              <Bone className="h-2.5 w-16" />
              <Bone className="h-4 w-32" />
            </div>
          </div>
          <Bone className="h-5 w-14 rounded-full" />
        </div>
        <Bone className="h-16 w-full rounded-lg" />
        <div className="grid gap-2">
          <Bone className="h-11 w-full rounded-lg" />
          <Bone className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </article>
  )
}

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
  row,
  downloading,
  loadingDetail,
  detailError,
  evaluationPreview,
  previewLoading,
  previewErrors,
  onClose,
  onDownloadEvaluation,
  onDownloadAnswerKey,
}: {
  row: ConfirmedGradeRow
  downloading: 'evaluation' | 'answer_key' | null
  loadingDetail: boolean
  detailError: string | null
  evaluationPreview: FilePreview | null
  previewLoading: Record<PreviewKind, boolean>
  previewErrors: Record<PreviewKind, string | null>
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
  const totalQuestionCount = row.questions.length || row.answerKey.length || row.correction.totalQuestions
  const fallbackQuestionNumbers = Array.from({ length: Math.max(0, totalQuestionCount) }, (_, index) => index + 1)
  const hasAnswerKey = row.answerKey.length > 0
  const answerRows = row.answerKey

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
          {(loadingDetail || detailError) && (
            <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold font-['DM_Sans'] ${
              detailError
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-indigo-200 bg-indigo-50 text-indigo-700'
            }`}>
              {loadingDetail && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {detailError ?? 'Carregando prova e gabarito...'}
            </div>
          )}

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
                  <Hash className="h-3 w-3" /> {totalQuestionCount} questões
                </span>
              </div>

              <div className="p-4">
                <FilePreviewPanel
                  preview={evaluationPreview}
                  loading={previewLoading.evaluation}
                  error={previewErrors.evaluation}
                  title="PDF da prova"
                  emptyTitle="PDF da prova não disponível"
                  emptySub="Use o botão Baixar prova ou verifique se o backend liberou o arquivo para o aluno."
                />
              </div>

              {false && (row.questions.length === 0 ? (
                fallbackQuestionNumbers.length === 0 ? (
                  <div className="p-8">
                    <EmptyState icon={<FileText className="h-6 w-6" />}
                      title="Questões não disponíveis"
                      sub="O PDF completo está disponível no botão Baixar prova." />
                  </div>
                ) : (
                  <div className="max-h-[440px] overflow-y-auto divide-y divide-stone-100">
                    {fallbackQuestionNumbers.map((questionNumber) => {
                      const ans = row.answerKey.find((item) => item.questionNumber === questionNumber)
                      const detected = detectedByQuestion.get(questionNumber)
                      return (
                        <article key={`summary-${questionNumber}`} className="p-5 transition hover:bg-indigo-50/30">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-700 font-['DM_Sans']">
                                {questionNumber}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-stone-900 font-['DM_Sans']">Questão {questionNumber}</p>
                                <p className="text-xs font-medium text-stone-400 font-['DM_Sans']">
                                  {row.evaluation?.questionSnapshots?.length
                                    ? 'Enunciado carregado na prova.'
                                    : 'Enunciado disponível no PDF da prova.'}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-700 font-['DM_Sans']">
                                {ans?.correctOption ?? '-'}
                              </span>
                              <span className={`grid h-8 min-w-8 place-items-center rounded-lg border px-2 text-sm font-bold font-['DM_Sans'] ${answerTone(detected?.isCorrect)}`}>
                                {detected?.detectedOption ?? '-'}
                              </span>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )
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
              ))}
            </section>

            {/* Gabarito e Correção */}
            <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-stone-500" />
                  <Eyebrow>Gabarito e Correção</Eyebrow>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-400 font-['DM_Sans']">
                  <Hash className="h-3 w-3" /> {answerRows.length} itens
                </span>
              </div>

              <div className="p-4">
              {answerRows.length === 0 ? (
                <div className="p-8">
                  <EmptyState icon={<Target className="h-6 w-6" />}
                    title="Gabarito não disponível" sub="Nenhum item retornado pela API." />
                </div>
              ) : (
                <div className="max-h-[620px] overflow-y-auto">
                  {!hasAnswerKey && (
                    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700 font-['DM_Sans']">
                      A correção carregou, mas a API ainda não retornou o gabarito desta prova.
                    </div>
                  )}
                  {/* Table header */}
                  <div className="grid grid-cols-[40px_64px_64px_1fr] gap-2 border-b border-stone-200 bg-stone-50/70 px-4 py-2">
                    {['Nº', 'Gabarito', 'Marcada', 'Status'].map(h => (
                      <span key={h} className="text-[10px] font-semibold tracking-wide uppercase text-stone-400 font-['DM_Sans']">{h}</span>
                    ))}
                  </div>
                  <div className="divide-y divide-stone-100">
                    {answerRows.map((ans, i) => {
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
              </div>
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
    onDownloadEvaluation, onDownloadAnswerKey, onLoadEvaluationFile, onLoadCorrectionDetail,
    onLoadStudentSubjectCardsPage,
  } = model

  const [subjectSearch, setSubjectSearch] = useState('')
  const [debouncedSubjectSearch, setDebouncedSubjectSearch] = useState('')
  const [subjectPage, setSubjectPage] = useState(1)
  const [subjectCardsPage, setSubjectCardsPage] = useState<StudentSubjectCardsPagePayload | null>(null)
  const [isSubjectCardsLoading, setIsSubjectCardsLoading] = useState(false)
  const [subjectCardsError, setSubjectCardsError] = useState<string | null>(null)
  const [gradePage, setGradePage] = useState(1)
  const [gradeLimit, setGradeLimit] = useState(DEFAULT_PAGE_SIZE)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<'evaluation' | 'answer_key' | null>(null)
  const [correctionDetails, setCorrectionDetails] = useState<Record<string, EvaluationCorrectionDetail>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [evaluationPreview, setEvaluationPreview] = useState<FilePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState<Record<PreviewKind, boolean>>({
    evaluation: false,
  })
  const [previewErrors, setPreviewErrors] = useState<Record<PreviewKind, string | null>>({
    evaluation: null,
  })
  const previewRequestRef = useRef(0)

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
            const detail = correctionDetails[correction.id]
            const detailedCorrection = detail ?? correction
            const evaluation = mergeEvaluationWithDetail(
              evaluationById.get(correction.evaluationId) ?? null,
              detailedCorrection,
              detail,
            )
            const questions = resolveQuestions(evaluation, questionBank)
            return {
              correction: detailedCorrection, evaluation,
              subject: getAcademicSubjectLabel(evaluation?.subject ?? detailedCorrection.subject, curriculumSkills) || 'Matéria não informada',
              score: Number(detailedCorrection.finalScore ?? 0),
              questions,
              answerKey: resolveAnswerKey(detailedCorrection, questions, evaluation?.answerKey ?? []),
            }
          })
          .sort((a, b) => {
            const da = a.evaluation?.scheduledAt ?? a.correction.reviewedAt ?? a.correction.updatedAt
            const db = b.evaluation?.scheduledAt ?? b.correction.reviewedAt ?? b.correction.updatedAt
            return String(db ?? '').localeCompare(String(da ?? ''))
          })
      : []
  ), [correctionDetails, corrections, curriculumSkills, evaluationById, questionBank, student])

  const localSubjectCards = useMemo<StudentSubjectCard[]>(() => {
    const cardMap = new Map<string, StudentSubjectCard>()
    const baseSubjects = classRoom?.bnccFocus?.length
      ? getOfficialAcademicSubjectListForGrade(classRoom.bnccFocus, classRoom.grade, curriculumSkills)
      : getOfficialAcademicSubjectsForGrade(classRoom?.grade)

    baseSubjects.forEach((subject) => {
      const key = normalizeAcademicText(subject)
      if (key) cardMap.set(key, { id: `subject-${key}`, subject, rows: [], classRoom })
    })

    confirmedRows.forEach((row) => {
      const key = normalizeAcademicText(row.subject)
      if (!key) return
      const current = cardMap.get(key) ?? { id: `subject-${key}`, subject: row.subject, rows: [], classRoom }
      current.rows.push(row)
      cardMap.set(key, current)
    })

    return Array.from(cardMap.values()).sort((a, b) => {
      const withGrades = Number(b.rows.length > 0) - Number(a.rows.length > 0)
      return withGrades || a.subject.localeCompare(b.subject)
    })
  }, [classRoom, confirmedRows, curriculumSkills])

  const localFilteredSubjectCards = useMemo(() => {
    const query = normalizeAcademicText(debouncedSubjectSearch)
    if (!query) return localSubjectCards

    return localSubjectCards.filter((card) => {
      const haystack = normalizeAcademicText([
        card.subject,
        card.classRoom?.name,
        card.classRoom?.grade ? formatClassGrade(card.classRoom.grade) : '',
        card.classRoom?.shift,
        ...card.rows.flatMap((row) => [
          row.evaluation?.title,
          row.evaluation?.scheduledAt,
          row.correction.reviewedAt,
        ]),
      ].filter(Boolean).join(' '))
      return haystack.includes(query)
    })
  }, [debouncedSubjectSearch, localSubjectCards])
  const localSubjectTotalPages = Math.max(1, Math.ceil(localFilteredSubjectCards.length / studentSubjectsPageSize))
  const safeLocalSubjectPage = Math.min(Math.max(1, subjectPage), localSubjectTotalPages)
  const localSubjectStartIndex = (safeLocalSubjectPage - 1) * studentSubjectsPageSize
  const localSubjectCardsPage = {
    subjectCards: localFilteredSubjectCards.slice(localSubjectStartIndex, localSubjectStartIndex + studentSubjectsPageSize),
    pagination: {
      page: safeLocalSubjectPage,
      limit: studentSubjectsPageSize,
      total: localFilteredSubjectCards.length,
      totalPages: localSubjectTotalPages,
    },
    totals: {
      subjects: localSubjectCards.length,
      grades: confirmedRows.length,
    },
  }
  const subjectRowsByKey = useMemo(() => {
    const rowsByKey = new Map<string, ConfirmedGradeRow[]>()
    confirmedRows.forEach((row) => {
      const key = normalizeAcademicText(row.subject)
      if (!key) return
      rowsByKey.set(key, [...(rowsByKey.get(key) ?? []), row])
    })
    return rowsByKey
  }, [confirmedRows])
  const backendSubjectCards = useMemo<StudentSubjectCard[]>(() => (
    (subjectCardsPage?.subjectCards ?? []).map((card) => {
      const subject = getAcademicSubjectLabel(card.subject, curriculumSkills) || card.subject
      const key = normalizeAcademicText(subject)
      return {
        id: card.id,
        subject,
        rows: subjectRowsByKey.get(key) ?? [],
        classRoom: card.classRoom ?? classRoom,
      }
    })
  ), [classRoom, curriculumSkills, subjectCardsPage?.subjectCards, subjectRowsByKey])
  const shouldUseBackendSubjectCards = Boolean(onLoadStudentSubjectCardsPage)
  const activeSubjectCardsPage = shouldUseBackendSubjectCards
    ? {
        subjectCards: subjectCardsPage && !subjectCardsError ? backendSubjectCards : [],
        pagination: subjectCardsPage && !subjectCardsError
          ? subjectCardsPage.pagination
          : { page: subjectPage, limit: studentSubjectsPageSize, total: 0, totalPages: 1 },
        totals: subjectCardsPage && !subjectCardsError
          ? subjectCardsPage.totals
          : { subjects: 0, grades: confirmedRows.length },
      }
    : localSubjectCardsPage
  const visibleSubjectCards = activeSubjectCardsPage.subjectCards
  const subjectPagination = activeSubjectCardsPage.pagination
  const subjectTotalCount = activeSubjectCardsPage.totals.subjects
  const subjectPageSource = shouldUseBackendSubjectCards ? 'backend' : 'local'
  const showSubjectSkeletons = Boolean(onLoadStudentSubjectCardsPage && isSubjectCardsLoading && !subjectCardsPage)

  const gradePageData = useMemo(
    () => paginateLocal(confirmedRows, gradePage, gradeLimit),
    [confirmedRows, gradeLimit, gradePage],
  )
  const visibleRows = gradePageData.items
  const selectedRow = selectedRowId
    ? confirmedRows.find(r => r.correction.id === selectedRowId) ?? null
    : null
  const selectedCorrectionId = selectedRow?.correction.id ?? null
  const selectedEvaluationId = selectedRow?.evaluation?.id ?? null

  function updatePreview(kind: PreviewKind, next: FilePreview | null) {
    void kind
    setEvaluationPreview((current) => {
      if (current?.url && current.url !== next?.url) URL.revokeObjectURL(current.url)
      return next
    })
  }

  function setPreviewLoadingState(kind: PreviewKind, value: boolean) {
    setPreviewLoading((current) => ({ ...current, [kind]: value }))
  }

  function setPreviewErrorState(kind: PreviewKind, value: string | null) {
    setPreviewErrors((current) => ({ ...current, [kind]: value }))
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSubjectSearch(subjectSearch.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [subjectSearch])
  useEffect(() => { setSubjectPage(1) }, [debouncedSubjectSearch, student?.id])
  useEffect(() => {
    if (!onLoadStudentSubjectCardsPage || !student) return

    let active = true
    setIsSubjectCardsLoading(true)
    setSubjectCardsError(null)

    onLoadStudentSubjectCardsPage({
      page: subjectPage,
      limit: studentSubjectsPageSize,
      search: debouncedSubjectSearch,
    })
      .then((payload) => {
        if (!active) return
        setSubjectCardsPage(payload)
        if (payload.pagination.page !== subjectPage) setSubjectPage(payload.pagination.page)
      })
      .catch((error) => {
        if (!active) return
        setSubjectCardsPage(null)
        setSubjectCardsError(getErrorStatusCode(error) === 404 ? null : error instanceof Error ? error.message : 'Nao foi possivel buscar materias no banco.')
      })
      .finally(() => {
        if (active) setIsSubjectCardsLoading(false)
      })

    return () => { active = false }
  }, [debouncedSubjectSearch, onLoadStudentSubjectCardsPage, student?.id, subjectPage])
  useEffect(() => {
    if (onLoadStudentSubjectCardsPage) return
    if (subjectPage !== safeLocalSubjectPage) setSubjectPage(safeLocalSubjectPage)
  }, [onLoadStudentSubjectCardsPage, safeLocalSubjectPage, subjectPage])
  useEffect(() => { setGradePage(1) }, [student?.id])
  useEffect(() => {
    setGradePage(p => Math.min(p, gradePageData.pagination.totalPages))
  }, [gradePageData.pagination.totalPages])
  useEffect(() => {
    if (selectedRowId && !confirmedRows.some(r => r.correction.id === selectedRowId)) setSelectedRowId(null)
  }, [confirmedRows, selectedRowId])
  useEffect(() => { setDetailError(null) }, [selectedCorrectionId])
  useEffect(() => () => {
    if (evaluationPreview?.url) URL.revokeObjectURL(evaluationPreview.url)
  }, [evaluationPreview?.url])
  useEffect(() => {
    if (!selectedCorrectionId || !selectedRow || !onLoadCorrectionDetail || correctionDetails[selectedCorrectionId]) return
    const hasRenderableDetail = selectedRow.questions.length > 0 ||
      selectedRow.answerKey.length > 0 ||
      Boolean(selectedRow.correction.detectedAnswers?.length)
    if (hasRenderableDetail) return

    let cancelled = false
    setDetailError(null)
    setDetailLoadingId(selectedCorrectionId)

    onLoadCorrectionDetail(selectedCorrectionId)
      .then((detail) => {
        if (cancelled) return
        const detailPayload = detail as EvaluationCorrectionDetail
        setCorrectionDetails((current) => ({
          ...current,
          [selectedCorrectionId]: mergeCorrectionDetail(selectedRow.correction, detailPayload),
        }))
      })
      .catch((error) => {
        if (cancelled) return
        setDetailError(error instanceof Error ? error.message : 'Nao foi possivel carregar prova e gabarito.')
      })
      .finally(() => {
        if (cancelled) return
        setDetailLoadingId((current) => current === selectedCorrectionId ? null : current)
      })

    return () => { cancelled = true }
  }, [correctionDetails, onLoadCorrectionDetail, selectedCorrectionId, selectedRow])

  useEffect(() => {
    const requestId = previewRequestRef.current + 1
    previewRequestRef.current = requestId

    updatePreview('evaluation', null)
    setPreviewErrors({ evaluation: null })
    setPreviewLoading({ evaluation: false })

    if (!selectedRow) return

    if (selectedEvaluationId && onLoadEvaluationFile) {
      setPreviewLoadingState('evaluation', true)
      onLoadEvaluationFile(selectedEvaluationId)
        .then((file) => {
          const preview = createFilePreview(file)
          if (previewRequestRef.current !== requestId) { URL.revokeObjectURL(preview.url); return }
          updatePreview('evaluation', preview)
        })
        .catch((error) => {
          if (previewRequestRef.current === requestId) {
            setPreviewErrorState('evaluation', error instanceof Error ? error.message : 'Não foi possível carregar o PDF da prova.')
          }
        })
        .finally(() => {
          if (previewRequestRef.current === requestId) setPreviewLoadingState('evaluation', false)
        })
    }
  }, [onLoadEvaluationFile, selectedEvaluationId, selectedRow])

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
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        .fill-mode-both { animation-fill-mode: both }
      `}</style>

      <div className="min-h-screen w-full bg-stone-100 text-stone-900">
        <div className="px-[clamp(12px,3vw,48px)] py-6 pb-20 space-y-4">

          {/* ── Header ── */}
          <header className="animate-in fade-in slide-in-from-top-3 duration-500">
            <Eyebrow className="mb-1">Portal do aluno · boletim por matéria</Eyebrow>
            <h1 className="text-3xl font-semibold text-stone-900 leading-none font-['Lora']">
              Minhas matérias
            </h1>
          </header>

          {!student ? (
            <EmptyState icon={<UserRound className="h-8 w-8" />}
              title="Nenhum aluno vinculado"
              sub="Não foi possível identificar o aluno para este perfil." />
          ) : (
            <>
              {/* ── Context bar (same structure as EvaluationCorrectionsView) ── */}
              <div className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 delay-75">
                <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <div className="grid gap-0 divide-stone-200 sm:grid-cols-[1fr_1fr_auto] sm:divide-x">

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

                  {/* Turma + confirmadas */}
                  <div className="flex flex-col justify-center p-5 gap-1">
                    <Eyebrow className="mb-1">Turma</Eyebrow>
                    <p className="text-base font-semibold text-stone-900 font-['DM_Sans']">{classRoom?.name ?? getClassName(student.classId)}</p>
                    {classRoom && (
                      <span className="text-[11px] text-stone-400 font-['DM_Sans']">{formatClassGrade(classRoom.grade)} · {classRoom.shift}</span>
                    )}
                  </div>

                  <div className="flex min-w-[190px] flex-col justify-center p-5">
                    <Eyebrow className="mb-1">Notas lançadas</Eyebrow>
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600">
                        <BadgeCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-2xl font-bold leading-none text-stone-900 font-['Lora']">{confirmedRows.length}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-stone-400 font-['DM_Sans']">
                          {subjectTotalCount} matéria{subjectTotalCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
                <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <label className="relative min-w-0 flex-1 lg:max-w-xl">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
                    <input
                      type="text"
                      inputMode="search"
                      aria-label="Buscar matérias"
                      value={subjectSearch}
                      onChange={(event) => {
                        setSubjectSearch(event.target.value)
                        setSubjectPage(1)
                      }}
                      placeholder="Buscar matéria"
                      className="min-h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-10 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 hover:border-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-['DM_Sans']"
                    />
                    {subjectSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubjectSearch('')
                          setDebouncedSubjectSearch('')
                          setSubjectPage(1)
                        }}
                        className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                        aria-label="Limpar busca"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </label>

                  {subjectCardsError && (
                    <span className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 font-['DM_Sans']">
                      {subjectCardsError}
                    </span>
                  )}
                </div>
              </section>

              <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
                {showSubjectSkeletons ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: studentSubjectsPageSize }, (_, index) => (
                      <StudentSubjectCardSkeleton key={index} index={index} />
                    ))}
                  </div>
                ) : visibleSubjectCards.length === 0 ? (
                  <EmptyState icon={<BookOpen className="h-8 w-8" />}
                    title="Nenhuma matéria encontrada"
                    sub={debouncedSubjectSearch ? 'Nenhuma matéria encontrada para esta busca.' : 'As matérias da turma aparecem aqui quando estiverem vinculadas.'} />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visibleSubjectCards.map((card, index) => (
                      <StudentSubjectCardView
                        key={card.id}
                        card={card}
                        index={index}
                        onOpenRow={(row) => setSelectedRowId(row.correction.id)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {subjectPagination.total > 0 && (
                <div className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
                  <PaginationControls
                    label="Matérias"
                    pagination={subjectPagination}
                    limit={studentSubjectsPageSize}
                    loading={isSubjectCardsLoading}
                    source={subjectPageSource}
                    pageSizeOptions={[studentSubjectsPageSize]}
                    onPageChange={setSubjectPage}
                    onLimitChange={() => setSubjectPage(1)}
                  />
                </div>
              )}

              {/* ── Tabela de notas ── */}
              <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150">
                {/* Panel header */}
                <div className="flex items-center gap-2.5 border-b border-stone-200 bg-stone-50 px-5 py-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
                    <Award className="h-3.5 w-3.5 text-white" />
                  </div>
                  <Eyebrow>Notas por prova</Eyebrow>
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
            loadingDetail={detailLoadingId === selectedRow.correction.id}
            detailError={detailError}
            evaluationPreview={evaluationPreview}
            previewLoading={previewLoading}
            previewErrors={previewErrors}
            onClose={() => setSelectedRowId(null)}
            onDownloadEvaluation={handleDownloadEvaluation}
            onDownloadAnswerKey={handleDownloadAnswerKey}
          />
        )}
      </div>
    </>
  )
}
