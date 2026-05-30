import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  ExternalLink,
  FileDown,
  FileText,
  GraduationCap,
  Hash,
  ImageUp,
  ListChecks,
  RotateCcw,
  Save,
  ScanLine,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  XCircle,
  Zap,
  CheckCheck,
  Clock,
  Layers,
  ZapOff,
} from 'lucide-react'

import { safeApiFilePreviewKind, type ApiFileResponse } from '../api'
import { getAcademicSubjectLabel } from '../components/role-portal/portal-components'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { DEFAULT_PAGE_SIZE, PaginationControls, paginateLocal } from '../components/ui/pagination-controls'
import {
  getAnswerCardEvaluationId,
  getAnswerCardId,
  getAnswerCardStudentId,
  getBatchCorrections,
  getBatchCorrected,
  getBatchErrorCount,
  getBatchNeedsReview,
  getBatchResults,
  getBatchTotalSent,
} from '../lib/evaluation-omr'
import { OMR_UPLOAD_ACCEPT, validateOmrBatchFiles, validateOmrFile } from '../lib/file-security'
import type {
  ClassRoom,
  Evaluation,
  EvaluationAnswerCard,
  EvaluationCorrection,
  EvaluationCorrectionConfirmManyPayload,
  EvaluationCorrectionConfirmManyResponse,
  EvaluationCorrectionReviewPayload,
  EvaluationOmrBatchResponse,
  EvaluationsScreenPayload,
  School,
  Student,
  StudentsPageQuery,
  StudentsPagePayload,
} from '../types'

/* ─── Types ─────────────────────────────────────────────────────────────── */

type EvaluationCorrectionsViewProps = {
  evaluations: Evaluation[]
  classes: ClassRoom[]
  schools?: School[]
  students: Student[]
  corrections: EvaluationCorrection[]
  answerCards?: EvaluationAnswerCard[]
  canFilterBySchool?: boolean
  onLoadSchoolScope?: (schoolId: string) => Promise<Pick<
    EvaluationsScreenPayload,
    'evaluations' | 'classes' | 'students' | 'evaluationCorrections' | 'answerCards' | 'schools'
  >>
  onProcess: (evaluationId: string, studentId: string, image: File) => Promise<EvaluationCorrection>
  onBatchProcess?: (evaluationId: string, files: File[]) => Promise<EvaluationOmrBatchResponse>
  onReview: (correctionId: string, payload: EvaluationCorrectionReviewPayload) => Promise<EvaluationCorrection>
  onReviewMany?: (evaluationId: string, payload: EvaluationCorrectionConfirmManyPayload) => Promise<EvaluationCorrectionConfirmManyResponse>
  onLoadStudentsPage?: (params: StudentsPageQuery) => Promise<StudentsPagePayload>
  onDownloadEvaluation?: (evaluationId: string) => Promise<void>
  onDownloadAnswerCards?: (evaluationId: string) => Promise<void>
  onLoadCorrectionDetail?: (correctionId: string) => Promise<EvaluationCorrection>
  onLoadCorrectionCardPreview?: (correctionId: string) => Promise<ApiFileResponse>
}

type BatchUploadedFilePreview = {
  id: string
  name: string
  type: string
  size: number
  url: string
  kind: 'image' | 'pdf' | 'other'
}

type CorrectionCardPreview = {
  correction: EvaluationCorrection
  url: string
  kind: 'image' | 'pdf' | 'unknown'
  filename: string
}

/* ─── Formatters ─────────────────────────────────────────────────────────── */

