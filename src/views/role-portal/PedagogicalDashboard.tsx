import {
  useEffect,
  useState,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react'
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
  BarChart2,
  Sparkles,
  ShieldAlert,
  BookOpenCheck,
  ArrowUpRight,
  Eye,
  FileText,
  Hash,
  Info,
  AlertOctagon,
  CheckSquare,
  BookMarked as BookMarkedIcon,
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
  id: string
  name: string
  grade: string
  shift: string
  teacherId?: string
  teacherIds?: string[]
}
type Student = {
  id: string
  name: string
  classId: string
  attendanceRate: number
  averageScore: number
}
type Teacher = { id: string; name: string }
type LessonRecord = {
  id: string
  classId: string
  date: string
  time: string
  subject: string
  content: string
  plan: string
  resources: string
  activity: string
  notes: string
  attendance?: Record<string, boolean>
}
type Evaluation = {
  id: string
  classId: string
  schoolId?: string
  subject: string
}
type EvaluationCorrection = {
  id: string
  evaluationId: string
  classId: string
  schoolId?: string
  subject?: string
  status: string
  suggestedScore?: number
  finalScore?: number | null
  correctCount?: number
  totalQuestions?: number
}

type PedagogicalDashboardProps = {
  classes: ClassRoom[]
  students: Student[]
  teachers: Teacher[]
  lessonRecords: LessonRecord[]
  evaluations?: Evaluation[]
  evaluationCorrections?: EvaluationCorrection[]
}

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const CHART_PALETTE = ['#4f46e5', '#059669', '#d97706', '#e11d48', '#0891b2', '#7c3aed']

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getAvg(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}
function fmt(v: unknown) {
  if (typeof v !== 'number') return String(v ?? '')
  return Number.isInteger(v)
    ? v.toLocaleString('pt-BR')
    : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}
function fmtPct(v: unknown) {
  const s = fmt(v)
  return s ? `${s}%` : ''
}

/* ─── Font import ────────────────────────────────────────────────────────── */
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');

@keyframes shimmer {
  0% { transform: translateX(-100%) }
  100% { transform: translateX(200%) }
}
@keyframes fade-up {
  from { opacity: 0; transform: translateY(16px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95) translateY(12px) }
  to   { opacity: 1; transform: scale(1) translateY(0) }
}
@keyframes ring-fill {
  from { stroke-dashoffset: var(--circ) }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1 }
  50%       { opacity: 0.4 }
}
@keyframes count-up {
  from { opacity: 0; transform: translateY(8px) }
  to   { opacity: 1; transform: translateY(0) }
}
`

/* ─── Primitives ─────────────────────────────────────────────────────────── */

function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`text-[10px] font-semibold tracking-[.15em] uppercase font-['Outfit'] text-stone-400 ${className}`}
    >
      {children}
    </p>
  )
}

function Bone({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-stone-100 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent animate-[shimmer_1.6s_ease-in-out_infinite]" />
    </div>
  )
}

/* ─── AnimatedCounter ────────────────────────────────────────────────────── */
function Counter({ to, suffix = '', prefix = '', duration = 1000 }: {
  to: number; suffix?: string; prefix?: string; duration?: number
}) {
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStarted(true) },
      { threshold: 0.3 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    let start: number | null = null
    const raf = requestAnimationFrame(function step(ts) {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 4)
      setVal(Math.floor(to * ease))
      if (p < 1) requestAnimationFrame(step)
      else setVal(to)
    })
    return () => cancelAnimationFrame(raf)
  }, [to, duration, started])

  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString('pt-BR')}
      {suffix}
    </span>
  )
}

/* ─── Ring ───────────────────────────────────────────────────────────────── */
function Ring({
  value,
  size = 76,
  stroke = 6,
  color,
  bg = '#f5f5f4',
  label,
  sub,
}: {
  value: number
  size?: number
  stroke?: number
  color: string
  bg?: string
  label: string
  sub?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  const [dash, setDash] = useState(circ)

  useEffect(() => {
    const t = setTimeout(() => setDash(circ - (pct / 100) * circ), 100)
    return () => clearTimeout(t)
  }, [pct, circ])

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-stone-900 leading-none font-['Fraunces']">{label}</span>
        {sub && <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-wider mt-0.5 font-['Outfit']">{sub}</span>}
      </div>
    </div>
  )
}

/* ─── FadeUp ─────────────────────────────────────────────────────────────── */
function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay)
    return () => clearTimeout(t)
  }, [delay])
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

/* ─── KPI Card ───────────────────────────────────────────────────────────── */
type Tone = 'indigo' | 'emerald' | 'amber' | 'rose'

const TONE_MAP = {
  indigo: {
    strip: 'from-indigo-500 to-violet-600',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    ring: '#4f46e5',
    border: 'border-indigo-300',
    valColor: 'text-indigo-700',
  },
  emerald: {
    strip: 'from-emerald-400 to-teal-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    ring: '#059669',
    border: 'border-emerald-300',
    valColor: 'text-emerald-700',
  },
  amber: {
    strip: 'from-amber-400 to-orange-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    ring: '#d97706',
    border: 'border-amber-300',
    valColor: 'text-amber-700',
  },
  rose: {
    strip: 'from-rose-500 to-pink-600',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    ring: '#e11d48',
    border: 'border-rose-300',
    valColor: 'text-rose-700',
  },
}

function KpiCard({
  label,
  value,
  numericValue,
  sub,
  icon,
  tone,
  ring,
  delay = 0,
  onClick,
}: {
  label: string
  value: string
  numericValue?: number
  sub: string
  icon: ReactNode
  tone: Tone
  ring?: number
  delay?: number
  onClick?: () => void
}) {
  const cfg = TONE_MAP[tone]
  return (
    <FadeUp delay={delay}>
      <article
        onClick={onClick}
        className={`group relative overflow-hidden rounded-2xl border-2 ${cfg.border} bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}
      >
        {/* Colored top strip */}
        <div className={`h-1 w-full bg-gradient-to-r ${cfg.strip}`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label className="mb-3">{label}</Label>
              {ring !== undefined ? (
                <div className="flex items-center gap-4">
                  <Ring value={ring} color={cfg.ring} label={value} size={72} stroke={6} />
                  <p className="text-[11px] text-stone-500 font-semibold leading-relaxed font-['Outfit']">{sub}</p>
                </div>
              ) : (
                <>
                  <p className={`text-4xl font-bold tracking-tight leading-none font-['Fraunces'] ${cfg.valColor}`}>
                    {numericValue !== undefined ? (
                      <Counter to={numericValue} />
                    ) : (
                      value
                    )}
                  </p>
                  <p className="text-[11px] text-stone-500 font-medium mt-2 font-['Outfit']">{sub}</p>
                </>
              )}
            </div>
            <div
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${cfg.iconBg} ${cfg.iconColor} border border-current/10`}
            >
              {icon}
            </div>
          </div>
        </div>
      </article>
    </FadeUp>
  )
}

/* ─── Panel ──────────────────────────────────────────────────────────────── */
function Panel({ children, delay = 0, className = '' }: {
  children: ReactNode; delay?: number; className?: string
}) {
  return (
    <FadeUp delay={delay} className={`overflow-hidden rounded-2xl border-2 border-stone-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
      {children}
    </FadeUp>
  )
}

/* ─── Panel Head ─────────────────────────────────────────────────────────── */
type PanelTone = 'stone' | 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet'

