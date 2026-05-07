import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  Apple,
  ArrowLeft,
  Banana,
  Bean,
  Beef,
  Building2,
  CalendarDays,
  Carrot,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Drumstick,
  Egg,
  Fish,
  History,
  Info,
  Lock,
  Milk,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Soup,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Utensils,
  Wallet,
  Wheat,
  X,
  type LucideIcon,
} from 'lucide-react'

import DateInput from '../components/ui/date-input'
import type {
  CreateMealItemPayload,
  MealBudgetStatus,
  MealFood,
  MealManagement,
  MealManagementsPagePayload,
  MealMenu,
  MealStockItem,
  MealStockStatus,
  Role,
  School,
  UpdateMealBudgetPayload,
} from '../types'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface MealsViewProps {
  currentRole: Role | null
  schools: School[]
  mealManagements: MealManagement[]
  onLoadSchoolPage: (page: number, limit: number) => Promise<MealManagementsPagePayload>
  onSearchFoods: (query: string, limit?: number) => Promise<MealFood[]>
  onCreateItem: (managementId: string, draft: CreateMealItemPayload) => Promise<void>
  onUpdateBudget: (managementId: string, draft: UpdateMealBudgetPayload) => Promise<void>
}

type MealFormState = {
  alimentoId: number
  quantidade: string
  valorUnitario: string
  fornecedorNome: string
  dataValidade: string
  lote: string
  quantidadeMinima: string
  possuiValidade: boolean
}

type MovementsModalState = {
  management: MealManagement
  schoolName: string
}

type MenuCalendarModalState = {
  management: MealManagement
  schoolName: string
}

type StockOverviewModalState = {
  management: MealManagement
  schoolName: string
}

type MenuCalendarCell = {
  key: string
  day: number | null
  weekday: number | null
  menus: MealMenu[]
}

type DailyMenuResource = {
  stock: MealStockItem
  food?: MealFood
  supplierName?: string
  dailyQuantity: number
}

type StockDetailState = {
  stock: MealStockItem
  food?: MealFood
  supplierName?: string
}

type StockOverviewRow = {
  key: string
  food?: MealFood
  name: string
  unit: MealStockItem['unidadeMedida']
  totalQuantity: number
  minimumQuantity: number
  suppliers: string[]
  expiryDates: string[]
  status: MealStockStatus
  lotCount: number
}

type WizardStep = 1 | 2 | 3

/* ─────────────────────────────────────────────
   Constants & Maps
───────────────────────────────────────────── */
const foodIcons: Record<string, LucideIcon> = {
  apple: Apple,
  banana: Banana,
  bean: Bean,
  beef: Beef,
  carrot: Carrot,
  drumstick: Drumstick,
  egg: Egg,
  fish: Fish,
  milk: Milk,
  soup: Soup,
  utensils: Utensils,
  wheat: Wheat,
}

const foodImageAliases: Record<string, string> = {
  'arroz branco': 'Arroz.png',
  'banana prata': 'Banana.png',
  'feijao carioca': 'Feijao.png',
  'feijão carioca': 'Feijao.png',
  'leite integral': 'Leite.png',
  'maca nacional': 'Maca.png',
  'frango desfiado': 'Frango Desfiado.png',
  'hamburguer artesanal': 'Hamburguer Artesanal.png',
  iogurte: 'Iorgute.png',
  'maçã nacional': 'Maca.png',
}

const mealTypeLabels: Record<MealMenu['tipoRefeicao'], string> = {
  CAFE_DA_MANHA: 'Café da Manhã',
  LANCHE: 'Lanche',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
}

const shiftLabels: Record<MealMenu['turno'], string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  NOITE: 'Noite',
  INTEGRAL: 'Integral',
}

const mealTypeColors: Record<MealMenu['tipoRefeicao'], string> = {
  CAFE_DA_MANHA: 'border-amber-400 bg-amber-50 text-amber-700',
  LANCHE: 'border-sky-400 bg-sky-50 text-sky-700',
  ALMOCO: 'border-indigo-400 bg-indigo-50 text-indigo-700',
  JANTAR: 'border-violet-400 bg-violet-50 text-violet-700',
}

const mealTypeDotColors: Record<MealMenu['tipoRefeicao'], string> = {
  CAFE_DA_MANHA: 'bg-amber-400',
  LANCHE: 'bg-sky-400',
  ALMOCO: 'bg-indigo-500',
  JANTAR: 'bg-violet-500',
}

const shiftColors: Record<MealMenu['turno'], string> = {
  MANHA: 'border-amber-400 bg-amber-50 text-amber-700',
  TARDE: 'border-sky-400 bg-sky-50 text-sky-700',
  NOITE: 'border-indigo-400 bg-indigo-50 text-indigo-700',
  INTEGRAL: 'border-violet-400 bg-violet-50 text-violet-700',
}

const weekDayShortLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const weekDayFullLabels = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const mealTypeOrder: Record<MealMenu['tipoRefeicao'], number> = {
  CAFE_DA_MANHA: 1,
  LANCHE: 2,
  ALMOCO: 3,
  JANTAR: 4,
}

const defaultSupplier = 'Distribuidora Alimentos Brasil'
const schoolSelectorPageSize = 5
const foodSuggestionLimit = 4

function formatMonthReference(monthReference: string) {
  const [year, month] = monthReference.split('-').map(Number)
  if (!year || !month) return monthReference
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1, 12),
  )
}

function getWeekdayIndex(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()

  if (normalized.includes('domingo')) return 0
  if (normalized.includes('segunda')) return 1
  if (normalized.includes('terca')) return 2
  if (normalized.includes('quarta')) return 3
  if (normalized.includes('quinta')) return 4
  if (normalized.includes('sexta')) return 5
  if (normalized.includes('sabado')) return 6
  return -1
}

function buildMenuMonthCells(monthReference: string, menus: MealMenu[]): MenuCalendarCell[] {
  const [year, month] = monthReference.split('-').map(Number)
  if (!year || !month) return []

  const byWeekday = new Map<number, MealMenu[]>()
  for (const menu of menus) {
    const weekday = getWeekdayIndex(menu.diaSemana)
    if (weekday < 0) continue
    const current = byWeekday.get(weekday) ?? []
    current.push(menu)
    byWeekday.set(
      weekday,
      current.sort((a, b) => mealTypeOrder[a.tipoRefeicao] - mealTypeOrder[b.tipoRefeicao]),
    )
  }

  const firstDate = new Date(year, month - 1, 1, 12)
  const daysInMonth = new Date(year, month, 0, 12).getDate()
  const cells: MenuCalendarCell[] = []

  for (let i = 0; i < firstDate.getDay(); i += 1) {
    cells.push({ key: `empty-start-${i}`, day: null, weekday: null, menus: [] })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day, 12)
    const weekday = date.getDay()
    cells.push({
      key: `${monthReference}-${day}`,
      day,
      weekday,
      menus: byWeekday.get(weekday) ?? [],
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, day: null, weekday: null, menus: [] })
  }

  return cells
}

function countWorkingDaysInMonth(monthReference: string) {
  const [year, month] = monthReference.split('-').map(Number)
  if (!year || !month) return 1

  const daysInMonth = new Date(year, month, 0, 12).getDate()
  let count = 0
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(year, month - 1, day, 12).getDay()
    if (weekday >= 1 && weekday <= 5) count += 1
  }
  return Math.max(1, count)
}

function buildDailyMenuResources(management: MealManagement) {
  const workingDays = countWorkingDaysInMonth(management.mesReferencia)
  const resources: DailyMenuResource[] = management.estoqueMerenda
    .filter((stock) => stock.quantidadeAtual > 0 && stock.status !== 'VENCIDO' && stock.status !== 'DESCARTADO')
    .map((stock) => {
      const food = management.alimentosCadastrados.find((item) => item.id === stock.alimentoId)
      const item = management.itensMerenda.find((mealItem) => mealItem.id === stock.itemMerendaId)
      return {
        stock,
        food,
        supplierName: item?.fornecedor.nome,
        dailyQuantity: stock.quantidadeAtual / workingDays,
      }
    })

  const byWeekday = new Map<number, DailyMenuResource[]>()
  for (const weekday of [1, 2, 3, 4, 5]) {
    byWeekday.set(weekday, resources)
  }

  return { byWeekday, workingDays }
}

function getPriorityStockStatus(current: MealStockStatus, next: MealStockStatus) {
  const priority: Record<MealStockStatus, number> = {
    DISPONIVEL: 1,
    BAIXO: 2,
    DESCARTADO: 3,
    VENCIDO: 4,
  }
  return priority[next] > priority[current] ? next : current
}