function fmt(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function fmtQVal(v: number) { return Number(v.toFixed(2)).toString() }
function parseQVal(v?: string) {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/* ─── Status ─────────────────────────────────────────────────────────────── */

function statusLabel(c?: EvaluationCorrection | null) {
  if (!c) return 'Pendente'
  return ({ CONFIRMED: 'Confirmada', NEEDS_RETAKE: 'Reenviar foto', REJECTED: 'Rejeitada' } as Record<string, string>)[c.status] ?? 'Sugestão IA'
}

function statusConfig(status?: string | null): { pill: string; dot: string; left: string; avatar: string; glow: string } {
  if (!status) return {
    pill: 'bg-slate-100/80 text-slate-500 ring-1 ring-slate-300',
    dot: 'bg-slate-400',
    left: 'bg-slate-300',
    avatar: 'bg-slate-100 text-slate-500',
    glow: '',
  }
  return ({
    CONFIRMED: {
      pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300',
      dot: 'bg-emerald-500',
      left: 'bg-gradient-to-b from-emerald-400 to-emerald-600',
      avatar: 'bg-emerald-50 text-emerald-700',
      glow: 'shadow-emerald-100',
    },
    NEEDS_RETAKE: {
      pill: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300',
      dot: 'bg-amber-400',
      left: 'bg-gradient-to-b from-amber-400 to-amber-500',
      avatar: 'bg-amber-50 text-amber-700',
      glow: 'shadow-amber-100',
    },
    REJECTED: {
      pill: 'bg-rose-50 text-rose-700 ring-1 ring-rose-300',
      dot: 'bg-rose-500',
      left: 'bg-gradient-to-b from-rose-400 to-rose-600',
      avatar: 'bg-rose-50 text-rose-700',
      glow: 'shadow-rose-100',
    },
  } as Record<string, ReturnType<typeof statusConfig>>)[status] ?? {
    pill: 'bg-violet-50 text-violet-700 ring-1 ring-violet-300',
    dot: 'bg-violet-500',
    left: 'bg-gradient-to-b from-violet-400 to-violet-600',
    avatar: 'bg-violet-50 text-violet-700',
    glow: 'shadow-violet-100',
  }
}

/* ─── Confidence ─────────────────────────────────────────────────────────── */

function confLabel(v: number) { return v >= 0.85 ? 'Alta' : v >= 0.65 ? 'Média' : 'Baixa' }
function confText(v: number) { return v >= 0.85 ? 'text-emerald-600' : v >= 0.65 ? 'text-amber-600' : 'text-rose-600' }
function confBar(v: number)  { return v >= 0.85 ? 'from-emerald-400 to-emerald-500' : v >= 0.65 ? 'from-amber-300 to-amber-500' : 'from-rose-400 to-rose-500' }
function confBg(v: number)   { return v >= 0.85 ? 'bg-emerald-500' : v >= 0.65 ? 'bg-amber-400' : 'bg-rose-500' }

/* ─── Attention labels ───────────────────────────────────────────────────── */

const ATTN: Record<string, string> = {
  BLANK_ANSWERS_DETECTED: 'Questões em branco',
  BLURRY_IMAGE: 'Foto desfocada',
  CARD_NOT_FOUND: 'Cartão não encontrado',
  IMAGE_TOO_SMALL: 'Resolução muito baixa',
  LOW_CONFIDENCE_ANSWERS: 'Baixa confiança na leitura',
  LOW_CONTRAST: 'Baixo contraste',
  LOW_LIGHT: 'Foto escura',
  MULTIPLE_MARKS_DETECTED: 'Dupla marcação detectada',
  OVEREXPOSED: 'Foto muito clara',
  QR_EXAM_ID_MISMATCH: 'QR Code de outra prova',
  QR_NOT_FOUND: 'QR Code não encontrado',
}
function fmtAttn(v: string) {
  return ATTN[v] ?? v.replace(/_/g, ' ').toLowerCase().replace(/^\w/, l => l.toUpperCase())
}

function ansStatusLabel(v: string) {
  return ({ ok: 'OK', blank: 'Em branco', multiple: 'Dupla marca', low_confidence: 'Baixa confiança' } as Record<string, string>)[v] ?? 'Não lida'
}
function ansStatusConfig(v: string) {
  return ({
    ok:             { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300', dot: 'bg-emerald-500' },
    blank:          { cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-300', dot: 'bg-slate-400' },
    multiple:       { cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-300', dot: 'bg-rose-500' },
    low_confidence: { cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300', dot: 'bg-amber-400' },
  } as Record<string, { cls: string; dot: string }>)[v] ?? { cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-300', dot: 'bg-slate-300' }
}

/* ─── Asset helpers ──────────────────────────────────────────────────────── */

function fileKindFromResponse(file: ApiFileResponse): CorrectionCardPreview['kind'] {
  return safeApiFilePreviewKind(file.contentType)
}

function PdfPreview({ url, title, className = '' }: { url: string; title: string; className?: string }) {
  return (
    <iframe
      src={url}
      title={title}
      sandbox=""
      referrerPolicy="no-referrer"
      className={`h-full w-full rounded-2xl border border-slate-300 bg-white ${className}`}
    >
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white p-6 text-center font-['DM_Sans']">
        <FileText className="h-8 w-8 text-slate-300" />
        <div>
          <p className="text-sm font-semibold text-slate-600">O Chrome bloqueou a visualização embutida.</p>
          <p className="mt-1 text-xs text-slate-400">Abra o PDF em uma aba separada para visualizar o arquivo.</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Abrir PDF
        </a>
      </div>
    </iframe>
  )
}

/* ─── Spinner ────────────────────────────────────────────────────────────── */

function Spin({ sm, dark }: { sm?: boolean; dark?: boolean }) {
  return (
    <span className={`${sm ? 'h-3.5 w-3.5' : 'h-4 w-4'} animate-spin rounded-full border-2 ${dark ? 'border-slate-300 border-t-indigo-600' : 'border-white/30 border-t-white'} inline-block shrink-0`} />
  )
}

/* ─── Shimmer skeleton ───────────────────────────────────────────────────── */

function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  )
}

function SkeletonStudentCard() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <Bone className="h-10 w-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3 w-3/5" />
        <Bone className="h-2.5 w-2/5" />
      </div>
      <Bone className="h-6 w-20 rounded-full" />
    </div>
  )
}

function SkeletonReviewPanel() {
  return (
    <div className="flex flex-col gap-6 p-7">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex items-center gap-5">
        <Bone className="h-14 w-14 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-3">
          <Bone className="h-4 w-36" />
          <Bone className="h-3 w-28" />
        </div>
        <Bone className="h-16 w-24 rounded-2xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Bone key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Bone className="h-[280px] rounded-2xl" />
    </div>
  )
}

/* ─── Label chip ─────────────────────────────────────────────────────────── */

function Chip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase font-['DM_Sans'] ${className}`}>
      {children}
    </span>
  )
}

/* ─── Section label ──────────────────────────────────────────────────────── */

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-bold tracking-[.18em] uppercase text-slate-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

/* ─── EmptyState ─────────────────────────────────────────────────────────── */

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-indigo-300 bg-white text-indigo-300 shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-600 font-['DM_Sans']">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">{sub}</p>
      </div>
    </div>
  )
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl px-5 py-4 text-sm font-medium animate-in fade-in slide-in-from-top-3 duration-300 font-['DM_Sans'] shadow-lg border
      ${type === 'error'
        ? 'border-rose-200 bg-white text-rose-700 shadow-rose-100/60'
        : 'border-emerald-200 bg-white text-emerald-700 shadow-emerald-100/60'}`}>
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${type === 'error' ? 'bg-rose-100' : 'bg-emerald-100'}`}>
        {type === 'error'
          ? <X className="h-3 w-3 text-rose-600" />
          : <Check className="h-3 w-3 text-emerald-600" />}
      </div>
      <span className="flex-1 leading-relaxed">{message}</span>
      <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1 hover:bg-slate-100 transition text-slate-400 hover:text-slate-600">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ─── BatchResultSummary ─────────────────────────────────────────────────── */

function batchStatusConfig(status: string) {
  if (status === 'corrigido') return { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300', label: 'OK' }
  if (status === 'precisa_revisao') return { cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300', label: 'Rev.' }
  return { cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-300', label: 'Erro' }
}

function BatchResultSummary({
  summary, uploadedFiles, onOpenFiles, onClear,
}: {
  summary: EvaluationOmrBatchResponse
  uploadedFiles: BatchUploadedFilePreview[]
  onOpenFiles: () => void
  onClear: () => void
}) {
  const results = getBatchResults(summary).slice(0, 8)

  const counters = [
    { l: 'Enviados',   v: getBatchTotalSent(summary),   bg: 'bg-slate-50 ring-1 ring-slate-300',           val: 'text-slate-800', icon: Layers },
    { l: 'Corrigidos', v: getBatchCorrected(summary),   bg: 'bg-emerald-50 ring-1 ring-emerald-300',        val: 'text-emerald-700', icon: CheckCheck },
    { l: 'Revisão',    v: getBatchNeedsReview(summary), bg: 'bg-amber-50 ring-1 ring-amber-300',            val: 'text-amber-700', icon: Clock },
    { l: 'Erros',      v: getBatchErrorCount(summary),  bg: 'bg-rose-50 ring-1 ring-rose-300',              val: 'text-rose-700', icon: ZapOff },
  ]

  return (
    <section className="animate-in fade-in slide-in-from-top-3 duration-400 rounded-2xl border border-indigo-200 bg-white overflow-hidden shadow-lg shadow-indigo-50">
      <div className="h-px w-full bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-400" />
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50/60 to-violet-50/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
            <ScanLine className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 font-['DM_Sans']">Resultado do lote</p>
            <Label>QR Code · identificação automática</Label>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {uploadedFiles.length > 0 && (
            <button type="button" onClick={onOpenFiles}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-sm font-['DM_Sans']">
              <Eye className="h-3.5 w-3.5" /> Ver arquivos
            </button>
          )}
          <button type="button" onClick={onClear}
            className="grid h-8 w-8 place-items-center rounded-xl border border-slate-300 bg-white text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-6 sm:grid-cols-[160px_1fr]">
        <div className="flex flex-col gap-2">
          {counters.map(s => (
            <div key={s.l} className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${s.bg}`}>
              <div className="flex items-center gap-2">
                <s.icon className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10.5px] font-bold tracking-wide uppercase text-slate-500 font-['DM_Sans']">{s.l}</span>
              </div>
              <span className={`text-lg font-bold font-['Lora'] ${s.val}`}>{s.v}</span>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <Label>Itens processados</Label>
          </div>
          <div className="flex max-h-[188px] flex-col overflow-y-auto divide-y divide-slate-100">
            {results.length === 0 ? (
              <p className="px-4 py-5 text-xs text-slate-400 font-['DM_Sans']">Nenhum item detalhado retornado pela API.</p>
            ) : results.map((item, i) => {
              const cardId = item.cardId ?? item.cartao_id ?? ''
              const name = item.studentName ?? item.aluno_nome ?? ''
              const detail = item.motivo ?? (typeof (item.nota ?? item.score) === 'number' ? `Nota ${fmt(item.nota ?? item.score)}` : '')
              const cfg = batchStatusConfig(item.status)
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors">
                  <span className={`shrink-0 inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  <span className="flex-1 truncate text-xs font-semibold text-slate-700 font-['DM_Sans']">{name || cardId || '—'}</span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-400">{detail || '—'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── StudentCard ────────────────────────────────────────────────────────── */

function StudentCard({
  student, correction, answerCard, isProcessing, isSelected, animDelay, onSelect, onFileChange,
}: {
  student: Student
  correction?: EvaluationCorrection
  answerCard?: EvaluationAnswerCard
  isProcessing: boolean
  isSelected: boolean
  animDelay: number
  onSelect: () => void
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  const initials = student.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const cardId = getAnswerCardId(answerCard)
  const sc = statusConfig(correction?.status)
  const score = correction ? (correction.finalScore ?? correction.suggestedScore) : null

  return (
    <div
      style={{ animationDelay: `${animDelay}ms` }}
      onClick={correction ? onSelect : undefined}
      className={`group relative flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both overflow-hidden cursor-pointer
        ${isSelected
          ? 'border-indigo-400 shadow-lg shadow-indigo-50 ring-1 ring-indigo-200'
          : 'border-slate-300 hover:border-indigo-300 hover:shadow-md hover:shadow-slate-100'}`}
    >
      {/* Left accent bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-all duration-300 ${sc.left} ${isSelected ? 'opacity-100' : 'opacity-30 group-hover:opacity-60'}`} />

      {/* Selected glow bg */}
      {isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/60 to-transparent pointer-events-none" />
      )}

      {/* Avatar */}
      <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold transition-transform group-hover:scale-105 ${sc.avatar} shadow-sm border border-slate-300`}>
        {initials || '?'}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white ${sc.dot}`} />
      </div>

      {/* Name + registration */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800 leading-tight font-['DM_Sans']">
          {student.name}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5 font-['DM_Sans'] truncate">
          {student.registrationNumber || student.registration || student.login}
          {cardId && <span className="ml-1.5 text-indigo-400">· #{cardId}</span>}
        </p>
      </div>

      {/* Score */}
      {score != null && (
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-slate-800 leading-none font-['Lora'] tabular-nums">{fmt(score)}</p>
          <p className="text-[9.5px] text-slate-400 mt-0.5 font-['DM_Sans']">{correction!.correctCount}/{correction!.totalQuestions}</p>
        </div>
      )}

      {/* Status pill — shown only when there's a correction */}
      {correction && (
        <span className={`shrink-0 hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold font-['DM_Sans'] ${sc.pill}`}>
          {correction.status === 'CONFIRMED' && <Check className="h-2.5 w-2.5" />}
          {statusLabel(correction)}
        </span>
      )}

      {/* Upload button */}
      <label
        onClick={e => e.stopPropagation()}
        className={`shrink-0 inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95 font-['DM_Sans']
          ${isProcessing
            ? 'border-slate-300 bg-slate-50 text-slate-400 cursor-not-allowed'
            : correction
              ? 'border-slate-300 bg-white text-slate-500 opacity-0 group-hover:opacity-100 hover:border-indigo-400 hover:bg-indigo-600 hover:text-white hover:shadow-md hover:shadow-indigo-200'
              : 'border-indigo-400 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'}`}
      >
        {isProcessing ? <Spin sm dark /> : <Camera className="h-3 w-3" />}
        {isProcessing ? 'Enviando…' : correction ? 'Reenviar' : 'Enviar foto'}
        <input type="file" accept={OMR_UPLOAD_ACCEPT} className="hidden" disabled={isProcessing} onChange={onFileChange} />
      </label>
    </div>
  )
}

/* ─── ReviewPanel ────────────────────────────────────────────────────────── */

function ReviewPanel({
  correction, students, finalScore, teacherNotes, reviewing, questionValues,
  configuredTotal, hasCardFile, onFinalScoreChange, onTeacherNotesChange, onQValChange, onPreview, onSubmit,
}: {
  correction: EvaluationCorrection
  students: Student[]
  finalScore: string
  teacherNotes: string
  reviewing: boolean
  questionValues: Record<number, string>
  configuredTotal: number
  hasCardFile: boolean
  onFinalScoreChange: (v: string) => void
  onTeacherNotesChange: (v: string) => void
  onQValChange: (qn: number, v: string) => void
  onPreview: () => void
  onSubmit: (status: EvaluationCorrectionReviewPayload['status']) => void
}) {
  const student = students.find(s => s.id === correction.studentId)
  const pct = Math.round((correction.correctCount / Math.max(correction.totalQuestions, 1)) * 100)
  const confPct = Math.round(correction.confidence * 100)
  const hasIssues = correction.failures.length > 0 || correction.shouldRetakeImage
  const sc = statusConfig(correction.status)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">

      {/* ── 1. Identificação do aluno ── */}
      <div className="shrink-0 px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center border-2 rounded-2xl text-sm font-bold shadow-sm ${sc.avatar} ${sc.glow}`}
            style={{ borderColor: correction.status === 'CONFIRMED' ? '#6ee7b7' : correction.status === 'NEEDS_RETAKE' ? '#fcd34d' : correction.status === 'REJECTED' ? '#fca5a5' : '#c4b5fd' }}>
            {student ? student.name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase() : '?'}
            <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${sc.dot}`} />
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 leading-tight font-['Lora'] truncate">
                {student?.name ?? 'Aluno'}
              </h2>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold font-['DM_Sans'] ${sc.pill}`}>
                {correction.status === 'CONFIRMED' && <Check className="h-2.5 w-2.5" />}
                {statusLabel(correction)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-['DM_Sans']">
              {student?.registrationNumber || student?.registration || student?.login}
            </p>
          </div>

          {/* Ver cartão button */}
          {hasCardFile && (
            <button type="button" onClick={onPreview}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 font-['DM_Sans']">
              <Eye className="h-3.5 w-3.5" />
              Ver cartão
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Resultado da leitura IA ── */}
      <div className="shrink-0 px-6 py-5 border-b border-slate-200 bg-slate-50/50">
        <Label className="mb-3">Resultado da leitura</Label>
        <div className="grid grid-cols-3 gap-3">
          {/* Nota sugerida pela IA */}
          <div className="rounded-2xl border border-violet-300 bg-white p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-violet-500" />
              <Label className="text-violet-500">Nota IA</Label>
            </div>
            <p className="text-3xl font-bold text-violet-700 leading-none font-['Lora'] tabular-nums mt-1">
              {fmt(correction.suggestedScore)}
            </p>
          </div>

          {/* Acertos */}
          <div className="rounded-2xl border border-slate-300 bg-white p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label>Acertos</Label>
              <span className="text-[10.5px] font-bold text-slate-500 font-['DM_Sans'] tabular-nums">{pct}%</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 leading-none font-['Lora'] tabular-nums mt-1">
              {correction.correctCount}<span className="text-slate-300 text-base">/{correction.totalQuestions}</span>
            </p>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden mt-1.5">
              <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ${confBar(pct / 100)}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Confiança */}
          <div className="rounded-2xl border border-slate-300 bg-white p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-slate-400" />
              <Label>Confiança</Label>
            </div>
            <p className={`text-2xl font-bold leading-none font-['Lora'] tabular-nums mt-1 ${confText(correction.confidence)}`}>
              {confPct}%
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-1000 ${confBar(correction.confidence)}`}
                  style={{ width: `${confPct}%` }} />
              </div>
              <span className={`text-[10px] font-bold shrink-0 font-['DM_Sans'] ${confText(correction.confidence)}`}>
                {confLabel(correction.confidence)}
              </span>
            </div>
          </div>
        </div>

        {/* Nota final confirmada — destaque só se já existe */}
        {correction.finalScore != null && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <Label className="text-emerald-500">Nota final confirmada</Label>
              <p className="text-2xl font-bold text-emerald-700 leading-none font-['Lora'] tabular-nums">
                {fmt(correction.finalScore)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Alertas (se houver) ── */}
      {hasIssues && (
        <div className="shrink-0 border-b border-amber-300 bg-amber-50 px-6 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <Label className="text-amber-600">Pontos de atenção</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {correction.shouldRetakeImage && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm font-['DM_Sans']">
                <RotateCcw className="h-3 w-3" /> Reenvio da foto recomendado
              </span>
            )}
            {correction.failures.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm font-['DM_Sans']">
                <AlertCircle className="h-3 w-3 shrink-0 text-amber-400" /> {fmtAttn(f)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Gabarito detectado ── */}
      <div className="flex min-h-[320px] flex-1 flex-col border-b border-slate-200">
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-indigo-500" />
            <Label>Gabarito detectado pela IA</Label>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 font-['DM_Sans'] bg-white rounded-lg border border-slate-300 px-2.5 py-1">
            {(correction.detectedAnswers ?? []).length} questões
          </span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[36px_60px_60px_1fr_110px_72px] gap-2 bg-slate-50/50 px-6 py-2.5 border-b border-slate-200">
          {['Nº', 'Detectada', 'Gabarito', 'Status', 'Valor (pts)', 'Conf.'].map(h => (
            <Label key={h}>{h}</Label>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-100">
          {(correction.detectedAnswers ?? []).map((ans, i) => {
            const asc = ansStatusConfig(ans.status)
            return (
              <div
                key={ans.questionNumber}
                style={{ animationDelay: `${i * 8}ms` }}
                className={`grid grid-cols-[36px_60px_60px_1fr_110px_72px] items-center gap-2 px-6 py-2.5 transition-colors animate-in fade-in duration-200 fill-mode-both
                  ${ans.isCorrect ? 'hover:bg-slate-50/60' : 'bg-rose-50/30 hover:bg-rose-50/60'}`}
              >
                <span className="text-[11px] font-bold text-slate-400 font-['DM_Sans'] tabular-nums">#{ans.questionNumber}</span>

                <div className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-bold font-['Lora'] shadow-sm
                  ${ans.isCorrect ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-300'}`}>
                  {ans.detectedOption ?? '—'}
                </div>

                <div className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 font-['Lora'] shadow-sm">
                  {ans.correctOption}
                </div>

                <span className={`text-[10.5px] font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-['DM_Sans'] ${asc.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${asc.dot}`} />
                  {ansStatusLabel(ans.status)}
                </span>

                <input
                  type="number" min={0} max={10} step={0.1}
                  value={questionValues[ans.questionNumber] ?? ''}
                  onChange={e => onQValChange(ans.questionNumber, e.target.value)}
                  className="h-8 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-indigo-300 font-['DM_Sans'] shadow-sm tabular-nums"
                />

                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r transition-all ${confBar(ans.confidence)}`}
                      style={{ width: `${Math.round(ans.confidence * 100)}%` }} />
                  </div>
                  <span className={`text-[9.5px] font-bold shrink-0 tabular-nums font-['DM_Sans'] ${confText(ans.confidence)}`}>
                    {Math.round(ans.confidence * 100)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 5. Revisão manual + ação ── */}
      <div className="shrink-0 px-6 py-5 bg-white space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-violet-500" />
          <Label>Revisão e decisão final</Label>
        </div>

        <div className="grid gap-4 sm:grid-cols-[140px_140px_1fr]">
          {/* Nota final */}
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-600 font-['DM_Sans']">Nota final</span>
            <input
              type="number" min={0} max={10} step={0.1}
              value={finalScore}
              onChange={e => onFinalScoreChange(e.target.value)}
              className="h-14 rounded-2xl border border-slate-300 bg-white px-3 text-3xl font-bold text-indigo-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-indigo-300 text-center font-['Lora'] shadow-sm tabular-nums"
            />
          </label>

          {/* Total configurado */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-600 font-['DM_Sans']">Total configurado</span>
            <div className="flex h-14 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 text-3xl font-bold text-slate-300 font-['Lora'] tabular-nums">
              {fmt(configuredTotal)}
            </div>
          </div>

          {/* Observação */}
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-600 font-['DM_Sans']">Observação (opcional)</span>
            <textarea
              value={teacherNotes}
              onChange={e => onTeacherNotesChange(e.target.value)}
              rows={3}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 resize-none hover:border-indigo-300 font-['DM_Sans'] shadow-sm"
              placeholder="Anotações do professor…"
            />
          </label>
        </div>

        {/* CTA principal */}
        <button
          type="button"
          disabled={reviewing}
          onClick={() => onSubmit('CONFIRMED')}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 font-['DM_Sans']"
        >
          {reviewing ? <Spin sm /> : <CheckCircle2 className="h-4 w-4" />}
          Confirmar nota
        </button>
      </div>
    </div>
  )
}

/* ─── LightModal ─────────────────────────────────────────────────────────── */

function LightModal({
  open, onClose, title, subtitle, wide, children,
}: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; wide?: boolean; children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(6px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`flex flex-col bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden
        animate-in zoom-in-95 slide-in-from-bottom-4 duration-250 w-full
        ${wide ? 'h-[90vh] max-w-5xl' : 'max-h-[90vh] max-w-3xl'}`}>
        <div className="h-px w-full bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-400" />
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 border border-indigo-200">
              <ScanLine className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 font-['DM_Sans']">{title}</p>
              {subtitle && <p className="text-xs text-slate-400 truncate font-['DM_Sans'] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-300 bg-white text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 active:scale-95">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 bg-slate-100/50 p-4">{children}</div>
      </div>
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────────────────── */

export default function EvaluationCorrectionsView({
  evaluations: allEvaluations,
  classes: allClasses,
  schools = [],
  students: allStudents,
  corrections: allCorrections,
  answerCards: allAnswerCards = [],
  canFilterBySchool = false,
  onLoadSchoolScope,
  onProcess,
  onBatchProcess,
  onReview,
  onReviewMany,
  onLoadStudentsPage,
  onDownloadEvaluation,
  onDownloadAnswerCards,
  onLoadCorrectionDetail,
  onLoadCorrectionCardPreview,
}: EvaluationCorrectionsViewProps) {
  const [schoolId, setSchoolId] = useState('')
  const [schoolScopeData, setSchoolScopeData] = useState<Pick<
    EvaluationsScreenPayload,
    'evaluations' | 'classes' | 'students' | 'evaluationCorrections' | 'answerCards' | 'schools'
  > | null>(null)
  const [schoolScopeLoading, setSchoolScopeLoading] = useState(false)
  const [schoolScopeError, setSchoolScopeError] = useState<string | null>(null)
  const [classId, setClassId] = useState('')
  const [evaluationId, setEvaluationId] = useState('')
  const [selectedCorrectionId, setSelectedCorrectionId] = useState('')
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null)
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchSummary, setBatchSummary] = useState<EvaluationOmrBatchResponse | null>(null)
  const [batchFilesPreview, setBatchFilesPreview] = useState<BatchUploadedFilePreview[]>([])
  const [batchPreviewFile, setBatchPreviewFile] = useState<BatchUploadedFilePreview | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [confirmingAll, setConfirmingAll] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finalScore, setFinalScore] = useState('')
  const [teacherNotes, setTeacherNotes] = useState('')
  const [previewCorrection, setPreviewCorrection] = useState<EvaluationCorrection | null>(null)
  const [previewCard, setPreviewCard] = useState<CorrectionCardPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [correctionDetails, setCorrectionDetails] = useState<Record<string, EvaluationCorrection>>({})
  const [studentSearch, setStudentSearch] = useState('')
  const [studentPage, setStudentPage] = useState(1)
  const [studentLimit, setStudentLimit] = useState(DEFAULT_PAGE_SIZE)
  const [studentPagePayload, setStudentPagePayload] = useState<StudentsPagePayload | null>(null)
  const [studentPageLoading, setStudentPageLoading] = useState(false)
  const [studentPageSource, setStudentPageSource] = useState<'backend' | 'local'>(onLoadStudentsPage ? 'backend' : 'local')
  const [questionValues, setQuestionValues] = useState<Record<number, string>>({})
  const [reviewLoading, setReviewLoading] = useState(false)
  const batchInputRef = useRef<HTMLInputElement>(null)
  const batchFileUrlsRef = useRef<string[]>([])
  const previewRequestRef = useRef(0)

  useEffect(() => {
    if (!canFilterBySchool || !schoolId || !onLoadSchoolScope) {
      setSchoolScopeData(null)
      setSchoolScopeLoading(false)
      setSchoolScopeError(null)
      return
    }

    let cancelled = false
    setSchoolScopeLoading(true)
    setSchoolScopeError(null)
    onLoadSchoolScope(schoolId)
      .then((payload) => {
        if (!cancelled) setSchoolScopeData(payload)
      })
      .catch((err) => {
        if (cancelled) return
        setSchoolScopeData(null)
        setSchoolScopeError(err instanceof Error ? err.message : 'Não foi possível carregar dados desta escola.')
      })
      .finally(() => {
        if (!cancelled) setSchoolScopeLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canFilterBySchool, onLoadSchoolScope, schoolId])

  useEffect(() => {
    setClassId('')
    setEvaluationId('')
    setSelectedCorrectionId('')
    setStudentPage(1)
    setStudentSearch('')
  }, [schoolId])

  const schoolOptions = useMemo<Array<CompactSelectOption<string>>>(() => [
    { value: '', label: 'Todas as escolas' },
    ...schools.map((school) => ({ value: school.id, label: school.name, description: school.city })),
  ], [schools])

  const classes = useMemo(() => {
    if (schoolScopeData?.classes) return schoolScopeData.classes
    if (!schoolId) return allClasses
    return allClasses.filter((classRoom) => classRoom.schoolId === schoolId)
  }, [allClasses, schoolId, schoolScopeData?.classes])

  const classIds = useMemo(() => new Set(classes.map((classRoom) => classRoom.id)), [classes])

  const evaluations = useMemo(() => {
    const source = schoolScopeData?.evaluations ?? allEvaluations
    return source.filter((evaluation) => {
      const matchesSchool = !schoolId || evaluation.schoolId === schoolId || classIds.has(evaluation.classId)
      const matchesClassScope = classIds.size === 0 || classIds.has(evaluation.classId)
      return matchesSchool && matchesClassScope
    })
  }, [allEvaluations, classIds, schoolId, schoolScopeData?.evaluations])

  const evaluationIds = useMemo(() => new Set(evaluations.map((evaluation) => evaluation.id)), [evaluations])

  const students = useMemo(() => {
    const source = schoolScopeData?.students ?? allStudents
    return source.filter((student) => {
      if (classIds.size && classIds.has(student.classId)) return true
      return !schoolId || student.schoolId === schoolId
    })
  }, [allStudents, classIds, schoolId, schoolScopeData?.students])

  const corrections = useMemo(() => {
    const source = schoolScopeData?.evaluationCorrections ?? allCorrections
    return source.filter((correction) => {
      if (evaluationIds.has(correction.evaluationId)) return true
      if (classIds.has(correction.classId)) return true
      return Boolean(schoolId && correction.schoolId === schoolId)
    })
  }, [allCorrections, classIds, evaluationIds, schoolId, schoolScopeData?.evaluationCorrections])

  const answerCards = useMemo(() => {
    const source = schoolScopeData?.answerCards ?? allAnswerCards
    return source.filter((card) => {
      const evaluationId = getAnswerCardEvaluationId(card)
      if (evaluationId && evaluationIds.has(evaluationId)) return true
      const classId = card.classId ?? card.turma_id
      if (classId && classIds.has(classId)) return true
      const cardSchoolId = card.schoolId ?? card.escola_id
      return Boolean(schoolId && cardSchoolId === schoolId)
    })
  }, [allAnswerCards, classIds, evaluationIds, schoolId, schoolScopeData?.answerCards])

  /* Bootstrap */
  useEffect(() => {
    if (!classes.length) {
      if (classId) setClassId('')
      return
    }
    if (!classId || !classes.some((classRoom) => classRoom.id === classId)) setClassId(classes[0].id)
  }, [classId, classes])

  const classOptions = useMemo<Array<CompactSelectOption<string>>>(() => [
    { value: '', label: 'Selecione a turma' },
    ...classes.map(c => ({ value: c.id, label: c.name, description: `${c.grade} · ${c.shift}` })),
  ], [classes])

  const classEvaluations = useMemo(
    () => evaluations.filter(e => !classId || e.classId === classId),
    [classId, evaluations],
  )

  useEffect(() => {
    if (evaluationId && classEvaluations.some(e => e.id === evaluationId)) return
    setEvaluationId(classEvaluations[0]?.id ?? '')
    setSelectedCorrectionId('')
  }, [classEvaluations, evaluationId])

  const evaluationOptions = useMemo<Array<CompactSelectOption<string>>>(() => [
    { value: '', label: classId ? 'Selecione a prova' : 'Escolha uma turma primeiro' },
    ...classEvaluations.map(e => ({ value: e.id, label: e.title, description: `${e.questions} questões` })),
  ], [classEvaluations, classId])

  const selectedEvaluation = evaluations.find(e => e.id === evaluationId) ?? null
  const selectedClass = classes.find(c => c.id === classId) ?? null

  const evaluationAnswerCards = useMemo(
    () => answerCards.filter(card => getAnswerCardEvaluationId(card) === evaluationId),
    [answerCards, evaluationId],
  )
  const answerCardByStudentId = useMemo(() => {
    const entries: Array<[string, EvaluationAnswerCard]> = []
    for (const card of evaluationAnswerCards) {
      const sid = getAnswerCardStudentId(card)
      if (sid) entries.push([sid, card])
    }
    return new Map(entries)
  }, [evaluationAnswerCards])

  const classStudents = useMemo(
    () => students.filter(s => !classId || s.classId === classId),
    [classId, students],
  )

  const filteredClassStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return classStudents
    return classStudents.filter(s =>
      [s.name, s.registrationNumber, s.registration, s.login].some(v =>
        String(v ?? '').toLowerCase().includes(q),
      ),
    )
  }, [classStudents, studentSearch])

  useEffect(() => {
    if (!onLoadStudentsPage || !classId) {
      setStudentPagePayload(null); setStudentPageLoading(false); setStudentPageSource('local'); return
    }
    let cancelled = false
    setStudentPageLoading(true)
    onLoadStudentsPage({ page: studentPage, limit: studentLimit, search: studentSearch, classId, schoolId: selectedClass?.schoolId })
      .then(data => { if (!cancelled) { setStudentPagePayload(data); setStudentPageSource('backend') } })
      .catch(() => { if (!cancelled) { setStudentPagePayload(null); setStudentPageSource('local') } })
      .finally(() => { if (!cancelled) setStudentPageLoading(false) })
    return () => { cancelled = true }
  }, [classId, onLoadStudentsPage, selectedClass?.schoolId, studentLimit, studentPage, studentSearch])

  const localPageData = useMemo(
    () => paginateLocal(filteredClassStudents, studentPage, studentLimit),
    [filteredClassStudents, studentLimit, studentPage],
  )
  const displayedStudents = studentPagePayload?.students ?? localPageData.items
  const pagination = studentPagePayload?.pagination ?? localPageData.pagination

  const evalCorrections = useMemo(
    () => corrections.filter(c => c.evaluationId === evaluationId),
    [corrections, evaluationId],
  )
  const corrByStudentId = useMemo(
    () => new Map(evalCorrections.map(c => [c.studentId, c])),
    [evalCorrections],
  )
  const selectedCorrectionSummary = evalCorrections.find(c => c.id === selectedCorrectionId) ?? evalCorrections[0] ?? null
  const selectedCorrection = selectedCorrectionSummary
    ? (correctionDetails[selectedCorrectionSummary.id] ?? selectedCorrectionSummary)
    : null
  const confirmableCorrections = useMemo(
    () => evalCorrections.filter(c => c.status !== 'CONFIRMED'),
    [evalCorrections],
  )

  useEffect(() => {
    if (!selectedCorrectionSummary || !onLoadCorrectionDetail) return
    const correctionId = selectedCorrectionSummary.id
    if (selectedCorrectionSummary.detectedAnswers !== undefined || correctionDetails[correctionId]) return

    let cancelled = false
    setReviewLoading(true)
    onLoadCorrectionDetail(correctionId)
      .then((detail) => {
        if (cancelled) return
        setCorrectionDetails((current) => ({
          ...current,
          [correctionId]: { ...selectedCorrectionSummary, ...detail },
        }))
      })
      .catch(() => {
        if (!cancelled) setCorrectionDetails((current) => ({ ...current, [correctionId]: selectedCorrectionSummary }))
      })
      .finally(() => { if (!cancelled) setReviewLoading(false) })

    return () => { cancelled = true }
  }, [correctionDetails, onLoadCorrectionDetail, selectedCorrectionSummary])

  /* Sync review fields */
  useEffect(() => {
    if (!selectedCorrection) { setFinalScore(''); setTeacherNotes(''); setReviewLoading(false); return }
    setReviewLoading(true)
    setFinalScore(String(selectedCorrection.finalScore ?? selectedCorrection.suggestedScore ?? ''))
    setTeacherNotes(selectedCorrection.teacherNotes ?? '')
    const t = setTimeout(() => setReviewLoading(false), 240)
    return () => clearTimeout(t)
  }, [selectedCorrection?.id])

  useEffect(() => { setStudentPage(1) }, [classId, evaluationId, studentSearch, studentLimit])

  useEffect(() => {
    if (!selectedCorrection) { setQuestionValues({}); return }
    const def = selectedCorrection.totalQuestions > 0 ? 10 / selectedCorrection.totalQuestions : 0
    setQuestionValues(Object.fromEntries(
      (selectedCorrection.detectedAnswers ?? []).map(a => [a.questionNumber, fmtQVal(def)]),
    ))
  }, [selectedCorrection?.id])

  const calcFinal = useMemo(() => {
    if (!selectedCorrection) return 0
    return (selectedCorrection.detectedAnswers ?? []).reduce(
      (acc, a) => a.isCorrect ? acc + parseQVal(questionValues[a.questionNumber]) : acc, 0,
    )
  }, [questionValues, selectedCorrection])

  const configuredTotal = useMemo(() => {
    if (!selectedCorrection) return 0
    return (selectedCorrection.detectedAnswers ?? []).reduce(
      (acc, a) => acc + parseQVal(questionValues[a.questionNumber]), 0,
    )
  }, [questionValues, selectedCorrection])

  useEffect(() => {
    if (!selectedCorrection) return
    setFinalScore(fmtQVal(Math.min(10, calcFinal)))
  }, [calcFinal, selectedCorrection?.id])

  useEffect(() => () => {
    batchFileUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    batchFileUrlsRef.current = []
  }, [])

  useEffect(() => () => {
    if (previewCard?.url) URL.revokeObjectURL(previewCard.url)
  }, [previewCard?.url])

  /* Handlers */
  function closeCorrectionPreview() {
    previewRequestRef.current += 1
    if (previewCard?.url) URL.revokeObjectURL(previewCard.url)
    setPreviewCard(null)
    setPreviewCorrection(null)
    setPreviewLoading(false)
  }

  async function openCorrectionPreview(correction: EvaluationCorrection) {
    if (!onLoadCorrectionCardPreview) return
    const requestId = previewRequestRef.current + 1
    previewRequestRef.current = requestId
    if (previewCard?.url) URL.revokeObjectURL(previewCard.url)
    setPreviewCorrection(correction)
    setPreviewCard(null)
    setPreviewLoading(true)
    setError(null)
    try {
      const file = await onLoadCorrectionCardPreview(correction.id)
      const url = URL.createObjectURL(file.blob)
      if (previewRequestRef.current !== requestId) { URL.revokeObjectURL(url); return }
      setPreviewCard({ correction, url, kind: fileKindFromResponse(file), filename: file.filename })
    } catch (err) {
      if (previewRequestRef.current === requestId) {
        setPreviewCorrection(null)
        setError(err instanceof Error ? err.message : 'Não foi possível abrir o cartão enviado.')
      }
    } finally {
      if (previewRequestRef.current === requestId) setPreviewLoading(false)
    }
  }

  async function handleImageChange(student: Student, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedEvaluation) return
    const validation = await validateOmrFile(file)
    if (!validation.ok) { setError(validation.message ?? 'Arquivo OMR inválido.'); setNotice(null); return }
    setProcessingStudentId(student.id)
    setError(null); setNotice(null)
    try {
      const c = await onProcess(selectedEvaluation.id, student.id, file)
      setSelectedCorrectionId(c.id)
      setFinalScore(String(c.suggestedScore))
      setTeacherNotes(c.teacherNotes ?? '')
      setNotice(`Sugestão gerada para ${student.name}. Revise antes de confirmar.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível processar o cartão resposta.')
    } finally {
      setProcessingStudentId(null)
    }
  }

  async function handleBatchFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length || !selectedEvaluation || !onBatchProcess) return
    const validation = await validateOmrBatchFiles(files)
    if (!validation.ok) { setError(validation.message ?? 'Lote OMR inválido.'); setNotice(null); return }
    setBatchProcessing(true); setError(null); setNotice(null); setBatchSummary(null)
    batchFileUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    const previews = files.map((file, idx) => {
      const url = URL.createObjectURL(file)
      return { id: `${Date.now()}-${idx}-${file.name}`, name: file.name, type: file.type, size: file.size, url,
        kind: file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'other' } satisfies BatchUploadedFilePreview
    })
    batchFileUrlsRef.current = previews.map(f => f.url)
    setBatchFilesPreview(previews)
    try {
      const summary = await onBatchProcess(selectedEvaluation.id, files)
      setBatchSummary(summary)
      const first = getBatchCorrections(summary).find(c => c.evaluationId === selectedEvaluation.id) ?? getBatchCorrections(summary)[0]
      if (first) setSelectedCorrectionId(first.id)
      setNotice(`Lote processado: ${getBatchCorrected(summary)} corrigido(s), ${getBatchNeedsReview(summary)} para revisão.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível processar o lote OMR.')
    } finally {
      setBatchProcessing(false)
    }
  }

  async function submitReview(status: EvaluationCorrectionReviewPayload['status']) {
    if (!selectedCorrection) return
    setReviewing(true); setError(null); setNotice(null)
    try {
      const updated = await onReview(selectedCorrection.id, {
        status, finalScore: finalScore === '' ? null : Number(finalScore), teacherNotes,
      })
      setSelectedCorrectionId(updated.id)
      setNotice(status === 'CONFIRMED' ? 'Nota confirmada com sucesso!' : 'Revisão salva com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a revisão.')
    } finally {
      setReviewing(false)
    }
  }

  async function confirmAllCorrections() {
    if (confirmableCorrections.length === 0 || !selectedEvaluation) return
    setConfirmingAll(true); setError(null); setNotice(null)
    try {
      const payload: EvaluationCorrectionConfirmManyPayload = {
        corrections: confirmableCorrections.map((correction) => {
          const isSelected = correction.id === selectedCorrection?.id
          return {
            id: correction.id,
            finalScore: isSelected
              ? (finalScore === '' ? null : Number(finalScore))
              : (correction.finalScore ?? correction.suggestedScore),
            teacherNotes: isSelected ? teacherNotes : correction.teacherNotes,
          }
        }),
      }

      if (onReviewMany) {
        const response = await onReviewMany(selectedEvaluation.id, payload)
        const updated = response.corrections ?? []
        const nextSelected = selectedCorrection && updated.some(correction => correction.id === selectedCorrection.id)
          ? selectedCorrection.id
          : updated[0]?.id
        if (nextSelected) setSelectedCorrectionId(nextSelected)
        const confirmed = response.updatedCount ?? updated.length
        setNotice(`${confirmed} correção${confirmed === 1 ? '' : 'ões'} confirmada${confirmed === 1 ? '' : 's'} com sucesso.`)
        return
      }

      let confirmed = 0
      for (const correction of confirmableCorrections) {
        const isSelected = correction.id === selectedCorrection?.id
        const itemPayload = payload.corrections.find(item => item.id === correction.id)
        await onReview(correction.id, {
          status: 'CONFIRMED',
          finalScore: itemPayload?.finalScore,
          teacherNotes: isSelected ? teacherNotes : correction.teacherNotes,
        })
        confirmed += 1
      }
      setNotice(`${confirmed} correção${confirmed === 1 ? '' : 'ões'} confirmada${confirmed === 1 ? '' : 's'} com sucesso.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível confirmar todas as correções.')
    } finally {
      setConfirmingAll(false)
    }
  }

  /* Stats */
  const confirmedCount = evalCorrections.filter(c => c.status === 'CONFIRMED').length
  const pendingCount = Math.max(0, classStudents.length - confirmedCount)
  const progressPct = classStudents.length > 0 ? Math.round((confirmedCount / classStudents.length) * 100) : 0

  /* ── Render ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer { to { transform: translateX(200%) } }
        .fill-mode-both { animation-fill-mode: both }
      `}</style>

      <div className="min-h-screen w-full font-['DM_Sans'] bg-slate-100">
        <div className="mx-auto max-w-[1800px] px-[clamp(16px,3vw,48px)] py-8 pb-20 space-y-4">

          {/* ═══════════════════════════════════════
              PASSO 1 — CABEÇALHO E CONTEXTO
              Objetivo: orientar o usuário imediatamente.
              Turma + Prova em destaque, ações secundárias no canto.
          ═══════════════════════════════════════ */}
          <header className="animate-in fade-in slide-in-from-top-4 duration-500">

            {/* Linha do título + ações */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <Label className="mb-1">Correção automática por cartão resposta (OMR)</Label>
                <h1 className="text-3xl font-bold text-slate-900 leading-none font-DMSans tracking-tight">
                  Correção de Provas
                </h1>
              </div>

              {/* Ações de exportação — discretas, não distraem do fluxo principal */}
              {selectedEvaluation && (onDownloadEvaluation || onDownloadAnswerCards) && (
                <div className="flex items-center gap-2">
                  {onDownloadEvaluation && (
                    <button type="button" onClick={() => onDownloadEvaluation(selectedEvaluation.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-400/70 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 font-['DM_Sans']">
                      <FileDown className="h-3.5 w-3.5" /> Baixar prova
                    </button>
                  )}
                  {onDownloadAnswerCards && (
                    <button type="button" onClick={() => onDownloadAnswerCards(selectedEvaluation.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-400/70 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 font-['DM_Sans']">
                      <ScanLine className="h-3.5 w-3.5" /> Cartões da turma
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Card de contexto: Turma + Prova lado a lado, progresso à direita */}
            <div className="rounded-3xl border border-white/90 bg-white shadow-lg shadow-slate-200/60 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-400" />

              <div className={`grid divide-y divide-slate-300 lg:divide-y-0 lg:divide-x ${canFilterBySchool ? 'lg:grid-cols-[minmax(220px,0.8fr)_1fr_1fr_auto]' : 'sm:grid-cols-[1fr_1fr_auto]'}`}>

                {canFilterBySchool && (
                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[9px] font-black text-white shrink-0">1</span>
                      <Label>Selecione a escola</Label>
                    </div>
                    <CompactSelect
                      value={schoolId}
                      onChange={v => setSchoolId(v)}
                      options={schoolOptions}
                      disabled={schoolScopeLoading}
                      className="min-h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-indigo-300 font-['DM_Sans']"
                      dropdownMinWidth={280}
                    />
                    {schoolScopeLoading && (
                      <p className="text-xs font-semibold text-indigo-500 font-['DM_Sans']">Carregando turmas e provas...</p>
                    )}
                    {schoolScopeError && (
                      <p className="text-xs font-semibold text-amber-600 font-['DM_Sans']">{schoolScopeError}</p>
                    )}
                  </div>
                )}

                {/* Seleção de turma — Passo 1 */}
                <div className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-black text-white shrink-0">{canFilterBySchool ? '2' : '1'}</span>
                    <Label>Selecione a turma</Label>
                  </div>
                  <CompactSelect
                    value={classId}
                    onChange={v => { setClassId(v); setSelectedCorrectionId('') }}
                    options={classOptions}
                    className="min-h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-indigo-300 font-['DM_Sans']"
                    dropdownMinWidth={260}
                  />
                </div>

                {/* Seleção de prova — Passo 2 */}
                <div className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black shrink-0 transition-colors ${classId ? 'bg-violet-600 text-white' : 'bg-slate-300 text-slate-500'}`}>{canFilterBySchool ? '3' : '2'}</span>
                    <Label>Selecione a prova</Label>
                  </div>
                  <CompactSelect
                    value={evaluationId}
                    onChange={v => { setEvaluationId(v); setSelectedCorrectionId('') }}
                    options={evaluationOptions}
                    className="min-h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-indigo-300 font-['DM_Sans']"
                    dropdownMinWidth={320}
                  />
                  {selectedEvaluation && (
                    <p className="text-xs text-slate-400 font-['DM_Sans'] flex items-center gap-1.5 mt-1">
                      <BookOpen className="h-3 w-3 text-violet-400" />
                      {getAcademicSubjectLabel(selectedEvaluation.subject) || 'Matéria não informada'}
                      <span className="text-slate-300">·</span>
                      {selectedEvaluation.questions} questões
                    </p>
                  )}
                </div>

                {/* Progresso — síntese do estado atual */}
                <div className="p-5 min-w-[320px] flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { l: 'Alunos',      v: classStudents.length,        cls: 'text-slate-700', bg: 'bg-slate-50 ring-1 ring-slate-300' },
                      { l: 'Cartões',     v: evaluationAnswerCards.length, cls: 'text-indigo-700', bg: 'bg-indigo-50 ring-1 ring-indigo-300' },
                      { l: 'Confirmadas', v: confirmedCount,               cls: 'text-emerald-700', bg: 'bg-emerald-50 ring-1 ring-emerald-300' },
                      { l: 'Pendentes',   v: pendingCount,                 cls: 'text-amber-700', bg: 'bg-amber-50 ring-1 ring-amber-300' },
                    ].map(s => (
                      <div key={s.l} className={`flex flex-col items-center justify-center rounded-xl px-2 py-2.5 ${s.bg}`}>
                        <p className={`text-xl font-bold leading-none font-['Lora'] tabular-nums ${s.cls}`}>{s.v}</p>
                        <Label className="mt-1.5">{s.l}</Label>
                      </div>
                    ))}
                  </div>

                  {classStudents.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label>Progresso de confirmação</Label>
                        <span className="text-xs font-bold text-indigo-600 font-['DM_Sans'] tabular-nums">{progressPct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-300 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 transition-all duration-1000"
                          style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ═══════════════════════════════════════
              NOTIFICAÇÕES (toast + resultado de lote)
          ═══════════════════════════════════════ */}
          <div className="space-y-3">
            {(notice || error) && (
              <Toast
                message={(error ?? notice)!}
                type={error ? 'error' : 'success'}
                onClose={() => { setError(null); setNotice(null) }}
              />
            )}
            {batchSummary && (
              <BatchResultSummary
                summary={batchSummary}
                uploadedFiles={batchFilesPreview}
                onOpenFiles={() => setBatchPreviewFile(batchFilesPreview[0] ?? null)}
                onClear={() => setBatchSummary(null)}
              />
            )}
          </div>

          {/* ═══════════════════════════════════════
              PASSO 3 — GRADE PRINCIPAL
              Esquerda: lista de alunos + envio individual
              Direita: revisão da correção selecionada
          ═══════════════════════════════════════ */}
          <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(380px,0.75fr)_1.25fr]">

            {/* ── Coluna esquerda: Alunos ── */}
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/90 bg-white shadow-lg shadow-slate-200/60 animate-in fade-in slide-in-from-left-4 duration-500 delay-100">

              {/* Cabeçalho do painel de alunos */}
              <div className="border-b border-slate-300 px-5 pt-5 pb-4 bg-white">

                {/* Título + botão "confirmar todos" */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800 font-['DM_Sans']">
                      {selectedClass?.name ?? 'Alunos'}
                    </p>
                    {selectedClass && (
                      <p className="text-xs text-slate-400 font-['DM_Sans'] mt-0.5">
                        {classStudents.length} aluno{classStudents.length !== 1 ? 's' : ''} nesta turma
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={confirmAllCorrections}
                    disabled={!selectedEvaluation || confirmingAll || confirmableCorrections.length === 0}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 font-['DM_Sans']">
                    {confirmingAll ? <Spin sm dark /> : <CheckCheck className="h-3.5 w-3.5" />}
                    {confirmingAll ? 'Confirmando…' : 'Confirmar todos'}
                  </button>
                </div>

                {/* Upload em lote — ação primária se prova selecionada */}
                {onBatchProcess && selectedEvaluation && (
                  <div className="mb-4">
                    <button type="button" disabled={batchProcessing}
                      onClick={() => batchInputRef.current?.click()}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/60 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100/60 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 font-['DM_Sans']">
                      {batchProcessing ? <Spin sm dark /> : <ImageUp className="h-4 w-4" />}
                      {batchProcessing ? 'Processando lote…' : 'Enviar lote de cartões (todos os alunos)'}
                    </button>
                    <input ref={batchInputRef} type="file" accept={OMR_UPLOAD_ACCEPT} multiple className="hidden" onChange={handleBatchFiles} />
                  </div>
                )}

                {/* Separador visual e busca */}
                {selectedEvaluation && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <Label>ou envie individualmente abaixo</Label>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 transition-all focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 hover:border-indigo-300 hover:bg-white/80">
                      <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <input
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Buscar por nome ou matrícula…"
                        className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 font-['DM_Sans']"
                      />
                      {studentSearch && (
                        <button type="button" onClick={() => setStudentSearch('')}
                          className="shrink-0 rounded-lg p-0.5 hover:bg-slate-300 transition text-slate-400">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </label>
                  </>
                )}
              </div>

              {/* Lista de alunos */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                {!selectedEvaluation ? (
                  <EmptyState icon={<ClipboardCheck className="h-8 w-8" />}
                    title="Selecione turma e prova" sub="para ver os alunos e enviar cartões" />
                ) : studentPageLoading ? (
                  Array.from({ length: Math.min(studentLimit, 6) }).map((_, i) => <SkeletonStudentCard key={i} />)
                ) : displayedStudents.length === 0 ? (
                  <EmptyState icon={<Search className="h-8 w-8" />}
                    title="Nenhum aluno encontrado" sub="Tente outra busca" />
                ) : displayedStudents.map((student, i) => {
                  const correction = corrByStudentId.get(student.id)
                  return (
                    <StudentCard
                      key={student.id}
                      student={student}
                      correction={correction}
                      answerCard={answerCardByStudentId.get(student.id)}
                      isProcessing={processingStudentId === student.id}
                      isSelected={correction?.id === selectedCorrection?.id}
                      animDelay={i * 30}
                      onSelect={() => correction && setSelectedCorrectionId(correction.id)}
                      onFileChange={e => handleImageChange(student, e)}
                    />
                  )
                })}
              </div>

              {/* Paginação */}
              {selectedEvaluation && pagination.total > 0 && (
                <div className="border-t border-slate-300 bg-white">
                  <PaginationControls
                    label="Alunos" pagination={pagination} limit={studentLimit}
                    loading={studentPageLoading} source={studentPageSource}
                    onPageChange={setStudentPage}
                    onLimitChange={limit => { setStudentLimit(limit); setStudentPage(1) }}
                  />
                </div>
              )}
            </section>

            {/* ── Coluna direita: Revisão da correção ── */}
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/90 bg-white shadow-lg shadow-slate-200/60 animate-in fade-in slide-in-from-right-4 duration-500 delay-150">

              {/* Cabeçalho fixo do painel de revisão */}
              <div className="flex items-center gap-3 border-b border-slate-300 bg-white px-6 py-4 shrink-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-100 shrink-0">
                  <FileText className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 font-['DM_Sans'] shrink-0">Revisão da correção</p>
                  {selectedCorrection && !reviewLoading && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      <span className="text-xs font-semibold text-violet-600 truncate font-['DM_Sans']">
                        {students.find(s => s.id === selectedCorrection.studentId)?.name}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Conteúdo: vazio / skeleton / revisão */}
              {!selectedCorrection ? (
                <div className="flex flex-1 items-center justify-center p-16 bg-slate-50/40">
                  <div className="text-center space-y-4 max-w-xs">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-dashed border-indigo-300 bg-white shadow-sm">
                      <ScanLine className="h-9 w-9 text-indigo-300" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-600 font-['Lora']">Nenhum cartão selecionado</p>
                      <p className="text-sm text-slate-400 mt-1.5 font-['DM_Sans'] leading-relaxed">
                        Envie um cartão resposta ou clique em um aluno que já possui correção para revisar
                      </p>
                    </div>
                  </div>
                </div>
              ) : reviewLoading ? (
                <SkeletonReviewPanel />
              ) : (
                <ReviewPanel
                  correction={selectedCorrection}
                  students={students}
                  finalScore={finalScore}
                  teacherNotes={teacherNotes}
                  reviewing={reviewing || confirmingAll}
                  questionValues={questionValues}
                  configuredTotal={configuredTotal}
                  hasCardFile={Boolean(onLoadCorrectionCardPreview && (selectedCorrection.hasImage || selectedCorrection.imageUrl))}
                  onFinalScoreChange={setFinalScore}
                  onTeacherNotesChange={setTeacherNotes}
                  onQValChange={(qn, val) => setQuestionValues(prev => ({ ...prev, [qn]: val }))}
                  onPreview={() => void openCorrectionPreview(selectedCorrection)}
                  onSubmit={submitReview}
                />
              )}
            </section>
          </div>
        </div>

        {/* ── Modal: visualizar cartão individual ── */}
        <LightModal
          open={!!previewCorrection}
          onClose={closeCorrectionPreview}
          title="Cartão resposta enviado"
          subtitle={students.find(s => s.id === previewCorrection?.studentId)?.name}
          wide={previewCard?.kind === 'pdf'}
        >
          {previewLoading ? (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-500 gap-2.5 font-['DM_Sans']">
              <Spin dark /> Carregando cartão…
            </div>
          ) : previewCard ? (
            previewCard.kind === 'image' ? (
              <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-2xl border border-slate-300 bg-white p-4 shadow-inner">
                <img
                  src={previewCard.url}
                  alt="Cartão resposta"
                  className="max-h-[66vh] max-w-full rounded-xl object-contain shadow-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : previewCard.kind === 'pdf' ? (
              <PdfPreview url={previewCard.url} title={previewCard.filename} />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm text-slate-400 font-['DM_Sans']">
                Pré-visualização indisponível para este tipo de arquivo.
              </div>
            )
          ) : null}
        </LightModal>

        {/* ── Modal: visualizar arquivos do lote ── */}
        {batchPreviewFile && (
          <LightModal
            open
            onClose={() => setBatchPreviewFile(null)}
            title="Arquivos enviados em lote"
            subtitle={`${batchPreviewFile.name} · ${formatFileSize(batchPreviewFile.size)}`}
            wide
          >
            <div className="flex h-full flex-col gap-3">
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto rounded-2xl border border-slate-300 bg-white p-2.5">
                {batchFilesPreview.map(file => (
                  <button key={file.id} type="button" onClick={() => setBatchPreviewFile(file)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition font-['DM_Sans']
                      ${file.id === batchPreviewFile.id
                        ? 'border-indigo-400 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                    <span className="truncate max-w-[140px]">{file.name}</span>
                    <span className="opacity-50 text-[10px]">{formatFileSize(file.size)}</span>
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 rounded-2xl border border-slate-300 bg-white p-3 shadow-inner">
                {batchPreviewFile.kind === 'image' ? (
                  <div className="flex h-full items-center justify-center">
                    <img
                      src={batchPreviewFile.url}
                      alt={batchPreviewFile.name}
                      className="max-h-full max-w-full rounded-xl object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : batchPreviewFile.kind === 'pdf' ? (
                  <PdfPreview url={batchPreviewFile.url} title={batchPreviewFile.name} className="rounded-xl border-0" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400 font-['DM_Sans']">
                    Pré-visualização indisponível para este tipo de arquivo.
                  </div>
                )}
              </div>
            </div>
          </LightModal>
        )}
      </div>
    </>
  )
}
