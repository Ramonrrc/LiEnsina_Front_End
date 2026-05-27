import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { z } from 'zod'
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
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coffee,
  Drumstick,
  Egg,
  Fish,
  History,
  Info,
  Milk,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Soup,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Utensils,
  UtensilsCrossed,
  Wallet,
  Wheat,
  X,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import DateInput from '../components/ui/date-input'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { FieldMessage, fieldStateClass, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'
import type {
  AddMealFoodRequestToStockPayload,
  CreateMealFoodRequestPayload,
  CreateMealItemPayload,
  CreateMealManagementPayload,
  FoodRequestStatus,
  FoodRequestUrgency,
  MealBudgetStatus,
  MealFood,
  MealFoodRequest,
  MealItem,
  MealManagement,
  MealManagementsPagePayload,
  MealMenu,
  MealRequestHistory,
  MealStockItem,
  MealStockStatus,
  MealUnit,
  Role,
  School,
  UpdateMealBudgetPayload,
  UpdateMealFoodRequestPayload,
  UserAccount,
} from '../types'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface MealsViewProps {
  currentUser: UserAccount
  currentRole: Role | null
  schools: School[]
  mealManagements: MealManagement[]
  foodRequests: MealFoodRequest[]
  mealRequestHistory: MealRequestHistory[]
  onLoadSchoolPage: (page: number, limit: number) => Promise<MealManagementsPagePayload>
  onSearchFoods: (query: string, limit?: number) => Promise<MealFood[]>
  onCreateFoodRequest: (draft: CreateMealFoodRequestPayload) => Promise<void>
  onCreateManagement: (draft: CreateMealManagementPayload) => Promise<MealManagement>
  onAddFoodRequestToStock: (id: string, draft: AddMealFoodRequestToStockPayload) => Promise<void>
  onCreateItem: (managementId: string, draft: CreateMealItemPayload) => Promise<void>
  onUpdateBudget: (managementId: string, draft: UpdateMealBudgetPayload) => Promise<void>
  onDeleteFoodRequest: (id: string) => Promise<void>
  onUpdateFoodRequest: (id: string, draft: UpdateMealFoodRequestPayload) => Promise<void>
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

type FoodRequestFormState = {
  itemName: string
  quantity: string
  unit: MealUnit
  unitPrice: string
  reason: string
  urgencyLevel: FoodRequestUrgency
  expirationDate: string
  observation: string
}
type FoodRequestFormField = keyof FoodRequestFormState

const mealUnitOptions: Array<CompactSelectOption<MealUnit>> = [
  { value: 'KG', label: 'kg' },
  { value: 'G', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'ML', label: 'ml' },
  { value: 'UNIT', label: 'unidade' },
  { value: 'BOX', label: 'caixa' },
  { value: 'PACKAGE', label: 'pacote' },
  { value: 'DOZEN', label: 'dúzia' },
]

const foodRequestStatusLabels: Record<FoodRequestStatus, string> = {
  PENDING_NUTRITIONIST_APPROVAL: 'Aguardando nutricionista',
  APPROVED_BY_NUTRITIONIST: 'Aprovado',
  REJECTED_BY_NUTRITIONIST: 'Reprovado',
  NEEDS_ADJUSTMENT: 'Necessita ajuste',
  PENDING_PURCHASE: 'Aguardando compra',
  PURCHASED: 'Comprado',
  ADDED_TO_STOCK: 'No estoque',
  CANCELLED: 'Cancelado',
}

const foodRequestUrgencyLabels: Record<FoodRequestUrgency, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

const foodRequestUrgencyOptions: Array<CompactSelectOption<FoodRequestUrgency>> = (
  Object.keys(foodRequestUrgencyLabels) as FoodRequestUrgency[]
).map((urgency) => ({ value: urgency, label: foodRequestUrgencyLabels[urgency] }))

const foodRequestSchema = z.object({
  itemName: z.string().trim().min(1, 'Informe o alimento.'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero.'),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'UNIT', 'BOX', 'PACKAGE', 'DOZEN']),
  unitPrice: z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim())
    .refine((value) => !value || (Number.isFinite(parseDecimalInput(value)) && parseDecimalInput(value) >= 0), 'Valor unitário deve ser maior que zero.'),
  reason: z.string().trim().min(1, 'Informe o motivo da solicitação.'),
  urgencyLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  expirationDate: z.string().trim().optional(),
  observation: z.string().trim().optional(),
})

type MovementsModalState = { management: MealManagement; schoolName: string }
type StockOverviewModalState = { management: MealManagement; schoolName: string }

type MenuCalendarCell = {
  key: string
  day: number | null
  weekday: number | null
  menus: MealMenu[]
}

type MenuCalendarWeekDay = {
  key: string
  day: number
  weekday: number
  dayShort: string
  dayName: string
  dateLabel: string
  menus: MealMenu[]
}

type MenuCalendarWeek = {
  key: string
  weekNumber: number
  label: string
  dateRange: string
  days: MenuCalendarWeekDay[]
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

type StockStatusKind = 'ok' | 'low' | 'expired'

type StockDisplayRow = {
  stock: MealStockItem
  food?: MealFood
  item?: MealItem
  category: string
  lot: string
  expiresAt: string | null
  unitPrice: number
  status: StockStatusKind
}

type WizardStep = 1 | 2 | 3
type MealTab = 'stock' | 'calendar' | 'requests'

/* ─────────────────────────────────────────────
   Constants & Maps
───────────────────────────────────────────── */
const foodIcons: Record<string, LucideIcon> = {
  apple: Apple, banana: Banana, bean: Bean, beef: Beef, carrot: Carrot,
  drumstick: Drumstick, egg: Egg, fish: Fish, milk: Milk, soup: Soup,
  utensils: Utensils, wheat: Wheat,
}

const foodImageAliases: Record<string, string> = {
  'arroz branco': 'Arroz.png', 'banana prata': 'Banana.png',
  'feijao carioca': 'Feijao.png', 'feijão carioca': 'Feijao.png',
  'leite integral': 'Leite.png', 'maca nacional': 'Maca.png',
  'frango desfiado': 'Frango Desfiado.png', 'hamburguer artesanal': 'Hamburguer Artesanal.png',
  iogurte: 'Iorgute.png', 'maçã nacional': 'Maca.png',
}

const shiftLabels: Record<MealMenu['turno'], string> = {
  MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite', INTEGRAL: 'Integral',
}

const shiftColors: Record<MealMenu['turno'], string> = {
  MANHA: 'bg-amber-50 text-amber-700 border-amber-300',
  TARDE: 'bg-sky-50 text-sky-700 border-sky-300',
  NOITE: 'bg-violet-50 text-violet-700 border-violet-300',
  INTEGRAL: 'bg-indigo-50 text-indigo-700 border-indigo-300',
}

const weekDayShortLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const weekDayFullLabels = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const mealTypeOrder: Record<MealMenu['tipoRefeicao'], number> = {
  CAFE_DA_MANHA: 1, LANCHE: 2, ALMOCO: 3, JANTAR: 4,
}

const menuMealTypeDefs: Array<{
  key: MealMenu['tipoRefeicao']
  label: string
  shortLabel: string
  icon: LucideIcon
  iconClass: string
  surfaceClass: string
}> = [
  { key: 'CAFE_DA_MANHA', label: 'Café da manhã', shortLabel: 'Café', icon: Coffee, iconClass: 'bg-amber-100 text-amber-700', surfaceClass: 'bg-amber-50 border-amber-300 text-amber-700' },
  { key: 'ALMOCO', label: 'Almoço', shortLabel: 'Almoço', icon: UtensilsCrossed, iconClass: 'bg-violet-100 text-violet-700', surfaceClass: 'bg-violet-50 border-violet-300 text-violet-700' },
  { key: 'LANCHE', label: 'Lanche', shortLabel: 'Lanche', icon: Apple, iconClass: 'bg-emerald-100 text-emerald-700', surfaceClass: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
  { key: 'JANTAR', label: 'Jantar', shortLabel: 'Jantar', icon: Soup, iconClass: 'bg-indigo-100 text-indigo-700', surfaceClass: 'bg-indigo-50 border-indigo-300 text-indigo-700' },
]

const defaultSupplier = 'Distribuidora Alimentos Brasil'
const schoolSelectorPageSize = 5
const foodSuggestionLimit = 5

/* ─────────────────────────────────────────────
   Formatters
───────────────────────────────────────────── */
function formatMonthReference(monthReference: string) {
  const [year, month] = monthReference.split('-').map(Number)
  if (!year || !month) return monthReference
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1, 12))
}

function formatMonthReferenceShort(monthReference: string) {
  const [year, month] = monthReference.split('-').map(Number)
  if (!year || !month) return monthReference
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, 1, 12))
    .replace('.', '')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

function formatStockDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

function formatRequestDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

/* ─────────────────────────────────────────────
   Helper functions
───────────────────────────────────────────── */
function getWeekdayIndex(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[_-]+/g, ' ').toLowerCase()
  if (normalized.includes('domingo')) return 0
  if (normalized.includes('segunda')) return 1
  if (normalized.includes('terca')) return 2
  if (normalized.includes('quarta')) return 3
  if (normalized.includes('quinta')) return 4
  if (normalized.includes('sexta')) return 5
  if (normalized.includes('sabado')) return 6
  return -1
}

function normalizeFoodSearchText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase()
}

function findFoodByName(foods: MealFood[], name: string) {
  const normalizedName = normalizeFoodSearchText(name)
  if (!normalizedName) return null
  return foods.find((food) => normalizeFoodSearchText(food.nome) === normalizedName) ?? null
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
    byWeekday.set(weekday, current.sort((a, b) => mealTypeOrder[a.tipoRefeicao] - mealTypeOrder[b.tipoRefeicao]))
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
    cells.push({ key: `${monthReference}-${day}`, day, weekday, menus: byWeekday.get(weekday) ?? [] })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, day: null, weekday: null, menus: [] })
  }
  return cells
}

function getMenuDate(monthReference: string, day: number) {
  const [year, month] = monthReference.split('-').map(Number)
  if (!year || !month) return null
  return new Date(year, month - 1, day, 12)
}

function formatMenuDate(monthReference: string, day: number, mode: 'short' | 'long' = 'short') {
  const date = getMenuDate(monthReference, day)
  if (!date) return String(day)
  return new Intl.DateTimeFormat('pt-BR', mode === 'short'
    ? { day: '2-digit', month: '2-digit' }
    : { day: '2-digit', month: 'long' }).format(date)
}