function buildStockOverviewRows(management: MealManagement): StockOverviewRow[] {
  const rows = new Map<string, StockOverviewRow>()

  for (const stock of management.estoqueMerenda) {
    const key = `${stock.alimentoId}-${stock.unidadeMedida}`
    const food = management.alimentosCadastrados.find((item) => item.id === stock.alimentoId)
    const item = management.itensMerenda.find((mealItem) => mealItem.id === stock.itemMerendaId)
    const supplierName = item?.fornecedor.nome
    const current = rows.get(key)

    if (!current) {
      rows.set(key, {
        key,
        food,
        name: stock.nomeAlimento,
        unit: stock.unidadeMedida,
        totalQuantity: stock.quantidadeAtual,
        minimumQuantity: stock.quantidadeMinima,
        suppliers: supplierName ? [supplierName] : [],
        expiryDates: stock.dataValidade ? [stock.dataValidade] : [],
        status: stock.status,
        lotCount: 1,
      })
      continue
    }

    current.totalQuantity += stock.quantidadeAtual
    current.minimumQuantity += stock.quantidadeMinima
    current.lotCount += 1
    current.status = getPriorityStockStatus(current.status, stock.status)
    if (supplierName && !current.suppliers.includes(supplierName)) current.suppliers.push(supplierName)
    if (stock.dataValidade && !current.expiryDates.includes(stock.dataValidade)) current.expiryDates.push(stock.dataValidade)
  }

  return Array.from(rows.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/* ─────────────────────────────────────────────
   Formatters
───────────────────────────────────────────── */
function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function formatStockDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

/* ─────────────────────────────────────────────
   Color helpers
───────────────────────────────────────────── */
function budgetTone(status: MealBudgetStatus): { badge: string; bar: string; bg: string } {
  if (status === 'ULTRAPASSADO')
    return { badge: 'border-red-400 bg-red-50 text-red-700', bar: 'bg-red-500', bg: 'bg-red-50 border-red-400' }
  if (status === 'EM_ALERTA')
    return { badge: 'border-amber-400 bg-amber-50 text-amber-700', bar: 'bg-amber-500', bg: 'bg-amber-50 border-amber-400' }
  return { badge: 'border-emerald-400 bg-emerald-50 text-emerald-700', bar: 'bg-indigo-500', bg: 'bg-emerald-50 border-emerald-400' }
}

function stockTone(status: MealStockStatus): string {
  if (status === 'VENCIDO' || status === 'DESCARTADO') return 'border-red-400 bg-red-50 text-red-700'
  if (status === 'BAIXO') return 'border-amber-400 bg-amber-50 text-amber-700'
  return 'border-emerald-400 bg-emerald-50 text-emerald-700'
}

function statusLabel(status: MealStockStatus): string {
  if (status === 'VENCIDO') return 'Vencido'
  if (status === 'DESCARTADO') return 'Descartado'
  if (status === 'BAIXO') return 'Estoque Baixo'
  return 'Normal'
}

/* ─────────────────────────────────────────────
   Food image helpers
───────────────────────────────────────────── */
function normalizeFoodImageKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function getFoodImageSource(food: Pick<MealFood, 'nome'>) {
  const key = normalizeFoodImageKey(food.nome)
  const fileName = foodImageAliases[key] ?? `${key.charAt(0).toUpperCase()}${key.slice(1)}.png`
  return `/Alimentos/${encodeURIComponent(fileName)}`
}

/* ─────────────────────────────────────────────
   FoodIcon
───────────────────────────────────────────── */
function FoodIcon({ food, className = 'h-5 w-5' }: { food: Pick<MealFood, 'iconKey' | 'nome'>; className?: string }) {
  const source = getFoodImageSource(food)
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [source])
  const Icon = foodIcons[food.iconKey] ?? Utensils
  if (!imageFailed) {
    return (
      <img
        src={source}
        alt={food.nome}
        className={`${className} object-contain`}
        loading="lazy"
        draggable={false}
        onError={() => setImageFailed(true)}
      />
    )
  }
  return <Icon className={className} />
}

/* ─────────────────────────────────────────────
   Atoms
───────────────────────────────────────────── */
function createInitialForm(foodId = 0): MealFormState {
  return {
    alimentoId: foodId,
    quantidade: '',
    valorUnitario: '',
    fornecedorNome: defaultSupplier,
    dataValidade: '',
    lote: '',
    quantidadeMinima: '',
    possuiValidade: true,
  }
}

const inputCls =
  'min-h-9 w-full min-w-0 rounded-lg border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className ?? ''}`}>
      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
        {label}
        {hint && (
          <span className="group relative cursor-default">
            <Info className="h-3 w-3 text-slate-400" />
            <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-[10px] text-white opacity-0 shadow group-hover:opacity-100 transition-opacity">
              {hint}
            </span>
          </span>
        )}
      </span>
      {children}
    </label>
  )
}

function Stat({ label, value, tone = 'text-slate-900', size = 'md' }: { label: string; value: string; tone?: string; size?: 'sm' | 'md' }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
      <span className="block truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <strong className={`block truncate font-black ${tone} ${size === 'sm' ? 'text-sm' : 'text-base'}`}>{value}</strong>
    </div>
  )
}

