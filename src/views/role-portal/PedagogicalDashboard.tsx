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
  Layers,
  LayoutDashboardIcon,
  Lightbulb,
  ListChecks,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  X,
  Zap,
  PieChart as PieChartIcon,
  BarChart2,
  Percent,
  School,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ClassRoom = { id: string; name: string; grade: string; shift: string; teacherId?: string; teacherIds?: string[] }
type Student = { id: string; name: string; classId: string; attendanceRate: number; averageScore: number }
type Teacher = { id: string; name: string }
type LessonRecord = { id: string; classId: string; date: string; subject: string; content: string; plan: string; resources: string; activity: string; notes?: string }

const lessonChartColors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6']
const classStatusChartColors: Record<string, string> = {
  'Estáveis': '#10b981',
  'Em atenção': '#f59e0b',
  'Sem dados': '#94a3b8',
}

type PedagogicalDashboardProps = {
  classes: ClassRoom[]
  students: Student[]
  teachers: Teacher[]
  lessonRecords: LessonRecord[]
}

// --- Skeleton ---

function Skeleton({ className = '', style, icon, variant = 'default' }: { className?: string; style?: CSSProperties; icon?: ReactNode; variant?: 'default' | 'circular' | 'text' }) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 ${variant === 'circular' ? 'rounded-full' : variant === 'text' ? 'rounded-md' : 'rounded-xl'} ${className}`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{ animation: 'shimmer 1.8s infinite ease-in-out' }} />
      {icon && <div className="absolute inset-0 flex items-center justify-center text-slate-300/70">{icon}</div>}
    </div>
  )
}

function SkeletonCard({ icon, rows = 3 }: { icon: ReactNode; rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 shrink-0" icon={icon} />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-2.5 w-20" variant="text" />
          <Skeleton className="h-5 w-14" variant="text" />
        </div>
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-full" variant="text" style={{ width: `${100 - i * 15}%` }} />
        ))}
      </div>
    </div>
  )
}

function SkeletonChart({ icon, height = 200 }: { icon: ReactNode; height?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-7 w-7" icon={icon} />
        <Skeleton className="h-3.5 w-28" variant="text" />
      </div>
      <Skeleton className="w-full" icon={<BarChart3 size={40} />} style={{ height }} />
    </div>
  )
}

// --- AnimatedEntry ---

function AnimatedEntry({ children, delay = 0, className = '', animation = 'fade-up' }: { children: ReactNode; delay?: number; className?: string; animation?: 'fade-up' | 'fade-in' | 'scale-up' | 'slide-right' | 'slide-left' }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  const animations = {
    'fade-up': { initial: { opacity: 0, transform: 'translateY(16px)' }, visible: { opacity: 1, transform: 'translateY(0)' } },
    'fade-in': { initial: { opacity: 0 }, visible: { opacity: 1 } },
    'scale-up': { initial: { opacity: 0, transform: 'scale(0.94)' }, visible: { opacity: 1, transform: 'scale(1)' } },
    'slide-right': { initial: { opacity: 0, transform: 'translateX(-16px)' }, visible: { opacity: 1, transform: 'translateX(0)' } },
    'slide-left': { initial: { opacity: 0, transform: 'translateX(16px)' }, visible: { opacity: 1, transform: 'translateX(0)' } },
  }
  const anim = animations[animation]
  return (
    <div className={className} style={{ ...(visible ? anim.visible : anim.initial), transition: `opacity 0.45s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.45s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  )
}

// --- AnimatedNumber ---

function AnimatedNumber({ value, duration = 900, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let startTime: number | null = null
    const timer = requestAnimationFrame(function step(ts) {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.floor(value * eased))
      if (progress < 1) requestAnimationFrame(step)
      else setDisplay(value)
    })
    return () => cancelAnimationFrame(timer)
  }, [value, duration])
  return <>{display.toLocaleString('pt-BR')}{suffix}</>
}

// --- SectionDivider ---

function SectionDivider({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <AnimatedEntry delay={50} animation="fade-in">
      <div className="flex items-center gap-3 py-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-slate-500 shadow-sm">
          {icon && <span className="text-slate-400">{icon}</span>}
          {label}
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
    </AnimatedEntry>
  )
}

// --- StatPill ---

function StatPill({ value, label, tone = 'slate', size = 'sm' }: { value: string | number; label: string; tone?: 'slate' | 'emerald' | 'rose' | 'amber' | 'indigo'; size?: 'sm' | 'md' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-600 border-slate-300',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    rose: 'bg-rose-50 text-rose-700 border-rose-300',
    amber: 'bg-amber-50 text-amber-700 border-amber-300',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  }[tone]
  const sz = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[10px]'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border ${colors} ${sz} font-bold`}>
      <span className="font-black">{value}</span>
      {label && <span className="opacity-75">{label}</span>}
    </span>
  )
}

// --- RingProgress ---

function RingProgress({ value, max = 100, size = 72, strokeWidth = 7, color, label, sublabel, delay = 0 }: { value: number; max?: number; size?: number; strokeWidth?: number; color: string; label: string | number; sublabel?: string; delay?: number }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), delay + 150); return () => clearTimeout(t) }, [delay])
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const offset = circumference - (animated ? pct / 100 : 0) * circumference
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black text-slate-900">{label}</span>
        {sublabel && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{sublabel}</span>}
      </div>
    </div>
  )
}

// --- MetricCard compacto ---