function buildMenuCalendarWeeks(monthReference: string, menus: MealMenu[]): MenuCalendarWeek[] {
  const cells = buildMenuMonthCells(monthReference, menus)
  const weeks: MenuCalendarWeek[] = []

  for (let index = 0; index < cells.length; index += 7) {
    const weekCells = cells.slice(index, index + 7)
    const days = weekCells
      .filter((cell): cell is MenuCalendarCell & { day: number; weekday: number } =>
        Boolean(cell.day) && cell.weekday !== null && cell.weekday >= 1 && cell.weekday <= 5,
      )
      .map((cell) => ({
        key: cell.key,
        day: cell.day,
        weekday: cell.weekday,
        dayShort: weekDayShortLabels[cell.weekday],
        dayName: weekDayFullLabels[cell.weekday],
        dateLabel: formatMenuDate(monthReference, cell.day),
        menus: [...cell.menus].sort((a, b) => mealTypeOrder[a.tipoRefeicao] - mealTypeOrder[b.tipoRefeicao]),
      }))

    if (days.length === 0) continue
    const weekNumber = weeks.length + 1
    const firstDay = days[0]
    const lastDay = days[days.length - 1]
    weeks.push({
      key: `${monthReference}-week-${weekNumber}`,
      weekNumber,
      label: `Semana ${weekNumber}`,
      dateRange: `${formatMenuDate(monthReference, firstDay.day)} a ${formatMenuDate(monthReference, lastDay.day)}`,
      days,
    })
  }

  return weeks
}

function getPriorityStockStatus(current: MealStockStatus, next: MealStockStatus) {
  const priority: Record<MealStockStatus, number> = { DISPONIVEL: 1, BAIXO: 2, DESCARTADO: 3, VENCIDO: 4 }
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
      rows.set(key, { key, food, name: stock.nomeAlimento, unit: stock.unidadeMedida, totalQuantity: stock.quantidadeAtual, minimumQuantity: stock.quantidadeMinima, suppliers: supplierName ? [supplierName] : [], expiryDates: stock.dataValidade ? [stock.dataValidade] : [], status: stock.status, lotCount: 1 })
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

function getStockStatusKind(stock: MealStockItem): StockStatusKind {
  if (stock.status === 'VENCIDO' || stock.status === 'DESCARTADO') return 'expired'
  if (stock.status === 'BAIXO' || stock.quantidadeAtual <= 0) return 'low'
  return 'ok'
}

function buildStockDisplayRows(management: MealManagement): StockDisplayRow[] {
  return management.estoqueMerenda.map((stock) => {
    const food = management.alimentosCadastrados.find((item) => item.id === stock.alimentoId)
    const item = management.itensMerenda.find((mealItem) => mealItem.id === stock.itemMerendaId)
    return {
      stock,
      food,
      item,
      category: item?.categoria ?? food?.categoria ?? 'Sem categoria',
      lot: item?.lote ?? 'Sem lote',
      expiresAt: stock.dataValidade ?? item?.dataValidade ?? null,
      unitPrice: item?.valorUnitario ?? 0,
      status: getStockStatusKind(stock),
    }
  })
}

function parseDecimalInput(value: string) {
  const normalized = value.trim().replace(/[^\d,.-]/g, '')
  return Number(normalized.includes(',') ? normalized.replace(/\./g, '').replace(',', '.') : normalized)
}

/* ─────────────────────────────────────────────
   Color helpers  (border mínimo -300)
───────────────────────────────────────────── */
function budgetTone(status: MealBudgetStatus): { badge: string; bar: string; text: string } {
  if (status === 'ULTRAPASSADO') return { badge: 'bg-red-50 text-red-700 border-red-300', bar: 'bg-red-500', text: 'text-red-600' }
  if (status === 'EM_ALERTA')   return { badge: 'bg-amber-50 text-amber-700 border-amber-300', bar: 'bg-amber-500', text: 'text-amber-600' }
  return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-300', bar: 'bg-emerald-500', text: 'text-emerald-600' }
}

function stockTone(status: MealStockStatus): { badge: string; bar: string; accent: string; iconBg: string } {
  if (status === 'VENCIDO' || status === 'DESCARTADO')
    return { badge: 'bg-red-50 text-red-700 border-red-300', bar: 'bg-red-500', accent: 'border-l-red-400', iconBg: 'bg-red-50 border-red-300' }
  if (status === 'BAIXO')
    return { badge: 'bg-amber-50 text-amber-700 border-amber-300', bar: 'bg-amber-400', accent: 'border-l-amber-400', iconBg: 'bg-amber-50 border-amber-300' }
  return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-300', bar: 'bg-emerald-500', accent: 'border-l-slate-300', iconBg: 'bg-slate-50 border-slate-300' }
}

function statusLabel(status: MealStockStatus): string {
  if (status === 'VENCIDO')    return 'Vencido'
  if (status === 'DESCARTADO') return 'Descartado'
  if (status === 'BAIXO')      return 'Baixo'
  return 'Normal'
}

function foodRequestStatusTone(status: FoodRequestStatus) {
  if (['APPROVED_BY_NUTRITIONIST', 'ADDED_TO_STOCK', 'PURCHASED'].includes(status))
    return 'bg-emerald-50 text-emerald-700 border-emerald-300'
  if (['REJECTED_BY_NUTRITIONIST', 'CANCELLED'].includes(status))
    return 'bg-red-50 text-red-700 border-red-300'
  if (status === 'NEEDS_ADJUSTMENT')
    return 'bg-amber-50 text-amber-700 border-amber-300'
  return 'bg-indigo-50 text-indigo-700 border-indigo-300'
}

function foodRequestUrgencyTone(urgency: FoodRequestUrgency) {
  if (urgency === 'URGENT') return 'bg-red-50 text-red-700 border-red-300'
  if (urgency === 'HIGH')   return 'bg-orange-50 text-orange-700 border-orange-300'
  if (urgency === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-300'
  return 'bg-slate-50 text-slate-600 border-slate-300'
}

/* ─────────────────────────────────────────────
   Food image helpers
───────────────────────────────────────────── */
function normalizeFoodImageKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase()
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
      <img src={source} alt={food.nome} className={`${className} object-contain`}
        loading="lazy" draggable={false} onError={() => setImageFailed(true)} />
    )
  }
  return <Icon className={className} />
}

/* ─────────────────────────────────────────────
   Skeleton
───────────────────────────────────────────── */
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />
}

/* ─────────────────────────────────────────────
   Design tokens — inputs
───────────────────────────────────────────── */
function createInitialForm(foodId = 0): MealFormState {
  return { alimentoId: foodId, quantidade: '', valorUnitario: '', fornecedorNome: defaultSupplier, dataValidade: '', lote: '', quantidadeMinima: '', possuiValidade: true }
}

// 1px border, mínimo slate-300
const inputCls = [
  'min-h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5',
  'text-sm font-medium text-slate-900 outline-none transition-all',
  'placeholder:text-slate-400',
  'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100',
  'hover:border-slate-400',
].join(' ')

