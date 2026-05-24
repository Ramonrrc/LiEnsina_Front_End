import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FileDown,
  GraduationCap,
  Info,
  Lightbulb,
  School,
  Shield,
  Table2,
  Target,
  TrendingUp,
  TrendingDown,
  UserRound,
  Users,
  X,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  Star,
  BarChart2,
  PieChart,
  Filter,
} from 'lucide-react'

import { resolveApiAssetUrl } from '../api'
import { formatClassGrade } from '../class-grade-options'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { DEFAULT_PAGE_SIZE, PaginationControls, paginateLocal } from '../components/ui/pagination-controls'
import { getAcademicSubjectLabel } from '../components/role-portal/portal-components'
import { buildCsv } from '../lib/csv'
import type {
  AuditEvent,
  ClassRoom,
  DashboardAlertsPagePayload,
  DashboardPayload,
  Evaluation,
  RoleCode,
  School as SchoolType,
  UserAccount,
} from '../types'

/* ─── Design System ──────────────────────────────────────────────────────── */

const SUBJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#3b82f6',
]

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981']

const METRIC_CONFIGS = [
  {
    icon: Users,
    accent: '#6366f1',
    accentLight: '#eef2ff',
    accentDark: '#4338ca',
    label: 'text-indigo-600',
    badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    trend: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: CalendarCheck,
    accent: '#10b981',
    accentLight: '#ecfdf5',
    accentDark: '#059669',
    label: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    trend: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: ClipboardList,
    accent: '#f59e0b',
    accentLight: '#fffbeb',
    accentDark: '#d97706',
    label: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    trend: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Bell,
    accent: '#ef4444',
    accentLight: '#fef2f2',
    accentDark: '#dc2626',
    label: 'text-red-600',
    badge: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    trend: 'bg-red-50 text-red-600',
  },
] as const

const ALERT_CONFIG = {
  danger: {
    bg: 'bg-red-50 border border-red-100',
    title: 'text-red-900',
    desc: 'text-red-700',
    icon: AlertCircle,
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
    count: 'bg-red-500 text-white',
  },
  warning: {
    bg: 'bg-amber-50 border border-amber-100',
    title: 'text-amber-900',
    desc: 'text-amber-700',
    icon: AlertTriangle,
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
    count: 'bg-amber-400 text-white',
  },
  info: {
    bg: 'bg-blue-50 border border-blue-100',
    title: 'text-blue-900',
    desc: 'text-blue-700',
    icon: Info,
    badge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
    count: 'bg-blue-500 text-white',
  },
} as const

/* ─── Global Styles ──────────────────────────────────────────────────────── */

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap');

  .dv-root {
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    --dv-heading: 'Bricolage Grotesque', system-ui, sans-serif;
  }

  @keyframes dv-in {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dv-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes dv-slide-right {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  @keyframes dv-modal-in {
    from { opacity: 0; transform: scale(0.96) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes dv-shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  @keyframes dv-spin-slow {
    to { transform: rotate(360deg); }
  }
  @keyframes dv-bar {
    from { width: 0; }
  }
  @keyframes dv-bar-v {
    from { height: 0; }
  }
  @keyframes dv-donut {
    from { stroke-dasharray: 0 999; }
  }

  .dv-enter  { animation: dv-in 0.5s cubic-bezier(.2,1,.3,1) both; }
  .dv-fade   { animation: dv-fade 0.4s ease both; }
  .dv-card   { animation: dv-in 0.45s cubic-bezier(.2,1,.3,1) both; }
  .dv-modal  { animation: dv-modal-in 0.35s cubic-bezier(.2,1,.3,1) both; }
  .dv-shimmer {
    background: linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%);
    background-size: 600px 100%;
    animation: dv-shimmer 1.6s ease infinite;
  }

  .dv-card-hover {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .dv-card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }

  .dv-row-hover {
    transition: background 0.15s ease;
  }
  .dv-row-hover:hover { background: #f8fafc; }

  .dv-panel-enter {
    animation: dv-in 0.5s cubic-bezier(.2,1,.3,1) both;
  }

  .dv-bar-anim {
    transform-origin: left center;
    animation: dv-bar 0.8s cubic-bezier(.2,1,.3,1) both;
  }

  .dv-bar-v-anim {
    transform-origin: bottom center;
    animation: dv-bar-v 0.8s cubic-bezier(.2,1,.3,1) both;
  }

  .dv-donut-anim circle {
    animation: dv-donut 1s cubic-bezier(.2,1,.3,1) both;
  }

  .dv-tab-active {
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .dv-focus:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .dv-enter, .dv-fade, .dv-card, .dv-modal,
    .dv-card-hover, .dv-bar-anim, .dv-bar-v-anim, .dv-donut-anim circle {
      animation: none !important;
      transition: none !important;
    }
  }
`

/* ─── Skeleton ───────────────────────────────────────────────────────────── */

function Skel({ w = 'w-24', h = 'h-4', className = '' }: { w?: string; h?: string; className?: string }) {
  return <div className={`dv-shimmer rounded-md ${w} ${h} ${className}`} />
}

function MetricSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between mb-5">
        <div className="space-y-2">
          <Skel w="w-20" h="h-3" />
          <Skel w="w-28" h="h-8" />
        </div>
        <Skel w="w-12" h="h-12" className="rounded-xl" />
      </div>
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <Skel w="w-32" h="h-3" />
        <Skel w="w-14" h="h-5" className="rounded-full" />
      </div>
    </div>
  )
}

function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <Skel w="w-10" h="h-10" className="rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skel w="w-16" h="h-2.5" />
          <Skel w="w-44" h="h-4" />
        </div>
        <Skel w="w-20" h="h-8" className="rounded-lg" />
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between">
              <Skel w="w-28" h="h-3" />
              <Skel w="w-16" h="h-3" />
            </div>
            <Skel w="w-full" h="h-2" className="rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Section Header ─────────────────────────────────────────────────────── */

function SectionHeader({ label, icon: Icon }: { label: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-2.5 mb-5">
      {Icon && (
        <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center">
          <Icon size={11} className="text-white" />
        </div>
      )}
      <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-slate-400">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

/* ─── Card ───────────────────────────────────────────────────────────────── */

function Card({
  children,
  className = '',
  animate = true,
  delay = 0,
  hover = false,
}: {
  children: ReactNode
  className?: string
  animate?: boolean
  delay?: number
  hover?: boolean
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${
        animate ? 'dv-panel-enter' : ''
      } ${hover ? 'dv-card-hover cursor-pointer' : ''} ${className}`}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  )
}

/* ─── Card Header ────────────────────────────────────────────────────────── */

function CardHeader({
  label,
  title,
  icon,
  badge,
  accentColor,
}: {
  label: string
  title: string
  icon?: ReactNode
  badge?: ReactNode
  accentColor?: string
}) {
  return (
    <div className="flex items-center gap-3.5 px-6 py-4 border-b border-slate-100">
      {icon && (
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: accentColor ?? '#6366f1' }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">{label}</p>
        <h2 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: 'var(--dv-heading)' }}>
          {title}
        </h2>
      </div>
      {badge}
    </div>
  )
}