function PanelHead({
  icon,
  title,
  sub,
  actions,
  tone = 'stone',
}: {
  icon: ReactNode
  title: string
  sub?: string
  actions?: ReactNode
  tone?: PanelTone
}) {
  const cfg = {
    stone: { bg: 'bg-stone-50 border-stone-200', icon: 'bg-white border-stone-300 text-stone-600', sub: 'text-stone-400' },
    indigo: { bg: 'bg-indigo-50 border-indigo-200', icon: 'bg-white border-indigo-300 text-indigo-600', sub: 'text-indigo-400' },
    emerald: { bg: 'bg-emerald-50 border-emerald-200', icon: 'bg-white border-emerald-300 text-emerald-600', sub: 'text-emerald-500' },
    rose: { bg: 'bg-rose-50 border-rose-200', icon: 'bg-white border-rose-300 text-rose-600', sub: 'text-rose-400' },
    amber: { bg: 'bg-amber-50 border-amber-200', icon: 'bg-white border-amber-300 text-amber-600', sub: 'text-amber-500' },
    violet: { bg: 'bg-violet-50 border-violet-200', icon: 'bg-white border-violet-300 text-violet-600', sub: 'text-violet-400' },
  }[tone]

  return (
    <div className={`border-b-2 ${cfg.bg} px-5 py-4 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 ${cfg.icon}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900 leading-tight font-['Fraunces']">{title}</p>
          {sub && <Label className={`mt-0.5 ${cfg.sub}`}>{sub}</Label>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

/* ─── Section Divider ────────────────────────────────────────────────────── */
function SectionDivider({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1 mt-2">
      <div className="flex items-center gap-2">
        <span className="text-indigo-400">{icon}</span>
        <Label className="text-indigo-500">{label}</Label>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-transparent" />
    </div>
  )
}

/* ─── Status Badge ───────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  if (status === 'Estavel')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold text-emerald-700 font-['Outfit'] uppercase tracking-wider">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Estável
      </span>
    )
  if (status === 'Sem dados')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-stone-300 bg-stone-50 px-2.5 py-0.5 text-[9px] font-bold text-stone-500 font-['Outfit'] uppercase tracking-wider">
        <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
        Sem dados
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-amber-400 bg-amber-50 px-2.5 py-0.5 text-[9px] font-bold text-amber-700 font-['Outfit'] uppercase tracking-wider">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
      Atenção
    </span>
  )
}

/* ─── Metric Pill ────────────────────────────────────────────────────────── */
function MetricPill({
  value,
  label,
  variant = 'neutral',
}: {
  value: string | number
  label: string
  variant?: 'neutral' | 'good' | 'bad'
}) {
  const cls =
    variant === 'bad'
      ? 'bg-rose-50 border-2 border-rose-300 text-rose-700'
      : variant === 'good'
        ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-700'
        : 'bg-stone-50 border-2 border-stone-200 text-stone-600'
  return (
    <div className={`rounded-xl px-2 py-2 text-center ${cls}`}>
      <Label className="mb-0.5">{label}</Label>
      <p className="text-[13px] font-bold leading-none font-['Fraunces']">{value}</p>
    </div>
  )
}

/* ─── Class Card ─────────────────────────────────────────────────────────── */
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
  status: string
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
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), index * 70 + 120)
    return () => clearTimeout(t)
  }, [index])

  const hasAlerts = summary.alertCount > 0

  return (
    <article
      style={{
        opacity: on ? 1 : 0,
        transform: on ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1)',
      }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
        hasAlerts ? 'border-amber-400' : 'border-stone-300'
      }`}
    >
      {/* Left accent bar */}
      <div
        className={`absolute left-0 top-0 h-full w-[4px] ${
          hasAlerts
            ? 'bg-gradient-to-b from-amber-400 to-orange-500'
            : 'bg-gradient-to-b from-indigo-500 to-violet-600'
        }`}
      />

      <div className="flex flex-col gap-3.5 p-4 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <strong className="block text-sm font-semibold text-stone-900 font-['Fraunces'] leading-tight">
              {summary.classRoom.name}
            </strong>
            <p className="text-[10px] text-stone-400 font-bold mt-0.5 font-['Outfit'] uppercase tracking-wider">
              {summary.classRoom.grade} · {summary.classRoom.shift}
            </p>
            <p className="text-[11px] text-stone-500 font-medium truncate max-w-[160px] mt-0.5 font-['Outfit']">
              {summary.teacherName}
            </p>
          </div>
          <StatusBadge status={summary.status} />
        </div>

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

        <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 px-3 py-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-700 min-w-0 font-['Outfit']">
            <Target size={10} className="shrink-0 text-indigo-400" />
            <span className="truncate">{summary.intervention}</span>
          </p>
          <button
            type="button"
            onClick={onOpenRecords}
            className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap font-['Outfit'] border border-indigo-300 rounded-lg px-2 py-1 bg-white hover:bg-indigo-100"
          >
            <ClipboardList size={10} />
            Registros
          </button>
        </div>
      </div>
    </article>
  )
}

