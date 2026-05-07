import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'

import { cn } from '../../lib/cn'

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string
  hint?: string
  error?: string
  icon?: ReactNode
  wrapperClassName?: string
  labelClassName?: string
  hintClassName?: string
  errorClassName?: string
}

const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'] as const
const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const
const MONTH_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const
const MIN_CALENDAR_YEAR = 1900
const MAX_CALENDAR_YEAR = new Date().getFullYear()
const DEFAULT_MIN_DATE = `${MIN_CALENDAR_YEAR}-01-01`
const DEFAULT_MAX_DATE = `${MAX_CALENDAR_YEAR}-12-31`

export const dateInputClassName =
  'min-h-10 w-full min-w-0 rounded-sm border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none transition-all [color-scheme:light] placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60'

type CalView = 'days' | 'months' | 'years'

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  {
    label,
    hint,
    error,
    icon,
    wrapperClassName,
    labelClassName,
    hintClassName,
    errorClassName,
    className,
    id,
    value,
    onChange,
    disabled,
    readOnly,
    placeholder = 'Selecione uma data',
    min,
    max,
    ...props
  },
  ref,
) {
  const fallbackId = useId()
  const inputId = id ?? `date-input-${fallbackId}`
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const panelRef   = useRef<HTMLDivElement | null>(null)

  const selectedDate = useMemo(() => parseDateValue(String(value ?? '')), [value])
  const minDate = useMemo(() => {
    const defaultMinDate = parseDateValue(DEFAULT_MIN_DATE)!
    const configuredMinDate = parseDateValue(String(min ?? ''))
    return laterDate(defaultMinDate, configuredMinDate)
  }, [min])
  const maxDate = useMemo(() => {
    const defaultMaxDate = parseDateValue(DEFAULT_MAX_DATE)!
    const configuredMaxDate = parseDateValue(String(max ?? ''))
    return earlierDate(defaultMaxDate, configuredMaxDate)
  }, [max])

  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(clampDate(selectedDate ?? new Date(), minDate, maxDate)))
  const [view, setView]   = useState<CalView>('days')
  const [yearRangeStart, setYearRangeStart] = useState(() =>
    getYearRangeStart(clampDate(selectedDate ?? new Date(), minDate, maxDate).getFullYear()),
  )
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

  /* Sync visible month when value changes externally */
  useEffect(() => {
    if (selectedDate) {
      const clampedDate = clampDate(selectedDate, minDate, maxDate)
      setVisibleMonth(getMonthStart(clampedDate))
      setYearRangeStart(getYearRangeStart(clampedDate.getFullYear()))
    }
  }, [maxDate, minDate, selectedDate])

  /* Close on outside click / Escape */
  useEffect(() => {
    if (!open) { setView('days'); return undefined }

    function handlePointerDown(e: PointerEvent) {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  /* Recalculate panel position anchored to the trigger — width matches trigger */
  useEffect(() => {
    if (!open) return undefined

    function reposition() {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()

      const top  = r.bottom + 4
      const left = r.left

      // Use the trigger's own width so the calendar always matches the input
      setPanelStyle({ position: 'fixed', top, left, width: r.width, zIndex: 99999 })
    }

    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open])

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const today = new Date()
  const FieldIcon = icon ?? <CalendarDays size={14} />

  function emitChange(nextValue: string) {
    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as ChangeEvent<HTMLInputElement>)
  }

  function selectDate(day: Date) {
    if (isDateDisabled(day, minDate, maxDate)) return
    emitChange(formatDateValue(day))
    setVisibleMonth(getMonthStart(day))
    setOpen(false)
  }

  const hasValue     = !!selectedDate
  const displayDay   = selectedDate ? String(selectedDate.getDate()).padStart(2, '0') : null
  const displayMonth = selectedDate ? MONTH_SHORT[selectedDate.getMonth()] : null
  const displayYear  = selectedDate ? String(selectedDate.getFullYear()) : null

  /* ─────────────── render ─────────────── */
  const control = (
    <div ref={triggerRef} className="relative min-w-0">
      <style>{`
        @keyframes di-drop {
          from { opacity:0; transform:translateY(-4px) scaleY(0.97); }
          to   { opacity:1; transform:translateY(0)    scaleY(1);    }
        }
        .di-panel { animation: di-drop 0.13s cubic-bezier(0.22,1,0.36,1) both; transform-origin: top; }
      `}</style>

      {/* Hidden native input for form compatibility */}
      <input
        ref={ref}
        id={inputId}
        type="date"
        className="sr-only"
        tabIndex={-1}
        value={String(value ?? '')}
        min={minDate ? formatDateValue(minDate) : undefined}
        max={maxDate ? formatDateValue(maxDate) : undefined}
        readOnly
        aria-hidden="true"
        {...props}
      />

      {/* ── Trigger button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled && !readOnly) setOpen((v) => !v) }}
        className={cn(
          'group flex min-h-10 w-full items-center gap-2 rounded-sm border bg-slate-50 px-3 text-left outline-none transition-all',
          'border-slate-300 hover:border-slate-400 hover:bg-white',
          open  && 'border-indigo-500 bg-white ring-3 ring-indigo-100',
          error && 'border-red-400 bg-red-50',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={cn('shrink-0 transition-colors', open ? 'text-indigo-500' : 'text-slate-400')}>
          {FieldIcon}
        </span>

        {hasValue ? (
          <span className="flex min-w-0 flex-1 items-baseline gap-1">
            <span className="font-['Sora',system-ui,sans-serif] text-base font-black leading-none tabular-nums text-slate-900">
              {displayDay}
            </span>
            <span className="text-[12px] font-bold text-indigo-600">{displayMonth}</span>
            <span className="text-[12px] font-semibold text-slate-400">{displayYear}</span>
          </span>
        ) : (
          <span className="flex-1 text-sm font-medium text-slate-400">{placeholder}</span>
        )}

        {hasValue && !disabled && !readOnly && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); emitChange('') }}
            className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-300 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
            aria-label="Limpar"
          >
            <X size={10} />
          </span>
        )}
      </button>

      {/* ── Calendar panel — rendered in <body> via portal to escape overflow:hidden ── */}
      {typeof document !== 'undefined' && createPortal(
        open ? (
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Selecionar data"
            style={panelStyle}
            className="di-panel overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.14)]"
          >
            {/* Header */}
            <div className="flex items-center gap-1.5 bg-indigo-600 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => {
                  if (view === 'days') setVisibleMonth((m) => clampMonth(shiftMonth(m, -1), minDate, maxDate))
                  if (view === 'months') setVisibleMonth((m) => clampMonth(new Date(m.getFullYear() - 1, m.getMonth(), 1), minDate, maxDate))
                  if (view === 'years') setYearRangeStart((y) => Math.max(MIN_CALENDAR_YEAR, y - 12))
                }}
                disabled={
                  (view === 'days' && !canGoToPreviousMonth(visibleMonth, minDate)) ||
                  (view === 'months' && visibleMonth.getFullYear() <= MIN_CALENDAR_YEAR) ||
                  (view === 'years' && yearRangeStart <= MIN_CALENDAR_YEAR)
                }
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-white/60 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-white/60"
                aria-label="Periodo anterior"
              >
                <ChevronLeft size={12} />
              </button>

              <button
                type="button"
                onClick={() => setView((v) => v === 'days' ? 'months' : v === 'months' ? 'years' : 'days')}
                className="flex-1 text-center text-[11px] font-black text-white hover:text-indigo-200 transition"
              >
                {view === 'years'  ? `${yearRangeStart} – ${yearRangeStart + 11}`
                  : view === 'months' ? String(visibleMonth.getFullYear())
                  : `${MONTH_LABELS[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (view === 'days') setVisibleMonth((m) => clampMonth(shiftMonth(m, 1), minDate, maxDate))
                  if (view === 'months') setVisibleMonth((m) => clampMonth(new Date(m.getFullYear() + 1, m.getMonth(), 1), minDate, maxDate))
                  if (view === 'years') setYearRangeStart((y) => Math.min(MAX_CALENDAR_YEAR - 11, y + 12))
                }}
                disabled={
                  (view === 'days' && !canGoToNextMonth(visibleMonth, maxDate)) ||
                  (view === 'months' && visibleMonth.getFullYear() >= MAX_CALENDAR_YEAR) ||
                  (view === 'years' && yearRangeStart + 11 >= MAX_CALENDAR_YEAR)
                }
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-white/60 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-white/60"
                aria-label="Proximo periodo"
              >
                <ChevronRight size={12} />
              </button>
            </div>

            <div className="p-2">

              {/* ═══ DAYS ═══ */}
              {view === 'days' && (
                <>
                  {/* Weekday headers */}
                  <div className="mb-0.5 grid grid-cols-7">
                    {WEEKDAY_LABELS.map((wd, i) => (
                      <div
                        key={i}
                        className={cn(
                          'py-1 text-center text-[9px] font-black uppercase tracking-widest',
                          i >= 5 ? 'text-violet-300' : 'text-slate-300',
                        )}
                      >
                        {wd}
                      </div>
                    ))}
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-7 gap-px">
                    {calendarDays.map((day) => {
                      const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                      const isToday    = isSameDay(day, today)
                      const isCurMonth = day.getMonth() === visibleMonth.getMonth()
                      const isDisabled = isDateDisabled(day, minDate, maxDate)
                      const isWeekend  = day.getDay() === 0 || day.getDay() === 6

                      return (
                        <button
                          key={formatDateValue(day)}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => selectDate(day)}
                          className={cn(
                            'relative grid h-7 w-full place-items-center rounded text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-25',
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : isToday
                                ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-300'
                                : isCurMonth
                                  ? isWeekend
                                    ? 'text-violet-500 hover:bg-violet-50'
                                    : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                                  : 'text-slate-300 hover:bg-slate-50',
                          )}
                        >
                          {day.getDate()}
                        </button>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={() => selectDate(today)}
                      disabled={isDateDisabled(today, minDate, maxDate)}
                      className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-40"
                    >
                      Hoje
                    </button>
                    {selectedDate && (
                      <span className="ml-auto text-[10px] font-semibold text-slate-400">
                        {String(selectedDate.getDate()).padStart(2, '0')}/{String(selectedDate.getMonth() + 1).padStart(2, '0')}/{selectedDate.getFullYear()}
                      </span>
                    )}
                  </div>
                </>
              )}

              {/* ═══ MONTHS ═══ */}
              {view === 'months' && (
                <div className="grid grid-cols-3 gap-1">
                  {MONTH_SHORT.map((m, i) => {
                    const isSelected = selectedDate &&
                      selectedDate.getFullYear() === visibleMonth.getFullYear() &&
                      selectedDate.getMonth() === i
                    const isCurrent = today.getFullYear() === visibleMonth.getFullYear() && today.getMonth() === i
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={isMonthDisabled(visibleMonth.getFullYear(), i, minDate, maxDate)}
                        onClick={() => { setVisibleMonth(clampMonth(new Date(visibleMonth.getFullYear(), i, 1), minDate, maxDate)); setView('days') }}
                        className={cn(
                          'rounded border py-1.5 text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-35',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : isCurrent
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
                        )}
                      >
                        {m}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* ═══ YEARS ═══ */}
              {view === 'years' && (
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((yr) => {
                    const isSelected = selectedDate && selectedDate.getFullYear() === yr
                    const isCurrent  = today.getFullYear() === yr
                    const isDisabled = yr < MIN_CALENDAR_YEAR || yr > MAX_CALENDAR_YEAR
                    return (
                      <button
                        key={yr}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => { setVisibleMonth(clampMonth(new Date(yr, visibleMonth.getMonth(), 1), minDate, maxDate)); setView('months') }}
                        className={cn(
                          'rounded border py-1.5 text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-35',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : isCurrent
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
                        )}
                      >
                        {yr}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null,
        document.body,
      )}
    </div>
  )

  if (!label && !hint && !error) return control

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', wrapperClassName)}>
      {label ? (
        <label
          htmlFor={inputId}
          className={cn('text-[11px] font-black uppercase tracking-[0.14em] text-slate-500', labelClassName)}
        >
          {label}
        </label>
      ) : null}
      {control}
      {error ? (
        <span className={cn('text-[11px] font-bold text-red-600', errorClassName)}>{error}</span>
      ) : hint ? (
        <span className={cn('text-[11px] text-slate-400', hintClassName)}>{hint}</span>
      ) : null}
    </div>
  )
})

/* ─── Pure helpers ─── */

function parseDateValue(value: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function getWeekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

function buildCalendarDays(visibleMonth: Date) {
  const firstDay = getMonthStart(visibleMonth)
  const firstWeekday = getWeekdayIndex(firstDay)
  const firstGridDay = new Date(firstDay)
  firstGridDay.setDate(firstDay.getDate() - firstWeekday)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(firstGridDay)
    d.setDate(firstGridDay.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isDateDisabled(date: Date, minDate: Date | null, maxDate: Date | null) {
  const v = stripTime(date).getTime()
  if (minDate && v < stripTime(minDate).getTime()) return true
  if (maxDate && v > stripTime(maxDate).getTime()) return true
  return false
}

function isMonthDisabled(year: number, month: number, minDate: Date | null, maxDate: Date | null) {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  if (minDate && monthEnd < getMonthStart(minDate)) return true
  if (maxDate && monthStart > getMonthStart(maxDate)) return true
  return false
}

function canGoToPreviousMonth(visibleMonth: Date, minDate: Date | null) {
  if (!minDate) return true
  return shiftMonth(visibleMonth, -1) >= getMonthStart(minDate)
}

function canGoToNextMonth(visibleMonth: Date, maxDate: Date | null) {
  if (!maxDate) return true
  return shiftMonth(visibleMonth, 1) <= getMonthStart(maxDate)
}

function clampMonth(date: Date, minDate: Date | null, maxDate: Date | null) {
  const month = getMonthStart(date)
  const minMonth = minDate ? getMonthStart(minDate) : null
  const maxMonth = maxDate ? getMonthStart(maxDate) : null
  if (minMonth && month < minMonth) return minMonth
  if (maxMonth && month > maxMonth) return maxMonth
  return month
}

function clampDate(date: Date, minDate: Date | null, maxDate: Date | null) {
  const value = stripTime(date)
  if (minDate && value < stripTime(minDate)) return minDate
  if (maxDate && value > stripTime(maxDate)) return maxDate
  return value
}

function laterDate(left: Date | null, right: Date | null) {
  if (!left) return right
  if (!right) return left
  return left > right ? left : right
}

function earlierDate(left: Date | null, right: Date | null) {
  if (!left) return right
  if (!right) return left
  return left < right ? left : right
}

function getYearRangeStart(year: number) {
  return Math.min(Math.max(Math.floor(year / 12) * 12, MIN_CALENDAR_YEAR), MAX_CALENDAR_YEAR - 11)
}

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export default DateInput