/* ─── Bar Row (Classes) ──────────────────────────────────────────────────── */

function ClassBarRow({ label, freq, perf }: { label: string; freq: number; perf: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  const freqGood = freq >= 75
  const perfGood = perf >= 60

  return (
    <div ref={ref} className="group flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-50 transition-colors">
      <div className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <GraduationCap size={11} className="text-slate-500" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-slate-800 truncate mb-2">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-16 shrink-0">Frequência</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: visible ? `${freq}%` : '0%',
                  background: freqGood ? '#10b981' : '#f59e0b',
                }}
              />
            </div>
            <span className={`text-[10px] font-bold w-8 text-right ${freqGood ? 'text-emerald-600' : 'text-amber-600'}`}>
              {freq}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-16 shrink-0">Desempenho</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: visible ? `${perf}%` : '0%',
                  transitionDelay: '100ms',
                  background: perfGood ? '#6366f1' : '#ef4444',
                }}
              />
            </div>
            <span className={`text-[10px] font-bold w-8 text-right ${perfGood ? 'text-indigo-600' : 'text-red-500'}`}>
              {perf}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Subject Column Chart ───────────────────────────────────────────────── */

function SubjectColumn({ name, pct, color }: { name: string; pct: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 flex-1" style={{ minWidth: 52 }}>
      <span className="text-[11px] font-bold" style={{ color }}>{pct}%</span>
      <div className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden bg-slate-50" style={{ height: 100 }}>
        <div
          className="w-full rounded-t-lg transition-[height] duration-[800ms] ease-out"
          style={{
            height: visible ? `${pct}%` : '0%',
            backgroundColor: color,
            opacity: 0.85,
          }}
        />
      </div>
      <span className="text-[9px] font-medium text-slate-500 text-center max-w-[60px] line-clamp-2 leading-tight">
        {name}
      </span>
    </div>
  )
}

/* ─── Donut Chart ────────────────────────────────────────────────────────── */

