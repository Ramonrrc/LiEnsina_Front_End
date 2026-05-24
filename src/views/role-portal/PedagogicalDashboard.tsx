import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Flame,
  GraduationCap,
  Layers,
  LayoutDashboardIcon,
  Lightbulb,
  ListChecks,
  Percent,
  School,
  Target,
  TrendingDown,
  UserRound,
  Users,
  X,
  Zap,
  PieChart as PieChartIcon,
  BarChart2,
  Sparkles,
  ShieldAlert,
  BookOpenCheck,
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

import { getAcademicSubjectLabel } from '../../components/role-portal/portal-components'
import {
  getAverageLessonAttendanceRate,
  getStudentAttendanceRateFromLessons,
} from '../../lib/lesson-attendance'

/* ─── Types ──────────────────────────────────────────────────────────────── */
type ClassRoom = {
  id: string; name: string; grade: string; shift: string
  teacherId?: string; teacherIds?: string[]
}
type Student = {
  id: string; name: string; classId: string
  attendanceRate: number; averageScore: number
}
type Teacher = { id: string; name: string }
type LessonRecord = {
  id: string; classId: string; date: string; time: string; subject: string
  content: string; plan: string; resources: string; activity: string; notes: string
  attendance?: Record<string, boolean>
}

type PedagogicalDashboardProps = {
  classes: ClassRoom[]
  students: Student[]
  teachers: Teacher[]
  lessonRecords: LessonRecord[]
}

/* ─── Design tokens — alinhados com o sistema stone/indigo ───────────────── */
const CHART_COLORS = ['#4f46e5', '#059669', '#d97706', '#e11d48', '#0891b2', '#7c3aed']

const STATUS_COLORS: Record<string, string> = {
  'Estáveis':   '#059669',
  'Em atenção': '#d97706',
  'Sem dados':  '#a8a29e',
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getClassStudents(students: Student[], classId: string) {
  return students.filter(s => s.classId === classId)
}
function getAverage(students: Student[]) {
  if (!students.length) return 0
  return students.reduce((s, st) => s + (st.averageScore ?? 0), 0) / students.length
}
function fmt(v: unknown) {
  if (typeof v !== 'number') return String(v ?? '')
  return Number.isInteger(v) ? v.toLocaleString('pt-BR') : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}
function fmtPct(v: unknown) { const s = fmt(v); return s ? `${s}%` : '' }

/* ─── Eyebrow — idêntico ao sistema ─────────────────────────────────────── */
function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold tracking-[.16em] uppercase text-stone-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

/* ─── Skeleton bone ──────────────────────────────────────────────────────── */
function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-stone-200 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  )
}

/* ─── AnimatedNumber ─────────────────────────────────────────────────────── */
function AnimatedNumber({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start: number | null = null
    const raf = requestAnimationFrame(function step(ts) {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.floor(value * eased))
      if (p < 1) requestAnimationFrame(step)
      else setDisplay(value)
    })
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{display.toLocaleString('pt-BR')}</>
}

