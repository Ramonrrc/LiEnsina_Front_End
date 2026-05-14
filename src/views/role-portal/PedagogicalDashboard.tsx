import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart2,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Flame,
  Layers,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Percent,
  School,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  X,
  Zap,
  PieChart as PieChartIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'

import { resolveApiAssetUrl } from '../../api'
import type {
  ClassRoom,
  EvaluationsScreenPayload,
  LessonRecord,
  Student,
  Teacher,
} from '../../types'

const lessonChartColors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6']
const classStatusChartColors: Record<string, string> = {
  Estaveis: '#10b981',
  'Em atencao': '#f59e0b',
  'Sem dados': '#94a3b8',
}

export type PedagogicalDashboardProps = {
  classes: ClassRoom[]
  students: Student[]
  teachers: Teacher[]
  lessonRecords: LessonRecord[]
  evaluationsData?: Pick<
    EvaluationsScreenPayload,
    'evaluations' | 'curriculumSkills' | 'assessmentDescriptors' | 'questionBank'
  >
}

type Tone = 'indigo' | 'emerald' | 'amber' | 'rose'
type StatusLabel = 'Estavel' | 'Em atencao' | 'Sem dados'

type ClassSummary = {
  classRoom: ClassRoom
  studentsCount: number
  lowAttendanceCount: number
  lowScoreCount: number
  alertCount: number
  score: number | null
  attendance: number | null
  teacherName: string
  intervention: string
  status: StatusLabel
}