function DonutChart({ data, total }: { data: Array<{ level: string; alunos: number }>; total: number }) {
  const R = 64
  const C = 2 * Math.PI * R
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  let cum = 0
  const segs = data.map((d, i) => {
    const pct = d.alunos / (total || 1)
    const offset = cum * C
    cum += pct
    return { ...d, pct, offset, color: PIE_COLORS[i % PIE_COLORS.length] }
  })

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="80" cy="80" r={R} fill="none" stroke="#f1f5f9" strokeWidth="20" />
          {segs.map((s) => (
            <circle
              key={s.level}
              cx="80" cy="80" r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="20"
              strokeLinecap="butt"
              style={{
                strokeDasharray: visible ? `${s.pct * C} ${C}` : `0 ${C}`,
                strokeDashoffset: -s.offset,
                transition: 'stroke-dasharray 0.9s cubic-bezier(.2,1,.3,1)',
              }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[26px] font-extrabold text-slate-900 leading-none" style={{ fontFamily: 'var(--dv-heading)' }}>
            {total.toLocaleString('pt-BR')}
          </span>
          <span className="text-[9px] font-semibold tracking-widest uppercase text-slate-400 mt-0.5">alunos</span>
        </div>
      </div>

      <div className="w-full space-y-2">
        {segs.map((s) => (
          <div key={s.level} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="flex-1 text-[12px] font-medium text-slate-700">{s.level}</span>
            <span className="text-[12px] font-bold text-slate-900">{s.alunos}</span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: `${s.color}18`, color: s.color }}
            >
              {Math.round(s.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Status Helpers ─────────────────────────────────────────────────────── */

function statusBadge(status: string) {
  const cfg: Record<string, { bg: string; text: string; dot: string }> = {
    concluido: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    ativo:     { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    corrigindo:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
    em_aplicacao: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500' },
    planejado:  { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
    pendente:   { bg: 'bg-slate-50',  text: 'text-slate-600',  dot: 'bg-slate-400' },
  }
  const c = cfg[status] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status.replace('_', ' ')}
    </span>
  )
}

function progressColor(pct: number) {
  if (pct === 100) return '#10b981'
  if (pct >= 50) return '#6366f1'
  if (pct > 0) return '#f59e0b'
  return '#e2e8f0'
}

/* ─── Alert Student Types ────────────────────────────────────────────────── */

type AlertStudent = {
  id: string
  name: string
  classId: string
  className?: string
  attendanceRate: number
  averageScore: number
  avatarUrl?: string
  bannerUrl?: string
}

function dashboardAlertToStudent(alert: DashboardPayload['alerts'][number]): AlertStudent | null {
  if (alert.student) {
    return {
      id: alert.student.id,
      name: alert.student.name,
      classId: alert.student.classId,
      className: alert.student.className,
      attendanceRate: alert.student.attendanceRate,
      averageScore: alert.student.averageScore,
      avatarUrl: alert.student.avatarUrl,
      bannerUrl: alert.student.bannerUrl,
    }
  }
  const fallbackId = alert.studentId ?? alert.id.replace(/^alert-/, '')
  const name = alert.title.replace(/\s+em risco.*$/i, '').trim()
  const attendanceMatch = alert.description.match(/frequ[eê]ncia\s+(\d+(?:[,.]\d+)?)%/i)
  const scoreMatch = alert.description.match(/m[eé]dia\s+(\d+(?:[,.]\d+)?)/i)
  const attendanceRate = Number(attendanceMatch?.[1]?.replace(',', '.') ?? 0)
  const averageScore = Number(scoreMatch?.[1]?.replace(',', '.') ?? 0)
  if (!fallbackId || !name) return null
  return {
    id: fallbackId,
    name,
    classId: '',
    attendanceRate: Number.isFinite(attendanceRate) ? attendanceRate : 0,
    averageScore: Number.isFinite(averageScore) ? averageScore : 0,
  }
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function StudentAvatar({
  student,
  size = 'md',
  showBadge = false,
}: {
  student: AlertStudent
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showBadge?: boolean
}) {
  const url = resolveApiAssetUrl(student.avatarUrl)
  const critical = student.attendanceRate < 75 && student.averageScore < 6
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  }
  const dotMap = {
    sm: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
    md: 'w-3 h-3 bottom-0 right-0',
    lg: 'w-3.5 h-3.5 bottom-0 right-0',
    xl: 'w-4 h-4 bottom-1 right-1',
  }

  return (
    <div className="relative shrink-0">
      <div
        className={`${sizeMap[size]} rounded-full overflow-hidden flex items-center justify-center font-bold text-white ring-2 ring-white`}
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        {url ? (
          <img src={url} alt={student.name} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <span>{getInitials(student.name) || <UserRound size={size === 'xl' ? 28 : size === 'lg' ? 20 : 14} />}</span>
        )}
      </div>
      {showBadge && (
        <span
          className={`absolute ${dotMap[size]} rounded-full border-2 border-white ${critical ? 'bg-red-500' : 'bg-amber-400'}`}
        />
      )}
    </div>
  )
}

/* ─── Progress Stat ──────────────────────────────────────────────────────── */

function ProgressStat({
  label,
  icon,
  value,
  display,
  subtitle,
  color,
  ok,
}: {
  label: string
  icon: ReactNode
  value: number
  display: string
  subtitle: string
  color: string
  ok: boolean
}) {
  return (
    <div className={`rounded-xl p-4 border ${ok ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          {icon}
          {label}
        </div>
        <span className="text-lg font-extrabold text-slate-900" style={{ fontFamily: 'var(--dv-heading)' }}>
          {display}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{subtitle}</span>
        {ok ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <CheckCircle2 size={11} />Meta atingida
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500">
            <AlertCircle size={11} />Abaixo da meta
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── Alert Students Modal ───────────────────────────────────────────────── */

function AlertStudentsModal({
  students,
  selectedStudentId,
  onSelectStudent,
  onClose,
  getClassName,
}: {
  students: AlertStudent[]
  selectedStudentId: string | null
  onSelectStudent: (id: string) => void
  onClose: () => void
  getClassName: (s: AlertStudent) => string
}) {
  const [animIn, setAnimIn] = useState(false)
  const selected = students.find((s) => s.id === selectedStudentId) ?? students[0]

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 20); return () => clearTimeout(t) }, [])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (typeof document === 'undefined') return null

  const lowFreq  = selected ? selected.attendanceRate < 75 : false
  const lowScore = selected ? selected.averageScore < 6 : false
  const critical = lowFreq && lowScore
  const bannerUrl = resolveApiAssetUrl(selected?.bannerUrl)
  const criticalCount  = students.filter((s) => s.attendanceRate < 75 && s.averageScore < 6).length
  const attentionCount = students.length - criticalCount

  return createPortal(
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{
        background: animIn ? 'rgba(15,23,42,0.5)' : 'rgba(15,23,42,0)',
        backdropFilter: animIn ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: animIn ? 'blur(8px)' : 'none',
        transition: 'background 0.25s ease, backdrop-filter 0.25s ease',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className="dv-modal w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100"
        style={{
          opacity: animIn ? 1 : 0,
          transform: animIn ? 'none' : 'translateY(20px) scale(0.97)',
          transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(.2,1,.3,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center relative">
              <Users size={18} className="text-white" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                {students.length}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-red-500">Painel</p>
              <h2 className="text-base font-bold text-slate-900" style={{ fontFamily: 'var(--dv-heading)' }}>
                Alunos em alerta
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
              </span>
              <span className="w-px h-4 bg-slate-200" />
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {attentionCount} atenção
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="dv-focus w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-[300px_1fr] overflow-hidden">
          {/* Student list */}
          <aside className="min-h-0 max-h-[40dvh] lg:max-h-none overflow-y-auto border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50">
            <div className="sticky top-0 z-10 px-4 py-3 bg-white border-b border-slate-100">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400">
                {students.length} identificado{students.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-3 space-y-1.5">
              {students.map((s) => {
                const active  = s.id === selected?.id
                const isCrit  = s.attendanceRate < 75 && s.averageScore < 6
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectStudent(s.id)}
                    className={`w-full rounded-xl p-3.5 text-left transition-all dv-focus ${
                      active
                        ? 'bg-white shadow-sm border border-slate-200'
                        : 'hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <StudentAvatar student={s} size="sm" showBadge />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-900 truncate">{s.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{getClassName(s)}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-semibold ${s.averageScore < 6 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {s.averageScore.toFixed(1)}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className={`text-[10px] font-semibold ${s.attendanceRate < 75 ? 'text-amber-500' : 'text-emerald-600'}`}>
                            {s.attendanceRate}%
                          </span>
                          {isCrit && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 ml-auto">
                              Crítico
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Detail */}
          {selected && (
            <section className="min-h-0 overflow-y-auto">
              {bannerUrl && (
                <div className="relative h-28 overflow-hidden">
                  <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
                </div>
              )}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div className="flex items-end gap-4">
                    <StudentAvatar
                      student={selected}
                      size={bannerUrl ? 'xl' : 'lg'}
                      showBadge
                    />
                    <div className="mb-1">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-0.5">
                        Diagnóstico
                      </p>
                      <h3 className="text-xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--dv-heading)' }}>
                        {selected.name}
                      </h3>
                      <p className="text-[12px] font-medium text-indigo-500 mt-0.5 flex items-center gap-1.5">
                        <GraduationCap size={12} />
                        {getClassName(selected)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`mb-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold ${
                      critical
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {critical ? <AlertTriangle size={13} /> : <AlertCircle size={13} />}
                    {critical ? 'Situação crítica' : 'Atenção necessária'}
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mt-5">
                  <ProgressStat
                    label="Frequência"
                    icon={<Activity size={12} className="text-emerald-500" />}
                    value={selected.attendanceRate}
                    display={`${selected.attendanceRate}%`}
                    subtitle="Meta mínima: 75%"
                    color={selected.attendanceRate < 65 ? '#ef4444' : selected.attendanceRate < 75 ? '#f59e0b' : '#10b981'}
                    ok={selected.attendanceRate >= 75}
                  />
                  <ProgressStat
                    label="Desempenho"
                    icon={<Award size={12} className="text-indigo-500" />}
                    value={selected.averageScore * 10}
                    display={`${selected.averageScore.toFixed(1)} / 10`}
                    subtitle="Referência: nota 6,0"
                    color={selected.averageScore < 5 ? '#ef4444' : selected.averageScore < 6 ? '#f59e0b' : '#10b981'}
                    ok={selected.averageScore >= 6}
                  />
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Reasons */}
                <div className="rounded-xl border border-red-100 overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border-b border-red-100">
                    <AlertTriangle size={13} className="text-red-500" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-red-600">
                      Por que está em alerta
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {lowFreq && (
                      <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-amber-500 shrink-0" />
                        <p className="text-[12px] font-medium text-amber-900">
                          Frequência em {selected.attendanceRate}%, abaixo do limite de 75%.
                        </p>
                      </div>
                    )}
                    {lowScore && (
                      <div className="flex gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-red-500 shrink-0" />
                        <p className="text-[12px] font-medium text-red-900">
                          Média {selected.averageScore.toFixed(1)}, abaixo da referência de 6,0.
                        </p>
                      </div>
                    )}
                    {critical && (
                      <div className="flex gap-3 p-3 rounded-lg bg-red-100 border border-red-200">
                        <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-red-600 shrink-0" />
                        <p className="text-[12px] font-bold text-red-900">
                          Alerta combinado: baixa presença e baixo desempenho simultâneos.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="rounded-xl border border-indigo-100 overflow-hidden">
                  <div className="flex items-center gap-2.5 px-4 py-3 bg-indigo-50 border-b border-indigo-100">
                    <Lightbulb size={13} className="text-indigo-500" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-indigo-600">
                      Ações recomendadas
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      lowFreq  ? 'Iniciar busca ativa e registrar devolutiva da família.' : null,
                      lowScore ? 'Planejar recuperação focalizada com verificação de aprendizagem.' : null,
                      'Cruzar o plano de aula com os dados de desempenho.',
                    ]
                      .filter((a): a is string => Boolean(a))
                      .map((action, i) => (
                        <div key={action} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-[12px] font-medium text-slate-700">{action}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

interface DashboardViewProps {
  dashboard: DashboardPayload
  evaluations: Evaluation[]
  auditEvents: AuditEvent[]
  profile?: RoleCode
  currentUser?: UserAccount
  schools?: SchoolType[]
  classes?: ClassRoom[]
  loading?: boolean
  onLoadAlertsPage?: (params: { page: number; limit: number }) => Promise<DashboardAlertsPagePayload>
}

export default function DashboardView({
  dashboard,
  evaluations,
  auditEvents,
  profile = 'ADMIN',
  currentUser,
  schools = [],
  classes = [],
  loading = false,
  onLoadAlertsPage,
}: DashboardViewProps) {
  const isSchoolDashboard = profile === 'DIRETOR'
  const directorLinkedSchool = schools.find((s) => s.id === currentUser?.schoolId) ?? schools[0] ?? null
  const directorSchoolValue  = directorLinkedSchool?.id ?? currentUser?.schoolId ?? 'linked-school'

  const [schoolFilter,   setSchoolFilter]   = useState(isSchoolDashboard ? directorSchoolValue : 'all')
  const [classFilter,    setClassFilter]    = useState('all')
  const [subjectFilter,  setSubjectFilter]  = useState('all')
  const [periodFilter,   setPeriodFilter]   = useState('month')

  const [alertPage,        setAlertPage]        = useState(dashboard.alertsPagination?.page  ?? 1)
  const [alertLimit,       setAlertLimit]       = useState(dashboard.alertsPagination?.limit ?? DEFAULT_PAGE_SIZE)
  const [alertPageData,    setAlertPageData]    = useState<DashboardAlertsPagePayload | null>(null)
  const [alertPageLoading, setAlertPageLoading] = useState(false)
  const [alertPageSource,  setAlertPageSource]  = useState<'backend' | 'local'>(onLoadAlertsPage ? 'backend' : 'local')
  const [selectedAlertStudentId, setSelectedAlertStudentId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t) }, [])

  useEffect(() => {
    if (!isSchoolDashboard) return
    setSchoolFilter(directorSchoolValue)
  }, [directorSchoolValue, isSchoolDashboard])

  const activeEvaluations = evaluations.filter((e) => e.status !== 'concluido')
  const canViewAudit = profile === 'SUPERADMIN'

  const dashboardTitle =
    profile === 'DIRETOR'     ? 'Dashboard da escola'
    : profile === 'COORDENADOR' ? 'Dashboard pedagógico'
    : 'Dashboard geral'

  const subjectOptions = useMemo<CompactSelectOption[]>(
    () => [
      { value: 'all', label: 'Todas as disciplinas' },
      ...Array.from(new Set([
        ...dashboard.subjectRadar.map((i) => getAcademicSubjectLabel(i.subject)),
        ...evaluations.map((e) => getAcademicSubjectLabel(e.subject)),
      ])).filter(Boolean).map((s) => ({ value: s, label: s })),
    ],
    [dashboard.subjectRadar, evaluations],
  )

  const schoolOptions = useMemo<CompactSelectOption[]>(
    () =>
      isSchoolDashboard
        ? [{ value: directorSchoolValue, label: directorLinkedSchool?.name ?? 'Escola vinculada', description: directorLinkedSchool?.city }]
        : [{ value: 'all', label: 'Todas as escolas' }, ...schools.map((s) => ({ value: s.id, label: s.name, description: s.city }))],
    [directorLinkedSchool, directorSchoolValue, isSchoolDashboard, schools],
  )

  const classOptions = useMemo<CompactSelectOption[]>(
    () => [
      { value: 'all', label: 'Todas as turmas' },
      ...classes
        .filter((c) => schoolFilter === 'all' || c.schoolId === schoolFilter)
        .map((c) => ({ value: c.id, label: c.name, description: `${formatClassGrade(c.grade)} · ${c.shift}` })),
    ],
    [classes, schoolFilter],
  )

  const proficiencyTotal = dashboard.proficiencyDistribution.reduce((s, e) => s + e.alunos, 0)
  const alertCounts = useMemo(
    () =>
      dashboard.alertsSummary ??
      dashboard.alerts.reduce<Record<string, number>>((acc, a) => {
        acc[a.tone] = (acc[a.tone] ?? 0) + 1; return acc
      }, {}),
    [dashboard.alerts, dashboard.alertsSummary],
  )

  const topSubjects = useMemo(
    () => dashboard.subjectRadar
      .map((item) => ({ ...item, subject: getAcademicSubjectLabel(item.subject) }))
      .sort((a, b) => b.acertos - a.acertos),
    [dashboard.subjectRadar],
  )

  const localAlertsPage    = useMemo(() => paginateLocal(dashboard.alerts, alertPage, alertLimit), [alertLimit, alertPage, dashboard.alerts])
  const dashboardAlertsPage = useMemo<DashboardAlertsPagePayload | null>(
    () => dashboard.alertsPagination ? { alerts: dashboard.alerts, pagination: dashboard.alertsPagination } : null,
    [dashboard.alerts, dashboard.alertsPagination],
  )
  const activeAlertsPage =
    alertPageData ??
    (dashboardAlertsPage?.pagination.page === alertPage && dashboardAlertsPage.pagination.limit === alertLimit
      ? dashboardAlertsPage
      : null)

  const displayedAlerts = activeAlertsPage?.alerts ?? localAlertsPage.items
  const alertPagination  = activeAlertsPage?.pagination ?? localAlertsPage.pagination
  const alertStudents = useMemo(
    () => displayedAlerts.map(dashboardAlertToStudent).filter((s): s is AlertStudent => Boolean(s)),
    [displayedAlerts],
  )

  const classNameById = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes])
  function getAlertStudentClassName(s: AlertStudent) {
    return s.className ?? classNameById.get(s.classId) ?? 'Turma não localizada'
  }

  useEffect(() => {
    if (!onLoadAlertsPage) { setAlertPageData(null); setAlertPageSource('local'); return }
    let cancelled = false
    setAlertPageLoading(true)
    onLoadAlertsPage({ page: alertPage, limit: alertLimit })
      .then((data) => {
        if (cancelled) return
        setAlertPageData(data)
        setAlertPageSource('backend')
        if (data.pagination.page !== alertPage) setAlertPage(data.pagination.page)
        if (data.pagination.limit !== alertLimit) setAlertLimit(data.pagination.limit)
      })
      .catch(() => { if (!cancelled) { setAlertPageData(null); setAlertPageSource('local') } })
      .finally(() => { if (!cancelled) setAlertPageLoading(false) })
    return () => { cancelled = true }
  }, [alertLimit, alertPage, onLoadAlertsPage])

  function exportDashboard(format: 'pdf' | 'excel') {
    if (format === 'pdf') { window.print(); return }
    const rows = [['Indicador', 'Valor', 'Detalhe'], ...dashboard.metrics.map((m) => [m.label, m.value, m.detail])]
    const blob = new Blob([buildCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'dashboard.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const selectCls = 'min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all'

  return (
    <>
      <style>{styles}</style>
      <div
        className={`dv-root min-h-screen bg-slate-50 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* ── Top bar ── */}
        <div className="bg-white border-b border-slate-300 sticky top-0 z-30">
          <div className="px-[clamp(16px,2.5vw,40px)] py-2">
            <PageTitleBar
              label="Central pedagógica"
              title={dashboardTitle}
              icon={<BarChart3 size={18} />}
              actions={
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-semibold text-emerald-700 tracking-wide">Ao vivo</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                    <Sparkles size={11} className="text-slate-500" />
                    <span className="text-[11px] font-semibold text-slate-600">{dashboard.metrics.length} indicadores</span>
                  </div>
                </div>
              }
            />
          </div>
        </div>

        <div className="px-[clamp(16px,2.5vw,40px)] py-6 pb-16 space-y-8">
          {/* ── Filters ── */}
          <Card animate={false} className="!rounded-xl">
            <div className="px-5 py-3.5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 mr-1">
                <Filter size={13} />
                Filtros
              </div>
              <div className="flex flex-wrap gap-2.5 flex-1">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    <School size={9} />Escola
                  </span>
                  <CompactSelect
                    value={schoolFilter}
                    options={schoolOptions}
                    onChange={setSchoolFilter}
                    dropdownWidth="trigger"
                    disabled={isSchoolDashboard}
                    className={`${selectCls} ${isSchoolDashboard ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    <GraduationCap size={9} />Turma
                  </span>
                  <CompactSelect value={classFilter} options={classOptions} onChange={setClassFilter} dropdownWidth="trigger" className={selectCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    <BookOpen size={9} />Disciplina
                  </span>
                  <CompactSelect value={subjectFilter} options={subjectOptions} onChange={setSubjectFilter} dropdownWidth="trigger" className={selectCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    <Clock size={9} />Período
                  </span>
                  <CompactSelect
                    value={periodFilter}
                    options={[
                      { value: 'week',  label: 'Esta semana' },
                      { value: 'month', label: 'Este mês' },
                      { value: 'year',  label: 'Este ano' },
                    ]}
                    onChange={setPeriodFilter}
                    dropdownWidth="trigger"
                    className={selectCls}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => exportDashboard('pdf')}
                  className="dv-focus flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-700 transition-colors"
                >
                  <FileDown size={13} />PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportDashboard('excel')}
                  className="dv-focus flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 transition-colors"
                >
                  <Table2 size={13} />CSV
                </button>
              </div>
            </div>
          </Card>

          {/* ── Metric cards ── */}
          <section>
            <SectionHeader label="Indicadores principais" icon={BarChart2} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)
                : dashboard.metrics.map((metric, idx) => {
                    const cfg = METRIC_CONFIGS[idx % METRIC_CONFIGS.length]
                    const Icon = cfg.icon
                    const up = metric.trend !== 'down'
                    return (
                      <article
                        key={metric.id}
                        className="dv-card dv-card-hover bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        {/* Color accent strip */}
                        <div className="h-[3px]" style={{ background: cfg.accent }} />
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-1">
                                {metric.label}
                              </p>
                              <strong
                                className="text-[36px] font-extrabold leading-none text-slate-900 block"
                                style={{ fontFamily: 'var(--dv-heading)' }}
                              >
                                {metric.value}
                              </strong>
                            </div>
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center"
                              style={{ background: cfg.accentLight }}
                            >
                              <Icon size={20} style={{ color: cfg.accent }} />
                            </div>
                          </div>
                          <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-500 font-medium">{metric.detail}</span>
                            {metric.trend && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ${
                                  up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                                }`}
                              >
                                {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {metric.trendValue ?? ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
            </div>
          </section>

          {/* ── Attendance + Proficiency ── */}
          <section>
            <SectionHeader label="Frequência e proficiência" icon={PieChart} />
            <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
              {loading ? <PanelSkeleton rows={6} /> : (
                <Card delay={100}>
                  <CardHeader
                    label="Turmas"
                    title="Frequência e desempenho por turma"
                    icon={<School size={16} />}
                    accentColor="#10b981"
                    badge={
                      <span className="px-3 py-1.5 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                        {dashboard.attendanceByClass.length} turmas
                      </span>
                    }
                  />
                  <div className="px-3 py-2 border-b border-slate-50 flex items-center gap-6">
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />Frequência
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />Desempenho
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-400">
                      <Target size={10} className="text-slate-300" />Meta: 75% / 60%
                    </span>
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
                    {dashboard.attendanceByClass.map((item) => {
                      const perf = Math.max(0, Math.min(100, item.media <= 10 ? item.media * 10 : item.media))
                      return <ClassBarRow key={item.className} label={item.className} freq={item.frequencia} perf={perf} />
                    })}
                  </div>
                </Card>
              )}

              {loading ? <PanelSkeleton rows={4} /> : (
                <Card delay={160}>
                  <CardHeader
                    label="TRI / Proficiência"
                    title="Distribuição dos alunos"
                    icon={<Target size={16} />}
                    accentColor="#8b5cf6"
                  />
                  <div className="p-5">
                    <DonutChart data={dashboard.proficiencyDistribution} total={proficiencyTotal} />
                  </div>
                </Card>
              )}
            </div>
          </section>

          {/* ── Subject Performance ── */}
          {loading ? <PanelSkeleton rows={3} /> : (
            <Card delay={200}>
              <CardHeader
                label="Disciplinas"
                title="Taxa de acerto por disciplina (%)"
                icon={<BookOpen size={16} />}
                accentColor="#06b6d4"
                badge={
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 text-[11px] font-semibold text-cyan-600 border border-cyan-100">
                    <Zap size={11} />Atualizado hoje
                  </span>
                }
              />
              <div className="p-5">
                <div className="flex gap-5">
                  {/* Bar chart */}
                  <div className="flex-1 overflow-x-auto">
                    <div className="flex items-end gap-3 px-2" style={{ minHeight: 140 }}>
                      {dashboard.subjectRadar.map((s, i) => (
                        <SubjectColumn
                          key={s.subject}
                          name={getAcademicSubjectLabel(s.subject)}
                          pct={s.acertos}
                          color={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Ranking */}
                  <div className="w-44 shrink-0 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      Ranking
                    </p>
                    {topSubjects.slice(0, 3).map((s, i) => (
                      <div
                        key={s.subject}
                        className={`flex items-center gap-2.5 p-3 rounded-xl ${
                          i === 0 ? 'bg-indigo-50 border border-indigo-300'
                          : i === 1 ? 'bg-violet-50 border border-violet-300'
                          : 'bg-slate-50 border border-slate-400/70'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                            i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-violet-400' : 'bg-slate-300'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1 truncate text-[11px] font-semibold text-slate-800">{s.subject}</span>
                        <span className={`text-[11px] font-bold ${i === 0 ? 'text-indigo-600' : i === 1 ? 'text-violet-500' : 'text-slate-500'}`}>
                          {s.acertos}%
                        </span>
                      </div>
                    ))}
                    {topSubjects.length > 0 && (
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-300">
                        <ArrowDown size={14} className="text-red-400 shrink-0" />
                        <span className="flex-1 truncate text-[11px] font-semibold text-red-800">
                          {topSubjects[topSubjects.length - 1]?.subject}
                        </span>
                        <span className="text-[11px] font-bold text-red-500">
                          {topSubjects[topSubjects.length - 1]?.acertos}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── Alerts + Audit ── */}
          <section>
            <SectionHeader label="Alertas e auditoria" icon={Bell} />
            <div className={`grid gap-5 ${canViewAudit ? 'xl:grid-cols-2' : ''}`}>
              {/* Alert panel */}
              <Card delay={240}>
                <CardHeader
                  label="Alertas inteligentes"
                  title="Risco pedagógico"
                  icon={<Bell size={16} />}
                  accentColor="#ef4444"
                  badge={
                    alertPagination.total > 0 ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-[11px] font-bold text-red-600 border border-red-100">
                        <AlertTriangle size={11} />
                        {alertPagination.total}
                      </span>
                    ) : null
                  }
                />
                <div className="p-5">
                  {/* Summary pills */}
                  <div className="grid grid-cols-3 gap-2.5 mb-5">
                    {(['danger', 'warning', 'info'] as const).map((tone) => {
                      const t = ALERT_CONFIG[tone]
                      const AlertIcon = t.icon
                      const count = alertCounts[tone] ?? 0
                      return (
                        <div
                          key={tone}
                          className="flex flex-col items-center gap-2 py-4 rounded-xl bg-slate-50 border border-slate-100"
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{
                              background:
                                tone === 'danger' ? '#fef2f2'
                                : tone === 'warning' ? '#fffbeb'
                                : '#eff6ff',
                            }}
                          >
                            <AlertIcon
                              size={15}
                              className={
                                tone === 'danger' ? 'text-red-500'
                                : tone === 'warning' ? 'text-amber-500'
                                : 'text-blue-500'
                              }
                            />
                          </div>
                          <span className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'var(--dv-heading)' }}>
                            {count}
                          </span>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                            {tone === 'danger' ? 'Crítico' : tone === 'warning' ? 'Atenção' : 'Info'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Alert list */}
                  <div className="space-y-2">
                    {alertPageLoading
                      ? Array.from({ length: Math.min(alertLimit, 4) }).map((_, i) => (
                          <div key={i} className="p-4 rounded-xl bg-slate-50 space-y-2">
                            <Skel w="w-44" h="h-3" />
                            <Skel w="w-full" h="h-3" />
                          </div>
                        ))
                      : displayedAlerts.length > 0
                      ? displayedAlerts.map((alert) => {
                          const t = ALERT_CONFIG[alert.tone as keyof typeof ALERT_CONFIG] ?? ALERT_CONFIG.info
                          const AlertIcon = t.icon
                          const alertStudent = dashboardAlertToStudent(alert)
                          const canOpen = isSchoolDashboard && Boolean(alertStudent)
                          return (
                            <button
                              key={alert.id}
                              type="button"
                              disabled={!canOpen}
                              onClick={() => { if (alertStudent) setSelectedAlertStudentId(alertStudent.id) }}
                              className={`w-full text-left p-4 rounded-xl transition-all dv-focus ${t.bg} ${
                                canOpen ? 'hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <AlertIcon size={14} className={`${t.title} mt-0.5 shrink-0`} />
                                <div className="flex-1 min-w-0">
                                  <strong className={`text-[12px] font-bold block ${t.title}`}>{alert.title}</strong>
                                  <span className={`text-[11px] font-medium leading-5 mt-0.5 block ${t.desc}`}>
                                    {alert.description}
                                  </span>
                                </div>
                                {canOpen && <ChevronRight size={14} className={`${t.title} shrink-0 mt-0.5`} />}
                              </div>
                            </button>
                          )
                        })
                      : (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                          <strong className="flex items-center gap-2 text-[12px] font-bold text-emerald-800">
                            <CheckCircle2 size={14} />Tudo certo
                          </strong>
                          <span className="text-[11px] font-medium text-emerald-700 mt-1 block">
                            Nenhuma turma em risco no escopo atual.
                          </span>
                        </div>
                      )}
                  </div>

                  <PaginationControls
                    label="Alunos em alerta"
                    pagination={alertPagination}
                    limit={alertLimit}
                    loading={alertPageLoading}
                    source={alertPageSource}
                    className="-mx-5 -mb-5 mt-5 rounded-b-2xl"
                    onPageChange={setAlertPage}
                    onLimitChange={(limit) => { setAlertLimit(limit); setAlertPage(1) }}
                  />
                </div>
              </Card>

              {/* Audit panel */}
              {canViewAudit && (
                <Card delay={300}>
                  <CardHeader
                    label="Auditoria do sistema"
                    title="Últimas ações registradas"
                    icon={<Shield size={16} />}
                    accentColor="#64748b"
                  />
                  <div className="p-5 space-y-2">
                    {auditEvents.slice(0, 5).map((event, idx) => (
                      <div
                        key={event.id}
                        className="group flex items-start gap-3.5 p-4 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <strong className="text-[12px] font-bold text-slate-900 block truncate">{event.action}</strong>
                          <span className="text-[11px] text-slate-500 truncate block">{event.actor} · {event.target}</span>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                            <Clock size={10} />
                            {new Date(event.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-400 transition-colors shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </section>

          {/* ── Evaluations table ── */}
          <Card delay={340}>
            <CardHeader
              label="Simulados ativos"
              title="Fila de aplicação e correção"
              icon={<ClipboardList size={16} />}
              accentColor="#f59e0b"
              badge={
                <span className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-[11px] font-semibold text-amber-600">
                  {activeEvaluations.length} ativos
                </span>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Título', 'Disciplina', 'Participantes', 'Corrigidos', 'Progresso', 'Status'].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-5 py-4"><Skel w="w-24" h="h-4" /></td>
                        ))}
                      </tr>
                    ))
                  ) : activeEvaluations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-sm font-medium text-slate-400">
                        Nenhum simulado ativo no momento.
                      </td>
                    </tr>
                  ) : (
                    activeEvaluations.map((ev) => {
                      const pct = ev.participants > 0 ? Math.round((ev.corrected / ev.participants) * 100) : 0
                      const color = progressColor(pct)
                      return (
                        <tr key={ev.id} className="dv-row-hover border-b border-slate-50">
                          <td className="px-5 py-4 text-[13px] font-semibold text-slate-800">{ev.title}</td>
                          <td className="px-5 py-4 text-[12px] font-medium text-slate-500">{getAcademicSubjectLabel(ev.subject)}</td>
                          <td className="px-5 py-4 text-[13px] font-semibold text-slate-700">{ev.participants}</td>
                          <td className="px-5 py-4 text-[13px] font-semibold text-slate-700">{ev.corrected}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                              </div>
                              <span className="text-[11px] font-bold min-w-[30px] text-right" style={{ color }}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">{statusBadge(ev.status)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Alert student modal ── */}
      {selectedAlertStudentId && alertStudents.length > 0 && (
        <AlertStudentsModal
          students={alertStudents}
          selectedStudentId={selectedAlertStudentId}
          onSelectStudent={setSelectedAlertStudentId}
          onClose={() => setSelectedAlertStudentId(null)}
          getClassName={getAlertStudentClassName}
        />
      )}
    </>
  )
}