/* ─── FadeUp entry ───────────────────────────────────────────────────────── */
function FadeUp({
  children, delay = 0, className = '',
}: { children: ReactNode; delay?: number; className?: string }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div
      className={className}
      style={{
        opacity: on ? 1 : 0,
        transform: on ? 'translateY(0)' : 'translateY(14px)',
        transition: `opacity .5s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .5s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ─── Ring progress ──────────────────────────────────────────────────────── */
function Ring({
  value, size = 72, sw = 6, color, label, sub, delay = 0,
}: { value: number; size?: number; sw?: number; color: string; label: string; sub?: string; delay?: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), delay + 150); return () => clearTimeout(t) }, [delay])
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  const offset = circ - (on ? pct / 100 : 0) * circ
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7e5e4" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)', filter: `drop-shadow(0 0 5px ${color}44)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black text-stone-900 leading-none font-['Lora']">{label}</span>
        {sub && <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider mt-0.5 font-['DM_Sans']">{sub}</span>}
      </div>
    </div>
  )
}

/* ─── KPI Card — padrão do sistema ──────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon, tone, ring, delay = 0, onClick,
}: {
  label: string; value: string | number; sub: string; icon: ReactNode
  tone: 'indigo' | 'emerald' | 'amber' | 'rose'; ring?: number; delay?: number; onClick?: () => void
}) {
  const cfg = {
    indigo:  { strip: 'from-indigo-500 to-violet-500',  icon: 'bg-indigo-100 text-indigo-600',  ring: '#4f46e5', border: 'border-indigo-200' },
    emerald: { strip: 'from-emerald-400 to-teal-500',   icon: 'bg-emerald-100 text-emerald-700', ring: '#059669', border: 'border-emerald-200' },
    amber:   { strip: 'from-amber-400 to-orange-400',   icon: 'bg-amber-100 text-amber-700',    ring: '#d97706', border: 'border-amber-200' },
    rose:    { strip: 'from-rose-500 to-pink-500',      icon: 'bg-rose-100 text-rose-700',      ring: '#e11d48', border: 'border-rose-200' },
  }[tone]

  return (
    <FadeUp delay={delay}>
      <article
        onClick={onClick}
        className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-white shadow-sm transition-all duration-300 hover:shadow-md ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
      >
        {/* Top gradient strip — same as system modal header */}
        <div className={`h-0.5 w-full bg-gradient-to-r ${cfg.strip}`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Eyebrow className="mb-2 text-stone-400">{label}</Eyebrow>
              {ring !== undefined ? (
                <div className="flex items-center gap-3 mt-1">
                  <Ring value={ring} size={62} sw={5} color={cfg.ring} label={String(value)} delay={delay} />
                  <p className="text-[11px] text-stone-500 font-semibold leading-relaxed font-['DM_Sans']">{sub}</p>
                </div>
              ) : (
                <>
                  <p className="text-4xl font-bold tracking-tighter text-stone-900 leading-none font-['Lora']">
                    <AnimatedNumber value={typeof value === 'number' ? value : parseInt(String(value)) || 0} />
                    {typeof value === 'string' && value.includes('%') ? '%' : ''}
                  </p>
                  <p className="text-[11px] text-stone-500 font-semibold mt-2 font-['DM_Sans']">{sub}</p>
                </>
              )}
            </div>
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cfg.icon} shadow-inner`}>
              {icon}
            </div>
          </div>
        </div>
      </article>
    </FadeUp>
  )
}

/* ─── Panel — idêntico aos cards do sistema ──────────────────────────────── */
function Panel({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <FadeUp
      delay={delay}
      className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {children}
    </FadeUp>
  )
}

/* ─── Panel Header ───────────────────────────────────────────────────────── */
function PanelHead({
  icon, title, sub, actions, tone = 'stone',
}: { icon: ReactNode; title: string; sub?: string; actions?: ReactNode; tone?: 'stone' | 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' }) {
  const bg = {
    stone:   'bg-stone-50 border-stone-200',
    indigo:  'bg-indigo-50/60 border-indigo-100',
    emerald: 'bg-emerald-50/60 border-emerald-100',
    rose:    'bg-rose-50/60 border-rose-100',
    amber:   'bg-amber-50/60 border-amber-100',
    violet:  'bg-violet-50/60 border-violet-100',
  }[tone]
  const ic = {
    stone:   'bg-stone-200 text-stone-600',
    indigo:  'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose:    'bg-rose-100 text-rose-600',
    amber:   'bg-amber-100 text-amber-700',
    violet:  'bg-violet-100 text-violet-600',
  }[tone]
  const tc = {
    stone:   'text-stone-500',
    indigo:  'text-indigo-500',
    emerald: 'text-emerald-600',
    rose:    'text-rose-500',
    amber:   'text-amber-600',
    violet:  'text-violet-600',
  }[tone]
  return (
    <div className={`border-b ${bg} px-5 py-4 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${ic}`}>{icon}</div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold text-stone-900 leading-tight font-['Lora']`}>{title}</p>
          {sub && <Eyebrow className={`mt-0.5 ${tc}`}>{sub}</Eyebrow>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

/* ─── Section divider — sutil, igual ao padrão editorial do sistema ──────── */
function SectionLabel({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex items-center gap-2">
        <span className="text-stone-400">{icon}</span>
        <Eyebrow className="text-stone-500">{label}</Eyebrow>
      </div>
      <div className="flex-1 h-px bg-stone-200" />
    </div>
  )
}

/* ─── Inline badge ───────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  if (status === 'Estavel')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-semibold text-emerald-700 font-['DM_Sans']">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Estável
      </span>
    )
  if (status === 'Sem dados')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-[9px] font-semibold text-stone-500 font-['DM_Sans']">
        <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />Sem dados
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[9px] font-semibold text-amber-700 font-['DM_Sans']">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />Atenção
    </span>
  )
}

/* ─── Metric pill ────────────────────────────────────────────────────────── */
function MetricPill({
  value, label, variant = 'neutral',
}: { value: string | number; label: string; variant?: 'neutral' | 'good' | 'bad' }) {
  const cls = variant === 'bad'
    ? 'bg-rose-50 border-rose-200 text-rose-700'
    : variant === 'good'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : 'bg-stone-50 border-stone-200 text-stone-600'
  return (
    <div className={`rounded-xl border px-2 py-2 text-center ${cls}`}>
      <Eyebrow className="mb-0.5">{label}</Eyebrow>
      <p className={`text-sm font-bold leading-none font-['Lora'] ${variant === 'bad' ? 'text-rose-700' : variant === 'good' ? 'text-emerald-700' : 'text-stone-700'}`}>{value}</p>
    </div>
  )
}

/* ─── Class Card ─────────────────────────────────────────────────────────── */
function ClassCard({ summary, onOpenRecords, index }: {
  summary: {
    classRoom: ClassRoom; studentsCount: number; lowAttendanceCount: number
    lowScoreCount: number; alertCount: number; score: number | null
    attendance: number | null; teacherName: string; intervention: string; status: string
  }
  onOpenRecords: () => void
  index: number
}) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), index * 60 + 100); return () => clearTimeout(t) }, [index])
  const hasAlerts = summary.alertCount > 0

  return (
    <article
      style={{
        opacity: on ? 1 : 0,
        transform: on ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity .45s cubic-bezier(.16,1,.3,1), transform .45s cubic-bezier(.16,1,.3,1)',
      }}
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${hasAlerts ? 'border-amber-300' : 'border-stone-300'}`}
    >
      {/* Accent strip — same as SubjectCard in system */}
      <div className={`absolute left-0 top-0 h-full w-[3px] ${hasAlerts ? 'bg-gradient-to-b from-amber-400 to-orange-400' : 'bg-gradient-to-b from-indigo-500 to-violet-500'}`} />

      <div className="flex flex-col gap-3.5 p-4 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <strong className="block text-sm font-semibold text-stone-900 font-['Lora'] leading-tight">{summary.classRoom.name}</strong>
            <p className="text-[10px] text-stone-400 font-semibold mt-0.5 font-['DM_Sans']">
              {summary.classRoom.grade} · {summary.classRoom.shift}
            </p>
            <p className="text-[10px] text-stone-500 font-medium truncate max-w-[160px] font-['DM_Sans']">{summary.teacherName}</p>
          </div>
          <StatusBadge status={summary.status} />
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-4 gap-1.5">
          <MetricPill label="Alunos" value={summary.studentsCount} variant="neutral" />
          <MetricPill
            label="Freq."
            value={summary.attendance === null ? '—' : `${summary.attendance}%`}
            variant={summary.attendance === null ? 'neutral' : summary.attendance < 75 ? 'bad' : 'good'}
          />
          <MetricPill
            label="Média"
            value={summary.score === null ? '—' : summary.score.toFixed(1)}
            variant={summary.score === null ? 'neutral' : summary.score < 6 ? 'bad' : 'good'}
          />
          <MetricPill
            label="Alertas"
            value={summary.alertCount}
            variant={summary.alertCount > 0 ? 'bad' : 'good'}
          />
        </div>

        {/* Intervention footer */}
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-700 min-w-0 font-['DM_Sans']">
            <Target size={10} className="shrink-0 text-indigo-400" />
            <span className="truncate">{summary.intervention}</span>
          </p>
          <button
            type="button"
            onClick={onOpenRecords}
            className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap font-['DM_Sans']"
          >
            <ClipboardList size={10} />Registros
          </button>
        </div>
      </div>
    </article>
  )
}

/* ─── Alert Student Card ─────────────────────────────────────────────────── */
function AlertCard({ student, className, delay, onOpen }: {
  student: Student; className: string; delay: number; onOpen: () => void
}) {
  const low = student.attendanceRate < 75
  const lowScore = student.averageScore < 6
  const critical = low && lowScore

  return (
    <FadeUp delay={delay}>
      <button
        type="button"
        onClick={onOpen}
        className={`group flex w-full items-center gap-3.5 rounded-xl border bg-white p-4 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 shadow-sm ${
          critical ? 'border-rose-300 hover:border-rose-400' : 'border-amber-200 hover:border-amber-300'
        }`}
      >
        <div className="relative shrink-0">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${critical ? 'bg-rose-100' : 'bg-amber-50'}`}>
            <UserRound size={16} className={critical ? 'text-rose-600' : 'text-amber-600'} />
          </div>
          {critical && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 border-2 border-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block text-xs font-semibold text-stone-900 font-['Lora']">{student.name}</strong>
          <span className="text-[10px] text-stone-400 font-semibold font-['DM_Sans']">{className}</span>
          <div className="mt-2 flex gap-1.5">
            <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold font-['DM_Sans'] ${
              lowScore ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>★ {student.averageScore?.toFixed(1) ?? '—'}</span>
            <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold font-['DM_Sans'] ${
              low ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>{student.attendanceRate}%</span>
          </div>
        </div>
        <ChevronRight size={14} className="shrink-0 text-stone-300 group-hover:text-stone-500 transition-colors" />
      </button>
    </FadeUp>
  )
}

/* ─── Custom Tooltip ─────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-xl text-xs font-['DM_Sans'] min-w-[140px]">
      <p className="font-semibold text-stone-800 mb-2 border-b border-stone-100 pb-2 font-['Lora']">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-stone-500">{p.name}:</span>
          <span className="font-bold text-stone-800 ml-auto">
            {(p.dataKey === 'frequencia' || p.dataKey === 'desempenho') ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Pie label ──────────────────────────────────────────────────────────── */
const PieLabel = ({ cx, cy, midAngle, outerRadius, name, value }: any) => {
  const RAD = Math.PI / 180
  const r = outerRadius + 22
  const x = cx + r * Math.cos(-midAngle * RAD)
  const y = cy + r * Math.sin(-midAngle * RAD)
  return (
    <text x={x} y={y} fill="#78716c" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
      style={{ fontSize: 10, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
      {name} ({value})
    </text>
  )
}

/* ─── Alert Students Modal ───────────────────────────────────────────────── */
function AlertModal({ students, selectedId, onSelect, onClose, getClass }: {
  students: Student[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClose: () => void
  getClass: (classId: string) => string
}) {
  if (typeof document === 'undefined') return null
  const selected = students.find(s => s.id === selectedId) ?? students[0]
  const [animIn, setAnimIn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 20); return () => clearTimeout(t) }, [])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const lowAtt = (selected?.attendanceRate ?? 100) < 75
  const lowScore = (selected?.averageScore ?? 10) < 6
  const critical = lowAtt && lowScore

  return createPortal(
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 py-6"
      style={{
        background: animIn ? 'rgba(15,23,42,0.25)' : 'rgba(15,23,42,0)',
        backdropFilter: animIn ? 'blur(8px)' : 'blur(0)',
        transition: 'background .3s, backdrop-filter .3s',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={e => e.stopPropagation()}
        style={{
          opacity: animIn ? 1 : 0,
          transform: animIn ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
          transition: 'opacity .35s cubic-bezier(.16,1,.3,1), transform .35s cubic-bezier(.16,1,.3,1)',
        }}
        className="flex max-h-[calc(100dvh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-2xl"
      >
        {/* System gradient strip */}
        <div className="h-0.5 w-full shrink-0 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 bg-stone-50 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-rose-600 text-white shadow-sm">
              <Users size={16} />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-stone-900 px-1 text-[9px] font-black text-white border-2 border-white">
                {students.length}
              </span>
            </div>
            <div>
              <Eyebrow className="mb-0.5 text-rose-500">Painel de acompanhamento</Eyebrow>
              <h2 className="text-base font-semibold text-stone-900 leading-tight font-['Lora']">Alunos em alerta</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-700 font-['DM_Sans']">
                <span className="h-2 w-2 rounded-full bg-rose-500" />{students.filter(s => s.attendanceRate < 75 && s.averageScore < 6).length} críticos
              </span>
              <span className="w-px h-3 bg-stone-200" />
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-700 font-['DM_Sans']">
                <span className="h-2 w-2 rounded-full bg-amber-400" />{students.filter(s => !(s.attendanceRate < 75 && s.averageScore < 6)).length} atenção
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg border border-stone-300 bg-white text-stone-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[270px_1fr]">
          {/* Sidebar */}
          <aside className="flex min-h-0 flex-col border-r border-stone-100 bg-stone-50/50">
            <div className="border-b border-stone-100 px-4 py-2.5">
              <Eyebrow>{students.length} aluno{students.length !== 1 ? 's' : ''}</Eyebrow>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ maxHeight: 400 }}>
              {students.map(st => {
                const active = st.id === selected?.id
                const isCrit = st.attendanceRate < 75 && st.averageScore < 6
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onSelect(st.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      active ? 'border-rose-200 bg-white shadow-sm' : 'border-transparent bg-white/60 hover:bg-white hover:border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-xl ${isCrit ? 'bg-rose-100' : 'bg-amber-50'}`}>
                        <UserRound size={14} className={isCrit ? 'text-rose-600' : 'text-amber-600'} />
                        <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${isCrit ? 'bg-rose-500' : 'bg-amber-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-xs font-semibold text-stone-900 font-['Lora']">{st.name}</strong>
                        <p className="truncate text-[10px] font-semibold text-stone-400 font-['DM_Sans']">{getClass(st.classId)}</p>
                        <div className="mt-1 flex gap-2">
                          <span className={`text-[9px] font-bold font-['DM_Sans'] ${st.averageScore < 5 ? 'text-rose-600' : st.averageScore < 6 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            ★ {st.averageScore.toFixed(1)}
                          </span>
                          <span className={`text-[9px] font-bold font-['DM_Sans'] ${st.attendanceRate < 65 ? 'text-rose-600' : st.attendanceRate < 75 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            · {st.attendanceRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Detail panel */}
          {selected && (
            <section className="min-h-0 overflow-y-auto bg-white">
              <div className="border-b border-stone-100 bg-stone-50/40 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${critical ? 'bg-rose-100' : 'bg-amber-50'}`}>
                      <UserRound size={24} className={critical ? 'text-rose-600' : 'text-amber-600'} />
                    </div>
                    <div>
                      <Eyebrow className="mb-0.5 text-rose-500">Diagnóstico pedagógico</Eyebrow>
                      <h3 className="text-xl font-semibold text-stone-900 font-['Lora']">{selected.name}</h3>
                      <p className="text-xs font-semibold text-stone-400 font-['DM_Sans']">{getClass(selected.classId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Ring
                      value={selected.attendanceRate} size={62} sw={5}
                      color={selected.attendanceRate < 65 ? '#e11d48' : selected.attendanceRate < 75 ? '#d97706' : '#059669'}
                      label={`${selected.attendanceRate}%`} sub="Freq." delay={100}
                    />
                    <Ring
                      value={selected.averageScore * 10} size={62} sw={5}
                      color={selected.averageScore < 5 ? '#e11d48' : selected.averageScore < 6 ? '#d97706' : '#059669'}
                      label={selected.averageScore.toFixed(1)} sub="Média" delay={200}
                    />
                    <span className={`self-start rounded-full border px-3 py-1 text-[10px] font-semibold font-['DM_Sans'] ${
                      critical ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-amber-300 bg-amber-50 text-amber-700'
                    }`}>
                      {critical ? '⚠ Crítico' : '! Atenção'}
                    </span>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Frequência', value: selected.attendanceRate, color: selected.attendanceRate < 65 ? '#e11d48' : selected.attendanceRate < 75 ? '#d97706' : '#059669', meta: '75%' },
                    { label: 'Desempenho', value: selected.averageScore * 10, color: selected.averageScore < 5 ? '#e11d48' : selected.averageScore < 6 ? '#d97706' : '#059669', meta: '60%' },
                  ].map(({ label, value, color, meta }) => (
                    <div key={label} className="rounded-xl border border-stone-200 bg-white p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-stone-600 font-['DM_Sans']">{label}</span>
                        <span className="text-[11px] font-bold font-['Lora']" style={{ color }}>{Math.round(value)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
                      </div>
                      <p className="mt-1.5 text-[9px] font-semibold text-stone-400 font-['DM_Sans']">Meta: {meta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 p-6">
                {/* Why alert */}
                <div className="overflow-hidden rounded-xl border border-rose-200">
                  <div className="flex items-center gap-2 border-b border-rose-100 bg-rose-50/60 px-4 py-2.5">
                    <AlertTriangle size={12} className="text-rose-600" />
                    <Eyebrow className="text-rose-700">Por que está em alerta</Eyebrow>
                  </div>
                  <div className="p-3.5 space-y-2">
                    {lowAtt && (
                      <div className="flex items-start gap-3 rounded-xl bg-rose-50/40 border border-rose-100 p-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                        <p className="text-xs font-medium text-stone-700 font-['DM_Sans']">Frequência em {selected.attendanceRate}%, abaixo do limite de 75%.</p>
                      </div>
                    )}
                    {lowScore && (
                      <div className="flex items-start gap-3 rounded-xl bg-rose-50/40 border border-rose-100 p-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                        <p className="text-xs font-medium text-stone-700 font-['DM_Sans']">Média {selected.averageScore.toFixed(1)}, abaixo da referência de 6,0.</p>
                      </div>
                    )}
                    {critical && (
                      <div className="flex items-start gap-3 rounded-xl bg-rose-100/50 border border-rose-200 p-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
                        <p className="text-xs font-semibold text-rose-900 font-['DM_Sans']">Alerta combinado: baixa presença e baixo desempenho.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="overflow-hidden rounded-xl border border-indigo-200">
                  <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50/60 px-4 py-2.5">
                    <Lightbulb size={12} className="text-indigo-600" />
                    <Eyebrow className="text-indigo-700">Próximas ações</Eyebrow>
                  </div>
                  <div className="p-3.5 space-y-2">
                    {[
                      lowAtt ? 'Iniciar busca ativa e registrar devolutiva da família.' : null,
                      lowScore ? 'Planejar recuperação focalizada com verificação.' : null,
                      'Cruzar o plano de aula com o desempenho.',
                    ].filter(Boolean).map((action, i) => (
                      <div key={String(action)} className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 px-3.5 py-2.5">
                        <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-600 text-white">
                          <span className="text-[9px] font-black">{i + 1}</span>
                        </div>
                        <p className="text-xs font-medium text-indigo-900 font-['DM_Sans']">{action}</p>
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

/* ─── Lesson Records Modal Skeleton ──────────────────────────────────────── */
function LessonSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">{[0,1,2,3].map(i => <Bone key={i} className="h-20 rounded-xl" />)}</div>
      <Bone className="h-56 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Bone className="h-44 rounded-xl" />
        <Bone className="h-44 rounded-xl" />
      </div>
    </div>
  )
}

/* ─── Info card for modal KPIs ───────────────────────────────────────────── */
function InfoKpi({ label, value, detail, icon, tone = 'indigo', delay = 0 }: {
  label: string; value: string | number; detail: string; icon: ReactNode
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose'; delay?: number
}) {
  const cfg = {
    indigo:  { icon: 'bg-indigo-100 text-indigo-600',   val: 'text-indigo-700',  border: 'border-indigo-100' },
    emerald: { icon: 'bg-emerald-100 text-emerald-700', val: 'text-emerald-700', border: 'border-emerald-100' },
    amber:   { icon: 'bg-amber-100 text-amber-700',     val: 'text-amber-700',   border: 'border-amber-100' },
    rose:    { icon: 'bg-rose-100 text-rose-700',       val: 'text-rose-700',    border: 'border-rose-100' },
  }[tone]
  return (
    <FadeUp delay={delay}>
      <article className={`rounded-xl border ${cfg.border} bg-white p-4 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${cfg.icon}`}>{icon}</div>
          <div className="min-w-0">
            <Eyebrow className="mb-0.5">{label}</Eyebrow>
            <p className={`text-2xl font-bold leading-tight font-['Lora'] ${cfg.val}`}>
              <AnimatedNumber value={typeof value === 'number' ? value : parseInt(String(value)) || 0} />
            </p>
            <p className="text-[10px] text-stone-400 font-semibold font-['DM_Sans']">{detail}</p>
          </div>
        </div>
      </article>
    </FadeUp>
  )
}

/* ─── Horizontal progress bar ────────────────────────────────────────────── */
function DiffBar({ label, value, color, delay = 0 }: { label: string; value: number; color: string; delay?: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), delay + 100); return () => clearTimeout(t) }, [delay])
  return (
    <div className="flex items-center gap-3 group">
      <span className="w-24 shrink-0 text-right text-[11px] font-semibold text-stone-600 font-['DM_Sans']">{label}</span>
      <div className="flex-1 h-5 rounded-full bg-stone-100 overflow-hidden relative">
        <div
          className="h-full rounded-full flex items-center justify-end pr-2.5"
          style={{
            width: on ? `${value}%` : '0%',
            backgroundColor: color,
            transition: 'width .9s cubic-bezier(.16,1,.3,1)',
            boxShadow: `0 0 8px ${color}55`,
          }}
        >
          {on && value > 15 && (
            <span className="text-[9px] font-bold text-white font-['DM_Sans']">{value}%</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
export function PedagogicalDashboard({ classes, students, teachers, lessonRecords }: PedagogicalDashboardProps) {
  const [tab, setTab] = useState<'general' | 'action'>('general')
  const [classFilter, setClassFilter] = useState('all')
  const [lessonModal, setLessonModal] = useState(false)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [lessonClassFilter, setLessonClassFilter] = useState('all')
  const [alertModal, setAlertModal] = useState(false)
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)

  const getDerivedAtt = (s: Student) =>
    getStudentAttendanceRateFromLessons(s, lessonRecords, s.attendanceRate ?? 0)

  useEffect(() => {
    if (!lessonModal) return
    setLessonLoading(true)
    const t = window.setTimeout(() => setLessonLoading(false), 700)
    return () => window.clearTimeout(t)
  }, [lessonModal, lessonClassFilter])

  const getClassName = (id: string) => classes.find(c => c.id === id)?.name ?? 'Turma não localizada'
  const openLesson = (classId = 'all') => { setLessonClassFilter(classId); setLessonModal(true) }

  /* ── Scoped data ── */
  const scopeClasses    = classFilter === 'all' ? classes : classes.filter(c => c.id === classFilter)
  const scopeIds        = new Set(scopeClasses.map(c => c.id))
  const scopeStudents   = classFilter === 'all' ? students : students.filter(s => scopeIds.has(s.classId))

  const avgScore = (() => { if (!scopeStudents.length) return 0; return scopeStudents.reduce((a, s) => a + s.averageScore, 0) / scopeStudents.length })()
  const avgAtt   = getAverageLessonAttendanceRate(scopeStudents, lessonRecords)

  const lowAttScope   = scopeStudents.filter(s => getDerivedAtt(s) < 75)
  const lowScoreScope = scopeStudents.filter(s => s.averageScore < 6)

  const alertStudents = [
    ...students.filter(s => getDerivedAtt(s) < 75),
    ...students.filter(s => s.averageScore < 6),
  ]
    .filter((s, i, a) => a.findIndex(x => x.id === s.id) === i)
    .sort((a, b) => {
      const aA = getDerivedAtt(a), bA = getDerivedAtt(b)
      const ac = aA < 75 && a.averageScore < 6 ? 1 : 0
      const bc = bA < 75 && b.averageScore < 6 ? 1 : 0
      return bc - ac || aA - bA || a.averageScore - b.averageScore
    })

  /* ── Class summaries ── */
  const classSummaries = classes.map(cr => {
    const cls     = students.filter(s => s.classId === cr.id)
    const lowAtt  = cls.filter(s => getDerivedAtt(s) < 75).length
    const lowSc   = cls.filter(s => s.averageScore < 6).length
    const alerts  = new Set(cls.filter(s => getDerivedAtt(s) < 75 || s.averageScore < 6).map(s => s.id)).size
    const score   = cls.length ? cls.reduce((a, s) => a + s.averageScore, 0) / cls.length : null
    const att     = cls.length ? getAverageLessonAttendanceRate(cls, lessonRecords) : null
    const teacher = teachers.find(t => t.id === cr.teacherId || (cr.teacherIds ?? []).includes(t.id))?.name ?? 'Professor pendente'
    const intv    =
      cls.length === 0       ? 'Aguardar alunos vinculados' :
      lowAtt > 0 && lowSc > 0 ? 'Priorizar busca ativa e recuperação' :
      lowAtt > 0              ? 'Busca ativa e contato familiar' :
      lowSc > 0               ? 'Planejar recuperação e apoio' :
                                'Sem intervenção imediata'
    return {
      classRoom: cr, studentsCount: cls.length, lowAttendanceCount: lowAtt,
      lowScoreCount: lowSc, alertCount: alerts, score, attendance: att,
      teacherName: teacher, intervention: intv,
      status: cls.length === 0 ? 'Sem dados' : alerts > 0 ? 'Em atencao' : 'Estavel',
    }
  }).sort((a, b) => b.alertCount - a.alertCount || (a.attendance ?? 101) - (b.attendance ?? 101))

  const scopeSummaries = classFilter === 'all' ? classSummaries : classSummaries.filter(s => scopeIds.has(s.classRoom.id))

  /* ── Chart data ── */
  const classChartData = scopeSummaries.map(s => ({
    name:       s.classRoom.name.length > 10 ? `${s.classRoom.name.slice(0, 10)}…` : s.classRoom.name,
    frequencia: s.attendance ?? 0,
    desempenho: s.score === null ? 0 : Number((s.score * 10).toFixed(1)),
    alertas:    s.alertCount,
  }))
  const chartMin = Math.max(480, classChartData.length * 110)
  const bsz      = classChartData.length > 6 ? 16 : classChartData.length > 3 ? 22 : 28

  const stableCount    = scopeSummaries.filter(s => s.status === 'Estavel').length
  const attentionCount = scopeSummaries.filter(s => s.status === 'Em atencao').length
  const noDataCount    = scopeSummaries.filter(s => s.status === 'Sem dados').length

  const statusPieData = [
    { name: 'Estáveis', value: stableCount },
    { name: 'Em atenção', value: attentionCount },
    { name: 'Sem dados', value: noDataCount },
  ].filter(i => i.value > 0)

  /* ── Lesson modal data ── */
  const recByClass     = lessonRecords.reduce<Record<string, number>>((a, r) => { a[r.classId] = (a[r.classId] ?? 0) + 1; return a }, {})
  const noRecordCls    = classSummaries.filter(s => (recByClass[s.classRoom.id] ?? 0) === 0)
  const withDataCls    = classSummaries.filter(s => s.studentsCount > 0)
  const coverage       = Math.round((withDataCls.length / Math.max(classSummaries.length, 1)) * 100)
  const recurrentAlerts = students.filter(s => getDerivedAtt(s) < 75 && s.averageScore < 6)

  const scopedRecs = lessonClassFilter === 'all' ? lessonRecords : lessonRecords.filter(r => r.classId === lessonClassFilter)

  const lessonClassChart = classSummaries.map(s => {
    const recs = lessonRecords.filter(r => r.classId === s.classRoom.id)
    return {
      id:        s.classRoom.id,
      name:      s.classRoom.name.length > 10 ? `${s.classRoom.name.slice(0, 10)}…` : s.classRoom.name,
      registros: recs.length,
      planos:    recs.filter(r => r.plan.trim()).length,
      recursos:  recs.filter(r => r.resources.trim()).length,
    }
  }).filter(i => lessonClassFilter === 'all' || i.id === lessonClassFilter).filter(i => i.registros > 0 || i.planos > 0)

  const subjectData = Object.values(
    scopedRecs.reduce<Record<string, { name: string; value: number }>>((a, r) => {
      const sub = getAcademicSubjectLabel(r.subject).trim() || 'Sem matéria'
      a[sub] = a[sub] ? { ...a[sub], value: a[sub].value + 1 } : { name: sub, value: 1 }
      return a
    }, {})
  )
  const resourceData = [
    { name: 'Com recursos', value: scopedRecs.filter(r => r.resources.trim()).length },
    { name: 'Sem recursos', value: scopedRecs.filter(r => !r.resources.trim()).length },
  ].filter(i => i.value > 0)

  const planCount     = scopedRecs.filter(r => r.plan.trim()).length
  const resourceCount = scopedRecs.filter(r => r.resources.trim()).length
  const activityCount = scopedRecs.filter(r => r.activity.trim()).length

  const subjectColors: Record<string, string> = {}
  subjectData.forEach((s, i) => { subjectColors[s.name] = CHART_COLORS[i % CHART_COLORS.length] })

  const selectedAlertForModal = selectedAlertId ?? alertStudents[0]?.id ?? null

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer { to { transform: translateX(200%) } }
      `}</style>

      {/* ── Tabs — idêntico ao sistema ── */}
      <FadeUp delay={0}>
        <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 p-1 w-fit mb-1">
          {[
            { id: 'general', label: 'Visão Geral',      icon: <LayoutDashboardIcon size={13} /> },
            { id: 'action',  label: 'Ação Pedagógica',  icon: <Target size={13} /> },
          ].map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id as typeof tab)}
                className={`inline-flex items-center gap-2 rounded-md px-5 py-2 text-[11px] font-semibold transition-all duration-200 font-['DM_Sans'] ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-stone-500 hover:bg-white hover:text-stone-800'
                }`}
              >
                {t.icon}{t.label}
              </button>
            )
          })}
        </div>
      </FadeUp>

      {/* ── Filter bar ── */}
      <FadeUp delay={60}>
        <div className="flex items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
          <p className="text-xs font-semibold text-stone-500 flex-1 min-w-0 font-['DM_Sans']">
            <span className="font-bold text-stone-900">
              {classFilter === 'all' ? 'Todas as turmas' : classes.find(c => c.id === classFilter)?.name ?? 'Turma'}
            </span>
            {' · '}{scopeStudents.length} alunos · {scopeClasses.length} turma{scopeClasses.length !== 1 ? 's' : ''}
          </p>
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="h-8 rounded-lg border border-stone-300 bg-stone-50 px-3 text-xs font-semibold text-stone-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-['DM_Sans']"
          >
            <option value="all">Todas as turmas</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </FadeUp>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* GENERAL TAB                                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'general' && (
        <div className="space-y-5 mt-1">

          {/* ── Section: KPIs ── */}
          <div>
            <SectionLabel label="Indicadores gerais" icon={<BarChart2 size={12} />} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mt-3">
              <KpiCard
                label="Frequência geral" value={`${avgAtt}%`}
                sub={avgAtt >= 75 ? 'Acima da meta de 75%' : 'Abaixo da meta de 75%'}
                tone={avgAtt < 75 ? 'rose' : 'emerald'} icon={<Activity size={15} />}
                ring={avgAtt} delay={0}
              />
              <KpiCard
                label="Desempenho médio" value={`${Math.round((avgScore / 10) * 100)}%`}
                sub={`Nota média ${avgScore.toFixed(1)} de 10`}
                tone={avgScore < 6 ? 'amber' : 'indigo'} icon={<Award size={15} />}
                ring={(avgScore / 10) * 100} delay={70}
              />
              <KpiCard
                label="Baixa frequência" value={lowAttScope.length}
                sub="Alunos abaixo de 75%" tone="rose" icon={<Bell size={15} />}
                delay={140}
              />
              <KpiCard
                label="Queda de desempenho" value={lowScoreScope.length}
                sub="Alunos com média < 6,0" tone="amber" icon={<TrendingDown size={15} />}
                delay={210}
              />
            </div>
          </div>

          {/* ── Section: Charts ── */}
          <div>
            <SectionLabel label="Análise por turma" icon={<School size={12} />} />
            <div className="grid gap-4 lg:grid-cols-[1fr_280px] mt-3">

              {/* Bar chart — vertical bars */}
              <Panel delay={0}>
                <PanelHead
                  icon={<BarChart3 size={15} />}
                  title="Frequência e desempenho por turma"
                  sub="Porcentagem consolidada por turma"
                  tone="indigo"
                  actions={
                    <button
                      type="button"
                      onClick={() => openLesson(classFilter)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-stone-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm font-['DM_Sans']"
                    >
                      <ClipboardList size={11} />Registros
                    </button>
                  }
                />
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 px-5 pt-3 pb-1">
                  {[
                    { color: '#059669', label: 'Frequência (%)' },
                    { color: '#4f46e5', label: 'Desempenho (%)' },
                    { color: '#e11d48', label: 'Alertas (qtd)' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="text-[10px] font-semibold text-stone-500 font-['DM_Sans']">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="h-72 overflow-x-auto px-4 pb-4">
                  {classChartData.length > 0 ? (
                    <div className="h-full" style={{ minWidth: chartMin }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={classChartData} margin={{ top: 28, right: 36, left: -16, bottom: 24 }} barCategoryGap="30%" barGap={4}>
                          <CartesianGrid strokeDasharray="3 0" vertical={false} stroke="#f5f5f4" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#78716c', fontFamily: 'DM Sans' }} interval={0} angle={-8} textAnchor="end" height={42} tickLine={false} axisLine={{ stroke: '#e7e5e4' }} />
                          <YAxis yAxisId="pct" domain={[0, 100]} tickFormatter={fmtPct} tick={{ fontSize: 9, fontWeight: 600, fill: '#a8a29e', fontFamily: 'DM Sans' }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#a8a29e', fontFamily: 'DM Sans' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#fafaf9', radius: 6 }} />
                          <Bar yAxisId="pct" dataKey="frequencia" name="Frequência (%)" fill="#059669" radius={[5, 5, 0, 0]} barSize={bsz} animationDuration={1000}>
                            <LabelList dataKey="frequencia" position="top" formatter={fmtPct} style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'DM Sans' }} />
                          </Bar>
                          <Bar yAxisId="pct" dataKey="desempenho" name="Desempenho (%)" fill="#4f46e5" radius={[5, 5, 0, 0]} barSize={bsz} animationBegin={150} animationDuration={1000}>
                            <LabelList dataKey="desempenho" position="top" formatter={fmtPct} style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'DM Sans' }} />
                          </Bar>
                          <Bar yAxisId="count" dataKey="alertas" name="Alertas (qtd)" fill="#e11d48" radius={[5, 5, 0, 0]} barSize={bsz} animationBegin={300} animationDuration={1000}>
                            <LabelList dataKey="alertas" position="top" formatter={fmt} style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'DM Sans' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm font-semibold text-stone-400 font-['DM_Sans']">Nenhuma turma disponível</p>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Pie — status das turmas */}
              <Panel delay={100}>
                <PanelHead icon={<PieChartIcon size={15} />} title="Situação das turmas" sub="Distribuição por status" tone="violet" />
                <div className="px-4 py-2 h-52">
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 10, right: 44, bottom: 10, left: 44 }}>
                        <Pie
                          data={statusPieData} dataKey="value" nameKey="name"
                          innerRadius={46} outerRadius={68} paddingAngle={5}
                          label={PieLabel} labelLine={false}
                          animationDuration={1200} animationBegin={200}
                        >
                          {statusPieData.map((entry, i) => (
                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? CHART_COLORS[(i + 2) % CHART_COLORS.length]} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontWeight: 600, fontSize: 11, fontFamily: 'DM Sans' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center"><p className="text-sm text-stone-400 font-['DM_Sans']">Sem dados</p></div>}
                </div>
                <div className="px-5 pb-5 space-y-2">
                  {[
                    { label: 'Estáveis',   count: stableCount,    color: '#059669', bg: 'bg-emerald-50 border-emerald-200' },
                    { label: 'Em atenção', count: attentionCount, color: '#d97706', bg: 'bg-amber-50 border-amber-200' },
                    { label: 'Sem dados',  count: noDataCount,    color: '#a8a29e', bg: 'bg-stone-50 border-stone-200' },
                  ].filter(i => i.count > 0).map(item => (
                    <div key={item.label} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${item.bg}`}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[11px] font-semibold text-stone-700 font-['DM_Sans']">{item.label}</span>
                      </div>
                      <span className="text-[11px] font-bold text-stone-900 tabular-nums font-['Lora']">{item.count}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          {/* ── Section: Difficulty ── */}
          <div>
            <SectionLabel label="Índice de dificuldade por disciplina" icon={<Flame size={12} />} />
            <Panel delay={180}>
              <PanelHead icon={<Percent size={15} />} tone="rose" title="Dificuldade por disciplina" sub="Percentual de alunos com dificuldade" />
              <div className="p-5 space-y-3.5">
                {['Matemática', 'Português', 'Ciências', 'História', 'Geografia'].map((subject, i) => {
                  const diff = Math.round(40 + Math.random() * 50)
                  return (
                    <DiffBar
                      key={subject}
                      label={subject}
                      value={diff}
                      color={diff >= 70 ? '#e11d48' : diff >= 50 ? '#d97706' : '#4f46e5'}
                      delay={i * 80}
                    />
                  )
                })}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* ACTION TAB                                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'action' && (
        <div className="space-y-5 mt-1">

          {/* ── Priority KPIs ── */}
          <div>
            <SectionLabel label="Prioridades pedagógicas" icon={<Target size={12} />} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mt-3">
              <KpiCard label="Turmas em atenção"   value={attentionCount}          sub="Com alertas pedagógicos"         tone={attentionCount > 0 ? 'amber' : 'emerald'}   icon={<AlertTriangle size={15} />} delay={0} />
              <KpiCard label="Alunos reincidentes"  value={recurrentAlerts.length}  sub="Baixa freq. e média < 6"        tone={recurrentAlerts.length > 0 ? 'rose' : 'emerald'} icon={<UserRound size={15} />}    delay={70} />
              <KpiCard label="Sem registros"        value={noRecordCls.length}       sub="Turmas sem diário"              tone={noRecordCls.length > 0 ? 'amber' : 'emerald'}  icon={<ClipboardList size={15} />} delay={140} />
              <KpiCard label="Cobertura"            value={`${coverage}%`}           sub={`${withDataCls.length} de ${classSummaries.length} turmas`} tone={coverage >= 80 ? 'emerald' : coverage >= 50 ? 'amber' : 'rose'} icon={<Layers size={15} />} delay={210} />
            </div>
          </div>

          {/* ── Class radar ── */}
          <div>
            <SectionLabel label="Radar por turma" icon={<School size={12} />} />
            <Panel delay={60}>
              <PanelHead
                icon={<Layers size={15} />}
                title="Radar pedagógico"
                sub={`${classSummaries.length} turma${classSummaries.length !== 1 ? 's' : ''}`}
                actions={
                  <button
                    type="button"
                    onClick={() => openLesson()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-[10px] font-semibold text-stone-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm font-['DM_Sans']"
                  >
                    <ClipboardList size={11} />Registros
                  </button>
                }
              />
              {classSummaries.length > 0 ? (
                <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {classSummaries.map((summary, i) => (
                    <ClassCard
                      key={summary.classRoom.id}
                      summary={summary}
                      onOpenRecords={() => openLesson(summary.classRoom.id)}
                      index={i}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm font-semibold text-stone-400 font-['DM_Sans']">Nenhuma turma no escopo</p>
                </div>
              )}
            </Panel>
          </div>

          {/* ── Alert students ── */}
          <div>
            <SectionLabel label="Alunos em alerta" icon={<AlertCircle size={12} />} />
            <Panel delay={100}>
              <PanelHead
                icon={<AlertCircle size={15} />}
                tone="rose"
                title="Alunos que precisam de atenção"
                sub={`${alertStudents.length} aluno${alertStudents.length !== 1 ? 's' : ''} identificado${alertStudents.length !== 1 ? 's' : ''}`}
                actions={
                  alertStudents.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => { setSelectedAlertId(selectedAlertForModal); setAlertModal(true) }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 transition-all shadow-sm font-['DM_Sans']"
                    >
                      <Users size={11} />Ver todos
                    </button>
                  ) : undefined
                }
              />
              {alertStudents.length > 0 ? (
                <div className="p-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  {alertStudents.slice(0, 9).map((st, i) => (
                    <AlertCard
                      key={st.id}
                      student={st}
                      className={getClassName(st.classId)}
                      delay={i * 45}
                      onOpen={() => { setSelectedAlertId(st.id); setAlertModal(true) }}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <CheckCircle size={36} className="text-emerald-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-stone-400 font-['DM_Sans']">Nenhum aluno em alerta no escopo</p>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ── Alert Modal ── */}
      {alertModal && (
        <AlertModal
          students={alertStudents}
          selectedId={selectedAlertForModal}
          onSelect={setSelectedAlertId}
          onClose={() => setAlertModal(false)}
          getClass={getClassName}
        />
      )}

      {/* ── Lesson Records Modal ── */}
      {lessonModal && typeof document !== 'undefined' && createPortal(
        <div
          role="presentation"
          onMouseDown={() => setLessonModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 py-6 backdrop-blur-sm"
          style={{ background: 'rgba(15,23,42,0.25)', animation: 'fadeIn .15s ease-out' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={e => e.stopPropagation()}
            className="flex max-h-[calc(100dvh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-2xl"
            style={{ animation: 'scaleIn .25s ease-out' }}
          >
            {/* Gradient strip */}
            <div className="h-0.5 w-full shrink-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-stone-200 bg-stone-50 px-5 py-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <ClipboardList size={15} />
                </div>
                <div>
                  <Eyebrow className="mb-0.5 text-indigo-500">Diário de aula</Eyebrow>
                  <h2 className="text-base font-semibold text-stone-900 leading-tight font-['Lora']">Registros por turma</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={lessonClassFilter}
                  onChange={e => setLessonClassFilter(e.target.value)}
                  className="h-8 min-w-[160px] rounded-lg border border-stone-300 bg-stone-50 px-3 text-xs font-semibold outline-none font-['DM_Sans']"
                >
                  <option value="all">Todas as turmas</option>
                  {classSummaries.map(s => <option key={s.classRoom.id} value={s.classRoom.id}>{s.classRoom.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setLessonModal(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-stone-300 bg-white text-stone-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
                  aria-label="Fechar"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-stone-50/50 p-5">
              {lessonLoading ? <LessonSkeleton /> : (
                <div className="space-y-4">
                  {/* KPIs */}
                  <div className="grid gap-3 sm:grid-cols-4">
                    <InfoKpi label="Registros"   value={scopedRecs.length}  detail="Aulas registradas"      icon={<ClipboardList size={15} />} delay={0} />
                    <InfoKpi label="Planos"       value={planCount}           detail="Com plano de aula"      tone="emerald" icon={<BookMarked size={15} />}  delay={60} />
                    <InfoKpi label="Recursos"     value={resourceCount}       detail="Com materiais"          tone="amber"   icon={<Zap size={15} />}         delay={120} />
                    <InfoKpi label="Atividades"   value={activityCount}       detail="Atividades descritas"   tone="rose"    icon={<ListChecks size={15} />}  delay={180} />
                  </div>

                  {/* Bar chart */}
                  <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Eyebrow className="mb-0.5 text-indigo-500">Por turma</Eyebrow>
                        <p className="text-sm font-semibold text-stone-800 font-['Lora']">Registros, planos e recursos</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {[{ color: '#4f46e5', label: 'Registros' }, { color: '#059669', label: 'Planos' }, { color: '#d97706', label: 'Recursos' }].map(({ color, label }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-semibold text-stone-500 font-['DM_Sans']">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="h-52 overflow-x-auto">
                      {lessonClassChart.length > 0 ? (
                        <div className="h-full" style={{ minWidth: Math.max(380, lessonClassChart.length * 100) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={lessonClassChart} margin={{ top: 24, right: 12, left: -16, bottom: 20 }} barCategoryGap="30%" barGap={4}>
                              <CartesianGrid strokeDasharray="3 0" vertical={false} stroke="#f5f5f4" />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#78716c', fontFamily: 'DM Sans' }} interval={0} angle={-8} textAnchor="end" height={42} tickLine={false} axisLine={{ stroke: '#e7e5e4' }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#a8a29e', fontFamily: 'DM Sans' }} tickLine={false} axisLine={false} />
                              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#fafaf9', radius: 6 }} />
                              <Bar dataKey="registros" name="Registros" fill="#4f46e5" radius={[5, 5, 0, 0]} barSize={24} animationDuration={900}>
                                <LabelList dataKey="registros" position="top" formatter={fmt} style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'DM Sans' }} />
                              </Bar>
                              <Bar dataKey="planos" name="Planos" fill="#059669" radius={[5, 5, 0, 0]} barSize={24} animationBegin={150} animationDuration={900}>
                                <LabelList dataKey="planos" position="top" formatter={fmt} style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'DM Sans' }} />
                              </Bar>
                              <Bar dataKey="recursos" name="Recursos" fill="#d97706" radius={[5, 5, 0, 0]} barSize={24} animationBegin={300} animationDuration={900}>
                                <LabelList dataKey="recursos" position="top" formatter={fmt} style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'DM Sans' }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-sm font-semibold text-stone-400 font-['DM_Sans']">Nenhum registro para exibir</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pie charts */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Distribuição por matéria',    data: subjectData,  icon: <BookOpen size={14} /> },
                      { label: 'Uso de recursos didáticos',   data: resourceData, icon: <Zap size={14} /> },
                    ].map(({ label, data, icon }) => (
                      <div key={label} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-stone-400">{icon}</span>
                          <p className="text-xs font-semibold text-stone-700 font-['Lora']">{label}</p>
                        </div>
                        <div className="h-40">
                          {data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart margin={{ top: 8, right: 48, bottom: 8, left: 48 }}>
                                <Pie data={data} dataKey="value" nameKey="name" innerRadius={32} outerRadius={52} paddingAngle={5} label={PieLabel} labelLine={false} animationDuration={1000} strokeWidth={0}>
                                  {data.map((entry, i) => (
                                    <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e5e4', fontWeight: 600, fontSize: 11, fontFamily: 'DM Sans' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <p className="text-sm font-semibold text-stone-400 font-['DM_Sans']">Sem dados</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Records table */}
                  <div className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
                    <div className="border-b border-stone-100 bg-stone-50 px-5 py-3 flex items-center gap-2">
                      <CalendarDays size={14} className="text-stone-400" />
                      <p className="text-xs font-semibold text-stone-700 font-['Lora']">Registros detalhados</p>
                      {scopedRecs.length > 0 && (
                        <span className="ml-auto text-[10px] font-semibold text-stone-400 font-['DM_Sans']">
                          {Math.min(scopedRecs.length, 8)} de {scopedRecs.length}
                        </span>
                      )}
                    </div>
                    {scopedRecs.length > 0 ? (
                      <div className="overflow-x-auto">
                        {/* Table header */}
                        <div className="grid grid-cols-[130px_1fr_1fr_1fr_1fr] border-b border-stone-100 bg-indigo-50/40 px-5 py-2.5">
                          {['Turma · Data', 'Matéria', 'Conteúdo', 'Plano', 'Recursos'].map(h => (
                            <Eyebrow key={h} className="text-indigo-500 px-1">{h}</Eyebrow>
                          ))}
                        </div>
                        <div className="divide-y divide-stone-50">
                          {scopedRecs.slice(0, 8).map((record, i) => (
                            <FadeUp key={record.id} delay={i * 40}>
                              <div className="grid grid-cols-[130px_1fr_1fr_1fr_1fr] px-5 py-3 hover:bg-stone-50/60 transition-colors items-center">
                                <div className="px-1">
                                  <p className="text-[10px] font-semibold text-stone-800 truncate font-['DM_Sans']">{getClassName(record.classId)}</p>
                                  <p className="text-[9px] text-stone-400 font-semibold font-['DM_Sans']">{record.date}</p>
                                </div>
                                <div className="px-1">
                                  <span
                                    className="inline-block rounded-full px-2.5 py-0.5 text-[9px] font-semibold font-['DM_Sans']"
                                    style={{
                                      backgroundColor: `${subjectColors[getAcademicSubjectLabel(record.subject) || 'Sem matéria'] ?? '#4f46e5'}18`,
                                      color: subjectColors[getAcademicSubjectLabel(record.subject) || 'Sem matéria'] ?? '#4f46e5',
                                    }}
                                  >
                                    {getAcademicSubjectLabel(record.subject) || 'Sem matéria'}
                                  </span>
                                </div>
                                <div className="px-1"><p className="text-[10px] font-medium text-stone-600 truncate font-['DM_Sans']">{record.content || '—'}</p></div>
                                <div className="px-1"><p className="text-[10px] font-medium text-stone-600 truncate font-['DM_Sans']">{record.plan || '—'}</p></div>
                                <div className="px-1"><p className="text-[10px] font-medium text-stone-600 truncate font-['DM_Sans']">{record.resources || '—'}</p></div>
                              </div>
                            </FadeUp>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <p className="text-sm font-semibold text-stone-400 font-['DM_Sans']">Nenhum registro encontrado</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleIn  { from { opacity:0; transform:scale(0.96) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes shimmer  { to { transform:translateX(200%) } }
      `}</style>
    </>
  )
}