function Skeleton({
  className = '',
  style,
  icon,
  variant = 'default',
}: {
  className?: string
  style?: CSSProperties
  icon?: ReactNode
  variant?: 'default' | 'circular' | 'text'
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 ${
        variant === 'circular' ? 'rounded-full' : variant === 'text' ? 'rounded-md' : ''
      } ${className}`}
      style={style}
    >
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
        style={{ animation: 'shimmer 1.8s infinite ease-in-out' }}
      />
      {icon ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-300/70">
          {icon}
        </div>
      ) : null}
    </div>
  )
}

function SkeletonCard({ icon, rows = 3 }: { icon: ReactNode; rows?: number }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0" icon={icon} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" variant="text" />
          <Skeleton className="h-6 w-16" variant="text" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-3 w-full"
            variant="text"
            style={{ width: `${100 - index * 15}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function SkeletonChart({ icon, height = 200 }: { icon: ReactNode; height?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-8 w-8" icon={icon} />
        <Skeleton className="h-4 w-32" variant="text" />
      </div>
      <Skeleton className="w-full" icon={<BarChart3 size={48} />} style={{ height }} />
    </div>
  )
}

function AnimatedEntry({
  children,
  delay = 0,
  className = '',
  animation = 'fade-up',
}: {
  children: ReactNode
  delay?: number
  className?: string
  animation?: 'fade-up' | 'fade-in' | 'scale-up' | 'slide-right' | 'slide-left' | 'bounce-in'
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  const animations = {
    'fade-up': {
      initial: { opacity: 0, transform: 'translateY(24px)' },
      visible: { opacity: 1, transform: 'translateY(0)' },
    },
    'fade-in': {
      initial: { opacity: 0 },
      visible: { opacity: 1 },
    },
    'scale-up': {
      initial: { opacity: 0, transform: 'scale(0.92)' },
      visible: { opacity: 1, transform: 'scale(1)' },
    },
    'slide-right': {
      initial: { opacity: 0, transform: 'translateX(-24px)' },
      visible: { opacity: 1, transform: 'translateX(0)' },
    },
    'slide-left': {
      initial: { opacity: 0, transform: 'translateX(24px)' },
      visible: { opacity: 1, transform: 'translateX(0)' },
    },
    'bounce-in': {
      initial: { opacity: 0, transform: 'scale(0.85)' },
      visible: { opacity: 1, transform: 'scale(1)' },
    },
  }[animation]

  return (
    <div
      className={className}
      style={{
        ...(visible ? animations.visible : animations.initial),
        transition: 'opacity 0.5s cubic-bezier(.16,1,.3,1), transform 0.5s cubic-bezier(.16,1,.3,1)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

function AnimatedNumber({ value, duration = 1000, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = value * eased

      if (progress >= 1) {
        setDisplay(value)
        window.clearInterval(timer)
      } else {
        setDisplay(Math.floor(next))
      }
    }, 16)

    return () => window.clearInterval(timer)
  }, [duration, value])

  return (
    <>
      {display.toLocaleString('pt-BR')}
      {suffix}
    </>
  )
}

function SectionDivider({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <AnimatedEntry delay={50} animation="fade-in">
      <div className="flex min-w-0 items-center gap-4 py-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-200 to-indigo-300" />
        <span className="flex min-w-0 items-center gap-2.5 rounded-full border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-white px-5 py-2 text-[10px] font-black uppercase tracking-[.2em] text-indigo-600 shadow-sm">
          {icon ? <span className="shrink-0 text-indigo-500">{icon}</span> : null}
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-indigo-500" />
          <span className="truncate">{label}</span>
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-indigo-200 to-indigo-300" />
      </div>
    </AnimatedEntry>
  )
}

function StatPill({
  value,
  label,
  tone = 'slate',
  size = 'sm',
}: {
  value: string | number
  label: string
  tone?: 'slate' | Tone
  size?: 'sm' | 'md'
}) {
  const colors = {
    slate: 'bg-slate-50 text-slate-700 border-slate-400',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-400',
    rose: 'bg-rose-50 text-rose-700 border-rose-400',
    amber: 'bg-amber-50 text-amber-700 border-amber-400',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-400',
  }[tone]

  const sizeClasses = size === 'md' ? 'px-4 py-1.5 text-xs' : 'px-3 py-1 text-[11px]'

  return (
    <span className={`inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border shadow-sm ${colors} ${sizeClasses} font-bold`}>
      <span className="shrink-0 font-black">{value}</span>
      {label ? <span className="min-w-0 truncate opacity-80">{label}</span> : null}
    </span>
  )
}

function RingProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color,
  label,
  sublabel,
  icon,
  animate = true,
  delay = 0,
}: {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color: string
  label: string | number
  sublabel?: string
  icon?: ReactNode
  animate?: boolean
  delay?: number
}) {
  const [animated, setAnimated] = useState(!animate)

  useEffect(() => {
    if (!animate) return undefined
    const timer = window.setTimeout(() => setAnimated(true), delay + 200)
    return () => window.clearTimeout(timer)
  }, [animate, delay])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const offset = circumference - (animated ? percentage / 100 : 0) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {icon ? <span className="mb-0.5 text-slate-400">{icon}</span> : null}
        <span className="font-['Sora',system-ui,sans-serif] text-lg font-black text-slate-900">
          {label}
        </span>
        {sublabel ? <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{sublabel}</span> : null}
      </div>
    </div>
  )
}

function ProgressBar({
  value,
  max = 100,
  color,
  label,
  delay = 0,
  showValue = true,
  height = 'md',
}: {
  value: number
  max?: number
  color: string
  label: string
  delay?: number
  showValue?: boolean
  height?: 'sm' | 'md' | 'lg'
}) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimated(true), delay + 100)
    return () => window.clearTimeout(timer)
  }, [delay])

  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const heightClass = { sm: 'h-4', md: 'h-6', lg: 'h-8' }[height]

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-auto shrink-0 truncate text-left text-xs font-bold text-slate-600 sm:w-28 sm:text-right">
        {label}
      </span>
      <div className={`flex-1 overflow-hidden rounded-full bg-slate-100 shadow-inner ${heightClass}`}>
        <div
          className="relative flex h-full items-center justify-end overflow-hidden rounded-full pr-3"
          style={{
            width: animated ? `${percentage}%` : '0%',
            backgroundColor: color,
            transition: 'width 1s cubic-bezier(.16,1,.3,1)',
            minWidth: animated && percentage > 8 ? 48 : 0,
          }}
        >
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{ animation: animated ? 'progressShine 2s ease-in-out infinite' : 'none' }}
          />
          {showValue && animated && percentage > 8 ? (
            <span className="relative text-[10px] font-black text-white drop-shadow-sm">
              {Math.round(value)}%
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sublabel,
  icon,
  tone = 'indigo',
  trend,
  ring,
  delay = 0,
  onClick,
}: {
  label: string
  value: string | number
  sublabel: string
  icon: ReactNode
  tone?: Tone
  trend?: 'up' | 'down' | 'neutral'
  ring?: number
  delay?: number
  onClick?: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  const cfg = {
    indigo: { bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', ring: '#6366f1', text: 'text-indigo-600', border: 'border-indigo-400', glow: 'shadow-indigo-100' },
    emerald: { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', ring: '#10b981', text: 'text-emerald-600', border: 'border-emerald-400', glow: 'shadow-emerald-100' },
    amber: { bg: 'from-amber-400 to-amber-500', light: 'bg-amber-50', ring: '#f59e0b', text: 'text-amber-600', border: 'border-amber-400', glow: 'shadow-amber-100' },
    rose: { bg: 'from-rose-500 to-rose-600', light: 'bg-rose-50', ring: '#f43f5e', text: 'text-rose-600', border: 'border-rose-400', glow: 'shadow-rose-100' },
  }[tone]

  const numericValue = typeof value === 'number' ? value : parseInt(value, 10) || 0

  return (
    <article
      className={`group relative min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-500 ${cfg.border} ${cfg.glow} ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : 'hover:shadow-lg'}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
        transition: `opacity 0.6s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.6s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
      onClick={onClick}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${cfg.bg}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-2 break-words text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{label}</p>
            {ring !== undefined ? (
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-4">
                <RingProgress
                  value={ring}
                  size={76}
                  strokeWidth={7}
                  color={cfg.ring}
                  label={typeof value === 'string' ? value : String(value)}
                  delay={delay}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {trend === 'up' ? <TrendingUp size={14} className="text-emerald-500" /> : null}
                    {trend === 'down' ? <TrendingDown size={14} className="text-rose-500" /> : null}
                    <p className="text-xs font-semibold leading-5 text-slate-500">{sublabel}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="break-words font-['Sora',system-ui,sans-serif] text-4xl font-black tracking-tight text-slate-900">
                  <AnimatedNumber value={numericValue} />
                  {typeof value === 'string' && value.includes('%') ? '%' : ''}
                </p>
                <div className="mt-2 flex min-w-0 items-center gap-2">
                  {trend === 'up' ? <TrendingUp size={14} className="text-emerald-500" /> : null}
                  {trend === 'down' ? <TrendingDown size={14} className="text-rose-500" /> : null}
                  <p className="text-xs font-semibold text-slate-500">{sublabel}</p>
                </div>
              </>
            )}
          </div>
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${cfg.light} ${cfg.text} shadow-sm`}>
            {icon}
          </div>
        </div>
      </div>
    </article>
  )
}

function InsightCard({
  label,
  value,
  detail,
  icon,
  tone = 'indigo',
  items,
  delay = 0,
}: {
  label: string
  value: string | number
  detail: string
  icon: ReactNode
  tone?: Tone
  items?: string[]
  delay?: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  const cfg = {
    indigo: { accent: 'border-l-indigo-500', icon: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600', value: 'text-indigo-700', dot: 'bg-indigo-400', border: 'border-indigo-400' },
    emerald: { accent: 'border-l-emerald-500', icon: 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600', value: 'text-emerald-700', dot: 'bg-emerald-400', border: 'border-emerald-400' },
    amber: { accent: 'border-l-amber-500', icon: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600', value: 'text-amber-700', dot: 'bg-amber-400', border: 'border-amber-400' },
    rose: { accent: 'border-l-rose-500', icon: 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600', value: 'text-rose-700', dot: 'bg-rose-400', border: 'border-rose-400' },
  }[tone]

  return (
    <article
      className={`min-w-0 rounded-2xl border border-l-4 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${cfg.accent} ${cfg.border}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.98)',
        transition: `opacity 0.5s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.5s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      <div className="flex items-start gap-4">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cfg.icon} shadow-sm`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{label}</p>
          <p className={`mt-1 font-['Sora',system-ui,sans-serif] text-3xl font-black tracking-tight ${cfg.value}`}>
            <AnimatedNumber value={typeof value === 'number' ? value : parseInt(value, 10) || 0} />
            {typeof value === 'string' && value.includes('%') ? '%' : ''}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
        </div>
      </div>
      {items?.length ? (
        <div className="mt-4 space-y-1.5">
          {items.slice(0, 3).map((item) => (
            <div key={item} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
              <p className="truncate text-[11px] font-semibold leading-5 text-slate-600">{item}</p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function Panel({
  header,
  children,
  footer,
  delay = 0,
}: {
  header: ReactNode
  children: ReactNode
  footer?: ReactNode
  delay?: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  return (
    <div
      className="min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-lg transition-shadow hover:shadow-xl"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.98)',
        transition: `opacity 0.6s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.6s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      <div className="border-b border-slate-300 bg-gradient-to-r from-slate-50 to-white px-6 py-4">{header}</div>
      <div>{children}</div>
      {footer ? <div className="border-t border-slate-300 bg-slate-50/50">{footer}</div> : null}
    </div>
  )
}

function PanelHeader({
  icon,
  iconTone = 'indigo',
  label,
  title,
  actions,
}: {
  icon: ReactNode
  iconTone?: Tone
  label: string
  title: string
  actions?: ReactNode
}) {
  const iconClass = {
    indigo: 'bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600',
    rose: 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-600',
    amber: 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600',
    emerald: 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600',
  }[iconTone]
  const labelClass = {
    indigo: 'text-indigo-500',
    rose: 'text-rose-500',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
  }[iconTone]

  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-4 sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconClass} shadow-sm`}>{icon}</div>
        <div className="min-w-0">
          <p className={`text-[9px] font-black uppercase tracking-[.2em] ${labelClass}`}>{label}</p>
          <h2 className="truncate font-['Sora',system-ui,sans-serif] text-base font-black text-slate-800">{title}</h2>
        </div>
      </div>
      {actions ? <div className="flex max-w-full flex-wrap items-center justify-end gap-2 sm:shrink-0">{actions}</div> : null}
    </div>
  )
}

function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-8 py-12 text-center">
      {icon ? <span className="text-slate-300">{icon}</span> : null}
      <p className="text-sm font-semibold text-slate-400">{message}</p>
    </div>
  )
}

function ClassStatusBadge({ status }: { status: StatusLabel }) {
  if (status === 'Estavel') {
    return <span className="shrink-0 rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 shadow-sm">Estavel</span>
  }
  if (status === 'Sem dados') {
    return <span className="shrink-0 rounded-full border border-slate-400 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-500 shadow-sm">Sem dados</span>
  }
  return <span className="shrink-0 rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-[10px] font-black text-amber-700 shadow-sm">Atencao</span>
}

function ClassCard({
  summary,
  onOpenRecords,
  index,
}: {
  summary: ClassSummary
  onOpenRecords: () => void
  index: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), index * 60 + 100)
    return () => window.clearTimeout(timer)
  }, [index])

  const hasAlerts = summary.alertCount > 0
  const scoreOk = summary.score !== null && summary.score >= 6
  const attendanceOk = summary.attendance !== null && summary.attendance >= 75

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${hasAlerts ? 'border-amber-400' : 'border-slate-400'}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.96)',
        transition: 'opacity 0.5s cubic-bezier(.16,1,.3,1), transform 0.5s cubic-bezier(.16,1,.3,1)',
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate font-['Sora',system-ui,sans-serif] text-base font-black text-slate-900">
            {summary.classRoom.name}
          </strong>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {summary.classRoom.grade} - {summary.classRoom.shift}
          </p>
          <p className="truncate text-[11px] text-slate-400">{summary.teacherName}</p>
        </div>
        <ClassStatusBadge status={summary.status} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Alunos', value: summary.studentsCount, ok: true, bad: false },
          {
            label: 'Freq.',
            value: summary.attendance === null ? '-' : `${summary.attendance}%`,
            ok: attendanceOk,
            bad: !attendanceOk && summary.attendance !== null,
          },
          {
            label: 'Media',
            value: summary.score === null ? '-' : summary.score.toFixed(1),
            ok: scoreOk,
            bad: !scoreOk && summary.score !== null,
          },
          {
            label: 'Alertas',
            value: summary.alertCount,
            ok: summary.alertCount === 0,
            bad: summary.alertCount > 0,
          },
        ].map(({ label, value, ok, bad }) => (
          <div
            key={label}
            className={`rounded-xl px-3 py-2.5 text-center shadow-sm ${
              bad ? 'border border-rose-400 bg-rose-50' : ok ? 'border border-emerald-400 bg-emerald-50' : 'border border-slate-400 bg-slate-50'
            }`}
          >
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`mt-0.5 text-base font-black ${bad ? 'text-rose-700' : ok ? 'text-emerald-700' : 'text-slate-600'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-indigo-400 bg-indigo-50 px-4 py-3">
        <p className="flex items-start gap-2 text-xs font-semibold text-indigo-800">
          <Target size={14} className="mt-0.5 shrink-0 text-indigo-500" />
          {summary.intervention}
        </p>
        <button
          type="button"
          onClick={onOpenRecords}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-800"
        >
          <ClipboardList size={12} />
          Ver registros
          <ChevronRight size={12} />
        </button>
      </div>
    </article>
  )
}

function AlertStudentPhoto({
  student,
  size = 'md',
  showStatus = false,
  className = '',
}: {
  student: Student
  size?: 'md' | 'lg' | 'xl'
  showStatus?: boolean
  className?: string
}) {
  const avatarUrl = resolveApiAssetUrl(student.avatarUrl)
  const initials = getInitials(student.name)
  const critical = student.attendanceRate < 75 && student.averageScore < 6
  const sizeClass = size === 'xl' ? 'h-20 w-20 text-xl' : size === 'lg' ? 'h-14 w-14 text-base' : 'h-10 w-10 text-[13px]'
  const iconSize = size === 'xl' ? 30 : size === 'lg' ? 20 : 15
  const dotClass = size === 'md' ? 'bottom-0 right-0 h-3.5 w-3.5' : 'bottom-1 right-1 h-4 w-4'

  return (
    <div className={`relative shrink-0 ${className}`}>
      <span
        className={`grid overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-lg ring-2 ${critical ? 'ring-rose-400' : 'ring-amber-400'} ${sizeClass}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={student.name} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="grid h-full w-full place-items-center">{initials || <UserRound size={iconSize} />}</span>
        )}
      </span>
      {showStatus ? (
        <span className={`absolute rounded-full border-2 border-white shadow-md ${critical ? 'bg-rose-500' : 'bg-amber-400'} ${dotClass}`} />
      ) : null}
    </div>
  )
}

function AlertStudentCard({
  student,
  className,
  delay,
  onOpen,
}: {
  student: Student
  className: string
  delay: number
  onOpen: () => void
}) {
  const lowAttendance = student.attendanceRate < 75
  const lowScore = student.averageScore < 6
  const critical = lowAttendance && lowScore

  return (
    <AnimatedEntry delay={delay} animation="slide-right">
      <button
        type="button"
        onClick={onOpen}
        className={`group flex w-full items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${
          critical ? 'border-rose-400 hover:border-rose-500' : 'border-amber-400 hover:border-amber-500'
        }`}
      >
        <AlertStudentPhoto student={student} size="lg" showStatus />
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-sm font-black text-slate-900">{student.name}</strong>
          <span className="text-xs font-semibold text-slate-500">{className}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatPill value={student.averageScore?.toFixed(1) ?? '-'} label="media" tone={lowScore ? 'rose' : 'emerald'} />
            <StatPill value={`${student.attendanceRate}%`} label="freq." tone={lowAttendance ? 'rose' : 'emerald'} />
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </button>
    </AnimatedEntry>
  )
}

function AlertStudentsModal({
  students,
  selectedStudentId,
  onSelectStudent,
  onClose,
  getClassName,
}: {
  students: Student[]
  selectedStudentId: string | null
  onSelectStudent: (id: string) => void
  onClose: () => void
  getClassName: (classId: string) => string
}) {
  const [animateIn, setAnimateIn] = useState(false)
  const selected = students.find((student) => student.id === selectedStudentId) ?? students[0]

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimateIn(true), 20)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (typeof document === 'undefined') return null

  const lowAttendance = selected ? selected.attendanceRate < 75 : false
  const lowScore = selected ? selected.averageScore < 6 : false
  const critical = lowAttendance && lowScore
  const selectedBannerUrl = resolveApiAssetUrl(selected?.bannerUrl)

  function scoreColor(value: number) {
    if (value < 5) return 'text-rose-700'
    if (value < 6) return 'text-amber-700'
    return 'text-emerald-700'
  }

  function attendanceColor(value: number) {
    if (value < 65) return 'text-rose-700'
    if (value < 75) return 'text-amber-700'
    return 'text-emerald-700'
  }

  return createPortal(
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{
        background: animateIn ? 'rgba(15, 23, 42, 0.46)' : 'rgba(15, 23, 42, 0)',
        backdropFilter: animateIn ? 'blur(8px) saturate(0.95)' : 'blur(0px) saturate(1)',
        WebkitBackdropFilter: animateIn ? 'blur(8px) saturate(0.95)' : 'blur(0px) saturate(1)',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease, -webkit-backdrop-filter 0.3s ease',
        padding: '0.5rem',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          opacity: animateIn ? 1 : 0,
          transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.96)',
          transition: 'opacity 0.4s cubic-bezier(.16,1,.3,1), transform 0.4s cubic-bezier(.16,1,.3,1)',
        }}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-rose-50 via-white to-slate-50 px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-rose-100 shadow-sm">
              <Users size={20} className="text-rose-600" />
              <span className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white shadow-sm">
                {students.length}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-rose-500">Painel de acompanhamento</p>
              <h2 className="truncate font-['Sora',system-ui,sans-serif] text-lg font-black text-slate-900">
                Alunos em alerta
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-4 rounded-xl border border-slate-300 bg-white px-4 py-2 shadow-sm sm:flex">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-slate-600">
                  {students.filter((student) => student.attendanceRate < 75 && student.averageScore < 6).length} criticos
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-bold text-slate-600">
                  {students.filter((student) => !(student.attendanceRate < 75 && student.averageScore < 6)).length} atencao
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white text-slate-400 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="min-h-0 max-h-[42dvh] overflow-y-auto border-b border-slate-200 bg-slate-50 lg:max-h-none lg:border-b-0 lg:border-r">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-3">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
                {students.length} aluno{students.length !== 1 ? 's' : ''} identificado{students.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-2 p-4">
              {students.map((student) => {
                const active = student.id === selected?.id
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => onSelectStudent(student.id)}
                    className={`group w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                      active
                        ? 'border-rose-400 bg-white shadow-md'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertStudentPhoto student={student} showStatus />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm font-black text-slate-900">{student.name}</strong>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{getClassName(student.classId)}</p>
                        <div className="mt-2 flex gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-bold ${scoreColor(student.averageScore)}`}>
                            <Award size={10} />
                            {student.averageScore.toFixed(1)}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-bold ${attendanceColor(student.attendanceRate)}`}>
                            <Activity size={10} />
                            {student.attendanceRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {selected ? (
            <section className="min-h-0 overflow-y-auto bg-white">
              <div className="border-b border-slate-200 bg-white">
                {selectedBannerUrl ? (
                  <div className="relative h-32 overflow-hidden bg-slate-100 sm:h-40">
                    <img
                      src={selectedBannerUrl}
                      alt={`Banner de ${selected.name}`}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/10 to-transparent" />
                  </div>
                ) : null}

                <div className={selectedBannerUrl ? 'px-6 pb-5 pt-5 sm:pt-6' : 'px-6 py-5'}>
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <AlertStudentPhoto
                      student={selected}
                      size={selectedBannerUrl ? 'xl' : 'lg'}
                      showStatus
                      className={selectedBannerUrl ? '-mt-12' : ''}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-rose-500">Diagnostico pedagogico</p>
                      <h3 className="font-['Sora',system-ui,sans-serif] text-2xl font-black leading-tight text-slate-900">{selected.name}</h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{getClassName(selected.classId)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <RingProgress
                      value={selected.attendanceRate}
                      size={72}
                      strokeWidth={6}
                      color={selected.attendanceRate < 65 ? '#f43f5e' : selected.attendanceRate < 75 ? '#f59e0b' : '#10b981'}
                      label={`${selected.attendanceRate}%`}
                      sublabel="Freq."
                      delay={100}
                    />
                    <RingProgress
                      value={selected.averageScore * 10}
                      size={72}
                      strokeWidth={6}
                      color={selected.averageScore < 5 ? '#f43f5e' : selected.averageScore < 6 ? '#f59e0b' : '#10b981'}
                      label={selected.averageScore.toFixed(1)}
                      sublabel="Media"
                      delay={200}
                    />
                    <span className={`self-start rounded-full border px-4 py-2 text-[11px] font-black shadow-sm ${critical ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-amber-400 bg-amber-50 text-amber-700'}`}>
                      {critical ? 'Critico' : 'Atencao'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <StudentProgressCard
                    label="Frequencia"
                    icon={<Activity size={14} />}
                    value={selected.attendanceRate}
                    display={`${selected.attendanceRate}%`}
                    target="Meta: 75%"
                    color={selected.attendanceRate < 65 ? '#f43f5e' : selected.attendanceRate < 75 ? '#f59e0b' : '#10b981'}
                  />
                  <StudentProgressCard
                    label="Desempenho"
                    icon={<Award size={14} />}
                    value={selected.averageScore * 10}
                    display={`${(selected.averageScore * 10).toFixed(0)}%`}
                    target="Meta: 60%"
                    color={selected.averageScore < 5 ? '#f43f5e' : selected.averageScore < 6 ? '#f59e0b' : '#10b981'}
                  />
                </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="overflow-hidden rounded-xl border border-rose-400 bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-rose-200 bg-rose-50 px-5 py-3">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100">
                      <AlertTriangle size={14} className="text-rose-600" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[.16em] text-rose-700">Por que esta em alerta</p>
                  </div>
                  <div className="space-y-2 p-4">
                    {lowAttendance ? (
                      <AlertReason text={`Frequencia em ${selected.attendanceRate}%, abaixo do limite de 75%.`} />
                    ) : null}
                    {lowScore ? (
                      <AlertReason text={`Media ${selected.averageScore.toFixed(1)}, abaixo da referencia de 6,0.`} />
                    ) : null}
                    {critical ? (
                      <AlertReason text="Alerta combinado: baixa presenca e baixo desempenho." strong />
                    ) : null}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-indigo-400 bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-indigo-200 bg-indigo-50 px-5 py-3">
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100">
                      <Lightbulb size={14} className="text-indigo-600" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[.16em] text-indigo-700">Proximas acoes</p>
                  </div>
                  <div className="space-y-2 p-4">
                    {[
                      lowAttendance ? 'Iniciar busca ativa e registrar devolutiva da familia.' : null,
                      lowScore ? 'Planejar recuperacao focalizada com verificacao.' : null,
                      'Cruzar o plano de aula com o desempenho.',
                    ].filter((item): item is string => Boolean(item)).map((action, index) => (
                      <div key={action} className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                        <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-indigo-300 bg-white">
                          <span className="text-[10px] font-black text-indigo-600">{index + 1}</span>
                        </div>
                        <p className="text-sm font-medium text-indigo-900">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function StudentProgressCard({
  label,
  icon,
  value,
  display,
  target,
  color,
}: {
  label: string
  icon: ReactNode
  value: number
  display: string
  target: string
  color: string
}) {
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
          {icon}
          {label}
        </span>
        <span className="text-xs font-black text-slate-800">{display}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="mt-2 text-[10px] font-semibold text-slate-400">{target}</p>
    </div>
  )
}

function AlertReason({ text, strong = false }: { text: string; strong?: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg p-3 ${strong ? 'bg-rose-50' : 'bg-slate-50'}`}>
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${strong ? 'bg-rose-500' : 'bg-rose-400'}`} />
      <p className={`text-sm ${strong ? 'font-semibold text-rose-800' : 'font-medium text-slate-700'}`}>{text}</p>
    </div>
  )
}

function LessonRecordsModalSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <SkeletonCard icon={<ClipboardList size={20} />} rows={2} />
        <SkeletonCard icon={<BookMarked size={20} />} rows={2} />
        <SkeletonCard icon={<Zap size={20} />} rows={2} />
        <SkeletonCard icon={<ListChecks size={20} />} rows={2} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <SkeletonChart icon={<BarChart3 size={20} />} height={240} />
        <div className="space-y-5">
          <SkeletonChart icon={<PieChartIcon size={20} />} height={160} />
          <SkeletonChart icon={<PieChartIcon size={20} />} height={160} />
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  label,
  value,
  detail,
  icon,
  tone = 'indigo',
  delay = 0,
}: {
  label: string
  value: string | number
  detail: string
  icon: ReactNode
  tone?: Tone
  delay?: number
}) {
  const cfg = {
    indigo: { icon: 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600', accent: 'border-l-indigo-500', value: 'text-indigo-700' },
    emerald: { icon: 'bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600', accent: 'border-l-emerald-500', value: 'text-emerald-700' },
    amber: { icon: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600', accent: 'border-l-amber-500', value: 'text-amber-700' },
    rose: { icon: 'bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600', accent: 'border-l-rose-500', value: 'text-rose-700' },
  }[tone]

  return (
    <AnimatedEntry delay={delay} animation="scale-up">
      <article className={`min-w-0 rounded-2xl border border-l-4 border-slate-400 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${cfg.accent}`}>
        <div className="flex items-start gap-4">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cfg.icon} shadow-sm`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{label}</p>
            <p className={`mt-1 font-['Sora',system-ui,sans-serif] text-3xl font-black ${cfg.value}`}>
              <AnimatedNumber value={typeof value === 'number' ? value : parseInt(value, 10) || 0} />
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
          </div>
        </div>
      </article>
    </AnimatedEntry>
  )
}

function getClassStudents(students: Student[], classId: string) {
  return students.filter((student) => student.classId === classId)
}

function getAverage(students: Student[]) {
  if (!students.length) return 0
  return students.reduce((sum, student) => sum + (student.averageScore ?? 0), 0) / students.length
}

function getAttendance(students: Student[]) {
  if (!students.length) return 0
  return Math.round(students.reduce((sum, student) => sum + (student.attendanceRate ?? 0), 0) / students.length)
}

function formatChartValue(value: unknown) {
  if (typeof value !== 'number') return String(value ?? '')
  return Number.isInteger(value)
    ? value.toLocaleString('pt-BR')
    : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function formatPercentChartValue(value: unknown) {
  const formatted = formatChartValue(value)
  return formatted ? `${formatted}%` : ''
}

function formatLessonDate(record: LessonRecord) {
  return record.time ? `${record.date} ${record.time}` : record.date
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function buildSubjectDifficultyData({
  classes,
  students,
  lessonRecords,
  evaluationsData,
}: {
  classes: ClassRoom[]
  students: Student[]
  lessonRecords: LessonRecord[]
  evaluationsData?: PedagogicalDashboardProps['evaluationsData']
}) {
  const candidates = new Map<string, { label: string; score: number; count: number }>()

  for (const classRoom of classes) {
    const classStudents = getClassStudents(students, classRoom.id)
    const alertRatio = classStudents.length
      ? classStudents.filter((student) => student.attendanceRate < 75 || student.averageScore < 6).length / classStudents.length
      : 0
    const baseline = Math.round(30 + alertRatio * 55)

    for (const subject of classRoom.bnccFocus ?? []) {
      const key = normalizeText(subject)
      const current = candidates.get(key) ?? { label: subject, score: 0, count: 0 }
      candidates.set(key, { ...current, score: current.score + baseline, count: current.count + 1 })
    }
  }

  for (const record of lessonRecords) {
    const subject = record.subject?.trim()
    if (!subject) continue
    const key = normalizeText(subject)
    const current = candidates.get(key) ?? { label: subject, score: 0, count: 0 }
    candidates.set(key, { ...current, score: current.score + 45, count: current.count + 1 })
  }

  for (const evaluation of evaluationsData?.evaluations ?? []) {
    const subject = evaluation.subject?.trim()
    if (!subject) continue
    const inverseScore = Math.round(100 - Math.min(100, Math.max(0, (evaluation.averageScore ?? 0) * 10)))
    const key = normalizeText(subject)
    const current = candidates.get(key) ?? { label: subject, score: 0, count: 0 }
    candidates.set(key, { ...current, score: current.score + inverseScore, count: current.count + 1 })
  }

  const data = Array.from(candidates.values())
    .map((item) => ({
      label: item.label,
      value: Math.min(95, Math.max(15, Math.round(item.score / Math.max(1, item.count)))),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  return data.length
    ? data
    : [
        { label: 'Matematica', value: 64 },
        { label: 'Portugues', value: 58 },
        { label: 'Ciencias', value: 47 },
      ]
}

export function PedagogicalDashboard({
  classes,
  students,
  teachers,
  lessonRecords,
  evaluationsData,
}: PedagogicalDashboardProps) {
  const [tab, setTab] = useState<'general' | 'action'>('general')
  const [classFilter, setClassFilter] = useState('all')
  const [lessonModal, setLessonModal] = useState(false)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [lessonClassFilter, setLessonClassFilter] = useState('all')
  const [alertModal, setAlertModal] = useState(false)
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)

  const lowAttendanceStudents = students.filter((student) => student.attendanceRate < 75)
  const lowScoreStudents = students.filter((student) => student.averageScore < 6)

  useEffect(() => {
    if (!lessonModal) return undefined
    setLessonLoading(true)
    const timer = window.setTimeout(() => setLessonLoading(false), 800)
    return () => window.clearTimeout(timer)
  }, [lessonClassFilter, lessonModal])

  function getClassName(id: string) {
    return classes.find((classRoom) => classRoom.id === id)?.name ?? 'Turma nao localizada'
  }

  function openLessonModal(classId = 'all') {
    setLessonClassFilter(classId)
    setLessonModal(true)
  }

  const scopeClasses = classFilter === 'all' ? classes : classes.filter((classRoom) => classRoom.id === classFilter)
  const scopeClassIds = new Set(scopeClasses.map((classRoom) => classRoom.id))
  const scopeStudents = classFilter === 'all' ? students : students.filter((student) => scopeClassIds.has(student.classId))
  const scopeLessonRecords = classFilter === 'all' ? lessonRecords : lessonRecords.filter((record) => scopeClassIds.has(record.classId))

  const avgScore = getAverage(scopeStudents)
  const avgAttendance = getAttendance(scopeStudents)
  const lowAttendanceScope = scopeStudents.filter((student) => student.attendanceRate < 75)
  const lowScoreScope = scopeStudents.filter((student) => student.averageScore < 6)

  const alertStudents = [...lowAttendanceStudents, ...lowScoreStudents]
    .filter((student, index, collection) => collection.findIndex((item) => item.id === student.id) === index)
    .sort((a, b) => {
      const aCritical = a.attendanceRate < 75 && a.averageScore < 6 ? 1 : 0
      const bCritical = b.attendanceRate < 75 && b.averageScore < 6 ? 1 : 0
      return bCritical - aCritical || a.attendanceRate - b.attendanceRate || a.averageScore - b.averageScore
    })

  const classSummaries: ClassSummary[] = classes.map((classRoom) => {
    const classStudents = getClassStudents(students, classRoom.id)
    const lowAttendanceCount = classStudents.filter((student) => student.attendanceRate < 75).length
    const lowScoreCount = classStudents.filter((student) => student.averageScore < 6).length
    const alertCount = new Set(
      classStudents
        .filter((student) => student.attendanceRate < 75 || student.averageScore < 6)
        .map((student) => student.id),
    ).size
    const score = classStudents.length ? getAverage(classStudents) : null
    const attendance = classStudents.length ? getAttendance(classStudents) : null
    const teacherName =
      teachers.find((teacher) => teacher.id === classRoom.teacherId || (classRoom.teacherIds ?? []).includes(teacher.id))?.name ??
      'Professor pendente'
    const intervention =
      classStudents.length === 0
        ? 'Aguardar alunos vinculados'
        : lowAttendanceCount > 0 && lowScoreCount > 0
          ? 'Priorizar busca ativa e recuperacao'
          : lowAttendanceCount > 0
            ? 'Priorizar busca ativa e contato familiar'
            : lowScoreCount > 0
              ? 'Planejar recuperacao e apoio'
              : 'Sem intervencao imediata'

    const status: StatusLabel = classStudents.length === 0
      ? 'Sem dados'
      : alertCount > 0
        ? 'Em atencao'
        : 'Estavel'

    return {
      classRoom,
      studentsCount: classStudents.length,
      lowAttendanceCount,
      lowScoreCount,
      alertCount,
      score,
      attendance,
      teacherName,
      intervention,
      status,
    }
  }).sort((a, b) => b.alertCount - a.alertCount || (a.attendance ?? 101) - (b.attendance ?? 101))

  const scopeClassSummaries = classFilter === 'all'
    ? classSummaries
    : classSummaries.filter((summary) => scopeClassIds.has(summary.classRoom.id))

  const classChartData = scopeClassSummaries.map((summary) => ({
    name: summary.classRoom.name.length > 12 ? `${summary.classRoom.name.slice(0, 12)}...` : summary.classRoom.name,
    frequencia: summary.attendance ?? 0,
    desempenho: summary.score === null ? 0 : Number((summary.score * 10).toFixed(1)),
    alertas: summary.alertCount,
    baixaFreq: summary.lowAttendanceCount,
    baixoDesemp: summary.lowScoreCount,
  }))
  const chartMinWidth = Math.max(700, classChartData.length * 140)
  const barSize = classChartData.length > 6 ? 18 : classChartData.length > 3 ? 22 : 28

  const stableCount = scopeClassSummaries.filter((summary) => summary.status === 'Estavel').length
  const attentionCount = scopeClassSummaries.filter((summary) => summary.status === 'Em atencao').length
  const noDataCount = scopeClassSummaries.filter((summary) => summary.status === 'Sem dados').length
  const statusChartData = [
    { name: 'Estaveis', value: stableCount },
    { name: 'Em atencao', value: attentionCount },
    { name: 'Sem dados', value: noDataCount },
  ].filter((item) => item.value > 0)

  const recordsByClass = lessonRecords.reduce<Record<string, number>>((acc, record) => {
    acc[record.classId] = (acc[record.classId] ?? 0) + 1
    return acc
  }, {})
  const selectedAlertForModal = selectedAlertId ?? alertStudents[0]?.id ?? null
  const classesWithoutRecords = classSummaries.filter((summary) => (recordsByClass[summary.classRoom.id] ?? 0) === 0)
  const classesWithData = classSummaries.filter((summary) => summary.studentsCount > 0)
  const coverage = Math.round((classesWithData.length / Math.max(classSummaries.length, 1)) * 100)
  const recurrentAlerts = students.filter((student) => student.attendanceRate < 75 && student.averageScore < 6)

  const scopedRecords = useMemo(
    () => (lessonClassFilter === 'all' ? lessonRecords : lessonRecords.filter((record) => record.classId === lessonClassFilter))
      .slice()
      .sort((a, b) => formatLessonDate(b).localeCompare(formatLessonDate(a)) || b.id.localeCompare(a.id)),
    [lessonClassFilter, lessonRecords],
  )

  const lessonClassChart = classSummaries
    .map((summary) => {
      const records = lessonRecords.filter((record) => record.classId === summary.classRoom.id)
      return {
        id: summary.classRoom.id,
        name: summary.classRoom.name.length > 12 ? `${summary.classRoom.name.slice(0, 12)}...` : summary.classRoom.name,
        registros: records.length,
        planos: records.filter((record) => record.plan.trim()).length,
        recursos: records.filter((record) => record.resources.trim()).length,
      }
    })
    .filter((item) => lessonClassFilter === 'all' || item.id === lessonClassFilter)
    .filter((item) => item.registros > 0 || item.planos > 0)
  const lessonChartMinWidth = Math.max(500, lessonClassChart.length * 110)

  const lessonSubjectData = Object.values(scopedRecords.reduce<Record<string, { name: string; value: number }>>((acc, record) => {
    const subject = record.subject.trim() || 'Sem materia'
    acc[subject] = acc[subject] ? { ...acc[subject], value: acc[subject].value + 1 } : { name: subject, value: 1 }
    return acc
  }, {}))
  const lessonResourceData = [
    { name: 'Com recursos', value: scopedRecords.filter((record) => record.resources.trim()).length },
    { name: 'Sem recursos', value: scopedRecords.filter((record) => !record.resources.trim()).length },
  ].filter((item) => item.value > 0)
  const planCount = scopedRecords.filter((record) => record.plan.trim()).length
  const resourceCount = scopedRecords.filter((record) => record.resources.trim()).length
  const activityCount = scopedRecords.filter((record) => record.activity.trim()).length
  const subjectDifficultyData = buildSubjectDifficultyData({ classes: scopeClasses, students: scopeStudents, lessonRecords: scopeLessonRecords, evaluationsData })

  const renderPieLabel = (props: PieLabelRenderProps) => {
    const cx = Number(props.cx ?? 0)
    const cy = Number(props.cy ?? 0)
    const midAngle = Number(props.midAngle ?? 0)
    const outerRadius = Number(props.outerRadius ?? 0)
    const name = String(props.name ?? '')
    const value = Number(props.value ?? 0)
    const radian = Math.PI / 180
    const radius = outerRadius + 24
    const x = cx + radius * Math.cos(-midAngle * radian)
    const y = cy + radius * Math.sin(-midAngle * radian)
    return (
      <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-[10px] font-bold">
        {name} ({value})
      </text>
    )
  }

  return (
    <>
      <AnimatedEntry delay={0} animation="fade-in">
        <div className="flex items-end gap-2 overflow-x-auto border-b border-slate-400">
          {[
            { id: 'general' as const, label: 'Visao geral', icon: <LayoutDashboard size={15} /> },
            { id: 'action' as const, label: 'Acao pedagogica', icon: <Target size={15} /> },
          ].map((item) => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-t-xl border border-b-0 px-5 py-3 text-xs font-black uppercase tracking-[.16em] transition-all ${
                  active
                    ? '-mb-px border-indigo-600 bg-indigo-600 pb-4 text-white shadow-lg'
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>
      </AnimatedEntry>

      <AnimatedEntry delay={100} animation="fade-up">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-400 bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-indigo-500" />
            <p className="min-w-0 text-sm font-semibold text-slate-600">
              <span className="font-black text-slate-900">
                {classFilter === 'all' ? 'Todas as turmas' : classes.find((classRoom) => classRoom.id === classFilter)?.name ?? 'Turma'}
              </span>
              {' - '}
              {scopeStudents.length} alunos - {scopeClasses.length} turmas
            </p>
          </div>
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className="h-10 rounded-xl border border-slate-400 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">Todas as turmas</option>
            {classes.map((classRoom) => (
              <option key={classRoom.id} value={classRoom.id}>
                {classRoom.name}
              </option>
            ))}
          </select>
        </div>
      </AnimatedEntry>

      {tab === 'general' ? (
        <div className="space-y-6">
          <SectionDivider label="Indicadores gerais" icon={<BarChart2 size={12} />} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Frequencia geral"
              value={`${avgAttendance}%`}
              sublabel="Media do escopo selecionado"
              tone={avgAttendance < 75 ? 'rose' : 'emerald'}
              icon={<Activity size={20} />}
              trend={avgAttendance >= 75 ? 'up' : 'down'}
              ring={avgAttendance}
              delay={0}
            />
            <MetricCard
              label="Desempenho geral"
              value={`${Math.round((avgScore / 10) * 100)}%`}
              sublabel={`Media ${avgScore.toFixed(1)} de 10`}
              tone={avgScore < 6 ? 'amber' : 'indigo'}
              icon={<Award size={20} />}
              trend={avgScore >= 6 ? 'up' : 'down'}
              ring={(avgScore / 10) * 100}
              delay={80}
            />
            <MetricCard
              label="Baixa frequencia"
              value={lowAttendanceScope.length}
              sublabel="Alunos abaixo de 75%"
              tone="rose"
              icon={<Bell size={20} />}
              trend={lowAttendanceScope.length > 0 ? 'down' : 'neutral'}
              delay={160}
            />
            <MetricCard
              label="Queda de desempenho"
              value={lowScoreScope.length}
              sublabel="Alunos com media menor que 6"
              tone="amber"
              icon={<TrendingDown size={20} />}
              trend={lowScoreScope.length > 0 ? 'down' : 'neutral'}
              delay={240}
            />
          </div>

          <SectionDivider label="Visao por turma" icon={<School size={12} />} />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Panel
              delay={0}
              header={
                <PanelHeader
                  icon={<BarChart3 size={18} />}
                  label="Turmas"
                  title="Frequencia, desempenho e alertas"
                  actions={
                    <button
                      type="button"
                      onClick={() => openLessonModal(classFilter)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-indigo-500 hover:text-indigo-700"
                    >
                      <ClipboardList size={14} />
                      Registros
                    </button>
                  }
                />
              }
            >
              <div className="h-80 overflow-x-auto px-5 pb-3 pt-4">
                {classChartData.length > 0 ? (
                  <div className="h-full" style={{ minWidth: chartMinWidth }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classChartData} margin={{ top: 32, right: 20, left: -8, bottom: 28 }} barCategoryGap="25%" barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} interval={0} angle={-10} textAnchor="end" height={56} />
                        <YAxis yAxisId="pct" domain={[0, 100]} tickFormatter={formatPercentChartValue} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                        <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar yAxisId="pct" dataKey="frequencia" name="Frequencia (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={barSize} animationDuration={1000}>
                          <LabelList dataKey="frequencia" position="top" formatter={formatPercentChartValue} fill="#475569" fontSize={9} fontWeight={700} />
                        </Bar>
                        <Bar yAxisId="pct" dataKey="desempenho" name="Desempenho (%)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={barSize} animationBegin={150} animationDuration={1000}>
                          <LabelList dataKey="desempenho" position="top" formatter={formatPercentChartValue} fill="#475569" fontSize={9} fontWeight={700} />
                        </Bar>
                        <Bar yAxisId="count" dataKey="baixaFreq" name="Baixa frequencia" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={barSize} animationBegin={300} animationDuration={1000}>
                          <LabelList dataKey="baixaFreq" position="top" formatter={formatChartValue} fill="#475569" fontSize={9} fontWeight={700} />
                        </Bar>
                        <Bar yAxisId="count" dataKey="baixoDesemp" name="Baixo desempenho" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={barSize} animationBegin={450} animationDuration={1000}>
                          <LabelList dataKey="baixoDesemp" position="top" formatter={formatChartValue} fill="#475569" fontSize={9} fontWeight={700} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="Nenhuma turma disponivel para o grafico." icon={<BarChart3 size={40} />} />
                )}
              </div>
            </Panel>

            <Panel delay={120} header={<PanelHeader icon={<PieChartIcon size={18} />} label="Radar" title="Situacao das turmas" />}>
              <div className="h-64 px-5 py-4">
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 10, right: 50, bottom: 10, left: 50 }}>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={5}
                        label={renderPieLabel}
                        labelLine={false}
                        animationDuration={1200}
                        animationBegin={200}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={classStatusChartColors[entry.name] ?? lessonChartColors[(index + 2) % lessonChartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="Sem dados." icon={<PieChartIcon size={32} />} />
                )}
              </div>
              <div className="flex flex-wrap gap-3 px-5 pb-4">
                {[
                  { label: 'Estaveis', count: stableCount, color: 'bg-emerald-500' },
                  { label: 'Em atencao', count: attentionCount, color: 'bg-amber-400' },
                  { label: 'Sem dados', count: noDataCount, color: 'bg-slate-400' },
                ].filter((item) => item.count > 0).map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    {item.label} ({item.count})
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <SectionDivider label="Indices de dificuldade" icon={<Percent size={12} />} />
          <Panel delay={200} header={<PanelHeader icon={<Flame size={18} />} iconTone="rose" label="Diagnostico" title="Ranking por materia" />}>
            <div className="space-y-4 p-6">
              {subjectDifficultyData.map((subject, index) => (
                <ProgressBar
                  key={subject.label}
                  label={subject.label}
                  value={subject.value}
                  color={subject.value >= 70 ? '#f43f5e' : subject.value >= 50 ? '#f59e0b' : '#6366f1'}
                  delay={index * 80}
                />
              ))}
            </div>
          </Panel>
        </div>
      ) : null}

      {tab === 'action' ? (
        <div className="space-y-6">
          <SectionDivider label="Prioridades" icon={<Target size={12} />} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InsightCard label="Turmas em atencao" value={attentionCount} detail="Com alertas pedagogicos ativos" icon={<AlertTriangle size={18} />} tone={attentionCount > 0 ? 'amber' : 'emerald'} delay={0} />
            <InsightCard label="Alunos reincidentes" value={recurrentAlerts.length} detail="Baixa freq. e media menor que 6" icon={<UserRound size={18} />} tone={recurrentAlerts.length > 0 ? 'rose' : 'emerald'} delay={80} />
            <InsightCard label="Sem registros" value={classesWithoutRecords.length} detail="Turmas sem diario" icon={<ClipboardList size={18} />} tone={classesWithoutRecords.length > 0 ? 'amber' : 'emerald'} delay={160} />
            <InsightCard label="Cobertura" value={`${coverage}%`} detail={`${classesWithData.length} de ${classSummaries.length} turmas`} icon={<Layers size={18} />} tone={coverage >= 80 ? 'emerald' : coverage >= 50 ? 'amber' : 'rose'} delay={240} />
          </div>

          <SectionDivider label="Radar por turma" icon={<School size={12} />} />
          <Panel
            delay={60}
            header={
              <PanelHeader
                icon={<Layers size={18} />}
                label="Turmas"
                title="Radar pedagogico"
                actions={
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <StatPill value={classSummaries.length} label="turmas" tone="indigo" size="md" />
                    <button
                      type="button"
                      onClick={() => openLessonModal()}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-400 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-indigo-500 hover:text-indigo-700"
                    >
                      <ClipboardList size={14} />
                      Registros
                    </button>
                  </div>
                }
              />
            }
          >
            {classSummaries.length > 0 ? (
              <div className="grid gap-4 p-5 md:grid-cols-2">
                {classSummaries.map((summary, index) => (
                  <ClassCard key={summary.classRoom.id} summary={summary} onOpenRecords={() => openLessonModal(summary.classRoom.id)} index={index} />
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState message="Nenhuma turma no escopo." icon={<Layers size={40} />} />
              </div>
            )}
          </Panel>

          <SectionDivider label="Alunos em alerta" icon={<AlertCircle size={12} />} />
          <Panel
            delay={100}
            header={
              <PanelHeader
                icon={<AlertCircle size={18} />}
                iconTone="rose"
                label="Acompanhamento"
                title="Alunos que precisam de atencao"
                actions={
                  alertStudents.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <StatPill value={alertStudents.length} label="alunos" tone="rose" size="md" />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAlertId(selectedAlertForModal)
                          setAlertModal(true)
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-400 bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-sm transition-all hover:bg-rose-50"
                      >
                        <Users size={14} />
                        Ver todos
                      </button>
                    </div>
                  ) : undefined
                }
              />
            }
          >
            {alertStudents.length > 0 ? (
              <div className="grid gap-3 p-5 md:grid-cols-2">
                {alertStudents.slice(0, 8).map((student, index) => (
                  <AlertStudentCard
                    key={student.id}
                    student={student}
                    className={getClassName(student.classId)}
                    delay={index * 50}
                    onOpen={() => {
                      setSelectedAlertId(student.id)
                      setAlertModal(true)
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyState message="Nenhum aluno em alerta no escopo atual." icon={<CheckCircle size={40} />} />
              </div>
            )}
          </Panel>
        </div>
      ) : null}

      {alertModal ? (
        <AlertStudentsModal
          students={alertStudents}
          selectedStudentId={selectedAlertForModal}
          onSelectStudent={setSelectedAlertId}
          onClose={() => setAlertModal(false)}
          getClassName={getClassName}
        />
      ) : null}

      {lessonModal && typeof document !== 'undefined' ? createPortal(
        <div
          role="presentation"
          onMouseDown={() => setLessonModal(false)}
          className="fixed inset-0 z-50 flex items-stretch justify-center p-3 sm:items-center sm:px-5 sm:py-8"
          style={{
            background: 'rgba(15, 23, 42, 0.46)',
            backdropFilter: 'blur(8px) saturate(0.95)',
            WebkitBackdropFilter: 'blur(8px) saturate(0.95)',
          }}
        >
          <div className="flex min-h-0 w-full items-center justify-center">
            <div
              role="dialog"
              aria-modal="true"
              onMouseDown={(event) => event.stopPropagation()}
              className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl sm:max-h-[calc(100vh-4rem)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-slate-50 px-6 py-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-600 shadow-sm">
                    <ClipboardList size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[.2em] text-indigo-500">Diario de aula</p>
                    <h2 className="truncate font-['Sora',system-ui,sans-serif] text-base font-black text-slate-900">Registros por turma</h2>
                  </div>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-auto">
                  <select
                    value={lessonClassFilter}
                    onChange={(event) => setLessonClassFilter(event.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-slate-400 bg-white px-4 text-sm font-semibold shadow-sm sm:min-w-[200px]"
                  >
                    <option value="all">Todas as turmas</option>
                    {classSummaries.map((summary) => (
                      <option key={summary.classRoom.id} value={summary.classRoom.id}>
                        {summary.classRoom.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setLessonModal(false)}
                    className="grid h-10 w-10 place-items-center rounded-xl border border-slate-300 text-slate-400 shadow-sm transition-colors hover:border-slate-400 hover:text-slate-700"
                    aria-label="Fechar registros"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5">
                {lessonLoading ? (
                  <LessonRecordsModalSkeleton />
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                      <InfoCard label="Registros" value={scopedRecords.length} detail="Aulas registradas" icon={<ClipboardList size={18} />} delay={0} />
                      <InfoCard label="Planos" value={planCount} detail="Com plano de aula" tone="emerald" icon={<BookMarked size={18} />} delay={80} />
                      <InfoCard label="Recursos" value={resourceCount} detail="Com materiais usados" tone="amber" icon={<Zap size={18} />} delay={160} />
                      <InfoCard label="Atividades" value={activityCount} detail="Atividades descritas" tone="rose" icon={<ListChecks size={18} />} delay={240} />
                    </div>

                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="rounded-2xl border border-slate-400 bg-white p-5 shadow-sm">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-[.18em] text-indigo-500">Por turma</p>
                        <p className="mb-5 font-['Sora',system-ui,sans-serif] text-base font-black text-slate-800">Registros, planos e recursos</p>
                        <div className="h-64 overflow-x-auto">
                          {lessonClassChart.length > 0 ? (
                            <div className="h-full" style={{ minWidth: lessonChartMinWidth }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={lessonClassChart} margin={{ top: 28, right: 16, left: -8, bottom: 20 }} barCategoryGap="28%" barGap={10}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} interval={0} angle={-10} textAnchor="end" height={50} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12 }} />
                                  <Bar dataKey="registros" name="Registros" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={26} animationDuration={1000}>
                                    <LabelList dataKey="registros" position="top" formatter={formatChartValue} fill="#475569" fontSize={9} fontWeight={700} />
                                  </Bar>
                                  <Bar dataKey="planos" name="Planos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={26} animationBegin={150} animationDuration={1000}>
                                    <LabelList dataKey="planos" position="top" formatter={formatChartValue} fill="#475569" fontSize={9} fontWeight={700} />
                                  </Bar>
                                  <Bar dataKey="recursos" name="Recursos" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={26} animationBegin={300} animationDuration={1000}>
                                    <LabelList dataKey="recursos" position="top" formatter={formatChartValue} fill="#475569" fontSize={9} fontWeight={700} />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <EmptyState message="Nenhum registro para o grafico." icon={<BarChart3 size={36} />} />
                          )}
                        </div>
                      </div>

                      <div className="space-y-5">
                        {[
                          { label: 'Por materia', data: lessonSubjectData, icon: <BookOpen size={16} /> },
                          { label: 'Uso de recursos', data: lessonResourceData, icon: <Zap size={16} /> },
                        ].map(({ label, data, icon }) => (
                          <div key={label} className="rounded-2xl border border-slate-400 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2.5">
                              <span className="text-slate-400">{icon}</span>
                              <p className="text-sm font-black text-slate-700">{label}</p>
                            </div>
                            <div className="h-44">
                              {data.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart margin={{ top: 10, right: 50, bottom: 10, left: 50 }}>
                                    <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={56} paddingAngle={4} label={renderPieLabel} labelLine={false} animationDuration={1000}>
                                      {data.map((entry, index) => <Cell key={entry.name} fill={lessonChartColors[index % lessonChartColors.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12 }} />
                                  </PieChart>
                                </ResponsiveContainer>
                              ) : (
                                <EmptyState message="Sem dados." icon={<BookOpen size={28} />} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">
                      <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                        <CalendarDays size={16} className="text-slate-400" />
                        <p className="text-sm font-black text-slate-700">Registros detalhados</p>
                      </div>
                      <div className="grid gap-4 p-5 md:grid-cols-2">
                        {scopedRecords.slice(0, 6).map((record, index) => (
                          <AnimatedEntry key={record.id} delay={index * 60} animation="scale-up">
                            <div className="rounded-xl border border-slate-400 bg-slate-50 p-4 transition-shadow hover:shadow-md">
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-900">
                                    <BookMarked size={14} className="shrink-0 text-indigo-500" />
                                    <span className="truncate">{record.subject || 'Materia'}</span>
                                  </p>
                                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{getClassName(record.classId)} - {formatLessonDate(record)}</p>
                                </div>
                                <span className="shrink-0 rounded-full border border-indigo-400 bg-indigo-50 px-3 py-1 text-[10px] font-black text-indigo-600">Aula</span>
                              </div>
                              <div className="space-y-2">
                                {[
                                  { label: 'Conteudo', value: record.content },
                                  { label: 'Plano', value: record.plan },
                                  { label: 'Recursos', value: record.resources },
                                ].map((field) => (
                                  <p key={field.label} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium leading-5 text-slate-600">
                                    <span className="font-black text-slate-800">{field.label}:</span>{' '}
                                    {field.value || 'Nao informado'}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </AnimatedEntry>
                        ))}
                        {scopedRecords.length === 0 ? (
                          <div className="md:col-span-2">
                            <EmptyState message="Nenhum registro encontrado." icon={<ClipboardList size={40} />} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes progressShine {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}
