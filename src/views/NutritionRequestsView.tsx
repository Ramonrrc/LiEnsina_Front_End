import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  Filter,
  MessageSquare,
  X,
  XCircle,
  Clock,
  AlertCircle,
  Package,
  TrendingUp,
  ShieldCheck,
  ShieldX,
  Wrench,
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import DateInput from '../components/ui/date-input'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { formatCurrencyInput, formatCurrencyInputValue } from '../lib/currency'
import { formatMealUnit, mealUnitLabels, mealUnitOrder } from '../lib/meal-formatters'
import type {
  FoodRequestStatus,
  FoodRequestUrgency,
  MealFoodRequest,
  MealManagement,
  MealUnit,
  ReviewMealFoodRequestPayload,
  School,
} from '../types'

interface NutritionRequestsViewProps {
  schools: School[]
  mealManagements: MealManagement[]
  foodRequests: MealFoodRequest[]
  onReview: (id: string, draft: ReviewMealFoodRequestPayload) => Promise<void>
  isLoading?: boolean
}

type ReviewMode = 'APPROVE' | 'REJECT' | 'REQUEST_ADJUSTMENT'
type ReviewTarget = { request: MealFoodRequest; mode: ReviewMode } | null

const statusLabels: Record<FoodRequestStatus, string> = {
  PENDING_NUTRITIONIST_APPROVAL: 'Aguardando aprovação',
  APPROVED_BY_NUTRITIONIST: 'Aprovado',
  REJECTED_BY_NUTRITIONIST: 'Reprovado',
  NEEDS_ADJUSTMENT: 'Precisa de ajuste',
  PENDING_PURCHASE: 'Aguardando compra',
  PURCHASED: 'Comprado',
  ADDED_TO_STOCK: 'Em estoque',
  CANCELLED: 'Cancelado',
}

const urgencyLabels: Record<FoodRequestUrgency, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const unitOptions: Array<CompactSelectOption<MealUnit>> = mealUnitOrder.map((unit) => ({
  value: unit,
  label: mealUnitLabels[unit],
}))

const tableHeaders = [
  'Escola',
  'Alimento',
  'Quantidade',
  'Valor unit.',
  'Motivo',
  'Urgência',
  'Data',
  'Status',
  'Ações',
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function formatQuantity(value: number, unit?: MealUnit | null) {
  return `${formatNumber(value)} ${formatMealUnit(unit)}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function parseDecimalText(value: string) {
  const normalized = value.trim().replace(/[^\d,.-]/g, '')
  return Number(normalized.includes(',') ? normalized.replace(/\./g, '').replace(',', '.') : normalized)
}

function getRequestUnitPrice(request: MealFoodRequest) {
  return request.suggestedUnitPrice ?? request.unitPrice ?? null
}

function formatOptionalCurrency(value: number | null | undefined) {
  return value && value > 0 ? formatCurrency(value) : '—'
}

function isPositiveNumber(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function statusStyle(status: FoodRequestStatus) {
  switch (status) {
    case 'APPROVED_BY_NUTRITIONIST':
    case 'ADDED_TO_STOCK':
    case 'PURCHASED':
      return { pill: 'border-emerald-400 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' }
    case 'REJECTED_BY_NUTRITIONIST':
    case 'CANCELLED':
      return { pill: 'border-red-400 bg-red-50 text-red-700', dot: 'bg-red-500' }
    case 'NEEDS_ADJUSTMENT':
      return { pill: 'border-amber-400 bg-amber-50 text-amber-700', dot: 'bg-amber-500' }
    case 'PENDING_PURCHASE':
      return { pill: 'border-violet-400 bg-violet-50 text-violet-700', dot: 'bg-violet-500' }
    default:
      return { pill: 'border-blue-400 bg-blue-50 text-blue-700', dot: 'bg-blue-500 animate-pulse' }
  }
}

function urgencyStyle(urgency: FoodRequestUrgency) {
  switch (urgency) {
    case 'URGENT': return { pill: 'border-red-400 bg-red-50 text-red-700', bar: 'bg-red-500' }
    case 'HIGH':   return { pill: 'border-orange-400 bg-orange-50 text-orange-700', bar: 'bg-orange-500' }
    case 'MEDIUM': return { pill: 'border-amber-400 bg-amber-50 text-amber-700', bar: 'bg-amber-400' }
    default:       return { pill: 'border-slate-400 bg-slate-50 text-slate-600', bar: 'bg-slate-400' }
  }
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FoodRequestStatus }) {
  const s = statusStyle(status)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10px] font-black tracking-wide whitespace-nowrap ${s.pill}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
      {statusLabels[status]}
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency: FoodRequestUrgency }) {
  const s = urgencyStyle(urgency)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[10px] font-black tracking-wide whitespace-nowrap ${s.pill}`}>
      <span className={`h-1.5 w-2.5 shrink-0 rounded-full ${s.bar}`} />
      {urgencyLabels[urgency]}
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />
}

function SummaryRowSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3.5">
      <div className="flex items-center gap-3">
        <Sk className="h-8 w-8 rounded-lg" />
        <Sk className="h-3.5 w-28" />
      </div>
      <Sk className="h-7 w-12 rounded-lg" />
    </div>
  )
}

function TableRowSkeleton() {
  const widths = ['w-28', 'w-32', 'w-20', 'w-16', 'w-40', 'w-16', 'w-20', 'w-24', 'w-28']
  return (
    <tr className="border-b border-slate-100">
      {widths.map((w, i) => (
        <td key={i} className="px-5 py-3.5">
          <Sk className={`h-4 ${w}`} />
        </td>
      ))}
    </tr>
  )
}

function MobileCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex justify-between">
        <div className="space-y-1.5"><Sk className="h-2.5 w-20" /><Sk className="h-4 w-36" /></div>
        <Sk className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2"><Sk className="h-14 rounded-xl" /><Sk className="h-14 rounded-xl" /></div>
      <Sk className="h-8 w-full rounded-xl" />
    </div>
  )
}

// ─── Summary strip ────────────────────────────────────────────────────────────

const summaryDefs = [
  { key: 'pending' as const,    label: 'Pendentes',         Icon: Clock,       iconCls: 'bg-blue-100 text-blue-600',    valueCls: 'text-blue-700',    border: 'border-l-blue-500' },
  { key: 'approved' as const,   label: 'Aprovadas',         Icon: ShieldCheck, iconCls: 'bg-emerald-100 text-emerald-600', valueCls: 'text-emerald-700', border: 'border-l-emerald-500' },
  { key: 'rejected' as const,   label: 'Reprovadas',        Icon: ShieldX,     iconCls: 'bg-red-100 text-red-600',      valueCls: 'text-red-700',     border: 'border-l-red-500' },
  { key: 'adjustment' as const, label: 'Precisam ajuste',   Icon: Wrench,      iconCls: 'bg-amber-100 text-amber-600',  valueCls: 'text-amber-700',   border: 'border-l-amber-500' },
]