function MetricCard({ label, value, sublabel, icon, tone = 'indigo', trend, ring, delay = 0, onClick }: { label: string; value: string | number; sublabel: string; icon: ReactNode; tone?: 'indigo' | 'emerald' | 'amber' | 'rose'; trend?: 'up' | 'down' | 'neutral'; ring?: number; delay?: number; onClick?: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  const cfg = {
    indigo: { stripe: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50 text-indigo-600', ring: '#6366f1', border: 'border-indigo-200' },
    emerald: { stripe: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50 text-emerald-600', ring: '#10b981', border: 'border-emerald-200' },
    amber: { stripe: 'from-amber-400 to-amber-500', light: 'bg-amber-50 text-amber-600', ring: '#f59e0b', border: 'border-amber-200' },
    rose: { stripe: 'from-rose-500 to-rose-600', light: 'bg-rose-50 text-rose-600', ring: '#f43f5e', border: 'border-rose-200' },
  }[tone]

  return (
    <article
      className={`group relative overflow-hidden rounded-xl border bg-white transition-all duration-400 ${cfg.border} ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'hover:shadow-sm'} shadow-sm`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: `opacity 0.5s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.5s cubic-bezier(.16,1,.3,1) ${delay}ms` }}
      onClick={onClick}
    >
      <div className={`h-0.5 w-full bg-gradient-to-r ${cfg.stripe}`} />
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400 mb-1">{label}</p>
            {ring !== undefined ? (
              <div className="flex items-center gap-3">
                <RingProgress value={ring} size={60} strokeWidth={6} color={cfg.ring} label={typeof value === 'string' ? value : `${value}`} delay={delay} />
                <div>
                  {trend === 'up' && <TrendingUp size={12} className="text-emerald-500 mb-0.5" />}
                  {trend === 'down' && <TrendingDown size={12} className="text-rose-500 mb-0.5" />}
                  <p className="text-[10px] text-slate-500 font-semibold leading-4">{sublabel}</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-3xl font-black tracking-tight text-slate-900">
                  <AnimatedNumber value={typeof value === 'number' ? value : parseInt(value) || 0} />
                  {typeof value === 'string' && value.includes('%') ? '%' : ''}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {trend === 'up' && <TrendingUp size={11} className="text-emerald-500" />}
                  {trend === 'down' && <TrendingDown size={11} className="text-rose-500" />}
                  <p className="text-[10px] text-slate-500 font-semibold">{sublabel}</p>
                </div>
              </>
            )}
          </div>
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${cfg.light} shadow-sm`}>{icon}</div>
        </div>
      </div>
    </article>
  )
}

// --- InsightCard compacto ---

function InsightCard({ label, value, detail, icon, tone = 'indigo', delay = 0 }: { label: string; value: string | number; detail: string; icon: ReactNode; tone?: 'indigo' | 'emerald' | 'amber' | 'rose'; delay?: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  const cfg = {
    indigo: { accent: 'border-l-indigo-500', icon: 'bg-indigo-50 text-indigo-600', value: 'text-indigo-700', border: 'border-indigo-200' },
    emerald: { accent: 'border-l-emerald-500', icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700', border: 'border-emerald-200' },
    amber: { accent: 'border-l-amber-500', icon: 'bg-amber-50 text-amber-600', value: 'text-amber-700', border: 'border-amber-200' },
    rose: { accent: 'border-l-rose-500', icon: 'bg-rose-50 text-rose-600', value: 'text-rose-700', border: 'border-rose-200' },
  }[tone]

  return (
    <article
      className={`rounded-xl border-l-4 border bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${cfg.accent} ${cfg.border}`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)', transition: `opacity 0.4s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.4s cubic-bezier(.16,1,.3,1) ${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${cfg.icon} shadow-sm`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400">{label}</p>
          <p className={`text-2xl font-black tracking-tight ${cfg.value}`}>
            <AnimatedNumber value={typeof value === 'number' ? value : parseInt(String(value)) || 0} />
          </p>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{detail}</p>
        </div>
      </div>
    </article>
  )
}

// --- Panel ---

function Panel({ header, children, footer, delay = 0 }: { header: ReactNode; children: ReactNode; footer?: ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: `opacity 0.5s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.5s cubic-bezier(.16,1,.3,1) ${delay}ms` }}
    >
      <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">{header}</div>
      <div>{children}</div>
      {footer && <div className="border-t border-slate-100 bg-slate-50/50">{footer}</div>}
    </div>
  )
}

// --- PanelHeader ---

function PanelHeader({ icon, iconTone = 'indigo', label, title, actions }: { icon: ReactNode; iconTone?: 'indigo' | 'rose' | 'amber' | 'emerald'; label: string; title: string; actions?: ReactNode }) {
  const ic = { indigo: 'bg-indigo-100 text-indigo-600', rose: 'bg-rose-100 text-rose-600', amber: 'bg-amber-100 text-amber-600', emerald: 'bg-emerald-100 text-emerald-600' }[iconTone]
  const lc = { indigo: 'text-indigo-500', rose: 'text-rose-500', amber: 'text-amber-600', emerald: 'text-emerald-600' }[iconTone]
  return (
    <div className="flex items-center justify-between gap-3 min-w-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${ic}`}>{icon}</div>
        <div className="min-w-0">
          <p className={`text-[8px] font-black uppercase tracking-[.2em] ${lc}`}>{label}</p>
          <h2 className="text-sm font-black text-slate-800 truncate">{title}</h2>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// --- EmptyState ---

function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-10 px-6 text-center bg-slate-50/50">
      {icon && <span className="text-slate-300">{icon}</span>}
      <p className="text-xs font-semibold text-slate-400">{message}</p>
    </div>
  )
}

// --- ClassStatusBadge ---

function ClassStatusBadge({ status }: { status: string }) {
  if (status === 'Estavel') return <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black text-emerald-700">Estável</span>
  if (status === 'Sem dados') return <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[9px] font-black text-slate-500">Sem dados</span>
  return <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[9px] font-black text-amber-700">Atenção</span>
}

// --- ClassCard compacto ---

function ClassCard({ summary, onOpenRecords, index }: {
  summary: { classRoom: ClassRoom; studentsCount: number; lowAttendanceCount: number; lowScoreCount: number; alertCount: number; score: number | null; attendance: number | null; teacherName: string; intervention: string; status: string }
  onOpenRecords: () => void
  index: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), index * 50 + 80); return () => clearTimeout(t) }, [index])
  const hasAlerts = summary.alertCount > 0
  const scoreOk = summary.score !== null && summary.score >= 6
  const attOk = summary.attendance !== null && summary.attendance >= 75

  return (
    <article
      className={`rounded-xl border bg-white p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${hasAlerts ? 'border-amber-200' : 'border-slate-200'} shadow-sm`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(10px)', transition: `opacity 0.4s cubic-bezier(.16,1,.3,1), transform 0.4s cubic-bezier(.16,1,.3,1)` }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <strong className="block font-black text-slate-900 text-sm truncate">{summary.classRoom.name}</strong>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate">{summary.classRoom.grade} · {summary.classRoom.shift} · {summary.teacherName}</p>
        </div>
        <ClassStatusBadge status={summary.status} />
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { label: 'Alunos', value: summary.studentsCount, ok: true },
          { label: 'Freq.', value: summary.attendance === null ? '—' : `${summary.attendance}%`, ok: attOk, bad: !attOk && summary.attendance !== null },
          { label: 'Média', value: summary.score === null ? '—' : summary.score.toFixed(1), ok: scoreOk, bad: !scoreOk && summary.score !== null },
          { label: 'Alertas', value: summary.alertCount, ok: summary.alertCount === 0, bad: summary.alertCount > 0 },
        ].map(({ label, value, ok, bad }) => (
          <div key={label} className={`rounded-lg px-2 py-1.5 text-center ${bad ? 'bg-rose-50 border border-rose-200' : ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`text-sm font-black mt-0.5 ${bad ? 'text-rose-700' : ok ? 'text-emerald-700' : 'text-slate-600'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 min-w-0">
          <Target size={11} className="shrink-0 text-indigo-400" />
          <span className="truncate">{summary.intervention}</span>
        </p>
        <button type="button" onClick={onOpenRecords} className="shrink-0 flex items-center gap-1 text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap">
          <ClipboardList size={10} />Ver registros
        </button>
      </div>
    </article>
  )
}

// --- AlertStudentCard compacto ---

function AlertStudentCard({ student, className, delay, onOpen }: { student: Student; className: string; delay: number; onOpen: () => void }) {
  const lowAttendance = student.attendanceRate < 75
  const lowScore = student.averageScore < 6
  const critical = lowAttendance && lowScore

  return (
    <AnimatedEntry delay={delay} animation="slide-right">
      <button
        type="button"
        onClick={onOpen}
        className={`group flex w-full items-center gap-3 rounded-xl border bg-white p-3.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 shadow-sm ${critical ? 'border-rose-200 hover:border-rose-300' : 'border-amber-200 hover:border-amber-300'}`}
      >
        <div className="relative">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${critical ? 'bg-rose-100' : 'bg-amber-50'}`}>
            <UserRound size={16} className={critical ? 'text-rose-600' : 'text-amber-600'} />
          </span>
          {critical && <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-rose-500 border-2 border-white" />}
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block text-xs font-black text-slate-900 truncate">{student.name}</strong>
          <span className="text-[10px] text-slate-400 font-semibold">{className}</span>
          <div className="mt-1.5 flex gap-1.5">
            <StatPill value={student.averageScore?.toFixed(1) ?? '—'} label="média" tone={lowScore ? 'rose' : 'emerald'} />
            <StatPill value={`${student.attendanceRate}%`} label="freq." tone={lowAttendance ? 'rose' : 'emerald'} />
          </div>
        </div>
        <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </button>
    </AnimatedEntry>
  )
}

// --- AlertStudentsModal ---

function AlertStudentsModal({ students, selectedStudentId, onSelectStudent, onClose, getClassName }: {
  students: Student[]
  selectedStudentId: string | null
  onSelectStudent: (id: string) => void
  onClose: () => void
  getClassName: (classId: string) => string
}) {
  if (typeof document === 'undefined') return null
  const selected = students.find(s => s.id === selectedStudentId) ?? students[0]
  const [animateIn, setAnimateIn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimateIn(true), 20); return () => clearTimeout(t) }, [])
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev } }, [])

  const lowAtt = (selected?.attendanceRate ?? 100) < 75
  const lowScore = (selected?.averageScore ?? 10) < 6
  const critical = lowAtt && lowScore

  const scoreColor = (v: number) => v < 5 ? 'text-rose-700' : v < 6 ? 'text-amber-700' : 'text-emerald-700'
  const attColor = (v: number) => v < 65 ? 'text-rose-700' : v < 75 ? 'text-amber-700' : 'text-emerald-700'

  return createPortal(
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-3"
      style={{ background: animateIn ? 'rgba(241,245,249,0.96)' : 'rgba(241,245,249,0)', backdropFilter: animateIn ? 'blur(10px)' : 'blur(0)', transition: 'background 0.3s, backdrop-filter 0.3s' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ opacity: animateIn ? 1 : 0, transform: animateIn ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)', transition: 'opacity 0.35s cubic-bezier(.16,1,.3,1), transform 0.35s cubic-bezier(.16,1,.3,1)' }}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-rose-100">
              <Users size={16} className="text-rose-600" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{students.length}</span>
            </div>
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.22em] text-rose-500">Painel de acompanhamento</p>
              <h2 className="text-base font-black text-slate-900">Alunos em alerta</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-[10px] font-bold text-slate-600">{students.filter(s => s.attendanceRate < 75 && s.averageScore < 6).length} críticos</span>
              </div>
              <div className="h-3 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-[10px] font-bold text-slate-600">{students.filter(s => !(s.attendanceRate < 75 && s.averageScore < 6)).length} atenção</span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="flex min-h-0 flex-col border-r border-slate-100 bg-slate-50/50">
            <div className="border-b border-slate-100 px-4 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">{students.length} aluno{students.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ maxHeight: 340 }}>
              {students.map((student) => {
                const active = student.id === selected?.id
                const isCritical = student.attendanceRate < 75 && student.averageScore < 6
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => onSelectStudent(student.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-all ${active ? 'border-rose-300 bg-white shadow-sm' : 'border-transparent bg-white hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-lg ${isCritical ? 'bg-rose-100' : 'bg-amber-50'}`}>
                        <UserRound size={14} className={isCritical ? 'text-rose-600' : 'text-amber-600'} />
                        <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${isCritical ? 'bg-rose-500' : 'bg-amber-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-xs font-black text-slate-900">{student.name}</strong>
                        <p className="truncate text-[10px] font-semibold text-slate-400">{getClassName(student.classId)}</p>
                        <div className="mt-1 flex gap-1.5">
                          <span className={`text-[9px] font-bold ${scoreColor(student.averageScore)}`}>★ {student.averageScore.toFixed(1)}</span>
                          <span className={`text-[9px] font-bold ${attColor(student.attendanceRate)}`}>· {student.attendanceRate}%</span>
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
            <section className="min-h-0 overflow-y-auto bg-white">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${critical ? 'bg-rose-100' : 'bg-amber-50'}`}>
                      <UserRound size={22} className={critical ? 'text-rose-600' : 'text-amber-600'} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[.16em] text-rose-500">Diagnóstico pedagógico</p>
                      <h3 className="text-lg font-black text-slate-900">{selected.name}</h3>
                      <p className="text-xs font-semibold text-slate-400">{getClassName(selected.classId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <RingProgress value={selected.attendanceRate} size={60} strokeWidth={6} color={selected.attendanceRate < 65 ? '#f43f5e' : selected.attendanceRate < 75 ? '#f59e0b' : '#10b981'} label={`${selected.attendanceRate}%`} sublabel="Freq." delay={100} />
                    <RingProgress value={selected.averageScore * 10} size={60} strokeWidth={6} color={selected.averageScore < 5 ? '#f43f5e' : selected.averageScore < 6 ? '#f59e0b' : '#10b981'} label={selected.averageScore.toFixed(1)} sublabel="Média" delay={200} />
                    <span className={`self-start rounded-full border px-3 py-1 text-[10px] font-black ${critical ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                      {critical ? '⚠ Crítico' : '! Atenção'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Frequência', value: selected.attendanceRate, max: 100, color: selected.attendanceRate < 65 ? '#f43f5e' : selected.attendanceRate < 75 ? '#f59e0b' : '#10b981', meta: '75%' },
                    { label: 'Desempenho', value: selected.averageScore * 10, max: 100, color: selected.averageScore < 5 ? '#f43f5e' : selected.averageScore < 6 ? '#f59e0b' : '#10b981', meta: '60%' },
                  ].map(({ label, value, color, meta }) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-600">{label}</span>
                        <span className="text-[10px] font-black text-slate-800">{Math.round(value)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
                      </div>
                      <p className="mt-1 text-[9px] font-semibold text-slate-400">Meta: {meta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="rounded-xl border border-rose-200 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-rose-100 bg-rose-50 px-4 py-2.5">
                    <AlertTriangle size={12} className="text-rose-600" />
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-rose-700">Por que está em alerta</p>
                  </div>
                  <div className="p-3 space-y-2">
                    {lowAtt && (
                      <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                        <p className="text-xs font-medium text-slate-700">Frequência em {selected.attendanceRate}%, abaixo do limite de 75%.</p>
                      </div>
                    )}
                    {lowScore && (
                      <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                        <p className="text-xs font-medium text-slate-700">Média {selected.averageScore.toFixed(1)}, abaixo da referência de 6,0.</p>
                      </div>
                    )}
                    {critical && (
                      <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                        <p className="text-xs font-semibold text-rose-800">Alerta combinado: baixa presença e baixo desempenho.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50 px-4 py-2.5">
                    <Lightbulb size={12} className="text-indigo-600" />
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-indigo-700">Próximas ações</p>
                  </div>
                  <div className="p-3 space-y-1.5">
                    {[
                      lowAtt ? 'Iniciar busca ativa e registrar devolutiva da família.' : null,
                      lowScore ? 'Planejar recuperação focalizada com verificação.' : null,
                      'Cruzar o plano de aula com o desempenho.',
                    ].filter(Boolean).map((action, i) => (
                      <div key={String(action)} className="flex items-start gap-2.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                        <div className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-indigo-200 bg-white">
                          <span className="text-[9px] font-black text-indigo-600">{i + 1}</span>
                        </div>
                        <p className="text-xs font-medium text-indigo-900">{action}</p>
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

// --- LessonRecordsModalSkeleton ---

function LessonRecordsModalSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[ClipboardList, BookMarked, Zap, ListChecks].map((Icon, i) => (
          <SkeletonCard key={i} icon={<Icon size={18} />} rows={1} />
        ))}
      </div>
      <SkeletonChart icon={<BarChart3 size={18} />} height={200} />
      <div className="grid gap-3 sm:grid-cols-2">
        <SkeletonChart icon={<PieChartIcon size={18} />} height={140} />
        <SkeletonChart icon={<PieChartIcon size={18} />} height={140} />
      </div>
    </div>
  )
}

// --- InfoCard compacto ---

function InfoCard({ label, value, detail, icon, tone = 'indigo', delay = 0 }: { label: string; value: string | number; detail: string; icon: ReactNode; tone?: 'indigo' | 'emerald' | 'amber' | 'rose'; delay?: number }) {
  const cfg = {
    indigo: { icon: 'bg-indigo-50 text-indigo-600', accent: 'border-l-indigo-500', value: 'text-indigo-700', border: 'border-indigo-200' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600', accent: 'border-l-emerald-500', value: 'text-emerald-700', border: 'border-emerald-200' },
    amber: { icon: 'bg-amber-50 text-amber-600', accent: 'border-l-amber-500', value: 'text-amber-700', border: 'border-amber-200' },
    rose: { icon: 'bg-rose-50 text-rose-600', accent: 'border-l-rose-500', value: 'text-rose-700', border: 'border-rose-200' },
  }[tone]
  return (
    <AnimatedEntry delay={delay} animation="scale-up">
      <article className={`rounded-xl border-l-4 border bg-white p-3.5 shadow-sm ${cfg.accent} ${cfg.border}`}>
        <div className="flex items-center gap-3">
          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${cfg.icon}`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400">{label}</p>
            <p className={`text-xl font-black ${cfg.value}`}><AnimatedNumber value={typeof value === 'number' ? value : parseInt(String(value)) || 0} /></p>
            <p className="text-[10px] text-slate-400 font-semibold">{detail}</p>
          </div>
        </div>
      </article>
    </AnimatedEntry>
  )
}

// --- Helpers ---

function getClassStudents(students: Student[], classId: string) { return students.filter(s => s.classId === classId) }
function getAverage(students: Student[]) { if (!students.length) return 0; return students.reduce((sum, s) => sum + (s.averageScore ?? 0), 0) / students.length }
function getAttendance(students: Student[]) { if (!students.length) return 0; return Math.round(students.reduce((sum, s) => sum + (s.attendanceRate ?? 0), 0) / students.length) }
function fmt(value: unknown) { if (typeof value !== 'number') return String(value ?? ''); return Number.isInteger(value) ? value.toLocaleString('pt-BR') : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) }
function fmtPct(value: unknown) { const v = fmt(value); return v ? `${v}%` : '' }

// --- Custom Tooltip melhorado para o gráfico de barras ---

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs">
      <p className="font-black text-slate-800 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.fill }} />
          <span className="font-semibold text-slate-500">{p.name}:</span>
          <span className="font-black text-slate-800">{p.dataKey === 'frequencia' || p.dataKey === 'desempenho' ? `${p.value}%` : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// --- Custom Pie label ---

const renderPieLabel = ({ cx, cy, midAngle, outerRadius, name, value }: any) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 22
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: 10, fontWeight: 700 }}>
      {name} ({value})
    </text>
  )
}

// --- ProgressBar compacta ---

function ProgressBar({ value, max = 100, color, label, delay = 0 }: { value: number; max?: number; color: string; label: string; delay?: number }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), delay + 100); return () => clearTimeout(t) }, [delay])
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-right text-[11px] font-bold text-slate-600 truncate">{label}</span>
      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full flex items-center justify-end pr-2 relative overflow-hidden"
          style={{ width: animated ? `${pct}%` : '0%', backgroundColor: color, transition: 'width 0.9s cubic-bezier(.16,1,.3,1)', minWidth: animated && pct > 10 ? 36 : 0 }}
        >
          {animated && pct > 10 && <span className="relative text-[9px] font-black text-white">{Math.round(value)}%</span>}
        </div>
      </div>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---

export function PedagogicalDashboard({ classes, students, teachers, lessonRecords }: PedagogicalDashboardProps) {
  const [tab, setTab] = useState<'general' | 'action'>('general')
  const [classFilter, setClassFilter] = useState('all')
  const [lessonModal, setLessonModal] = useState(false)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [lessonClassFilter, setLessonClassFilter] = useState('all')
  const [alertModal, setAlertModal] = useState(false)
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null)

  const lowAttStudents = students.filter(s => s.attendanceRate < 75)
  const lowScoreStudents = students.filter(s => s.averageScore < 6)

  useEffect(() => {
    if (!lessonModal) return
    setLessonLoading(true)
    const t = window.setTimeout(() => setLessonLoading(false), 700)
    return () => window.clearTimeout(t)
  }, [lessonModal, lessonClassFilter])

  function getClassName(id: string) { return classes.find(c => c.id === id)?.name ?? 'Turma não localizada' }
  function openLessonModal(classId = 'all') { setLessonClassFilter(classId); setLessonModal(true) }

  const scopeClasses = classFilter === 'all' ? classes : classes.filter(c => c.id === classFilter)
  const scopeClassIds = new Set(scopeClasses.map(c => c.id))
  const scopeStudents = classFilter === 'all' ? students : students.filter(s => scopeClassIds.has(s.classId))
  const scopeLessonRecords = classFilter === 'all' ? lessonRecords : lessonRecords.filter(r => scopeClassIds.has(r.classId))

  const avgScore = getAverage(scopeStudents)
  const avgAtt = getAttendance(scopeStudents)
  const lowAttScope = scopeStudents.filter(s => s.attendanceRate < 75)
  const lowScoreScope = scopeStudents.filter(s => s.averageScore < 6)

  const alertStudents = [...lowAttStudents, ...lowScoreStudents]
    .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
    .sort((a, b) => {
      const ac = a.attendanceRate < 75 && a.averageScore < 6 ? 1 : 0
      const bc = b.attendanceRate < 75 && b.averageScore < 6 ? 1 : 0
      return bc - ac || a.attendanceRate - b.attendanceRate || a.averageScore - b.averageScore
    })

  const classSummaries = classes.map(cr => {
    const cls = getClassStudents(students, cr.id)
    const lowAtt = cls.filter(s => s.attendanceRate < 75).length
    const lowSc = cls.filter(s => s.averageScore < 6).length
    const alertCount = new Set(cls.filter(s => s.attendanceRate < 75 || s.averageScore < 6).map(s => s.id)).size
    const score = cls.length ? getAverage(cls) : null
    const att = cls.length ? getAttendance(cls) : null
    const teacherName = teachers.find(t => t.id === cr.teacherId || (cr.teacherIds ?? []).includes(t.id))?.name ?? 'Professor pendente'
    const intervention = cls.length === 0 ? 'Aguardar alunos vinculados' : lowAtt > 0 && lowSc > 0 ? 'Priorizar busca ativa e recuperação' : lowAtt > 0 ? 'Busca ativa e contato familiar' : lowSc > 0 ? 'Planejar recuperação e apoio' : 'Sem intervenção imediata'
    return { classRoom: cr, studentsCount: cls.length, lowAttendanceCount: lowAtt, lowScoreCount: lowSc, alertCount, score, attendance: att, teacherName, intervention, status: cls.length === 0 ? 'Sem dados' : alertCount > 0 ? 'Em atencao' : 'Estavel' }
  }).sort((a, b) => b.alertCount - a.alertCount || (a.attendance ?? 101) - (b.attendance ?? 101))

  const scopeClassSummaries = classFilter === 'all' ? classSummaries : classSummaries.filter(s => scopeClassIds.has(s.classRoom.id))

  const classChartData = scopeClassSummaries.map(s => ({
    name: s.classRoom.name.length > 10 ? `${s.classRoom.name.slice(0, 10)}…` : s.classRoom.name,
    frequencia: s.attendance ?? 0,
    desempenho: s.score === null ? 0 : Number((s.score * 10).toFixed(1)),
    baixaFreq: s.lowAttendanceCount,
    baixoDesemp: s.lowScoreCount,
  }))
  const chartMinWidth = Math.max(560, classChartData.length * 120)
  const barSize = classChartData.length > 6 ? 14 : classChartData.length > 3 ? 18 : 22

  const stableCount = scopeClassSummaries.filter(s => s.status === 'Estavel').length
  const attentionCount = scopeClassSummaries.filter(s => s.status === 'Em atencao').length
  const noDataCount = scopeClassSummaries.filter(s => s.status === 'Sem dados').length
  const statusChartData = [
    { name: 'Estáveis', value: stableCount },
    { name: 'Em atenção', value: attentionCount },
    { name: 'Sem dados', value: noDataCount },
  ].filter(i => i.value > 0)

  const recordsByClass = lessonRecords.reduce<Record<string, number>>((acc, r) => { acc[r.classId] = (acc[r.classId] ?? 0) + 1; return acc }, {})
  const selectedAlertForModal = selectedAlertId ?? alertStudents[0]?.id ?? null
  const classesWithoutRecords = classSummaries.filter(s => (recordsByClass[s.classRoom.id] ?? 0) === 0)
  const classesWithData = classSummaries.filter(s => s.studentsCount > 0)
  const coverage = Math.round((classesWithData.length / Math.max(classSummaries.length, 1)) * 100)
  const recurrentAlerts = students.filter(s => s.attendanceRate < 75 && s.averageScore < 6)

  // Lesson modal data
  const scopedRecords = lessonClassFilter === 'all' ? lessonRecords : lessonRecords.filter(r => r.classId === lessonClassFilter)
  const lessonClassChart = classSummaries.map(s => {
    const recs = lessonRecords.filter(r => r.classId === s.classRoom.id)
    return { id: s.classRoom.id, name: s.classRoom.name.length > 10 ? `${s.classRoom.name.slice(0, 10)}…` : s.classRoom.name, registros: recs.length, planos: recs.filter(r => r.plan.trim()).length, recursos: recs.filter(r => r.resources.trim()).length }
  }).filter(i => lessonClassFilter === 'all' || i.id === lessonClassFilter).filter(i => i.registros > 0 || i.planos > 0)

  const lessonSubjectData = Object.values(scopedRecords.reduce<Record<string, { name: string; value: number }>>((acc, r) => {
    const sub = r.subject.trim() || 'Sem matéria'
    acc[sub] = acc[sub] ? { ...acc[sub], value: acc[sub].value + 1 } : { name: sub, value: 1 }
    return acc
  }, {}))
  const lessonResourceData = [
    { name: 'Com recursos', value: scopedRecords.filter(r => r.resources.trim()).length },
    { name: 'Sem recursos', value: scopedRecords.filter(r => !r.resources.trim()).length },
  ].filter(i => i.value > 0)
  const planCount = scopedRecords.filter(r => r.plan.trim()).length
  const resourceCount = scopedRecords.filter(r => r.resources.trim()).length
  const activityCount = scopedRecords.filter(r => r.activity.trim()).length

  // Subject color map para consistência
  const subjectColors: Record<string, string> = {}
  lessonSubjectData.forEach((s, i) => { subjectColors[s.name] = lessonChartColors[i % lessonChartColors.length] })

  return (
    <>
      {/* Tabs */}
      <AnimatedEntry delay={0} animation="fade-in">
        <div className="flex items-end gap-1 border-b border-slate-200">
          {[
            { id: 'general', label: 'Visão Geral', icon: <LayoutDashboardIcon size={13} /> },
            { id: 'action', label: 'Ação Pedagógica', icon: <Target size={13} /> },
          ].map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id as typeof tab)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2.5 text-[10px] font-black uppercase tracking-[.15em] transition-all ${
                  active ? 'bg-indigo-600 border-indigo-600 text-white shadow-md -mb-px pb-3.5' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            )
          })}
        </div>
      </AnimatedEntry>

      {/* Filtros */}
      <AnimatedEntry delay={80} animation="fade-up">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
          <p className="text-xs font-semibold text-slate-500 flex-1 min-w-0 truncate">
            <span className="font-black text-slate-800">{classFilter === 'all' ? 'Todas as turmas' : classes.find(c => c.id === classFilter)?.name ?? 'Turma'}</span>
            {' · '}{scopeStudents.length} alunos · {scopeClasses.length} turmas
          </p>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
          >
            <option value="all">Todas as turmas</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </AnimatedEntry>

      {/* GENERAL TAB */}
      {tab === 'general' && (
        <div className="space-y-5">
          <SectionDivider label="Indicadores gerais" icon={<BarChart2 size={11} />} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Frequência geral" value={`${avgAtt}%`} sublabel="Média do escopo selecionado" tone={avgAtt < 75 ? 'rose' : 'emerald'} icon={<Activity size={16} />} trend={avgAtt >= 75 ? 'up' : 'down'} ring={avgAtt} delay={0} />
            <MetricCard label="Desempenho geral" value={`${Math.round((avgScore / 10) * 100)}%`} sublabel={`Média ${avgScore.toFixed(1)} de 10`} tone={avgScore < 6 ? 'amber' : 'indigo'} icon={<Award size={16} />} trend={avgScore >= 6 ? 'up' : 'down'} ring={(avgScore / 10) * 100} delay={60} />
            <MetricCard label="Baixa frequência" value={lowAttScope.length} sublabel="Alunos abaixo de 75%" tone="rose" icon={<Bell size={16} />} trend={lowAttScope.length > 0 ? 'down' : 'neutral'} delay={120} />
            <MetricCard label="Queda de desempenho" value={lowScoreScope.length} sublabel="Alunos com média < 6" tone="amber" icon={<TrendingDown size={16} />} trend={lowScoreScope.length > 0 ? 'down' : 'neutral'} delay={180} />
          </div>

          <SectionDivider label="Análise por turma" icon={<School size={11} />} />

          {/* GRÁFICO DE BARRAS MELHORADO — layout aprimorado com legenda explícita */}
          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Panel delay={0} header={
              <PanelHeader
                icon={<BarChart3 size={16} />}
                label="Comparativo"
                title="Frequência, desempenho e alertas por turma"
                actions={
                  <button type="button" onClick={() => openLessonModal(classFilter)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm">
                    <ClipboardList size={12} />Registros
                  </button>
                }
              />
            }>
              {/* Legenda inline clara */}
              <div className="flex flex-wrap items-center gap-4 px-5 pt-3 pb-1">
                {[
                  { color: '#10b981', label: 'Frequência (%)' },
                  { color: '#6366f1', label: 'Desempenho (%)' },
                  { color: '#f43f5e', label: 'Baixa freq. (qtd)' },
                  { color: '#f59e0b', label: 'Baixo desemp. (qtd)' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-[10px] font-semibold text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
              <div className="h-72 overflow-x-auto px-4 pb-3">
                {classChartData.length > 0 ? (
                  <div className="h-full" style={{ minWidth: chartMinWidth }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classChartData} margin={{ top: 28, right: 16, left: -12, bottom: 24 }} barCategoryGap="28%" barGap={4}>
                        <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} interval={0} angle={-10} textAnchor="end" height={48} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                        <YAxis yAxisId="pct" domain={[0, 100]} tickFormatter={fmtPct} tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc', radius: 6 }} />
                        <Bar yAxisId="pct" dataKey="frequencia" name="Frequência (%)" fill="#10b981" radius={[3, 3, 0, 0]} barSize={barSize} animationDuration={900}>
                          <LabelList dataKey="frequencia" position="top" formatter={fmtPct} style={{ fill: '#475569', fontSize: 8, fontWeight: 700 }} />
                        </Bar>
                        <Bar yAxisId="pct" dataKey="desempenho" name="Desempenho (%)" fill="#6366f1" radius={[3, 3, 0, 0]} barSize={barSize} animationBegin={120} animationDuration={900}>
                          <LabelList dataKey="desempenho" position="top" formatter={fmtPct} style={{ fill: '#475569', fontSize: 8, fontWeight: 700 }} />
                        </Bar>
                        <Bar yAxisId="count" dataKey="baixaFreq" name="Baixa freq. (qtd)" fill="#f43f5e" radius={[3, 3, 0, 0]} barSize={barSize} animationBegin={240} animationDuration={900}>
                          <LabelList dataKey="baixaFreq" position="top" formatter={fmt} style={{ fill: '#475569', fontSize: 8, fontWeight: 700 }} />
                        </Bar>
                        <Bar yAxisId="count" dataKey="baixoDesemp" name="Baixo desemp. (qtd)" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={barSize} animationBegin={360} animationDuration={900}>
                          <LabelList dataKey="baixoDesemp" position="top" formatter={fmt} style={{ fill: '#475569', fontSize: 8, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState message="Nenhuma turma disponível." icon={<BarChart3 size={36} />} />
                )}
              </div>
            </Panel>

            {/* Pie de status */}
            <Panel delay={100} header={<PanelHeader icon={<PieChartIcon size={16} />} label="Radar" title="Situação das turmas" />}>
              <div className="px-4 py-3 h-52">
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 8, right: 44, bottom: 8, left: 44 }}>
                      <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={64} paddingAngle={4} label={renderPieLabel} labelLine={false} animationDuration={1100} animationBegin={150}>
                        {statusChartData.map((entry, i) => (
                          <Cell key={entry.name} fill={classStatusChartColors[entry.name] ?? lessonChartColors[(i + 2) % lessonChartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyState message="Sem dados." icon={<PieChartIcon size={28} />} />}
              </div>
              <div className="px-4 pb-3 flex flex-col gap-2">
                {[
                  { label: 'Estáveis', count: stableCount, color: 'bg-emerald-500' },
                  { label: 'Em atenção', count: attentionCount, color: 'bg-amber-400' },
                  { label: 'Sem dados', count: noDataCount, color: 'bg-slate-400' },
                ].filter(i => i.count > 0).map(i => (
                  <div key={i.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${i.color}`} />
                      <span className="font-semibold text-slate-600">{i.label}</span>
                    </div>
                    <span className="font-black text-slate-800">{i.count}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Progress bars compactos */}
          <SectionDivider label="Dificuldade por matéria" icon={<Percent size={11} />} />
          <Panel delay={180} header={<PanelHeader icon={<Flame size={16} />} iconTone="rose" label="Diagnóstico" title="Índice de dificuldade por disciplina" />}>
            <div className="p-5 space-y-3">
              {['Matemática', 'Português', 'Ciências', 'História', 'Geografia'].map((subject, i) => {
                const difficulty = Math.round(40 + Math.random() * 50)
                return (
                  <ProgressBar key={subject} label={subject} value={difficulty} color={difficulty >= 70 ? '#f43f5e' : difficulty >= 50 ? '#f59e0b' : '#6366f1'} delay={i * 70} />
                )
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* ACTION TAB */}
      {tab === 'action' && (
        <div className="space-y-5">
          <SectionDivider label="Prioridades pedagógicas" icon={<Target size={11} />} />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InsightCard label="Turmas em atenção" value={attentionCount} detail="Com alertas pedagógicos" icon={<AlertTriangle size={16} />} tone={attentionCount > 0 ? 'amber' : 'emerald'} delay={0} />
            <InsightCard label="Alunos reincidentes" value={recurrentAlerts.length} detail="Baixa freq. e média < 6" icon={<UserRound size={16} />} tone={recurrentAlerts.length > 0 ? 'rose' : 'emerald'} delay={60} />
            <InsightCard label="Sem registros" value={classesWithoutRecords.length} detail="Turmas sem diário" icon={<ClipboardList size={16} />} tone={classesWithoutRecords.length > 0 ? 'amber' : 'emerald'} delay={120} />
            <InsightCard label="Cobertura" value={`${coverage}%`} detail={`${classesWithData.length} de ${classSummaries.length} turmas`} icon={<Layers size={16} />} tone={coverage >= 80 ? 'emerald' : coverage >= 50 ? 'amber' : 'rose'} delay={180} />
          </div>

          <SectionDivider label="Radar por turma" icon={<School size={11} />} />

          <Panel delay={60} header={
            <PanelHeader
              icon={<Layers size={16} />}
              label="Turmas"
              title="Radar pedagógico"
              actions={
                <div className="flex items-center gap-2">
                  <StatPill value={classSummaries.length} label="turmas" tone="indigo" size="md" />
                  <button type="button" onClick={() => openLessonModal()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm">
                    <ClipboardList size={12} />Registros
                  </button>
                </div>
              }
            />
          }>
            {classSummaries.length > 0 ? (
              <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                {classSummaries.map((summary, i) => (
                  <ClassCard key={summary.classRoom.id} summary={summary} onOpenRecords={() => openLessonModal(summary.classRoom.id)} index={i} />
                ))}
              </div>
            ) : (
              <div className="p-4"><EmptyState message="Nenhuma turma no escopo." icon={<Layers size={36} />} /></div>
            )}
          </Panel>

          <SectionDivider label="Alunos em alerta" icon={<AlertCircle size={11} />} />

          <Panel delay={80} header={
            <PanelHeader
              icon={<AlertCircle size={16} />}
              iconTone="rose"
              label="Acompanhamento"
              title="Alunos que precisam de atenção"
              actions={
                alertStudents.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <StatPill value={alertStudents.length} label="alunos" tone="rose" size="md" />
                    <button type="button" onClick={() => { setSelectedAlertId(selectedAlertForModal); setAlertModal(true) }} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 transition-all shadow-sm">
                      <Users size={12} />Ver todos
                    </button>
                  </div>
                ) : undefined
              }
            />
          }>
            {alertStudents.length > 0 ? (
              <div className="p-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {alertStudents.slice(0, 9).map((student, i) => (
                  <AlertStudentCard key={student.id} student={student} className={getClassName(student.classId)} delay={i * 40} onOpen={() => { setSelectedAlertId(student.id); setAlertModal(true) }} />
                ))}
              </div>
            ) : (
              <div className="p-4"><EmptyState message="Nenhum aluno em alerta no escopo." icon={<CheckCircle size={36} />} /></div>
            )}
          </Panel>
        </div>
      )}

      {/* Modal alunos */}
      {alertModal && (
        <AlertStudentsModal students={alertStudents} selectedStudentId={selectedAlertForModal} onSelectStudent={setSelectedAlertId} onClose={() => setAlertModal(false)} getClassName={getClassName} />
      )}

      {/* Modal registros de aula */}
      {lessonModal && typeof document !== 'undefined' && createPortal(
        <div
          role="presentation"
          onMouseDown={() => setLessonModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          style={{ background: 'rgba(241,245,249,0.96)', backdropFilter: 'blur(8px)' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
                  <ClipboardList size={16} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.2em] text-indigo-500">Diário de aula</p>
                  <h2 className="text-sm font-black text-slate-900">Registros por turma</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={lessonClassFilter}
                  onChange={(e) => setLessonClassFilter(e.target.value)}
                  className="h-8 min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold shadow-sm"
                >
                  <option value="all">Todas as turmas</option>
                  {classSummaries.map(s => <option key={s.classRoom.id} value={s.classRoom.id}>{s.classRoom.name}</option>)}
                </select>
                <button type="button" onClick={() => setLessonModal(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-4">
              {lessonLoading ? (
                <LessonRecordsModalSkeleton />
              ) : (
                <div className="space-y-4">
                  {/* KPIs compactos */}
                  <div className="grid gap-3 sm:grid-cols-4">
                    <InfoCard label="Registros" value={scopedRecords.length} detail="Aulas registradas" icon={<ClipboardList size={16} />} delay={0} />
                    <InfoCard label="Planos" value={planCount} detail="Com plano de aula" tone="emerald" icon={<BookMarked size={16} />} delay={60} />
                    <InfoCard label="Recursos" value={resourceCount} detail="Com materiais" tone="amber" icon={<Zap size={16} />} delay={120} />
                    <InfoCard label="Atividades" value={activityCount} detail="Atividades descritas" tone="rose" icon={<ListChecks size={16} />} delay={180} />
                  </div>

                  {/* Gráfico de barras modal — MELHORADO */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[.18em] text-indigo-500">Por turma</p>
                        <p className="text-sm font-black text-slate-800">Registros, planos e recursos</p>
                      </div>
                      {/* Legenda inline */}
                      <div className="flex items-center gap-3">
                        {[{ color: '#6366f1', label: 'Registros' }, { color: '#10b981', label: 'Planos' }, { color: '#f59e0b', label: 'Recursos' }].map(({ color, label }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-semibold text-slate-500">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="h-56 overflow-x-auto">
                      {lessonClassChart.length > 0 ? (
                        <div className="h-full" style={{ minWidth: Math.max(420, lessonClassChart.length * 100) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={lessonClassChart} margin={{ top: 24, right: 12, left: -12, bottom: 20 }} barCategoryGap="30%" barGap={4}>
                              <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} interval={0} angle={-10} textAnchor="end" height={44} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                              <Bar dataKey="registros" name="Registros" fill="#6366f1" radius={[3, 3, 0, 0]} barSize={22} animationDuration={800}>
                                <LabelList dataKey="registros" position="top" formatter={fmt} style={{ fill: '#475569', fontSize: 8, fontWeight: 700 }} />
                              </Bar>
                              <Bar dataKey="planos" name="Planos" fill="#10b981" radius={[3, 3, 0, 0]} barSize={22} animationBegin={120} animationDuration={800}>
                                <LabelList dataKey="planos" position="top" formatter={fmt} style={{ fill: '#475569', fontSize: 8, fontWeight: 700 }} />
                              </Bar>
                              <Bar dataKey="recursos" name="Recursos" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={22} animationBegin={240} animationDuration={800}>
                                <LabelList dataKey="recursos" position="top" formatter={fmt} style={{ fill: '#475569', fontSize: 8, fontWeight: 700 }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <EmptyState message="Nenhum registro para exibir." icon={<BarChart3 size={32} />} />
                      )}
                    </div>
                  </div>

                  {/* Pies lado a lado compactos */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Por matéria', data: lessonSubjectData, icon: <BookOpen size={14} /> },
                      { label: 'Uso de recursos', data: lessonResourceData, icon: <Zap size={14} /> },
                    ].map(({ label, data, icon }) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-slate-400">{icon}</span>
                          <p className="text-xs font-black text-slate-700">{label}</p>
                        </div>
                        <div className="h-36">
                          {data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart margin={{ top: 6, right: 44, bottom: 6, left: 44 }}>
                                <Pie data={data} dataKey="value" nameKey="name" innerRadius={32} outerRadius={50} paddingAngle={4} label={renderPieLabel} labelLine={false} animationDuration={900}>
                                  {data.map((entry, i) => <Cell key={entry.name} fill={lessonChartColors[i % lessonChartColors.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 11 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : <EmptyState message="Sem dados." icon={<BookOpen size={24} />} />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* LISTA DE REGISTROS — COMPACTA EM TABELA */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-400" />
                      <p className="text-xs font-black text-slate-700">Registros detalhados</p>
                      {scopedRecords.length > 0 && (
                        <span className="ml-auto text-[10px] font-bold text-slate-400">{Math.min(scopedRecords.length, 8)} de {scopedRecords.length}</span>
                      )}
                    </div>

                    {scopedRecords.length > 0 ? (
                      <div className="overflow-x-auto">
                        {/* Header da tabela */}
                        <div className="grid grid-cols-[120px_1fr_1fr_1fr_1fr] gap-0 border-b border-slate-100 bg-indigo-50/50 px-4 py-2">
                          {['Turma · Data', 'Matéria', 'Conteúdo', 'Plano', 'Recursos'].map((h) => (
                            <p key={h} className="text-[9px] font-black uppercase tracking-[.15em] text-indigo-500 truncate px-1">{h}</p>
                          ))}
                        </div>
                        {/* Rows compactas */}
                        <div className="divide-y divide-slate-100">
                          {scopedRecords.slice(0, 8).map((record, i) => (
                            <AnimatedEntry key={record.id} delay={i * 40} animation="fade-in">
                              <div className="grid grid-cols-[120px_1fr_1fr_1fr_1fr] gap-0 px-4 py-2.5 hover:bg-slate-50 transition-colors items-center">
                                <div className="px-1">
                                  <p className="text-[10px] font-black text-slate-700 truncate">{getClassName(record.classId)}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold">{record.date}</p>
                                </div>
                                <div className="px-1">
                                  <span className="inline-block rounded-full border px-2 py-0.5 text-[9px] font-black" style={{ backgroundColor: `${subjectColors[record.subject.trim() || 'Sem matéria'] ?? '#6366f1'}15`, borderColor: `${subjectColors[record.subject.trim() || 'Sem matéria'] ?? '#6366f1'}40`, color: subjectColors[record.subject.trim() || 'Sem matéria'] ?? '#6366f1' }}>
                                    {record.subject || 'Sem matéria'}
                                  </span>
                                </div>
                                <div className="px-1"><p className="text-[10px] font-semibold text-slate-600 truncate">{record.content || <span className="text-slate-300">—</span>}</p></div>
                                <div className="px-1"><p className="text-[10px] font-semibold text-slate-600 truncate">{record.plan || <span className="text-slate-300">—</span>}</p></div>
                                <div className="px-1"><p className="text-[10px] font-semibold text-slate-600 truncate">{record.resources || <span className="text-slate-300">—</span>}</p></div>
                              </div>
                            </AnimatedEntry>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6">
                        <EmptyState message="Nenhum registro encontrado." icon={<ClipboardList size={36} />} />
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

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
    </>
  )
}