/* ─────────────────────────────────────────────
   AlertBanner
───────────────────────────────────────────── */
function AlertBanner({ lowStock, expired }: { lowStock: number; expired: number }) {
  if (lowStock === 0 && expired === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex flex-1 flex-wrap gap-3">
        {expired > 0 && (
          <span className="rounded-full border border-red-400 bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
            ⚠️ {expired} item{expired !== 1 ? 's' : ''} vencido{expired !== 1 ? 's' : ''}
          </span>
        )}
        {lowStock > 0 && (
          <span className="rounded-full border border-amber-400 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            📦 {lowStock} item{lowStock !== 1 ? 's' : ''} com estoque baixo
          </span>
        )}
      </div>
      <span className="text-xs font-semibold text-amber-600">Ação necessária</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MetricCard
───────────────────────────────────────────── */
function MetricCard({
  icon,
  label,
  value,
  detail,
  iconBg = 'bg-indigo-50 text-indigo-700',
  iconBorder = 'border-indigo-400',
  highlight,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  iconBg?: string
  iconBorder?: string
  highlight?: boolean
}) {
  return (
    <article className={`grid h-full min-h-[132px] min-w-0 gap-2 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${highlight ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-300'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${iconBorder} ${iconBg}`}>
          {icon}
        </span>
      </div>
      <strong className="min-w-0 truncate font-['Sora',system-ui,sans-serif] text-2xl font-black leading-tight text-slate-950">
        {value}
      </strong>
      <span className="truncate text-xs font-medium text-slate-500">{detail}</span>
    </article>
  )
}

/* ─────────────────────────────────────────────
   SchoolMealCard
───────────────────────────────────────────── */
function SchoolMealCard({
  management,
  schoolName,
  selected,
  onSelect,
}: {
  management: MealManagement
  schoolName: string
  selected: boolean
  onSelect: () => void
}) {
  const alerts = management.resumo.itensBaixoEstoque + management.resumo.itensVencidos
  const percent = Math.min(100, management.orcamentoMensal.percentualUtilizado)
  const tones = budgetTone(management.orcamentoMensal.status)
  const hasAlerts = alerts > 0

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`grid min-w-0 gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 ${
        selected
          ? 'border-indigo-500 bg-indigo-50 shadow-[0_0_0_3px_rgba(79,70,229,0.15)]'
          : 'border-slate-300 bg-white hover:border-indigo-400 hover:shadow-sm'
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block truncate text-sm font-black text-slate-900">{schoolName}</strong>
          <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{management.mesReferencia}</span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {hasAlerts && (
            <span className="flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              <AlertTriangle className="h-3 w-3" /> {alerts}
            </span>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${tones.badge}`}>
            {percent.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="grid gap-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full transition-all ${tones.bar}`} style={{ width: `${percent}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-slate-400">
          <span>Orçamento</span>
          <span>{percent.toFixed(0)}% usado</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-center">
        <div className="rounded-lg border border-slate-300 bg-slate-50 py-1">
          <div className="text-[10px] font-medium text-slate-400">Lotes</div>
          <div className="text-sm font-black text-slate-800">{management.resumo.totalItens}</div>
        </div>
        <div className="rounded-lg border border-slate-300 bg-slate-50 py-1">
          <div className="text-[10px] font-medium text-slate-400">kg</div>
          <div className="text-sm font-black text-slate-800">{formatNumber(management.resumo.totalKgComprado)}</div>
        </div>
      </div>

      <div className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors ${selected ? 'text-indigo-600' : 'text-slate-400'}`}>
        {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {selected ? 'Escola selecionada' : 'Selecionar escola'}
      </div>
    </button>
  )
}

/* ─────────────────────────────────────────────
   BudgetPanel
───────────────────────────────────────────── */
function BudgetPanel({
  management,
  schoolName,
  canEdit,
  onUpdateBudget,
  onShowMovements,
}: {
  management: MealManagement
  schoolName: string
  canEdit: boolean
  onUpdateBudget: (managementId: string, draft: UpdateMealBudgetPayload) => Promise<void>
  onShowMovements: () => void
}) {
  const percent = Math.min(100, management.orcamentoMensal.percentualUtilizado)
  const alertPercent = Math.min(100, management.orcamentoMensal.alertaAoAtingirPercentual)
  const tones = budgetTone(management.orcamentoMensal.status)
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetDraft, setBudgetDraft] = useState(() => String(management.orcamentoMensal.valorLimite))
  const [budgetError, setBudgetError] = useState('')
  const [isSavingBudget, setIsSavingBudget] = useState(false)

  useEffect(() => {
    setBudgetDraft(String(management.orcamentoMensal.valorLimite))
    setBudgetError('')
    setIsEditingBudget(false)
    setIsSavingBudget(false)
  }, [management.id, management.orcamentoMensal.valorLimite])

  async function handleBudgetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit) return

    const normalizedDraft = budgetDraft.trim().replace(/[^\d,.-]/g, '')
    const nextLimit = Number(
      normalizedDraft.includes(',')
        ? normalizedDraft.replace(/\./g, '').replace(',', '.')
        : normalizedDraft,
    )
    if (!Number.isFinite(nextLimit) || nextLimit <= 0) {
      setBudgetError('Informe um valor maior que zero.')
      return
    }

    setIsSavingBudget(true)
    setBudgetError('')
    try {
      await onUpdateBudget(management.id, { valorLimite: nextLimit })
      setIsEditingBudget(false)
    } catch {
      setBudgetError('Nao foi possivel atualizar o orçamento.')
    } finally {
      setIsSavingBudget(false)
    }
  }

  const statusMsg =
    management.orcamentoMensal.status === 'ULTRAPASSADO'
      ? 'Limite excedido'
      : management.orcamentoMensal.status === 'EM_ALERTA'
      ? 'Próximo do limite'
      : 'Dentro do limite'

  return (
    <>
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm xl:h-[330px]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-slate-50 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Orçamento Mensal</p>
            <h2 className="text-sm font-black text-slate-800">{schoolName}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${tones.badge}`}>
            <ShieldCheck className="h-3 w-3" />
            {statusMsg}
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditingBudget(true)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-400 bg-white text-indigo-700 transition-all hover:bg-indigo-50"
              aria-label="Alterar orçamento mensal"
              title="Alterar orçamento mensal"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 p-4">
        <div className="grid gap-2">
          <div className="flex items-end justify-between">
            <span className="text-xl font-black font-['Sora',system-ui,sans-serif] text-slate-900">
              {percent.toFixed(1)}%
            </span>
            <span className="text-[11px] font-medium text-slate-500">do orçamento utilizado</span>
          </div>

          <div className="relative h-3 overflow-visible rounded-full bg-slate-200">
            <div className={`h-full rounded-full transition-all ${tones.bar}`} style={{ width: `${percent}%` }} />
            <div
              className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-amber-400 shadow"
              style={{ left: `${alertPercent}%` }}
              title={`Alerta ao atingir ${alertPercent}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
            <span>R$ 0</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-0.5 rounded-full bg-amber-400" />
              Alerta {alertPercent}%
            </span>
            <span>100%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5">
            <div className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400">Limite</div>
            <strong className="mt-0.5 block truncate text-sm font-black text-slate-900">
              {formatCurrency(management.orcamentoMensal.valorLimite)}
            </strong>
          </div>
          <div className="min-w-0 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Utilizado</div>
            <strong className="mt-0.5 block truncate text-sm font-black text-slate-900">
              {formatCurrency(management.orcamentoMensal.valorUtilizado)}
            </strong>
          </div>
          <div className={`min-w-0 rounded-xl border px-3 py-2.5 ${management.orcamentoMensal.valorDisponivel > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Disponível</div>
            <strong className={`mt-0.5 block truncate text-sm font-black ${management.orcamentoMensal.valorDisponivel > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(management.orcamentoMensal.valorDisponivel)}
            </strong>
          </div>
        </div>

        <button
          type="button"
          onClick={onShowMovements}
          className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/50"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-sm font-bold text-slate-700">Ver movimentações</p>
              <p className="text-[11px] text-slate-400">{management.movimentacoesOrcamento.length} registros</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </section>
    {isEditingBudget && (
      <Modal
        id="mv-budget-limit-title"
        title="Alterar orçamento"
        subtitle={schoolName}
        onClose={() => {
          if (isSavingBudget) return
          setBudgetDraft(String(management.orcamentoMensal.valorLimite))
          setBudgetError('')
          setIsEditingBudget(false)
        }}
        maxWidth="420px"
      >
        <form onSubmit={handleBudgetSubmit} className="grid gap-4 p-5">
          <Field label="Limite mensal (R$)">
            <input
              className={inputCls}
              inputMode="decimal"
              value={budgetDraft}
              onChange={(event) => setBudgetDraft(event.target.value)}
              aria-label="Valor limite mensal do orçamento"
              autoFocus
            />
          </Field>
          {budgetError && <p className="text-xs font-semibold text-red-600">{budgetError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={isSavingBudget}
              onClick={() => {
                setBudgetDraft(String(management.orcamentoMensal.valorLimite))
                setBudgetError('')
                setIsEditingBudget(false)
              }}
              className="inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-600 transition-all hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingBudget}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSavingBudget ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    )}
    </>
  )
}

/* ─────────────────────────────────────────────
   MenuCard
───────────────────────────────────────────── */
function MenuCard({ menu, foods }: { menu: MealMenu; foods: MealFood[] }) {
  const menuFoods = menu.alimentoIds
    .map((id) => foods.find((f) => f.id === id))
    .filter((f): f is MealFood => Boolean(f))

  return (
    <article className="grid h-full min-h-[176px] min-w-0 grid-rows-[auto_1fr] gap-0 overflow-hidden rounded-xl border border-slate-300 bg-white transition-all hover:border-slate-400 hover:shadow-sm">
      <div className="min-h-[76px] border-b border-slate-300 bg-slate-50 px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${mealTypeColors[menu.tipoRefeicao]}`}>
            {mealTypeLabels[menu.tipoRefeicao]}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${shiftColors[menu.turno]}`}>
            {shiftLabels[menu.turno]}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
            <CalendarDays className="h-3 w-3" />
            {menu.diaSemana}
          </span>
        </div>
        <strong className="mt-2 block truncate text-sm font-black text-slate-900">{menu.titulo}</strong>
      </div>

      <div className="grid content-start gap-1.5 px-3.5 py-3">
        {menuFoods.slice(0, 4).map((food) => (
          <span key={food.id} className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-300 bg-slate-50">
              <FoodIcon food={food} className="h-5 w-5" />
            </span>
            <span className="truncate">{food.nome}</span>
          </span>
        ))}
        {menuFoods.length > 4 && (
          <span className="pl-9 text-[10px] font-semibold text-slate-400">+{menuFoods.length - 4} mais</span>
        )}
        {menuFoods.length === 0 && (
          <span className="text-xs text-slate-400">Nenhum alimento vinculado</span>
        )}
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────
   StockCard
───────────────────────────────────────────── */
function StockCard({
  stock,
  food,
  supplierName,
  onClick,
}: {
  stock: MealStockItem
  food?: MealFood
  supplierName?: string
  onClick: () => void
}) {
  const isLow = stock.status === 'BAIXO'
  const isExpired = stock.status === 'VENCIDO' || stock.status === 'DESCARTADO'
  const levelPercent = stock.quantidadeMinima > 0
    ? Math.min(100, (stock.quantidadeAtual / stock.quantidadeMinima) * 100)
    : 100

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      className={`group relative grid min-h-[74px] min-w-0 cursor-pointer gap-2 overflow-hidden rounded-lg border bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 ${
        isExpired ? 'border-red-400' : isLow ? 'border-amber-400' : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${isExpired ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'}`} />

      <div className="flex min-w-0 items-center gap-3 pt-1">
        <span className={`hidden h-12 w-12 shrink-0 place-items-center rounded-xl border shadow-sm ${isExpired ? 'border-red-300 bg-red-50' : isLow ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-white'}`}>
          {food ? <FoodIcon food={food} className="h-9 w-9" /> : <Utensils className="h-5 w-5 text-slate-400" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <strong className="min-w-0 truncate text-sm font-black text-slate-900">{stock.nomeAlimento}</strong>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${stockTone(stock.status)}`}>
              {statusLabel(stock.status)}
            </span>
          </div>
          <div className="hidden">
            <div className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Disponível</div>
              <strong className="text-sm font-black text-slate-800">
                {formatNumber(stock.quantidadeAtual)} <span className="text-[10px] font-semibold text-slate-400">{stock.unidadeMedida}</span>
              </strong>
            </div>
            <div className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Mínimo</div>
              <strong className="text-sm font-black text-slate-500">
                {formatNumber(stock.quantidadeMinima)} <span className="text-[10px] font-semibold text-slate-400">{stock.unidadeMedida}</span>
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${isExpired ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'}`}
            style={{ width: `${levelPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-semibold text-slate-400">
          <span>{levelPercent.toFixed(0)}% do mínimo</span>
        </div>
      </div>

      <div className="hidden">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-slate-400">
            {supplierName ?? 'Fornecedor não informado'}
          </p>
          <p className="text-[11px] font-bold text-slate-600">
            Val:{' '}
            {stock.dataValidade
              ? new Date(`${stock.dataValidade}T12:00:00`).toLocaleDateString('pt-BR')
              : '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClick}
          aria-label="Ver detalhes"
          className="flex shrink-0 items-center gap-0.5 rounded-sm border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
        >
          Detalhes
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}

/* ─────────────────────────────────────────────
   Modal wrapper (portal) — mais compacto
───────────────────────────────────────────── */
function StockCompactCard({
  stock,
  food,
  supplierName,
  onClick,
}: {
  stock: MealStockItem
  food?: MealFood
  supplierName?: string
  onClick: () => void
}) {
  const isLow = stock.status === 'BAIXO'
  const isExpired = stock.status === 'VENCIDO' || stock.status === 'DESCARTADO'
  const levelPercent = stock.quantidadeMinima > 0
    ? Math.min(100, (stock.quantidadeAtual / stock.quantidadeMinima) * 100)
    : 100

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      className={`group flex h-[76px] min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border bg-white px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 ${
        isExpired ? 'border-red-400' : isLow ? 'border-amber-400' : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${isExpired ? 'border-red-300 bg-red-50' : isLow ? 'border-amber-300 bg-amber-50' : 'border-slate-300 bg-slate-50'}`}>
        {food ? <FoodIcon food={food} className="h-7 w-7" /> : <Utensils className="h-4 w-4 text-slate-400" />}
      </span>

      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <strong className="min-w-0 truncate text-sm font-black text-slate-900">{stock.nomeAlimento}</strong>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${stockTone(stock.status)}`}>
            {statusLabel(stock.status)}
          </span>
        </div>
        <div className="flex min-w-0 flex-nowrap items-center gap-x-2 text-[11px] font-semibold text-slate-500">
          <span className="font-black text-slate-700">
            {formatNumber(stock.quantidadeAtual)} {stock.unidadeMedida}
          </span>
          <span className="min-w-0 truncate">
            {supplierName ?? 'Fornecedor não informado'}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${isExpired ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'}`}
            style={{ width: `${levelPercent}%` }}
          />
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500" />
    </article>
  )
}

function Modal({
  id,
  title,
  subtitle,
  onClose,
  children,
  maxWidth = '680px',
}: {
  id: string
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const modal = (
    <div
      role="presentation"
      onMouseDown={onClose}
      className="mv-backdrop fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto px-4 py-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onMouseDown={(e) => e.stopPropagation()}
        className="mv-modal w-full overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl"
        style={{ maxWidth }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-300 bg-slate-50 px-5 py-4">
          <div>
            {subtitle && (
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-500">{subtitle}</p>
            )}
            <h2 id={id} className="font-['Sora',system-ui,sans-serif] text-lg font-black text-slate-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-400 transition-all hover:border-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}

/* ─────────────────────────────────────────────
   MovementsModal — compacto
───────────────────────────────────────────── */
function MovementsModal({
  management,
  schoolName,
  onClose,
}: {
  management: MealManagement
  schoolName: string
  onClose: () => void
}) {
  const movements = [...management.movimentacoesOrcamento].sort(
    (a, b) => new Date(b.dataMovimentacao).getTime() - new Date(a.dataMovimentacao).getTime(),
  )
  const total = movements.reduce((sum, m) => sum + m.valor, 0)

  return (
    <Modal id="mv-movements-title" title="Movimentações do Mês" subtitle={schoolName} onClose={onClose} maxWidth="640px">
      <div className="grid grid-cols-3 gap-2 border-b border-slate-300 bg-slate-50 px-4 py-3">
        <Stat label="Registros" value={String(movements.length)} size="sm" />
        <Stat label="Total movimentado" value={formatCurrency(total)} size="sm" />
        <Stat label="Saldo disponível" value={formatCurrency(management.orcamentoMensal.valorDisponivel)} tone="text-emerald-700" size="sm" />
      </div>

      <div className="max-h-[55vh] overflow-y-auto p-4">
        {movements.length > 0 ? (
          <div className="grid gap-2">
            {movements.map((m) => (
              <article key={m.id} className="grid gap-2.5 overflow-hidden rounded-xl border border-slate-300 bg-white p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block text-sm font-bold text-slate-900">{m.descricao}</strong>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {new Date(m.dataMovimentacao).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full border border-indigo-400 bg-indigo-50 px-3 py-1 text-sm font-black text-indigo-700">
                    {formatCurrency(m.valor)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Saldo antes" value={formatCurrency(m.saldoAntes)} size="sm" />
                  <Stat label="Saldo depois" value={formatCurrency(m.saldoDepois)} size="sm" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-slate-300 bg-white text-center">
            <div>
              <History className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-400">Nenhuma movimentação este mês</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   MenuCalendarModal — responsivo e visual de cardápio
───────────────────────────────────────────── */
function MenuCalendarModal({
  management,
  schoolName,
  onClose,
}: {
  management: MealManagement
  schoolName: string
  onClose: () => void
}) {
  const cells = useMemo(
    () => buildMenuMonthCells(management.mesReferencia, management.cardapios),
    [management.cardapios, management.mesReferencia],
  )
  const { byWeekday, workingDays } = useMemo(() => buildDailyMenuResources(management), [management])
  const firstBusinessDay = cells.find((cell) => cell.day && cell.weekday !== null && cell.weekday >= 1 && cell.weekday <= 5) ?? null
  const [selectedCell, setSelectedCell] = useState<MenuCalendarCell | null>(firstBusinessDay)
  const [activeTab, setActiveTab] = useState<'calendar' | 'menus'>('menus')

  useEffect(() => {
    setSelectedCell(firstBusinessDay)
  }, [firstBusinessDay?.key])

  const selectedResources = selectedCell?.weekday ? byWeekday.get(selectedCell.weekday) ?? [] : []
  const isBusinessDay = selectedCell?.weekday !== null && selectedCell?.weekday !== undefined && selectedCell.weekday >= 1 && selectedCell.weekday <= 5

  /* Group menus by weekday for the "Cardápios" tab */
  const menusByWeekday = useMemo(() => {
    const map = new Map<number, MealMenu[]>()
    for (const menu of management.cardapios) {
      const wd = getWeekdayIndex(menu.diaSemana)
      if (wd < 0) continue
      const existing = map.get(wd) ?? []
      existing.push(menu)
      map.set(wd, existing.sort((a, b) => mealTypeOrder[a.tipoRefeicao] - mealTypeOrder[b.tipoRefeicao]))
    }
    return map
  }, [management.cardapios])

  const businessWeekdays = [1, 2, 3, 4, 5]

  return (
    <Modal
      id="mv-menu-calendar-title"
      title="Calendário de Cardápios"
      subtitle={`${schoolName} · ${formatMonthReference(management.mesReferencia)}`}
      onClose={onClose}
      maxWidth="860px"
    >
      {/* Tabs */}
      <div className="flex border-b border-slate-300 bg-slate-50">
        {(['menus', 'calendar'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'menus' ? '🍽️ Cardápios por Dia' : '📅 Calendário do Mês'}
          </button>
        ))}
      </div>

      {/* ── MENUS TAB: Cardápio semanal estilo restaurante ── */}
      {activeTab === 'menus' && (
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {/* Legend */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legenda:</span>
            {(Object.entries(mealTypeLabels) as [MealMenu['tipoRefeicao'], string][]).map(([type, label]) => (
              <span key={type} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <span className={`h-2.5 w-2.5 rounded-full ${mealTypeDotColors[type]}`} />
                {label}
              </span>
            ))}
          </div>

          {/* Weekly table */}
          <div className="grid gap-3">
            {businessWeekdays.map((wd) => {
              const dayMenus = menusByWeekday.get(wd) ?? []
              return (
                <div key={wd} className={`overflow-hidden rounded-xl border ${dayMenus.length > 0 ? 'border-slate-300' : 'border-dashed border-slate-300'} bg-white`}>
                  {/* Day header */}
                  <div className={`flex items-center justify-between px-4 py-2.5 ${dayMenus.length > 0 ? 'bg-indigo-600' : 'bg-slate-100'}`}>
                    <span className={`text-sm font-black ${dayMenus.length > 0 ? 'text-white' : 'text-slate-400'}`}>
                      {weekDayFullLabels[wd]}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${dayMenus.length > 0 ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-200 text-slate-400'}`}>
                      {dayMenus.length} refeição{dayMenus.length !== 1 ? 'ões' : ''}
                    </span>
                  </div>

                  {dayMenus.length > 0 ? (
                    <div className="divide-y divide-slate-200 px-4">
                      {dayMenus.map((menu) => {
                        const menuFoods = menu.alimentoIds
                          .map((id) => management.alimentosCadastrados.find((f) => f.id === id))
                          .filter((f): f is MealFood => Boolean(f))
                        return (
                          <div key={menu.id} className="py-3">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${mealTypeColors[menu.tipoRefeicao]}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${mealTypeDotColors[menu.tipoRefeicao]}`} />
                                {mealTypeLabels[menu.tipoRefeicao]}
                              </span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${shiftColors[menu.turno]}`}>
                                {shiftLabels[menu.turno]}
                              </span>
                              <strong className="ml-auto text-sm font-black text-slate-800">{menu.titulo}</strong>
                            </div>
                            {menuFoods.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-1">
                                {menuFoods.map((food) => (
                                  <span key={food.id} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                    <FoodIcon food={food} className="h-4 w-4" />
                                    {food.nome}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <span className="text-xs font-semibold text-slate-400">Sem cardápio planejado</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CALENDAR TAB ── */}
      {activeTab === 'calendar' && (
        <div className="grid max-h-[70vh] gap-0 overflow-hidden lg:grid-cols-[1fr_280px]">
          {/* Calendar grid */}
          <div className="overflow-y-auto p-4">
            <div className="grid grid-cols-7 gap-1 pb-2">
              {weekDayShortLabels.map((label) => (
                <div key={label} className="rounded-lg border border-slate-300 bg-slate-100 px-1 py-1.5 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                const businessDay = cell.weekday !== null && cell.weekday >= 1 && cell.weekday <= 5
                const selected = selectedCell?.key === cell.key

                return (
                  <button
                    key={cell.key}
                    type="button"
                    disabled={!cell.day}
                    onClick={() => cell.day && setSelectedCell(cell)}
                    className={`min-h-[80px] rounded-lg border p-1.5 text-left transition-all ${
                      !cell.day
                        ? 'border-transparent bg-transparent'
                        : selected
                          ? 'border-indigo-500 bg-indigo-50 shadow-[0_0_0_2px_rgba(79,70,229,0.15)]'
                          : businessDay
                            ? 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {cell.day ? (
                      <>
                        <span className={`mb-1 flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${
                          businessDay ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-white'
                        }`}>
                          {cell.day}
                        </span>
                        {cell.menus.slice(0, 2).map((menu) => (
                          <div key={menu.id} className={`mb-0.5 flex items-center gap-0.5 rounded px-1 py-0.5`}>
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${mealTypeDotColors[menu.tipoRefeicao]}`} />
                            <span className="truncate text-[9px] font-bold text-slate-600">{mealTypeLabels[menu.tipoRefeicao]}</span>
                          </div>
                        ))}
                        {cell.menus.length > 2 && (
                          <span className="text-[9px] font-bold text-slate-400">+{cell.menus.length - 2}</span>
                        )}
                      </>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day detail panel */}
          <aside className="grid content-start gap-3 overflow-y-auto border-l border-slate-300 bg-white p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600">Detalhes do dia</p>
              <h3 className="mt-1 font-['Sora',system-ui,sans-serif] text-base font-black text-slate-950">
                {selectedCell?.day
                  ? `${selectedCell.day} — ${selectedCell.weekday !== null ? weekDayShortLabels[selectedCell.weekday] : ''}`
                  : 'Selecione um dia'}
              </h3>
            </div>

            {selectedCell?.menus.length ? (
              <div className="grid gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Cardápios planejados</span>
                {selectedCell.menus.map((menu) => {
                  const menuFoods = menu.alimentoIds
                    .map((id) => management.alimentosCadastrados.find((f) => f.id === id))
                    .filter((f): f is MealFood => Boolean(f))
                  return (
                    <div key={menu.id} className="rounded-xl border border-slate-300 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${mealTypeColors[menu.tipoRefeicao]}`}>
                          {mealTypeLabels[menu.tipoRefeicao]}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${shiftColors[menu.turno]}`}>
                          {shiftLabels[menu.turno]}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{menu.titulo}</p>
                      {menuFoods.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {menuFoods.slice(0, 3).map((food) => (
                            <span key={food.id} className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                              <FoodIcon food={food} className="h-3.5 w-3.5" />
                              {food.nome}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : !selectedCell ? (
              <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-400">Clique em um dia do calendário</p>
              </div>
            ) : !isBusinessDay ? (
              <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-400">Fins de semana não têm distribuição</p>
              </div>
            ) : (
              <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                <p className="text-xs font-semibold text-slate-400">Nenhum cardápio planejado</p>
              </div>
            )}

            {/* Stock resources */}
            {isBusinessDay && selectedResources.length > 0 && (
              <div className="grid gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Estoque ({workingDays} dias úteis)
                </span>
                {selectedResources.map(({ stock, food, supplierName, dailyQuantity }) => (
                  <div key={stock.id} className="rounded-xl border border-slate-300 bg-slate-50 p-2.5">
                    <div className="flex min-w-0 items-center gap-2 mb-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white">
                        {food ? <FoodIcon food={food} className="h-6 w-6" /> : <Utensils className="h-3.5 w-3.5 text-slate-400" />}
                      </span>
                      <strong className="min-w-0 truncate text-xs font-black text-slate-900">{stock.nomeAlimento}</strong>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Stat label="Para o dia" value={`${formatNumber(dailyQuantity)} ${stock.unidadeMedida}`} size="sm" />
                      <Stat label="Total" value={`${formatNumber(stock.quantidadeAtual)} ${stock.unidadeMedida}`} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   StockDetailModal — compacto
───────────────────────────────────────────── */
function StockDetailModal({
  stock,
  food,
  supplierName,
  onClose,
}: StockDetailState & { onClose: () => void }) {
  const tones = stockTone(stock.status)
  const levelPercent = stock.quantidadeMinima > 0
    ? Math.min(100, (stock.quantidadeAtual / stock.quantidadeMinima) * 100)
    : 100
  const isOk = stock.quantidadeAtual > stock.quantidadeMinima

  return (
    <Modal id="mv-stock-detail-title" title={stock.nomeAlimento} subtitle="Detalhe do item em estoque" onClose={onClose} maxWidth="480px">
      <div className="grid gap-4 p-5">
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-300 bg-slate-50 p-3.5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white shadow-sm">
            {food ? <FoodIcon food={food} className="h-11 w-11" /> : <Utensils className="h-6 w-6 text-slate-400" />}
          </span>
          <div className="min-w-0">
            <h3 className="font-['Sora',system-ui,sans-serif] text-base font-black text-slate-900">{stock.nomeAlimento}</h3>
            <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${tones}`}>
              {statusLabel(stock.status)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Quantidade atual', value: `${formatNumber(stock.quantidadeAtual)} ${stock.unidadeMedida}` },
            { label: 'Quantidade mínima', value: `${formatNumber(stock.quantidadeMinima)} ${stock.unidadeMedida}` },
            { label: 'Fornecedor', value: supplierName ?? 'Não informado' },
            {
              label: 'Data de validade',
              value: stock.dataValidade
                ? new Date(`${stock.dataValidade}T12:00:00`).toLocaleDateString('pt-BR')
                : 'Sem validade'
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{s.label}</div>
              <strong className="mt-0.5 block text-sm font-bold text-slate-900">{s.value}</strong>
            </div>
          ))}
        </div>

        <div className="grid gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Nível de estoque</span>
            <span className={`text-xs font-black ${isOk ? 'text-emerald-600' : 'text-red-600'}`}>
              {stock.quantidadeMinima > 0 ? `${levelPercent.toFixed(0)}% do mínimo` : 'Sem mínimo definido'}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${levelPercent}%` }}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-600 transition-all hover:border-slate-400 hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   WizardStepIndicator
───────────────────────────────────────────── */
function StockOverviewModal({
  management,
  schoolName,
  onClose,
}: StockOverviewModalState & { onClose: () => void }) {
  const rows = buildStockOverviewRows(management)
  const unitTotals = rows.reduce<Record<MealStockItem['unidadeMedida'], number>>(
    (totals, row) => {
      totals[row.unit] += row.totalQuantity
      return totals
    },
    { KG: 0, UN: 0, L: 0 },
  )
  const totalsText = (Object.entries(unitTotals) as Array<[MealStockItem['unidadeMedida'], number]>)
    .filter(([, total]) => total > 0)
    .map(([unit, total]) => `${formatNumber(total)} ${unit}`)
    .join(' · ')

  return (
    <Modal
      id="mv-stock-overview-title"
      title="Estoque completo"
      subtitle={schoolName}
      onClose={onClose}
      maxWidth="980px"
    >
      <div className="mv-scroll grid max-h-[min(78vh,720px)] gap-4 overflow-y-auto p-5">
        <div className="grid gap-2 sm:grid-cols-3">
          <Stat label="Alimentos" value={String(rows.length)} />
          <Stat label="Lotes" value={String(management.estoqueMerenda.length)} />
          <Stat label="Quantidade total" value={totalsText || '0'} />
        </div>

        {rows.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
            <div className="hidden grid-cols-[minmax(190px,1.25fr)_130px_minmax(170px,1fr)_minmax(170px,1fr)_110px] gap-3 border-b border-slate-300 bg-slate-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-400 md:grid">
              <span>Alimento</span>
              <span>Quantidade total</span>
              <span>Fornecedores</span>
              <span>Validade</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-slate-200">
              {rows.map((row) => (
                <article
                  key={row.key}
                  className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(190px,1.25fr)_130px_minmax(170px,1fr)_minmax(170px,1fr)_110px] md:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-300 bg-slate-50">
                      {row.food ? <FoodIcon food={row.food} className="h-7 w-7" /> : <Utensils className="h-4 w-4 text-slate-400" />}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-black text-slate-900">{row.name}</strong>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {row.lotCount} lote{row.lotCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 md:hidden">
                      Quantidade total
                    </span>
                    <strong className="text-sm font-black text-slate-900">
                      {formatNumber(row.totalQuantity)} {row.unit}
                    </strong>
                  </div>

                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 md:hidden">
                      Fornecedores
                    </span>
                    <span className="block truncate text-sm font-semibold text-slate-600">
                      {row.suppliers.length > 0 ? row.suppliers.join(', ') : 'Não informado'}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 md:hidden">
                      Validade
                    </span>
                    <span className="block truncate text-sm font-semibold text-slate-600">
                      {row.expiryDates.length > 0
                        ? row.expiryDates.sort().map(formatStockDate).join(', ')
                        : 'Sem validade'}
                    </span>
                  </div>

                  <span className={`w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${stockTone(row.status)}`}>
                    {statusLabel(row.status)}
                  </span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid min-h-[180px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <div>
              <PackageCheck className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-400">Nenhum item em estoque</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function WizardStepIndicator({ current }: { current: WizardStep }) {
  const steps: { n: WizardStep; label: string; hint: string }[] = [
    { n: 1, label: 'Alimento', hint: 'Escolha o item' },
    { n: 2, label: 'Detalhes', hint: 'Qtd e dados' },
    { n: 3, label: 'Confirmar', hint: 'Revise e salve' },
  ]
  return (
    <div className="flex items-stretch border-b border-slate-300 bg-slate-50">
      {steps.map(({ n, label, hint }, idx) => {
        const done = current > n
        const active = current === n
        return (
          <div key={n} className="flex flex-1 items-center">
            <div
              className={`flex flex-1 flex-col items-center gap-1 border-b-2 py-2.5 transition-all ${
                active ? 'border-indigo-600' : done ? 'border-emerald-500' : 'border-transparent'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black transition-all ${
                  active ? 'bg-indigo-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {done ? <CheckCircle2 className="h-3 w-3" /> : n}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`h-px w-2 flex-shrink-0 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SectionDivider
───────────────────────────────────────────── */
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   ConfirmRow
───────────────────────────────────────────── */
function ConfirmRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-right text-sm font-bold ${accent ? 'text-indigo-700' : 'text-slate-900'}`}>{value}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   PurchaseForm — 3-step wizard
───────────────────────────────────────────── */
function PurchaseForm({
  management,
  onSearchFoods,
  onCreateItem,
}: {
  management: MealManagement
  onSearchFoods: (query: string, limit?: number) => Promise<MealFood[]>
  onCreateItem: (managementId: string, draft: CreateMealItemPayload) => Promise<void>
}) {
  const [step, setStep] = useState<WizardStep>(1)
  const [query, setQuery] = useState('')
  const [foodOptions, setFoodOptions] = useState<MealFood[]>([])
  const [selectedFood, setSelectedFood] = useState<MealFood | null>(null)
  const [isSearchingFoods, setIsSearchingFoods] = useState(false)
  const [foodSearchError, setFoodSearchError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<MealFormState>(() => createInitialForm())

  useEffect(() => {
    const search = query.trim()
    if (search === selectedFood?.nome) {
      setFoodOptions([])
      setFoodSearchError('')
      setIsSearchingFoods(false)
      return
    }

    let isCurrent = true
    setIsSearchingFoods(true)
    setFoodSearchError('')

    const timeoutId = window.setTimeout(() => {
      onSearchFoods(search, foodSuggestionLimit)
        .then((foods) => {
          if (!isCurrent) return
          const options = foods.slice(0, foodSuggestionLimit)
          setFoodOptions(
            options.length > 0
              ? options
              : search
                ? []
                : management.alimentosCadastrados.slice(0, foodSuggestionLimit),
          )
        })
        .catch(() => {
          if (isCurrent) {
            const fallbackOptions = search ? [] : management.alimentosCadastrados.slice(0, foodSuggestionLimit)
            setFoodOptions(fallbackOptions)
            setFoodSearchError(fallbackOptions.length > 0 ? '' : 'Nao foi possivel buscar alimentos agora.')
          }
        })
        .finally(() => {
          if (isCurrent) setIsSearchingFoods(false)
        })
    }, search ? 250 : 0)

    return () => {
      isCurrent = false
      window.clearTimeout(timeoutId)
    }
  }, [management.alimentosCadastrados, management.id, onSearchFoods, query, selectedFood?.nome])

  useEffect(() => {
    setStep(1)
    setSaved(false)
    setQuery('')
    setFoodOptions([])
    setSelectedFood(null)
    setFoodSearchError('')
    setIsSearchingFoods(false)
    setForm(createInitialForm())
  }, [management.id])

  const foodSearchTerm = query.trim()
  const shouldShowFoodOptions = !selectedFood || foodSearchTerm !== selectedFood.nome
  const estimatedTotal = Number(form.quantidade || 0) * Number(form.valorUnitario || 0)
  const step2Valid = !!form.quantidade && !!form.valorUnitario && !!form.fornecedorNome

  async function handleSubmit() {
    if (!selectedFood) return
    setIsSaving(true)
    try {
      await onCreateItem(management.id, {
        alimentoId: selectedFood.id,
        quantidade: Number(form.quantidade),
        valorUnitario: Number(form.valorUnitario),
        fornecedorNome: form.fornecedorNome,
        dataValidade: form.possuiValidade ? form.dataValidade || null : null,
        possuiValidade: form.possuiValidade,
        lote: form.lote || null,
        quantidadeMinima: form.quantidadeMinima ? Number(form.quantidadeMinima) : undefined,
      })
      setSaved(true)
    } catch {
      // The parent action already shows the API error as a toast.
    } finally {
      setIsSaving(false)
    }
  }

  function resetForm() {
    setStep(1)
    setQuery('')
    setFoodOptions([])
    setSelectedFood(null)
    setFoodSearchError('')
    setSaved(false)
    setForm(createInitialForm())
  }

  if (saved) {
    return (
      <section className="overflow-hidden rounded-xl border border-emerald-400 bg-white shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-emerald-300 bg-emerald-50 px-4 py-3.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-600">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Compra registrada</p>
            <h2 className="text-sm font-black text-slate-800">Alimento adicionado ao estoque</h2>
          </div>
        </div>
        <div className="grid place-items-center gap-4 p-6 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full border-4 border-emerald-100 bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <p className="font-['Sora',system-ui,sans-serif] text-base font-black text-slate-900">
              {selectedFood?.nome ?? 'Item'} registrado com sucesso!
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {formatCurrency(estimatedTotal)} · {form.quantidade} {selectedFood?.unidadeMedida}
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white transition-all hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Registrar nova compra
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm xl:h-[468px] xl:overflow-y-auto">
      <div className="flex items-center gap-2.5 border-b border-slate-300 bg-slate-50 px-4 py-3.5">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600">
          <Plus className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Registrar Compra</p>
          <h2 className="text-sm font-black text-slate-800">Adicionar alimento ao estoque</h2>
        </div>
      </div>

      <WizardStepIndicator current={step} />

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div>
          <div className="border-b border-slate-300 bg-white px-4 py-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">Selecione o alimento comprado:</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                className="min-h-9 w-full rounded-lg border border-slate-400 bg-slate-50 pl-9 pr-3 text-sm font-semibold outline-none transition-all placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelectedFood(null)
                  setForm((c) => ({ ...c, alimentoId: 0 }))
                }}
                placeholder="Buscar por nome ou categoria..."
                autoFocus
              />
            </div>
          </div>

          {shouldShowFoodOptions && (
          <div className="border-b border-slate-300 p-3">
            <div className="mb-2 flex h-6 items-center justify-between gap-3">
              <span className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">
                {foodSearchTerm ? 'Resultados mais próximos' : 'Sugestões de alimentos'}
              </span>
              <span className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {foodSuggestionLimit} alimentos
              </span>
            </div>
              <div className="grid h-[162px] grid-rows-[repeat(4,36px)] gap-1.5 overflow-hidden">
              {isSearchingFoods && (
                <div className="row-span-4 grid place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-400">Buscando alimentos...</p>
                </div>
              )}

              {!isSearchingFoods && foodOptions.slice(0, foodSuggestionLimit).map((food) => {
                const isSelected = selectedFood?.id === food.id
                return (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => {
                      setSelectedFood(food)
                      setQuery(food.nome)
                      setFoodOptions([])
                      setFoodSearchError('')
                      setForm((c) => ({ ...c, alimentoId: food.id }))
                    }}
                      className={`flex h-9 min-w-0 items-center gap-2.5 overflow-hidden rounded-xl border px-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 shadow-[0_0_0_2px_rgba(99,102,241,0.1)]'
                        : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40'
                    }`}
                  >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white shadow-sm">
                        <FoodIcon food={food} className="h-4 w-4" />
                      </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-black leading-4 text-slate-900">{food.nome}</strong>
                      <span className="mt-0.5 block truncate text-[10px] font-semibold leading-3 text-slate-400">
                        {food.categoria} · {food.unidadeMedida}
                      </span>
                    </span>
                    {isSelected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-indigo-500" />}
                  </button>
                )
              })}
              {!isSearchingFoods && foodSearchError && (
                <div className="row-span-4 grid place-items-center rounded-xl border border-dashed border-red-300 bg-red-50 px-3 text-center">
                  <p className="text-sm font-semibold text-red-500">{foodSearchError}</p>
                </div>
              )}
              {!isSearchingFoods && !foodSearchError && foodOptions.length === 0 && !selectedFood && (
                <div className="row-span-4 grid place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-center">
                  <p className="text-sm text-slate-400">Nenhum alimento retornado pelo endpoint</p>
                </div>
              )}
            </div>
          </div>
          )}

          <div className="flex min-h-[61px] items-center justify-between gap-3 border-t border-slate-300 bg-slate-50 px-4 py-3">
            {selectedFood ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white">
                  <FoodIcon food={selectedFood} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400">Selecionado</p>
                  <p className="truncate text-sm font-black text-slate-900">{selectedFood.nome}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Escolha um alimento acima</p>
            )}
            <button
              type="button"
              disabled={!selectedFood}
              onClick={() => setStep(2)}
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-sm bg-indigo-600 px-4 text-sm font-black text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div>
          {selectedFood && (
            <div className="flex items-center gap-3 border-b border-slate-300 bg-indigo-50 px-4 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-indigo-200 bg-white shadow-sm">
                <FoodIcon food={selectedFood} className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">{selectedFood.nome}</p>
                <p className="text-[10px] font-semibold text-indigo-500">{selectedFood.categoria} · {selectedFood.unidadeMedida}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="shrink-0 text-[10px] font-bold text-indigo-500 underline underline-offset-2 hover:text-indigo-700"
              >
                Trocar
              </button>
            </div>
          )}

          <div className="grid gap-4 p-4">
            <div className="grid gap-2.5">
              <SectionDivider label="Quantidade e valor" />
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Quantidade (${selectedFood?.unidadeMedida ?? 'un'})`} hint="Quantidade total comprada">
                  <input
                    className={inputCls}
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                  />
                </Field>
                <Field label="Valor unitário (R$)" hint="Preço por unidade">
                  <input
                    className={inputCls}
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={form.valorUnitario}
                    onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2.5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">Total da compra</p>
                  <p className="text-[11px] text-indigo-400">{form.quantidade || '0'} × {form.valorUnitario ? formatCurrency(Number(form.valorUnitario)) : 'R$ —'}</p>
                </div>
                <strong className="font-['Sora',system-ui,sans-serif] text-xl font-black text-indigo-700">
                  {formatCurrency(Number.isFinite(estimatedTotal) ? estimatedTotal : 0)}
                </strong>
              </div>
            </div>

            <div className="grid gap-2.5">
              <SectionDivider label="Estoque e rastreio" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Qtd. mínima" hint="Alerta quando atingir este valor">
                  <input
                    className={inputCls}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Automático"
                    value={form.quantidadeMinima}
                    onChange={(e) => setForm({ ...form, quantidadeMinima: e.target.value })}
                  />
                </Field>
                <Field label="Lote" hint="Código de rastreamento">
                  <input
                    className={inputCls}
                    placeholder="Ex: LT202605001"
                    value={form.lote}
                    onChange={(e) => setForm({ ...form, lote: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-2.5">
              <SectionDivider label="Validade e fornecedor" />

              <button
                type="button"
                onClick={() =>
                  setForm((c) => ({
                    ...c,
                    possuiValidade: !c.possuiValidade,
                    dataValidade: !c.possuiValidade ? c.dataValidade : '',
                  }))
                }
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                  form.possuiValidade ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50'
                }`}
              >
                {form.possuiValidade ? (
                  <ToggleRight className="h-5 w-5 shrink-0 text-indigo-600" />
                ) : (
                  <ToggleLeft className="h-5 w-5 shrink-0 text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-bold text-slate-800">Controlar data de validade</p>
                  <p className="text-[11px] text-slate-500">
                    {form.possuiValidade ? 'Ativo — informe a data abaixo' : 'Desativado — produto sem validade'}
                  </p>
                </div>
              </button>

              <div className={`grid gap-3 ${form.possuiValidade ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {form.possuiValidade && (
                  <Field label="Data de validade">
                    <DateInput
                      className={inputCls}
                      value={form.dataValidade}
                      onChange={(e) => setForm({ ...form, dataValidade: e.target.value })}
                    />
                  </Field>
                )}
                <Field label="Fornecedor">
                  <input
                    className={inputCls}
                    required
                    value={form.fornecedorNome}
                    onChange={(e) => setForm({ ...form, fornecedorNome: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 border-t border-slate-300 bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-slate-300 bg-white px-4 text-sm font-bold text-slate-600 transition-all hover:border-slate-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <button
              type="button"
              disabled={!step2Valid}
              onClick={() => setStep(3)}
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-sm bg-indigo-600 px-4 text-sm font-black text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revisar compra
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div>
          <div className="grid gap-3 p-4">
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50">
              <div className="flex items-center gap-2 border-b border-slate-300 px-4 py-2">
                <Package className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alimento selecionado</span>
              </div>
              {selectedFood && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white shadow-sm">
                    <FoodIcon food={selectedFood} className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">{selectedFood.nome}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{selectedFood.categoria} · {selectedFood.unidadeMedida}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="border-b border-slate-300 bg-slate-50 px-4 py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dados da compra</span>
              </div>
              <div className="divide-y divide-slate-100 px-4">
                <ConfirmRow label="Quantidade" value={`${form.quantidade || '—'} ${selectedFood?.unidadeMedida ?? ''}`} />
                <ConfirmRow label="Valor unitário" value={form.valorUnitario ? formatCurrency(Number(form.valorUnitario)) : '—'} />
                <ConfirmRow label="Qtd. mínima" value={form.quantidadeMinima ? `${form.quantidadeMinima} ${selectedFood?.unidadeMedida ?? ''}` : 'Automático'} />
                <ConfirmRow label="Lote" value={form.lote || '—'} />
                <ConfirmRow
                  label="Data de validade"
                  value={
                    form.possuiValidade && form.dataValidade
                      ? new Date(`${form.dataValidade}T12:00:00`).toLocaleDateString('pt-BR')
                      : 'Sem validade'
                  }
                />
                <ConfirmRow label="Fornecedor" value={form.fornecedorNome || '—'} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-indigo-400 bg-indigo-50 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Total da compra</p>
                <p className="mt-0.5 text-xs text-indigo-400">
                  {form.quantidade} {selectedFood?.unidadeMedida} × {form.valorUnitario ? formatCurrency(Number(form.valorUnitario)) : '—'}
                </p>
              </div>
              <strong className="font-['Sora',system-ui,sans-serif] text-xl font-black text-indigo-700">
                {formatCurrency(Number.isFinite(estimatedTotal) ? estimatedTotal : 0)}
              </strong>
            </div>
          </div>

          <div className="flex gap-2.5 border-t border-slate-300 bg-slate-50 px-4 py-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-600 transition-all hover:border-slate-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              disabled={isSaving || !selectedFood}
              onClick={handleSubmit}
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white transition-all hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSaving ? 'Registrando...' : 'Confirmar compra'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

/* ═════════════════════════════════════════════
   Main Component — MealsView
═════════════════════════════════════════════ */
export default function MealsView({
  currentRole,
  schools,
  mealManagements,
  onLoadSchoolPage,
  onSearchFoods,
  onCreateItem,
  onUpdateBudget,
}: MealsViewProps) {
  const [selectedManagementId, setSelectedManagementId] = useState(mealManagements[0]?.id ?? '')
  const [schoolPage, setSchoolPage] = useState(1)
  const [schoolPageData, setSchoolPageData] = useState<MealManagementsPagePayload | null>(null)
  const [isSchoolPageLoading, setIsSchoolPageLoading] = useState(false)
  const [schoolPageError, setSchoolPageError] = useState('')
  const selectedManagement = useMemo(
    () => mealManagements.find((m) => m.id === selectedManagementId) ?? mealManagements[0] ?? null,
    [mealManagements, selectedManagementId],
  )

  const [movementsModal, setMovementsModal] = useState<MovementsModalState | null>(null)
  const [menuCalendarModal, setMenuCalendarModal] = useState<MenuCalendarModalState | null>(null)
  const [stockOverviewModal, setStockOverviewModal] = useState<StockOverviewModalState | null>(null)
  const [stockDetail, setStockDetail] = useState<StockDetailState | null>(null)

  const canManagePurchases = currentRole?.code === 'ADMIN' || currentRole?.name === 'ADMIN'

  useEffect(() => {
    if (!mealManagements.length) return
    if (!mealManagements.some((m) => m.id === selectedManagementId)) {
      setSelectedManagementId(mealManagements[0].id)
    }
  }, [mealManagements, selectedManagementId])

  useEffect(() => {
    let isCurrent = true
    setIsSchoolPageLoading(true)
    setSchoolPageError('')

    onLoadSchoolPage(schoolPage, schoolSelectorPageSize)
      .then((data) => {
        if (!isCurrent) return
        setSchoolPageData(data)
        if (data.pagination.page !== schoolPage) setSchoolPage(data.pagination.page)
      })
      .catch(() => {
        if (!isCurrent) return
        setSchoolPageData(null)
        setSchoolPageError('Nao foi possivel carregar esta pagina.')
      })
      .finally(() => {
        if (isCurrent) setIsSchoolPageLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [onLoadSchoolPage, schoolPage])

  useEffect(() => {
    setMovementsModal(null)
    setMenuCalendarModal(null)
    setStockOverviewModal(null)
    setStockDetail(null)
  }, [selectedManagementId])

  const schoolById = useMemo(
    () => new Map([...schools, ...(schoolPageData?.schools ?? [])].map((s) => [s.id, s])),
    [schools, schoolPageData?.schools],
  )
  const schoolSelectorManagements = schoolPageData?.mealManagements ?? mealManagements.slice(0, schoolSelectorPageSize)
  const schoolSelectorPagination = schoolPageData?.pagination ?? {
    page: 1,
    limit: schoolSelectorPageSize,
    total: mealManagements.length,
    totalPages: Math.max(1, Math.ceil(mealManagements.length / schoolSelectorPageSize)),
  }
  const selectedSchool = selectedManagement ? schoolById.get(selectedManagement.escolaId) ?? null : null
  const selectedMenus = selectedManagement?.cardapios ?? []
  const selectedStock = selectedManagement?.estoqueMerenda ?? []
  const selectedStockPreview = selectedStock.slice(0, 4)
  const hiddenStockCount = Math.max(0, selectedStock.length - selectedStockPreview.length)

  const networkSummary = useMemo(() => {
    const schoolIds = new Set(mealManagements.map((m) => m.escolaId))
    return {
      schools: schoolIds.size,
      value: mealManagements.reduce((s, m) => s + m.orcamentoMensal.valorUtilizado, 0),
      available: mealManagements.reduce((s, m) => s + m.orcamentoMensal.valorDisponivel, 0),
      items: mealManagements.reduce((s, m) => s + m.resumo.totalItens, 0),
      alerts: mealManagements.reduce((s, m) => s + m.resumo.itensBaixoEstoque + m.resumo.itensVencidos, 0),
    }
  }, [mealManagements])

  if (!selectedManagement) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
        <div className="grid max-w-md gap-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl border-2 border-dashed border-slate-300">
            <Utensils className="h-7 w-7 text-slate-400" />
          </div>
          <h1 className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">
            Gestão de merenda não configurada
          </h1>
          <p className="text-sm leading-6 text-slate-500">
            Nenhuma escola possui gestão alimentar ativa para o mês de referência.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes mv-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mv-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes mv-scale-in {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .mv-page {
          animation: mv-fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .mv-section { animation: mv-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .mv-section:nth-child(1) { animation-delay: 0s; }
        .mv-section:nth-child(2) { animation-delay: 0.04s; }
        .mv-section:nth-child(3) { animation-delay: 0.08s; }
        .mv-section:nth-child(4) { animation-delay: 0.12s; }

        .mv-backdrop {
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(6px);
          animation: mv-fade-in 0.18s ease both;
        }
        .mv-modal {
          animation: mv-scale-in 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }

        /* Scrollbar styling for inner panels */
        .mv-scroll::-webkit-scrollbar { width: 4px; }
        .mv-scroll::-webkit-scrollbar-track { background: transparent; }
        .mv-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      <div className="mv-page mx-auto grid min-h-screen w-full max-w-[1680px] gap-4 bg-slate-100 px-[clamp(12px,2.5vw,40px)] py-5 pb-12 text-slate-900">

        {/* ══ HEADER BAR ══ */}
        <header className="mv-section flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 shadow-sm">
              <Utensils className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Gestão Alimentar</p>
              <h1 className="font-['Sora',system-ui,sans-serif] text-lg font-black leading-tight text-slate-950">
                Merenda Escolar
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
              {selectedManagement.mesReferencia}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
                canManagePurchases
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-300 bg-slate-100 text-slate-500'
              }`}
            >
              {canManagePurchases ? <ShieldCheck className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {canManagePurchases ? 'Administrador' : 'Somente leitura'}
            </span>
          </div>
        </header>

        {/* ══ NETWORK METRICS ══ */}
        <div className="mv-section grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Building2 className="h-4 w-4" />}
            label="Escolas ativas"
            value={String(networkSummary.schools)}
            detail="Com gestão alimentar este mês"
            iconBg="bg-blue-50 text-blue-600"
            iconBorder="border-blue-400"
          />
          <MetricCard
            icon={<Wallet className="h-4 w-4" />}
            label="Gasto na rede"
            value={formatCurrency(networkSummary.value)}
            detail={`${formatCurrency(networkSummary.available)} disponível`}
            iconBg="bg-indigo-50 text-indigo-600"
            iconBorder="border-indigo-400"
          />
          <MetricCard
            icon={<PackageCheck className="h-4 w-4" />}
            label="Lotes em estoque"
            value={String(networkSummary.items)}
            detail="Registros ativos na rede"
            iconBg="bg-violet-50 text-violet-600"
            iconBorder="border-violet-400"
          />
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Alertas de estoque"
            value={String(networkSummary.alerts)}
            detail={networkSummary.alerts > 0 ? 'Itens vencidos ou em falta' : 'Tudo em ordem 👍'}
            iconBg={networkSummary.alerts > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}
            iconBorder={networkSummary.alerts > 0 ? 'border-amber-400' : 'border-emerald-400'}
            highlight={networkSummary.alerts > 0}
          />
        </div>

        {/* ══ MAIN 3-COL LAYOUT ══ */}
        <div className="mv-section grid items-start gap-4 xl:items-stretch xl:grid-cols-[300px_minmax(0,1fr)_420px] 2xl:grid-cols-[320px_minmax(0,1fr)_440px]">

          {/* ── LEFT: SCHOOL SELECTOR ── */}
          <aside className="grid min-w-0 gap-4 xl:sticky xl:top-4 xl:h-full">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm xl:h-full">
              {/* Centered header */}
              <div className="border-b border-slate-300 bg-slate-50 px-4 py-4 text-center">
                <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-indigo-600">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Escolas</p>
                <h2 className="mt-0.5 text-sm font-black text-slate-800">Selecione a unidade</h2>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  {mealManagements.length} escola{mealManagements.length !== 1 ? 's' : ''} disponível{mealManagements.length !== 1 ? 'is' : ''}
                </p>
              </div>

              <div className="mv-scroll grid max-h-[calc(100vh-280px)] gap-2 overflow-y-auto p-3 xl:min-h-0 xl:flex-1">
                {schoolPageError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-center text-xs font-bold text-red-600">
                    {schoolPageError}
                  </div>
                )}
                {isSchoolPageLoading && (
                  <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-400">
                    Carregando escolas...
                  </div>
                )}
                {schoolSelectorManagements.map((management) => {
                  const school = schoolById.get(management.escolaId)
                  return (
                    <SchoolMealCard
                      key={management.id}
                      management={management}
                      schoolName={school?.name ?? 'Escola'}
                      selected={selectedManagement.id === management.id}
                      onSelect={() => setSelectedManagementId(management.id)}
                    />
                  )
                })}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-slate-300 bg-slate-50 px-3 py-2">
                <button
                  type="button"
                  disabled={isSchoolPageLoading || schoolSelectorPagination.page <= 1}
                  onClick={() => setSchoolPage((current) => Math.max(1, current - 1))}
                  className="rounded-sm border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 transition-all hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-[11px] font-bold text-slate-400">
                  {schoolSelectorPagination.page}/{schoolSelectorPagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={isSchoolPageLoading || schoolSelectorPagination.page >= schoolSelectorPagination.totalPages}
                  onClick={() => setSchoolPage((current) => Math.min(schoolSelectorPagination.totalPages, current + 1))}
                  className="rounded-sm border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 transition-all hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Proxima
                </button>
              </div>
            </section>
          </aside>

          {/* ── CENTER: MENUS + STOCK ── */}
          <main className="grid min-w-0 content-start gap-4">

            {/* School info bar */}
            <section className="overflow-hidden rounded-xl border border-slate-300 bg-white px-5 py-4 shadow-sm xl:h-[118px]">
              <div className="grid h-full min-w-0 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(330px,390px)]">
                <div className="min-w-0 self-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Escola selecionada</p>
                  <h2 className="mt-0.5 truncate font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-950">
                    {selectedSchool?.name ?? 'Escola selecionada'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedManagement.mesReferencia} &middot; {selectedManagement.estoqueMerenda.length} lotes em estoque
                  </p>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-2 self-center text-center">
                  <Stat label="Lotes" value={String(selectedManagement.resumo.totalItens)} />
                  <Stat label="Comprado" value={formatCurrency(selectedManagement.resumo.valorTotalComprado)} />
                </div>
              </div>
            </section>

            {/* Alert banner */}
            <AlertBanner
              lowStock={selectedManagement.resumo.itensBaixoEstoque}
              expired={selectedManagement.resumo.itensVencidos}
            />

            {/* MENUS section */}
            <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm xl:h-[334px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500">
                    <ClipboardList className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Cardápios</p>
                    <h2 className="text-sm font-black text-slate-800">Planejamento alimentar da escola</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMenuCalendarModal({
                      management: selectedManagement,
                      schoolName: selectedSchool?.name ?? 'Escola',
                    })
                  }
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-400 bg-white px-3 text-[11px] font-black uppercase tracking-wider text-amber-700 transition-all hover:bg-amber-100 hover:active:bg-amber-200"
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendário do mês
                </button>
              </div>

              <div className="mv-scroll grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2.5 overflow-y-auto p-4 xl:max-h-[266px]">
                {selectedMenus.length > 0 ? (
                  selectedMenus.map((menu) => (
                    <MenuCard key={menu.id} menu={menu} foods={selectedManagement.alimentosCadastrados} />
                  ))
                ) : (
                  <div className="col-span-full grid min-h-[120px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                    <div>
                      <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-400">Nenhum cardápio cadastrado</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
            {/* STOCK section */}
            <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm xl:h-[330px]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-50 px-5 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600">
                    <PackageCheck className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Estoque</p>
                    <h2 className="truncate text-sm font-black text-slate-800">
                      {selectedStock.length} lote{selectedStock.length !== 1 ? 's' : ''} armazenado{selectedStock.length !== 1 ? 's' : ''}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setStockOverviewModal({
                      management: selectedManagement,
                      schoolName: selectedSchool?.name ?? 'Escola',
                    })
                  }
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-violet-400 bg-white px-3 text-[11px] font-black uppercase tracking-wider text-violet-700 transition-all hover:bg-violet-200 hover:active:bg-violet-300"
                >
                  <PackageCheck className="h-4 w-4" />
                  Ver estoque completo
                </button>
              </div>

              <div className="mv-scroll grid gap-2 overflow-y-auto p-3 sm:grid-cols-2 xl:max-h-[270px]">
                {selectedStockPreview.map((stock) => {
                  const item = selectedManagement.itensMerenda.find((i) => i.id === stock.itemMerendaId)
                  const food = selectedManagement.alimentosCadastrados.find((f) => f.id === stock.alimentoId)
                  return (
                    <StockCompactCard
                      key={stock.id}
                      stock={stock}
                      food={food}
                      supplierName={item?.fornecedor.nome}
                      onClick={() => setStockDetail({ stock, food, supplierName: item?.fornecedor.nome })}
                    />
                  )
                })}
                {hiddenStockCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setStockOverviewModal({
                        management: selectedManagement,
                        schoolName: selectedSchool?.name ?? 'Escola',
                      })
                    }
                    className="grid h-[76px] place-items-center rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 text-center text-sm font-black text-violet-700 transition-all hover:border-violet-400 hover:bg-violet-100"
                  >
                    +{hiddenStockCount} lote{hiddenStockCount !== 1 ? 's' : ''} no estoque completo
                  </button>
                )}
                {selectedStock.length === 0 && (
                  <div className="col-span-full grid min-h-[100px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                    <div>
                      <PackageCheck className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-400">Nenhum item em estoque</p>
                      <p className="mt-1 text-xs text-slate-400">Registre uma compra para adicionar itens</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>

          {/* ── RIGHT: PURCHASE + BUDGET ── */}
          <aside className="grid min-w-0 content-start gap-4 xl:sticky xl:top-4">
            {canManagePurchases ? (
              <PurchaseForm
                management={selectedManagement}
                onSearchFoods={onSearchFoods}
                onCreateItem={onCreateItem}
              />
            ) : (
              <section className="flex flex-col items-start gap-3 rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-slate-100">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-900">
                    Registro de compras restrito
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Apenas administradores podem registrar compras e alterar o estoque.
                  </p>
                </div>
              </section>
            )}

            <BudgetPanel
              management={selectedManagement}
              schoolName={selectedSchool?.name ?? 'Rede municipal'}
              canEdit={canManagePurchases}
              onUpdateBudget={onUpdateBudget}
              onShowMovements={() =>
                setMovementsModal({
                  management: selectedManagement,
                  schoolName: selectedSchool?.name ?? 'Escola',
                })
              }
            />
          </aside>
        </div>
      </div>

      {/* ══ MODALS ══ */}
      {movementsModal && (
        <MovementsModal
          management={movementsModal.management}
          schoolName={movementsModal.schoolName}
          onClose={() => setMovementsModal(null)}
        />
      )}

      {menuCalendarModal && (
        <MenuCalendarModal
          management={menuCalendarModal.management}
          schoolName={menuCalendarModal.schoolName}
          onClose={() => setMenuCalendarModal(null)}
        />
      )}

      {stockOverviewModal && (
        <StockOverviewModal
          management={stockOverviewModal.management}
          schoolName={stockOverviewModal.schoolName}
          onClose={() => setStockOverviewModal(null)}
        />
      )}

      {stockDetail && (
        <StockDetailModal
          stock={stockDetail.stock}
          food={stockDetail.food}
          supplierName={stockDetail.supplierName}
          onClose={() => setStockDetail(null)}
        />
      )}
    </>
  )
}