function SummaryStrip({ summary, isLoading }: { summary: Record<string, number>; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[0,1,2,3].map(i => <SummaryRowSkeleton key={i} />)}
      </div>
    )
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {summaryDefs.map(({ key, label, Icon, iconCls, valueCls, border }, i) => (
        <div
          key={key}
          className={`flex items-center justify-between rounded-xl border border-slate-200 border-l-[3px] ${border} bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md`}
          style={{ animation: `nrv-rise 0.35s ease ${i * 60}ms both` }}
        >
          <div className="flex items-center gap-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${iconCls}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-slate-600">{label}</span>
          </div>
          <span className={`text-2xl font-black tabular-nums ${valueCls}`}>{summary[key]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function RequestActions({
  request,
  onDetail,
  onReview,
}: {
  request: MealFoodRequest
  onDetail: (r: MealFoodRequest) => void
  onReview: (t: ReviewTarget) => void
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <button
        type="button"
        onClick={() => onDetail(request)}
        aria-label="Ver detalhes"
        title="Ver detalhes"
        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 bg-white text-slate-500 shadow-sm transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      {request.status === 'PENDING_NUTRITIONIST_APPROVAL' && (
        <>
          <button
            type="button"
            onClick={() => onReview({ request, mode: 'APPROVE' })}
            className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-emerald-400 bg-white px-3 text-[11px] font-bold text-emerald-700 shadow-sm transition-all hover:bg-emerald-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
          </button>
          <button
            type="button"
            onClick={() => onReview({ request, mode: 'REJECT' })}
            className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-400 bg-white px-3 text-[11px] font-bold text-red-700 shadow-sm transition-all hover:bg-red-50"
          >
            <XCircle className="h-3.5 w-3.5" /> Reprovar
          </button>
          <button
            type="button"
            onClick={() => onReview({ request, mode: 'REQUEST_ADJUSTMENT' })}
            className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-400 bg-white px-3 text-[11px] font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-50"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Ajuste
          </button>
        </>
      )}
    </div>
  )
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function RequestCard({
  request,
  schoolName,
  onDetail,
  onReview,
  index,
}: {
  request: MealFoodRequest
  schoolName: string
  onDetail: (r: MealFoodRequest) => void
  onReview: (t: ReviewTarget) => void
  index: number
}) {
  return (
    <article
      className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300"
      style={{ animation: `nrv-rise 0.35s ease ${index * 55}ms both` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-widest text-blue-500">{schoolName}</p>
            <h3 className="truncate text-sm font-black text-slate-900 mt-0.5">{request.itemName}</h3>
          </div>
          <UrgencyBadge urgency={request.urgencyLevel} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Qtd.</p>
            <p className="mt-0.5 text-xs font-black text-slate-800">{formatQuantity(request.quantity, request.unit)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor unit.</p>
            <p className="mt-0.5 text-xs font-black text-slate-800">{formatOptionalCurrency(getRequestUnitPrice(request))}</p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{request.reason}</p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <StatusBadge status={request.status} />
          <span className="text-[11px] font-semibold text-slate-400">{formatDate(request.createdAt)}</span>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-3">
        <RequestActions request={request} onDetail={onDetail} onReview={onReview} />
      </div>
    </article>
  )
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

const modeConfig = {
  APPROVE: {
    title: 'Aprovar solicitação',
    actionLabel: 'Confirmar aprovação',
    Icon: CheckCircle2,
    accent: { header: 'border-emerald-300 bg-emerald-50', iconRing: 'border-emerald-300 bg-emerald-100 text-emerald-700', title: 'text-emerald-900', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  },
  REJECT: {
    title: 'Reprovar solicitação',
    actionLabel: 'Confirmar reprovação',
    Icon: XCircle,
    accent: { header: 'border-red-300 bg-red-50', iconRing: 'border-red-300 bg-red-100 text-red-700', title: 'text-red-900', btn: 'bg-red-600 hover:bg-red-700 text-white' },
  },
  REQUEST_ADJUSTMENT: {
    title: 'Solicitar ajuste',
    actionLabel: 'Enviar solicitação',
    Icon: MessageSquare,
    accent: { header: 'border-amber-300 bg-amber-50', iconRing: 'border-amber-300 bg-amber-100 text-amber-700', title: 'text-amber-900', btn: 'bg-amber-600 hover:bg-amber-700 text-white' },
  },
}

function ReviewModal({
  target,
  schoolName,
  onClose,
  onReview,
}: {
  target: ReviewTarget
  schoolName: string
  onClose: () => void
  onReview: NutritionRequestsViewProps['onReview']
}) {
  const [observation, setObservation] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [suggestedQuantity, setSuggestedQuantity] = useState('')
  const [suggestedUnit, setSuggestedUnit] = useState<MealUnit>('KG')
  const [suggestedUnitPrice, setSuggestedUnitPrice] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!target) return
    const unitPrice = getRequestUnitPrice(target.request)
    setObservation(target.request.nutritionistObservation ?? '')
    setRejectionReason(target.request.rejectionReason ?? '')
    setSuggestedQuantity(target.request.suggestedQuantity ? String(target.request.suggestedQuantity) : '')
    setSuggestedUnit(target.request.suggestedUnit ?? target.request.unit)
    setSuggestedUnitPrice(formatCurrencyInputValue(unitPrice))
    setError('')
  }, [target?.mode, target?.request.id])

  if (!target) return null

  const cfg = modeConfig[target.mode]
  const { Icon, accent } = cfg
  const requestUnitPrice = getRequestUnitPrice(target.request)
  const requestTotalPrice = requestUnitPrice ? requestUnitPrice * target.request.quantity : null

  const inputCls = 'w-full min-h-10 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-100'
  const labelCls = 'grid gap-1.5'
  const labelTextCls = 'text-xs font-bold text-slate-700'

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const ct = target
    if (!ct) return
    setError('')
    if (ct.mode === 'REJECT' && !rejectionReason.trim()) { setError('Informe o motivo da reprovação.'); return }
    if (ct.mode === 'REQUEST_ADJUSTMENT' && !observation.trim()) { setError('Informe a observação do ajuste.'); return }
    const parsedQty = suggestedQuantity ? parseDecimalText(suggestedQuantity) : null
    if (ct.mode === 'REQUEST_ADJUSTMENT' && suggestedQuantity && !isPositiveNumber(parsedQty)) { setError('Quantidade deve ser maior que zero.'); return }
    const parsedPrice = suggestedUnitPrice ? parseDecimalText(suggestedUnitPrice) : null
    if (ct.mode !== 'REJECT' && suggestedUnitPrice && !isPositiveNumber(parsedPrice)) { setError('Valor unitário deve ser maior que zero.'); return }
    setIsSaving(true)
    try {
      await onReview(ct.request.id, {
        action: ct.mode,
        nutritionistObservation: observation.trim() || null,
        rejectionReason: rejectionReason.trim() || null,
        suggestedQuantity: ct.mode === 'REQUEST_ADJUSTMENT' ? parsedQty : null,
        suggestedUnit: ct.mode === 'REQUEST_ADJUSTMENT' && parsedQty ? suggestedUnit : null,
        suggestedUnitPrice: ct.mode === 'REJECT' ? null : parsedPrice,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-[1000] grid items-start overflow-y-auto bg-slate-900/40 px-4 py-6 backdrop-blur-sm sm:place-items-center sm:py-10"
      style={{ animation: 'nrv-fade 0.18s ease both' }}
    >
      <form
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100svh-48px)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        style={{ animation: 'nrv-slide 0.22s ease both' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between gap-4 border-b px-6 py-5 ${accent.header}`}>
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${accent.iconRing}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{schoolName}</p>
              <h2 className={`font-['Sora',system-ui,sans-serif] text-base font-black leading-tight ${accent.title}`}>
                {cfg.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white text-slate-400 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 overflow-y-auto">
          <div className="grid gap-4 p-6">
            {/* Item card */}
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white shadow-sm">
                <Package className="h-4 w-4 text-slate-500" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">{target.request.itemName}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatQuantity(target.request.quantity, target.request.unit)}
                  {requestUnitPrice ? ` · ${formatOptionalCurrency(requestUnitPrice)}/un` : ''}
                </p>
                {requestTotalPrice && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    Total estimado: <strong className="text-slate-600">{formatCurrency(requestTotalPrice)}</strong>
                  </p>
                )}
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{target.request.reason}</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-400 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            {/* Fields */}
            {target.mode === 'REJECT' ? (
              <label className={labelCls}>
                <span className={labelTextCls}>Motivo da reprovação <span className="text-red-500">*</span></span>
                <textarea className={`${inputCls} min-h-28 resize-none`} placeholder="Descreva o motivo…" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
              </label>
            ) : (
              <label className={labelCls}>
                <span className={labelTextCls}>
                  {target.mode === 'REQUEST_ADJUSTMENT' ? <>Observação do ajuste <span className="text-red-500">*</span></> : 'Observação técnica'}
                </span>
                <textarea className={`${inputCls} min-h-28 resize-none`} placeholder={target.mode === 'REQUEST_ADJUSTMENT' ? 'Descreva o ajuste necessário…' : 'Observação opcional…'} value={observation} onChange={(e) => setObservation(e.target.value)} />
              </label>
            )}

            {target.mode !== 'REJECT' && (
              <div className="grid gap-3">
                {target.mode === 'REQUEST_ADJUSTMENT' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelCls}>
                      <span className={labelTextCls}>Quantidade sugerida</span>
                      <input className={inputCls} type="number" min="0" step="0.01" placeholder="0,00" value={suggestedQuantity} onChange={(e) => setSuggestedQuantity(e.target.value)} />
                    </label>
                    <label className={labelCls}>
                      <span className={labelTextCls}>Unidade</span>
                      <CompactSelect<MealUnit> value={suggestedUnit} options={unitOptions} onChange={setSuggestedUnit} className={inputCls} dropdownWidth="trigger" dropdownMinWidth={180} />
                    </label>
                  </div>
                )}
                <label className={labelCls}>
                  <span className={labelTextCls}>Valor unitário (R$)</span>
                  <input className={inputCls} type="text" inputMode="numeric" placeholder="R$ 0,00" value={suggestedUnitPrice} onChange={(e) => setSuggestedUnitPrice(formatCurrencyInput(e.target.value))} />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-100">
            Cancelar
          </button>
          <button type="submit" disabled={isSaving} className={`min-h-10 rounded-xl px-5 text-sm font-black shadow-sm transition-all disabled:opacity-60 ${accent.btn}`}>
            {isSaving ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Salvando…
              </span>
            ) : cfg.actionLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ request, schoolName, onClose }: { request: MealFoodRequest; schoolName: string; onClose: () => void }) {
  const unitPrice = getRequestUnitPrice(request)
  const total = unitPrice ? unitPrice * (request.suggestedQuantity ?? request.quantity) : null

  const row = (label: string, value: React.ReactNode, accent?: string) => (
    <div className={`rounded-xl border px-4 py-3 ${accent ?? 'border-slate-200 bg-slate-50'}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
    </div>
  )

  return (
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-[1000] grid place-items-center bg-slate-900/40 px-4 py-8 backdrop-blur-sm"
      style={{ animation: 'nrv-fade 0.18s ease both' }}
    >
      <article
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        style={{ animation: 'nrv-slide 0.22s ease both' }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-slate-300 bg-white shadow-sm">
              <Package className="h-4 w-4 text-slate-500" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{schoolName}</p>
              <h2 className="font-['Sora',system-ui,sans-serif] text-base font-black text-slate-900 leading-tight">{request.itemName}</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl border border-slate-300 bg-white text-slate-400 shadow-sm hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-2.5 p-6">
          <div className="grid grid-cols-2 gap-2.5">
            {row('Quantidade', formatQuantity(request.quantity, request.unit))}
            {row('Valor unitário', formatOptionalCurrency(unitPrice))}
          </div>
          {request.suggestedQuantity && row('Quantidade sugerida', formatQuantity(request.suggestedQuantity, request.suggestedUnit ?? request.unit), 'border-amber-300 bg-amber-50')}
          {total && row('Total estimado', <span className="text-emerald-700 font-black">{formatCurrency(total)}</span>, 'border-emerald-300 bg-emerald-50')}
          {row('Motivo', request.reason)}
          {request.observation && row('Observação', request.observation)}
          {request.nutritionistObservation && row('Obs. técnica', request.nutritionistObservation, 'border-blue-300 bg-blue-50')}
          {request.rejectionReason && row('Motivo da reprovação', request.rejectionReason, 'border-red-300 bg-red-50')}
          <div className="flex items-center justify-between pt-1">
            <StatusBadge status={request.status} />
            <UrgencyBadge urgency={request.urgencyLevel} />
          </div>
        </div>
      </article>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NutritionRequestsView({
  schools,
  mealManagements,
  foodRequests,
  onReview,
  isLoading = false,
}: NutritionRequestsViewProps) {
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<FoodRequestStatus | 'all'>('PENDING_NUTRITIONIST_APPROVAL')
  const [urgencyFilter, setUrgencyFilter] = useState<FoodRequestUrgency | 'all'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [detailRequest, setDetailRequest] = useState<MealFoodRequest | null>(null)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget>(null)

  const schoolById = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools])

  const schoolOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: 'all', label: 'Todas as escolas' }, ...schools.map((s) => ({ value: s.id, label: s.name }))],
    [schools],
  )
  const statusOptions = useMemo<Array<CompactSelectOption<FoodRequestStatus | 'all'>>>(
    () => [{ value: 'all', label: 'Todos os status' }, ...(Object.keys(statusLabels) as FoodRequestStatus[]).map((s) => ({ value: s, label: statusLabels[s] }))],
    [],
  )
  const urgencyOptions = useMemo<Array<CompactSelectOption<FoodRequestUrgency | 'all'>>>(
    () => [{ value: 'all', label: 'Todas as urgências' }, ...(Object.keys(urgencyLabels) as FoodRequestUrgency[]).map((u) => ({ value: u, label: urgencyLabels[u] }))],
    [],
  )

  const filteredRequests = useMemo(
    () =>
      foodRequests
        .filter((r) => schoolFilter === 'all' || r.schoolId === schoolFilter)
        .filter((r) => statusFilter === 'all' || r.status === statusFilter)
        .filter((r) => urgencyFilter === 'all' || r.urgencyLevel === urgencyFilter)
        .filter((r) => !dateFilter || r.createdAt.slice(0, 10) === dateFilter)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [dateFilter, foodRequests, schoolFilter, statusFilter, urgencyFilter],
  )

  const summary = useMemo(() => ({
    pending:    foodRequests.filter((r) => r.status === 'PENDING_NUTRITIONIST_APPROVAL').length,
    approved:   foodRequests.filter((r) => ['APPROVED_BY_NUTRITIONIST', 'ADDED_TO_STOCK', 'PURCHASED'].includes(r.status)).length,
    rejected:   foodRequests.filter((r) => r.status === 'REJECTED_BY_NUTRITIONIST').length,
    adjustment: foodRequests.filter((r) => r.status === 'NEEDS_ADJUSTMENT').length,
  }), [foodRequests])

  const expiringCount = mealManagements.reduce(
    (total, m) => total + m.estoqueMerenda.filter(
      (s) => s.status === 'VENCIDO' || (s.dataValidade && s.dataValidade <= new Date(Date.now() + 864e6 * 15).toISOString().slice(0, 10)),
    ).length,
    0,
  )

  const emptyState = (
    <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
      <div>
        <ClipboardList className="mx-auto h-10 w-10 text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-400">Nenhuma solicitação encontrada.</p>
        <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros.</p>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes nrv-rise  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes nrv-fade  { from { opacity:0 }                             to { opacity:1 } }
        @keyframes nrv-slide { from { opacity:0; transform:translateY(20px) scale(.98) } to { opacity:1; transform:none } }
      `}</style>

      <div className="min-h-screen bg-slate-100 px-[clamp(12px,2.5vw,40px)] py-5 pb-16 font-['DM_Sans',system-ui,sans-serif] text-slate-900">

        <PageTitleBar
          label="Avaliação nutricional"
          title="Aprovação de Alimentos"
          icon={<ClipboardList />}
          actions={
            expiringCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {expiringCount} {expiringCount === 1 ? 'alerta' : 'alertas'} de validade
              </span>
            ) : null
          }
        />

        {/* Summary */}
        <SummaryStrip summary={summary} isLoading={isLoading} />

        {/* Table panel */}
        <section
          className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          style={{ animation: 'nrv-rise 0.4s ease 0.15s both' }}
        >
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
            <span className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5" /> Filtros
            </span>
            <CompactSelect value={schoolFilter}  options={schoolOptions}  onChange={setSchoolFilter}  wrapperClassName="min-w-[200px]" />
            <CompactSelect value={statusFilter}  options={statusOptions}  onChange={setStatusFilter}  wrapperClassName="min-w-[220px]" />
            <CompactSelect value={urgencyFilter} options={urgencyOptions} onChange={setUrgencyFilter} wrapperClassName="min-w-[180px]" />
            <DateInput
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Mobile */}
          <div className="grid gap-3 p-4 lg:hidden">
            {isLoading
              ? [0,1,2].map(i => <MobileCardSkeleton key={i} />)
              : filteredRequests.length === 0
                ? emptyState
                : filteredRequests.map((r, i) => (
                    <RequestCard
                      key={r.id}
                      request={r}
                      schoolName={schoolById.get(r.schoolId)?.name ?? 'Escola'}
                      onDetail={setDetailRequest}
                      onReview={setReviewTarget}
                      index={i}
                    />
                  ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1280px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  {tableHeaders.map((h, i) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 ${i === tableHeaders.length - 1 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [0,1,2,3,4].map(i => <TableRowSkeleton key={i} />)
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <ClipboardList className="h-10 w-10 text-slate-300" />
                        <p className="text-sm font-bold text-slate-400">Nenhuma solicitação encontrada.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r, i) => (
                    <tr
                      key={r.id}
                      className="group border-b border-slate-100 transition-colors hover:bg-slate-50"
                      style={{ animation: `nrv-rise 0.3s ease ${i * 35}ms both` }}
                    >
                      <td className="px-5 py-3.5 align-middle">
                        <span className="text-xs font-black text-blue-600 whitespace-nowrap">{schoolById.get(r.schoolId)?.name ?? 'Escola'}</span>
                      </td>
                      <td className="px-5 py-3.5 align-middle text-sm font-black text-slate-900 whitespace-nowrap">{r.itemName}</td>
                      <td className="px-5 py-3.5 align-middle text-sm font-semibold text-slate-600 whitespace-nowrap">{formatQuantity(r.quantity, r.unit)}</td>
                      <td className="px-5 py-3.5 align-middle text-sm font-semibold text-slate-600 whitespace-nowrap">{formatOptionalCurrency(getRequestUnitPrice(r))}</td>
                      <td className="max-w-[240px] px-5 py-3.5 align-middle">
                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{r.reason}</p>
                      </td>
                      <td className="px-5 py-3.5 align-middle"><UrgencyBadge urgency={r.urgencyLevel} /></td>
                      <td className="px-5 py-3.5 align-middle text-xs font-semibold text-slate-500 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-5 py-3.5 align-middle"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex justify-end">
                          <RequestActions request={r} onDetail={setDetailRequest} onReview={setReviewTarget} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {detailRequest && (
        <DetailModal
          request={detailRequest}
          schoolName={schoolById.get(detailRequest.schoolId)?.name ?? 'Escola'}
          onClose={() => setDetailRequest(null)}
        />
      )}

      <ReviewModal
        target={reviewTarget}
        schoolName={reviewTarget ? schoolById.get(reviewTarget.request.schoolId)?.name ?? 'Escola' : ''}
        onClose={() => setReviewTarget(null)}
        onReview={onReview}
      />
    </>
  )
}