/* ─── Alert Student Card ─────────────────────────────────────────────────── */
function AlertCard({
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
  const low = student.attendanceRate < 75
  const lowScore = student.averageScore < 6
  const critical = low && lowScore

  return (
    <FadeUp delay={delay}>
      <button
        type="button"
        onClick={onOpen}
        className={`group flex w-full items-center gap-3.5 rounded-2xl border-2 bg-white p-4 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 shadow-sm ${
          critical ? 'border-rose-400 hover:border-rose-500' : 'border-amber-300 hover:border-amber-400'
        }`}
      >
        <div className="relative shrink-0">
          <div
            className={`grid h-11 w-11 place-items-center rounded-2xl border-2 ${
              critical ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-300'
            }`}
          >
            <UserRound size={18} className={critical ? 'text-rose-600' : 'text-amber-600'} />
          </div>
          {critical && (
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-rose-500 border-2 border-white animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block text-xs font-semibold text-stone-900 font-['Fraunces']">
            {student.name}
          </strong>
          <span className="text-[10px] text-stone-400 font-semibold font-['Outfit']">{className}</span>
          <div className="mt-2 flex gap-1.5">
            <span
              className={`inline-flex items-center rounded-lg border-2 px-2 py-0.5 text-[10px] font-bold font-['Outfit'] ${
                lowScore ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}
            >
              ★ {student.averageScore?.toFixed(1) ?? '—'}
            </span>
            <span
              className={`inline-flex items-center rounded-lg border-2 px-2 py-0.5 text-[10px] font-bold font-['Outfit'] ${
                low ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}
            >
              {student.attendanceRate}%
            </span>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="shrink-0 text-stone-300 group-hover:text-stone-600 group-hover:translate-x-0.5 transition-all"
        />
      </button>
    </FadeUp>
  )
}

/* ─── Tooltip ────────────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border-2 border-stone-200 bg-white p-3 shadow-xl text-xs font-['Outfit'] min-w-[150px]">
      <p className="font-bold text-stone-800 mb-2 border-b-2 border-stone-100 pb-2 font-['Fraunces'] text-sm">
        {label}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-stone-500">{p.name}:</span>
          <span className="font-bold text-stone-800 ml-auto">
            {p.dataKey === 'frequencia' || p.dataKey === 'desempenho' ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Pie Custom Label ───────────────────────────────────────────────────── */
const PieLabel = ({ cx, cy, midAngle, outerRadius, name, value }: any) => {
  const RAD = Math.PI / 180
  const r = outerRadius + 24
  const x = cx + r * Math.cos(-midAngle * RAD)
  const y = cy + r * Math.sin(-midAngle * RAD)
  return (
    <text
      x={x}
      y={y}
      fill="#78716c"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}
    >
      {name} ({value})
    </text>
  )
}

/* ─── Horizontal Difficulty Bar ──────────────────────────────────────────── */
function DiffBar({
  label,
  value,
  color,
  delay = 0,
}: {
  label: string
  value: number
  color: string
  delay?: number
}) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay + 150)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-right text-[11px] font-semibold text-stone-600 font-['Outfit']">
        {label}
      </span>
      <div className="flex-1 h-6 rounded-full bg-stone-100 border-2 border-stone-200 overflow-hidden relative">
        <div
          className="h-full rounded-full flex items-center justify-end pr-2.5 transition-all duration-1000"
          style={{
            width: on ? `${value}%` : '0%',
            backgroundColor: color,
            transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)',
          }}
        >
          {on && value > 15 && (
            <span className="text-[9px] font-bold text-white font-['Outfit']">{value}%</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Action Button ──────────────────────────────────────────────────────── */
function ActionBtn({
  children,
  onClick,
  tone = 'indigo',
  size = 'sm',
  icon,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'indigo' | 'rose' | 'stone'
  size?: 'sm' | 'xs'
  icon?: ReactNode
}) {
  const cfg = {
    indigo: 'border-2 border-indigo-300 bg-white text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400',
    rose: 'border-2 border-rose-300 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-400',
    stone: 'border-2 border-stone-300 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-400',
  }[tone]
  const sz = size === 'xs' ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2 text-[11px]'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl font-bold shadow-sm transition-all font-['Outfit'] ${cfg} ${sz}`}
    >
      {icon}
      {children}
    </button>
  )
}

/* ─── Alert Students Modal ───────────────────────────────────────────────── */
function AlertModal({
  students,
  selectedId,
  onSelect,
  onClose,
  getClass,
}: {
  students: Student[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClose: () => void
  getClass: (classId: string) => string
}) {
  const selected = students.find((s) => s.id === selectedId) ?? students[0]
  const [animIn, setAnimIn] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 20)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const lowAtt = (selected?.attendanceRate ?? 100) < 75
  const lowScore = (selected?.averageScore ?? 10) < 6
  const critical = lowAtt && lowScore

  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 py-6"
      style={{
        background: animIn ? 'rgba(28,25,23,0.4)' : 'rgba(28,25,23,0)',
        backdropFilter: animIn ? 'blur(8px)' : 'blur(0)',
        transition: 'background .3s, backdrop-filter .3s',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          opacity: animIn ? 1 : 0,
          transform: animIn ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'opacity .4s cubic-bezier(.16,1,.3,1), transform .4s cubic-bezier(.16,1,.3,1)',
        }}
        className="flex max-h-[calc(100dvh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-stone-300 bg-white shadow-2xl"
      >
        {/* Gradient strip */}
        <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-stone-200 bg-stone-50 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-rose-600 text-white border-2 border-rose-700 shadow-sm">
              <Users size={18} />
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-stone-900 px-1 text-[9px] font-black text-white border-2 border-white">
                {students.length}
              </span>
            </div>
            <div>
              <Label className="mb-0.5 text-rose-500">Painel de acompanhamento</Label>
              <h2 className="text-lg font-bold text-stone-900 leading-tight font-['Fraunces']">
                Alunos em alerta
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 rounded-xl border-2 border-stone-200 bg-white px-3 py-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-700 font-['Outfit']">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                {students.filter((s) => s.attendanceRate < 75 && s.averageScore < 6).length} críticos
              </span>
              <span className="w-px h-4 bg-stone-200" />
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 font-['Outfit']">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {students.filter((s) => !(s.attendanceRate < 75 && s.averageScore < 6)).length} atenção
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl border-2 border-stone-300 bg-white text-stone-400 transition-all hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500"
              aria-label="Fechar"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="flex min-h-0 flex-col border-r-2 border-stone-100 bg-stone-50">
            <div className="border-b-2 border-stone-100 px-4 py-3">
              <Label>
                {students.length} aluno{students.length !== 1 ? 's' : ''}
              </Label>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 440 }}>
              {students.map((st) => {
                const active = st.id === selected?.id
                const isCrit = st.attendanceRate < 75 && st.averageScore < 6
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onSelect(st.id)}
                    className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                      active
                        ? 'border-rose-300 bg-white shadow-sm'
                        : 'border-transparent bg-white/60 hover:bg-white hover:border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 ${
                          isCrit ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-300'
                        }`}
                      >
                        <UserRound size={15} className={isCrit ? 'text-rose-600' : 'text-amber-600'} />
                        {isCrit && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500 animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-xs font-bold text-stone-900 font-['Fraunces']">
                          {st.name}
                        </strong>
                        <p className="truncate text-[10px] font-semibold text-stone-400 font-['Outfit']">
                          {getClass(st.classId)}
                        </p>
                        <div className="mt-1 flex gap-2">
                          <span
                            className={`text-[9px] font-bold font-['Outfit'] ${
                              st.averageScore < 5
                                ? 'text-rose-600'
                                : st.averageScore < 6
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                            }`}
                          >
                            ★ {st.averageScore.toFixed(1)}
                          </span>
                          <span
                            className={`text-[9px] font-bold font-['Outfit'] ${
                              st.attendanceRate < 65
                                ? 'text-rose-600'
                                : st.attendanceRate < 75
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                            }`}
                          >
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
              {/* Student header */}
              <div className="border-b-2 border-stone-100 bg-gradient-to-b from-stone-50 to-white px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 ${
                        critical ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-300'
                      }`}
                    >
                      <UserRound size={28} className={critical ? 'text-rose-600' : 'text-amber-600'} />
                    </div>
                    <div>
                      <Label className="mb-1 text-rose-500">Diagnóstico pedagógico</Label>
                      <h3 className="text-xl font-bold text-stone-900 font-['Fraunces']">{selected.name}</h3>
                      <p className="text-xs font-semibold text-stone-400 font-['Outfit']">
                        {getClass(selected.classId)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Ring
                      value={selected.attendanceRate}
                      size={64}
                      stroke={5}
                      color={
                        selected.attendanceRate < 65
                          ? '#e11d48'
                          : selected.attendanceRate < 75
                            ? '#d97706'
                            : '#059669'
                      }
                      label={`${selected.attendanceRate}%`}
                      sub="Freq."
                    />
                    <Ring
                      value={selected.averageScore * 10}
                      size={64}
                      stroke={5}
                      color={
                        selected.averageScore < 5
                          ? '#e11d48'
                          : selected.averageScore < 6
                            ? '#d97706'
                            : '#059669'
                      }
                      label={selected.averageScore.toFixed(1)}
                      sub="Média"
                    />
                    <span
                      className={`self-start rounded-full border-2 px-3 py-1 text-[10px] font-bold font-['Outfit'] uppercase tracking-wider ${
                        critical
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : 'border-amber-400 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {critical ? '⚠ Crítico' : '! Atenção'}
                    </span>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    {
                      label: 'Frequência',
                      value: selected.attendanceRate,
                      color:
                        selected.attendanceRate < 65
                          ? '#e11d48'
                          : selected.attendanceRate < 75
                            ? '#d97706'
                            : '#059669',
                      meta: '75%',
                    },
                    {
                      label: 'Desempenho',
                      value: selected.averageScore * 10,
                      color:
                        selected.averageScore < 5
                          ? '#e11d48'
                          : selected.averageScore < 6
                            ? '#d97706'
                            : '#059669',
                      meta: '60%',
                    },
                  ].map(({ label, value, color, meta }) => (
                    <div key={label} className="rounded-xl border-2 border-stone-200 bg-white p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-stone-600 font-['Outfit']">{label}</span>
                        <span className="text-[13px] font-bold font-['Fraunces']" style={{ color }}>
                          {Math.round(value)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100 border border-stone-200">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${Math.min(100, value)}%`,
                            backgroundColor: color,
                            transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)',
                          }}
                        />
                      </div>
                      <p className="mt-1.5 text-[9px] font-semibold text-stone-400 font-['Outfit']">
                        Meta: {meta}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 p-6">
                {/* Why alert */}
                <div className="overflow-hidden rounded-2xl border-2 border-rose-300">
                  <div className="flex items-center gap-2 border-b-2 border-rose-200 bg-rose-50 px-4 py-3">
                    <AlertTriangle size={14} className="text-rose-600" />
                    <Label className="text-rose-700">Por que está em alerta</Label>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {lowAtt && (
                      <div className="flex items-start gap-3 rounded-xl bg-rose-50 border-2 border-rose-200 p-3.5">
                        <AlertOctagon size={14} className="text-rose-500 mt-0.5 shrink-0" />
                        <p className="text-xs font-medium text-stone-700 font-['Outfit']">
                          Frequência em{' '}
                          <strong className="font-bold text-rose-700">{selected.attendanceRate}%</strong>,
                          abaixo do limite de 75%.
                        </p>
                      </div>
                    )}
                    {lowScore && (
                      <div className="flex items-start gap-3 rounded-xl bg-rose-50 border-2 border-rose-200 p-3.5">
                        <TrendingDown size={14} className="text-rose-500 mt-0.5 shrink-0" />
                        <p className="text-xs font-medium text-stone-700 font-['Outfit']">
                          Média{' '}
                          <strong className="font-bold text-rose-700">{selected.averageScore.toFixed(1)}</strong>,
                          abaixo da referência de 6,0.
                        </p>
                      </div>
                    )}
                    {critical && (
                      <div className="flex items-start gap-3 rounded-xl bg-rose-100 border-2 border-rose-300 p-3.5">
                        <ShieldAlert size={14} className="text-rose-600 mt-0.5 shrink-0" />
                        <p className="text-xs font-bold text-rose-900 font-['Outfit']">
                          Alerta combinado: baixa presença e baixo desempenho. Requer intervenção imediata.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="overflow-hidden rounded-2xl border-2 border-indigo-300">
                  <div className="flex items-center gap-2 border-b-2 border-indigo-200 bg-indigo-50 px-4 py-3">
                    <Lightbulb size={14} className="text-indigo-600" />
                    <Label className="text-indigo-700">Próximas ações recomendadas</Label>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {[
                      lowAtt ? 'Iniciar busca ativa e registrar devolutiva da família.' : null,
                      lowScore ? 'Planejar recuperação focalizada com verificação de aprendizagem.' : null,
                      'Cruzar o plano de aula com o desempenho individual.',
                    ]
                      .filter(Boolean)
                      .map((action, i) => (
                        <div
                          key={String(action)}
                          className="flex items-start gap-3 rounded-xl border-2 border-indigo-200 bg-indigo-50/60 px-4 py-3"
                        >
                          <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-600 text-white">
                            <span className="text-[9px] font-black">{i + 1}</span>
                          </div>
                          <p className="text-xs font-medium text-indigo-900 font-['Outfit']">{action}</p>
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

/* ─── Lesson Modal Skeleton ──────────────────────────────────────────────── */
function LessonSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Bone className="h-64 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Bone className="h-48 rounded-2xl" />
        <Bone className="h-48 rounded-2xl" />
      </div>
      <Bone className="h-56 rounded-2xl" />
    </div>
  )
}

/* ─── Info KPI (modal) ───────────────────────────────────────────────────── */
function InfoKpi({
  label,
  value,
  detail,
  icon,
  tone = 'indigo',
  delay = 0,
}: {
  label: string
  value: number
  detail: string
  icon: ReactNode
  tone?: Tone
  delay?: number
}) {
  const cfg = {
    indigo: 'bg-indigo-50 border-2 border-indigo-300 text-indigo-700',
    emerald: 'bg-emerald-50 border-2 border-emerald-300 text-emerald-700',
    amber: 'bg-amber-50 border-2 border-amber-300 text-amber-700',
    rose: 'bg-rose-50 border-2 border-rose-300 text-rose-700',
  }[tone]
  const iconCfg = {
    indigo: 'bg-white border-2 border-indigo-300 text-indigo-600',
    emerald: 'bg-white border-2 border-emerald-300 text-emerald-600',
    amber: 'bg-white border-2 border-amber-300 text-amber-600',
    rose: 'bg-white border-2 border-rose-300 text-rose-600',
  }[tone]

  return (
    <FadeUp delay={delay}>
      <article className={`rounded-2xl p-4 shadow-sm ${cfg}`}>
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${iconCfg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <Label className="mb-0.5">{label}</Label>
            <p className="text-2xl font-bold leading-tight font-['Fraunces']">
              <Counter to={value} />
            </p>
            <p className="text-[10px] font-semibold opacity-70 font-['Outfit']">{detail}</p>
          </div>
        </div>
      </article>
    </FadeUp>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
export function PedagogicalDashboard({
  classes,
  students,
  teachers,
  lessonRecords,
  evaluations = [],
  evaluationCorrections = [],
}: PedagogicalDashboardProps) {
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
    const t = window.setTimeout(() => setLessonLoading(false), 800)
    return () => window.clearTimeout(t)
  }, [lessonModal, lessonClassFilter])

  const getClassName = (id: string) => classes.find((c) => c.id === id)?.name ?? 'Turma não localizada'
  const openLesson = (classId = 'all') => {
    setLessonClassFilter(classId)
    setLessonModal(true)
  }

  /* ── Scoped data ── */
  const scopeClasses = classFilter === 'all' ? classes : classes.filter((c) => c.id === classFilter)
  const scopeIds = new Set(scopeClasses.map((c) => c.id))
  const scopeStudents = classFilter === 'all' ? students : students.filter((s) => scopeIds.has(s.classId))

  const avgScore = scopeStudents.length
    ? scopeStudents.reduce((a, s) => a + s.averageScore, 0) / scopeStudents.length
    : 0
  const avgAtt = getAverageLessonAttendanceRate(scopeStudents, lessonRecords)

  const lowAttScope = scopeStudents.filter((s) => getDerivedAtt(s) < 75)
  const lowScoreScope = scopeStudents.filter((s) => s.averageScore < 6)

  const alertStudents = [
    ...students.filter((s) => getDerivedAtt(s) < 75),
    ...students.filter((s) => s.averageScore < 6),
  ]
    .filter((s, i, a) => a.findIndex((x) => x.id === s.id) === i)
    .sort((a, b) => {
      const aA = getDerivedAtt(a)
      const bA = getDerivedAtt(b)
      const ac = aA < 75 && a.averageScore < 6 ? 1 : 0
      const bc = bA < 75 && b.averageScore < 6 ? 1 : 0
      return bc - ac || aA - bA || a.averageScore - b.averageScore
    })

  /* ── Class summaries ── */
  const classSummaries: ClassSummary[] = classes
    .map((cr) => {
      const cls = students.filter((s) => s.classId === cr.id)
      const lowAtt = cls.filter((s) => getDerivedAtt(s) < 75).length
      const lowSc = cls.filter((s) => s.averageScore < 6).length
      const alerts = new Set(
        cls.filter((s) => getDerivedAtt(s) < 75 || s.averageScore < 6).map((s) => s.id),
      ).size
      const score = cls.length ? cls.reduce((a, s) => a + s.averageScore, 0) / cls.length : null
      const att = cls.length ? getAverageLessonAttendanceRate(cls, lessonRecords) : null
      const teacher =
        teachers.find((t) => t.id === cr.teacherId || (cr.teacherIds ?? []).includes(t.id))?.name ??
        'Professor pendente'
      const intv =
        cls.length === 0
          ? 'Aguardar alunos vinculados'
          : lowAtt > 0 && lowSc > 0
            ? 'Priorizar busca ativa e recuperação'
            : lowAtt > 0
              ? 'Busca ativa e contato familiar'
              : lowSc > 0
                ? 'Planejar recuperação e apoio'
                : 'Sem intervenção imediata'
      return {
        classRoom: cr,
        studentsCount: cls.length,
        lowAttendanceCount: lowAtt,
        lowScoreCount: lowSc,
        alertCount: alerts,
        score,
        attendance: att,
        teacherName: teacher,
        intervention: intv,
        status: cls.length === 0 ? 'Sem dados' : alerts > 0 ? 'Em atencao' : 'Estavel',
      }
    })
    .sort((a, b) => b.alertCount - a.alertCount || (a.attendance ?? 101) - (b.attendance ?? 101))

  const scopeSummaries =
    classFilter === 'all' ? classSummaries : classSummaries.filter((s) => scopeIds.has(s.classRoom.id))

  /* ── Chart data ── */
  const classChartData = scopeSummaries.map((s) => ({
    name:
      s.classRoom.name.length > 10 ? `${s.classRoom.name.slice(0, 10)}…` : s.classRoom.name,
    frequencia: s.attendance ?? 0,
    desempenho: s.score === null ? 0 : Number((s.score * 10).toFixed(1)),
    alertas: s.alertCount,
  }))
  const chartMin = Math.max(480, classChartData.length * 110)
  const bsz = classChartData.length > 6 ? 14 : classChartData.length > 3 ? 20 : 26

  const stableCount = scopeSummaries.filter((s) => s.status === 'Estavel').length
  const attentionCount = scopeSummaries.filter((s) => s.status === 'Em atencao').length
  const noDataCount = scopeSummaries.filter((s) => s.status === 'Sem dados').length

  const statusPieData = [
    { name: 'Estáveis', value: stableCount, color: '#059669' },
    { name: 'Em atenção', value: attentionCount, color: '#d97706' },
    { name: 'Sem dados', value: noDataCount, color: '#a8a29e' },
  ].filter((i) => i.value > 0)

  /* ── Lesson modal data ── */
  const recByClass = lessonRecords.reduce<Record<string, number>>((a, r) => {
    a[r.classId] = (a[r.classId] ?? 0) + 1
    return a
  }, {})
  const noRecordCls = classSummaries.filter((s) => (recByClass[s.classRoom.id] ?? 0) === 0)
  const withDataCls = classSummaries.filter((s) => s.studentsCount > 0)
  const coverage = Math.round((withDataCls.length / Math.max(classSummaries.length, 1)) * 100)
  const recurrentAlerts = students.filter((s) => getDerivedAtt(s) < 75 && s.averageScore < 6)

  const scopedRecs =
    lessonClassFilter === 'all'
      ? lessonRecords
      : lessonRecords.filter((r) => r.classId === lessonClassFilter)

  const lessonClassChart = classSummaries
    .map((s) => {
      const recs = lessonRecords.filter((r) => r.classId === s.classRoom.id)
      return {
        id: s.classRoom.id,
        name:
          s.classRoom.name.length > 10 ? `${s.classRoom.name.slice(0, 10)}…` : s.classRoom.name,
        registros: recs.length,
        planos: recs.filter((r) => r.plan.trim()).length,
        recursos: recs.filter((r) => r.resources.trim()).length,
      }
    })
    .filter((i) => lessonClassFilter === 'all' || i.id === lessonClassFilter)
    .filter((i) => i.registros > 0 || i.planos > 0)

  const subjectData = Object.values(
    scopedRecs.reduce<Record<string, { name: string; value: number }>>((a, r) => {
      const sub = getAcademicSubjectLabel(r.subject).trim() || 'Sem matéria'
      a[sub] = a[sub] ? { ...a[sub], value: a[sub].value + 1 } : { name: sub, value: 1 }
      return a
    }, {}),
  )
  const resourceData = [
    { name: 'Com recursos', value: scopedRecs.filter((r) => r.resources.trim()).length },
    { name: 'Sem recursos', value: scopedRecs.filter((r) => !r.resources.trim()).length },
  ].filter((i) => i.value > 0)

  const planCount = scopedRecs.filter((r) => r.plan.trim()).length
  const resourceCount = scopedRecs.filter((r) => r.resources.trim()).length
  const activityCount = scopedRecs.filter((r) => r.activity.trim()).length

  const subjectColors: Record<string, string> = {}
  subjectData.forEach((s, i) => {
    subjectColors[s.name] = CHART_PALETTE[i % CHART_PALETTE.length]
  })

  const selectedAlertForModal = selectedAlertId ?? alertStudents[0]?.id ?? null
  const visibleLessonRecords =
    classFilter === 'all'
      ? lessonRecords
      : lessonRecords.filter((record) => scopeIds.has(record.classId))
  const recentLessonRecords = [...visibleLessonRecords]
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .slice(0, 5)
  const visibleSubjectData = Object.values(
    visibleLessonRecords.reduce<Record<string, { name: string; value: number }>>((acc, record) => {
      const subject = getAcademicSubjectLabel(record.subject).trim() || 'Sem matéria'
      acc[subject] = acc[subject]
        ? { ...acc[subject], value: acc[subject].value + 1 }
        : { name: subject, value: 1 }
      return acc
    }, {}),
  ).sort((a, b) => b.value - a.value)
  const maxSubjectRecords = Math.max(1, ...visibleSubjectData.map((subject) => subject.value))
  const maxClassRecordCount = Math.max(
    1,
    ...scopeSummaries.map((summary) => recByClass[summary.classRoom.id] ?? 0),
  )
  const latestRecordDate = recentLessonRecords[0]?.date ?? null
  const evaluationById = new Map(evaluations.map((evaluation) => [evaluation.id, evaluation]))
  const subjectDifficultyData = Object.values(
    evaluationCorrections.reduce<Record<string, {
      subject: string
      attempts: number
      performanceTotal: number
      totalCorrect: number
      totalQuestions: number
    }>>((acc, correction) => {
      const evaluation = evaluationById.get(correction.evaluationId)
      const correctionClassId = correction.classId || evaluation?.classId
      if (!correctionClassId || !scopeIds.has(correctionClassId)) return acc
      if (correction.status === 'REJECTED' || correction.status === 'NEEDS_RETAKE') return acc

      const rawSubject = correction.subject || evaluation?.subject || ''
      const subject = getAcademicSubjectLabel(rawSubject).trim() || 'Sem matéria'
      const totalQuestions = Math.max(0, Number(correction.totalQuestions ?? 0) || 0)
      const correctCount = Math.max(0, Number(correction.correctCount ?? 0) || 0)
      const score = correction.finalScore ?? correction.suggestedScore
      const performance =
        totalQuestions > 0
          ? Math.min(100, (correctCount / totalQuestions) * 100)
          : typeof score === 'number' && Number.isFinite(score)
            ? Math.min(100, Math.max(0, score * 10))
            : null

      if (performance === null) return acc

      const current = acc[subject] ?? {
        subject,
        attempts: 0,
        performanceTotal: 0,
        totalCorrect: 0,
        totalQuestions: 0,
      }
      current.attempts += 1
      current.performanceTotal += performance
      current.totalCorrect += correctCount
      current.totalQuestions += totalQuestions
      acc[subject] = current
      return acc
    }, {}),
  )
    .map((item) => {
      const averagePerformance = item.attempts ? Math.round(item.performanceTotal / item.attempts) : 0
      return {
        ...item,
        averagePerformance,
        difficulty: Math.max(0, 100 - averagePerformance),
        averageScore: Number((averagePerformance / 10).toFixed(1)),
      }
    })
    .sort((a, b) => b.difficulty - a.difficulty || b.attempts - a.attempts || a.subject.localeCompare(b.subject, 'pt-BR'))
  const maxSubjectDifficulty = Math.max(1, ...subjectDifficultyData.map((subject) => subject.difficulty))

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <main className="space-y-7">
        <FadeUp delay={0}>
          <div className="flex flex-col gap-3 rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-indigo-200 bg-indigo-50 text-indigo-600">
                <GraduationCap size={20} />
              </div>
              <div className="min-w-0">
                <Label className="mb-1 text-indigo-500">Painel pedagógico</Label>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-stone-500 font-['Outfit']">
                  <span className="text-stone-900">
                    {classFilter === 'all'
                      ? 'Todas as turmas'
                      : classes.find((c) => c.id === classFilter)?.name ?? 'Turma'}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span>{scopeStudents.length} alunos</span>
                  <span className="text-stone-300">•</span>
                  <span>
                    {scopeClasses.length} turma{scopeClasses.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span>{latestRecordDate ? `Último registro: ${latestRecordDate}` : 'Sem registros recentes'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-10 rounded-xl border-2 border-stone-300 bg-stone-50 px-3 text-xs font-bold text-stone-700 shadow-sm outline-none transition-all font-['Outfit'] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">Todas as turmas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openLesson(classFilter)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-indigo-300 bg-indigo-600 px-4 text-xs font-black text-white shadow-sm transition-all hover:bg-indigo-700 font-['Outfit']"
              >
                <ClipboardList size={14} />
                Registros
              </button>
            </div>
          </div>
        </FadeUp>

        <section>
          <SectionDivider label="Indicadores gerais" icon={<BarChart2 size={13} />} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Alunos"
              value={String(scopeStudents.length)}
              numericValue={scopeStudents.length}
              sub="Total no escopo atual"
              tone="indigo"
              icon={<Users size={16} />}
              delay={0}
            />
            <KpiCard
              label="Frequência"
              value={`${avgAtt}%`}
              sub={avgAtt >= 75 ? 'Acima da meta de 75%' : 'Abaixo da meta de 75%'}
              tone={avgAtt < 75 ? 'rose' : 'emerald'}
              icon={<CalendarDays size={16} />}
              ring={avgAtt}
              delay={70}
            />
            <KpiCard
              label="Desempenho"
              value={`${Math.round((avgScore / 10) * 100)}%`}
              sub={`Nota média ${avgScore.toFixed(1)} de 10`}
              tone={avgScore < 6 ? 'amber' : 'indigo'}
              icon={<TrendingUp size={16} />}
              ring={(avgScore / 10) * 100}
              delay={140}
            />
            <KpiCard
              label="Em alerta"
              value={String(alertStudents.length)}
              numericValue={alertStudents.length}
              sub="Alunos com baixa frequência ou média"
              tone={alertStudents.length > 0 ? 'rose' : 'emerald'}
              icon={<AlertTriangle size={16} />}
              delay={210}
              onClick={
                alertStudents.length > 0
                  ? () => {
                      setSelectedAlertId(selectedAlertForModal)
                      setAlertModal(true)
                    }
                  : undefined
              }
            />
          </div>
        </section>

        <section>
          <SectionDivider label="Turmas e desempenho" icon={<School size={13} />} />
          <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-3">
              {scopeSummaries.length > 0 ? (
                scopeSummaries.map((summary, index) => {
                  const attendance = summary.attendance ?? 0
                  const performance = summary.score === null ? 0 : Number((summary.score * 10).toFixed(1))
                  const recordCount = recByClass[summary.classRoom.id] ?? 0
                  return (
                    <FadeUp key={summary.classRoom.id} delay={index * 55}>
                      <article className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-indigo-200 bg-indigo-50 text-sm font-black text-indigo-600 font-['Outfit']">
                              {summary.classRoom.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-stone-900 font-['Fraunces']">
                                {summary.classRoom.name}
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-['Outfit']">
                                {summary.classRoom.grade} • {summary.classRoom.shift}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={summary.status} />
                        </div>

                        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-500 font-['Outfit']">
                          <GraduationCap size={14} className="text-stone-400" />
                          <span>{summary.teacherName}</span>
                          <span className="text-stone-300">•</span>
                          <span>{summary.studentsCount} alunos</span>
                          <span className="text-stone-300">•</span>
                          <span>{recordCount} registros</span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <div className="mb-1.5 flex justify-between text-xs font-bold font-['Outfit']">
                              <span className="text-stone-500">Frequência</span>
                              <span className={attendance < 75 ? 'text-rose-600' : 'text-emerald-600'}>
                                {summary.attendance === null ? 'Sem dados' : `${attendance}%`}
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                              <div
                                className={`h-full rounded-full ${attendance < 75 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, attendance)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="mb-1.5 flex justify-between text-xs font-bold font-['Outfit']">
                              <span className="text-stone-500">Desempenho</span>
                              <span className={performance < 60 ? 'text-amber-600' : 'text-indigo-600'}>
                                {summary.score === null ? 'Sem dados' : `${performance}%`}
                              </span>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                              <div
                                className={`h-full rounded-full ${performance < 60 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(100, performance)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {summary.alertCount > 0 && (
                          <button
                            type="button"
                            onClick={() => openLesson(summary.classRoom.id)}
                            className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-left text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 font-['Outfit']"
                          >
                            <span className="inline-flex items-center gap-2">
                              <AlertTriangle size={14} />
                              {summary.alertCount} aluno{summary.alertCount !== 1 ? 's' : ''} em atenção
                            </span>
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </article>
                    </FadeUp>
                  )
                })
              ) : (
                <Panel delay={0}>
                  <div className="py-14 text-center">
                    <GraduationCap size={40} className="mx-auto mb-3 text-stone-300" />
                    <p className="text-sm font-semibold text-stone-400 font-['Outfit']">Nenhuma turma no escopo</p>
                  </div>
                </Panel>
              )}
            </div>

            <div className="space-y-4">
              <Panel delay={80}>
                <PanelHead
                  icon={<BookOpen size={15} />}
                  title="Dificuldade por matéria"
                  sub={`${subjectDifficultyData.length} matéria${subjectDifficultyData.length !== 1 ? 's' : ''} com correções`}
                  tone={subjectDifficultyData.some((subject) => subject.difficulty >= 40) ? 'rose' : 'indigo'}
                />
                <div className="space-y-3.5 p-5">
                  {subjectDifficultyData.length > 0 ? (
                    subjectDifficultyData.map((subject, index) => (
                      <div key={subject.subject}>
                        <div className="mb-1.5 flex justify-between text-xs font-bold font-['Outfit']">
                          <span className="truncate text-stone-600">{subject.subject}</span>
                          <span className={subject.difficulty >= 40 ? 'text-rose-600' : subject.difficulty >= 25 ? 'text-amber-600' : 'text-emerald-600'}>
                            {subject.difficulty}% dificuldade
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(8, (subject.difficulty / maxSubjectDifficulty) * 100)}%`,
                              backgroundColor:
                                subject.difficulty >= 40
                                  ? '#e11d48'
                                  : subject.difficulty >= 25
                                    ? '#d97706'
                                    : CHART_PALETTE[index % CHART_PALETTE.length],
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[10px] font-semibold text-stone-400 font-['Outfit']">
                          Média {subject.averageScore.toFixed(1)} · {subject.attempts} correção{subject.attempts !== 1 ? 'ões' : ''}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center">
                      <BookOpen size={34} className="mx-auto mb-3 text-stone-300" />
                      <p className="text-sm font-semibold text-stone-400 font-['Outfit']">
                        Sem correções suficientes para calcular dificuldade
                      </p>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel delay={130}>
                <PanelHead
                  icon={<ClipboardList size={15} />}
                  title="Cobertura de registros"
                  sub={`${coverage}% das turmas com alunos`}
                  tone={coverage >= 80 ? 'emerald' : coverage >= 50 ? 'amber' : 'rose'}
                  actions={
                    <ActionBtn onClick={() => openLesson(classFilter)} icon={<Eye size={11} />} size="xs">
                      Ver diário
                    </ActionBtn>
                  }
                />
                <div className="space-y-3 p-5">
                  {scopeSummaries.map((summary, index) => {
                    const recordCount = recByClass[summary.classRoom.id] ?? 0
                    return (
                      <div key={summary.classRoom.id}>
                        <div className="mb-1.5 flex justify-between text-xs font-bold font-['Outfit']">
                          <span className="truncate text-stone-600">{summary.classRoom.name}</span>
                          <span className={recordCount > 0 ? 'text-emerald-600' : 'text-stone-400'}>
                            {recordCount}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className={recordCount > 0 ? 'h-full rounded-full bg-emerald-500' : 'h-full rounded-full bg-stone-300'}
                            style={{
                              width:
                                recordCount > 0
                                  ? `${Math.max(12, (recordCount / maxClassRecordCount) * 100)}%`
                                  : '0%',
                            }}
                          />
                        </div>
                        {index < scopeSummaries.length - 1 && <div className="mt-3 border-b border-stone-100" />}
                      </div>
                    )
                  })}
                </div>
              </Panel>
            </div>
          </div>
        </section>

        <section>
          <SectionDivider label="Comparativo por turma" icon={<Activity size={13} />} />
          <Panel delay={120} className="mt-3">
            <PanelHead
              icon={<BarChart3 size={15} />}
              title="Frequência, desempenho e alertas"
              sub="Dados consolidados por turma"
              tone="violet"
            />
            <div className="flex flex-wrap items-center gap-4 px-5 pt-4 pb-1">
              {[
                { color: '#059669', label: 'Frequência (%)' },
                { color: '#4f46e5', label: 'Desempenho (%)' },
                { color: '#e11d48', label: 'Alertas (qtd)' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="h-3 w-5 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-bold text-stone-500 font-['Outfit']">{label}</span>
                </div>
              ))}
            </div>
            <div className="h-72 overflow-x-auto px-4 pb-4">
              {classChartData.length > 0 ? (
                <div className="h-full" style={{ minWidth: chartMin }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classChartData}
                      margin={{ top: 28, right: 36, left: -16, bottom: 24 }}
                      barCategoryGap="30%"
                      barGap={4}
                    >
                      <CartesianGrid strokeDasharray="3 0" vertical={false} stroke="#f5f5f4" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#78716c', fontFamily: 'Outfit' }}
                        interval={0}
                        angle={-8}
                        textAnchor="end"
                        height={42}
                        tickLine={false}
                        axisLine={{ stroke: '#d6d3d1' }}
                      />
                      <YAxis
                        yAxisId="pct"
                        domain={[0, 100]}
                        tickFormatter={fmtPct}
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#a8a29e', fontFamily: 'Outfit' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="count"
                        orientation="right"
                        allowDecimals={false}
                        tick={{ fontSize: 9, fontWeight: 700, fill: '#a8a29e', fontFamily: 'Outfit' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#fafaf9', radius: 6 }} />
                      <Bar
                        yAxisId="pct"
                        dataKey="frequencia"
                        name="Frequência (%)"
                        fill="#059669"
                        radius={[6, 6, 0, 0]}
                        barSize={bsz}
                        animationDuration={1000}
                      >
                        <LabelList
                          dataKey="frequencia"
                          position="top"
                          formatter={fmtPct}
                          style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'Outfit' }}
                        />
                      </Bar>
                      <Bar
                        yAxisId="pct"
                        dataKey="desempenho"
                        name="Desempenho (%)"
                        fill="#4f46e5"
                        radius={[6, 6, 0, 0]}
                        barSize={bsz}
                        animationBegin={150}
                        animationDuration={1000}
                      >
                        <LabelList
                          dataKey="desempenho"
                          position="top"
                          formatter={fmtPct}
                          style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'Outfit' }}
                        />
                      </Bar>
                      <Bar
                        yAxisId="count"
                        dataKey="alertas"
                        name="Alertas (qtd)"
                        fill="#e11d48"
                        radius={[6, 6, 0, 0]}
                        barSize={bsz}
                        animationBegin={300}
                        animationDuration={1000}
                      >
                        <LabelList
                          dataKey="alertas"
                          position="top"
                          formatter={fmt}
                          style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'Outfit' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm font-semibold text-stone-400 font-['Outfit']">Nenhuma turma disponível</p>
                </div>
              )}
            </div>
          </Panel>
        </section>

        <section>
          <SectionDivider label="Alunos em alerta" icon={<AlertCircle size={13} />} />
          <Panel delay={150} className="mt-3">
            <PanelHead
              icon={<AlertCircle size={15} />}
              tone="rose"
              title="Alunos que precisam de atenção"
              sub={`${alertStudents.length} aluno${alertStudents.length !== 1 ? 's' : ''} identificado${alertStudents.length !== 1 ? 's' : ''}`}
              actions={
                alertStudents.length > 0 ? (
                  <ActionBtn
                    tone="rose"
                    onClick={() => {
                      setSelectedAlertId(selectedAlertForModal)
                      setAlertModal(true)
                    }}
                    icon={<Eye size={11} />}
                    size="xs"
                  >
                    Ver todos
                  </ActionBtn>
                ) : undefined
              }
            />
            {alertStudents.length > 0 ? (
              <div className="grid gap-2.5 p-4 md:grid-cols-2 xl:grid-cols-3">
                {alertStudents.slice(0, 9).map((student, index) => (
                  <AlertCard
                    key={student.id}
                    student={student}
                    className={getClassName(student.classId)}
                    delay={index * 45}
                    onOpen={() => {
                      setSelectedAlertId(student.id)
                      setAlertModal(true)
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400" />
                <p className="text-sm font-bold text-stone-400 font-['Outfit']">Nenhum aluno em alerta no escopo</p>
              </div>
            )}
          </Panel>
        </section>

        <section>
          <SectionDivider label="Registros recentes de aula" icon={<BookOpenCheck size={13} />} />
          <Panel delay={180} className="mt-3">
            <PanelHead
              icon={<BookOpen size={15} />}
              title="Registros de aula"
              sub={`${visibleLessonRecords.length} registro${visibleLessonRecords.length !== 1 ? 's' : ''} no escopo`}
              tone="stone"
              actions={
                <ActionBtn onClick={() => openLesson(classFilter)} icon={<ClipboardList size={11} />} size="xs">
                  Ver diário
                </ActionBtn>
              }
            />
            {recentLessonRecords.length > 0 ? (
              <div className="space-y-3 p-4">
                {recentLessonRecords.map((record, index) => (
                  <FadeUp key={record.id} delay={index * 45}>
                    <article className="rounded-2xl border-2 border-stone-200 bg-stone-50/70 p-4 transition-colors hover:bg-white">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 font-['Outfit']">
                          {getClassName(record.classId)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 font-['Outfit']">
                          <CalendarDays size={12} />
                          {record.date}
                        </span>
                        <span className="rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-stone-500 font-['Outfit']">
                          {getAcademicSubjectLabel(record.subject) || 'Sem matéria'}
                        </span>
                      </div>
                      <p className="mb-3 text-sm font-bold text-stone-900 font-['Fraunces']">
                        {record.content || 'Conteúdo não informado'}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <Label className="mb-0.5">Plano</Label>
                          <p className="truncate text-xs font-semibold text-stone-700 font-['Outfit']">
                            {record.plan || 'Não informado'}
                          </p>
                        </div>
                        <div>
                          <Label className="mb-0.5">Recursos</Label>
                          <p className="truncate text-xs font-semibold text-stone-700 font-['Outfit']">
                            {record.resources || 'Não informado'}
                          </p>
                        </div>
                        <div>
                          <Label className="mb-0.5">Atividade</Label>
                          <p className="truncate text-xs font-semibold text-stone-700 font-['Outfit']">
                            {record.activity || 'Não informada'}
                          </p>
                        </div>
                      </div>
                    </article>
                  </FadeUp>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <FileText size={36} className="mx-auto mb-3 text-stone-300" />
                <p className="text-sm font-semibold text-stone-400 font-['Outfit']">Nenhum registro encontrado</p>
              </div>
            )}
          </Panel>
        </section>
      </main>

      {false && (
        <>

      {/* ── Tabs ── */}
      <FadeUp delay={0}>
        <div className="flex items-center gap-1.5 rounded-2xl border-2 border-stone-300 bg-stone-100 p-1.5 w-fit mb-2">
          {[
            { id: 'general', label: 'Visão Geral', icon: <LayoutDashboard size={14} /> },
            { id: 'action', label: 'Ação Pedagógica', icon: <Target size={14} /> },
          ].map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id as typeof tab)}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-bold transition-all duration-200 font-['Outfit'] ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-stone-500 hover:bg-white hover:text-stone-800 hover:shadow-sm'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>
      </FadeUp>

      {/* ── Filter bar ── */}
      <FadeUp delay={60}>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-stone-300 bg-white px-5 py-3.5 shadow-sm mb-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-[pulse-dot_2s_ease-in-out_infinite]" />
            <p className="text-xs font-bold text-stone-900 font-['Outfit']">
              {classFilter === 'all'
                ? 'Todas as turmas'
                : classes.find((c) => c.id === classFilter)?.name ?? 'Turma'}
            </p>
            <span className="text-stone-300">·</span>
            <span className="text-xs font-semibold text-stone-400 font-['Outfit']">
              {scopeStudents.length} alunos
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-xs font-semibold text-stone-400 font-['Outfit']">
              {scopeClasses.length} turma{scopeClasses.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="ml-auto">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-9 rounded-xl border-2 border-stone-300 bg-stone-50 px-3 text-xs font-semibold text-stone-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-['Outfit']"
            >
              <option value="all">Todas as turmas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FadeUp>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* GENERAL TAB                                                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {tab === 'general' && (
        <div className="space-y-6 mt-1">
          <div>
            <SectionDivider label="Indicadores gerais" icon={<BarChart2 size={13} />} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mt-3">
              <KpiCard
                label="Frequência geral"
                value={`${avgAtt}%`}
                sub={avgAtt >= 75 ? '✓ Acima da meta de 75%' : '✗ Abaixo da meta de 75%'}
                tone={avgAtt < 75 ? 'rose' : 'emerald'}
                icon={<Activity size={16} />}
                ring={avgAtt}
                delay={0}
              />
              <KpiCard
                label="Desempenho médio"
                value={`${Math.round((avgScore / 10) * 100)}%`}
                sub={`Nota média ${avgScore.toFixed(1)} de 10`}
                tone={avgScore < 6 ? 'amber' : 'indigo'}
                icon={<Award size={16} />}
                ring={(avgScore / 10) * 100}
                delay={70}
              />
              <KpiCard
                label="Baixa frequência"
                value={String(lowAttScope.length)}
                numericValue={lowAttScope.length}
                sub="Alunos abaixo de 75%"
                tone="rose"
                icon={<Bell size={16} />}
                delay={140}
              />
              <KpiCard
                label="Queda de desempenho"
                value={String(lowScoreScope.length)}
                numericValue={lowScoreScope.length}
                sub="Alunos com média < 6,0"
                tone="amber"
                icon={<TrendingDown size={16} />}
                delay={210}
              />
            </div>
          </div>

          <div>
            <SectionDivider label="Análise por turma" icon={<School size={13} />} />
            <div className="grid gap-4 lg:grid-cols-[1fr_300px] mt-3">
              {/* Bar chart */}
              <Panel delay={0}>
                <PanelHead
                  icon={<BarChart3 size={15} />}
                  title="Frequência e desempenho por turma"
                  sub="Porcentagem consolidada"
                  tone="indigo"
                  actions={
                    <ActionBtn
                      onClick={() => openLesson(classFilter)}
                      icon={<ClipboardList size={11} />}
                      size="xs"
                    >
                      Registros
                    </ActionBtn>
                  }
                />
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 px-5 pt-4 pb-1">
                  {[
                    { color: '#059669', label: 'Frequência (%)' },
                    { color: '#4f46e5', label: 'Desempenho (%)' },
                    { color: '#e11d48', label: 'Alertas (qtd)' },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="h-3 w-5 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="text-[10px] font-bold text-stone-500 font-['Outfit']">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="h-72 overflow-x-auto px-4 pb-4">
                  {classChartData.length > 0 ? (
                    <div className="h-full" style={{ minWidth: chartMin }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={classChartData}
                          margin={{ top: 28, right: 36, left: -16, bottom: 24 }}
                          barCategoryGap="30%"
                          barGap={4}
                        >
                          <CartesianGrid strokeDasharray="3 0" vertical={false} stroke="#f5f5f4" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#78716c', fontFamily: 'Outfit' }}
                            interval={0}
                            angle={-8}
                            textAnchor="end"
                            height={42}
                            tickLine={false}
                            axisLine={{ stroke: '#d6d3d1' }}
                          />
                          <YAxis
                            yAxisId="pct"
                            domain={[0, 100]}
                            tickFormatter={fmtPct}
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#a8a29e', fontFamily: 'Outfit' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            yAxisId="count"
                            orientation="right"
                            allowDecimals={false}
                            tick={{ fontSize: 9, fontWeight: 700, fill: '#a8a29e', fontFamily: 'Outfit' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: '#fafaf9', radius: 6 }} />
                          <Bar
                            yAxisId="pct"
                            dataKey="frequencia"
                            name="Frequência (%)"
                            fill="#059669"
                            radius={[6, 6, 0, 0]}
                            barSize={bsz}
                            animationDuration={1000}
                          >
                            <LabelList
                              dataKey="frequencia"
                              position="top"
                              formatter={fmtPct}
                              style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'Outfit' }}
                            />
                          </Bar>
                          <Bar
                            yAxisId="pct"
                            dataKey="desempenho"
                            name="Desempenho (%)"
                            fill="#4f46e5"
                            radius={[6, 6, 0, 0]}
                            barSize={bsz}
                            animationBegin={150}
                            animationDuration={1000}
                          >
                            <LabelList
                              dataKey="desempenho"
                              position="top"
                              formatter={fmtPct}
                              style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'Outfit' }}
                            />
                          </Bar>
                          <Bar
                            yAxisId="count"
                            dataKey="alertas"
                            name="Alertas (qtd)"
                            fill="#e11d48"
                            radius={[6, 6, 0, 0]}
                            barSize={bsz}
                            animationBegin={300}
                            animationDuration={1000}
                          >
                            <LabelList
                              dataKey="alertas"
                              position="top"
                              formatter={fmt}
                              style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'Outfit' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm font-semibold text-stone-400 font-['Outfit']">
                        Nenhuma turma disponível
                      </p>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Pie chart */}
              <Panel delay={100}>
                <PanelHead
                  icon={<PieChartIcon size={15} />}
                  title="Situação das turmas"
                  sub="Distribuição por status"
                  tone="violet"
                />
                <div className="px-4 py-2 h-52">
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 10, right: 44, bottom: 10, left: 44 }}>
                        <Pie
                          data={statusPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={46}
                          outerRadius={68}
                          paddingAngle={5}
                          label={PieLabel}
                          labelLine={false}
                          animationDuration={1200}
                          animationBegin={200}
                        >
                          {statusPieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: '2px solid #e7e5e4',
                            fontWeight: 700,
                            fontSize: 11,
                            fontFamily: 'Outfit',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm text-stone-400 font-['Outfit']">Sem dados</p>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-5 space-y-2">
                  {[
                    { label: 'Estáveis', count: stableCount, color: '#059669', bg: 'bg-emerald-50 border-2 border-emerald-300' },
                    { label: 'Em atenção', count: attentionCount, color: '#d97706', bg: 'bg-amber-50 border-2 border-amber-300' },
                    { label: 'Sem dados', count: noDataCount, color: '#a8a29e', bg: 'bg-stone-50 border-2 border-stone-300' },
                  ]
                    .filter((i) => i.count > 0)
                    .map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 ${item.bg}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-[11px] font-bold text-stone-700 font-['Outfit']">{item.label}</span>
                        </div>
                        <span className="text-[13px] font-bold text-stone-900 tabular-nums font-['Fraunces']">
                          {item.count}
                        </span>
                      </div>
                    ))}
                </div>
              </Panel>
            </div>
          </div>

          {/* Difficulty Index */}
          <div>
            <SectionDivider label="Índice de dificuldade por disciplina" icon={<Flame size={13} />} />
            <Panel delay={180}>
              <PanelHead
                icon={<Percent size={15} />}
                tone="rose"
                title="Dificuldade por disciplina"
                sub="% de alunos com dificuldade"
              />
              <div className="p-5 space-y-4">
                {visibleSubjectData.map((subject, i) => {
                  const diff = Math.round((subject.value / maxSubjectRecords) * 100)
                  return (
                    <DiffBar
                      key={subject.name}
                      label={subject.name}
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
        <div className="space-y-6 mt-1">
          <div>
            <SectionDivider label="Prioridades pedagógicas" icon={<Target size={13} />} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mt-3">
              <KpiCard
                label="Turmas em atenção"
                value={String(attentionCount)}
                numericValue={attentionCount}
                sub="Com alertas pedagógicos"
                tone={attentionCount > 0 ? 'amber' : 'emerald'}
                icon={<AlertTriangle size={16} />}
                delay={0}
              />
              <KpiCard
                label="Alunos reincidentes"
                value={String(recurrentAlerts.length)}
                numericValue={recurrentAlerts.length}
                sub="Baixa freq. e média < 6"
                tone={recurrentAlerts.length > 0 ? 'rose' : 'emerald'}
                icon={<UserRound size={16} />}
                delay={70}
              />
              <KpiCard
                label="Sem registros"
                value={String(noRecordCls.length)}
                numericValue={noRecordCls.length}
                sub="Turmas sem diário"
                tone={noRecordCls.length > 0 ? 'amber' : 'emerald'}
                icon={<ClipboardList size={16} />}
                delay={140}
              />
              <KpiCard
                label="Cobertura"
                value={`${coverage}%`}
                sub={`${withDataCls.length} de ${classSummaries.length} turmas`}
                tone={coverage >= 80 ? 'emerald' : coverage >= 50 ? 'amber' : 'rose'}
                icon={<Layers size={16} />}
                ring={coverage}
                delay={210}
              />
            </div>
          </div>

          {/* Class radar */}
          <div>
            <SectionDivider label="Radar por turma" icon={<School size={13} />} />
            <Panel delay={60}>
              <PanelHead
                icon={<Layers size={15} />}
                title="Radar pedagógico"
                sub={`${classSummaries.length} turma${classSummaries.length !== 1 ? 's' : ''}`}
                actions={
                  <ActionBtn
                    onClick={() => openLesson()}
                    icon={<ClipboardList size={11} />}
                    size="xs"
                  >
                    Registros
                  </ActionBtn>
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
                <div className="py-16 text-center">
                  <GraduationCap size={40} className="text-stone-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-stone-400 font-['Outfit']">Nenhuma turma no escopo</p>
                </div>
              )}
            </Panel>
          </div>

          {/* Alert students */}
          <div>
            <SectionDivider label="Alunos em alerta" icon={<AlertCircle size={13} />} />
            <Panel delay={100}>
              <PanelHead
                icon={<AlertCircle size={15} />}
                tone="rose"
                title="Alunos que precisam de atenção"
                sub={`${alertStudents.length} aluno${alertStudents.length !== 1 ? 's' : ''} identificado${alertStudents.length !== 1 ? 's' : ''}`}
                actions={
                  alertStudents.length > 0 ? (
                    <ActionBtn
                      tone="rose"
                      onClick={() => {
                        setSelectedAlertId(selectedAlertForModal)
                        setAlertModal(true)
                      }}
                      icon={<Eye size={11} />}
                      size="xs"
                    >
                      Ver todos
                    </ActionBtn>
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
                      onOpen={() => {
                        setSelectedAlertId(st.id)
                        setAlertModal(true)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-bold text-stone-400 font-['Outfit']">
                    Nenhum aluno em alerta no escopo
                  </p>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      {/* ── Alert Modal ── */}
        </>
      )}

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
      {lessonModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="presentation"
            onMouseDown={() => setLessonModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 py-6"
            style={{
              background: 'rgba(28,25,23,0.4)',
              backdropFilter: 'blur(8px)',
              animation: 'fade-up .2s ease-out',
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => e.stopPropagation()}
              className="flex max-h-[calc(100dvh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border-2 border-stone-300 bg-white shadow-2xl"
              style={{ animation: 'scale-in .3s cubic-bezier(.16,1,.3,1)' }}
            >
              {/* Gradient strip */}
              <div className="h-1.5 w-full shrink-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />

              {/* Header */}
              <div className="flex items-center justify-between gap-4 border-b-2 border-stone-200 bg-stone-50 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-white border-2 border-indigo-700 shadow-sm">
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <Label className="mb-0.5 text-indigo-500">Diário de aula</Label>
                    <h2 className="text-base font-bold text-stone-900 leading-tight font-['Fraunces']">
                      Registros por turma
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <select
                    value={lessonClassFilter}
                    onChange={(e) => setLessonClassFilter(e.target.value)}
                    className="h-9 min-w-[170px] rounded-xl border-2 border-stone-300 bg-stone-50 px-3 text-xs font-bold outline-none font-['Outfit'] focus:border-indigo-400"
                  >
                    <option value="all">Todas as turmas</option>
                    {classSummaries.map((s) => (
                      <option key={s.classRoom.id} value={s.classRoom.id}>
                        {s.classRoom.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setLessonModal(false)}
                    className="grid h-9 w-9 place-items-center rounded-xl border-2 border-stone-300 bg-white text-stone-400 transition-all hover:border-rose-400 hover:bg-rose-50 hover:text-rose-500"
                    aria-label="Fechar"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="min-h-0 flex-1 overflow-y-auto bg-stone-50/60 p-5">
                {lessonLoading ? (
                  <LessonSkeleton />
                ) : (
                  <div className="space-y-4">
                    {/* KPIs */}
                    <div className="grid gap-3 sm:grid-cols-4">
                      <InfoKpi
                        label="Registros"
                        value={scopedRecs.length}
                        detail="Aulas registradas"
                        icon={<ClipboardList size={16} />}
                        delay={0}
                      />
                      <InfoKpi
                        label="Planos"
                        value={planCount}
                        detail="Com plano de aula"
                        tone="emerald"
                        icon={<BookMarked size={16} />}
                        delay={60}
                      />
                      <InfoKpi
                        label="Recursos"
                        value={resourceCount}
                        detail="Com materiais didáticos"
                        tone="amber"
                        icon={<Zap size={16} />}
                        delay={120}
                      />
                      <InfoKpi
                        label="Atividades"
                        value={activityCount}
                        detail="Atividades descritas"
                        tone="rose"
                        icon={<ListChecks size={16} />}
                        delay={180}
                      />
                    </div>

                    {/* Bar chart */}
                    <div className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Label className="mb-0.5 text-indigo-500">Por turma</Label>
                          <p className="text-sm font-bold text-stone-800 font-['Fraunces']">
                            Registros, planos e recursos
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {[
                            { color: '#4f46e5', label: 'Registros' },
                            { color: '#059669', label: 'Planos' },
                            { color: '#d97706', label: 'Recursos' },
                          ].map(({ color, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                              <span className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: color }} />
                              <span className="text-[10px] font-bold text-stone-500 font-['Outfit']">
                                {label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="h-52 overflow-x-auto">
                        {lessonClassChart.length > 0 ? (
                          <div
                            className="h-full"
                            style={{ minWidth: Math.max(380, lessonClassChart.length * 100) }}
                          >
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={lessonClassChart}
                                margin={{ top: 24, right: 12, left: -16, bottom: 20 }}
                                barCategoryGap="30%"
                                barGap={4}
                              >
                                <CartesianGrid strokeDasharray="3 0" vertical={false} stroke="#f5f5f4" />
                                <XAxis
                                  dataKey="name"
                                  tick={{ fontSize: 10, fontWeight: 700, fill: '#78716c', fontFamily: 'Outfit' }}
                                  interval={0}
                                  angle={-8}
                                  textAnchor="end"
                                  height={42}
                                  tickLine={false}
                                  axisLine={{ stroke: '#d6d3d1' }}
                                />
                                <YAxis
                                  allowDecimals={false}
                                  tick={{ fontSize: 9, fontWeight: 700, fill: '#a8a29e', fontFamily: 'Outfit' }}
                                  tickLine={false}
                                  axisLine={false}
                                />
                                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#fafaf9', radius: 6 }} />
                                <Bar
                                  dataKey="registros"
                                  name="Registros"
                                  fill="#4f46e5"
                                  radius={[6, 6, 0, 0]}
                                  barSize={24}
                                  animationDuration={900}
                                >
                                  <LabelList
                                    dataKey="registros"
                                    position="top"
                                    formatter={fmt}
                                    style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'Outfit' }}
                                  />
                                </Bar>
                                <Bar
                                  dataKey="planos"
                                  name="Planos"
                                  fill="#059669"
                                  radius={[6, 6, 0, 0]}
                                  barSize={24}
                                  animationBegin={150}
                                  animationDuration={900}
                                >
                                  <LabelList
                                    dataKey="planos"
                                    position="top"
                                    formatter={fmt}
                                    style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'Outfit' }}
                                  />
                                </Bar>
                                <Bar
                                  dataKey="recursos"
                                  name="Recursos"
                                  fill="#d97706"
                                  radius={[6, 6, 0, 0]}
                                  barSize={24}
                                  animationBegin={300}
                                  animationDuration={900}
                                >
                                  <LabelList
                                    dataKey="recursos"
                                    position="top"
                                    formatter={fmt}
                                    style={{ fill: '#57534e', fontSize: 8, fontWeight: 700, fontFamily: 'Outfit' }}
                                  />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <p className="text-sm font-semibold text-stone-400 font-['Outfit']">
                              Nenhum registro para exibir
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Pie charts */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        {
                          label: 'Distribuição por matéria',
                          data: subjectData,
                          icon: <BookOpen size={14} />,
                        },
                        {
                          label: 'Uso de recursos didáticos',
                          data: resourceData,
                          icon: <Zap size={14} />,
                        },
                      ].map(({ label, data, icon }) => (
                        <div
                          key={label}
                          className="rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-stone-400">{icon}</span>
                            <p className="text-xs font-bold text-stone-700 font-['Fraunces']">{label}</p>
                          </div>
                          <div className="h-40">
                            {data.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 8, right: 48, bottom: 8, left: 48 }}>
                                  <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={32}
                                    outerRadius={52}
                                    paddingAngle={5}
                                    label={PieLabel}
                                    labelLine={false}
                                    animationDuration={1000}
                                    strokeWidth={0}
                                  >
                                    {data.map((entry, i) => (
                                      <Cell
                                        key={entry.name}
                                        fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={{
                                      borderRadius: 12,
                                      border: '2px solid #e7e5e4',
                                      fontWeight: 700,
                                      fontSize: 11,
                                      fontFamily: 'Outfit',
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <p className="text-sm font-semibold text-stone-400 font-['Outfit']">Sem dados</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Records table */}
                    <div className="rounded-2xl border-2 border-stone-200 bg-white overflow-hidden shadow-sm">
                      <div className="border-b-2 border-stone-100 bg-stone-50 px-5 py-3.5 flex items-center gap-2.5">
                        <CalendarDays size={15} className="text-stone-400" />
                        <p className="text-xs font-bold text-stone-700 font-['Fraunces']">
                          Registros detalhados
                        </p>
                        {scopedRecs.length > 0 && (
                          <span className="ml-auto text-[10px] font-bold text-stone-400 font-['Outfit']">
                            {Math.min(scopedRecs.length, 8)} de {scopedRecs.length}
                          </span>
                        )}
                      </div>
                      {scopedRecs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <div className="grid grid-cols-[140px_1fr_1fr_1fr_1fr] border-b-2 border-stone-100 bg-indigo-50 px-5 py-2.5">
                            {['Turma · Data', 'Matéria', 'Conteúdo', 'Plano', 'Recursos'].map((h) => (
                              <Label key={h} className="text-indigo-500 px-1">
                                {h}
                              </Label>
                            ))}
                          </div>
                          <div className="divide-y-2 divide-stone-50">
                            {scopedRecs.slice(0, 8).map((record, i) => (
                              <FadeUp key={record.id} delay={i * 40}>
                                <div className="grid grid-cols-[140px_1fr_1fr_1fr_1fr] px-5 py-3.5 hover:bg-stone-50 transition-colors items-center">
                                  <div className="px-1">
                                    <p className="text-[10px] font-bold text-stone-800 truncate font-['Outfit']">
                                      {getClassName(record.classId)}
                                    </p>
                                    <p className="text-[9px] text-stone-400 font-semibold font-['Outfit']">
                                      {record.date}
                                    </p>
                                  </div>
                                  <div className="px-1">
                                    <span
                                      className="inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold font-['Outfit'] border"
                                      style={{
                                        backgroundColor: `${subjectColors[getAcademicSubjectLabel(record.subject) || 'Sem matéria'] ?? '#4f46e5'}18`,
                                        color:
                                          subjectColors[
                                            getAcademicSubjectLabel(record.subject) || 'Sem matéria'
                                          ] ?? '#4f46e5',
                                        borderColor: `${subjectColors[getAcademicSubjectLabel(record.subject) || 'Sem matéria'] ?? '#4f46e5'}44`,
                                      }}
                                    >
                                      {getAcademicSubjectLabel(record.subject) || 'Sem matéria'}
                                    </span>
                                  </div>
                                  <div className="px-1">
                                    <p className="text-[10px] font-medium text-stone-600 truncate font-['Outfit']">
                                      {record.content || '—'}
                                    </p>
                                  </div>
                                  <div className="px-1">
                                    <p className="text-[10px] font-medium text-stone-600 truncate font-['Outfit']">
                                      {record.plan || '—'}
                                    </p>
                                  </div>
                                  <div className="px-1">
                                    <p className="text-[10px] font-medium text-stone-600 truncate font-['Outfit']">
                                      {record.resources || '—'}
                                    </p>
                                  </div>
                                </div>
                              </FadeUp>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-16 text-center">
                          <FileText size={36} className="text-stone-300 mx-auto mb-3" />
                          <p className="text-sm font-semibold text-stone-400 font-['Outfit']">
                            Nenhum registro encontrado
                          </p>
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
    </>
  )
}
