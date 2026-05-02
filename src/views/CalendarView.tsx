import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { createCalendar, viewDay, viewList, viewMonthGrid, viewWeek } from '@schedule-x/calendar'
import type { CalendarApp, CalendarEventExternal } from '@schedule-x/calendar'
import '@schedule-x/theme-default/dist/index.css'
import {
  ChevronLeft, ChevronRight, Clock, MapPin,
  Plus, RefreshCcw, Save, Trash2, X, XCircle,
  School, Users, BookOpen, Flag, GraduationCap,
  Filter, SlidersHorizontal,
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import type { CalendarEventType, ClassRoom, Evaluation, School as SchoolModel, SchoolCalendarEvent } from '../types'

/* ─────────────────────────────────────────────
   CSS mínimo — apenas overrides do Schedule-X
   (Tailwind não consegue sobrescrever seletores
   específicos da lib de terceiros)
───────────────────────────────────────────── */
const SCHEDULE_X_OVERRIDES = `
  .cv-schedule-shell .sx__calendar {
    border: none !important;
    background: transparent !important;
    font-family: 'DM Sans', system-ui, sans-serif !important;
    --sx-border: 1px solid #d6d3d1;
    --sx-color-outline-variant: #d6d3d1;
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
    font-family: 'Lora', Georgia, serif !important;
  }
  .cv-schedule-shell .sx__calendar-header {
    border-bottom: 1.5px solid #d6d3d1 !important;
  }
  .cv-schedule-shell .sx__month-grid-day {
    border-color: #d6d3d1 !important;
  }
  .cv-schedule-shell .sx__view-selection-items {
    min-width: 160px !important;
    border: 1px solid #d6d3d1 !important;
    border-radius: 8px !important;
    background: #fff !important;
    padding: 4px !important;
    box-shadow: 0 18px 40px rgba(28, 25, 23, .16) !important;
  }
  .cv-schedule-shell .sx__view-selection-item {
    border-radius: 6px !important;
    color: #57534e !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    padding: 8px 10px !important;
  }
  .cv-schedule-shell .sx__view-selection-item:hover,
  .cv-schedule-shell .sx__view-selection-item:focus {
    background: #f5f5f4 !important;
    color: #1c1917 !important;
  }
  .cv-schedule-shell .sx__view-selection-item.is-selected {
    background: #1c1917 !important;
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
  location?: string
  description?: string
}

type DetailModalState = {
  date: string
  events: VisualCalendarEvent[]
}

interface CalendarViewProps {
  calendarEvents: SchoolCalendarEvent[]
  schools: SchoolModel[]
  classes: ClassRoom[]
  evaluations: Evaluation[]
  onCreate: (draft: Partial<SchoolCalendarEvent>) => Promise<void>
  onUpdate: (id: string, draft: Partial<SchoolCalendarEvent>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const eventTypes: Array<{ value: CalendarEventType; label: string }> = [
  { value: 'evento', label: 'Evento escolar' },
  { value: 'aula', label: 'Aula especial' },
  { value: 'reuniao', label: 'Reuniao' },
  { value: 'avaliacao', label: 'Avaliacao' },
  { value: 'prazo', label: 'Prazo' },
]

const visualTypeLabels: Record<VisualEventType, string> = {
  evento: 'Evento',
  aula: 'Aula especial',
  reuniao: 'Reuniao',
  avaliacao: 'Avaliacao',
  prazo: 'Prazo',
  feriado: 'Feriado',
  simulado: 'Simulado',
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
  if (!response.ok) throw new Error('Nao foi possivel carregar os feriados nacionais.')
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
    endDate: today,  endTime: '09:00',
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
  return `${start} - ${end}`
}

function dateLabel(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/* ─────────────────────────────────────────────
   Sub-components (extracted for readability)
───────────────────────────────────────────── */

/** Metric card */
function MetricCard({
  label, value, sub, icon, colorClass,
}: {
  label: string; value: string | number; sub: string
  icon: React.ReactNode; colorClass: string
}) {
  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-5 flex flex-col gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-stone-400">{label}</span>
        <span className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          {icon}
        </span>
      </div>
      <strong className="font-['Lora'] text-[32px] font-semibold text-stone-900 leading-none">{value}</strong>
      <span className="text-[12px] text-stone-400">{sub}</span>
    </div>
  )
}

/** Filter group */
function FilterGroup({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[34px] items-center gap-2 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5">
      <span className="flex self-stretch items-center justify-center text-stone-400 flex-shrink-0">{icon}</span>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function CalendarView({
  calendarEvents, schools, classes, evaluations,
  onCreate, onUpdate, onDelete,
}: CalendarViewProps) {
  const defaultSchoolId = schools[0]?.id ?? ''

  const [draft, setDraft]                     = useState<CalendarFormState>(() => createEmptyForm(defaultSchoolId))
  const [editingId, setEditingId]             = useState<string | null>(null)
  const [detailModal, setDetailModal]         = useState<DetailModalState | null>(null)
  const [schoolFilter, setSchoolFilter]       = useState('all')
  const [typeFilter, setTypeFilter]           = useState<VisualEventType | 'all'>('all')
  const [year, setYear]                       = useState(new Date().getFullYear())
  const [holidays, setHolidays]               = useState<BrazilHoliday[]>([])
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false)
  const [holidayError, setHolidayError]       = useState<string | null>(null)
  const [formError, setFormError]             = useState<string | null>(null)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)

  const calendarContainerRef = useRef<HTMLDivElement | null>(null)
  const calendarAppRef       = useRef<CalendarApp | null>(null)
  const scheduleClickRef     = useRef<(event: CalendarEventExternal) => void>(() => undefined)
  const scheduleDateClickRef = useRef<(date: { toString: () => string }, event?: UIEvent) => void>(() => undefined)

  /* inject only the Schedule-X overrides */
  useEffect(() => {
    const styleId = 'sx-overrides'
    if (document.getElementById(styleId)) return
    const el = document.createElement('style')
    el.id = styleId
    el.textContent = SCHEDULE_X_OVERRIDES
    document.head.appendChild(el)
  }, [])

  useEffect(() => {
    if (!draft.schoolId && defaultSchoolId)
      setDraft((c) => ({ ...c, schoolId: defaultSchoolId }))
  }, [defaultSchoolId, draft.schoolId])

  useEffect(() => {
    let cancelled = false
    setIsLoadingHolidays(true)
    setHolidayError(null)
    buscarFeriados(year)
      .then((items) => { if (!cancelled) setHolidays(items) })
      .catch((err)  => { if (!cancelled) { setHolidays([]); setHolidayError(err instanceof Error ? err.message : 'Erro ao carregar feriados.') } })
      .finally(()   => { if (!cancelled) setIsLoadingHolidays(false) })
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
      location: ev.location, description: ev.description,
    }))
    return [...schoolEvents, ...evaluationEvents, ...holidayEvents]
  }, [calendarEvents, classes, evaluations, holidays])

  const filteredVisualEvents = useMemo(
    () => visualEvents.filter((ev) => {
      const matchesSchool = schoolFilter === 'all' || ev.source === 'holiday' || ev.schoolId === schoolFilter
      const matchesType   = typeFilter === 'all' || ev.type === typeFilter
      return matchesSchool && matchesType
    }),
    [schoolFilter, typeFilter, visualEvents],
  )

  const scheduleEvents  = useMemo(() => filteredVisualEvents.map(toScheduleEvent), [filteredVisualEvents])

  const upcomingEvents  = useMemo(() => {
    const today = toDateInput()
    return [...filteredVisualEvents]
      .filter((ev) => ev.startsAt.slice(0, 10) >= today)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 10)
  }, [filteredVisualEvents])

  const filteredClassesForDraft = useMemo(
    () => draft.schoolId ? classes.filter((c) => c.schoolId === draft.schoolId) : classes,
    [classes, draft.schoolId],
  )

  /* ── Helpers ── */
  const schoolFilterOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [
      { value: 'all', label: 'Todas as escolas' },
      ...schools.map((school) => ({ value: school.id, label: school.name })),
    ],
    [schools],
  )

  const typeFilterOptions = useMemo<Array<CompactSelectOption<VisualEventType | 'all'>>>(
    () => [
      { value: 'all', label: 'Todos os tipos' },
      { value: 'feriado', label: 'Feriados', swatch: calendarColors.feriado.main },
      { value: 'simulado', label: 'Simulados', swatch: calendarColors.simulado.main },
      ...eventTypes.map((type) => ({
        value: type.value,
        label: type.label,
        swatch: calendarColors[type.value].main,
      })),
    ],
    [],
  )

  const eventTypeOptions = useMemo<Array<CompactSelectOption<CalendarEventType>>>(
    () => eventTypes.map((type) => ({
      value: type.value,
      label: type.label,
      swatch: calendarColors[type.value].main,
    })),
    [],
  )

  const schoolOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [
      { value: '', label: 'Selecione a escola' },
      ...schools.map((school) => ({ value: school.id, label: school.name })),
    ],
    [schools],
  )

  const classOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [
      { value: '', label: 'Todas as turmas' },
      ...filteredClassesForDraft.map((classRoom) => ({ value: classRoom.id, label: classRoom.name })),
    ],
    [filteredClassesForDraft],
  )

  function getSchoolName(id?: string | null) {
    return !id ? 'Rede municipal' : schools.find((s) => s.id === id)?.name ?? 'Escola nao localizada'
  }
  function getClassName(id?: string | null) {
    return !id ? 'Todas as turmas' : classes.find((c) => c.id === id)?.name ?? 'Turma nao localizada'
  }

  function eventMatchesDate(event: VisualCalendarEvent, date: string) {
    return event.startsAt.slice(0, 10) <= date && event.endsAt.slice(0, 10) >= date
  }

  function getEventsForDate(date: string) {
    return filteredVisualEvents
      .filter((event) => eventMatchesDate(event, date))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title))
  }

  function openDetailModal(date: string, events: VisualCalendarEvent[]) {
    if (events.length === 0) return
    setEditingId(null)
    setFormError(null)
    setIsEventModalOpen(false)
    setDetailModal({ date, events })
  }

  function closeDetailModal() {
    setDetailModal(null)
  }

  function editSchoolEventFromDetail(event: VisualCalendarEvent) {
    const schoolEvent = calendarEvents.find((item) => item.id === event.sourceId)
    if (!schoolEvent) return
    closeDetailModal()
    startEditing(schoolEvent)
  }

  /* ── Actions ── */
  function startEditing(event: SchoolCalendarEvent) {
    const start = splitDateTime(event.startsAt, '08:00')
    const end   = splitDateTime(event.endsAt, event.allDay ? '23:59' : '09:00')
    setEditingId(event.id); setDetailModal(null); setFormError(null); setIsEventModalOpen(true)
    setDraft({ title: event.title, type: event.type, schoolId: event.schoolId,
      classId: event.classId ?? '', startDate: start.date, startTime: start.time,
      endDate: end.date, endTime: end.time, allDay: event.allDay,
      location: event.location, description: event.description })
  }

  function openCreateModal() {
    setEditingId(null); setDetailModal(null); setFormError(null)
    setDraft(createEmptyForm(defaultSchoolId)); setIsEventModalOpen(true)
  }

  function resetForm() {
    setEditingId(null); setDetailModal(null); setFormError(null)
    setIsEventModalOpen(false); setDraft(createEmptyForm(defaultSchoolId))
  }

  function validateDraft() {
    if (!draft.title.trim()) return 'Informe o titulo do evento.'
    if (!draft.schoolId) return 'Selecione uma escola para o evento.'
    if (draft.endDate < draft.startDate) return 'A data final precisa ser igual ou posterior a data inicial.'
    if (!draft.allDay && draft.startDate === draft.endDate && draft.endTime <= draft.startTime)
      return 'O horario final precisa ser posterior ao horario inicial.'
    return null
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const error = validateDraft()
    if (error) { setFormError(error); return }
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

  async function handleDelete() {
    if (!editingId) return
    if (!window.confirm('Excluir este evento do calendario escolar?')) return
    await onDelete(editingId)
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
    if (!calendarContainerRef.current) return undefined
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
  }, [])

  useEffect(() => {
    calendarAppRef.current?.events.set(scheduleEvents)
  }, [scheduleEvents])

  /* ── Shared input classes ── */
  const inputCls = 'w-full bg-stone-50 border border-stone-300 rounded-md px-3 py-2.5 font-[\'DM_Sans\'] text-sm text-stone-900 outline-none transition focus:border-stone-400 focus:shadow-[0_0_0_3px_rgba(28,27,24,.08)] focus:bg-white appearance-none'
  const labelCls = 'text-[11px] font-semibold tracking-widest uppercase text-stone-400'

  /* ── Render ── */
  return (
    <div className="font-['DM_Sans'] text-stone-900 bg-stone-50 min-h-screen">

      {/* ── Header ── */}
      <header className="bg-white border-b border-stone-300 px-9 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold tracking-[.12em] uppercase text-stone-400">Agenda da rede</span>
          <h1 className="font-['Lora'] text-[28px] font-semibold text-stone-900 leading-tight tracking-tight">
            Calendario escolar
          </h1>
          <p className="text-sm text-stone-500">Eventos, simulados e feriados em uma agenda unificada.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Year nav */}
          <div className="flex items-center bg-stone-50 border border-stone-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Ano anterior"
              className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
              className="w-16 h-8 border-x border-stone-300 bg-white text-center text-[13px] font-semibold text-stone-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Proximo ano"
              className="w-8 h-8 flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setYear(new Date().getFullYear())}
            className="inline-flex items-center gap-1.5 bg-white text-stone-500 border border-stone-300 text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:border-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-all"
          >
            <RefreshCcw size={14} />Hoje
          </button>
        </div>
      </header>

      {/* ── Holiday error ── */}
      {holidayError && (
        <div className="mx-9 mt-4 px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-[13px] text-red-700 font-medium">
          {holidayError}
        </div>
      )}

      {/* ── Metrics ── */}
      <section className="grid grid-cols-4 max-[900px]:grid-cols-2 gap-4 px-9 pt-6">
        <MetricCard label="Eventos"  value={calendarEvents.length} sub="Criados pela equipe escolar"
          icon={<School size={16} />}     colorClass="bg-blue-50 text-blue-600" />
        <MetricCard label="Feriados" value={holidays.length}
          sub={isLoadingHolidays ? 'Carregando...' : `Brasil ${year}`}
          icon={<Flag size={16} />}       colorClass="bg-red-50 text-red-700" />
        <MetricCard label="Simulados" value={evaluations.length} sub="Do planejamento pedagogico"
          icon={<BookOpen size={16} />}   colorClass="bg-emerald-50 text-emerald-700" />
        <MetricCard label="Proximos"  value={upcomingEvents.length} sub="Dentro dos filtros ativos"
          icon={<GraduationCap size={16} />} colorClass="bg-amber-50 text-amber-700" />
      </section>

      {/* ── Workspace ── */}
      {/* Create event callout */}
      <section className="px-9 pt-5">
        <div className="bg-stone-900 rounded-2xl px-5 py-4 shadow-md flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[.1em] uppercase text-stone-400">Evento escolar</p>
            <h3 className="font-['Lora'] text-lg font-semibold text-white leading-snug mt-0.5">Adicionar ao calendario</h3>
            <p className="text-[13px] text-stone-400 mt-0.5">Crie eventos, reunioes, prazos e muito mais.</p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 bg-white text-stone-900 text-[13px] font-semibold px-4 py-2.5 rounded-lg hover:bg-stone-100 transition-colors flex-shrink-0"
          >
            <Plus size={15} />Novo evento
          </button>
        </div>
      </section>

      {/* Workspace */}
      <div className="grid grid-cols-1 gap-5 px-9 py-6 items-start">

        {/* Main column */}
        <div className="flex flex-col gap-5 min-w-0">

          {/* Calendar panel */}
          <div className="bg-white border border-stone-300 rounded-2xl shadow-sm overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-2.5 border-b border-stone-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <span className="text-[11px] font-semibold tracking-widest uppercase text-stone-400">Schedule-X</span>
                <h2 className="font-['Lora'] text-lg font-semibold text-stone-900 mt-0.5">Agenda visual</h2>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <FilterGroup icon={<Filter size={13} />}>
                  <CompactSelect
                    id="cv-school-filter"
                    value={schoolFilter}
                    onChange={setSchoolFilter}
                    options={schoolFilterOptions}
                    wrapperClassName="flex self-stretch items-center"
                    className="bg-transparent border-none outline-none text-[13px] font-medium text-stone-900 cursor-pointer appearance-none pr-1"
                    dropdownAnchor="parent"
                  />
                </FilterGroup>

                <FilterGroup icon={<SlidersHorizontal size={13} />}>
                  <CompactSelect<VisualEventType | 'all'>
                    id="cv-type-filter"
                    value={typeFilter}
                    onChange={setTypeFilter}
                    options={typeFilterOptions}
                    wrapperClassName="flex self-stretch items-center"
                    className="bg-transparent border-none outline-none text-[13px] font-medium text-stone-900 cursor-pointer appearance-none pr-1"
                    dropdownAnchor="parent"
                  />
                </FilterGroup>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-6 py-2 border-b border-stone-100 bg-stone-50">
              {(Object.keys(calendarColors) as VisualEventType[]).map((type) => (
                <span key={type} className="flex items-center gap-1.5 text-[12px] font-medium text-stone-500">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: calendarColors[type].main }} />
                  {visualTypeLabels[type]}
                </span>
              ))}
            </div>

            {/* Schedule-X mounts here */}
            <div className="cv-schedule-shell p-1" ref={calendarContainerRef} />
          </div>

          {/* Upcoming events — horizontal scroll */}
          <div className="bg-white border border-stone-300 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-stone-400">Proximos eventos</span>
              <h3 className="font-['Lora'] text-lg font-semibold text-stone-900 mt-1">Agenda filtrada</h3>
            </div>

            <div className="flex gap-3 overflow-x-auto p-3 scrollbar-thin">
              {upcomingEvents.length === 0 && (
                <p className="w-full py-6 text-[13px] text-stone-400 text-center">
                  Nenhum item encontrado nos filtros ativos.
                </p>
              )}
              {upcomingEvents.map((ev) => {
                const { day, mon } = formatUpcomingDate(ev.startsAt)
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => openDetailModal(ev.startsAt.slice(0, 10), [ev])}
                    className="flex items-center gap-3 min-w-[240px] w-[280px] border border-stone-300 rounded-lg bg-white px-4 py-3 text-left hover:border-stone-400 hover:bg-stone-50 transition-colors flex-shrink-0"
                  >
                    <span className="flex flex-col items-center min-w-[36px]">
                      <span className="font-['Lora'] text-xl text-stone-900 leading-none">{day}</span>
                      <span className="text-[10px] uppercase tracking-widest text-stone-400 mt-0.5">{mon}</span>
                    </span>
                    <span className="flex-1 min-w-0">
                      <strong className="block text-[13px] font-semibold text-stone-900 truncate">{ev.title}</strong>
                      <span className="block text-[11px] text-stone-400 mt-0.5">{visualTypeLabels[ev.type]} - {timeLabel(ev)}</span>
                    </span>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: calendarColors[ev.type].main }} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ── Event modal ── */}
      {detailModal && (
        <div
          role="presentation"
          onMouseDown={closeDetailModal}
          className="fixed inset-0 bg-stone-900/45 backdrop-blur-sm flex items-center justify-center z-[1000] p-5 animate-[fadein_.15s_ease]"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cv-detail-title"
            onMouseDown={(e) => e.stopPropagation()}
            className="bg-white border border-stone-300 rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[90vh] overflow-y-auto animate-[slidein_.2s_ease]"
          >
            <div className="sticky top-0 bg-white z-10 px-7 py-6 border-b border-stone-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-stone-400">
                  {detailModal.events.length === 1 ? visualTypeLabels[detailModal.events[0].type] : 'Agenda do dia'}
                </p>
                <h2 id="cv-detail-title" className="font-['Lora'] text-xl font-semibold text-stone-900 mt-0.5">
                  {detailModal.events.length === 1 ? detailModal.events[0].title : dateLabel(detailModal.date)}
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  {detailModal.events.length === 1
                    ? `${dateLabel(detailModal.events[0].startsAt)} - ${timeLabel(detailModal.events[0])}`
                    : `${detailModal.events.length} itens encontrados nesta data.`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                aria-label="Fechar"
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-7 py-6 grid gap-3">
              {detailModal.events.map((event) => (
                <article key={event.id} className="border border-stone-300 rounded-xl bg-white overflow-hidden">
                  <div
                    className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                    style={{ background: calendarColors[event.type].bg }}
                  >
                    <span
                      className="text-[11px] font-semibold tracking-[.06em] uppercase px-2 py-1 rounded-full"
                      style={{
                        background: calendarColors[event.type].bg,
                        color: calendarColors[event.type].text,
                        border: `1px solid ${calendarColors[event.type].main}66`,
                      }}
                    >
                      {visualTypeLabels[event.type]}
                    </span>
                    {event.source === 'school' && (
                      <button
                        type="button"
                        onClick={() => editSchoolEventFromDetail(event)}
                        className="inline-flex items-center gap-1.5 bg-white/85 text-stone-900 border border-stone-300 text-[13px] font-semibold px-3 py-1.5 rounded-lg hover:bg-white hover:border-stone-400 transition-colors"
                      >
                        <Save size={14} />Editar
                      </button>
                    )}
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <h3 className="font-['Lora'] text-[18px] font-semibold text-stone-900 leading-snug">
                      {event.title}
                    </h3>
                    <div className="grid gap-2 text-[13px] text-stone-500 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-stone-400 flex-shrink-0" />
                        {dateLabel(event.startsAt)} - {timeLabel(event)}
                      </div>
                      <div className="flex items-center gap-2">
                        <School size={14} className="text-stone-400 flex-shrink-0" />
                        {getSchoolName(event.schoolId)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-stone-400 flex-shrink-0" />
                        {event.location || getClassName(event.classId)}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-stone-400 flex-shrink-0" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-[13px] text-stone-500 leading-relaxed pt-3 border-t border-stone-100">
                        {event.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {isEventModalOpen && (
        <div
          role="presentation"
          onMouseDown={resetForm}
          className="fixed inset-0 bg-stone-900/45 backdrop-blur-sm flex items-center justify-center z-[1000] p-5 animate-[fadein_.15s_ease]"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cv-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
            className="bg-white border border-stone-300 rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[90vh] overflow-y-auto animate-[slidein_.2s_ease]"
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-stone-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-stone-400">
                  {editingId ? 'Editar evento' : 'Novo evento'}
                </p>
                <h2 id="cv-modal-title" className="font-['Lora'] text-xl font-semibold text-stone-900 mt-0.5">
                  {editingId ? 'Atualizar agenda' : 'Criar evento escolar'}
                </h2>
              </div>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Fechar"
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="px-7 py-6 flex flex-col gap-4">
                {formError && (
                  <div className="px-3.5 py-2.5 bg-red-50 border border-red-300 rounded-md text-[13px] text-red-700 font-medium">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5">
                  {/* Title — full width */}
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-title">Titulo</label>
                    <input
                      id="cv-title"
                      className={inputCls}
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      placeholder="Nome do evento"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-type">Tipo</label>
                    <CompactSelect<CalendarEventType>
                      id="cv-type"
                      className={inputCls}
                      value={draft.type}
                      onChange={(type) => setDraft({ ...draft, type })}
                      options={eventTypeOptions}
                      dropdownMinWidth={190}
                    />
                  </div>

                  {/* School */}
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-school">Escola</label>
                    <CompactSelect
                      id="cv-school"
                      className={inputCls}
                      value={draft.schoolId}
                      onChange={(schoolId) => setDraft({ ...draft, schoolId, classId: '' })}
                      options={schoolOptions}
                      dropdownMinWidth={260}
                    />
                  </div>

                  {/* Class — full width */}
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-class">Turma</label>
                    <CompactSelect
                      id="cv-class"
                      className={inputCls}
                      value={draft.classId}
                      onChange={(classId) => setDraft({ ...draft, classId })}
                      options={classOptions}
                      dropdownMinWidth={260}
                    />
                  </div>

                  {/* All-day checkbox — full width */}
                  <div className="col-span-2">
                    <label className="flex items-center gap-2.5 py-2 cursor-pointer text-sm font-medium text-stone-600">
                      <input
                        type="checkbox"
                        checked={draft.allDay}
                        onChange={(e) => setDraft({ ...draft, allDay: e.target.checked })}
                        className="w-4 h-4 accent-stone-900 cursor-pointer"
                      />
                      Dia inteiro
                    </label>
                  </div>

                  {/* Start date */}
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-start-date">Data de inicio</label>
                    <input
                      id="cv-start-date"
                      type="date"
                      className={inputCls}
                      value={draft.startDate}
                      onChange={(e) => setDraft({
                        ...draft,
                        startDate: e.target.value,
                        endDate: draft.endDate < e.target.value ? e.target.value : draft.endDate,
                      })}
                      required
                    />
                  </div>

                  {/* Start time */}
                  {!draft.allDay && (
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls} htmlFor="cv-start-time">Horario inicial</label>
                      <input
                        id="cv-start-time"
                        type="time"
                        className={inputCls}
                        value={draft.startTime}
                        onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {/* End date */}
                  <div className="flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-end-date">Data de termino</label>
                    <input
                      id="cv-end-date"
                      type="date"
                      className={inputCls}
                      value={draft.endDate}
                      onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                      required
                    />
                  </div>

                  {/* End time */}
                  {!draft.allDay && (
                    <div className="flex flex-col gap-1.5">
                      <label className={labelCls} htmlFor="cv-end-time">Horario final</label>
                      <input
                        id="cv-end-time"
                        type="time"
                        className={inputCls}
                        value={draft.endTime}
                        onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {/* Location — full width */}
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-location">Local</label>
                    <input
                      id="cv-location"
                      className={inputCls}
                      value={draft.location}
                      onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                      placeholder="Auditorio, quadra, sala 2..."
                    />
                  </div>

                  {/* Description — full width */}
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="cv-desc">Descricao</label>
                    <textarea
                      id="cv-desc"
                      className={`${inputCls} resize-y min-h-[80px] leading-relaxed`}
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      rows={3}
                      placeholder="Detalhes adicionais sobre o evento..."
                    />
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-7 pb-6 pt-4 border-t border-stone-100 flex items-center gap-2.5">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-300 text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-red-100 hover:border-red-400 transition-colors"
                  >
                    <Trash2 size={15} />Excluir
                  </button>
                )}
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1.5 bg-white text-stone-500 border border-stone-300 text-[13px] font-semibold px-4 py-2 rounded-lg hover:border-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-all"
                >
                  <XCircle size={15} />Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 bg-stone-900 text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors"
                >
                  <Save size={15} />{editingId ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
