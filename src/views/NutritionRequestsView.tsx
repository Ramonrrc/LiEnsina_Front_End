import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardList, Eye, Filter, MessageSquare, X, XCircle } from 'lucide-react'

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
}

type ReviewMode = 'APPROVE' | 'REJECT' | 'REQUEST_ADJUSTMENT'
type ReviewTarget = { request: MealFoodRequest; mode: ReviewMode } | null

const statusLabels: Record<FoodRequestStatus, string> = {
  PENDING_NUTRITIONIST_APPROVAL: 'Aguardando aprovação do nutricionista',
  APPROVED_BY_NUTRITIONIST: 'Aprovado pelo nutricionista',
  REJECTED_BY_NUTRITIONIST: 'Reprovado pelo nutricionista',
  NEEDS_ADJUSTMENT: 'Necessita ajuste',
  PENDING_PURCHASE: 'Aguardando compra',
  PURCHASED: 'Comprado',
  ADDED_TO_STOCK: 'Adicionado ao estoque',
  CANCELLED: 'Cancelado',
}

const urgencyLabels: Record<FoodRequestUrgency, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const unitOptions: Array<CompactSelectOption<MealUnit>> = mealUnitOrder.map((unit) => ({ value: unit, label: mealUnitLabels[unit] }))

const tableHeaders = [
  { label: 'Escola', className: 'px-4 py-3' },
  { label: 'Alimento', className: 'px-4 py-3' },
  { label: 'Quantidade', className: 'px-4 py-3' },
  { label: 'Valor unit.', className: 'px-4 py-3' },
  { label: 'Motivo', className: 'px-4 py-3' },
  { label: 'Urgência', className: 'px-4 py-3' },
  { label: 'Data', className: 'px-4 py-3' },
  { label: 'Status', className: 'px-4 py-3' },
  { label: 'Ações', className: 'px-4 py-3 text-right' },
]

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
  return Number(
    normalized.includes(',')
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized,
  )
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

function statusTone(status: FoodRequestStatus) {
  if (status === 'APPROVED_BY_NUTRITIONIST' || status === 'ADDED_TO_STOCK' || status === 'PURCHASED') return 'border-emerald-400 bg-emerald-50 text-emerald-700'
  if (status === 'REJECTED_BY_NUTRITIONIST' || status === 'CANCELLED') return 'border-red-400 bg-red-50 text-red-700'
  if (status === 'NEEDS_ADJUSTMENT') return 'border-amber-400 bg-amber-50 text-amber-700'
  return 'border-indigo-300 bg-indigo-50 text-indigo-700'
}

function urgencyTone(urgency: FoodRequestUrgency) {
  if (urgency === 'URGENT') return 'border-red-400 bg-red-50 text-red-700'
  if (urgency === 'HIGH') return 'border-orange-400 bg-orange-50 text-orange-700'
  if (urgency === 'MEDIUM') return 'border-amber-400 bg-amber-50 text-amber-700'
  return 'border-slate-300 bg-slate-50 text-slate-600'
}