/* ─────────────────────────────────────────────
   Field
───────────────────────────────────────────── */
function Field({ label, hint, error, children, className }: {
  label: string; hint?: string; error?: string | null; children: ReactNode; className?: string
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className ?? ''}`}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        {label}
        {hint && (
          <span className="group relative cursor-default">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {hint}
            </span>
          </span>
        )}
      </span>
      {children}
      <FieldMessage hint={hint} error={error} />
    </label>
  )
}

/* ─────────────────────────────────────────────
   StatCard
───────────────────────────────────────────── */
function StatCard({ label, value, tone = 'text-slate-900', sub }: {
  label: string; value: string; tone?: string; sub?: string
}) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white px-3.5 py-3">
      <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <strong className={`mt-0.5 block truncate text-sm font-bold ${tone}`}>{value}</strong>
      {sub && <span className="block truncate text-[11px] text-slate-400">{sub}</span>}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Zod schemas
───────────────────────────────────────────── */
const requiredMealText = (message: string) =>
  z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim().min(1, message))

const positiveDecimalText = (message: string) =>
  requiredMealText(message).refine((value) => Number.isFinite(parseDecimalInput(value)) && parseDecimalInput(value) > 0, message)

const optionalPositiveDecimalText = (message: string) =>
  z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim())
    .refine((value) => !value || (Number.isFinite(parseDecimalInput(value)) && parseDecimalInput(value) >= 0), message)

const budgetFormSchema = z.object({ valorLimite: positiveDecimalText('Informe um valor maior que zero.') })

const purchaseFormSchema = z.object({
  alimentoId: z.number().min(1, 'Selecione um alimento para registrar a compra.'),
  quantidade: positiveDecimalText('Informe uma quantidade maior que zero.'),
  valorUnitario: positiveDecimalText('Informe um valor unitário maior que zero.'),
  fornecedorNome: requiredMealText('Informe o nome do fornecedor.'),
  dataValidade: z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim()),
  lote: z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim().max(80, 'Lote deve ter no máximo 80 caracteres.')),
  quantidadeMinima: optionalPositiveDecimalText('Quantidade mínima deve ser zero ou maior.'),
  possuiValidade: z.boolean(),
}).superRefine((value, context) => {
  if (value.possuiValidade && !/^\d{4}-\d{2}-\d{2}$/.test(value.dataValidade)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['dataValidade'], message: 'Informe a data de validade do alimento.' })
  }
})

type BudgetFormField = keyof z.infer<typeof budgetFormSchema>
type PurchaseFormField = keyof z.infer<typeof purchaseFormSchema>

/* ─────────────────────────────────────────────
   Modal
───────────────────────────────────────────── */
function Modal({ id, title, subtitle, subtitlePlacement = 'inline', onClose, children, maxWidth = '680px' }: {
  id: string
  title: string
  subtitle?: string
  subtitlePlacement?: 'inline' | 'below'
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const modal = (
    <div role="presentation" onMouseDown={onClose}
      className="mv-backdrop fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto px-4 py-4 sm:items-center sm:py-8">
      <div role="dialog" aria-modal="true" aria-labelledby={id} onMouseDown={(e) => e.stopPropagation()}
        className="mv-modal flex max-h-[calc(100svh-32px)] w-full flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl sm:max-h-[calc(100svh-64px)]"
        style={{ maxWidth }}>
        <div className={`flex shrink-0 items-center justify-between gap-4 bg-white px-6 ${subtitle && subtitlePlacement === 'below' ? 'pb-2 pt-4' : 'border-b border-slate-200 py-4'}`}>
          <div className="flex items-center gap-3 min-w-0">
            {subtitle && subtitlePlacement === 'inline' && (
              <span className="shrink-0 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
                {subtitle}
              </span>
            )}
            <h2 id={id} className="truncate text-base font-bold text-slate-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-400 transition-all hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        {subtitle && subtitlePlacement === 'below' && (
          <div className="flex shrink-0 border-b border-slate-200 bg-white px-6 pb-3">
            <span className="max-w-full truncate rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
              {subtitle}
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  )

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}

/* ─────────────────────────────────────────────
   StockAttentionBadge
───────────────────────────────────────────── */
function StockAttentionBadge({ lowStock, expired }: { lowStock: number; expired: number }) {
  if (lowStock === 0 && expired === 0) return null

  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
      {expired > 0 && (
        <span>{expired} vencido{expired !== 1 ? 's' : ''}</span>
      )}
      {expired > 0 && lowStock > 0 && <span className="text-amber-500">•</span>}
      {lowStock > 0 && (
        <span>{lowStock} baixo{lowStock !== 1 ? 's' : ''}</span>
      )}
    </span>
  )
}

/* ─────────────────────────────────────────────
   TabBar
───────────────────────────────────────────── */
function TabBar({ tabs, active, onChange }: {
  tabs: Array<{ id: MealTab; label: string; icon: ReactNode; count?: number }>
  active: MealTab
  onChange: (tab: MealTab) => void
}) {
  return (
    <div className="flex w-full gap-1 rounded-xl border border-slate-300 bg-slate-100 p-1">
      {tabs.map((tab) => (
        <motion.button key={tab.id} type="button" onClick={() => onChange(tab.id)}
          whileTap={{ scale: 0.985 }}
          className={[
            'relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150',
            active === tab.id
              ? 'text-white'
              : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-700',
          ].join(' ')}>
          {active === tab.id && (
            <motion.span
              layoutId="meal-active-tab"
              className="absolute inset-0 rounded-lg bg-indigo-600 shadow-sm ring-1 ring-slate-300"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span className={`relative z-10 ${active === tab.id ? 'text-white' : 'text-slate-400'}`}>{tab.icon}</span>
          <span className="relative z-10 hidden sm:inline">{tab.label}</span>
          {typeof tab.count === 'number' && tab.count > 0 && (
            <span className={`relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
              {tab.count}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   HeaderSchoolControl
───────────────────────────────────────────── */
function HeaderSchoolControl({
  selectedManagement,
  selectedSchool,
  schoolSelectorOptions,
  schoolSelectorPagination,
  canChangeSchool,
  isSchoolPageLoading,
  schoolPageError,
  onChangeManagement,
  onPrevPage,
  onNextPage,
}: {
  selectedManagement: MealManagement
  selectedSchool: School | null
  schoolSelectorOptions: CompactSelectOption[]
  schoolSelectorPagination: { page: number; totalPages: number }
  canChangeSchool: boolean
  isSchoolPageLoading: boolean
  schoolPageError: string
  onChangeManagement: (id: string) => void
  onPrevPage: () => void
  onNextPage: () => void
}) {
  return (
    <div className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-500 shadow-sm">
      <Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
      <span className="hidden shrink-0 text-slate-400 lg:inline">Escola vinculada</span>
      {canChangeSchool ? (
        <CompactSelect
          value={selectedManagement.id}
          options={schoolSelectorOptions}
          onChange={onChangeManagement}
          ariaLabel="Selecionar escola vinculada"
          disabled={isSchoolPageLoading}
          wrapperClassName="w-[min(42vw,220px)]"
          className={[
            '!h-5 !min-h-0 !rounded-none !border-0 !bg-transparent !px-0 !shadow-none',
            '!gap-1 !text-[11px] !font-bold hover:!border-0 hover:!shadow-none',
            '[&_span]:!text-[11px] [&_span]:!font-bold [&_svg]:!h-3 [&_svg]:!w-3',
            '[&>span:last-child]:!hidden',
          ].join(' ')}
          dropdownWidth="trigger"
          dropdownOffset={4}
        />
      ) : (
        <span className="max-w-[220px] truncate text-[11px] font-bold text-slate-700">{selectedSchool?.name ?? 'Escola'}</span>
      )}
      {canChangeSchool && (
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" disabled={isSchoolPageLoading || schoolSelectorPagination.page <= 1} onClick={onPrevPage}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition-all hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Página anterior de escolas">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button type="button" disabled={isSchoolPageLoading || schoolSelectorPagination.page >= schoolSelectorPagination.totalPages} onClick={onNextPage}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 transition-all hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Próxima página de escolas">
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
      {schoolPageError && (
        <span className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600">
          Falha ao carregar
        </span>
      )}
    </div>
  )
}

function StockStatusBadge({ status }: { status: StockStatusKind }) {
  const map: Record<StockStatusKind, { label: string; cls: string }> = {
    ok: { label: 'Em estoque', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
    low: { label: 'Baixo', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
    expired: { label: 'Vencido / em falta', cls: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
  }
  const tone = map[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone.cls}`}>
      {tone.label}
    </span>
  )
}

function MetricCard({ icon, label, value, sub, accentClass, iconClass }: {
  icon: ReactNode
  label: string
  value: string
  sub: string
  accentClass: string
  iconClass: string
}) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-300 bg-white px-5 py-4 transition-shadow hover:shadow-sm">
      <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accentClass}`} />
      <div className="flex items-start gap-3 pl-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-0.5 text-lg font-bold leading-tight text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{sub}</p>
        </div>
      </div>
    </article>
  )
}

function StockBudgetOverview({ management, networkSpent }: {
  management: MealManagement
  networkSpent: number
}) {
  const budget = management.orcamentoMensal
  const percent = Math.min(100, budget.percentualUtilizado)

  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Orçamento mensal</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
            {formatCurrency(budget.valorLimite)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-medium text-emerald-600">{formatCurrency(budget.valorDisponivel)}</span>{' '}
            disponível após movimentações de compras
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5" />
          Gasto na rede: {formatCurrency(networkSpent)}
        </div>
      </div>
      <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-slate-300/60">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${percent}%` }} />
      </div>
    </section>
  )
}

function StockItemsPanel({ rows, onOpenAll, onSelect }: {
  rows: StockDisplayRow[]
  onOpenAll: () => void
  onSelect: (row: StockDisplayRow) => void
}) {
  return (
    <section className="rounded-2xl border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Itens armazenados</h2>
          <p className="text-xs text-slate-500">Insumos disponíveis para preparar os pratos do cardápio</p>
        </div>
        <button type="button" onClick={onOpenAll}
          className="text-sm font-medium border border-indigo-600 py-1 px-4 rounded-lg text-indigo-700 hover:-translate-y-0.5 hover:text-indigo-800 hover:bg-indigo-100/80 transition">
          Ver tudo →
        </button>
      </div>
      <ul className="divide-y divide-slate-200">
        {rows.slice(0, 5).map((row) => (
          <li key={row.stock.id}>
            <button type="button" onClick={() => onSelect(row)}
              className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-slate-50/80">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  {row.food ? <FoodIcon food={row.food} className="h-7 w-7" /> : <Package className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{row.stock.nomeAlimento}</p>
                  <p className="truncate text-xs text-slate-500">{row.category} · Lote {row.lot}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="text-sm tabular-nums text-slate-700">
                  {formatNumber(row.stock.quantidadeAtual)} {row.stock.unidadeMedida}
                </span>
                <StockStatusBadge status={row.status} />
              </div>
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="px-6 py-10 text-center text-sm text-slate-500">
            Nenhum item em estoque.
          </li>
        )}
      </ul>
    </section>
  )
}

/* ─────────────────────────────────────────────
   StockCompactCard
───────────────────────────────────────────── */
function StockCompactCard({ stock, food, supplierName, onClick }: {
  stock: MealStockItem; food?: MealFood; supplierName?: string; onClick: () => void
}) {
  const tones = stockTone(stock.status)
  const levelPercent = stock.quantidadeMinima > 0
    ? Math.min(100, (stock.quantidadeAtual / stock.quantidadeMinima) * 100)
    : 100

  return (
    <article role="button" tabIndex={0} onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={[
        'group flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl border-l-4 border border-slate-300 bg-white px-4 py-3',
        'transition-all duration-150 hover:shadow-md hover:-translate-y-px',
        'focus:outline-none focus:ring-2 focus:ring-indigo-300',
        tones.accent,
      ].join(' ')}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${tones.iconBg}`}>
        {food ? <FoodIcon food={food} className="h-7 w-7" /> : <Utensils className="h-4 w-4 text-slate-400" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <strong className="min-w-0 truncate text-sm font-semibold text-slate-900">{stock.nomeAlimento}</strong>
          <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${tones.badge}`}>
            {statusLabel(stock.status)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">{formatNumber(stock.quantidadeAtual)} {stock.unidadeMedida}</span>
          {supplierName && <> · {supplierName}</>}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full transition-all duration-500 ${tones.bar}`} style={{ width: `${levelPercent}%` }} />
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500" />
    </article>
  )
}

/* ─────────────────────────────────────────────
   MenuCard
───────────────────────────────────────────── */
function getMenuMealTypeDef(type: MealMenu['tipoRefeicao']) {
  return menuMealTypeDefs.find((item) => item.key === type) ?? menuMealTypeDefs[0]
}

function getMenuFoods(menu: MealMenu, foods: MealFood[]) {
  return menu.alimentoIds.map((id) => foods.find((f) => f.id === id)).filter((f): f is MealFood => Boolean(f))
}

function FoodMenuCover({ food, mealType }: { food?: MealFood; mealType: (typeof menuMealTypeDefs)[number] }) {
  const [imageFailed, setImageFailed] = useState(false)
  const Icon = mealType.icon

  if (food && !imageFailed) {
    return (
      <img
        src={getFoodImageSource(food)}
        alt={food.nome}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        draggable={false}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <div className={`flex h-full w-full items-center justify-center ${mealType.iconClass}`}>
      <Icon className="h-10 w-10" />
    </div>
  )
}

function MenuBadge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  )
}

function MenuCard({ menu, foods }: { menu: MealMenu; foods: MealFood[] }) {
  const menuFoods = getMenuFoods(menu, foods)
  const mealType = getMenuMealTypeDef(menu.tipoRefeicao)
  const Icon = mealType.icon
  const description = menu.observacao?.trim()
    || (menuFoods.length > 0 ? menuFoods.map((food) => food.nome).join(', ') : 'Nenhum alimento vinculado a este cardápio.')

  return (
    <article className="group overflow-hidden rounded-xl border border-slate-300 bg-white transition-all hover:shadow-md">
      <div className="relative h-40 overflow-hidden sm:h-44">
        <FoodMenuCover food={menuFoods[0]} mealType={mealType} />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm">
          <Icon className="h-3.5 w-3.5" />
          {mealType.label}
        </div>
      </div>
      <div className="space-y-2.5 p-4">
        <div>
          <h4 className="text-base font-semibold leading-tight text-slate-950">{menu.titulo}</h4>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <MenuBadge className={mealType.surfaceClass}>
            {mealType.shortLabel}
          </MenuBadge>
          <MenuBadge className={shiftColors[menu.turno]}>
            {shiftLabels[menu.turno]}
          </MenuBadge>
          {menuFoods.slice(0, 2).map((food) => (
            <MenuBadge key={food.id} className="border-slate-300 bg-slate-50 text-slate-600">
              {food.nome}
            </MenuBadge>
          ))}
          {menuFoods.length > 2 && (
            <MenuBadge className="border-slate-300 bg-slate-50 text-slate-500">
              +{menuFoods.length - 2}
            </MenuBadge>
          )}
        </div>
      </div>
    </article>
  )
}

function MenuDaySection({ day, foods }: { day: MenuCalendarWeekDay; foods: MealFood[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
          {day.dayShort}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-950">{day.dayName}</h3>
          <p className="text-sm text-slate-500">{day.dateLabel}</p>
        </div>
      </div>

      {day.menus.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {day.menus.map((menu) => (
            <MenuCard key={menu.id} menu={menu} foods={foods} />
          ))}
        </div>
      ) : (
        <div className="grid min-h-[132px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
          <div>
            <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">Sem cardápio planejado para este dia.</p>
          </div>
        </div>
      )}
    </section>
  )
}

function MonthlyMenuCell({ menus, foods, mealType }: {
  menus: MealMenu[]
  foods: MealFood[]
  mealType: (typeof menuMealTypeDefs)[number]
}) {
  const menu = menus[0]
  if (!menu) {
    return (
      <div className="grid h-[108px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center">
        <span className="text-[11px] font-medium text-slate-400">Sem item</span>
      </div>
    )
  }

  const menuFoods = getMenuFoods(menu, foods)
  return (
    <div className="group relative h-[108px] overflow-hidden rounded-xl border border-slate-300 bg-slate-100 transition-all hover:border-indigo-300 hover:shadow-sm">
      <div className="absolute inset-0">
        <FoodMenuCover food={menuFoods[0]} mealType={mealType} />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/45 to-transparent px-2.5 pb-2 pt-8">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white drop-shadow">{menu.titulo}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
        {menuFoods.slice(0, 1).map((food) => (
          <span key={food.id} className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
            {food.nome}
          </span>
        ))}
        {menus.length > 1 && (
          <span className="rounded-md bg-indigo-50/95 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 shadow-sm backdrop-blur-sm">
            +{menus.length - 1}
          </span>
        )}
        </div>
      </div>
    </div>
  )
}

function MonthlyMenuTable({ week, foods }: { week: MenuCalendarWeek; foods: MealFood[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Refeição
              </th>
              {week.days.map((day) => (
                <th key={day.key} className="px-3 py-3 text-center">
                  <div className="text-sm font-bold text-slate-950">{day.dayShort}</div>
                  <div className="text-xs text-slate-500">{day.dateLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {menuMealTypeDefs.map((mealType) => {
              const Icon = mealType.icon
              return (
                <tr key={mealType.key} className="border-b border-slate-200 last:border-0">
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${mealType.iconClass}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold text-slate-900">{mealType.shortLabel}</span>
                    </div>
                  </td>
                  {week.days.map((day) => (
                    <td key={`${day.key}-${mealType.key}`} className="px-2 py-3 align-top">
                      <MonthlyMenuCell
                        mealType={mealType}
                        menus={day.menus.filter((menu) => menu.tipoRefeicao === mealType.key)}
                        foods={foods}
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MenuSummaryCards({ week }: { week: MenuCalendarWeek }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {menuMealTypeDefs.map((mealType) => {
        const Icon = mealType.icon
        const count = week.days.reduce((sum, day) => sum + day.menus.filter((menu) => menu.tipoRefeicao === mealType.key).length, 0)
        return (
          <article key={mealType.key} className="rounded-xl border border-slate-300 bg-white p-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${mealType.iconClass}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-950">{count}</p>
                <p className="text-sm text-slate-500">{mealType.label}</p>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   MovementsModal
───────────────────────────────────────────── */
function MovementsModal({ management, schoolName, onClose }: {
  management: MealManagement; schoolName: string; onClose: () => void
}) {
  const movements = [...management.movimentacoesOrcamento].sort((a, b) => new Date(b.dataMovimentacao).getTime() - new Date(a.dataMovimentacao).getTime())
  const total = movements.reduce((sum, m) => sum + m.valor, 0)

  return (
    <Modal id="mv-movements-title" title="Histórico de Compras" subtitle={schoolName} subtitlePlacement="below" onClose={onClose} maxWidth="640px">
      <div className="grid grid-cols-3 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <StatCard label="Registros" value={String(movements.length)} />
        <StatCard label="Total movimentado" value={formatCurrency(total)} />
        <StatCard label="Disponível" value={formatCurrency(management.orcamentoMensal.valorDisponivel)} tone="text-emerald-700" />
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-6">
        {movements.length > 0 ? (
          <div className="grid gap-3">
            {movements.map((m) => (
              <article key={m.id} className="rounded-xl border border-slate-300 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block text-sm font-semibold text-slate-900">{m.descricao}</strong>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {new Date(m.dataMovimentacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-700">
                    {formatCurrency(m.valor)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <StatCard label="Saldo antes" value={formatCurrency(m.saldoAntes)} />
                  <StatCard label="Saldo depois" value={formatCurrency(m.saldoDepois)} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[120px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <div>
              <History className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">Nenhuma movimentação este mês</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   MenuCalendarTabs
───────────────────────────────────────────── */
function MenuCalendarTabs({ management, schoolName }: { management: MealManagement; schoolName: string }) {
  const weeks = useMemo(() => buildMenuCalendarWeeks(management.mesReferencia, management.cardapios), [management.cardapios, management.mesReferencia])
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly')
  const currentWeek = weeks[currentWeekIndex] ?? weeks[0] ?? null

  useEffect(() => { setCurrentWeekIndex(0) }, [management.id, management.mesReferencia])
  useEffect(() => {
    if (weeks.length === 0) return
    setCurrentWeekIndex((current) => Math.min(current, weeks.length - 1))
  }, [weeks.length])

  function moveWeek(delta: number) {
    setCurrentWeekIndex((current) => Math.min(Math.max(0, current + delta), Math.max(0, weeks.length - 1)))
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Calendário alimentar</p>
            <h2 className="text-sm font-semibold text-slate-900">{schoolName} · {formatMonthReference(management.mesReferencia)}</h2>
          </div>
        </div>
        <div className="flex rounded-lg border border-slate-300 bg-slate-100 p-0.5">
          {([['weekly', 'Por semana'], ['monthly', 'Por mês']] as const).map(([tab, label]) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {(activeTab === 'weekly' || activeTab === 'monthly') && (
        currentWeek ? (
          <div className="grid max-h-[min(76vh,920px)] gap-8 overflow-y-auto p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-950">{currentWeek.label}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {activeTab === 'weekly'
                    ? `Confira as refeições planejadas de ${currentWeek.dateRange}.`
                    : `Visão geral do cardápio de ${currentWeek.dateRange}.`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => moveWeek(-1)} disabled={currentWeekIndex === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="min-w-[100px] text-center text-sm font-medium text-slate-500">
                  Semana {currentWeek.weekNumber}
                </span>
                <button type="button" onClick={() => moveWeek(1)} disabled={currentWeekIndex >= weeks.length - 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {activeTab === 'weekly' ? (
              <div className="grid gap-10">
                {currentWeek.days.map((day) => (
                  <MenuDaySection key={day.key} day={day} foods={management.alimentosCadastrados} />
                ))}
              </div>
            ) : (
              <div className="grid gap-5">
                <MonthlyMenuTable week={currentWeek} foods={management.alimentosCadastrados} />
                <MenuSummaryCards week={currentWeek} />
              </div>
            )}
          </div>
        ) : (
          <div className="grid min-h-[240px] place-items-center p-6">
            <div className="text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-400">Nenhum cardápio planejado para o mês.</p>
            </div>
          </div>
        )
      )}

    </section>
  )
}

/* ─────────────────────────────────────────────
   StockDetailModal
───────────────────────────────────────────── */
function StockDetailModal({ stock, food, supplierName, onClose }: StockDetailState & { onClose: () => void }) {
  const tones = stockTone(stock.status)
  const levelPercent = stock.quantidadeMinima > 0 ? Math.min(100, (stock.quantidadeAtual / stock.quantidadeMinima) * 100) : 100
  const isOk = stock.quantidadeAtual > stock.quantidadeMinima

  return (
    <Modal id="mv-stock-detail-title" title={stock.nomeAlimento} subtitle="Detalhe do estoque" onClose={onClose} maxWidth="480px">
      <div className="grid gap-4 p-6">
        <div className="flex items-center gap-4 rounded-xl border border-slate-300 bg-slate-50 p-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white">
            {food ? <FoodIcon food={food} className="h-10 w-10" /> : <Utensils className="h-6 w-6 text-slate-400" />}
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">{stock.nomeAlimento}</h3>
            <span className={`mt-1 inline-flex rounded-md border px-2.5 py-0.5 text-xs font-semibold ${tones.badge}`}>
              {statusLabel(stock.status)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Quantidade atual', value: `${formatNumber(stock.quantidadeAtual)} ${stock.unidadeMedida}` },
            { label: 'Quantidade mínima', value: `${formatNumber(stock.quantidadeMinima)} ${stock.unidadeMedida}` },
            { label: 'Fornecedor', value: supplierName ?? 'Não informado' },
            { label: 'Data de validade', value: stock.dataValidade ? new Date(`${stock.dataValidade}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem validade' },
          ].map((s) => <StatCard key={s.label} label={s.label} value={s.value} />)}
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Nível de estoque</span>
            <span className={`text-xs font-semibold ${isOk ? 'text-emerald-600' : 'text-red-600'}`}>
              {stock.quantidadeMinima > 0 ? `${levelPercent.toFixed(0)}% do mínimo` : 'Sem mínimo definido'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full transition-all duration-700 ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${levelPercent}%` }} />
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-200 pt-2">
          <button type="button" onClick={onClose} className="min-h-9 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   StockOverviewModal
───────────────────────────────────────────── */
function StockOverviewModal({
  management,
  schoolName,
  onClose,
  onShowMovements,
  onNewItem,
  canManagePurchases,
}: StockOverviewModalState & {
  onClose: () => void
  onShowMovements: () => void
  onNewItem: () => void
  canManagePurchases: boolean
}) {
  const [query, setQuery] = useState('')
  const rows = useMemo(() => buildStockDisplayRows(management), [management])
  const filteredRows = useMemo(() => {
    const search = normalizeFoodSearchText(query)
    if (!search) return rows
    return rows.filter((row) =>
      normalizeFoodSearchText(`${row.stock.nomeAlimento} ${row.category} ${row.lot}`).includes(search),
    )
  }, [query, rows])
  const lots = new Set(rows.map((row) => row.lot)).size

  return (
    <Modal id="mv-stock-overview-title" title="Estoque completo" subtitle={schoolName} subtitlePlacement="below" onClose={onClose} maxWidth="1100px">
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por item, categoria ou lote..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-emerald-500/20 transition focus:border-emerald-500 focus:ring-4"
          />
        </div>
        <button type="button" onClick={onShowMovements}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 hover:bg-indigo-50 hover:text-indigo-700 hover:-translate-y-0.5 hover:border-indigo-500  px-3 py-2 text-sm font-medium text-slate-700">
          <ShoppingCart className="h-4 w-4" />
          Movimentações
        </button>
        {canManagePurchases && (
          <button type="button" onClick={onNewItem}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            Novo item
          </button>
        )}
      </div>

      <div className="border-b border-slate-200 px-6 py-3 text-xs text-slate-500">
        {rows.length} itens · {lots} lote{lots !== 1 ? 's' : ''} ativo{lots !== 1 ? 's' : ''}
      </div>

      <div className="max-h-[60vh] overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Lote</th>
              <th className="px-4 py-3 font-medium">Validade</th>
              <th className="px-4 py-3 text-right font-medium">Qtd.</th>
              <th className="px-4 py-3 text-right font-medium">Valor unit.</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRows.map((row) => (
              <tr key={row.stock.id} className="hover:bg-slate-50/60">
                <td className="px-6 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      {row.food ? <FoodIcon food={row.food} className="h-6 w-6" /> : <Package className="h-4 w-4" />}
                    </span>
                    <span className="font-medium text-slate-900">{row.stock.nomeAlimento}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.category}</td>
                <td className="px-4 py-3 text-slate-600">{row.lot}</td>
                <td className="px-4 py-3 text-slate-600">{row.expiresAt ? formatStockDate(row.expiresAt) : 'Sem validade'}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatNumber(row.stock.quantidadeAtual)} {row.stock.unidadeMedida}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {row.unitPrice > 0 ? formatCurrency(row.unitPrice) : '—'}
                </td>
                <td className="px-6 py-3">
                  <StockStatusBadge status={row.status} />
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   WizardStepIndicator
───────────────────────────────────────────── */
function WizardStepIndicator({ current }: { current: WizardStep }) {
  const steps: { n: WizardStep; label: string }[] = [
    { n: 1, label: 'Alimento' }, { n: 2, label: 'Detalhes' }, { n: 3, label: 'Confirmar' },
  ]
  return (
    <div className="flex items-stretch border-b border-slate-200 bg-slate-50">
      {steps.map(({ n, label }, idx) => {
        const done = current > n
        const active = current === n
        return (
          <div key={n} className="flex flex-1 items-center">
            <div className={`flex flex-1 flex-col items-center gap-1.5 border-b-2 py-3 transition-all ${active ? 'border-indigo-600' : done ? 'border-emerald-500' : 'border-transparent'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-all ${active ? 'bg-indigo-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
            </div>
            {idx < steps.length - 1 && <div className={`h-px w-2 shrink-0 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────
   PurchaseForm — 3-step wizard
───────────────────────────────────────────── */
function PurchaseForm({ management, onSearchFoods, onCreateItem }: {
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<PurchaseFormField>>({})

  useEffect(() => {
    const search = query.trim()
    if (search === selectedFood?.nome) { setFoodOptions([]); setFoodSearchError(''); setIsSearchingFoods(false); return }
    let isCurrent = true
    setIsSearchingFoods(true); setFoodSearchError('')
    const timeoutId = window.setTimeout(() => {
      onSearchFoods(search, foodSuggestionLimit)
        .then((foods) => {
          if (!isCurrent) return
          const options = foods.slice(0, foodSuggestionLimit)
          setFoodOptions(options.length > 0 ? options : search ? [] : management.alimentosCadastrados.slice(0, foodSuggestionLimit))
        })
        .catch(() => { if (isCurrent) { const fallback = search ? [] : management.alimentosCadastrados.slice(0, foodSuggestionLimit); setFoodOptions(fallback); setFoodSearchError(fallback.length > 0 ? '' : 'Não foi possível buscar alimentos.') } })
        .finally(() => { if (isCurrent) setIsSearchingFoods(false) })
    }, search ? 250 : 0)
    return () => { isCurrent = false; window.clearTimeout(timeoutId) }
  }, [management.alimentosCadastrados, management.id, onSearchFoods, query, selectedFood?.nome])

  useEffect(() => {
    setStep(1); setSaved(false); setQuery(''); setFoodOptions([]); setSelectedFood(null)
    setFoodSearchError(''); setIsSearchingFoods(false); setFieldErrors({}); setForm(createInitialForm())
  }, [management.id])

  const estimatedTotal = parseDecimalInput(form.quantidade || '0') * parseDecimalInput(form.valorUnitario || '0')
  const step2Valid = !!form.quantidade && !!form.valorUnitario && !!form.fornecedorNome

  function updateFormField<K extends keyof MealFormState>(field: K, value: MealFormState[K]) {
    setFieldErrors((c) => ({ ...c, [field]: undefined }))
    setForm((c) => ({ ...c, [field]: value }))
  }

  function validatePurchaseForm(targetStep?: 1 | 2 | 3) {
    const result = purchaseFormSchema.safeParse({ ...form, alimentoId: selectedFood?.id ?? form.alimentoId })
    if (result.success) { setFieldErrors({}); return result.data }
    const errors = zodFieldErrors<PurchaseFormField>(result.error)
    setFieldErrors(errors)
    if (targetStep) setStep(targetStep)
    return null
  }

  async function handleSubmit() {
    const parsed = validatePurchaseForm()
    if (!parsed) { setStep(selectedFood ? 2 : 1); return }
    if (!selectedFood) { setStep(1); return }
    setIsSaving(true)
    try {
      await onCreateItem(management.id, {
        alimentoId: selectedFood.id,
        quantidade: parseDecimalInput(parsed.quantidade),
        valorUnitario: parseDecimalInput(parsed.valorUnitario),
        fornecedorNome: parsed.fornecedorNome,
        dataValidade: parsed.possuiValidade ? parsed.dataValidade || null : null,
        possuiValidade: parsed.possuiValidade,
        lote: parsed.lote || null,
        quantidadeMinima: parsed.quantidadeMinima ? parseDecimalInput(parsed.quantidadeMinima) : undefined,
      })
      setSaved(true)
    } catch { } finally { setIsSaving(false) }
  }

  function resetForm() {
    setStep(1); setQuery(''); setFoodOptions([]); setSelectedFood(null)
    setFoodSearchError(''); setSaved(false); setFieldErrors({}); setForm(createInitialForm())
  }

  if (saved) {
    return (
      <section className="overflow-hidden rounded-xl border border-emerald-300 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Compra registrada</p>
            <h2 className="text-sm font-semibold text-slate-900">Alimento adicionado ao estoque</h2>
          </div>
        </div>
        <div className="grid place-items-center gap-5 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{selectedFood?.nome ?? 'Item'} registrado!</p>
            <p className="mt-1 text-sm text-slate-500">{formatCurrency(estimatedTotal)} · {form.quantidade} {selectedFood?.unidadeMedida}</p>
          </div>
          <button type="button" onClick={resetForm}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Registrar nova compra
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
          <Plus className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">Registrar compra</p>
          <h2 className="text-sm font-semibold text-slate-900">Adicionar ao estoque</h2>
        </div>
      </div>

      <WizardStepIndicator current={step} />

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <div className="border-b border-slate-200 p-4">
            <p className="mb-2 text-xs text-slate-500">Selecione o alimento comprado:</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={query}
                onChange={(e) => { setFieldErrors((c) => ({ ...c, alimentoId: undefined })); setQuery(e.target.value); setSelectedFood(null); setForm((c) => ({ ...c, alimentoId: 0 })) }}
                placeholder="Buscar por nome ou categoria..."
                autoFocus
              />
            </div>
            <FieldMessage error={fieldErrors.alimentoId} className="mt-1.5" />
          </div>

          {(!selectedFood || query.trim() !== selectedFood.nome) && (
            <div className="border-b border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{query.trim() ? 'Resultados' : 'Sugestões'}</span>
              </div>
              <div className="grid gap-1.5">
                {isSearchingFoods ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                ) : foodOptions.slice(0, foodSuggestionLimit).map((food) => {
                  const isSelected = selectedFood?.id === food.id
                  return (
                    <button key={food.id} type="button"
                      onClick={() => { setFieldErrors((c) => ({ ...c, alimentoId: undefined })); setSelectedFood(food); setQuery(food.nome); setFoodOptions([]); setFoodSearchError(''); setForm((c) => ({ ...c, alimentoId: food.id })) }}
                      className={`flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'}`}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-300 bg-white">
                        <FoodIcon food={food} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-semibold text-slate-900">{food.nome}</strong>
                        <span className="block truncate text-[10px] text-slate-400">{food.categoria} · {food.unidadeMedida}</span>
                      </span>
                      {isSelected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-indigo-500" />}
                    </button>
                  )
                })}
                {!isSearchingFoods && foodSearchError && (
                  <div className="rounded-lg border border-dashed border-red-300 bg-red-50 py-4 text-center">
                    <p className="text-sm text-red-500">{foodSearchError}</p>
                  </div>
                )}
                {!isSearchingFoods && !foodSearchError && foodOptions.length === 0 && !selectedFood && (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-4 text-center">
                    <p className="text-sm text-slate-400">Nenhum alimento encontrado</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 p-4">
            {selectedFood ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-300 bg-white">
                  <FoodIcon food={selectedFood} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400">Selecionado</p>
                  <p className="truncate text-sm font-semibold text-slate-900">{selectedFood.nome}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Escolha um alimento acima</p>
            )}
            <button type="button" disabled={!selectedFood}
              onClick={() => { if (!selectedFood) { setFieldErrors((c) => ({ ...c, alimentoId: 'Selecione um alimento.' })); return }; setStep(2) }}
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          {selectedFood && (
            <div className="flex items-center gap-3 border-b border-indigo-200 bg-indigo-50 px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-indigo-300 bg-white">
                <FoodIcon food={selectedFood} className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{selectedFood.nome}</p>
                <p className="text-[10px] text-indigo-500">{selectedFood.categoria} · {selectedFood.unidadeMedida}</p>
              </div>
              <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-800">Trocar</button>
            </div>
          )}

          <div className="grid gap-4 p-5">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Quantidade e valor</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Quantidade (${selectedFood?.unidadeMedida ?? 'un'})`} error={fieldErrors.quantidade}>
                  <input className={`${inputCls} ${fieldStateClass(fieldErrors.quantidade)}`} type="number" min="0.01" step="0.01" placeholder="0,00" value={form.quantidade} onChange={(e) => updateFormField('quantidade', e.target.value)} />
                </Field>
                <Field label="Valor unitário (R$)" error={fieldErrors.valorUnitario}>
                  <input className={`${inputCls} ${fieldStateClass(fieldErrors.valorUnitario)}`} type="number" min="0.01" step="0.01" placeholder="0,00" value={form.valorUnitario} onChange={(e) => updateFormField('valorUnitario', e.target.value)} />
                </Field>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">Total da compra</p>
                  <p className="text-xs text-indigo-400">{form.quantidade || '0'} × {form.valorUnitario ? formatCurrency(Number(form.valorUnitario)) : 'R$ —'}</p>
                </div>
                <strong className="text-xl font-bold text-indigo-700">{formatCurrency(Number.isFinite(estimatedTotal) ? estimatedTotal : 0)}</strong>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Estoque e rastreio</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Qtd. mínima" hint="Alerta quando atingir este valor." error={fieldErrors.quantidadeMinima}>
                  <input className={`${inputCls} ${fieldStateClass(fieldErrors.quantidadeMinima)}`} type="number" min="0" step="0.01" placeholder="Automático" value={form.quantidadeMinima} onChange={(e) => updateFormField('quantidadeMinima', e.target.value)} />
                </Field>
                <Field label="Lote" hint="Código de rastreamento." error={fieldErrors.lote}>
                  <input className={`${inputCls} ${fieldStateClass(fieldErrors.lote)}`} placeholder="Ex: LT202605001" value={form.lote} onChange={(e) => updateFormField('lote', e.target.value)} />
                </Field>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Validade e fornecedor</p>
              <button type="button"
                onClick={() => { setFieldErrors((c) => ({ ...c, possuiValidade: undefined, dataValidade: undefined })); setForm((c) => ({ ...c, possuiValidade: !c.possuiValidade, dataValidade: !c.possuiValidade ? c.dataValidade : '' })) }}
                className={`mb-3 flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${form.possuiValidade ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 bg-slate-50'}`}>
                {form.possuiValidade ? <ToggleRight className="h-5 w-5 shrink-0 text-indigo-600" /> : <ToggleLeft className="h-5 w-5 shrink-0 text-slate-400" />}
                <div>
                  <p className="text-sm font-semibold text-slate-800">Controlar data de validade</p>
                  <p className="text-[11px] text-slate-500">{form.possuiValidade ? 'Ativo — informe a data abaixo' : 'Desativado'}</p>
                </div>
              </button>
              <div className={`grid gap-3 ${form.possuiValidade ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {form.possuiValidade && (
                  <Field label="Data de validade" error={fieldErrors.dataValidade}>
                    <DateInput className={`${inputCls} ${fieldStateClass(fieldErrors.dataValidade)}`} value={form.dataValidade} onChange={(e) => updateFormField('dataValidade', e.target.value)} />
                  </Field>
                )}
                <Field label="Fornecedor" error={fieldErrors.fornecedorNome}>
                  <input className={`${inputCls} ${fieldStateClass(fieldErrors.fornecedorNome)}`} value={form.fornecedorNome} onChange={(e) => updateFormField('fornecedorNome', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 border-t border-slate-200 px-5 py-4">
            <button type="button" onClick={() => setStep(1)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <button type="button" disabled={!step2Valid}
              onClick={() => { if (validatePurchaseForm(2)) setStep(3) }}
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
              Revisar <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div>
          <div className="grid gap-3 p-5">
            {selectedFood && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
                  <FoodIcon food={selectedFood} className="h-8 w-8" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{selectedFood.nome}</p>
                  <p className="text-xs text-slate-400">{selectedFood.categoria} · {selectedFood.unidadeMedida}</p>
                </div>
              </div>
            )}
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Dados da compra</span>
              </div>
              <div className="divide-y divide-slate-200 px-4">
                {[
                  { label: 'Quantidade', value: `${form.quantidade || '—'} ${selectedFood?.unidadeMedida ?? ''}` },
                  { label: 'Valor unitário', value: form.valorUnitario ? formatCurrency(Number(form.valorUnitario)) : '—' },
                  { label: 'Qtd. mínima', value: form.quantidadeMinima ? `${form.quantidadeMinima} ${selectedFood?.unidadeMedida ?? ''}` : 'Automático' },
                  { label: 'Lote', value: form.lote || '—' },
                  { label: 'Validade', value: form.possuiValidade && form.dataValidade ? new Date(`${form.dataValidade}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem validade' },
                  { label: 'Fornecedor', value: form.fornecedorNome || '—' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-xs text-slate-500">{row.label}</span>
                    <span className="text-right text-sm font-semibold text-slate-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-indigo-300 bg-indigo-50 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">Total da compra</p>
                <p className="text-xs text-indigo-400">{form.quantidade} {selectedFood?.unidadeMedida} × {form.valorUnitario ? formatCurrency(Number(form.valorUnitario)) : '—'}</p>
              </div>
              <strong className="text-xl font-bold text-indigo-700">{formatCurrency(Number.isFinite(estimatedTotal) ? estimatedTotal : 0)}</strong>
            </div>
          </div>
          <div className="flex gap-2.5 border-t border-slate-200 px-5 py-4">
            <button type="button" onClick={() => setStep(2)}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Editar
            </button>
            <button type="button" disabled={isSaving || !selectedFood} onClick={handleSubmit}
              className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" /> {isSaving ? 'Registrando...' : 'Confirmar compra'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

/* ─────────────────────────────────────────────
   FoodRequestInlineForm
───────────────────────────────────────────── */
function createRequestFormState(request?: MealFoodRequest | null): FoodRequestFormState {
  return {
    itemName: request?.itemName ?? '', quantity: request ? String(request.quantity) : '',
    unit: request?.unit ?? 'KG', unitPrice: request?.unitPrice ? String(request.unitPrice) : '',
    reason: request?.reason ?? '', urgencyLevel: request?.urgencyLevel ?? 'MEDIUM',
    expirationDate: request?.expirationDate ?? '', observation: request?.observation ?? '',
  }
}

function FoodRequestInlineForm({ schoolId, request, onCancelEdit, onSearchFoods, onCreate, onUpdate }: {
  schoolId: string; request?: MealFoodRequest | null; onCancelEdit?: () => void
  onSearchFoods: (query: string, limit?: number) => Promise<MealFood[]>
  onCreate: (draft: CreateMealFoodRequestPayload) => Promise<void>
  onUpdate: (id: string, draft: UpdateMealFoodRequestPayload) => Promise<void>
}) {
  const [form, setForm] = useState<FoodRequestFormState>(() => createRequestFormState(request))
  const [foodQuery, setFoodQuery] = useState(request?.itemName ?? '')
  const [foodOptions, setFoodOptions] = useState<MealFood[]>([])
  const [selectedFood, setSelectedFood] = useState<MealFood | null>(null)
  const [isSearchingFoods, setIsSearchingFoods] = useState(false)
  const [foodSearchError, setFoodSearchError] = useState('')
  const [errors, setErrors] = useState<FieldErrors<FoodRequestFormField>>({})
  const [isSaving, setIsSaving] = useState(false)
  const requestFieldCls = `${inputCls} !rounded-lg`

  useEffect(() => {
    const initialForm = createRequestFormState(request)
    setForm(initialForm); setFoodQuery(initialForm.itemName); setFoodOptions([])
    setSelectedFood(null); setIsSearchingFoods(false); setFoodSearchError(''); setErrors({})
  }, [request])

  useEffect(() => {
    const search = foodQuery.trim()
    if (!search) { setFoodOptions([]); setSelectedFood(null); setIsSearchingFoods(false); setFoodSearchError(''); return }
    let isCurrent = true
    setIsSearchingFoods(true); setFoodSearchError('')
    const timeoutId = window.setTimeout(() => {
      onSearchFoods(search, foodSuggestionLimit)
        .then((foods) => {
          if (!isCurrent) return
          const options = foods.slice(0, foodSuggestionLimit)
          const exactFood = findFoodByName(options, search)
          setFoodOptions(options); setSelectedFood(exactFood)
          setForm((c) => ({ ...c, itemName: exactFood?.nome ?? '', unit: exactFood?.unidadeMedida ?? c.unit }))
        })
        .catch(() => { if (!isCurrent) return; setFoodOptions([]); setSelectedFood(null); setFoodSearchError('Não foi possível buscar alimentos.') })
        .finally(() => { if (isCurrent) setIsSearchingFoods(false) })
    }, search ? 250 : 0)
    return () => { isCurrent = false; window.clearTimeout(timeoutId) }
  }, [foodQuery, onSearchFoods])

  function setField<K extends keyof FoodRequestFormState>(field: K, value: FoodRequestFormState[K]) {
    setErrors((c) => ({ ...c, [field]: undefined }))
    setForm((c) => ({ ...c, [field]: value }))
  }

  function selectFood(food: MealFood) {
    setErrors((c) => ({ ...c, itemName: undefined, unit: undefined }))
    setSelectedFood(food); setFoodQuery(food.nome)
    setForm((c) => ({ ...c, itemName: food.nome, unit: food.unidadeMedida }))
  }

  function updateFoodQuery(value: string) {
    setFoodQuery(value); setSelectedFood(null); setFoodSearchError('')
    setErrors((c) => ({ ...c, itemName: undefined }))
    setForm((c) => ({ ...c, itemName: '' }))
  }

  function resetRequestForm() {
    const initialForm = createRequestFormState(null)
    setForm(initialForm); setFoodQuery(''); setFoodOptions([]); setSelectedFood(null)
    setIsSearchingFoods(false); setFoodSearchError(''); setErrors({})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFood) { setErrors((c) => ({ ...c, itemName: 'Selecione um alimento do banco.' })); return }
    const nextForm = { ...form, itemName: selectedFood.nome }
    const parsed = foodRequestSchema.safeParse(nextForm)
    if (!parsed.success) { setErrors(zodFieldErrors<FoodRequestFormField>(parsed.error)); return }
    const payload: CreateMealFoodRequestPayload = {
      schoolId, itemName: selectedFood.nome, quantity: parsed.data.quantity, unit: parsed.data.unit,
      reason: parsed.data.reason, urgencyLevel: parsed.data.urgencyLevel,
      expirationDate: nextForm.expirationDate || null, observation: nextForm.observation.trim() || null,
    }
    setIsSaving(true)
    try {
      if (request) { await onUpdate(request.id, payload); onCancelEdit?.() }
      else { await onCreate(payload); resetRequestForm() }
    } finally { setIsSaving(false) }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Plus className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">Solicitar alimento</p>
            <h2 className="text-sm font-semibold text-slate-900">{request ? 'Corrigir solicitação' : 'Novo pedido para a escola'}</h2>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid overflow-hidden" noValidate>
        <div className="grid gap-4 p-6">
          {/* Food search */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-700">Alimento</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${requestFieldCls} pl-10 pr-10 ${fieldStateClass(errors.itemName)}`}
                value={foodQuery} onChange={(e) => updateFoodQuery(e.target.value)}
                placeholder="Buscar alimento cadastrado..." autoFocus />
              {foodQuery && (
                <button type="button" onClick={() => updateFoodQuery('')}
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {foodQuery.trim() ? (
              <div className="grid gap-1.5">
                {isSearchingFoods ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
                ) : foodSearchError ? (
                  <div className="rounded-lg border border-dashed border-red-300 bg-red-50 py-3 text-center">
                    <p className="text-sm text-red-500">{foodSearchError}</p>
                  </div>
                ) : foodOptions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-3 text-center">
                    <p className="text-sm text-slate-400">Nenhum alimento encontrado</p>
                  </div>
                ) : foodOptions.map((food) => {
                  const isSelected = selectedFood?.id === food.id
                  return (
                    <button key={food.id} type="button" onClick={() => selectFood(food)}
                      className={`flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'}`}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-300 bg-white">
                        <FoodIcon food={food} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-semibold text-slate-900">{food.nome}</strong>
                        <span className="block truncate text-[10px] text-slate-400">{food.categoria} - {food.unidadeMedida}</span>
                      </span>
                      {isSelected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-indigo-500" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-3 text-center">
                <p className="text-xs text-slate-400">Digite para buscar no banco de alimentos.</p>
              </div>
            )}
            <FieldMessage error={errors.itemName} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quantidade" error={errors.quantity}>
              <input className={requestFieldCls} type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} />
            </Field>
            <Field label="Unidade">
              <CompactSelect<MealUnit> value={form.unit} options={mealUnitOptions} onChange={(unit) => setField('unit', unit)}
                className={`${requestFieldCls} ${fieldStateClass(errors.unit)}`} error={errors.unit} dropdownWidth="trigger" dropdownMinWidth={180} />
            </Field>
          </div>
          <Field label="Motivo" error={errors.reason}>
            <textarea className={`${requestFieldCls} min-h-[72px] py-2.5`} value={form.reason} onChange={(e) => setField('reason', e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Urgência">
              <CompactSelect<FoodRequestUrgency> value={form.urgencyLevel} options={foodRequestUrgencyOptions} onChange={(urgencyLevel) => setField('urgencyLevel', urgencyLevel)}
                className={`${requestFieldCls} ${fieldStateClass(errors.urgencyLevel)}`} error={errors.urgencyLevel} dropdownWidth="trigger" dropdownMinWidth={180} />
            </Field>
            <Field label="Validade prevista" hint="Opcional">
              <DateInput value={form.expirationDate} onChange={(e) => setField('expirationDate', e.target.value)} className={requestFieldCls} />
            </Field>
          </div>
          <Field label="Observação" hint="Opcional">
            <textarea className={`${requestFieldCls} min-h-[100px] py-2.5`} value={form.observation} onChange={(e) => setField('observation', e.target.value)} />
          </Field>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
          {request && (
            <button type="button" onClick={onCancelEdit}
              className="min-h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar correção
            </button>
          )}
          <button type="submit" disabled={isSaving}
            className="min-h-9 rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? 'Salvando...' : request ? 'Reenviar solicitação' : 'Solicitar alimento'}
          </button>
        </div>
      </form>
    </section>
  )
}

/* ─────────────────────────────────────────────
   AddRequestToStockModal
───────────────────────────────────────────── */
function AddRequestToStockModal({ request, schoolName, onClose, onConfirm }: {
  request: MealFoodRequest; schoolName: string; onClose: () => void
  onConfirm: (id: string, draft: AddMealFoodRequestToStockPayload) => Promise<void>
}) {
  const [form, setForm] = useState({ fornecedorNome: '', valorUnitario: '', dataCompra: '', dataValidade: request.expirationDate ?? '', observacao: '', quantidadeMinima: '' })
  const [isSaving, setIsSaving] = useState(false)
  const quantity = request.suggestedQuantity && request.suggestedQuantity > 0 ? request.suggestedQuantity : request.quantity
  const unit = request.suggestedUnit ?? request.unit

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    try {
      await onConfirm(request.id, {
        fornecedorNome: form.fornecedorNome.trim() || null, valorUnitario: form.valorUnitario ? Number(form.valorUnitario) : null,
        dataCompra: form.dataCompra || null, dataValidade: form.dataValidade || null,
        observacao: form.observacao.trim() || null, quantidadeMinima: form.quantidadeMinima ? Number(form.quantidadeMinima) : null,
      })
      onClose()
    } finally { setIsSaving(false) }
  }

  return (
    <Modal id="mv-add-request-stock-title" title="Adicionar ao estoque" subtitle={schoolName} onClose={onClose} maxWidth="560px">
      <form onSubmit={handleSubmit} className="grid gap-4 p-6">
        <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-slate-900">{request.itemName}</p>
          <p className="mt-1 text-xs font-medium text-indigo-700">{formatNumber(quantity)} {unit} aprovados pelo nutricionista</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fornecedor" hint="Opcional"><input className={inputCls} value={form.fornecedorNome} onChange={(e) => setForm((c) => ({ ...c, fornecedorNome: e.target.value }))} /></Field>
          <Field label="Valor unitário" hint="Opcional"><input className={inputCls} type="number" min="0" step="0.01" value={form.valorUnitario} onChange={(e) => setForm((c) => ({ ...c, valorUnitario: e.target.value }))} /></Field>
          <Field label="Data da compra" hint="Opcional"><DateInput value={form.dataCompra} onChange={(e) => setForm((c) => ({ ...c, dataCompra: e.target.value }))} className={inputCls} /></Field>
          <Field label="Data de validade" hint="Opcional"><DateInput value={form.dataValidade} onChange={(e) => setForm((c) => ({ ...c, dataValidade: e.target.value }))} className={inputCls} /></Field>
        </div>
        <Field label="Quantidade mínima" hint="Opcional"><input className={inputCls} type="number" min="0" step="0.01" value={form.quantidadeMinima} onChange={(e) => setForm((c) => ({ ...c, quantidadeMinima: e.target.value }))} /></Field>
        <Field label="Observação" hint="Opcional"><textarea className={`${inputCls} min-h-20 py-2.5`} value={form.observacao} onChange={(e) => setForm((c) => ({ ...c, observacao: e.target.value }))} /></Field>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="min-h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={isSaving} className="min-h-9 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? 'Adicionando...' : 'Confirmar entrada'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ─────────────────────────────────────────────
   FoodRequestsPanel
───────────────────────────────────────────── */
function FoodRequestsPanel({ requests, isDirector, isAdmin, onShowMovements, onEditClick, onAddToStockClick }: {
  requests: MealFoodRequest[]; isDirector: boolean; isAdmin: boolean
  onShowMovements: () => void
  onEditClick: (request: MealFoodRequest) => void
  onAddToStockClick: (request: MealFoodRequest) => void
}) {
  const visibleRequests = isAdmin
    ? requests.filter((r) => ['APPROVED_BY_NUTRITIONIST', 'ADDED_TO_STOCK', 'PENDING_PURCHASE', 'PURCHASED'].includes(r.status))
    : requests

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600">
            <ClipboardList className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-600">Solicitações</p>
            <h2 className="text-sm font-semibold text-slate-900">{isAdmin ? 'Aprovadas para estoque' : 'Acompanhamento da escola'}</h2>
          </div>
        </div>
        <button type="button" onClick={onShowMovements}
          className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
          <History className="h-3.5 w-3.5" /> Ver movimentações
        </button>
      </div>
      <div className="grid max-h-[400px] gap-2.5 overflow-y-auto p-4">
        {visibleRequests.length === 0 ? (
          <div className="grid min-h-[100px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <div>
              <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-400">Nenhuma solicitação para exibir.</p>
            </div>
          </div>
        ) : visibleRequests.map((request) => (
          <article key={request.id} className="rounded-xl border border-slate-300 bg-white p-4 transition-all hover:shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-slate-900">{request.itemName}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{formatNumber(request.quantity)} {request.unit} · {formatRequestDate(request.createdAt)}</p>
              </div>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${foodRequestUrgencyTone(request.urgencyLevel)}`}>
                {foodRequestUrgencyLabels[request.urgencyLevel]}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{request.reason}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${foodRequestStatusTone(request.status)}`}>
                {foodRequestStatusLabels[request.status]}
              </span>
              {request.nutritionistObservation && (
                <span className="truncate text-[11px] text-slate-400">Obs.: {request.nutritionistObservation}</span>
              )}
            </div>
            {((isDirector && request.status === 'NEEDS_ADJUSTMENT') || (isAdmin && request.status === 'APPROVED_BY_NUTRITIONIST')) && (
              <div className="mt-3 flex gap-2">
                {isDirector && request.status === 'NEEDS_ADJUSTMENT' && (
                  <button type="button" onClick={() => onEditClick(request)}
                    className="inline-flex min-h-7 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-[11px] font-medium text-amber-700 hover:bg-amber-100">
                    <Pencil className="h-3 w-3" /> Corrigir
                  </button>
                )}
                {isAdmin && request.status === 'APPROVED_BY_NUTRITIONIST' && (
                  <button type="button" onClick={() => onAddToStockClick(request)}
                    className="inline-flex min-h-7 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                    <PackageCheck className="h-3 w-3" /> Adicionar ao estoque
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

/* ═════════════════════════════════════════════
   Main Component — MealsView
═════════════════════════════════════════════ */
export default function MealsView({
  currentUser,
  currentRole,
  schools,
  mealManagements,
  foodRequests,
  mealRequestHistory: _mealRequestHistory,
  onLoadSchoolPage,
  onSearchFoods,
  onCreateFoodRequest,
  onUpdateFoodRequest,
  onAddFoodRequestToStock,
  onCreateItem,
  onUpdateBudget,
}: MealsViewProps) {
  const [selectedManagementId, setSelectedManagementId] = useState(mealManagements[0]?.id ?? '')
  const [schoolPage, setSchoolPage] = useState(1)
  const [schoolPageData, setSchoolPageData] = useState<MealManagementsPagePayload | null>(null)
  const [isSchoolPageLoading, setIsSchoolPageLoading] = useState(false)
  const [schoolPageError, setSchoolPageError] = useState('')
  const [activeMealTab, setActiveMealTab] = useState<MealTab>('stock')

  const selectedManagement = useMemo(
    () => mealManagements.find((m) => m.id === selectedManagementId) ?? mealManagements[0] ?? null,
    [mealManagements, selectedManagementId],
  )

  const [movementsModal, setMovementsModal] = useState<MovementsModalState | null>(null)
  const [stockOverviewModal, setStockOverviewModal] = useState<StockOverviewModalState | null>(null)
  const [stockDetail, setStockDetail] = useState<StockDetailState | null>(null)
  const [foodRequestDraft, setFoodRequestDraft] = useState<MealFoodRequest | null>(null)
  const [stockRequestModal, setStockRequestModal] = useState<MealFoodRequest | null>(null)

  const canManagePurchases = currentRole?.code === 'SUPERADMIN' || currentRole?.code === 'ADMIN' || currentRole?.name === 'SUPERADMIN' || currentRole?.name === 'ADMIN'
  const isDirector = currentRole?.code === 'DIRETOR' || currentRole?.name === 'DIRETOR'
  const isAdmin = currentRole?.code === 'SUPERADMIN' || currentRole?.code === 'ADMIN' || currentRole?.name === 'SUPERADMIN' || currentRole?.name === 'ADMIN'

  useEffect(() => {
    if (!mealManagements.length) return
    if (!mealManagements.some((m) => m.id === selectedManagementId)) setSelectedManagementId(mealManagements[0].id)
  }, [mealManagements, selectedManagementId])

  useEffect(() => {
    let isCurrent = true
    setIsSchoolPageLoading(true); setSchoolPageError('')
    onLoadSchoolPage(schoolPage, schoolSelectorPageSize)
      .then((data) => { if (!isCurrent) return; setSchoolPageData(data); if (data.pagination.page !== schoolPage) setSchoolPage(data.pagination.page) })
      .catch(() => { if (!isCurrent) return; setSchoolPageData(null); setSchoolPageError('Não foi possível carregar esta página.') })
      .finally(() => { if (isCurrent) setIsSchoolPageLoading(false) })
    return () => { isCurrent = false }
  }, [onLoadSchoolPage, schoolPage])

  useEffect(() => {
    setMovementsModal(null); setStockOverviewModal(null); setStockDetail(null)
    setFoodRequestDraft(null); setStockRequestModal(null)
  }, [selectedManagementId])

  const schoolById = useMemo(
    () => new Map([...schools, ...(schoolPageData?.schools ?? [])].map((s) => [s.id, s])),
    [schools, schoolPageData?.schools],
  )

  const schoolSelectorManagements = schoolPageData?.mealManagements ?? mealManagements.slice(0, schoolSelectorPageSize)
  const schoolSelectorPagination = schoolPageData?.pagination ?? {
    page: 1, limit: schoolSelectorPageSize,
    total: mealManagements.length,
    totalPages: Math.max(1, Math.ceil(mealManagements.length / schoolSelectorPageSize)),
  }

  const schoolSelectorOptions = useMemo<CompactSelectOption[]>(() => {
    const managementById = new Map<string, MealManagement>()
    for (const management of schoolSelectorManagements) managementById.set(management.id, management)
    if (selectedManagement) managementById.set(selectedManagement.id, selectedManagement)
    return Array.from(managementById.values()).map((management) => {
      const school = schoolById.get(management.escolaId)
      return {
        value: management.id,
        label: school?.name ?? 'Escola',
        description: `${formatMonthReferenceShort(management.mesReferencia)} · ${management.orcamentoMensal.percentualUtilizado.toFixed(0)}% usado`,
      }
    })
  }, [schoolById, schoolSelectorManagements, selectedManagement])

  const selectedSchool = selectedManagement ? schoolById.get(selectedManagement.escolaId) ?? null : null
  const selectedSchoolId = selectedManagement?.escolaId ?? currentUser.schoolId ?? ''
  const selectedFoodRequests = foodRequests.filter((r) => r.schoolId === selectedSchoolId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const selectedMenus = selectedManagement?.cardapios ?? []
  const selectedStock = selectedManagement?.estoqueMerenda ?? []
  const selectedStockRows = useMemo(
    () => selectedManagement ? buildStockDisplayRows(selectedManagement) : [],
    [selectedManagement],
  )

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

  const mealTabs = [
    { id: 'stock' as MealTab, label: 'Estoque', icon: <PackageCheck className="h-4 w-4" />, count: selectedStock.length },
    { id: 'calendar' as MealTab, label: 'Cardápios', icon: <CalendarDays className="h-4 w-4" />, count: selectedMenus.length },
    { id: 'requests' as MealTab, label: 'Solicitações', icon: <ClipboardList className="h-4 w-4" />, count: selectedFoodRequests.length },
  ]

  if (!selectedManagement) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
        <div className="grid max-w-md gap-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
            <Utensils className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Gestão de merenda não configurada</h1>
          <p className="text-sm leading-6 text-slate-500">Nenhuma escola possui gestão alimentar ativa para o mês de referência.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
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

        .mv-page { animation: mv-fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .mv-item { animation: mv-fade-up 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .mv-item:nth-child(1) { animation-delay: 0s; }
        .mv-item:nth-child(2) { animation-delay: 0.04s; }
        .mv-item:nth-child(3) { animation-delay: 0.08s; }
        .mv-item:nth-child(4) { animation-delay: 0.12s; }
        .mv-item:nth-child(5) { animation-delay: 0.16s; }
        .mv-item:nth-child(6) { animation-delay: 0.20s; }

        .mv-backdrop {
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(6px);
          animation: mv-fade-in 0.18s ease both;
        }
        .mv-modal { animation: mv-scale-in 0.22s cubic-bezier(0.22,1,0.36,1) both; }

        .mv-scroll::-webkit-scrollbar { width: 3px; }
        .mv-scroll::-webkit-scrollbar-track { background: transparent; }
        .mv-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
        .mv-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>

      <div className="mv-page mx-auto grid min-h-screen w-full max-w-[1680px] content-start gap-4 bg-slate-50 px-[clamp(16px,2.5vw,40px)] py-5 pb-12 text-slate-900">

        {/* ── HEADER ── */}
        <PageTitleBar
          className="mv-item !gap-2 !rounded-xl !px-3 !py-2"
          iconClassName="!h-8 !w-8 !rounded-lg [&_svg]:!h-4 [&_svg]:!w-4"
          label="Gestão alimentar"
          title="Merenda Escolar"
          icon={<Utensils />}
          actions={(
            <div className="flex flex-wrap items-center gap-1.5">
              <HeaderSchoolControl
                selectedManagement={selectedManagement}
                selectedSchool={selectedSchool}
                schoolSelectorOptions={schoolSelectorOptions}
                schoolSelectorPagination={schoolSelectorPagination}
                canChangeSchool={canManagePurchases}
                isSchoolPageLoading={isSchoolPageLoading}
                schoolPageError={schoolPageError}
                onChangeManagement={setSelectedManagementId}
                onPrevPage={() => setSchoolPage((c) => Math.max(1, c - 1))}
                onNextPage={() => setSchoolPage((c) => Math.min(schoolSelectorPagination.totalPages, c + 1))}
              />
              <StockAttentionBadge
                lowStock={selectedManagement.resumo.itensBaixoEstoque}
                expired={selectedManagement.resumo.itensVencidos}
              />
            </div>
          )}
        />

        {/* ── SUMMARY CARDS ── */}
        <div className="mv-item grid gap-4">
          <StockBudgetOverview management={selectedManagement} networkSpent={networkSummary.value} />

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={<Building2 className="h-4 w-4" />}
              label="Escolas ativas"
              value={String(networkSummary.schools)}
              sub="Com gestão alimentar"
              accentClass="bg-blue-500"
              iconClass="bg-blue-50 text-blue-600"
            />
            <MetricCard
              icon={<Wallet className="h-4 w-4" />}
              label="Gasto na rede"
              value={formatCurrency(networkSummary.value)}
              sub={`${formatCurrency(networkSummary.available)} disponível`}
              accentClass="bg-indigo-500"
              iconClass="bg-indigo-50 text-indigo-600"
            />
            <MetricCard
              icon={<PackageCheck className="h-4 w-4" />}
              label="Lotes em estoque"
              value={String(selectedStock.length)}
              sub="Registros ativos"
              accentClass="bg-violet-500"
              iconClass="bg-violet-50 text-violet-600"
            />
            <MetricCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Alertas"
              value={String(selectedManagement.resumo.itensBaixoEstoque + selectedManagement.resumo.itensVencidos)}
              sub={(selectedManagement.resumo.itensBaixoEstoque + selectedManagement.resumo.itensVencidos) > 0 ? 'Itens vencidos ou em falta' : 'Tudo em ordem'}
              accentClass={(selectedManagement.resumo.itensBaixoEstoque + selectedManagement.resumo.itensVencidos) > 0 ? 'bg-amber-500' : 'bg-emerald-500'}
              iconClass={(selectedManagement.resumo.itensBaixoEstoque + selectedManagement.resumo.itensVencidos) > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}
            />
          </section>
        </div>

        {/* ── TABS + CONTENT ── */}
        <div className="mv-item grid gap-2">
          <TabBar tabs={mealTabs} active={activeMealTab} onChange={setActiveMealTab} />

          <AnimatePresence mode="wait" initial={false}>
            {activeMealTab === 'stock' && (
              <motion.div
                key="stock"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="grid gap-4"
              >
                <StockItemsPanel
                  rows={selectedStockRows}
                  onOpenAll={() => setStockOverviewModal({ management: selectedManagement, schoolName: selectedSchool?.name ?? 'Escola' })}
                  onSelect={(row) => setStockDetail({ stock: row.stock, food: row.food, supplierName: row.item?.fornecedor.nome })}
                />

                {canManagePurchases && (
                  <PurchaseForm management={selectedManagement} onSearchFoods={onSearchFoods} onCreateItem={onCreateItem} />
                )}
              </motion.div>
            )}

            {activeMealTab === 'calendar' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <MenuCalendarTabs management={selectedManagement} schoolName={selectedSchool?.name ?? 'Escola'} />
              </motion.div>
            )}

            {activeMealTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="grid items-start gap-4"
              >
                <FoodRequestsPanel
                  requests={selectedFoodRequests}
                  isDirector={isDirector}
                  isAdmin={isAdmin}
                  onShowMovements={() => setMovementsModal({ management: selectedManagement, schoolName: selectedSchool?.name ?? 'Escola' })}
                  onEditClick={(request) => setFoodRequestDraft(request)}
                  onAddToStockClick={(request) => setStockRequestModal(request)}
                />
                {(isDirector || isAdmin) && (
                  <FoodRequestInlineForm
                    schoolId={selectedSchoolId}
                    request={foodRequestDraft}
                    onCancelEdit={() => setFoodRequestDraft(null)}
                    onSearchFoods={onSearchFoods}
                    onCreate={onCreateFoodRequest}
                    onUpdate={onUpdateFoodRequest}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MODALS ── */}
      {stockRequestModal && (
        <AddRequestToStockModal request={stockRequestModal} schoolName={selectedSchool?.name ?? 'Escola'}
          onClose={() => setStockRequestModal(null)} onConfirm={onAddFoodRequestToStock} />
      )}
      {movementsModal && (
        <MovementsModal management={movementsModal.management} schoolName={movementsModal.schoolName} onClose={() => setMovementsModal(null)} />
      )}
      {stockOverviewModal && (
        <StockOverviewModal
          management={stockOverviewModal.management}
          schoolName={stockOverviewModal.schoolName}
          canManagePurchases={canManagePurchases}
          onClose={() => setStockOverviewModal(null)}
          onShowMovements={() => {
            const target = stockOverviewModal
            setStockOverviewModal(null)
            setMovementsModal({ management: target.management, schoolName: target.schoolName })
          }}
          onNewItem={() => setStockOverviewModal(null)}
        />
      )}
      {stockDetail && (
        <StockDetailModal stock={stockDetail.stock} food={stockDetail.food} supplierName={stockDetail.supplierName} onClose={() => setStockDetail(null)} />
      )}
    </>
  )
}
