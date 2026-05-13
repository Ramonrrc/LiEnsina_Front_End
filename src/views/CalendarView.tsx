import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createCalendar, viewDay, viewList, viewMonthGrid, viewWeek } from '@schedule-x/calendar'
import type { CalendarApp, CalendarEventExternal } from '@schedule-x/calendar'
import '@schedule-x/theme-default/dist/index.css'
import { Temporal } from 'temporal-polyfill'
import { z } from 'zod'
import {
  ChevronLeft, ChevronRight, Clock, MapPin,
  Plus, RefreshCcw, Check, Trash2, X, XCircle,
  School, Users, BookOpen, Flag, GraduationCap,
  Filter, SlidersHorizontal, CalendarDays, AlertTriangle,
  Pen,
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { ConfirmDialog } from '../components/ui/confirm-dialog'
import DateInput from '../components/ui/date-input'
import { FieldMessage, fieldStateClass, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { formatClassGrade } from '../class-grade-options'
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
   Schedule-X CSS overrides
───────────────────────────────────────────── */
const SCHEDULE_X_OVERRIDES = `
  .cv-schedule-shell .sx__calendar {
    border: none !important;
    background: transparent !important;
    font-family: 'DM Sans', system-ui, sans-serif !important;
    --sx-border: 1px solid #cbd5e1;
    --sx-color-outline-variant: #cbd5e1;
  }
  .cv-schedule-shell .sx__calendar-wrapper,
  .cv-schedule-shell .sx__month-grid-wrapper {
    min-height: 540px;
  }
  .cv-schedule-shell .sx__month-grid-week__week-number,
  .cv-schedule-shell .sx__month-grid-week:first-child .sx__month-grid-week__week-number {
    padding-top: 12px !important;
  }
  .cv-schedule-shell .sx__month-grid-day__header-date {
    font-family: 'Sora', system-ui, sans-serif !important;
  }
  .cv-schedule-shell .sx__calendar-header {
    border-bottom: 1px solid #cbd5e1 !important;
  }
  .cv-schedule-shell .sx__month-grid-day {
    border-color: #cbd5e1 !important;
  }
  .cv-schedule-shell .sx__view-selection-items {
    min-width: 160px !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 8px !important;
    background: #fff !important;
    padding: 4px !important;
    box-shadow: 0 18px 40px rgba(15,23,42,.14) !important;
  }
  .cv-schedule-shell .sx__view-selection-item {
    border-radius: 4px !important;
    color: #475569 !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    padding: 8px 10px !important;
  }
  .cv-schedule-shell .sx__view-selection-item:hover,
  .cv-schedule-shell .sx__view-selection-item:focus {
    background: #f1f5f9 !important;
    color: #0f172a !important;
  }
  .cv-schedule-shell .sx__view-selection-item.is-selected {
    background: #4f46e5 !important;
    color: #fff !important;
  }
`

/* ─────────────────────────────────────────────
   Types & Constants
───────────────────────────────────────────── */
const TIMEZONE = 'America/Sao_Paulo'

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
  evento:   { main: '#1d6fa4', bg: '#e8f4fc', text: '#0c3d5e' },
  aula:     { main: '#2a7a4e', bg: '#e6f4ec', text: '#14472c' },
  reuniao:  { main: '#3730a3', bg: '#e0e7ff', text: '#1e1a6e' },
  avaliacao:{ main: '#b45309', bg: '#fef3c7', text: '#78350f' },
  prazo:    { main: '#b91c1c', bg: '#fee2e2', text: '#7f1d1d' },
  feriado:  { main: '#b91c1c', bg: '#fee2e2', text: '#7f1d1d' },
  simulado: { main: '#0f766e', bg: '#ccfbf1', text: '#0d4d47' },
}

const scheduleCalendars = Object.fromEntries(
  Object.entries(calendarColors).map(([key, c]) => [
    key,
    {
      colorName: key,
      label: visualTypeLabels[key as VisualEventType],
      lightColors: { main: c.main, container: c.bg, onContainer: c.text },
    },
  ]),
)

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

function createEmptyForm(schoolId = ''): CalendarFormState {
  const today = toDateInput()
  return {
    title: '', type: 'evento', schoolId, classId: '',
    startDate: today, startTime: '08:00',
    endDate: today,   endTime: '09:00',
    allDay: false, location: '', description: '',
  }
}

function splitDateTime(value: string, fallbackTime: string) {
  return { date: value.slice(0, 10), time: value.includes('T') ? value.slice(11, 16) : fallbackTime }
}

function toPlainDate(value: string) {
  return Temporal.PlainDate.from(value.slice(0, 10))
}

function toZonedDateTime(value: string, fallbackTime = '00:00') {
  const { date, time } = splitDateTime(value, fallbackTime)
  return Temporal.ZonedDateTime.from(`${date}T${time || fallbackTime}:00[${TIMEZONE}]`)
}

function toScheduleEvent(event: VisualCalendarEvent): CalendarEventExternal {
  return {
    id: event.id,
    title: event.title,
    start: event.allDay ? toPlainDate(event.startsAt) : toZonedDateTime(event.startsAt),
    end:   event.allDay ? toPlainDate(event.endsAt)   : toZonedDateTime(event.endsAt, '23:59'),
    calendarId: event.type,
    location: event.location,
    description: event.description,
    source: event.source,
    sourceId: event.sourceId,
    _options: { disableDND: true, disableResize: true },
  }
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
   Skeleton
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="cv-skeleton-card rounded-xl border border-slate-400 bg-white p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="cv-shimmer h-3 w-24 rounded" />
        <div className="cv-shimmer h-7 w-7 rounded-lg" />
      </div>
      <div className="cv-shimmer h-8 w-16 rounded" />
      <div className="cv-shimmer h-3 w-32 rounded" />
    </div>
  )
}