function StatusBadge({ status }: { status: FoodRequestStatus }) {
  return (
    <span className={`inline-flex max-w-full items-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-black ${statusTone(status)}`}>
      {statusLabels[status]}
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency: FoodRequestUrgency }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-black ${urgencyTone(urgency)}`}>
      {urgencyLabels[urgency]}
    </span>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <article className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      <strong className={`mt-2 block font-['Sora',system-ui,sans-serif] text-3xl font-black ${tone}`}>{value}</strong>
    </article>
  )
}

function RequestActions({ request, onDetail, onReview }: { request: MealFoodRequest; onDetail: (request: MealFoodRequest) => void; onReview: (target: ReviewTarget) => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={() => onDetail(request)} className="grid h-8 w-8 place-items-center rounded-sm border border-slate-300 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600" aria-label="Ver detalhes"><Eye className="h-4 w-4" /></button>
      {request.status === 'PENDING_NUTRITIONIST_APPROVAL' && (
        <>
          <button type="button" onClick={() => onReview({ request, mode: 'APPROVE' })} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-sm border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-black text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Aprovar</button>
          <button type="button" onClick={() => onReview({ request, mode: 'REJECT' })} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-sm border border-red-300 bg-red-50 px-2.5 text-[11px] font-black text-red-700"><XCircle className="h-3.5 w-3.5" />Reprovar</button>
          <button type="button" onClick={() => onReview({ request, mode: 'REQUEST_ADJUSTMENT' })} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-sm border border-amber-300 bg-amber-50 px-2.5 text-[11px] font-black text-amber-700"><MessageSquare className="h-3.5 w-3.5" />Ajuste</button>
        </>
      )}
    </div>
  )
}

function RequestCard({ request, schoolName, onDetail, onReview }: { request: MealFoodRequest; schoolName: string; onDetail: (request: MealFoodRequest) => void; onReview: (target: ReviewTarget) => void }) {
  return (
    <article className="rounded-lg border border-slate-300 bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-indigo-500">{schoolName}</p>
          <h3 className="truncate text-sm font-black text-slate-900">{request.itemName}</h3>
        </div>
        <UrgencyBadge urgency={request.urgencyLevel} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantidade</span>
          <strong className="font-black text-slate-700">{formatQuantity(request.quantity, request.unit)}</strong>
        </div>
        <div className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor unit.</span>
          <strong className="font-black text-slate-700">{formatOptionalCurrency(getRequestUnitPrice(request))}</strong>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{request.reason}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={request.status} />
        <span className="text-xs font-semibold text-slate-400">{formatDate(request.createdAt)}</span>
      </div>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <RequestActions request={request} onDetail={onDetail} onReview={onReview} />
      </div>
    </article>
  )
}

function ReviewModal({ target, schoolName, onClose, onReview }: { target: ReviewTarget; schoolName: string; onClose: () => void; onReview: NutritionRequestsViewProps['onReview'] }) {
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

  const title = target.mode === 'APPROVE' ? 'Aprovar solicitação' : target.mode === 'REJECT' ? 'Reprovar solicitação' : 'Pedir ajuste'
  const actionLabel = target.mode === 'APPROVE' ? 'Aprovar' : target.mode === 'REJECT' ? 'Reprovar' : 'Pedir ajuste'
  const requestUnitPrice = getRequestUnitPrice(target.request)
  const requestTotalPrice = requestUnitPrice ? requestUnitPrice * target.request.quantity : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const currentTarget = target
    if (!currentTarget) return
    setError('')
    if (currentTarget.mode === 'REJECT' && !rejectionReason.trim()) {
      setError('Informe o motivo da reprovação.')
      return
    }
    if (currentTarget.mode === 'REQUEST_ADJUSTMENT' && !observation.trim()) {
      setError('Informe a observação do ajuste solicitado.')
      return
    }
    const parsedSuggestedQuantity = suggestedQuantity ? parseDecimalText(suggestedQuantity) : null
    if (currentTarget.mode === 'REQUEST_ADJUSTMENT' && suggestedQuantity && !isPositiveNumber(parsedSuggestedQuantity)) {
      setError('Quantidade sugerida deve ser maior que zero.')
      return
    }
    const parsedSuggestedUnitPrice = suggestedUnitPrice ? parseDecimalText(suggestedUnitPrice) : null
    if (currentTarget.mode !== 'REJECT' && suggestedUnitPrice && !isPositiveNumber(parsedSuggestedUnitPrice)) {
      setError('Valor unitário deve ser maior que zero.')
      return
    }

    setIsSaving(true)
    try {
      await onReview(currentTarget.request.id, {
        action: currentTarget.mode,
        nutritionistObservation: observation.trim() || null,
        rejectionReason: rejectionReason.trim() || null,
        suggestedQuantity: currentTarget.mode === 'REQUEST_ADJUSTMENT' ? parsedSuggestedQuantity : null,
        suggestedUnit: currentTarget.mode === 'REQUEST_ADJUSTMENT' && parsedSuggestedQuantity ? suggestedUnit : null,
        suggestedUnitPrice: currentTarget.mode === 'REJECT' ? null : parsedSuggestedUnitPrice,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div role="presentation" onMouseDown={onClose} className="fixed inset-0 z-[1000] grid items-start overflow-y-auto bg-slate-950/60 px-4 py-4 backdrop-blur-sm sm:place-items-center sm:py-6">
      <form role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} onSubmit={handleSubmit} className="flex max-h-[calc(100svh-32px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl sm:max-h-[calc(100svh-48px)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-300 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">{schoolName}</p>
            <h2 className="font-['Sora',system-ui,sans-serif] text-lg font-black text-slate-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mv-scroll grid min-h-0 gap-4 overflow-y-auto p-5">
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">{target.request.itemName}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{formatQuantity(target.request.quantity, target.request.unit)} · {formatOptionalCurrency(requestUnitPrice)} por unidade</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{requestTotalPrice ? `${formatCurrency(requestTotalPrice)} estimados · ` : ''}{target.request.reason}</p>
          </div>
          {error && <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</div>}
          {target.mode === 'REJECT' ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-600">Motivo da reprovação</span>
              <textarea className="min-h-24 rounded-lg border border-slate-400 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
            </label>
          ) : (
            <label className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-600">{target.mode === 'REQUEST_ADJUSTMENT' ? 'Observação do ajuste' : 'Observação técnica'}</span>
              <textarea className="min-h-24 rounded-lg border border-slate-400 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={observation} onChange={(event) => setObservation(event.target.value)} />
            </label>
          )}
          {target.mode !== 'REJECT' && (
            <div className="grid gap-3">
              {target.mode === 'REQUEST_ADJUSTMENT' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Quantidade sugerida</span>
                    <input className="min-h-10 rounded-lg border border-slate-400 px-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" type="number" min="0" step="0.01" value={suggestedQuantity} onChange={(event) => setSuggestedQuantity(event.target.value)} />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-bold text-slate-600">Unidade sugerida</span>
                    <CompactSelect<MealUnit>
                      value={suggestedUnit}
                      options={unitOptions}
                      onChange={setSuggestedUnit}
                      className="min-h-10 rounded-lg border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      dropdownWidth="trigger"
                      dropdownMinWidth={180}
                    />
                  </label>
                </div>
              )}
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-600">Valor unitário para compra (R$)</span>
                <input
                  className="min-h-10 rounded-lg border border-slate-400 px-3 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  type="text"
                  inputMode="numeric"
                  value={suggestedUnitPrice}
                  onChange={(event) => setSuggestedUnitPrice(formatCurrencyInput(event.target.value))}
                  placeholder="R$ 0,00"
                />
              </label>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-300 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} className="min-h-10 rounded-sm border border-slate-300 bg-white px-4 text-sm font-bold text-slate-600">Cancelar</button>
          <button type="submit" disabled={isSaving} className="min-h-10 rounded-sm bg-indigo-600 px-4 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">
            {isSaving ? 'Salvando...' : actionLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NutritionRequestsView({ schools, mealManagements, foodRequests, onReview }: NutritionRequestsViewProps) {
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<FoodRequestStatus | 'all'>('PENDING_NUTRITIONIST_APPROVAL')
  const [urgencyFilter, setUrgencyFilter] = useState<FoodRequestUrgency | 'all'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [detailRequest, setDetailRequest] = useState<MealFoodRequest | null>(null)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget>(null)

  const schoolById = useMemo(() => new Map(schools.map((school) => [school.id, school])), [schools])
  const schoolOptions = useMemo<Array<CompactSelectOption<string>>>(() => [
    { value: 'all', label: 'Todas as escolas' },
    ...schools.map((school) => ({ value: school.id, label: school.name })),
  ], [schools])
  const statusOptions = useMemo<Array<CompactSelectOption<FoodRequestStatus | 'all'>>>(() => [
    { value: 'all', label: 'Todos os status' },
    ...(Object.keys(statusLabels) as FoodRequestStatus[]).map((status) => ({ value: status, label: statusLabels[status] })),
  ], [])
  const urgencyOptions = useMemo<Array<CompactSelectOption<FoodRequestUrgency | 'all'>>>(() => [
    { value: 'all', label: 'Todas as urgências' },
    ...(Object.keys(urgencyLabels) as FoodRequestUrgency[]).map((urgency) => ({ value: urgency, label: urgencyLabels[urgency] })),
  ], [])

  const filteredRequests = useMemo(() => foodRequests
    .filter((request) => schoolFilter === 'all' || request.schoolId === schoolFilter)
    .filter((request) => statusFilter === 'all' || request.status === statusFilter)
    .filter((request) => urgencyFilter === 'all' || request.urgencyLevel === urgencyFilter)
    .filter((request) => !dateFilter || request.createdAt.slice(0, 10) === dateFilter)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [dateFilter, foodRequests, schoolFilter, statusFilter, urgencyFilter])

  const summary = useMemo(() => ({
    pending: foodRequests.filter((request) => request.status === 'PENDING_NUTRITIONIST_APPROVAL').length,
    approved: foodRequests.filter((request) => request.status === 'APPROVED_BY_NUTRITIONIST' || request.status === 'ADDED_TO_STOCK' || request.status === 'PURCHASED').length,
    rejected: foodRequests.filter((request) => request.status === 'REJECTED_BY_NUTRITIONIST').length,
    adjustment: foodRequests.filter((request) => request.status === 'NEEDS_ADJUSTMENT').length,
  }), [foodRequests])
  const expiringCount = mealManagements.reduce((total, management) => total + management.estoqueMerenda.filter((stock) => stock.status === 'VENCIDO' || (stock.dataValidade && stock.dataValidade <= new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString().slice(0, 10))).length, 0)

  return (
    <div className="min-h-screen bg-slate-100 px-[clamp(12px,2.5vw,40px)] py-5 pb-12 font-['DM_Sans'] text-slate-900">
      <PageTitleBar
        label="Avaliação nutricional"
        title="Aprovação de Alimentos"
        icon={<ClipboardList />}
        actions={<span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">{expiringCount} alertas de validade</span>}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Pendentes" value={summary.pending} tone="text-indigo-600" />
        <SummaryCard label="Aprovadas" value={summary.approved} tone="text-emerald-600" />
        <SummaryCard label="Reprovadas" value={summary.rejected} tone="text-red-600" />
        <SummaryCard label="Precisam de ajuste" value={summary.adjustment} tone="text-amber-600" />
      </div>

      <section className="mt-4 rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-300 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-700"><Filter className="h-4 w-4" />Filtros</div>
          <CompactSelect value={schoolFilter} options={schoolOptions} onChange={setSchoolFilter} wrapperClassName="min-w-[220px]" />
          <CompactSelect value={statusFilter} options={statusOptions} onChange={setStatusFilter} wrapperClassName="min-w-[240px]" />
          <CompactSelect value={urgencyFilter} options={urgencyOptions} onChange={setUrgencyFilter} wrapperClassName="min-w-[190px]" />
          <DateInput value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="min-h-10 rounded-sm border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700" />
        </div>

        <div className="grid gap-3 p-3 lg:hidden">
          {filteredRequests.length === 0 ? (
            <div className="grid min-h-[150px] place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-400">Nenhuma solicitação encontrada.</p>
            </div>
          ) : filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              schoolName={schoolById.get(request.schoolId)?.name ?? 'Escola'}
              onDetail={setDetailRequest}
              onReview={setReviewTarget}
            />
          ))}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1280px] border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                {tableHeaders.map((header) => (
                  <th key={header.label} className={header.className}>{header.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center text-sm font-semibold text-slate-400">Nenhuma solicitação encontrada.</td></tr>
              ) : filteredRequests.map((request) => (
                <tr key={request.id} className="border-b border-slate-200">
                  <td className="px-4 py-3 align-top text-sm font-bold text-slate-700">{schoolById.get(request.schoolId)?.name ?? 'Escola'}</td>
                  <td className="px-4 py-3 align-top text-sm font-black text-slate-900">{request.itemName}</td>
                  <td className="px-4 py-3 align-top text-sm font-semibold text-slate-600">{formatQuantity(request.quantity, request.unit)}</td>
                  <td className="px-4 py-3 align-top text-sm font-semibold text-slate-600">{formatOptionalCurrency(getRequestUnitPrice(request))}</td>
                  <td className="max-w-xs px-4 py-3 align-top text-xs leading-5 text-slate-500">{request.reason}</td>
                  <td className="px-4 py-3 align-top"><UrgencyBadge urgency={request.urgencyLevel} /></td>
                  <td className="px-4 py-3 align-top text-xs font-semibold text-slate-500">{formatDate(request.createdAt)}</td>
                  <td className="px-4 py-3 align-top"><StatusBadge status={request.status} /></td>
                  <td className="px-4 py-3 align-top">
                    <div className="min-w-[250px]">
                      <RequestActions request={request} onDetail={setDetailRequest} onReview={setReviewTarget} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {detailRequest && (
        <div role="presentation" onMouseDown={() => setDetailRequest(null)} className="fixed inset-0 z-[1000] grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <article onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-300 bg-slate-50 px-5 py-4">
              <div><p className="text-[10px] font-black uppercase tracking-wider text-indigo-500">{schoolById.get(detailRequest.schoolId)?.name ?? 'Escola'}</p><h2 className="font-['Sora'] text-lg font-black text-slate-900">{detailRequest.itemName}</h2></div>
              <button type="button" onClick={() => setDetailRequest(null)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 p-5 text-sm text-slate-600">
              <p><strong className="text-slate-900">Quantidade:</strong> {formatQuantity(detailRequest.quantity, detailRequest.unit)}</p>
              {detailRequest.suggestedQuantity && <p><strong className="text-slate-900">Quantidade sugerida:</strong> {formatQuantity(detailRequest.suggestedQuantity, detailRequest.suggestedUnit ?? detailRequest.unit)}</p>}
              <p><strong className="text-slate-900">Valor unitário:</strong> {formatOptionalCurrency(getRequestUnitPrice(detailRequest))}</p>
              {getRequestUnitPrice(detailRequest) && <p><strong className="text-slate-900">Total estimado:</strong> {formatCurrency((getRequestUnitPrice(detailRequest) ?? 0) * (detailRequest.suggestedQuantity ?? detailRequest.quantity))}</p>}
              <p><strong className="text-slate-900">Motivo:</strong> {detailRequest.reason}</p>
              {detailRequest.observation && <p><strong className="text-slate-900">Observação:</strong> {detailRequest.observation}</p>}
              {detailRequest.nutritionistObservation && <p><strong className="text-slate-900">Obs. técnica:</strong> {detailRequest.nutritionistObservation}</p>}
              {detailRequest.rejectionReason && <p><strong className="text-slate-900">Reprovação:</strong> {detailRequest.rejectionReason}</p>}
            </div>
          </article>
        </div>
      )}

      <ReviewModal target={reviewTarget} schoolName={reviewTarget ? schoolById.get(reviewTarget.request.schoolId)?.name ?? 'Escola' : ''} onClose={() => setReviewTarget(null)} onReview={onReview} />
    </div>
  )
}
