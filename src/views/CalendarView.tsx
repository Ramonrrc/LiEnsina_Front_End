import { FormEvent, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { z } from 'zod'
import {
  ChevronLeft, ChevronRight, Clock, MapPin,
  Plus, RefreshCcw, Check, Trash2, X, XCircle,
  School, Users, BookOpen, Flag, GraduationCap,
  Filter, SlidersHorizontal, CalendarDays, AlertTriangle,
  Pen, CalendarCheck, CalendarClock,
  CheckCircle2, RotateCcw, Search,
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import DateInput from '../components/ui/date-input'
import { FieldMessage, fieldStateClass, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { formatClassGrade } from '../class-grade-options'
import { getAcademicSubjectLabel } from '../components/role-portal/portal-components'
import type {
  CalendarEventType,
  ClassRoom,
  Evaluation,
  Role,
  School as SchoolModel,
  SchoolCalendarEvent,
  UserAccount,
} from '../types'

/* ─────────────────────────────────────────────
   Calendar setup
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   Types & Constants
───────────────────────────────────────────── */
type VisualEventType = CalendarEventType | 'feriado' | 'simulado'
type VisualEventSource = 'school' | 'holiday' | 'evaluation'

type CalendarFormState = {
  title: string
  type: CalendarEventType
  schoolId: string
  classId: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: boolean
  location: string
  description: string
}
type CalendarFormField = keyof CalendarFormState

const calendarFormSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título do evento.'),
  type: z.enum(['aula', 'reuniao', 'avaliacao', 'prazo', 'evento']),
  schoolId: z.string().trim().min(1, 'Selecione uma escola para o evento.'),
  classId: z.string().trim(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data inicial válida.'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Informe um horário inicial válido.'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data final válida.'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Informe um horário final válido.'),
  allDay: z.boolean(),
  location: z.string().trim().max(120, 'Local deve ter no máximo 120 caracteres.'),
  description: z.string().trim().max(500, 'Descrição deve ter no máximo 500 caracteres.'),
})

type BrazilHoliday = {
  date: string
  name: string
  type: string
}

type VisualCalendarEvent = {
  id: string
  source: VisualEventSource
  sourceId: string
  title: string
  type: VisualEventType
  startsAt: string
  endsAt: string
  allDay: boolean
  schoolId?: string | null
  classId?: string | null
  createdById?: string
  location?: string
  description?: string
}

type DetailModalState = {
  date: string
  events: VisualCalendarEvent[]
}

interface CalendarViewProps {
  currentUser: UserAccount
  currentRole: Role | null
  calendarEvents: SchoolCalendarEvent[]
  schools: SchoolModel[]
  classes: ClassRoom[]
  evaluations: Evaluation[]
  onCreate: (draft: Partial<SchoolCalendarEvent>) => Promise<void>
  onUpdate: (id: string, draft: Partial<SchoolCalendarEvent>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const eventTypes: Array<{ value: CalendarEventType; label: string }> = [
  { value: 'evento',    label: 'Evento escolar' },
  { value: 'aula',     label: 'Aula especial' },
  { value: 'reuniao',  label: 'Reunião' },
  { value: 'avaliacao',label: 'Avaliação' },
  { value: 'prazo',    label: 'Prazo' },
]

const visualTypeLabels: Record<VisualEventType, string> = {
  evento:    'Evento',
  aula:      'Aula especial',
  reuniao:   'Reunião',
  avaliacao: 'Avaliação',
  prazo:     'Prazo',
  feriado:   'Feriado',
  simulado:  'Simulado',
}

const calendarTimeOptions: CompactSelectOption[] = Array.from({ length: 23 }, (_, index) => {
  const totalMinutes = 7 * 60 + index * 30
  const hour = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const value = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  return { value, label: `${hour}:${String(minutes).padStart(2, '0')}` }
})
const calendarStartTimeOptions = calendarTimeOptions.slice(0, -1)

function getNextCalendarTime(time: string) {
  const currentIndex = calendarTimeOptions.findIndex((option) => option.value === time)
  if (currentIndex < 0) return '07:30'
  return calendarTimeOptions[Math.min(currentIndex + 1, calendarTimeOptions.length - 1)]?.value ?? '07:30'
}

function getCalendarEndTimeOptions(startTime: string, sameDay: boolean) {
  return sameDay ? calendarTimeOptions.filter((option) => option.value > startTime) : calendarTimeOptions
}

function isCalendarStartTime(value: string) {
  return calendarStartTimeOptions.some((option) => option.value === value)
}

function isCalendarTime(value: string) {
  return calendarTimeOptions.some((option) => option.value === value)
}

const calendarColors: Record<VisualEventType, { main: string; bg: string; text: string }> = {
  evento:    { main: '#2563eb', bg: '#dbeafe', text: '#1e40af' }, // blue-100
  aula:      { main: '#16a34a', bg: '#dcfce7', text: '#15803d' }, // green-100
  reuniao:   { main: '#7c3aed', bg: '#ede9fe', text: '#6d28d9' }, // violet-100
  avaliacao: { main: '#d97706', bg: '#fef3c7', text: '#b45309' }, // amber-100
  prazo:     { main: '#dc2626', bg: '#fee2e2', text: '#b91c1c' }, // red-100
  feriado:   { main: '#dc2626', bg: '#fee2e2', text: '#b91c1c' }, // red-100
  simulado:  { main: '#0d9488', bg: '#ccfbf1', text: '#0f766e' }, // teal-100
}

type CalendarFilterKey = VisualEventType | 'hoje'

type CalendarMonthCell = {
  key: string
  date: string
  day: number
  month: number
  year: number
  otherMonth: boolean
}

const calendarDayLabels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
const calendarMonthLabels = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const defaultCalendarFilterKeys: CalendarFilterKey[] = [
  'hoje', 'evento', 'aula', 'reuniao', 'avaliacao', 'prazo', 'feriado', 'simulado',
]
const calendarFilterDefs: Array<{ key: CalendarFilterKey; label: string; color?: string; ring?: boolean }> = [
  { key: 'hoje', label: 'hoje', ring: true },
  { key: 'evento', label: visualTypeLabels.evento, color: calendarColors.evento.main },
  { key: 'aula', label: visualTypeLabels.aula, color: calendarColors.aula.main },
  { key: 'reuniao', label: visualTypeLabels.reuniao, color: calendarColors.reuniao.main },
  { key: 'avaliacao', label: visualTypeLabels.avaliacao, color: calendarColors.avaliacao.main },
  { key: 'prazo', label: visualTypeLabels.prazo, color: calendarColors.prazo.main },
  { key: 'feriado', label: visualTypeLabels.feriado, color: calendarColors.feriado.main },
  { key: 'simulado', label: visualTypeLabels.simulado, color: calendarColors.simulado.main },
]

/* ─────────────────────────────────────────────
   Utils
───────────────────────────────────────────── */
async function buscarFeriados(ano: number): Promise<BrazilHoliday[]> {
  const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`)
  if (!response.ok) throw new Error('Não foi possível carregar os feriados nacionais.')
  return response.json()
}

function toDateInput(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function createEmptyForm(schoolId = '', classId = ''): CalendarFormState {
  const today = toDateInput()
  return {
    title: '', type: 'evento', schoolId, classId,
    startDate: today, startTime: '08:00',
    endDate: today,   endTime: '09:00',
    allDay: false, location: '', description: '',
  }
}

function splitDateTime(value: string, fallbackTime: string) {
  return { date: value.slice(0, 10), time: value.includes('T') ? value.slice(11, 16) : fallbackTime }
}

function padCalendarNumber(value: number) {
  return String(value).padStart(2, '0')
}

function calendarDateKey(year: number, month: number, day: number) {
  return `${year}-${padCalendarNumber(month + 1)}-${padCalendarNumber(day)}`
}

function todayCalendarKey() {
  const today = new Date()
  return calendarDateKey(today.getFullYear(), today.getMonth(), today.getDate())
}

function buildCalendarMonthCells(monthDate: Date): CalendarMonthCell[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPreviousMonth = new Date(year, month, 0).getDate()
  const cells: CalendarMonthCell[] = []

  for (let index = 0; index < firstWeekday; index += 1) {
    const day = daysInPreviousMonth - firstWeekday + index + 1
    const previousMonth = month - 1
    const cellMonth = previousMonth < 0 ? 11 : previousMonth
    const cellYear = previousMonth < 0 ? year - 1 : year
    cells.push({
      key: `prev-${cellYear}-${cellMonth}-${day}`,
      date: calendarDateKey(cellYear, cellMonth, day),
      day,
      month: cellMonth,
      year: cellYear,
      otherMonth: true,
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      key: `current-${year}-${month}-${day}`,
      date: calendarDateKey(year, month, day),
      day,
      month,
      year,
      otherMonth: false,
    })
  }

  while (cells.length % 7 !== 0) {
    const day = cells.length - firstWeekday - daysInMonth + 1
    const nextMonth = month + 1
    const cellMonth = nextMonth > 11 ? 0 : nextMonth
    const cellYear = nextMonth > 11 ? year + 1 : year
    cells.push({
      key: `next-${cellYear}-${cellMonth}-${day}`,
      date: calendarDateKey(cellYear, cellMonth, day),
      day,
      month: cellMonth,
      year: cellYear,
      otherMonth: true,
    })
  }

  return cells
}

function formatUpcomingDate(value: string) {
  const d = new Date(`${value.slice(0, 10)}T12:00:00`)
  return {
    day: d.getDate().toString(),
    mon: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  }
}

function timeLabel(event: VisualCalendarEvent) {
  if (event.allDay) return 'Dia inteiro'
  const start = splitDateTime(event.startsAt, '00:00').time
  const end   = splitDateTime(event.endsAt,   '23:59').time
  return `${start} – ${end}`
}

function dateLabel(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function fullDateLabel(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`)
    .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

function mobileDateParts(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return {
    day: date.toLocaleDateString('pt-BR', { day: '2-digit' }),
    month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    weekday: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
  }
}

function eventDateRangeLabel(event: VisualCalendarEvent) {
  const startDate = event.startsAt.slice(0, 10)
  const endDate = event.endsAt.slice(0, 10)
  return startDate === endDate ? dateLabel(event.startsAt) : `${dateLabel(event.startsAt)} - ${dateLabel(event.endsAt)}`
}

/* ─────────────────────────────────────────────
   Eyebrow label (from file 2 style)
───────────────────────────────────────────── */
function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold tracking-[.16em] uppercase text-stone-400 font-DMSans ${className}`}>
      {children}
    </p>
  )
}

/* ─────────────────────────────────────────────
   Bone (shimmer skeleton from file 2)
───────────────────────────────────────────── */
function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-stone-200 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Metric Card Skeleton
───────────────────────────────────────────── */
function SkeletonMetric() {
  return (
    <div className="rounded-2xl border border-stone-300 bg-white p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <Bone className="h-2.5 w-20 rounded" />
        <Bone className="h-8 w-8 rounded-xl" />
      </div>
      <Bone className="h-7 w-12 rounded" />
      <Bone className="h-2 w-28 rounded" />
    </div>
  )
}

function SkeletonUpcoming() {
  return (
    <div className="flex items-center gap-3 min-w-[240px] w-[260px] border border-stone-300 rounded-xl bg-white px-4 py-3 flex-shrink-0 shadow-sm">
      <div className="flex flex-col items-center min-w-[36px] gap-1.5">
        <Bone className="h-6 w-7 rounded" />
        <Bone className="h-2 w-8 rounded" />
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <Bone className="h-3 w-36 rounded" />
        <Bone className="h-2.5 w-24 rounded" />
      </div>
      <Bone className="h-2.5 w-2.5 rounded-full" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Metric card (file 2 style)
───────────────────────────────────────────── */
type CronogramaCalendarProps = {
  currentMonth: Date
  activeFilters: Set<CalendarFilterKey>
  canCreateEvent: boolean
  showCreateEventActions: boolean
  createEventHint: string
  eventsForDate: (date: string) => VisualCalendarEvent[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onToggleFilter: (filter: CalendarFilterKey) => void
  onCreateEvent: () => void
  onDayClick: (date: string, events: VisualCalendarEvent[]) => void
  onEventClick: (date: string, event: VisualCalendarEvent) => void
}

function CronogramaCalendar({
  currentMonth,
  activeFilters,
  canCreateEvent,
  showCreateEventActions,
  createEventHint,
  eventsForDate,
  onPrevMonth,
  onNextMonth,
  onToggleFilter,
  onCreateEvent,
  onDayClick,
  onEventClick,
}: CronogramaCalendarProps) {
  const todayKey = todayCalendarKey()
  const monthCells = useMemo(() => buildCalendarMonthCells(currentMonth), [currentMonth])
  const monthName = calendarMonthLabels[currentMonth.getMonth()]
  const visibleYear = currentMonth.getFullYear()
  const maxVisibleEvents = 4

  return (
    <div className="flex w-full max-w-full flex-col justify-center overflow-hidden rounded-xl border border-[#e2e0da] bg-[#f4f3ef] px-2.5 py-3 font-DMSans sm:rounded-2xl sm:px-7 sm:py-7">
      <div className="mb-3 flex flex-col items-stretch gap-2.5 sm:mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-[24px] font-black leading-none tracking-normal text-[#1a1814] sm:text-[32px]">
            <span className="rounded-md bg-[#5b4fe8] px-2 py-0.5 text-white">calen</span>dário
          </h1>
          <p className="mt-1 max-w-xl text-[11px] italic text-[#7a776e] sm:mt-1.5 sm:text-[12px]">
            Clique em um dia para ver horario, progresso e onde a turma parou.
          </p>
        </div>
        {showCreateEventActions && (
          <button
            type="button"
            onClick={onCreateEvent}
            disabled={!canCreateEvent}
            title={createEventHint}
            className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-indigo-500 bg-indigo-600 px-3 text-[12px] font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:border-[#d6d3cc] disabled:bg-white disabled:text-[#9d9a93] sm:w-auto"
          >
            <Plus size={14} /> Novo evento
          </button>
        )}
      </div>

      <div className="mb-2.5 flex items-center justify-center gap-2 sm:mb-3 sm:gap-4">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Mes anterior"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d6d3cc] text-[#5c5952] transition hover:bg-[#ebe9e3]"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="text-[15px] font-bold tracking-normal text-[#1a1814] sm:text-[18px]">
          <span className="mr-1 rounded-md bg-[#5b4fe8] px-2 py-0.5 font-black italic text-white sm:mr-1.5">
            {monthName}
          </span>
          {visibleYear}
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Proximo mes"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#d6d3cc] text-[#5c5952] transition hover:bg-[#ebe9e3]"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="mb-2.5 flex flex-wrap items-center gap-1 rounded-[10px] border border-[#e2e0da] bg-white px-2 py-1.5 sm:mb-3 sm:px-2.5">
        {calendarFilterDefs.map((filter) => {
          const isActive = activeFilters.has(filter.key)
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => onToggleFilter(filter.key)}
              className={`inline-flex select-none items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition
                ${isActive
                  ? 'border-[#bbb8b0] text-[#1a1814]'
                  : 'border-[#e2e0da] text-[#6b6860] opacity-40 hover:opacity-70'}
                bg-[#faf9f7] hover:border-[#c8c5be] hover:bg-[#ece9e3]`}
            >
              {filter.ring ? (
                <span className="h-2 w-2 rounded-full border-2 border-[#5b4fe8]" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: filter.color }} />
              )}
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className="w-full max-w-full overflow-hidden">
        <div className="w-full min-w-0">
          <div className="grid grid-cols-7">
            {calendarDayLabels.map((day) => (
              <div key={day} className="pb-1.5 text-center text-[9px] font-bold uppercase tracking-[0.08em] text-[#9d9a93] sm:pb-2 sm:text-[10px] sm:tracking-[0.12em]">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-t border-[#e2e0da]">
            {monthCells.map((cell) => {
              const dayEvents = eventsForDate(cell.date)
              const visibleEvents = dayEvents.slice(0, maxVisibleEvents)
              const hiddenCount = dayEvents.length - visibleEvents.length
              const isToday = cell.date === todayKey && activeFilters.has('hoje')

              return (
                <div
                key={cell.key}
                role="button"
                tabIndex={0}
                onClick={() => onDayClick(cell.date, dayEvents)}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                    keyEvent.preventDefault()
                    onDayClick(cell.date, dayEvents)
                  }
                }}
                className={`relative min-h-[72px] cursor-pointer overflow-hidden border-b border-r border-[#e2e0da] p-0 text-left transition hover:bg-[#f0eeea] sm:min-h-[122px]
                  ${cell.otherMonth ? 'bg-[#f6f3f7]' : 'bg-[#f9f7fa]'}`}
              >
                  <div className="relative flex h-full min-h-[72px] flex-col gap-1 px-1.5 py-1.5 sm:min-h-[112px] sm:gap-1 sm:px-2 sm:py-2">
                    {isToday && (
                    <span className="pointer-events-none absolute left-1/2 top-1/2 z-[2] aspect-square w-[min(calc(100%_-_8px),2.8rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#5b4fe8] sm:w-[min(calc(100%_-_14px),9.5rem)]" />
                  )}
                  <span
                    className={`relative z-[5] mb-0.5 block font-['Lora',serif] text-[10px] leading-none sm:mb-1 sm:text-[11px]
                      ${isToday ? 'font-extrabold text-[#5b4fe8]' : cell.otherMonth ? 'text-[#c5c2bb]' : 'text-[#8a877f]'}
                      ${isToday ? 'font-extrabold' : 'font-semibold'}`}
                  >
                    {cell.day}
                  </span>
                  <span
                    className={isToday
                      ? "absolute left-1/2 top-1/2 z-[3] flex w-[min(calc(100%_-_12px),2.6rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-stretch justify-center gap-[3px] overflow-hidden sm:w-[min(calc(100%_-_38px),7.75rem)] sm:gap-0.5"
                      : "relative z-[3] flex flex-1 flex-col gap-[3px] overflow-hidden sm:gap-0.5"}
                  >
                    {isToday && visibleEvents.length === 0 && (
                      <span className="pointer-events-none truncate text-center font-DMSans text-[8px] font-semibold uppercase tracking-[0.08em] text-black sm:text-[11px] sm:tracking-[0.14em]">
                        Hoje
                      </span>
                    )}
                    {visibleEvents.map((event) => {
                      const color = calendarColors[event.type]
                      return (
                        <span
                          key={event.id}
                          role="button"
                          tabIndex={0}
                          title={event.title}
                          aria-label={`${visualTypeLabels[event.type]}: ${event.title}`}
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation()
                            onEventClick(cell.date, event)
                          }}
                          onKeyDown={(keyEvent) => {
                            if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                              keyEvent.preventDefault()
                              keyEvent.stopPropagation()
                              onEventClick(cell.date, event)
                            }
                          }}
                          className="flex h-2.5 w-full min-w-0 items-center overflow-hidden whitespace-nowrap rounded-[5px] border px-0.5 py-0 text-[0px] font-bold leading-none shadow-sm transition hover:opacity-85 sm:h-auto sm:gap-1.5 sm:rounded-md sm:px-2 sm:py-1.5 sm:text-[10px] sm:leading-tight"
                          style={{ background: color.bg, color: color.text, borderColor: color.main }}
                        >
                          <span className="hidden h-2 w-2 flex-shrink-0 rounded-full opacity-90 sm:block" style={{ background: color.main }} />
                          <span className="hidden min-w-0 flex-1 truncate sm:block">
                            {visualTypeLabels[event.type]}: {event.title}
                          </span>
                        </span>
                      )
                    })}
                    {hiddenCount > 0 && (
                      <span className="relative truncate whitespace-nowrap px-0 text-center text-[8px] font-semibold leading-none text-[#9d9a93] sm:px-1 sm:py-0.5 sm:text-[9px]">
                        +{hiddenCount} mais
                      </span>
                    )}
                  </span>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label, value, sub, icon, iconBg, delay = 0,
}: {
  label: string; value: string | number; sub: string
  icon: React.ReactNode; iconBg: string; delay?: number
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="cv-metric-card bg-white border border-stone-300 rounded-2xl p-4 flex flex-col gap-2 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
    >
      <div className="flex items-center justify-between">
        <Eyebrow>{label}</Eyebrow>
        <span className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </span>
      </div>
      <strong className="font-['Lora'] text-3xl font-bold text-stone-900 leading-none">{value}</strong>
      <span className="text-[11px] text-stone-400 font-DMSans">{sub}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Filter group
───────────────────────────────────────────── */
function FilterGroup({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center gap-1.5 bg-white border border-stone-300 rounded-lg px-2.5 py-1 transition-all hover:border-stone-400">
      <span className="flex items-center text-stone-400 flex-shrink-0">{icon}</span>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Toast (from file 2)
───────────────────────────────────────────── */
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200 font-DMSans shadow-sm
      ${type === 'error'
        ? 'border-rose-400 bg-rose-50 text-rose-800'
        : 'border-emerald-400 bg-emerald-50 text-emerald-800'}`}>
      {type === 'error'
        ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
        : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} className="shrink-0 rounded p-0.5 hover:bg-black/5 transition">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Modal wrapper (light theme, file 2 accent)
───────────────────────────────────────────── */
function Modal({
  id, title, subtitle, description, onClose, children, maxWidth = '680px',
  placement = 'top', compact = false,
}: {
  id: string; title: string; subtitle: string; description?: string
  onClose: () => void; children: React.ReactNode; maxWidth?: string
  placement?: 'top' | 'center'; compact?: boolean
}) {
  const backdropPos = placement === 'center' ? 'items-center py-4 sm:py-5' : 'items-start py-6 sm:py-8'
  const modal = (
    <div
      role="presentation"
      onMouseDown={onClose}
      className={`fixed inset-0 z-[1000] flex justify-center overflow-y-auto px-4 sm:px-5 ${backdropPos}`}
      style={{ background: 'rgba(15,23,42,0.2)', backdropFilter: 'blur(6px)' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-h-[calc(100svh-48px)] overflow-y-auto rounded-2xl border border-stone-300 bg-white shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-3 duration-200 fill-mode-both"
        style={{ maxWidth }}
      >
        {/* Gradient strip */}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className={`sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-stone-200 bg-white ${compact ? 'px-5 py-4' : 'px-6 py-5'}`}>
          <div>
            <p className="text-[10px] font-semibold tracking-[.16em] uppercase text-indigo-500 font-DMSans">{subtitle}</p>
            <h2 id={id} className={`font-['Lora'] font-bold text-stone-900 mt-0.5 ${compact ? 'text-lg' : 'text-xl'}`}>{title}</h2>
            {description && <p className={`text-stone-400 mt-0.5 font-DMSans ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}

/* ─────────────────────────────────────────────
   Input / label classes (file 2 style)
───────────────────────────────────────────── */
const inputCls =
  'w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 appearance-none font-DMSans'

const compactInputCls =
  'w-full h-8 min-h-8 bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-[12px] font-semibold text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 appearance-none font-DMSans'

const compactSelectCls =
  `${compactInputCls} !min-h-8 !px-2.5 !gap-1.5 !text-[12px] [&_span]:!text-[12px] [&_svg]:!h-3.5 [&_svg]:!w-3.5`

const toolbarSelectCls =
  'bg-transparent !min-h-7 !border-0 !shadow-none !px-0 !gap-1.5 outline-none text-[12px] font-semibold text-stone-900 cursor-pointer appearance-none disabled:cursor-not-allowed disabled:text-stone-400 font-DMSans [&_span]:!text-[12px] [&_svg]:!h-3.5 [&_svg]:!w-3.5'

const compactSelectOptionCls =
  '!rounded-lg !px-2.5 !py-1.5'

const labelCls =
  'text-[10px] font-semibold tracking-[.16em] uppercase text-stone-400 font-DMSans'

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function CalendarView({
  currentUser, currentRole,
  calendarEvents, schools, classes, evaluations,
  onCreate, onUpdate, onDelete,
}: CalendarViewProps) {
  const roleCode = (currentRole?.code ?? currentRole?.name ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
  const isAdminAccess = roleCode.includes('ADMIN')
  const isProfessorAccess = roleCode.includes('PROFESSOR')
  const isStudentAccess = roleCode.includes('ALUNO')
  const isGuardianAccess = roleCode.includes('RESPONSAVEL') || roleCode.includes('GUARDIAN')
  const isFamilyScopedAccess = isStudentAccess || isGuardianAccess
  const linkedProfessorClasses = useMemo(
    () => isProfessorAccess ? classes : [],
    [classes, isProfessorAccess],
  )
  const linkedProfessorClassIds = useMemo(
    () => new Set(linkedProfessorClasses.map((c) => c.id)),
    [linkedProfessorClasses],
  )
  const currentCreatorIds = useMemo(
    () => new Set([
      currentUser.id, currentUser.linkedTeacherId,
      currentUser.linkedStudentId, currentUser.linkedGuardianId,
    ].filter((id): id is string => Boolean(id))),
    [currentUser],
  )
  const hasCalendarAccess = isAdminAccess || isProfessorAccess
  const accessibleSchools = useMemo(() => {
    if (isAdminAccess) return schools
    if (!isProfessorAccess) return schools
    const ids = new Set(linkedProfessorClasses.map((c) => c.schoolId))
    if (ids.size === 0 && currentUser.schoolId) ids.add(currentUser.schoolId)
    if (ids.size === 0) return schools
    return schools.filter((s) => ids.has(s.id))
  }, [currentUser.schoolId, isAdminAccess, isProfessorAccess, linkedProfessorClasses, schools])

  const canCreateEvent = isAdminAccess || (isProfessorAccess && accessibleSchools.length > 0)
  const showCreateEventActions = hasCalendarAccess
  const createEventHint = canCreateEvent
    ? 'Crie eventos, reuniões, prazos e muito mais.'
    : isProfessorAccess
      ? 'Vincule uma escola ao professor para liberar novos eventos.'
      : 'Apenas Admin e Professor podem criar eventos.'

  const professorDefaultSchoolId = linkedProfessorClasses[0]?.schoolId ?? accessibleSchools[0]?.id ?? currentUser.schoolId ?? ''
  const defaultSchoolId = isProfessorAccess ? professorDefaultSchoolId : ''
  const defaultClassId = ''
  const defaultSchoolFilter = isProfessorAccess
    ? professorDefaultSchoolId
    : isFamilyScopedAccess && accessibleSchools.length === 1
      ? accessibleSchools[0]?.id ?? 'all'
      : 'all'

  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<CalendarFormState>(() => createEmptyForm(defaultSchoolId, defaultClassId))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [detailModal, setDetailModal] = useState<DetailModalState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VisualCalendarEvent | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [schoolFilter, setSchoolFilter] = useState(defaultSchoolFilter)
  const [classFilter, setClassFilter] = useState('all')
  const [year, setYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [activeCalendarFilters, setActiveCalendarFilters] = useState<Set<CalendarFilterKey>>(
    () => new Set(defaultCalendarFilterKeys),
  )
  const [holidays, setHolidays] = useState<BrazilHoliday[]>([])
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false)
  const [holidayError, setHolidayError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [formFieldErrors, setFormFieldErrors] = useState<FieldErrors<CalendarFormField>>({})
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t) }, [])

  useEffect(() => {
    if (!isProfessorAccess) return
    const hasSelected = accessibleSchools.some((s) => s.id === schoolFilter)
    if (!hasSelected && professorDefaultSchoolId) {
      setSchoolFilter(professorDefaultSchoolId); setClassFilter('all')
    }
  }, [accessibleSchools, isProfessorAccess, professorDefaultSchoolId, schoolFilter])

  useEffect(() => {
    if (isProfessorAccess) return
    if (isFamilyScopedAccess && accessibleSchools.length === 1) {
      const onlyId = accessibleSchools[0].id
      if (schoolFilter !== onlyId) { setSchoolFilter(onlyId); setClassFilter('all') }
      return
    }
    const hasSelected = schoolFilter === 'all' || accessibleSchools.some((s) => s.id === schoolFilter)
    if (!hasSelected) { setSchoolFilter('all'); setClassFilter('all') }
  }, [accessibleSchools, isFamilyScopedAccess, isProfessorAccess, schoolFilter])

  useEffect(() => {
    if (!isProfessorAccess) return
    setDraft((current) => {
      const classStillAllowed = !current.classId || linkedProfessorClasses.some((classRoom) => classRoom.id === current.classId && classRoom.schoolId === professorDefaultSchoolId)
      if (current.schoolId === professorDefaultSchoolId && classStillAllowed) return current
      return { ...current, schoolId: professorDefaultSchoolId, classId: '' }
    })
  }, [isProfessorAccess, linkedProfessorClasses, professorDefaultSchoolId])

  useEffect(() => {
    if (!draft.schoolId && defaultSchoolId) setDraft((c) => ({ ...c, schoolId: defaultSchoolId, classId: defaultClassId }))
  }, [defaultClassId, defaultSchoolId, draft.schoolId])

  useEffect(() => {
    if (schoolFilter === 'all' || !schoolFilter) { if (classFilter !== 'all') setClassFilter('all'); return }
    const ok = classes.some((c) => {
      const allowed = !isProfessorAccess || linkedProfessorClassIds.has(c.id)
      return allowed && c.schoolId === schoolFilter && c.id === classFilter
    })
    if (classFilter !== 'all' && !ok) setClassFilter('all')
  }, [classFilter, classes, isProfessorAccess, linkedProfessorClassIds, schoolFilter])

  useEffect(() => {
    const visibleYear = currentMonth.getFullYear()
    if (year !== visibleYear) setYear(visibleYear)
  }, [currentMonth, year])

  useEffect(() => {
    let cancelled = false
    setIsLoadingHolidays(true); setHolidayError(null)
    buscarFeriados(year)
      .then((items) => { if (!cancelled) setHolidays(items) })
      .catch((err) => { if (!cancelled) { setHolidays([]); setHolidayError(err instanceof Error ? err.message : 'Erro ao carregar feriados.') } })
      .finally(() => { if (!cancelled) setIsLoadingHolidays(false) })
    return () => { cancelled = true }
  }, [year])

  /* ── Derived data ── */
  const visualEvents = useMemo<VisualCalendarEvent[]>(() => {
    const evaluationEvents = evaluations.map((ev) => {
      const cr = classes.find((c) => c.id === ev.classId)
      return {
        id: `evaluation-${ev.id}`, source: 'evaluation' as const, sourceId: ev.id,
        title: ev.title, type: 'simulado' as const,
        startsAt: ev.scheduledAt, endsAt: ev.scheduledAt, allDay: true,
        schoolId: cr?.schoolId, classId: ev.classId,
        description: `${getAcademicSubjectLabel(ev.subject)} - ${ev.status.replace('_', ' ')}`,
      }
    })
    const holidayEvents = holidays.map((h, i) => ({
      id: `holiday-${h.date.replace(/-/g, '')}-${i}`, source: 'holiday' as const,
      sourceId: `${h.date}-${i}`, title: h.name, type: 'feriado' as const,
      startsAt: h.date, endsAt: h.date, allDay: true, description: h.type,
    }))
    const schoolEvents = calendarEvents.map((ev) => ({
      id: `school-${ev.id}`, source: 'school' as const, sourceId: ev.id,
      title: ev.title, type: ev.type,
      startsAt: ev.startsAt, endsAt: ev.endsAt, allDay: ev.allDay,
      schoolId: ev.schoolId, classId: ev.classId,
      createdById: ev.createdById, location: ev.location, description: ev.description,
    }))
    return [...schoolEvents, ...evaluationEvents, ...holidayEvents]
  }, [calendarEvents, classes, evaluations, holidays])

  const accessibleVisualEvents = useMemo(() => {
    if (isAdminAccess) return visualEvents
    if (!isProfessorAccess) return visualEvents
    const accessibleSchoolIds = new Set(accessibleSchools.map((s) => s.id))
    return visualEvents.filter((ev) => {
      if (ev.source === 'holiday') return true
      if (ev.classId) return linkedProfessorClassIds.has(ev.classId)
      return Boolean(ev.schoolId && accessibleSchoolIds.has(ev.schoolId))
    })
  }, [accessibleSchools, isAdminAccess, isProfessorAccess, linkedProfessorClassIds, visualEvents])

  const filteredVisualEvents = useMemo(
    () => accessibleVisualEvents.filter((ev) => {
      const matchesSchool = schoolFilter === 'all' || ev.source === 'holiday' || ev.schoolId === schoolFilter
      const matchesClass =
        classFilter === 'all' ||
        ev.source === 'holiday' ||
        ev.classId === classFilter ||
        (ev.schoolId === schoolFilter && !ev.classId)
      const matchesType = activeCalendarFilters.has(ev.type)
      return matchesSchool && matchesClass && matchesType
    }),
    [accessibleVisualEvents, activeCalendarFilters, classFilter, schoolFilter],
  )

  const visibleSchoolEventCount = useMemo(() => accessibleVisualEvents.filter((ev) => ev.source === 'school').length, [accessibleVisualEvents])
  const visibleEvaluationCount = useMemo(() => accessibleVisualEvents.filter((ev) => ev.source === 'evaluation').length, [accessibleVisualEvents])

  const upcomingEvents = useMemo(() => {
    const today = toDateInput()
    return [...filteredVisualEvents]
      .filter((ev) => ev.startsAt.slice(0, 10) >= today)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 10)
  }, [filteredVisualEvents])

  const mobileAgendaGroups = useMemo(() => {
    const groups = new Map<string, VisualCalendarEvent[]>()
    filteredVisualEvents
      .filter((ev) => ev.startsAt.slice(0, 4) === String(year) || ev.endsAt.slice(0, 4) === String(year))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title))
      .forEach((ev) => {
        const date = ev.startsAt.slice(0, 10)
        const current = groups.get(date) ?? []
        current.push(ev)
        groups.set(date, current)
      })
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({ date, events }))
  }, [filteredVisualEvents, year])

  const classesAvailableForSelectedSchool = useMemo(
    () => schoolFilter && schoolFilter !== 'all'
      ? classes.filter((c) => {
          const allowed = !isProfessorAccess || linkedProfessorClassIds.has(c.id)
          return allowed && c.schoolId === schoolFilter
        })
      : [],
    [classes, isProfessorAccess, linkedProfessorClassIds, schoolFilter],
  )

  const filteredClassesForDraft = useMemo(
    () => draft.schoolId
      ? classes.filter((c) => {
          const allowed = !isProfessorAccess || linkedProfessorClassIds.has(c.id)
          return allowed && c.schoolId === draft.schoolId
        })
      : [],
    [classes, draft.schoolId, isProfessorAccess, linkedProfessorClassIds],
  )

  const isSameDayEvent = draft.startDate === draft.endDate
  const calendarEndTimeOptions = useMemo(
    () => getCalendarEndTimeOptions(draft.startTime, isSameDayEvent),
    [draft.startTime, isSameDayEvent],
  )

  /* ── Select options ── */
  const schoolFilterOptions = useMemo<Array<CompactSelectOption<string>>>(() => {
    const allOpt = { value: 'all', label: isFamilyScopedAccess ? 'Todas as escolas dos filhos' : 'Todas as escolas' }
    const showAll = !isProfessorAccess && (!isFamilyScopedAccess || accessibleSchools.length !== 1)
    return [
      ...(showAll ? [allOpt] : []),
      ...accessibleSchools.map((s) => ({ value: s.id, label: s.name })),
    ]
  }, [accessibleSchools, isFamilyScopedAccess, isProfessorAccess])

  const classFilterOptions = useMemo<Array<CompactSelectOption<string>>>(() => {
    if (!schoolFilter || schoolFilter === 'all') return [{ value: 'all', label: 'Selecione uma escola primeiro', disabled: true }]
    return [
      { value: 'all', label: isProfessorAccess ? 'Eventos da escola' : 'Todas as turmas da escola' },
      ...classesAvailableForSelectedSchool.map((c) => ({
        value: c.id, label: c.name, description: `${formatClassGrade(c.grade)} · ${c.shift}`,
      })),
    ]
  }, [classesAvailableForSelectedSchool, isProfessorAccess, schoolFilter])

  const eventTypeOptions = useMemo<Array<CompactSelectOption<CalendarEventType>>>(
    () => eventTypes.map((t) => ({ value: t.value, label: t.label, swatch: calendarColors[t.value].main })),
    [],
  )

  const schoolOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: '', label: 'Selecione a escola' }, ...accessibleSchools.map((s) => ({ value: s.id, label: s.name }))],
    [accessibleSchools],
  )

  const classOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [
      {
        value: '', label: draft.schoolId
          ? isProfessorAccess ? 'Toda a escola' : 'Todas as turmas da escola'
          : 'Selecione uma escola primeiro',
        disabled: !draft.schoolId,
      },
      ...filteredClassesForDraft.map((c) => ({
        value: c.id, label: c.name, description: `${formatClassGrade(c.grade)} · ${c.shift}`,
      })),
    ],
    [draft.schoolId, filteredClassesForDraft, isProfessorAccess],
  )

  /* ── Helpers ── */
  function getSchoolName(id?: string | null) {
    return !id ? 'Rede municipal' : schools.find((s) => s.id === id)?.name ?? 'Escola não localizada'
  }
  function getClassName(id?: string | null) {
    return !id ? 'Todas as turmas' : classes.find((c) => c.id === id)?.name ?? 'Turma não localizada'
  }
  function eventMatchesDate(event: VisualCalendarEvent, date: string) {
    return event.startsAt.slice(0, 10) <= date && event.endsAt.slice(0, 10) >= date
  }
  function getEventsForDate(date: string) {
    return filteredVisualEvents
      .filter((ev) => eventMatchesDate(ev, date))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title))
  }
  function canEditSchoolEvent(event: Pick<SchoolCalendarEvent, 'createdById'> | VisualCalendarEvent) {
    if (isAdminAccess) return true
    return Boolean(event.createdById && currentCreatorIds.has(event.createdById))
  }

  /* ── Modal actions ── */
  function openDetailModal(date: string, events: VisualCalendarEvent[]) {
    if (events.length === 0) return
    setEditingId(null); setFormError(null); setFormFieldErrors({}); setIsEventModalOpen(false)
    setDetailModal({ date, events })
  }
  function closeDetailModal() { setDetailModal(null) }

  function editSchoolEventFromDetail(event: VisualCalendarEvent) {
    const schoolEvent = calendarEvents.find((item) => item.id === event.sourceId)
    if (!schoolEvent) return
    closeDetailModal(); startEditing(schoolEvent)
  }

  function deleteSchoolEventFromDetail(event: VisualCalendarEvent) {
    if (event.source !== 'school' || !canEditSchoolEvent(event)) return
    setDeleteTarget(event)
  }

  async function confirmDeleteSchoolEvent() {
    if (!deleteTarget || deleteTarget.source !== 'school' || !canEditSchoolEvent(deleteTarget)) return
    setDeletingEventId(deleteTarget.sourceId)
    try {
      await onDelete(deleteTarget.sourceId)
      setEditingId(null); setFormError(null)
      setDetailModal((current) => {
        if (!current) return current
        const remaining = current.events.filter((item) => item.id !== deleteTarget.id)
        return remaining.length > 0 ? { ...current, events: remaining } : null
      })
      setDeleteTarget(null)
      setNotice('Evento excluído com sucesso.')
    } finally {
      setDeletingEventId(null)
    }
  }

  function startEditing(event: SchoolCalendarEvent) {
    if (!canEditSchoolEvent(event)) { setFormError('Você não tem permissão para editar este evento.'); return }
    const start = splitDateTime(event.startsAt, '08:00')
    const end   = splitDateTime(event.endsAt, event.allDay ? '23:59' : '09:00')
    setEditingId(event.id); setDetailModal(null); setFormError(null); setFormFieldErrors({}); setIsEventModalOpen(true)
    setDraft({
      title: event.title, type: event.type, schoolId: event.schoolId,
      classId: event.classId ?? '', startDate: start.date, startTime: start.time,
      endDate: end.date, endTime: end.time, allDay: event.allDay,
      location: event.location, description: event.description,
    })
  }

  function openCreateModal() {
    if (!canCreateEvent) { setFormError('Seu acesso não permite criar eventos neste calendário.'); return }
    setEditingId(null); setDetailModal(null); setFormError(null); setFormFieldErrors({})
    setDraft(createEmptyForm(defaultSchoolId, defaultClassId)); setIsEventModalOpen(true)
  }

  function resetForm() {
    setEditingId(null); setDetailModal(null); setFormError(null); setFormFieldErrors({})
    setIsEventModalOpen(false); setDraft(createEmptyForm(defaultSchoolId, defaultClassId))
  }

  function validateDraftWithZod() {
    const parsed = calendarFormSchema.safeParse(draft)
    if (!parsed.success) {
      const errors = zodFieldErrors<CalendarFormField>(parsed.error)
      return { message: Object.values(errors)[0] ?? 'Revise os campos do evento.', errors }
    }
    const errors: FieldErrors<CalendarFormField> = {}
    if (draft.classId && !filteredClassesForDraft.some((c) => c.id === draft.classId)) errors.classId = 'Selecione uma turma disponível.'
    if (draft.endDate < draft.startDate) errors.endDate = 'A data final precisa ser igual ou posterior à data inicial.'
    if (!draft.allDay && !isCalendarStartTime(draft.startTime)) errors.startTime = 'Selecione um horário inicial entre 7:00 e 17:30.'
    if (!draft.allDay && !isCalendarTime(draft.endTime)) errors.endTime = 'Selecione um horário final entre 7:00 e 18:00.'
    if (!draft.allDay && draft.startDate === draft.endDate && draft.endTime <= draft.startTime) errors.endTime = 'O horário final precisa ser posterior ao inicial.'
    const message = Object.values(errors)[0]
    return message ? { message, errors } : null
  }

  function updateDraftField<K extends keyof CalendarFormState>(field: K, value: CalendarFormState[K]) {
    setFormFieldErrors((c) => ({ ...c, [field]: undefined }))
    setDraft((c) => ({ ...c, [field]: value }))
  }

  function handleStartTimeChange(startTime: string) {
    setFormFieldErrors((c) => ({ ...c, startTime: undefined, endTime: undefined }))
    setDraft((c) => ({
      ...c, startTime,
      endTime: c.startDate === c.endDate && c.endTime <= startTime ? getNextCalendarTime(startTime) : c.endTime,
    }))
  }

  function handleStartDateChange(startDate: string) {
    setFormFieldErrors((c) => ({ ...c, startDate: undefined, endDate: undefined, endTime: undefined }))
    setDraft((c) => {
      const endDate = c.endDate < startDate ? startDate : c.endDate
      const endTime = endDate === startDate && c.endTime <= c.startTime ? getNextCalendarTime(c.startTime) : c.endTime
      return { ...c, startDate, endDate, endTime }
    })
  }

  function handleEndDateChange(endDate: string) {
    setFormFieldErrors((c) => ({ ...c, endDate: undefined, endTime: undefined }))
    setDraft((c) => ({
      ...c, endDate,
      endTime: endDate === c.startDate && c.endTime <= c.startTime ? getNextCalendarTime(c.startTime) : c.endTime,
    }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validation = validateDraftWithZod()
    if (validation) { setFormError(validation.message); setFormFieldErrors(validation.errors); return }
    setFormError(null); setFormFieldErrors({})
    const payload: Partial<SchoolCalendarEvent> = {
      title: draft.title.trim(), type: draft.type, schoolId: draft.schoolId,
      classId: draft.classId || null,
      startsAt: draft.allDay ? draft.startDate : `${draft.startDate}T${draft.startTime}`,
      endsAt:   draft.allDay ? draft.endDate   : `${draft.endDate}T${draft.endTime}`,
      allDay: draft.allDay, location: draft.location.trim(), description: draft.description.trim(),
    }
    if (editingId) await onUpdate(editingId, payload)
    else await onCreate(payload)
    setNotice(editingId ? 'Evento atualizado com sucesso!' : 'Evento criado com sucesso!')
    resetForm()
  }

  function moveCalendarMonth(delta: number) {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  function setCalendarVisibleYear(nextYear: number) {
    const safeYear = Number.isFinite(nextYear) ? nextYear : new Date().getFullYear()
    setCurrentMonth((current) => new Date(safeYear, current.getMonth(), 1))
  }

  function moveCalendarYear(delta: number) {
    setCurrentMonth((current) => new Date(current.getFullYear() + delta, current.getMonth(), 1))
  }

  function resetCalendarToToday() {
    const today = new Date()
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  function toggleCalendarFilter(filter: CalendarFilterKey) {
    setActiveCalendarFilters((current) => {
      const next = new Set(current)
      if (next.has(filter)) next.delete(filter)
      else next.add(filter)
      return next
    })
  }

  function handleCalendarDayClick(date: string, events: VisualCalendarEvent[]) {
    openDetailModal(date, events)
  }

  function handleCalendarEventClick(date: string, event: VisualCalendarEvent) {
    openDetailModal(date, [event])
  }

  /* ── Render setup ── */
  /* ── Render ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes shimmer { to { transform: translateX(200%) } }
        .fill-mode-both { animation-fill-mode: both; }

        .cv-page * { box-sizing: border-box; }

        .cv-upcoming-card { transition: all 0.18s cubic-bezier(0.22,1,0.36,1); }
        .cv-upcoming-card:hover {
          border-color: #a8a29e;
          box-shadow: 0 4px 16px rgba(15,23,42,0.08);
          transform: translateY(-2px);
        }

        .cv-event-card { transition: all 0.18s cubic-bezier(0.22,1,0.36,1); }
        .cv-event-card:hover {
          box-shadow: 0 4px 20px rgba(15,23,42,0.10);
          transform: translateY(-1px);
        }

        @media (max-width: 767px) {
          .cv-desktop-calendar { display: block !important; }
          .cv-mobile-agenda { display: none !important; }
          .cv-metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .cv-header-actions { flex-direction: column; width: 100%; }
          .cv-filter-bar { flex-direction: column; width: 100%; }
          .cv-upcoming-list { flex-direction: column; overflow-x: visible; }
          .cv-upcoming-card { min-width: 0; width: 100%; }
        }

        .cv-mobile-agenda { display: none; }
      `}</style>

      <div className="cv-page font-DMSans text-stone-900 bg-stone-100 min-h-screen">

        {/* ══ HEADER ══ */}
        <div className="px-[clamp(16px,3vw,40px)] pt-5">
          <div className="animate-in fade-in slide-in-from-top-3 duration-500 fill-mode-both">
            <PageTitleBar
              label="Agenda da rede"
              title="Calendário escolar"
              icon={<CalendarDays />}
              actions={(
                <div className="cv-header-actions flex items-center gap-2 flex-wrap">
                  {/* Year nav */}
                  <div className="flex items-center bg-white border border-stone-300 rounded-xl overflow-hidden shadow-sm">
                    <button type="button" onClick={() => moveCalendarYear(-1)} aria-label="Ano anterior"
                      className="w-9 h-9 flex items-center justify-center text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors">
                      <ChevronLeft size={15} />
                    </button>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setCalendarVisibleYear(Number(e.target.value) || new Date().getFullYear())}
                      className="w-16 h-9 border-x border-stone-300 bg-white text-center text-[13px] font-bold text-stone-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none font-['Lora']"
                    />
                    <button type="button" onClick={() => moveCalendarYear(1)} aria-label="Próximo ano"
                      className="w-9 h-9 flex items-center justify-center text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors">
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  <button type="button" onClick={resetCalendarToToday}
                    className="inline-flex items-center gap-1.5 bg-white text-stone-500 border border-stone-300 text-[13px] font-semibold px-3 py-2 rounded-xl hover:border-stone-400 hover:text-stone-900 transition-all shadow-sm">
                    <RefreshCcw size={13} /> Hoje
                  </button>
                </div>
              )}
            />
          </div>
        </div>

        {/* ══ ALERTS ══ */}
        <div className="px-[clamp(16px,3vw,40px)] mt-4 space-y-3">
          {holidayError && (
            <Toast message={holidayError} type="error" onClose={() => setHolidayError(null)} />
          )}
          {notice && (
            <Toast message={notice} type="success" onClose={() => setNotice(null)} />
          )}
        </div>

        <div className="px-[clamp(16px,3vw,40px)] py-5 flex flex-col gap-5">

          {/* ══ METRICS ══ */}
          {loading ? (
            <div className="cv-metrics-grid grid grid-cols-4 max-[900px]:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <SkeletonMetric key={i} />)}
            </div>
          ) : (
            <div className="cv-metrics-grid grid grid-cols-4 max-[900px]:grid-cols-2 gap-3">

              {/* Eventos */}
              <div style={{ animationDelay: '0ms' }}
                className="group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both relative overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-transparent pointer-events-none" />
                <div className="relative flex flex-col gap-1 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <Eyebrow>Eventos</Eyebrow>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 border border-blue-200 text-blue-600 shrink-0">
                      <CalendarCheck size={14} />
                    </span>
                  </div>
                  <strong className="font-['Lora'] text-[28px] font-bold text-stone-900 leading-none tabular-nums">
                    {visibleSchoolEventCount}
                  </strong>
                  <span className="text-[11px] text-stone-400 leading-snug mt-0.5">Criados pela equipe escolar</span>
                  <div className="mt-2 h-0.5 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-400 transition-all duration-700"
                      style={{ width: visibleSchoolEventCount > 0 ? '100%' : '0%' }} />
                  </div>
                </div>
              </div>

              {/* Feriados */}
              <div style={{ animationDelay: '75ms' }}
                className="group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both relative overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-50/60 to-transparent pointer-events-none" />
                <div className="relative flex flex-col gap-1 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <Eyebrow>Feriados</Eyebrow>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 border border-rose-200 text-rose-600 shrink-0">
                      <Flag size={14} />
                    </span>
                  </div>
                  <strong className="font-['Lora'] text-[28px] font-bold text-stone-900 leading-none tabular-nums">
                    {holidays.length}
                  </strong>
                  <span className="text-[11px] text-stone-400 leading-snug mt-0.5">
                    {isLoadingHolidays ? 'Carregando...' : `Brasil ${year}`}
                  </span>
                  <div className="mt-2 h-0.5 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-rose-400 transition-all duration-700"
                      style={{ width: holidays.length > 0 ? '100%' : '0%' }} />
                  </div>
                </div>
              </div>

              {/* Simulados */}
              <div style={{ animationDelay: '150ms' }}
                className="group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both relative overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-50/60 to-transparent pointer-events-none" />
                <div className="relative flex flex-col gap-1 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <Eyebrow>Simulados</Eyebrow>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 border border-teal-200 text-teal-600 shrink-0">
                      <BookOpen size={14} />
                    </span>
                  </div>
                  <strong className="font-['Lora'] text-[28px] font-bold text-stone-900 leading-none tabular-nums">
                    {visibleEvaluationCount}
                  </strong>
                  <span className="text-[11px] text-stone-400 leading-snug mt-0.5">Do planejamento pedagógico</span>
                  <div className="mt-2 h-0.5 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-teal-400 transition-all duration-700"
                      style={{ width: visibleEvaluationCount > 0 ? '100%' : '0%' }} />
                  </div>
                </div>
              </div>

              {/* Próximos */}
              <div style={{ animationDelay: '225ms' }}
                className="group animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both relative overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none" />
                <div className="relative flex flex-col gap-1 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <Eyebrow>Próximos</Eyebrow>
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 border border-amber-200 text-amber-600 shrink-0">
                      <CalendarClock size={14} />
                    </span>
                  </div>
                  <strong className="font-['Lora'] text-[28px] font-bold text-stone-900 leading-none tabular-nums">
                    {upcomingEvents.length}
                  </strong>
                  <span className="text-[11px] text-stone-400 leading-snug mt-0.5">Dentro dos filtros ativos</span>
                  <div className="mt-2 h-0.5 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all duration-700"
                      style={{ width: upcomingEvents.length > 0 ? '100%' : '0%' }} />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ══ CALLOUT BAR ══ */}
          {/* ══ CALENDAR PANEL ══ */}
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[350ms] fill-mode-both overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
            {/* Panel header */}
            <div className="px-3 py-3 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-3 flex-wrap sm:px-5 sm:py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-sm sm:h-9 sm:w-9 sm:rounded-xl">
                  <CalendarDays size={16} className="text-white" />
                </div>
                <div>
                  <Eyebrow className="text-indigo-500">Agenda visual</Eyebrow>
                  <p className="font-DMSans text-sm font-semibold text-stone-900 leading-snug mt-0.5">Calendário escolar</p>
                </div>
              </div>

              <div className="cv-filter-bar flex items-center gap-1.5 flex-wrap">
                <FilterGroup icon={<School size={13} />}>
                  <CompactSelect
                    id="cv-school-filter"
                    value={schoolFilter}
                    onChange={(id) => { setSchoolFilter(id); setClassFilter('all') }}
                    options={schoolFilterOptions}
                    disabled={isProfessorAccess && accessibleSchools.length <= 1}
                    wrapperClassName="flex min-w-0 max-w-[185px] self-stretch items-center"
                    className={toolbarSelectCls}
                    dropdownAnchor="parent"
                    dropdownOffset={4}
                    dropdownMinWidth={200}
                    optionClassName={compactSelectOptionCls}
                  />
                </FilterGroup>

                <FilterGroup icon={<Users size={13} />}>
                  <CompactSelect
                    id="cv-class-filter"
                    value={classFilter}
                    onChange={setClassFilter}
                    options={classFilterOptions}
                    disabled={!schoolFilter || schoolFilter === 'all' || (isProfessorAccess && classesAvailableForSelectedSchool.length === 0)}
                    wrapperClassName="flex min-w-0 max-w-[175px] self-stretch items-center"
                    className={toolbarSelectCls}
                    dropdownAnchor="parent"
                    dropdownOffset={4}
                    dropdownMinWidth={200}
                    optionClassName={compactSelectOptionCls}
                  />
                </FilterGroup>

              </div>
            </div>

            {/* Cronograma */}
            {loading ? (
              <div className="p-5">
                <Bone className="w-full h-[480px]"/>
              </div>
            ) : (
              <>
                <div className="cv-desktop-calendar bg-[#ebe9e3] p-2 sm:p-5">
                  <CronogramaCalendar
                    currentMonth={currentMonth}
                    activeFilters={activeCalendarFilters}
                    canCreateEvent={canCreateEvent}
                    showCreateEventActions={showCreateEventActions}
                    createEventHint={createEventHint}
                    eventsForDate={getEventsForDate}
                    onPrevMonth={() => moveCalendarMonth(-1)}
                    onNextMonth={() => moveCalendarMonth(1)}
                    onToggleFilter={toggleCalendarFilter}
                    onCreateEvent={openCreateModal}
                    onDayClick={handleCalendarDayClick}
                    onEventClick={handleCalendarEventClick}
                  />
                </div>

                {/* Mobile agenda */}
                <div className="cv-mobile-agenda">
                  <div className="border-b border-stone-200 bg-stone-50 px-4 py-4">
                    <Eyebrow className="text-indigo-500 mb-1">Agenda compacta</Eyebrow>
                    <h3 className="font-['Lora'] text-[15px] font-semibold text-stone-900">
                      {mobileAgendaGroups.length > 0
                        ? `${mobileAgendaGroups.length} datas com eventos em ${year}`
                        : `Agenda de ${year}`}
                    </h3>
                    <p className="mt-1 text-[12px] text-stone-400">Eventos agrupados por data, escola, turma e horário.</p>
                  </div>

                  {mobileAgendaGroups.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-stone-400">
                        <CalendarDays size={20} />
                      </div>
                      <p className="text-[13px] font-semibold text-stone-500">Nenhum item encontrado.</p>
                      <p className="mt-1 text-[12px] text-stone-400">Tente ajustar os filtros ativos.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-200">
                      {mobileAgendaGroups.map((group) => {
                        const dateParts = mobileDateParts(group.date)
                        return (
                          <section key={group.date} className="grid gap-3 px-4 py-4">
                            <div className="flex items-start justify-between gap-3" title={fullDateLabel(group.date)}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl border border-stone-300 bg-white shadow-sm">
                                  <strong className="font-['Lora'] text-xl font-bold leading-none text-stone-900">{dateParts.day}</strong>
                                  <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-500">{dateParts.month}</span>
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-['Lora'] text-[14px] font-semibold capitalize text-stone-900">{dateParts.weekday}</h4>
                                  <p className="mt-0.5 text-[12px] text-stone-400">{group.events.length} item{group.events.length === 1 ? '' : 's'} nesta data</p>
                                </div>
                              </div>
                              {group.events.length > 1 && (
                                <button type="button" onClick={() => openDetailModal(group.date, group.events)}
                                  className="flex-shrink-0 rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-600 hover:border-indigo-300 transition">
                                  Ver todos
                                </button>
                              )}
                            </div>

                            <div className="grid gap-2.5">
                              {group.events.map((event) => (
                                <button key={event.id} type="button" onClick={() => openDetailModal(group.date, [event])}
                                  className="cv-event-card w-full rounded-2xl border border-stone-300 bg-white p-3.5 text-left shadow-sm active:scale-[0.99]">
                                  <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.10em]"
                                    style={{ background: calendarColors[event.type].bg, color: calendarColors[event.type].text }}>
                                    {visualTypeLabels[event.type]}
                                  </span>
                                  <strong className="mt-2 block font-['Lora'] text-[14px] font-semibold leading-snug text-stone-900">
                                    {event.title}
                                  </strong>
                                  <div className="mt-2 grid gap-1.5 text-[12px] leading-relaxed text-stone-500">
                                    <span className="flex items-center gap-2">
                                      <Clock size={12} className="flex-shrink-0 text-stone-400" />
                                      {eventDateRangeLabel(event)} · {timeLabel(event)}
                                    </span>
                                    <span className="flex items-center gap-2">
                                      <School size={12} className="flex-shrink-0 text-stone-400" />
                                      {getSchoolName(event.schoolId)}
                                    </span>
                                    {event.location && (
                                      <span className="flex items-center gap-2">
                                        <MapPin size={12} className="flex-shrink-0 text-stone-400" />
                                        {event.location}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </section>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          {/* ══ UPCOMING EVENTS ══ */}
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-[400ms] fill-mode-both overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
            <div className="px-5 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 shadow-sm">
                <GraduationCap size={16} className="text-white" />
              </div>
              <div>
                <Eyebrow className="text-indigo-500">Próximos eventos</Eyebrow>
                <p className="font-['Lora'] text-sm font-semibold text-stone-900 leading-snug mt-0.5">Agenda filtrada</p>
              </div>
            </div>

            <div className="cv-upcoming-list flex gap-3 overflow-x-auto p-4">
              {loading ? (
                [1,2,3,4].map(i => <SkeletonUpcoming key={i} />)
              ) : upcomingEvents.length === 0 ? (
                <div className="w-full py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 text-stone-400">
                    <CalendarDays size={20} />
                  </div>
                  <p className="text-[13px] font-semibold text-stone-400">Nenhum evento próximo encontrado.</p>
                </div>
              ) : (
                upcomingEvents.map((ev, i) => {
                  const { day, mon } = formatUpcomingDate(ev.startsAt)
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openDetailModal(ev.startsAt.slice(0, 10), [ev])}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className="cv-upcoming-card animate-in fade-in slide-in-from-bottom-1 duration-400 fill-mode-both flex items-center gap-3 min-w-[240px] w-[270px] border border-stone-300 rounded-2xl bg-white px-4 py-3 text-left flex-shrink-0 shadow-sm"
                    >
                      <span className="flex flex-col items-center min-w-[36px]">
                        <span className="font-['Lora'] text-xl font-bold text-stone-900 leading-none">{day}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mt-0.5">{mon}</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <strong className="block text-[13px] font-semibold text-stone-900 truncate font-DMSans">{ev.title}</strong>
                        <span className="block text-[11px] text-stone-400 mt-0.5 font-DMSans">{visualTypeLabels[ev.type]} · {timeLabel(ev)}</span>
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: calendarColors[ev.type].main }} />
                    </button>
                  )
                })
              )}
            </div>
          </section>

        </div>

        {/* ══ DETAIL MODAL ══ */}
        {detailModal && (
          <Modal
            id="cv-detail-title"
            title={detailModal.events.length === 1 ? detailModal.events[0].title : dateLabel(detailModal.date)}
            subtitle={detailModal.events.length === 1 ? visualTypeLabels[detailModal.events[0].type] : 'Agenda do dia'}
            description={
              detailModal.events.length === 1
                ? `${dateLabel(detailModal.events[0].startsAt)} · ${timeLabel(detailModal.events[0])}`
                : `${detailModal.events.length} itens encontrados nesta data.`
            }
            onClose={closeDetailModal}
            maxWidth="560px"
            placement="center"
            compact
          >
            <div className="grid gap-3 px-5 py-4">
              {detailModal.events.map((event) => (
                <article key={event.id} className="cv-event-card border border-stone-300 rounded-2xl bg-white overflow-hidden shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3"
                    style={{ background: calendarColors[event.type].bg }}>
                    <span className="text-[10px] font-semibold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full border"
                      style={{
                        background: '#fff',
                        color: calendarColors[event.type].text,
                        borderColor: `${calendarColors[event.type].main}44`,
                      }}>
                      {visualTypeLabels[event.type]}
                    </span>
                    {event.source === 'school' && canEditSchoolEvent(event) && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => editSchoolEventFromDetail(event)}
                          className="inline-flex items-center gap-1.5 bg-white text-stone-700 border border-stone-300 text-[12px] font-semibold px-3 py-1.5 rounded-xl hover:border-indigo-400 hover:text-indigo-700 transition-colors shadow-sm">
                          <Pen size={12} /> Editar
                        </button>
                        <button type="button" disabled={deletingEventId === event.sourceId} onClick={() => deleteSchoolEventFromDetail(event)}
                          className="inline-flex items-center gap-1.5 bg-white text-rose-700 border border-rose-300 text-[12px] font-semibold px-3 py-1.5 rounded-xl hover:bg-rose-50 hover:border-rose-400 transition-colors shadow-sm">
                          <Trash2 size={12} /> {deletingEventId === event.sourceId ? 'Excluindo…' : 'Excluir'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 p-4">
                    <h3 className="font-['Lora'] text-[15px] font-semibold leading-snug text-stone-900">{event.title}</h3>
                    <div className="grid gap-2 text-[12px] text-stone-500 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-stone-400 flex-shrink-0" />
                        {dateLabel(event.startsAt)} · {timeLabel(event)}
                      </div>
                      <div className="flex items-center gap-2">
                        <School size={12} className="text-stone-400 flex-shrink-0" />
                        {getSchoolName(event.schoolId)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={12} className="text-stone-400 flex-shrink-0" />
                        {getClassName(event.classId)}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-stone-400 flex-shrink-0" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="border-t border-stone-200 pt-3 text-[12px] leading-relaxed text-stone-500">
                        {event.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </Modal>
        )}

        {deleteTarget && (
          <ConfirmDialog
            title="Excluir evento"
            description={`Excluir "${deleteTarget.title}" do calendário escolar? Esta ação não pode ser desfeita.`}
            confirmLabel="Excluir evento"
            loading={deletingEventId === deleteTarget.sourceId}
            onCancel={() => { if (!deletingEventId) setDeleteTarget(null) }}
            onConfirm={confirmDeleteSchoolEvent}
          />
        )}

        {/* ══ CREATE/EDIT EVENT MODAL ══ */}
        {isEventModalOpen && (
          <Modal
            id="cv-modal-title"
            title={editingId ? 'Atualizar evento' : 'Criar evento escolar'}
            subtitle={editingId ? 'Editar evento' : 'Novo evento'}
            onClose={resetForm}
          >
            <form onSubmit={handleSubmit} noValidate>
              <div className="px-5 py-4 flex flex-col gap-2.5">
                {formError && (
                  <div className="flex items-center gap-2 px-3.5 py-3 bg-rose-50 border border-rose-300 rounded-xl text-[13px] text-rose-700 font-semibold">
                    <AlertTriangle size={14} className="shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 max-[560px]:grid-cols-1">

                  {/* Title */}
                  <div className="flex flex-col gap-1">
                    <label className={labelCls} htmlFor="cv-title">Evento</label>
                    <input
                      id="cv-title"
                      className={`${compactInputCls} ${fieldStateClass(formFieldErrors.title)}`}
                      value={draft.title}
                      onChange={(e) => updateDraftField('title', e.target.value)}
                      placeholder="Nome do evento"
                      aria-invalid={Boolean(formFieldErrors.title) || undefined}
                      required
                    />
                    <FieldMessage error={formFieldErrors.title} />
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-1">
                    <label className={labelCls} htmlFor="cv-type">Tipo</label>
                    <CompactSelect<CalendarEventType>
                      id="cv-type"
                      className={`${compactSelectCls} ${fieldStateClass(formFieldErrors.type)}`}
                      value={draft.type}
                      onChange={(type) => updateDraftField('type', type)}
                      options={eventTypeOptions}
                      error={formFieldErrors.type}
                      dropdownOffset={4}
                      dropdownMinWidth={170}
                      optionClassName={compactSelectOptionCls}
                    />
                  </div>

                  {/* School */}
                  <div className="flex flex-col gap-1">
                    <label className={labelCls} htmlFor="cv-school">Escola vinculada</label>
                    <CompactSelect
                      id="cv-school"
                      className={`${compactSelectCls} ${fieldStateClass(formFieldErrors.schoolId)}`}
                      value={draft.schoolId}
                      onChange={(schoolId) => {
                        setFormFieldErrors((c) => ({ ...c, schoolId: undefined, classId: undefined }))
                        setDraft({ ...draft, schoolId, classId: '' })
                      }}
                      options={schoolOptions}
                      error={formFieldErrors.schoolId}
                      disabled={isProfessorAccess && accessibleSchools.length <= 1}
                      dropdownOffset={4}
                      dropdownMinWidth={200}
                      optionClassName={compactSelectOptionCls}
                    />
                  </div>

                  {/* Class */}
                  <div className="flex flex-col gap-1">
                    <label className={labelCls} htmlFor="cv-class">Turma</label>
                    <CompactSelect
                      id="cv-class"
                      className={`${compactSelectCls} ${fieldStateClass(formFieldErrors.classId)}`}
                      value={draft.classId}
                      onChange={(classId) => updateDraftField('classId', classId)}
                      options={classOptions}
                      error={formFieldErrors.classId}
                      disabled={!draft.schoolId}
                      dropdownOffset={4}
                      dropdownMinWidth={200}
                      optionClassName={compactSelectOptionCls}
                    />
                    {!draft.schoolId && (
                      <p className="text-[11px] font-medium text-stone-400">Selecione uma escola para habilitar as turmas.</p>
                    )}
                    {isProfessorAccess && draft.schoolId && filteredClassesForDraft.length === 0 && (
                      <p className="text-[11px] font-medium text-stone-400">Sem turma especÃ­fica; o evento ficarÃ¡ visÃ­vel para a escola.</p>
                    )}
                  </div>

                  {/* All-day */}
                  <div className="col-span-2 max-[560px]:col-span-1">
                    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer text-sm font-medium text-stone-700">
                      <input
                        type="checkbox"
                        checked={draft.allDay}
                        onChange={(e) => updateDraftField('allDay', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer rounded"
                      />
                      Dia inteiro
                    </label>
                    <FieldMessage hint="Marque quando o evento ocupar o dia todo sem horários específicos." error={formFieldErrors.allDay} />
                  </div>

                  {/* Start date */}
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-start-date">Data de início</label>
                    <DateInput
                      id="cv-start-date"
                      className={`${inputCls} ${fieldStateClass(formFieldErrors.startDate)}`}
                      value={draft.startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      hint="Selecione a data em que o evento começa."
                      error={formFieldErrors.startDate}
                      required
                    />
                  </div>

                  {/* Start time */}
                  {!draft.allDay && (
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls} htmlFor="cv-start-time">Horário inicial</label>
                      <CompactSelect
                        id="cv-start-time"
                        className={`${inputCls} ${fieldStateClass(formFieldErrors.startTime)}`}
                        value={draft.startTime}
                        onChange={handleStartTimeChange}
                        options={calendarStartTimeOptions}
                        ariaLabel="Horário inicial do evento"
                        hint="Escolha quando o evento começa."
                        error={formFieldErrors.startTime}
                        dropdownWidth="trigger"
                      />
                    </div>
                  )}

                  {/* End date */}
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-end-date">Data de término</label>
                    <DateInput
                      id="cv-end-date"
                      className={`${inputCls} ${fieldStateClass(formFieldErrors.endDate)}`}
                      value={draft.endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      hint="Selecione a data em que o evento termina."
                      error={formFieldErrors.endDate}
                      required
                    />
                  </div>

                  {/* End time */}
                  {!draft.allDay && (
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls} htmlFor="cv-end-time">Horário final</label>
                      <CompactSelect
                        id="cv-end-time"
                        className={`${inputCls} ${fieldStateClass(formFieldErrors.endTime)}`}
                        value={draft.endTime}
                        onChange={(endTime) => updateDraftField('endTime', endTime)}
                        options={calendarEndTimeOptions}
                        ariaLabel="Horário final do evento"
                        hint="Escolha um horário posterior ao início."
                        error={formFieldErrors.endTime}
                        dropdownWidth="trigger"
                      />
                    </div>
                  )}

                  {/* Location */}
                  <div className="col-span-2 max-[560px]:col-span-1 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-location">Local</label>
                    <input
                      id="cv-location"
                      className={`${inputCls} ${fieldStateClass(formFieldErrors.location)}`}
                      value={draft.location}
                      onChange={(e) => updateDraftField('location', e.target.value)}
                      aria-invalid={Boolean(formFieldErrors.location) || undefined}
                      placeholder="Auditório, quadra, sala 2…"
                    />
                    <FieldMessage hint="Opcional: diga onde o evento acontecerá." error={formFieldErrors.location} />
                  </div>

                  {/* Description */}
                  <div className="col-span-2 max-[560px]:col-span-1 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-desc">Descrição</label>
                    <textarea
                      id="cv-desc"
                      className={`${inputCls} min-h-[80px] leading-relaxed resize-none ${fieldStateClass(formFieldErrors.description)}`}
                      value={draft.description}
                      onChange={(e) => updateDraftField('description', e.target.value)}
                      rows={3}
                      placeholder="Detalhes adicionais sobre o evento…"
                      aria-invalid={Boolean(formFieldErrors.description) || undefined}
                    />
                    <FieldMessage hint="Opcional: escreva orientações ou contexto para quem verá a agenda." error={formFieldErrors.description} />
                  </div>

                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 pb-6 pt-4 border-t border-stone-200 flex items-center gap-3 flex-wrap">
                <span className="flex-1" />
                <button type="button" onClick={resetForm}
                  className="inline-flex items-center gap-1.5 bg-white text-stone-500 border border-stone-300 text-[13px] font-semibold px-4 py-2.5 rounded-xl hover:border-stone-400 hover:text-stone-900 transition-all">
                  <XCircle size={14} /> Cancelar
                </button>
                <button type="submit"
                  className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm active:scale-95">
                  {editingId ? <Check size={14} /> : <Plus size={14} />}
                  {editingId ? 'Salvar alterações' : 'Adicionar evento'}
                </button>
              </div>
            </form>
          </Modal>
        )}

      </div>
    </>
  )
}