function SkeletonUpcoming() {
  return (
    <div className="cv-skeleton-card flex items-center gap-3 min-w-[240px] w-[260px] border border-slate-400 rounded-lg bg-white px-4 py-3 flex-shrink-0">
      <div className="flex flex-col items-center min-w-[36px] gap-1">
        <div className="cv-shimmer h-6 w-7 rounded" />
        <div className="cv-shimmer h-2.5 w-8 rounded" />
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="cv-shimmer h-3.5 w-36 rounded" />
        <div className="cv-shimmer h-2.5 w-24 rounded" />
      </div>
      <div className="cv-shimmer h-2 w-2 rounded-full" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   Metric card
───────────────────────────────────────────── */
function MetricCard({
  label, value, sub, icon, iconColor,
}: {
  label: string; value: string | number; sub: string
  icon: React.ReactNode; iconColor: string
}) {
  return (
    <div className="cv-metric-card bg-white border border-slate-400 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black tracking-[0.18em] uppercase text-slate-400">{label}</span>
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          {icon}
        </span>
      </div>
      <strong className="font-['Sora',system-ui,sans-serif] text-[30px] font-black text-slate-900 leading-none">{value}</strong>
      <span className="text-[11px] text-slate-500">{sub}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Filter group
───────────────────────────────────────────── */
function FilterGroup({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="cv-filter-group flex min-h-[34px] items-center gap-2 bg-slate-50 border border-slate-400 rounded-sm px-2.5 py-1.5">
      <span className="flex self-stretch items-center justify-center text-slate-400 flex-shrink-0">{icon}</span>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Modal wrapper
───────────────────────────────────────────── */
function Modal({
  id,
  title,
  subtitle,
  description,
  onClose,
  children,
  maxWidth = '680px',
  placement = 'top',
  compact = false,
}: {
  id: string; title: string; subtitle: string; description?: string
  onClose: () => void; children: React.ReactNode; maxWidth?: string
  placement?: 'top' | 'center'
  compact?: boolean
}) {
  const backdropPosition = placement === 'center' ? 'items-center py-4 sm:py-5' : 'items-start py-6 sm:py-8'
  const headerClassName = compact
    ? 'sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-400 bg-white px-5 py-4'
    : 'sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-400 bg-white px-6 py-5'
  const titleClassName = compact
    ? "mt-0.5 font-['Sora',system-ui,sans-serif] text-lg font-bold text-slate-900"
    : "mt-0.5 font-['Sora',system-ui,sans-serif] text-xl font-bold text-slate-900"
  const descriptionClassName = compact ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-sm text-slate-500'

  const modal = (
    <div
      role="presentation"
      onMouseDown={onClose}
      className={`cv-backdrop fixed inset-0 z-[1000] flex justify-center overflow-y-auto px-4 sm:px-5 ${backdropPosition}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onMouseDown={(e) => e.stopPropagation()}
        className="cv-modal w-full max-h-[calc(100svh-48px)] overflow-y-auto rounded-2xl border border-slate-400 bg-white shadow-2xl"
        style={{ maxWidth }}
      >
        <div className={headerClassName}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">{subtitle}</p>
            <h2 id={id} className={titleClassName}>{title}</h2>
            {description && <p className={descriptionClassName}>{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors flex-shrink-0 mt-0.5"
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
   Shared input/label classes (form)
───────────────────────────────────────────── */
const inputCls =
  'w-full bg-slate-50 border border-slate-400 rounded-sm px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100 appearance-none'

const labelCls =
  'text-[11px] font-black tracking-[0.14em] uppercase text-slate-500'

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function CalendarView({
  currentUser, currentRole,
  calendarEvents, schools, classes, evaluations,
  onCreate, onUpdate, onDelete,
}: CalendarViewProps) {
  const roleCode = (currentRole?.code ?? currentRole?.name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
  const isAdminAccess = roleCode.includes('ADMIN')
  const isProfessorAccess = roleCode.includes('PROFESSOR')
  const isStudentAccess = roleCode.includes('ALUNO')
  const isGuardianAccess = roleCode.includes('RESPONSAVEL') || roleCode.includes('GUARDIAN')
  const isFamilyScopedAccess = isStudentAccess || isGuardianAccess
  const linkedTeacherId = currentUser.linkedTeacherId ?? ''
  const linkedProfessorClasses = useMemo(
    () => isProfessorAccess
      ? classes.filter((classRoom) => {
          const teacherIds = new Set([classRoom.teacherId, ...(classRoom.teacherIds ?? [])].filter(Boolean))
          return linkedTeacherId ? teacherIds.has(linkedTeacherId) : classRoom.schoolId === currentUser.schoolId
        })
      : [],
    [classes, currentUser.schoolId, isProfessorAccess, linkedTeacherId],
  )
  const linkedProfessorClassIds = useMemo(
    () => new Set(linkedProfessorClasses.map((classRoom) => classRoom.id)),
    [linkedProfessorClasses],
  )
  const currentCreatorIds = useMemo(
    () => new Set([
      currentUser.id,
      currentUser.linkedTeacherId,
      currentUser.linkedStudentId,
      currentUser.linkedGuardianId,
    ].filter((id): id is string => Boolean(id))),
    [currentUser.id, currentUser.linkedGuardianId, currentUser.linkedStudentId, currentUser.linkedTeacherId],
  )
  const hasCalendarAccess = isAdminAccess || isProfessorAccess
  const canCreateEvent = isAdminAccess || (isProfessorAccess && linkedProfessorClasses.length > 0)
  const showCreateEventActions = hasCalendarAccess
  const createEventHint = canCreateEvent
    ? 'Crie eventos, reunioes, prazos e muito mais.'
    : isProfessorAccess
      ? 'Vincule uma turma ao professor para liberar novos eventos.'
      : 'Apenas Admin e Professor podem criar eventos.'
  const accessibleSchools = useMemo(() => {
    if (isAdminAccess) return schools
    if (!isProfessorAccess) return schools
    const ids = new Set(linkedProfessorClasses.map((classRoom) => classRoom.schoolId))
    if (ids.size === 0 && currentUser.schoolId) ids.add(currentUser.schoolId)
    return schools.filter((school) => ids.has(school.id))
  }, [currentUser.schoolId, isAdminAccess, isProfessorAccess, linkedProfessorClasses, schools])
  const professorDefaultSchoolId = accessibleSchools[0]?.id ?? ''
  const defaultSchoolId = isProfessorAccess ? professorDefaultSchoolId : ''
  const defaultSchoolFilter = isProfessorAccess
    ? professorDefaultSchoolId
    : isFamilyScopedAccess && accessibleSchools.length === 1
      ? accessibleSchools[0]?.id ?? 'all'
      : 'all'

  const [loading, setLoading]                 = useState(true)
  const [draft, setDraft]                     = useState<CalendarFormState>(() => createEmptyForm(defaultSchoolId))
  const [editingId, setEditingId]             = useState<string | null>(null)
  const [detailModal, setDetailModal]         = useState<DetailModalState | null>(null)
  const [deleteTarget, setDeleteTarget]       = useState<VisualCalendarEvent | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [schoolFilter, setSchoolFilter]       = useState(defaultSchoolFilter)
  const [classFilter, setClassFilter]         = useState('all')
  const [typeFilter, setTypeFilter]           = useState<VisualEventType | 'all'>('all')
  const [year, setYear]                       = useState(new Date().getFullYear())
  const [holidays, setHolidays]               = useState<BrazilHoliday[]>([])
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false)
  const [holidayError, setHolidayError]       = useState<string | null>(null)
  const [formError, setFormError]             = useState<string | null>(null)
  const [formFieldErrors, setFormFieldErrors] = useState<FieldErrors<CalendarFormField>>({})
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isCompactCalendar, setIsCompactCalendar] = useState(false)

  const calendarContainerRef = useRef<HTMLDivElement | null>(null)
  const calendarAppRef       = useRef<CalendarApp | null>(null)
  const scheduleClickRef     = useRef<(event: CalendarEventExternal) => void>(() => undefined)
  const scheduleDateClickRef = useRef<(date: { toString: () => string }, event?: UIEvent) => void>(() => undefined)

  /* ── Skeleton delay ── */
  useEffect(() => { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t) }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia('(max-width: 767px)')
    const updateCompactMode = () => setIsCompactCalendar(query.matches)
    updateCompactMode()
    query.addEventListener('change', updateCompactMode)
    return () => query.removeEventListener('change', updateCompactMode)
  }, [])

  /* ── Schedule-X CSS overrides ── */
  useEffect(() => {
    const styleId = 'sx-overrides'
    if (document.getElementById(styleId)) return
    const el = document.createElement('style')
    el.id = styleId
    el.textContent = SCHEDULE_X_OVERRIDES
    document.head.appendChild(el)
  }, [])

  useEffect(() => {
    if (!isProfessorAccess) return

    const hasSelectedSchool = accessibleSchools.some((school) => school.id === schoolFilter)
    if (!hasSelectedSchool && professorDefaultSchoolId) {
      setSchoolFilter(professorDefaultSchoolId)
      setClassFilter('all')
    }
  }, [accessibleSchools, isProfessorAccess, professorDefaultSchoolId, schoolFilter])

  useEffect(() => {
    if (isProfessorAccess) return

    if (isFamilyScopedAccess && accessibleSchools.length === 1) {
      const onlySchoolId = accessibleSchools[0].id
      if (schoolFilter !== onlySchoolId) {
        setSchoolFilter(onlySchoolId)
        setClassFilter('all')
      }
      return
    }

    const hasSelectedSchool = schoolFilter === 'all' || accessibleSchools.some((school) => school.id === schoolFilter)
    if (!hasSelectedSchool) {
      setSchoolFilter('all')
      setClassFilter('all')
    }
  }, [accessibleSchools, isFamilyScopedAccess, isProfessorAccess, schoolFilter])

  useEffect(() => {
    if (!isProfessorAccess) return
    setDraft((current) => {
      if (current.schoolId === professorDefaultSchoolId) return current
      return { ...current, schoolId: professorDefaultSchoolId, classId: '' }
    })
  }, [isProfessorAccess, professorDefaultSchoolId])

  useEffect(() => {
    if (!draft.schoolId && defaultSchoolId)
      setDraft((c) => ({ ...c, schoolId: defaultSchoolId }))
  }, [defaultSchoolId, draft.schoolId])

  useEffect(() => {
    if (schoolFilter === 'all' || !schoolFilter) {
      if (classFilter !== 'all') setClassFilter('all')
      return
    }

    const classIsAvailable = classes.some((classRoom) => {
      const allowedForProfessor = !isProfessorAccess || linkedProfessorClassIds.has(classRoom.id)
      return allowedForProfessor && classRoom.schoolId === schoolFilter && classRoom.id === classFilter
    })
    if (classFilter !== 'all' && !classIsAvailable) setClassFilter('all')
  }, [classFilter, classes, isProfessorAccess, linkedProfessorClassIds, schoolFilter])

  useEffect(() => {
    let cancelled = false
    setIsLoadingHolidays(true)
    setHolidayError(null)
    buscarFeriados(year)
      .then((items) => { if (!cancelled) setHolidays(items) })
      .catch((err) => { if (!cancelled) { setHolidays([]); setHolidayError(err instanceof Error ? err.message : 'Erro ao carregar feriados.') } })
      .finally(() => { if (!cancelled) setIsLoadingHolidays(false) })
    return () => { cancelled = true }
  }, [year])

  /* ── Derived data ── */
  const visualEvents = useMemo<VisualCalendarEvent[]>(() => {
    const evaluationEvents = evaluations.map((ev) => {
      const classRoom = classes.find((c) => c.id === ev.classId)
      return {
        id: `evaluation-${ev.id}`, source: 'evaluation' as const, sourceId: ev.id,
        title: ev.title, type: 'simulado' as const,
        startsAt: ev.scheduledAt, endsAt: ev.scheduledAt, allDay: true,
        schoolId: classRoom?.schoolId, classId: ev.classId,
        description: `${ev.subject} - ${ev.status.replace('_', ' ')}`,
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
      createdById: ev.createdById,
      location: ev.location, description: ev.description,
    }))
    return [...schoolEvents, ...evaluationEvents, ...holidayEvents]
  }, [calendarEvents, classes, evaluations, holidays])

  const accessibleVisualEvents = useMemo(() => {
    if (isAdminAccess) return visualEvents
    if (!isProfessorAccess) return visualEvents
    const accessibleSchoolIds = new Set(accessibleSchools.map((school) => school.id))
    return visualEvents.filter((event) => {
      if (event.source === 'holiday') return true
      if (event.classId) return linkedProfessorClassIds.has(event.classId)
      return Boolean(event.schoolId && accessibleSchoolIds.has(event.schoolId))
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
      const matchesType   = typeFilter === 'all' || ev.type === typeFilter
      return matchesSchool && matchesClass && matchesType
    }),
    [accessibleVisualEvents, classFilter, schoolFilter, typeFilter],
  )

  const scheduleEvents = useMemo(() => filteredVisualEvents.map(toScheduleEvent), [filteredVisualEvents])
  const scheduleDataRevision = useMemo(
    () => visualEvents
      .map((event) => [
        event.id,
        event.title,
        event.type,
        event.startsAt,
        event.endsAt,
        event.schoolId ?? '',
        event.classId ?? '',
        event.location ?? '',
      ].join(':'))
      .join('|'),
    [visualEvents],
  )

  const visibleSchoolEventCount = useMemo(
    () => accessibleVisualEvents.filter((event) => event.source === 'school').length,
    [accessibleVisualEvents],
  )

  const visibleEvaluationCount = useMemo(
    () => accessibleVisualEvents.filter((event) => event.source === 'evaluation').length,
    [accessibleVisualEvents],
  )

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
      .filter((event) => event.startsAt.slice(0, 4) === String(year) || event.endsAt.slice(0, 4) === String(year))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title))
      .forEach((event) => {
        const date = event.startsAt.slice(0, 10)
        const current = groups.get(date) ?? []
        current.push(event)
        groups.set(date, current)
      })

    return Array.from(groups.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, events]) => ({ date, events }))
  }, [filteredVisualEvents, year])

  const classesAvailableForSelectedSchool = useMemo(
    () => schoolFilter && schoolFilter !== 'all'
      ? classes.filter((classRoom) => {
          const allowedForProfessor = !isProfessorAccess || linkedProfessorClassIds.has(classRoom.id)
          return allowedForProfessor && classRoom.schoolId === schoolFilter
        })
      : [],
    [classes, isProfessorAccess, linkedProfessorClassIds, schoolFilter],
  )

  const filteredClassesForDraft = useMemo(
    () => draft.schoolId
      ? classes.filter((classRoom) => {
          const allowedForProfessor = !isProfessorAccess || linkedProfessorClassIds.has(classRoom.id)
          return allowedForProfessor && classRoom.schoolId === draft.schoolId
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
  const schoolFilterOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => {
      const allSchoolsOption = {
        value: 'all',
        label: isFamilyScopedAccess ? 'Todas as escolas dos filhos' : 'Todas as escolas',
      }
      const shouldShowAllSchoolsOption = !isProfessorAccess && (!isFamilyScopedAccess || accessibleSchools.length !== 1)

      return [
        ...(shouldShowAllSchoolsOption ? [allSchoolsOption] : []),
        ...accessibleSchools.map((s) => ({ value: s.id, label: s.name })),
      ]
    },
    [accessibleSchools, isFamilyScopedAccess, isProfessorAccess],
  )

  const classFilterOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => {
      if (!schoolFilter || schoolFilter === 'all') {
        return [{ value: 'all', label: 'Selecione uma escola primeiro', disabled: true }]
      }

      if (isProfessorAccess && classesAvailableForSelectedSchool.length === 0) {
        return [{ value: 'all', label: 'Nenhuma turma vinculada', disabled: true }]
      }

      return [
        { value: 'all', label: isProfessorAccess ? 'Todas as turmas vinculadas' : 'Todas as turmas da escola' },
        ...classesAvailableForSelectedSchool.map((classRoom) => ({
          value: classRoom.id,
          label: classRoom.name,
          description: `${formatClassGrade(classRoom.grade)} · ${classRoom.shift}`,
        })),
      ]
    },
    [classesAvailableForSelectedSchool, isProfessorAccess, schoolFilter],
  )

  const typeFilterOptions = useMemo<Array<CompactSelectOption<VisualEventType | 'all'>>>(
    () => [
      { value: 'all', label: 'Todos os tipos' },
      { value: 'feriado',  label: 'Feriados',  swatch: calendarColors.feriado.main },
      { value: 'simulado', label: 'Simulados', swatch: calendarColors.simulado.main },
      ...eventTypes.map((t) => ({ value: t.value, label: t.label, swatch: calendarColors[t.value].main })),
    ],
    [],
  )

  const eventTypeOptions = useMemo<Array<CompactSelectOption<CalendarEventType>>>(
    () => eventTypes.map((t) => ({ value: t.value, label: t.label, swatch: calendarColors[t.value].main })),
    [],
  )

  const schoolOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [
      { value: '', label: 'Selecione a escola' },
      ...accessibleSchools.map((s) => ({ value: s.id, label: s.name })),
    ],
    [accessibleSchools],
  )

  const classOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [
      {
        value: '',
        label: draft.schoolId
          ? isProfessorAccess ? 'Selecione uma turma vinculada' : 'Todas as turmas da escola'
          : 'Selecione uma escola primeiro',
        disabled: isProfessorAccess || !draft.schoolId,
      },
      ...filteredClassesForDraft.map((c) => ({
        value: c.id,
        label: c.name,
        description: `${formatClassGrade(c.grade)} · ${c.shift}`,
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
      setEditingId(null)
      setFormError(null)
      setDetailModal((current) => {
        if (!current) return current
        const remainingEvents = current.events.filter((item) => item.id !== deleteTarget.id)
        return remainingEvents.length > 0 ? { ...current, events: remainingEvents } : null
      })
      setDeleteTarget(null)
    } finally {
      setDeletingEventId(null)
    }
  }

  function startEditing(event: SchoolCalendarEvent) {
    if (!canEditSchoolEvent(event)) {
      setFormError('Voce nao tem permissao para editar este evento.')
      return
    }
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
    if (!canCreateEvent) {
      setFormError('Seu acesso nao permite criar eventos neste calendario.')
      return
    }
    setEditingId(null); setDetailModal(null); setFormError(null); setFormFieldErrors({})
    setDraft(createEmptyForm(defaultSchoolId)); setIsEventModalOpen(true)
  }

  function resetForm() {
    setEditingId(null); setDetailModal(null); setFormError(null); setFormFieldErrors({})
    setIsEventModalOpen(false); setDraft(createEmptyForm(defaultSchoolId))
  }

  function validateDraft() {
    if (!draft.title.trim()) return 'Informe o título do evento.'
    if (!draft.schoolId) return 'Selecione uma escola para o evento.'
    if (isProfessorAccess && !draft.classId) return 'Selecione uma turma vinculada para que os alunos vejam o evento.'
    if (draft.classId && !filteredClassesForDraft.some((classRoom) => classRoom.id === draft.classId)) {
      return 'Selecione uma turma disponivel para esta escola.'
    }
    if (draft.endDate < draft.startDate) return 'A data final precisa ser igual ou posterior à data inicial.'
    if (!draft.allDay && draft.startDate === draft.endDate && draft.endTime <= draft.startTime)
      return 'O horário final precisa ser posterior ao horário inicial.'
    return null
  }

  function validateDraftWithZod() {
    const parsed = calendarFormSchema.safeParse(draft)
    if (!parsed.success) {
      const errors = zodFieldErrors<CalendarFormField>(parsed.error)
      return {
        message: Object.values(errors)[0] ?? 'Revise os campos do evento.',
        errors,
      }
    }

    const errors: FieldErrors<CalendarFormField> = {}
    if (isProfessorAccess && !draft.classId) {
      errors.classId = 'Selecione uma turma vinculada para que os alunos vejam o evento.'
    }
    if (draft.classId && !filteredClassesForDraft.some((classRoom) => classRoom.id === draft.classId)) {
      errors.classId = 'Selecione uma turma disponivel para esta escola.'
    }
    if (draft.endDate < draft.startDate) {
      errors.endDate = 'A data final precisa ser igual ou posterior a data inicial.'
    }
    if (!draft.allDay && !isCalendarStartTime(draft.startTime)) {
      errors.startTime = 'Selecione um horario inicial entre 7:00 e 17:30.'
    }
    if (!draft.allDay && !isCalendarTime(draft.endTime)) {
      errors.endTime = 'Selecione um horario final entre 7:00 e 18:00.'
    }
    if (!draft.allDay && draft.startDate === draft.endDate && draft.endTime <= draft.startTime) {
      errors.endTime = 'O horario final precisa ser posterior ao horario inicial.'
    }

    const message = Object.values(errors)[0]
    return message ? { message, errors } : null
  }

  function updateDraftField<K extends keyof CalendarFormState>(field: K, value: CalendarFormState[K]) {
    setFormFieldErrors((current) => ({ ...current, [field]: undefined }))
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function handleStartTimeChange(startTime: string) {
    setFormFieldErrors((current) => ({ ...current, startTime: undefined, endTime: undefined }))
    setDraft((current) => ({
      ...current,
      startTime,
      endTime: current.startDate === current.endDate && current.endTime <= startTime
        ? getNextCalendarTime(startTime)
        : current.endTime,
    }))
  }

  function handleStartDateChange(startDate: string) {
    setFormFieldErrors((current) => ({ ...current, startDate: undefined, endDate: undefined, endTime: undefined }))
    setDraft((current) => {
      const endDate = current.endDate < startDate ? startDate : current.endDate
      const endTime = endDate === startDate && current.endTime <= current.startTime
        ? getNextCalendarTime(current.startTime)
        : current.endTime

      return { ...current, startDate, endDate, endTime }
    })
  }

  function handleEndDateChange(endDate: string) {
    setFormFieldErrors((current) => ({ ...current, endDate: undefined, endTime: undefined }))
    setDraft((current) => ({
      ...current,
      endDate,
      endTime: endDate === current.startDate && current.endTime <= current.startTime
        ? getNextCalendarTime(current.startTime)
        : current.endTime,
    }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validation = validateDraftWithZod()
    if (validation) {
      setFormError(validation.message)
      setFormFieldErrors(validation.errors)
      return
    }
    setFormError(null)
    setFormFieldErrors({})
    const payload: Partial<SchoolCalendarEvent> = {
      title: draft.title.trim(), type: draft.type, schoolId: draft.schoolId,
      classId: draft.classId || null,
      startsAt: draft.allDay ? draft.startDate : `${draft.startDate}T${draft.startTime}`,
      endsAt:   draft.allDay ? draft.endDate   : `${draft.endDate}T${draft.endTime}`,
      allDay: draft.allDay, location: draft.location.trim(), description: draft.description.trim(),
    }
    if (editingId) await onUpdate(editingId, payload)
    else await onCreate(payload)
    resetForm()
  }

  function handleScheduleEventClick(event: CalendarEventExternal) {
    const selected = visualEvents.find((item) => item.id === event.id)
    if (!selected) return
    openDetailModal(selected.startsAt.slice(0, 10), [selected])
  }

  function handleScheduleDateClick(date: { toString: () => string }, event?: UIEvent) {
    const target = event?.target
    if (target instanceof HTMLElement && target.closest('.sx__event')) return
    const dateString = date.toString().slice(0, 10)
    openDetailModal(dateString, getEventsForDate(dateString))
  }

  scheduleClickRef.current = handleScheduleEventClick
  scheduleDateClickRef.current = handleScheduleDateClick

  /* ── Schedule-X init ── */
  useEffect(() => {
    if (loading || isCompactCalendar || !calendarContainerRef.current) return undefined
    const calendar = createCalendar({
      defaultView: 'month-grid',
      views: [viewMonthGrid, viewWeek, viewDay, viewList],
      events: scheduleEvents,
      calendars: scheduleCalendars,
      locale: 'pt-BR',
      firstDayOfWeek: 1,
      selectedDate: Temporal.PlainDate.from(toDateInput()),
      timezone: TIMEZONE,
      monthGridOptions: { nEventsPerDay: 4 },
      callbacks: {
        onEventClick: (ev) => scheduleClickRef.current(ev),
        onClickDate: (date, ev) => scheduleDateClickRef.current(date, ev),
        onClickDateTime: (dateTime, ev) => scheduleDateClickRef.current(dateTime, ev),
        onClickAgendaDate: (date, ev) => scheduleDateClickRef.current(date, ev),
        onClickPlusEvents: (date, ev) => scheduleDateClickRef.current(date, ev),
      },
    })
    calendar.render(calendarContainerRef.current)
    calendarAppRef.current = calendar
    return () => { calendar.destroy(); calendarAppRef.current = null }
  }, [isCompactCalendar, loading, scheduleDataRevision])

  useEffect(() => {
    if (isCompactCalendar) return
    calendarAppRef.current?.events.set(scheduleEvents)
  }, [isCompactCalendar, scheduleEvents])

  /* ── Render ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes cv-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cv-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cv-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        @keyframes cv-scale-in {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .cv-page {
          animation: cv-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .cv-section {
          animation: cv-fade-up 0.42s cubic-bezier(0.22,1,0.36,1) both;
        }
        .cv-section:nth-child(1) { animation-delay: 0s; }
        .cv-section:nth-child(2) { animation-delay: 0.05s; }
        .cv-section:nth-child(3) { animation-delay: 0.10s; }
        .cv-section:nth-child(4) { animation-delay: 0.15s; }
        .cv-section:nth-child(5) { animation-delay: 0.20s; }

        .cv-metric-card {
          animation: cv-fade-up 0.42s cubic-bezier(0.22,1,0.36,1) both;
        }
        .cv-metric-card:nth-child(1) { animation-delay: 0.05s; }
        .cv-metric-card:nth-child(2) { animation-delay: 0.10s; }
        .cv-metric-card:nth-child(3) { animation-delay: 0.15s; }
        .cv-metric-card:nth-child(4) { animation-delay: 0.20s; }

        .cv-shimmer {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 600px 100%;
          animation: cv-shimmer 1.5s ease-in-out infinite;
        }
        .cv-skeleton-card { animation: cv-fade-in 0.25s ease both; }

        .cv-backdrop {
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(8px);
          animation: cv-fade-in 0.18s ease both;
        }
        .cv-modal {
          animation: cv-scale-in 0.22s cubic-bezier(0.22,1,0.36,1) both;
        }

        .cv-upcoming-card:hover {
          border-color: #94a3b8;
          box-shadow: 0 4px 16px rgba(15,23,42,0.08);
          transform: translateY(-1px);
        }
        .cv-upcoming-card {
          transition: all 0.18s cubic-bezier(0.22,1,0.36,1);
        }

        .cv-mobile-agenda {
          display: none;
        }

        @media (max-width: 767px) {
          .cv-page {
            min-width: 0;
          }

          .cv-main-header {
            align-items: stretch;
            padding: 14px;
          }

          .cv-header-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
          }

          .cv-year-control {
            grid-column: 1 / -1;
            width: 100%;
          }

          .cv-year-control input {
            flex: 1;
            min-width: 0;
          }

          .cv-header-action-button {
            min-height: 38px;
            justify-content: center;
            width: 100%;
          }

          .cv-content {
            gap: 14px;
            padding: 14px;
          }

          .cv-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px;
          }

          .cv-metric-card {
            padding: 12px;
          }

          .cv-metric-card strong {
            font-size: 24px;
          }

          .cv-callout {
            align-items: stretch;
            padding: 14px;
          }

          .cv-callout button {
            width: 100%;
            justify-content: center;
          }

          .cv-calendar-panel-header {
            align-items: stretch;
            padding: 14px;
          }

          .cv-calendar-title-row {
            width: 100%;
          }

          .cv-filter-bar {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
            gap: 8px;
          }

          .cv-filter-group {
            width: 100%;
          }

          .cv-filter-group > *:last-child {
            min-width: 0;
            flex: 1;
          }

          .cv-legend {
            flex-wrap: nowrap;
            gap: 12px;
            overflow-x: auto;
            padding: 10px 14px;
            scrollbar-width: none;
          }

          .cv-legend::-webkit-scrollbar {
            display: none;
          }

          .cv-desktop-calendar {
            display: none !important;
          }

          .cv-mobile-agenda {
            display: block;
          }

          .cv-upcoming-list {
            flex-direction: column;
            overflow-x: visible;
          }

          .cv-upcoming-card {
            min-width: 0;
            width: 100%;
          }

          .cv-modal {
            max-height: calc(100svh - 24px) !important;
            border-radius: 14px;
          }
        }
      `}</style>

      <div className="cv-page font-['DM_Sans',system-ui,sans-serif] text-slate-900 bg-slate-50 min-h-screen">

        {/* ══ HEADER BAR ══ */}
        <div className="px-[clamp(16px,3vw,40px)] pt-5">
          <PageTitleBar
            className="cv-main-header cv-section"
            label="Agenda da rede"
            title="Calendário escolar"
            icon={<CalendarDays />}
            actions={(
              <div className="cv-header-actions flex items-center gap-2 flex-wrap">
            {/* Year nav */}
            <div className="cv-year-control flex items-center bg-slate-50 border border-slate-400 rounded-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setYear((y) => y - 1)}
                aria-label="Ano anterior"
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
                className="w-16 h-8 border-x border-slate-400 bg-white text-center text-[13px] font-bold text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setYear((y) => y + 1)}
                aria-label="Próximo ano"
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setYear(new Date().getFullYear())}
              className="cv-header-action-button inline-flex items-center gap-1.5 bg-white text-slate-500 border border-slate-400 text-[13px] font-semibold px-3 py-1.5 rounded-sm hover:border-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <RefreshCcw size={13} />Hoje
            </button>
              </div>
            )}
          />
        </div>

        {/* ══ HOLIDAY ERROR ══ */}
        {holidayError && (
          <div className="mx-[clamp(16px,3vw,40px)] mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-300 rounded-sm text-[13px] text-red-700 font-semibold">
            <AlertTriangle size={14} className="shrink-0" />
            {holidayError}
          </div>
        )}

        <div className="cv-content px-[clamp(16px,3vw,40px)] py-5 flex flex-col gap-5">

          {/* ══ METRICS ══ */}
          {loading ? (
            <div className="cv-metrics-grid grid grid-cols-4 max-[900px]:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="cv-metrics-grid grid grid-cols-4 max-[900px]:grid-cols-2 gap-3">
              <MetricCard
                label="Eventos" value={visibleSchoolEventCount}
                sub="Criados pela equipe escolar"
                icon={<School size={15} />} iconColor="bg-blue-50 text-blue-600"
              />
              <MetricCard
                label="Feriados" value={holidays.length}
                sub={isLoadingHolidays ? 'Carregando...' : `Brasil ${year}`}
                icon={<Flag size={15} />} iconColor="bg-red-50 text-red-600"
              />
              <MetricCard
                label="Simulados" value={visibleEvaluationCount}
                sub="Do planejamento pedagógico"
                icon={<BookOpen size={15} />} iconColor="bg-emerald-50 text-emerald-700"
              />
              <MetricCard
                label="Próximos" value={upcomingEvents.length}
                sub="Dentro dos filtros ativos"
                icon={<GraduationCap size={15} />} iconColor="bg-amber-50 text-amber-700"
              />
            </div>
          )}

          {/* ══ CALLOUT BAR ══ */}
          {showCreateEventActions ? <div className="cv-callout cv-section bg-white border border-slate-400 rounded-xl px-5 py-4 shadow-md flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.18em] uppercase text-indigo-500">Evento escolar</p>
              <h3 className="font-['Sora',system-ui,sans-serif] text-base font-bold text-slate-800 leading-snug mt-0.5">
                Adicionar ao calendário
              </h3>
              <p className="text-[13px] text-slate-400 mt-0.5">
                {createEventHint}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!canCreateEvent}
              className="cv-header-action-button inline-flex items-center gap-1.5 bg-indigo-600 text-white text-[13px] font-bold px-4 py-1.5 rounded-sm shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              <Plus size={15} />Novo evento
            </button>
          </div> : null}

          {/* ══ CALENDAR PANEL ══ */}
          <section className="cv-section overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm">
            {/* Panel header */}
            <div className="cv-calendar-panel-header px-5 py-3.5 border-b border-slate-400 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
              <div className="cv-calendar-title-row flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                  <CalendarDays size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Agenda visual</p>
                  <p className="font-['Sora',system-ui,sans-serif] text-sm font-bold text-slate-900 leading-none mt-0.5">
                    Calendário
                  </p>
                </div>
              </div>

              <div className="cv-filter-bar flex items-center gap-2 flex-wrap">
                <FilterGroup icon={<Filter size={13} />}>
                  <CompactSelect
                    id="cv-school-filter"
                    value={schoolFilter}
                    onChange={(schoolId) => {
                      setSchoolFilter(schoolId)
                      setClassFilter('all')
                    }}
                    options={schoolFilterOptions}
                    disabled={isProfessorAccess && accessibleSchools.length <= 1}
                    wrapperClassName="flex self-stretch items-center"
                    className="bg-transparent border-none outline-none text-[13px] font-semibold text-slate-900 cursor-pointer appearance-none pr-1 disabled:cursor-not-allowed disabled:text-slate-400"
                    dropdownAnchor="parent"
                  />
                </FilterGroup>

                <FilterGroup icon={<Users size={13} />}>
                  <CompactSelect
                    id="cv-class-filter"
                    value={classFilter}
                    onChange={setClassFilter}
                    options={classFilterOptions}
                    disabled={!schoolFilter || schoolFilter === 'all' || (isProfessorAccess && classesAvailableForSelectedSchool.length === 0)}
                    wrapperClassName="flex self-stretch items-center"
                    className="bg-transparent border-none outline-none text-[13px] font-semibold text-slate-900 cursor-pointer appearance-none pr-1 disabled:cursor-not-allowed disabled:text-slate-400"
                    dropdownAnchor="parent"
                    dropdownMinWidth={240}
                  />
                </FilterGroup>

                <FilterGroup icon={<SlidersHorizontal size={13} />}>
                  <CompactSelect<VisualEventType | 'all'>
                    id="cv-type-filter"
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={typeFilterOptions}
                    wrapperClassName="flex self-stretch items-center"
                    className="bg-transparent border-none outline-none text-[13px] font-semibold text-slate-900 cursor-pointer appearance-none pr-1"
                    dropdownAnchor="parent"
                  />
                </FilterGroup>
              </div>
            </div>

            {/* Legend */}
            <div className="cv-legend flex flex-wrap gap-x-4 gap-y-1.5 px-5 py-2.5 border-b border-slate-400 bg-white">
              {(Object.keys(calendarColors) as VisualEventType[]).map((type) => (
                <span key={type} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: calendarColors[type].main }} />
                  {visualTypeLabels[type]}
                </span>
              ))}
            </div>

            {/* Schedule-X mount */}
            {loading ? (
              <div className="p-5">
                <div className="cv-shimmer rounded-lg" style={{ height: 480 }} />
              </div>
            ) : (
              <>
                <div className="cv-desktop-calendar">
                  {!isCompactCalendar && <div className="cv-schedule-shell p-1" ref={calendarContainerRef} />}
                </div>
                <div className="cv-mobile-agenda">
                  <div className="border-b border-slate-400 bg-slate-50 px-4 py-3.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Agenda compacta</p>
                    <h3 className="font-['Sora',system-ui,sans-serif] text-[15px] font-bold text-slate-900 leading-snug mt-0.5">
                      {mobileAgendaGroups.length > 0
                        ? `${mobileAgendaGroups.length} datas com eventos em ${year}`
                        : `Agenda de ${year}`}
                    </h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                      Eventos agrupados por data, escola, turma e horario.
                    </p>
                  </div>

                  {mobileAgendaGroups.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                        <CalendarDays size={18} />
                      </div>
                      <p className="text-[13px] font-semibold text-slate-500">Nenhum item encontrado nos filtros ativos.</p>
                      <p className="mt-1 text-[12px] text-slate-400">Nenhum evento corresponde aos filtros selecionados.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {mobileAgendaGroups.map((group) => {
                        const dateParts = mobileDateParts(group.date)
                        return (
                          <section key={group.date} className="grid gap-3 px-4 py-4">
                            <div className="flex items-start justify-between gap-3" title={fullDateLabel(group.date)}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-xl border border-slate-300 bg-white shadow-sm">
                                  <strong className="font-['Sora',system-ui,sans-serif] text-xl font-black leading-none text-slate-900">{dateParts.day}</strong>
                                  <span className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-500">{dateParts.month}</span>
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-['Sora',system-ui,sans-serif] text-[14px] font-bold capitalize text-slate-900">{dateParts.weekday}</h4>
                                  <p className="mt-0.5 text-[12px] text-slate-500">{group.events.length} item{group.events.length === 1 ? '' : 's'} nesta data</p>
                                </div>
                              </div>
                              {group.events.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => openDetailModal(group.date, group.events)}
                                  className="flex-shrink-0 rounded-sm border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600"
                                >
                                  Ver todos
                                </button>
                              )}
                            </div>

                            <div className="grid gap-2.5">
                              {group.events.map((event) => (
                                <button
                                  key={event.id}
                                  type="button"
                                  onClick={() => openDetailModal(group.date, [event])}
                                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-left shadow-sm transition-all active:scale-[0.99]"
                                >
                                  <span
                                    className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]"
                                    style={{
                                      background: calendarColors[event.type].bg,
                                      color: calendarColors[event.type].text,
                                    }}
                                  >
                                    {visualTypeLabels[event.type]}
                                  </span>
                                  <strong className="mt-2 block font-['Sora',system-ui,sans-serif] text-[14px] font-bold leading-snug text-slate-900">
                                    {event.title}
                                  </strong>
                                  <div className="mt-2 grid gap-1.5 text-[12px] leading-relaxed text-slate-500">
                                    <span className="flex items-start gap-2">
                                      <Clock size={13} className="mt-0.5 flex-shrink-0 text-slate-400" />
                                      <span>{eventDateRangeLabel(event)} - {timeLabel(event)}</span>
                                    </span>
                                    <span className="flex items-start gap-2">
                                      <School size={13} className="mt-0.5 flex-shrink-0 text-slate-400" />
                                      <span>{getSchoolName(event.schoolId)}</span>
                                    </span>
                                    <span className="flex items-start gap-2">
                                      <Users size={13} className="mt-0.5 flex-shrink-0 text-slate-400" />
                                      <span>{getClassName(event.classId)}</span>
                                    </span>
                                    {event.location && (
                                      <span className="flex items-start gap-2">
                                        <MapPin size={13} className="mt-0.5 flex-shrink-0 text-slate-400" />
                                        <span>{event.location}</span>
                                      </span>
                                    )}
                                  </div>
                                  {event.description && (
                                    <p className="mt-2 border-t border-slate-200 pt-2 text-[12px] leading-relaxed text-slate-500">
                                      {event.description}
                                    </p>
                                  )}
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
          <section className="cv-section overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-400 bg-slate-50 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
                <GraduationCap size={15} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Próximos eventos</p>
                <p className="font-['Sora',system-ui,sans-serif] text-sm font-bold text-slate-900 leading-none mt-0.5">
                  Agenda filtrada
                </p>
              </div>
            </div>

            <div className="cv-upcoming-list flex gap-3 overflow-x-auto p-4">
              {loading ? (
                [1, 2, 3, 4].map(i => <SkeletonUpcoming key={i} />)
              ) : upcomingEvents.length === 0 ? (
                <p className="w-full py-6 text-[13px] text-slate-400 text-center font-medium">
                  Nenhum item encontrado nos filtros ativos.
                </p>
              ) : (
                upcomingEvents.map((ev) => {
                  const { day, mon } = formatUpcomingDate(ev.startsAt)
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openDetailModal(ev.startsAt.slice(0, 10), [ev])}
                      className="cv-upcoming-card flex items-center gap-3 min-w-[240px] w-[270px] border border-slate-400 rounded-sm bg-white px-4 py-3 text-left flex-shrink-0"
                    >
                      <span className="flex flex-col items-center min-w-[36px]">
                        <span className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900 leading-none">{day}</span>
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">{mon}</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <strong className="block text-[13px] font-bold text-slate-900 truncate">{ev.title}</strong>
                        <span className="block text-[11px] text-slate-400 mt-0.5">{visualTypeLabels[ev.type]} · {timeLabel(ev)}</span>
                      </span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: calendarColors[ev.type].main }} />
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
            <div className="grid gap-2.5 px-5 py-4">
              {detailModal.events.map((event) => (
                <article key={event.id} className="border border-slate-400 rounded-sm bg-white overflow-hidden">
                  <div
                    className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5"
                    style={{ background: calendarColors[event.type].bg }}
                  >
                    <span
                      className="text-[10px] font-black tracking-[0.1em] uppercase px-2.5 py-1 rounded-sm"
                      style={{
                        background: calendarColors[event.type].bg,
                        color: calendarColors[event.type].text,
                        border: `1px solid ${calendarColors[event.type].main}66`,
                      }}
                    >
                      {visualTypeLabels[event.type]}
                    </span>
                    {event.source === 'school' && canEditSchoolEvent(event) && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => editSchoolEventFromDetail(event)}
                          className="inline-flex items-center gap-1.5 bg-white/90 text-slate-900 border border-slate-400 text-[12px] font-bold px-3 py-1.5 rounded-sm hover:bg-white hover:border-slate-500 transition-colors"
                        >
                          <Pen size={13} />Editar
                        </button>
                        <button
                          type="button"
                          disabled={deletingEventId === event.sourceId}
                          onClick={() => deleteSchoolEventFromDetail(event)}
                          className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-300 text-[12px] font-bold px-3 py-1.5 rounded-sm hover:bg-red-100 hover:border-red-400 transition-colors"
                        >
                          <Trash2 size={13} />{deletingEventId === event.sourceId ? 'Excluindo' : 'Excluir'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 p-3.5">
                    <h3 className="font-['Sora',system-ui,sans-serif] text-[15px] font-bold leading-snug text-slate-900">
                      {event.title}
                    </h3>
                    <div className="grid gap-1.5 text-[12px] text-slate-500 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-slate-400 flex-shrink-0" />
                        {dateLabel(event.startsAt)} · {timeLabel(event)}
                      </div>
                      <div className="flex items-center gap-2">
                        <School size={13} className="text-slate-400 flex-shrink-0" />
                        {getSchoolName(event.schoolId)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={13} className="text-slate-400 flex-shrink-0" />
                        {getClassName(event.classId)}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="border-t border-slate-400 pt-2.5 text-[12px] leading-relaxed text-slate-500">
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
            description={`Excluir "${deleteTarget.title}" do calendario escolar? Esta acao nao pode ser desfeita.`}
            confirmLabel="Excluir evento"
            loading={deletingEventId === deleteTarget.sourceId}
            onCancel={() => {
              if (!deletingEventId) setDeleteTarget(null)
            }}
            onConfirm={confirmDeleteSchoolEvent}
          />
        )}

        {/* ══ CREATE/EDIT EVENT MODAL ══ */}
        {isEventModalOpen && (
          <Modal
            id="cv-modal-title"
            title={editingId ? 'Atualizar agenda' : 'Criar evento escolar'}
            subtitle={editingId ? 'Editar evento' : 'Novo evento'}
            onClose={resetForm}
          >
            <form onSubmit={handleSubmit} noValidate>
              <div className="px-6 py-5 flex flex-col gap-4">
                {formError && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 border border-red-300 rounded-sm text-[13px] text-red-700 font-semibold">
                    <AlertTriangle size={14} className="shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5 max-[560px]:grid-cols-1">

                  {/* Title */}
                  <div className="col-span-2 max-[560px]:col-span-1 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-title">Título</label>
                    <input
                      id="cv-title"
                      className={`${inputCls} ${fieldStateClass(formFieldErrors.title)}`}
                      value={draft.title}
                      onChange={(e) => updateDraftField('title', e.target.value)}
                      placeholder="Nome do evento"
                      aria-invalid={Boolean(formFieldErrors.title) || undefined}
                      required
                    />
                    <FieldMessage hint="Digite um nome curto para identificar o evento na agenda." error={formFieldErrors.title} />
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-type">Tipo</label>
                    <CompactSelect<CalendarEventType>
                      id="cv-type"
                      className={`${inputCls} ${fieldStateClass(formFieldErrors.type)}`}
                      value={draft.type}
                      onChange={(type) => updateDraftField('type', type)}
                      options={eventTypeOptions}
                      hint="Escolha a categoria que melhor descreve o evento."
                      error={formFieldErrors.type}
                      dropdownMinWidth={190}
                    />
                  </div>

                  {/* School */}
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-school">Escola</label>
                    <CompactSelect
                      id="cv-school"
                      className={`${inputCls} ${fieldStateClass(formFieldErrors.schoolId)}`}
                      value={draft.schoolId}
                      onChange={(schoolId) => {
                        setFormFieldErrors((current) => ({ ...current, schoolId: undefined, classId: undefined }))
                        setDraft({ ...draft, schoolId, classId: '' })
                      }}
                      options={schoolOptions}
                      hint="Selecione a escola responsável por este evento."
                      error={formFieldErrors.schoolId}
                      disabled={isProfessorAccess && accessibleSchools.length <= 1}
                      dropdownMinWidth={260}
                    />
                  </div>

                  {/* Class */}
                  <div className="col-span-2 max-[560px]:col-span-1 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-class">Turma</label>
                    <CompactSelect
                      id="cv-class"
                      className={`${inputCls} ${fieldStateClass(formFieldErrors.classId)}`}
                      value={draft.classId}
                      onChange={(classId) => updateDraftField('classId', classId)}
                      options={classOptions}
                      hint={isProfessorAccess ? 'Selecione a turma vinculada que verá o evento.' : 'Opcional: limite o evento a uma turma específica.'}
                      error={formFieldErrors.classId}
                      disabled={!draft.schoolId || filteredClassesForDraft.length === 0}
                      dropdownMinWidth={260}
                    />
                    {!draft.schoolId && (
                      <p className="text-[11px] font-semibold text-slate-400">Selecione uma escola para habilitar as turmas.</p>
                    )}
                    {isProfessorAccess && draft.schoolId && filteredClassesForDraft.length === 0 && (
                      <p className="text-[11px] font-semibold text-amber-600">Nenhuma turma vinculada ao seu professor nesta escola.</p>
                    )}
                  </div>

                  {/* All-day */}
                  <div className="col-span-2 max-[560px]:col-span-1">
                    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={draft.allDay}
                        onChange={(e) => updateDraftField('allDay', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer rounded-sm"
                      />
                      Dia inteiro
                    </label>
                    <FieldMessage hint="Marque quando o evento ocupar o dia todo e não precisar de horários." error={formFieldErrors.allDay} />
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
                        ariaLabel="Horario inicial do evento"
                        hint="Escolha quando o evento comeca."
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
                        ariaLabel="Horario final do evento"
                        hint="Escolha um horario posterior ao inicio."
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
                      placeholder="Auditório, quadra, sala 2..."
                    />
                    <FieldMessage hint="Opcional: diga onde o evento acontecerá." error={formFieldErrors.location} />
                  </div>

                  {/* Description */}
                  <div className="col-span-2 max-[560px]:col-span-1 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-desc">Descrição</label>
                    <textarea
                      id="cv-desc"
                      className={`${inputCls} min-h-[80px] leading-relaxed ${fieldStateClass(formFieldErrors.description)}`}
                      value={draft.description}
                      onChange={(e) => updateDraftField('description', e.target.value)}
                      rows={3}
                      placeholder="Detalhes adicionais sobre o evento..."
                      aria-invalid={Boolean(formFieldErrors.description) || undefined}
                    />
                    <FieldMessage hint="Opcional: escreva orientações ou contexto para quem verá a agenda." error={formFieldErrors.description} />
                  </div>

                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 pb-6 pt-4 border-t border-slate-400 flex items-center gap-2.5 flex-wrap">
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1.5 bg-white text-slate-500 border border-slate-400 text-[13px] font-bold px-4 py-2 rounded-sm hover:border-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
                >
                  <XCircle size={14} />Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-[13px] font-bold px-4 py-2 rounded-sm hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  {editingId ? <Check size={14} /> : <Plus size={14} />}
                  {editingId ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </Modal>
        )}

      </div>
    </>
  )
}
