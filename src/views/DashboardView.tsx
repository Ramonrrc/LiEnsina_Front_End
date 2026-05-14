import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
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
  Layers,
  Star,
  BarChart2,
  PieChart,
  LineChart,
  Filter,
} from 'lucide-react'

import { resolveApiAssetUrl } from '../api'
import { formatClassGrade } from '../class-grade-options'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { DEFAULT_PAGE_SIZE, PaginationControls, paginateLocal } from '../components/ui/pagination-controls'
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

/* ─── Design tokens ─────────────────────────────────────────────────────── */

const SUBJECT_COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#9333ea', '#0284c7']
const PIE_COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#059669']
const CHART_COLORS = { frequencia: '#059669', desempenho: '#4f46e5' }

const METRIC_CONFIGS = [
  {
    tone: 'blue' as const,
    icon: Users,
    gradient: 'from-indigo-600 to-violet-600',
    bg: 'bg-gradient-to-br from-indigo-600 to-violet-600',
    lightBg: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-400',
    ring: 'ring-indigo-200',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-400',
    shadow: 'shadow-indigo-200',
  },
  {
    tone: 'green' as const,
    icon: CalendarCheck,
    gradient: 'from-emerald-600 to-teal-600',
    bg: 'bg-gradient-to-br from-emerald-600 to-teal-600',
    lightBg: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-400',
    ring: 'ring-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-400',
    shadow: 'shadow-emerald-200',
  },
  {
    tone: 'amber' as const,
    icon: ClipboardList,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    lightBg: 'bg-gradient-to-br from-amber-50 to-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-400',
    ring: 'ring-amber-200',
    badge: 'bg-amber-100 text-amber-800 border-amber-400',
    shadow: 'shadow-amber-200',
  },
  {
    tone: 'rose' as const,
    icon: Bell,
    gradient: 'from-rose-600 to-pink-600',
    bg: 'bg-gradient-to-br from-rose-600 to-pink-600',
    lightBg: 'bg-gradient-to-br from-rose-50 to-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-400',
    ring: 'ring-rose-200',
    badge: 'bg-rose-100 text-rose-800 border-rose-400',
    shadow: 'shadow-rose-200',
  },
] as const

const ALERT_TONE = {
  danger: {
    bg: 'bg-gradient-to-r from-rose-50 to-red-50 border-2 border-rose-400',
    title: 'text-rose-800',
    desc: 'text-rose-700',
    icon: AlertCircle,
    pill: 'bg-gradient-to-br from-rose-100 to-red-100 border-2 border-rose-400 text-rose-800',
    dot: 'bg-rose-500',
    headerBg: 'bg-gradient-to-r from-rose-600 to-red-600',
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400',
    title: 'text-amber-800',
    desc: 'text-amber-700',
    icon: AlertTriangle,
    pill: 'bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-400 text-amber-800',
    dot: 'bg-amber-500',
    headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
  },
  info: {
    bg: 'bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-400',
    title: 'text-indigo-800',
    desc: 'text-indigo-700',
    icon: Info,
    pill: 'bg-gradient-to-br from-indigo-100 to-blue-100 border-2 border-indigo-400 text-indigo-800',
    dot: 'bg-indigo-500',
    headerBg: 'bg-gradient-to-r from-indigo-600 to-blue-600',
  },
} as const

/* ─── CSS Animations ─────────────────────────────────────────────────────── */

const dashboardStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');

  @keyframes dv-fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes dv-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes dv-scale-in {
    from { opacity: 0; transform: scale(0.95) translateY(16px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes dv-slide-up {
    from { opacity: 0; transform: translateY(30px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes dv-shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  @keyframes dv-pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.3); }
    50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
  }
  @keyframes dv-bar-grow {
    from { width: 0%; }
    to { width: var(--bar-width); }
  }
  .dv-page {
    animation: dv-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .dv-section {
    animation: dv-slide-up 0.6s cubic-bezier(0.22,1,0.36,1) both;
  }
  .dv-card {
    animation: dv-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both;
  }
  .dv-card:nth-child(1) { animation-delay: 0.05s; }
  .dv-card:nth-child(2) { animation-delay: 0.1s; }
  .dv-card:nth-child(3) { animation-delay: 0.15s; }
  .dv-card:nth-child(4) { animation-delay: 0.2s; }
  .dv-shimmer {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
    background-size: 600px 100%;
    animation: dv-shimmer 1.8s ease-in-out infinite;
  }
  .dv-backdrop {
    background: rgba(15,23,42,0.4);
    backdrop-filter: blur(12px);
    animation: dv-fade-in 0.2s ease both;
  }
  .dv-modal {
    animation: dv-scale-in 0.3s cubic-bezier(0.22,1,0.36,1) both;
  }
  .dv-metric-card {
    transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .dv-metric-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.1);
  }
  .dv-panel {
    transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
  }
  .dv-panel:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }
  .dv-tr:hover td { background: #f8fafc; }
`

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function statusPill(status: string) {
  const map: Record<string, string> = {
    concluido: 'border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800',
    ativo: 'border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800',
    corrigindo: 'border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800',
    em_aplicacao: 'border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800',
    planejado: 'border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-800',
    pendente: 'border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-800',
  }
  const cls = map[status] ?? 'border-2 border-slate-400 bg-slate-50 text-slate-700'
  return `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase ${cls}`
}

function statusProgress(corrected: number, participants: number) {
  const pct = participants > 0 ? Math.round((corrected / participants) * 100) : 0
  const color = pct === 100 ? '#059669' : pct > 50 ? '#4f46e5' : pct > 0 ? '#d97706' : '#e2e8f0'
  return { pct, color }
}

/* ─── Skeleton ──────────────────────────────────────────────────────────── */

function Skel({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`dv-shimmer rounded-lg ${className}`}
      style={style}
    />
  )
}

function SkeletonMetricCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-slate-400 bg-white p-6 shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <Skel className="h-3 w-24 rounded-lg" />
          <Skel className="h-9 w-24 rounded-xl" />
        </div>
        <Skel className="h-12 w-12 rounded-2xl" />
      </div>
      <div className="h-px bg-slate-200" />
      <div className="flex items-center justify-between">
        <Skel className="h-3 w-36 rounded-lg" />
        <Skel className="h-6 w-16 rounded-full" />
      </div>
    </div>
  )
}

function SkeletonPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border-2 border-slate-400 bg-white shadow-md overflow-hidden">
      <div className="h-1.5 w-full bg-gradient-to-r from-slate-300 to-slate-200" />
      <div className="flex items-center gap-3 border-b-2 border-slate-200 px-5 py-4">
        <Skel className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skel className="h-2 w-20" />
          <Skel className="h-4 w-40" />
        </div>
        <Skel className="h-7 w-20 rounded-lg" />
      </div>
      <div className="p-5 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded-xl border-2 border-slate-200 p-3">
            <div className="flex justify-between mb-3">
              <Skel className="h-3 w-28" />
              <Skel className="h-5 w-20" />
            </div>
            <Skel className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Section header ─────────────────────────────────────────────────────── */

function SectionLabel({ text, icon: Icon }: { text: string; icon?: React.ElementType }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {Icon && (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-200">
          <Icon size={12} className="text-white" />
        </div>
      )}
      <span className="text-[10px] font-black uppercase tracking-[.22em] text-slate-500">{text}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent" />
    </div>
  )
}

/* ─── Panel ─────────────────────────────────────────────────────────────── */

function Panel({
  label,
  title,
  icon,
  badge,
  children,
  className = '',
  delay = 0,
  accent = 'indigo',
}: {
  label: string
  title: string
  icon?: ReactNode
  badge?: ReactNode
  children: ReactNode
  className?: string
  delay?: number
  accent?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet'
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const accentMap = {
    indigo: 'bg-gradient-to-r from-indigo-600 to-violet-600',
    emerald: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500',
    rose: 'bg-gradient-to-r from-rose-600 to-pink-600',
    violet: 'bg-gradient-to-r from-violet-600 to-purple-600',
  }

  const iconBgMap = {
    indigo: 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-200',
    emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-200',
    rose: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-200',
    violet: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-200',
  }

  return (
    <section
      className={`dv-panel overflow-hidden rounded-2xl border-2 border-slate-400 bg-white shadow-lg transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${className}`}
    >
      <div className={`h-1.5 w-full ${accentMap[accent]}`} />
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${iconBgMap[accent]}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-slate-400">{label}</p>
          <h2 className="truncate font-['Sora',system-ui,sans-serif] text-sm font-bold leading-tight text-slate-900">
            {title}
          </h2>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ─── Animated horizontal bar row ──────────────────────────────────────── */

function HBarRow({ label, freq, perf }: { label: string; freq: number; perf: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [go, setGo] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setGo(true)
          io.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  const freqOk = freq >= 75
  const perfOk = perf >= 60

  return (
    <div
      ref={ref}
      className="group rounded-xl border-2 border-slate-400 bg-white p-3.5 transition-all hover:border-indigo-400 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12px] font-bold text-slate-800">
          <GraduationCap size={12} className="text-indigo-500" />
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-[10px] font-bold ${
              freqOk ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-rose-400 bg-rose-50 text-rose-700'
            }`}
          >
            <Activity size={9} />
            {freq}%
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-[10px] font-bold ${
              perfOk ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-amber-400 bg-amber-50 text-amber-700'
            }`}
          >
            <Award size={9} />
            {perf}%
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-20 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Frequência
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
            <div
              className="h-full rounded-full transition-[width] duration-[900ms] ease-out"
              style={{ background: 'linear-gradient(90deg, #059669, #10b981)', width: go ? `${freq}%` : '0%' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-20 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            Desempenho
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
            <div
              className="h-full rounded-full transition-[width] duration-[900ms] ease-out"
              style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)', width: go ? `${perf}%` : '0%', transitionDelay: '120ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Animated subject column bar ───────────────────────────────────────── */

function SubjectBar({ name, pct, color }: { name: string; pct: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [go, setGo] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setGo(true)
          io.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="flex flex-1 flex-col items-center gap-2" style={{ minWidth: 56 }}>
      <span className="text-[12px] font-black" style={{ color }}>
        {pct}%
      </span>
      <div
        className="flex w-full flex-col justify-end overflow-hidden rounded-t-xl border-2 border-slate-400 bg-gradient-to-b from-slate-50 to-slate-100"
        style={{ height: 120 }}
      >
        <div
          className="w-full rounded-t-lg transition-[height] duration-[900ms] ease-out shadow-inner"
          style={{ background: `linear-gradient(180deg, ${color}, ${color}dd)`, height: go ? `${pct}%` : '0%' }}
        />
      </div>
      <span className="max-w-[68px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-[10px] font-bold text-slate-600">
        {name}
      </span>
    </div>
  )
}

/* ─── Donut chart ───────────────────────────────────────────────────────── */

function DonutChart({ data, total }: { data: Array<{ level: string; alunos: number }>; total: number }) {
  const R = 68
  const C = 2 * Math.PI * R
  const [go, setGo] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGo(true), 350)
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
      <div className="relative" style={{ width: 180, height: 180 }}>
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          style={{ transform: 'rotate(-90deg)' }}
          role="img"
          aria-label={`Distribuição de proficiência: ${segs.map((s) => `${s.level} ${Math.round(s.pct * 100)}%`).join(', ')}`}
        >
          <circle cx="90" cy="90" r={R} fill="none" stroke="#f1f5f9" strokeWidth="22" />
          {segs.map((s) => (
            <circle
              key={s.level}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="22"
              strokeLinecap="round"
              style={{
                strokeDasharray: go ? `${s.pct * C} ${C}` : `0 ${C}`,
                strokeDashoffset: go ? -s.offset : 0,
                transition:
                  'stroke-dasharray .9s cubic-bezier(.23,1,.32,1), stroke-dashoffset .9s cubic-bezier(.23,1,.32,1)',
              }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-['Sora',system-ui,sans-serif] text-[28px] font-black text-slate-900">
            {total.toLocaleString('pt-BR')}
          </span>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">alunos</span>
        </div>
      </div>
      <div className="w-full space-y-2">
        {segs.map((s, i) => (
          <div
            key={s.level}
            className="flex items-center justify-between rounded-xl border-2 border-slate-400 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5 transition-all hover:border-indigo-400 hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 shrink-0 rounded-md shadow-sm"
                style={{ background: s.color }}
              />
              <span className="text-[12px] font-bold text-slate-700">{s.level}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-black text-slate-900">{s.alunos}</span>
              <span className="rounded-full border-2 border-slate-400 bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                {Math.round(s.pct * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Alert student types & helpers ─────────────────────────────────────── */

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
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function AlertStudentPhoto({
  student,
  size = 'md',
  showStatus = false,
  className = '',
}: {
  student: AlertStudent
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

function StudentProgressCard({
  label,
  icon,
  value,
  display,
  target,
  color,
  isOk,
}: {
  label: string
  icon: ReactNode
  value: number
  display: string
  target: string
  color: string
  isOk: boolean
}) {
  return (
    <div
      className={`rounded-xl border-2 bg-white p-4 shadow-md transition-all ${
        isOk ? 'border-emerald-400' : 'border-rose-400'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
          {icon}
          {label}
        </span>
        <span className="text-lg font-black text-slate-800">{display}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200">
        <div
          className="h-full rounded-full transition-all duration-1000 shadow-inner"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400">{target}</p>
        {isOk ? (
          <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600">
            <CheckCircle2 size={12} />
            Meta atingida
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] font-black text-rose-600">
            <AlertCircle size={12} />
            Abaixo da meta
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Alert students modal ───────────────────────────────────────────────── */

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
  getClassName: (student: AlertStudent) => string
}) {
  const [animateIn, setAnimateIn] = useState(false)
  const selected = students.find((s) => s.id === selectedStudentId) ?? students[0]

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimateIn(true), 20)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (typeof document === 'undefined') return null

  const lowAttendance = selected ? selected.attendanceRate < 75 : false
  const lowScore = selected ? selected.averageScore < 6 : false
  const critical = lowAttendance && lowScore
  const selectedBannerUrl = resolveApiAssetUrl(selected?.bannerUrl)

  function scoreColor(v: number) {
    if (v < 5) return 'text-rose-700'
    if (v < 6) return 'text-amber-700'
    return 'text-emerald-700'
  }
  function attendanceColor(v: number) {
    if (v < 65) return 'text-rose-700'
    if (v < 75) return 'text-amber-700'
    return 'text-emerald-700'
  }

  const criticalCount = students.filter((s) => s.attendanceRate < 75 && s.averageScore < 6).length
  const attentionCount = students.length - criticalCount

  return createPortal(
    <div
      role="presentation"
      onMouseDown={onClose}
      className="dv-backdrop fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{
        background: animateIn ? 'rgba(15,23,42,0.4)' : 'rgba(15,23,42,0)',
        backdropFilter: animateIn ? 'blur(12px)' : 'blur(0px)',
        WebkitBackdropFilter: animateIn ? 'blur(12px)' : 'blur(0px)',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease, -webkit-backdrop-filter 0.3s ease',
        padding: '0.5rem',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          opacity: animateIn ? 1 : 0,
          transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'opacity 0.4s cubic-bezier(.16,1,.3,1), transform 0.4s cubic-bezier(.16,1,.3,1)',
        }}
        className="dv-modal flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-2 border-slate-400 bg-white shadow-2xl"
      >
        {/* Modal header - LIGHT THEME */}
        <div className="border-b-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-200">
                <Users size={20} className="text-white" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white border-2 border-white shadow-md">
                  {students.length}
                </span>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.22em] text-rose-600">
                  Painel de acompanhamento
                </p>
                <h2 className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">
                  Alunos em alerta
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 rounded-xl border-2 border-slate-400 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5 sm:flex">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-rose-100 border-2 border-rose-400 px-2 text-[10px] font-black text-rose-700">
                    {criticalCount}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">críticos</span>
                </div>
                <div className="h-4 w-px bg-slate-300" />
                <div className="flex items-center gap-2">
                  <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-amber-100 border-2 border-amber-400 px-2 text-[10px] font-black text-amber-700">
                    {attentionCount}
                  </span>
                  <span className="text-[11px] font-bold text-slate-600">atenção</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar modal"
                className="grid h-11 w-11 place-items-center rounded-xl border-2 border-slate-400 bg-white text-slate-400 transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Student list - LIGHT THEME */}
          <aside className="min-h-0 max-h-[42dvh] overflow-y-auto border-b-2 border-slate-200 bg-gradient-to-b from-slate-50 to-white lg:max-h-none lg:border-b-0 lg:border-r-2">
            <div className="sticky top-0 z-10 border-b-2 border-slate-200 bg-white px-4 py-3">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-500">
                <Users size={12} className="text-indigo-500" />
                {students.length} aluno{students.length !== 1 ? 's' : ''} identificado{students.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="space-y-2 p-3">
              {students.map((student) => {
                const active = student.id === selected?.id
                const isCrit = student.attendanceRate < 75 && student.averageScore < 6
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => onSelectStudent(student.id)}
                    className={`group w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                      active
                        ? 'border-rose-400 bg-white shadow-lg shadow-rose-100'
                        : 'border-slate-400 bg-white hover:border-indigo-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertStudentPhoto student={student} showStatus />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-[13px] font-black text-slate-900">
                          {student.name}
                        </strong>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-500">
                          <GraduationCap size={10} className="text-indigo-500" />
                          {getClassName(student)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[10px] font-bold ${scoreColor(student.averageScore)} border-slate-400 bg-slate-50`}
                          >
                            <Award size={9} />
                            {student.averageScore.toFixed(1)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[10px] font-bold ${attendanceColor(student.attendanceRate)} border-slate-400 bg-slate-50`}
                          >
                            <Activity size={9} />
                            {student.attendanceRate}%
                          </span>
                          {isCrit && (
                            <span className="inline-flex items-center gap-1 rounded-full border-2 border-rose-400 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                              <AlertTriangle size={9} />
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

          {/* Student detail - LIGHT THEME */}
          {selected ? (
            <section className="min-h-0 overflow-y-auto bg-gradient-to-b from-white to-slate-50">
              {/* Banner + header */}
              <div className="border-b-2 border-slate-200">
                {selectedBannerUrl && (
                  <div className="relative h-28 overflow-hidden bg-slate-100 sm:h-36">
                    <img
                      src={selectedBannerUrl}
                      alt={`Banner de ${selected.name}`}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-end gap-4">
                      <AlertStudentPhoto
                        student={selected}
                        size={selectedBannerUrl ? 'xl' : 'lg'}
                        showStatus
                        className={selectedBannerUrl ? '-mt-10' : ''}
                      />
                      <div className="mb-1">
                        <p className="text-[9px] font-black uppercase tracking-[.2em] text-rose-600">
                          Diagnóstico pedagógico
                        </p>
                        <h3 className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">
                          {selected.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-indigo-600">
                          <GraduationCap size={14} />
                          {getClassName(selected)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`mb-1 inline-flex items-center gap-1.5 rounded-xl border-2 px-4 py-2.5 text-xs font-black shadow-md ${
                        critical
                          ? 'border-rose-400 bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 shadow-rose-100'
                          : 'border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 shadow-amber-100'
                      }`}
                    >
                      {critical ? <AlertTriangle size={14} /> : <AlertCircle size={14} />}
                      {critical ? 'Crítico' : 'Atenção'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <StudentProgressCard
                      label="Frequência"
                      icon={<Activity size={14} className="text-emerald-600" />}
                      value={selected.attendanceRate}
                      display={`${selected.attendanceRate}%`}
                      target="Meta mínima: 75%"
                      color={selected.attendanceRate < 65 ? '#e11d48' : selected.attendanceRate < 75 ? '#d97706' : '#059669'}
                      isOk={selected.attendanceRate >= 75}
                    />
                    <StudentProgressCard
                      label="Desempenho médio"
                      icon={<Award size={14} className="text-indigo-600" />}
                      value={selected.averageScore * 10}
                      display={`${selected.averageScore.toFixed(1)} / 10`}
                      target="Referência: nota 6,0"
                      color={selected.averageScore < 5 ? '#e11d48' : selected.averageScore < 6 ? '#d97706' : '#059669'}
                      isOk={selected.averageScore >= 6}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-5">
                {/* Alert reasons */}
                <div className="overflow-hidden rounded-xl border-2 border-rose-400 bg-white shadow-md">
                  <div className="flex items-center gap-3 border-b-2 border-rose-200 bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-rose-500 to-red-500 shadow-md shadow-rose-200">
                      <AlertTriangle size={14} className="text-white" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-rose-700">
                      Por que está em alerta
                    </p>
                  </div>
                  <div className="space-y-2 p-4">
                    {lowAttendance && (
                      <div className="flex items-start gap-3 rounded-xl border-2 border-rose-400 bg-gradient-to-r from-rose-50 to-red-50 p-3.5">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 shadow-sm" />
                        <p className="text-sm font-semibold text-rose-800">
                          Frequência em {selected.attendanceRate}%, abaixo do limite de 75%.
                        </p>
                      </div>
                    )}
                    {lowScore && (
                      <div className="flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-3.5">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 shadow-sm" />
                        <p className="text-sm font-semibold text-amber-800">
                          Média {selected.averageScore.toFixed(1)}, abaixo da referência de 6,0.
                        </p>
                      </div>
                    )}
                    {critical && (
                      <div className="flex items-start gap-3 rounded-xl border-2 border-rose-500 bg-gradient-to-r from-rose-100 to-red-100 p-3.5">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-600 shadow-sm" />
                        <p className="text-sm font-bold text-rose-900">
                          Alerta combinado: baixa presença e baixo desempenho simultâneos.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next actions */}
                <div className="overflow-hidden rounded-xl border-2 border-indigo-400 bg-white shadow-md">
                  <div className="flex items-center gap-3 border-b-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-200">
                      <Lightbulb size={14} className="text-white" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-indigo-700">
                      Próximas ações recomendadas
                    </p>
                  </div>
                  <div className="space-y-2 p-4">
                    {[
                      lowAttendance ? 'Iniciar busca ativa e registrar devolutiva da família.' : null,
                      lowScore ? 'Planejar recuperação focalizada com verificação de aprendizagem.' : null,
                      'Cruzar o plano de aula com os dados de desempenho.',
                    ]
                      .filter((a): a is string => Boolean(a))
                      .map((action, i) => (
                        <div
                          key={action}
                          className="flex items-start gap-3 rounded-xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3.5"
                        >
                          <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-indigo-400 bg-white shadow-sm">
                            <span className="text-[10px] font-black text-indigo-600">{i + 1}</span>
                          </div>
                          <p className="text-sm font-semibold text-indigo-900">{action}</p>
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

/* ─── Main component ─────────────────────────────────────────────────────── */

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
  const directorSchoolValue = directorLinkedSchool?.id ?? currentUser?.schoolId ?? 'linked-school'

  const [schoolFilter, setSchoolFilter] = useState(isSchoolDashboard ? directorSchoolValue : 'all')
  const [classFilter, setClassFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('month')
  const [alertPage, setAlertPage] = useState(dashboard.alertsPagination?.page ?? 1)
  const [alertLimit, setAlertLimit] = useState(dashboard.alertsPagination?.limit ?? DEFAULT_PAGE_SIZE)
  const [alertPageData, setAlertPageData] = useState<DashboardAlertsPagePayload | null>(null)
  const [alertPageLoading, setAlertPageLoading] = useState(false)
  const [alertPageSource, setAlertPageSource] = useState<'backend' | 'local'>(
    onLoadAlertsPage ? 'backend' : 'local',
  )
  const [selectedAlertStudentId, setSelectedAlertStudentId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!isSchoolDashboard) return
    setSchoolFilter(directorSchoolValue)
  }, [directorSchoolValue, isSchoolDashboard])

  const activeEvaluations = evaluations.filter((e) => e.status !== 'concluido')
  const canViewAudit = profile === 'ADMIN'
  const dashboardTitle =
    profile === 'DIRETOR'
      ? 'Dashboard da escola'
      : profile === 'COORDENADOR'
        ? 'Dashboard pedagógico'
        : 'Dashboard geral'

  const subjectOptions = useMemo<CompactSelectOption[]>(
    () => [
      { value: 'all', label: 'Todas as disciplinas' },
      ...Array.from(
        new Set([...dashboard.subjectRadar.map((i) => i.subject), ...evaluations.map((e) => e.subject)]),
      )
        .filter(Boolean)
        .map((s) => ({ value: s, label: s })),
    ],
    [dashboard.subjectRadar, evaluations],
  )

  const schoolOptions = useMemo<CompactSelectOption[]>(
    () =>
      isSchoolDashboard
        ? [
            {
              value: directorSchoolValue,
              label: directorLinkedSchool?.name ?? 'Escola vinculada',
              description: directorLinkedSchool?.city ?? 'Vinculada ao diretor',
            },
          ]
        : [
            { value: 'all', label: 'Todas as escolas' },
            ...schools.map((s) => ({ value: s.id, label: s.name, description: s.city })),
          ],
    [directorLinkedSchool, directorSchoolValue, isSchoolDashboard, schools],
  )

  const classOptions = useMemo<CompactSelectOption[]>(
    () => [
      { value: 'all', label: 'Todas as turmas' },
      ...classes
        .filter((c) => schoolFilter === 'all' || c.schoolId === schoolFilter)
        .map((c) => ({
          value: c.id,
          label: c.name,
          description: `${formatClassGrade(c.grade)} - ${c.shift}`,
        })),
    ],
    [classes, schoolFilter],
  )

  const proficiencyTotal = dashboard.proficiencyDistribution.reduce((s, e) => s + e.alunos, 0)
  const alertCounts = useMemo(
    () =>
      dashboard.alertsSummary ??
      dashboard.alerts.reduce<Record<string, number>>((acc, a) => {
        acc[a.tone] = (acc[a.tone] ?? 0) + 1
        return acc
      }, {}),
    [dashboard.alerts, dashboard.alertsSummary],
  )
  const topSubjects = useMemo(
    () => [...dashboard.subjectRadar].sort((a, b) => b.acertos - a.acertos),
    [dashboard.subjectRadar],
  )

  const localAlertsPage = useMemo(
    () => paginateLocal(dashboard.alerts, alertPage, alertLimit),
    [alertLimit, alertPage, dashboard.alerts],
  )
  const dashboardAlertsPage = useMemo<DashboardAlertsPagePayload | null>(
    () =>
      dashboard.alertsPagination
        ? { alerts: dashboard.alerts, pagination: dashboard.alertsPagination }
        : null,
    [dashboard.alerts, dashboard.alertsPagination],
  )
  const activeAlertsPage =
    alertPageData ??
    (dashboardAlertsPage?.pagination.page === alertPage &&
    dashboardAlertsPage.pagination.limit === alertLimit
      ? dashboardAlertsPage
      : null)

  const displayedAlerts = activeAlertsPage?.alerts ?? localAlertsPage.items
  const alertPagination = activeAlertsPage?.pagination ?? localAlertsPage.pagination
  const alertStudents = useMemo(
    () =>
      displayedAlerts
        .map(dashboardAlertToStudent)
        .filter((s): s is AlertStudent => Boolean(s)),
    [displayedAlerts],
  )
  const classNameById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes],
  )

  function getAlertStudentClassName(student: AlertStudent) {
    return student.className ?? classNameById.get(student.classId) ?? 'Turma não localizada'
  }

  useEffect(() => {
    if (!onLoadAlertsPage) {
      setAlertPageData(null)
      setAlertPageSource('local')
      return
    }
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
      .catch(() => {
        if (cancelled) return
        setAlertPageData(null)
        setAlertPageSource('local')
      })
      .finally(() => {
        if (!cancelled) setAlertPageLoading(false)
      })
    return () => { cancelled = true }
  }, [alertLimit, alertPage, onLoadAlertsPage])

  function exportDashboard(format: 'pdf' | 'excel') {
    if (format === 'pdf') {
      window.print()
      return
    }
    const rows = dashboard.metrics.map((m) => [m.label, m.value, m.detail].join(';')).join('\n')
    const blob = new Blob([`Indicador;Valor;Detalhe\n${rows}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dashboard.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filterSelectCls =
    'min-h-11 rounded-xl border-2 border-slate-400 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:border-indigo-500 hover:bg-indigo-50/30 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
  const filterSelectDisabledCls =
    'min-h-11 cursor-not-allowed rounded-xl border-2 border-slate-400 bg-slate-50 px-4 text-sm font-semibold text-slate-400'

  return (
    <>
      <style>{dashboardStyles}</style>

      <div
        className="dv-page grid min-h-screen gap-6 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-[clamp(12px,2.5vw,40px)] py-6 pb-16 text-slate-900"
      >
        {/* ── Title bar ── */}
        <div
          className={`dv-section transition-all duration-500 ${mounted ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}
        >
          <PageTitleBar
            label="Central pedagógica"
            title={dashboardTitle}
            icon={<BarChart3 />}
            actions={
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2.5 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-emerald-700 shadow-md shadow-emerald-100">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 shadow-sm shadow-emerald-400" />
                  Ao vivo
                </div>
                <div className="hidden sm:flex items-center gap-2 rounded-xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-2.5 text-[11px] font-black text-indigo-700">
                  <Sparkles size={12} />
                  <span>{dashboard.metrics.length} indicadores</span>
                </div>
              </div>
            }
          />
        </div>

        {/* ── Filters ── */}
        <div
          className={`dv-section grid gap-3 rounded-2xl border-2 border-slate-400 bg-white p-5 shadow-lg transition-all duration-500 lg:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(130px,.8fr)_auto] ${
            mounted ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
          style={{ transitionDelay: '60ms' }}
        >
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">
              <School size={10} className="text-indigo-500" />
              Escola
            </span>
            <CompactSelect
              value={schoolFilter}
              options={schoolOptions}
              onChange={setSchoolFilter}
              dropdownWidth="trigger"
              disabled={isSchoolDashboard}
              className={isSchoolDashboard ? filterSelectDisabledCls : filterSelectCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">
              <GraduationCap size={10} className="text-violet-500" />
              Turma
            </span>
            <CompactSelect
              value={classFilter}
              options={classOptions}
              onChange={setClassFilter}
              dropdownWidth="trigger"
              className={filterSelectCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">
              <BookOpen size={10} className="text-emerald-500" />
              Disciplina
            </span>
            <CompactSelect
              value={subjectFilter}
              options={subjectOptions}
              onChange={setSubjectFilter}
              dropdownWidth="trigger"
              className={filterSelectCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">
              <Clock size={10} className="text-amber-500" />
              Período
            </span>
            <CompactSelect
              value={periodFilter}
              options={[
                { value: 'week', label: 'Esta semana' },
                { value: 'month', label: 'Este mês' },
                { value: 'year', label: 'Este ano' },
              ]}
              onChange={setPeriodFilter}
              dropdownWidth="trigger"
              className={filterSelectCls}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">
              <FileDown size={10} className="text-rose-500" />
              Exportar
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportDashboard('pdf')}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 text-xs font-black uppercase tracking-widest text-indigo-700 transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-lg"
              >
                <FileDown size={14} />
                PDF
              </button>
              <button
                type="button"
                onClick={() => exportDashboard('excel')}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 px-4 text-xs font-black uppercase tracking-widest text-emerald-700 transition-all hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-lg"
              >
                <Table2 size={14} />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* ── Metric cards ── */}
        <section>
          <SectionLabel text="Indicadores principais" icon={BarChart2} />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {loading
              ? [...Array(4)].map((_, i) => <SkeletonMetricCard key={i} />)
              : dashboard.metrics.map((metric, idx) => {
                  const cfg = METRIC_CONFIGS[idx % METRIC_CONFIGS.length]
                  const Icon = cfg.icon
                  const isPositive = metric.trend !== 'down'
                  return (
                    <article
                      key={metric.id}
                      className={`dv-card dv-metric-card group relative flex flex-col gap-0 overflow-hidden rounded-2xl border-2 bg-white shadow-lg ${cfg.border} ${cfg.shadow} ${
                        mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}
                      style={{ transitionDelay: `${120 + idx * 60}ms` }}
                    >
                      {/* Top color accent */}
                      <div className={`h-1.5 w-full ${cfg.bg}`} />

                      <div className="flex flex-col gap-4 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.2em] text-slate-500">
                              <Sparkles size={9} className={cfg.text} />
                              {metric.label}
                            </span>
                          </div>
                          <span
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-lg ${cfg.lightBg} ${cfg.text}`}
                          >
                            <Icon className="h-6 w-6" />
                          </span>
                        </div>

                        <strong className="font-['Sora',system-ui,sans-serif] text-[38px] font-black leading-none tracking-tight text-slate-950">
                          {metric.value}
                        </strong>

                        <div className={`h-px w-full bg-slate-200`} />

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-500">{metric.detail}</span>
                          {metric.trend && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-[10px] font-black ${
                                isPositive
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-400 bg-rose-50 text-rose-700'
                              }`}
                            >
                              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
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

        {/* ── Attendance + Donut ── */}
        <section>
          <SectionLabel text="Frequência e proficiência" icon={PieChart} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.4fr)]">
            {loading ? (
              <SkeletonPanel rows={6} />
            ) : (
              <Panel
                label="Turmas"
                title="Frequência e desempenho por turma"
                icon={<School className="h-5 w-5" />}
                badge={
                  <span className="rounded-xl border-2 border-slate-400 bg-gradient-to-r from-slate-50 to-white px-4 py-2 text-[11px] font-bold text-slate-600 shadow-sm">
                    {dashboard.attendanceByClass.length} turmas
                  </span>
                }
                delay={220}
                accent="emerald"
              >
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm" />
                    <span className="text-[11px] font-bold text-slate-600">Frequência</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm" />
                    <span className="text-[11px] font-bold text-slate-600">Desempenho</span>
                  </div>
                  <div className="ml-auto flex items-center gap-4 text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Target size={10} className="text-emerald-500" />
                      Meta freq. 75%
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Target size={10} className="text-indigo-500" />
                      Meta desemp. 60%
                    </span>
                  </div>
                </div>
                <div
                  className="flex flex-col gap-2 overflow-y-auto"
                  style={{ maxHeight: 480 }}
                >
                  {dashboard.attendanceByClass.map((item) => {
                    const perf = Math.max(0, Math.min(100, item.media <= 10 ? item.media * 10 : item.media))
                    return <HBarRow key={item.className} label={item.className} freq={item.frequencia} perf={perf} />
                  })}
                </div>
              </Panel>
            )}

            {loading ? (
              <SkeletonPanel rows={4} />
            ) : (
              <Panel
                label="TRI / Proficiência"
                title="Distribuição dos alunos"
                icon={<Target className="h-5 w-5" />}
                delay={300}
                accent="violet"
              >
                <DonutChart data={dashboard.proficiencyDistribution} total={proficiencyTotal} />
              </Panel>
            )}
          </div>
        </section>

        {/* ── Subject bars ── */}
        {loading ? (
          <SkeletonPanel rows={3} />
        ) : (
          <Panel
            label="Disciplinas"
            title="Taxa de acerto por disciplina (%)"
            icon={<BookOpen className="h-5 w-5" />}
            badge={
              <span className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-2 text-[11px] font-bold text-emerald-700 shadow-sm">
                <Zap size={12} />
                Atualizado hoje
              </span>
            }
            delay={360}
            accent="indigo"
          >
            <div className="flex gap-5">
              <div
                className="flex flex-1 items-end gap-3 overflow-x-auto rounded-xl border-2 border-slate-400 bg-gradient-to-b from-slate-50 to-slate-100 p-5"
                style={{ height: 220 }}
              >
                {dashboard.subjectRadar.map((s, i) => (
                  <SubjectBar key={s.subject} name={s.subject} pct={s.acertos} color={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
                ))}
              </div>

              <div className="flex w-52 shrink-0 flex-col gap-2">
                <p className="flex items-center gap-2 mb-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-500">
                  <Star size={10} className="text-amber-500" />
                  Ranking de desempenho
                </p>
                {topSubjects.slice(0, 3).map((s, i) => (
                  <div
                    key={s.subject}
                    className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 transition-all hover:shadow-md ${
                      i === 0
                        ? 'border-indigo-400 bg-gradient-to-r from-indigo-50 to-violet-50'
                        : i === 1
                          ? 'border-violet-400 bg-gradient-to-r from-violet-50 to-purple-50'
                          : 'border-slate-400 bg-gradient-to-r from-slate-50 to-white'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-lg text-sm font-black ${
                        i === 0 ? 'bg-indigo-600 text-white' : i === 1 ? 'bg-violet-500 text-white' : 'bg-slate-300 text-slate-600'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-[11px] font-bold text-slate-800">{s.subject}</span>
                    <span
                      className={`text-[12px] font-black ${
                        i === 0 ? 'text-indigo-600' : i === 1 ? 'text-violet-500' : 'text-slate-600'
                      }`}
                    >
                      {s.acertos}%
                    </span>
                  </div>
                ))}
                {topSubjects.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border-2 border-rose-400 bg-gradient-to-r from-rose-50 to-red-50 px-4 py-3">
                    <ArrowDown className="h-4 w-4 shrink-0 text-rose-500" />
                    <span className="flex-1 truncate text-[11px] font-bold text-rose-800">
                      {topSubjects[topSubjects.length - 1]?.subject}
                    </span>
                    <span className="text-[12px] font-black text-rose-600">
                      {topSubjects[topSubjects.length - 1]?.acertos}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        )}

        {/* ── Alerts + Audit ── */}
        <section>
          <SectionLabel text="Alertas e auditoria" icon={Bell} />
          <div className={`grid gap-5 ${canViewAudit ? 'xl:grid-cols-2' : ''}`}>
            {/* Alert panel */}
            <Panel
              label="Alertas inteligentes"
              title="Risco pedagógico"
              icon={<Bell className="h-5 w-5" />}
              badge={
                alertPagination.total > 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-xl border-2 border-rose-400 bg-gradient-to-r from-rose-50 to-red-50 px-4 py-2 text-[11px] font-black text-rose-700 shadow-sm">
                    <AlertTriangle className="h-4 w-4" />
                    {alertPagination.total} alertas
                  </span>
                ) : null
              }
              delay={420}
              accent="rose"
            >
              {/* Alert summary pills */}
              <div className="mb-5 grid grid-cols-3 gap-3">
                {(['danger', 'warning', 'info'] as const).map((tone) => {
                  const t = ALERT_TONE[tone]
                  const count = alertCounts[tone] ?? 0
                  const AlertIcon = t.icon
                  return (
                    <div
                      key={tone}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 transition-all hover:shadow-md ${t.pill}`}
                    >
                      <AlertIcon size={18} />
                      <div className="text-2xl font-black leading-none">{count}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest opacity-70">
                        {tone === 'danger' ? 'Crítico' : tone === 'warning' ? 'Atenção' : 'Info'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Alert list */}
              <div className="flex flex-col gap-2">
                {alertPageLoading
                  ? Array.from({ length: Math.min(alertLimit, 4) }).map((_, i) => (
                      <div key={i} className="rounded-xl border-2 border-slate-400 bg-slate-50 p-4">
                        <Skel className="h-3 w-44" />
                        <Skel className="mt-2 h-3 w-full" />
                      </div>
                    ))
                  : displayedAlerts.length > 0
                    ? displayedAlerts.map((alert) => {
                        const t = ALERT_TONE[alert.tone as keyof typeof ALERT_TONE] ?? ALERT_TONE.info
                        const AlertIcon = t.icon
                        const alertStudent = dashboardAlertToStudent(alert)
                        const canOpen = isSchoolDashboard && Boolean(alertStudent)
                        return (
                          <button
                            key={alert.id}
                            type="button"
                            disabled={!canOpen}
                            onClick={() => {
                              if (!alertStudent) return
                              setSelectedAlertStudentId(alertStudent.id)
                            }}
                            className={`w-full rounded-xl p-4 text-left transition-all ${t.bg} ${
                              canOpen
                                ? 'hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-rose-100'
                                : 'disabled:cursor-default'
                            }`}
                          >
                            <strong className={`flex items-center gap-2 text-[12px] font-black ${t.title}`}>
                              <AlertIcon className="h-4 w-4 shrink-0" />
                              {alert.title}
                            </strong>
                            <span className={`mt-1.5 block text-[11px] leading-5 font-medium ${t.desc}`}>
                              {alert.description}
                            </span>
                            {canOpen ? (
                              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-rose-700">
                                Ver diagnóstico <ChevronRight className="h-3 w-3" />
                              </span>
                            ) : null}
                          </button>
                        )
                      })
                    : (
                      <div className="rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 p-5 shadow-md">
                        <strong className="flex items-center gap-2 text-[12px] font-black text-emerald-800">
                          <CheckCircle2 size={16} />
                          Tudo certo por aqui
                        </strong>
                        <span className="mt-1 block text-[11px] font-medium text-emerald-700">
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
                onLimitChange={(limit) => {
                  setAlertLimit(limit)
                  setAlertPage(1)
                }}
              />
            </Panel>

            {/* Audit panel */}
            {canViewAudit && (
              <Panel
                label="Auditoria do sistema"
                title="Últimas ações registradas"
                icon={<Shield className="h-5 w-5" />}
                delay={480}
                accent="indigo"
              >
                <div className="flex flex-col gap-2">
                  {auditEvents.slice(0, 5).map((event, idx) => (
                    <div
                      key={event.id}
                      className="group flex items-start gap-3 rounded-xl border-2 border-slate-400 bg-gradient-to-r from-slate-50 to-white p-4 transition-all hover:border-indigo-400 hover:shadow-md"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-indigo-400 bg-gradient-to-br from-indigo-100 to-violet-100 text-[11px] font-black text-indigo-700">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-[12px] font-black text-slate-900">
                          {event.action}
                        </strong>
                        <span className="block truncate text-[11px] font-semibold text-slate-500">
                          {event.actor} · {event.target}
                        </span>
                        <small className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <Clock size={10} />
                          {new Date(event.createdAt).toLocaleString('pt-BR')}
                        </small>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </section>

        {/* ── Evaluations table ── */}
        <Panel
          label="Simulados ativos"
          title="Fila de aplicação e correção"
          icon={<ClipboardList className="h-5 w-5" />}
          badge={
            <span className="rounded-xl border-2 border-slate-400 bg-gradient-to-r from-slate-50 to-white px-4 py-2 text-[11px] font-bold text-slate-600 shadow-sm">
              {activeEvaluations.length} ativos
            </span>
          }
          delay={540}
          accent="amber"
        >
          <div className="overflow-x-auto rounded-xl border-2 border-slate-400">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-400 bg-gradient-to-r from-slate-100 to-slate-50">
                  {['Título', 'Disciplina', 'Participantes', 'Corrigidos', 'Progresso', 'Status'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[.16em] text-slate-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <Skel className="h-4 w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : activeEvaluations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-sm font-semibold text-slate-400">
                      Nenhum simulado ativo no momento.
                    </td>
                  </tr>
                ) : (
                  activeEvaluations.map((ev) => {
                    const { pct, color } = statusProgress(ev.corrected, ev.participants)
                    return (
                      <tr
                        key={ev.id}
                        className="dv-tr group border-b border-slate-200 transition-colors"
                      >
                        <td className="px-5 py-4 text-[13px] font-bold text-slate-800">{ev.title}</td>
                        <td className="px-5 py-4 text-[13px] font-semibold text-slate-500">{ev.subject}</td>
                        <td className="px-5 py-4 text-[13px] font-semibold text-slate-700">{ev.participants}</td>
                        <td className="px-5 py-4 text-[13px] font-semibold text-slate-700">{ev.corrected}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 border border-slate-200">
                              <div
                                className="h-full rounded-full transition-[width] duration-700"
                                style={{ width: `${pct}%`, background: color }}
                              />
                            </div>
                            <span
                              className="min-w-[36px] text-right text-[11px] font-black"
                              style={{ color }}
                            >
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={statusPill(ev.status)}>
                            <span className="h-2 w-2 rounded-full bg-current" />
                            {ev.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* ── Alert student modal ── */}
        {selectedAlertStudentId && alertStudents.length > 0 ? (
          <AlertStudentsModal
            students={alertStudents}
            selectedStudentId={selectedAlertStudentId}
            onSelectStudent={setSelectedAlertStudentId}
            onClose={() => setSelectedAlertStudentId(null)}
            getClassName={getAlertStudentClassName}
          />
        ) : null}
      </div>
    </>
  )
}
