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
import { motion, AnimatePresence } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { FieldMessage } from './form-field'

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

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const
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
  const panelRef = useRef<HTMLDivElement | null>(null)

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
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getMonthStart(clampDate(selectedDate ?? new Date(), minDate, maxDate))
  )
  const [view, setView] = useState<CalView>('days')
  const [yearRangeStart, setYearRangeStart] = useState(() =>
    getYearRangeStart(clampDate(selectedDate ?? new Date(), minDate, maxDate).getFullYear())
  )
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  useEffect(() => {
    if (selectedDate) {
      const clamped = clampDate(selectedDate, minDate, maxDate)
      setVisibleMonth(getMonthStart(clamped))
      setYearRangeStart(getYearRangeStart(clamped.getFullYear()))
    }
  }, [maxDate, minDate, selectedDate])

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

  useEffect(() => {
    if (!open) return undefined

    function reposition() {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const panelHeight = 380
      const spaceBelow = window.innerHeight - r.bottom
      const top = spaceBelow >= panelHeight + 8
        ? r.bottom + 6
        : r.top - panelHeight - 6

      setPanelStyle({
        position: 'fixed',
        top,
        left: r.left,
        width: Math.max(r.width, 300),
        zIndex: 99999,
      })
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

  const hasValue = !!selectedDate
  const displayDay = selectedDate ? String(selectedDate.getDate()).padStart(2, '0') : null
  const displayMonth = selectedDate ? MONTH_LABELS[selectedDate.getMonth()] : null
  const displayYear = selectedDate ? String(selectedDate.getFullYear()) : null

  const viewLabel =
    view === 'years'
      ? `${yearRangeStart} – ${yearRangeStart + 11}`
      : view === 'months'
        ? String(visibleMonth.getFullYear())
        : `${MONTH_LABELS[visibleMonth.getMonth()]} ${visibleMonth.getFullYear()}`

  const control = (
    <div ref={triggerRef} className="relative min-w-0">

      {/* Hidden native input */}
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

      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled && !readOnly) setOpen((v) => !v) }}
        className={cn(
          'group relative flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3.5 text-left outline-none transition-all duration-200',
          'border-slate-200 bg-white shadow-sm hover:border-indigo-300 hover:shadow-md',
          open && 'border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]',
          error && 'border-red-400 bg-red-50/50',
          disabled && 'cursor-not-allowed opacity-55',
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {/* Icon */}
        <span
          className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200',
            open ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500',
            error && 'bg-red-100 text-red-400',
          )}
        >
          {icon ?? <CalendarDays size={14} />}
        </span>

        {/* Value / placeholder */}
        <span className="flex min-w-0 flex-1 items-center gap-0">
          {hasValue ? (
            <motion.span
              key={String(value)}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-baseline gap-1.5"
            >
              <span
                className="text-[22px] font-black leading-none tabular-nums text-slate-900"
                style={{ fontFamily: "'Sora', system-ui, sans-serif", letterSpacing: '-0.04em' }}
              >
                {displayDay}
              </span>
              <span className="text-sm font-bold text-indigo-600">{displayMonth}</span>
              <span className="text-sm font-semibold text-slate-400">{displayYear}</span>
            </motion.span>
          ) : (
            <span className="text-sm font-medium text-slate-400">{placeholder}</span>
          )}
        </span>

        {/* Clear */}
        <AnimatePresence>
          {hasValue && !disabled && !readOnly && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); emitChange('') }}
              className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-red-50 hover:text-red-400"
              aria-label="Limpar"
            >
              <X size={12} />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Active indicator line */}
        <motion.span
          className="pointer-events-none absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-indigo-500"
          initial={false}
          animate={{ scaleX: open ? 1 : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: 'left' }}
        />
      </button>

      {/* ── Calendar panel ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label="Selecionar data"
              style={panelStyle}
              initial={{ opacity: 0, y: -8, scale: 0.975 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.975 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.14),0_4px_16px_rgba(15,23,42,0.08)]"
            >

              {/* ── Header ── */}
              <div className="relative overflow-hidden bg-indigo-600 px-4 py-3">
                {/* Decorative rings */}
                <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -right-2 -top-2 h-14 w-14 rounded-full border border-white/8" />

                <div className="relative flex items-center gap-2">
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
                    className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Período anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setView((v) => v === 'days' ? 'months' : v === 'months' ? 'years' : 'days')}
                    className="flex-1 text-center"
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={viewLabel}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="block text-[13px] font-black tracking-tight text-white hover:text-indigo-200 transition-colors"
                      >
                        {viewLabel}
                      </motion.span>
                    </AnimatePresence>
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
                    className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Próximo período"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Selected date pill */}
                <AnimatePresence>
                  {selectedDate && view === 'days' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Selecionado</span>
                        <span className="ml-auto text-[13px] font-black text-white">
                          {String(selectedDate.getDate()).padStart(2, '0')}/{String(selectedDate.getMonth() + 1).padStart(2, '0')}/{selectedDate.getFullYear()}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Body ── */}
              <div className="p-3">
                <AnimatePresence mode="wait">

                  {/* DAYS */}
                  {view === 'days' && (
                    <motion.div
                      key="days"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      {/* Weekday headers */}
                      <div className="mb-1 grid grid-cols-7">
                        {WEEKDAY_LABELS.map((wd, i) => (
                          <div
                            key={i}
                            className={cn(
                              'py-1 text-center text-[9px] font-black uppercase tracking-[0.12em]',
                              i >= 5 ? 'text-violet-400' : 'text-slate-300',
                            )}
                          >
                            {wd.slice(0, 1)}
                          </div>
                        ))}
                      </div>

                      {/* Day grid */}
                      <div className="grid grid-cols-7 gap-0.5">
                        {calendarDays.map((day) => {
                          const key = formatDateValue(day)
                          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                          const isToday = isSameDay(day, today)
                          const isCurMonth = day.getMonth() === visibleMonth.getMonth()
                          const isDisabled = isDateDisabled(day, minDate, maxDate)
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6
                          const isHovered = hoveredDay === key

                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => selectDate(day)}
                              onMouseEnter={() => !isDisabled && setHoveredDay(key)}
                              onMouseLeave={() => setHoveredDay(null)}
                              className={cn(
                                'relative flex h-8 w-full flex-col items-center justify-center rounded-lg text-[11px] font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-20',
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                  : isToday
                                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200'
                                    : isCurMonth
                                      ? isWeekend
                                        ? 'text-violet-500 hover:bg-violet-50'
                                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                                      : 'text-slate-300 hover:bg-slate-50 hover:text-slate-500',
                              )}
                            >
                              {day.getDate()}
                              {isToday && !isSelected && (
                                <span className="absolute bottom-1 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-indigo-400" />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Footer */}
                      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5">
                        <button
                          type="button"
                          onClick={() => selectDate(today)}
                          disabled={isDateDisabled(today, minDate, maxDate)}
                          className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-40"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          Hoje
                        </button>
                        {selectedDate && (
                          <button
                            type="button"
                            onClick={() => emitChange('')}
                            className="ml-auto text-[10px] font-semibold text-slate-300 transition hover:text-red-400"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* MONTHS */}
                  {view === 'months' && (
                    <motion.div
                      key="months"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="grid grid-cols-3 gap-1.5"
                    >
                      {MONTH_SHORT.map((m, i) => {
                        const isSelected = selectedDate &&
                          selectedDate.getFullYear() === visibleMonth.getFullYear() &&
                          selectedDate.getMonth() === i
                        const isCurrent = today.getFullYear() === visibleMonth.getFullYear() && today.getMonth() === i
                        const isDisabled = isMonthDisabled(visibleMonth.getFullYear(), i, minDate, maxDate)

                        return (
                          <button
                            key={m}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              setVisibleMonth(clampMonth(new Date(visibleMonth.getFullYear(), i, 1), minDate, maxDate))
                              setView('days')
                            }}
                            className={cn(
                              'rounded-xl border py-2.5 text-[12px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-35',
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                : isCurrent
                                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
                            )}
                          >
                            {m}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}

                  {/* YEARS */}
                  {view === 'years' && (
                    <motion.div
                      key="years"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="grid grid-cols-3 gap-1.5"
                    >
                      {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((yr) => {
                        const isSelected = selectedDate && selectedDate.getFullYear() === yr
                        const isCurrent = today.getFullYear() === yr
                        const isDisabled = yr < MIN_CALENDAR_YEAR || yr > MAX_CALENDAR_YEAR

                        return (
                          <button
                            key={yr}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              setVisibleMonth(clampMonth(new Date(yr, visibleMonth.getMonth(), 1), minDate, maxDate))
                              setView('months')
                            }}
                            className={cn(
                              'rounded-xl border py-2.5 text-[12px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-35',
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                : isCurrent
                                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
                            )}
                          >
                            {yr}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )

  if (!label && !hint && !error) return control

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 transition-colors',
            open && 'text-indigo-500',
            error && 'text-red-400',
            labelClassName,
          )}
        >
          {label}
        </label>
      )}
      {control}
      <FieldMessage
        hint={hint}
        error={error}
        className={error ? errorClassName : hintClassName}
      />
    </div>
  )
})

/* ─── Pure helpers (inalteradas) ─── */

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