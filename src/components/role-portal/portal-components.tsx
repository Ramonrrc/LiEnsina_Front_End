import { useEffect, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  BookOpen,
  BookText,
  Calculator,
  Dumbbell,
  FlaskConical,
  Globe,
  Microscope,
  Music,
  Palette,
  School,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import { formatClassGrade } from '../../class-grade-options'
import type { CompactSelectOption } from '../ui/compact-select'
import { PageTitleBar } from '../ui/page-title-bar'
import type { ClassRoom, Student } from '../../types'

export function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`}
      style={{ animation: 'skeletonShimmer 1.6s ease-in-out infinite' }}
    />
  )
}

export function InfoCardSkeleton() {
  return (
    <article className="rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-sm">
      <SkeletonPulse className="h-5 w-20 rounded-full" />
      <SkeletonPulse className="mt-4 h-8 w-28" />
      <SkeletonPulse className="mt-2 h-4 w-36" />
    </article>
  )
}

export function StudentCardSkeleton() {
  return (
    <article className="rounded-xl border-2 border-slate-300 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-4 w-32" />
          <SkeletonPulse className="h-3 w-24" />
        </div>
        <SkeletonPulse className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SkeletonPulse className="h-8 rounded-lg" />
        <SkeletonPulse className="h-8 rounded-lg" />
      </div>
    </article>
  )
}

// ─── Shell ──────────────────────────────────────────────────────────────────

export function SectionShell({
  label,
  title,
  description,
  icon,
  headerActions,
  children,
}: {
  label: string
  title: string
  description: string
  icon: ReactNode
  headerActions?: ReactNode
  children: ReactNode
  accentColor?: 'indigo' | 'emerald' | 'violet' | 'sky'
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="relative grid min-h-screen content-start gap-4 bg-slate-50 px-[clamp(14px,2.5vw,40px)] py-5 pb-10 font-['DM_Sans'] text-slate-900"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes barGrow {
          from { width: 0; }
          to { width: var(--bar-w); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.35); }
          70% { box-shadow: 0 0 0 8px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        .animate-fade-slide-up { animation: fadeSlideUp 0.42s cubic-bezier(.22,1,.36,1) both; }
        .animate-fade-slide-in { animation: fadeSlideIn 0.3s cubic-bezier(.22,1,.36,1) both; }
        .animate-fade-in { animation: fadeIn 0.3s ease both; }
        .animate-scale-in { animation: scaleIn 0.32s cubic-bezier(.22,1,.36,1) both; }
        .animate-slide-right { animation: slideInRight 0.3s cubic-bezier(.22,1,.36,1) both; }
        .card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.09); }
        .btn-primary { transition: all 0.15s ease; }
        .btn-primary:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(79,70,229,0.35); }
        .btn-primary:active { transform: translateY(0); }
        .bar-animate { animation: barGrow 0.85s cubic-bezier(.22,1,.36,1) both; }
        .subject-card-action { transition: all 0.15s ease; }
        .subject-card-action:hover { transform: translateY(-1px); }
        .pulse-ring { animation: pulseRing 2s ease-out infinite; }
      `}</style>
      <PageTitleBar
        label={label}
        title={title}
        icon={icon}
        actions={
          headerActions ?? (
            <p className="hidden max-w-[520px] truncate text-[11px] font-semibold text-slate-500 lg:block">
              {description}
            </p>
          )
        }
      />
      {children}
    </div>
  )
}

export function LockedSchoolField({ value }: { value: string }) {
  return (
    <label className="flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg border-2 border-slate-300 bg-slate-100 px-3 text-slate-500 sm:w-[min(360px,70vw)]">
      <School size={15} className="shrink-0 text-slate-400" />
      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        Escola
      </span>
      <select
        aria-label="Escola vinculada ao usuário"
        disabled
        value={value}
        className="min-w-0 flex-1 truncate border-0 bg-transparent text-sm font-black text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-100"
      >
        <option value={value}>{value}</option>
      </select>
    </label>
  )
}

// ─── InfoCard (genérico, demais seções) ─────────────────────────────────────

function normalizeMetricLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseMetricNumber(value: string | number) {
  return Number(String(value).replace('%', '').replace(',', '.').trim())
}

function CircularMetric({
  value,
  max,
  display,
  tone,
  size = 'md',
}: {
  value: number
  max: number
  display: string
  tone: 'indigo' | 'emerald' | 'amber' | 'rose'
  size?: 'sm' | 'md'
}) {
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(100, (value / max) * 100))
  const offset = circumference * (1 - progress / 100)
  const toneClass = {
    indigo: 'text-indigo-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
  }[tone]
  const trackClass = {
    indigo: 'text-indigo-100',
    emerald: 'text-emerald-100',
    amber: 'text-amber-100',
    rose: 'text-rose-100',
  }[tone]
  const boxClass = size === 'sm' ? 'h-20 w-20' : 'h-24 w-24'
  const textClass = size === 'sm' ? 'text-lg' : 'text-xl'

  return (
    <div className={`relative grid shrink-0 place-items-center ${boxClass}`} aria-label={`${display} de ${max}`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96" role="presentation">
        <circle
          className={trackClass}
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
        />
        <circle
          className={toneClass}
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <strong className={`absolute font-['Sora',system-ui,sans-serif] ${textClass} font-black text-slate-950`}>
        {display}
      </strong>
    </div>
  )
}

export function InfoCard({
  label,
  value,
  detail,
  tone = 'indigo',
  icon,
  trend,
  delay = 0,
  soft = false,
}: {
  label: string
  value: string | number
  detail: string
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose'
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  delay?: number
  soft?: boolean
}) {
  const toneConfig = {
    indigo: {
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-400',
      softBadge: 'bg-indigo-50 text-indigo-700 border-indigo-400',
      icon: 'bg-indigo-100 text-indigo-600',
      accent: 'border-l-indigo-500',
      glow: 'shadow-indigo-100',
    },
    emerald: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-400',
      softBadge: 'bg-emerald-50 text-emerald-700 border-emerald-400',
      icon: 'bg-emerald-100 text-emerald-600',
      accent: 'border-l-emerald-500',
      glow: 'shadow-emerald-100',
    },
    amber: {
      badge: 'bg-amber-50 text-amber-700 border-amber-400',
      softBadge: 'bg-amber-50 text-amber-700 border-amber-400',
      icon: 'bg-amber-100 text-amber-600',
      accent: 'border-l-amber-500',
      glow: 'shadow-amber-100',
    },
    rose: {
      badge: 'bg-rose-50 text-rose-700 border-rose-400',
      softBadge: 'bg-rose-50 text-rose-700 border-rose-400',
      icon: 'bg-rose-100 text-rose-600',
      accent: 'border-l-rose-500',
      glow: 'shadow-rose-100',
    },
  }[tone]
  const normalizedLabel = normalizeMetricLabel(label)
  const isCircularMetric = normalizedLabel.includes('media') || normalizedLabel.includes('frequencia')
  const metricValue = parseMetricNumber(value)
  const metricMax = normalizedLabel.includes('media') ? 10 : 100
  const showCircularMetric = isCircularMetric && Number.isFinite(metricValue)

  return (
    <article
      className={`card-hover animate-fade-slide-up rounded-2xl bg-white p-5 shadow-md ${toneConfig.glow} ${
        soft ? 'border border-slate-300' : `border-2 border-slate-400 border-l-4 ${toneConfig.accent}`
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${soft ? toneConfig.softBadge : toneConfig.badge}`}
        >
          {label}
        </span>
        {icon && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneConfig.icon}`}>
            {icon}
          </span>
        )}
      </div>
      {showCircularMetric ? (
        <div className="mt-4 flex items-center gap-4">
          <CircularMetric value={metricValue} max={metricMax} display={String(value)} tone={tone} />
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-5 text-slate-500">{detail}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Meta: {metricMax === 100 ? '100%' : metricMax}
            </p>
          </div>
        </div>
      ) : (
        <>
          <strong className="mt-3 block font-['Sora',system-ui,sans-serif] text-3xl font-black tracking-tight text-slate-950">
            {value}
          </strong>
          <div className="mt-1.5 flex items-center gap-1.5">
            {trend === 'up' && <TrendingUp size={13} className="text-emerald-500" />}
            {trend === 'down' && <TrendingDown size={13} className="text-rose-500" />}
            <p className="text-xs font-semibold text-slate-500">{detail}</p>
          </div>
        </>
      )}
    </article>
  )
}

// ─── PanelCard ───────────────────────────────────────────────────────────────

export function PanelCard({ header, children, soft = false }: { header: ReactNode; children: ReactNode; soft?: boolean }) {
  return (
    <div className={`animate-fade-slide-up overflow-hidden rounded-2xl bg-white shadow-md ${soft ? 'border border-slate-300' : 'border-2 border-slate-400'}`}>
      <div className={`${soft ? 'border-b border-slate-300' : 'border-b-2 border-slate-300'} bg-gradient-to-r from-slate-50 to-white px-5 py-4`}>
        {header}
      </div>
      <div className="grid gap-3 p-4">{children}</div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getClassStudents(students: Student[], classId: string) {
  return students.filter((s) => s.classId === classId)
}
export function getAverage(students: Student[]) {
  if (!students.length) return 0
  return students.reduce((sum, s) => sum + (s.averageScore ?? 0), 0) / students.length
}
export function getAttendance(students: Student[]) {
  if (!students.length) return 0
  return Math.round(students.reduce((sum, s) => sum + (s.attendanceRate ?? 0), 0) / students.length)
}
export function normalizeAcademicText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
export function splitAcademicList(value?: string | null) {
  return (value ?? '')
    .split(/[,;|/]+|\s+-\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}
export function uniqueAcademicList(values: string[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    const normalized = normalizeAcademicText(value)
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}
function isCurriculumSkillCode(value?: string | null) {
  return /^EF\d{2}[A-Z]{2}\d{2}[A-Z]?$/i.test(String(value ?? '').trim())
}
export function classMatchesSubject(classRoom: ClassRoom, subject: string) {
  const classSubjects = classRoom.bnccFocus ?? []
  if (!classSubjects.length) return !isCurriculumSkillCode(subject)
  const normalizedSubject = normalizeAcademicText(subject)
  return classSubjects.some((item) => {
    const normalizedItem = normalizeAcademicText(item)
    return (
      normalizedItem === normalizedSubject ||
      normalizedItem.includes(normalizedSubject) ||
      normalizedSubject.includes(normalizedItem)
    )
  })
}
export function classOptions(classes: ClassRoom[]): CompactSelectOption[] {
  return classes.map((classRoom) => ({
    value: classRoom.id,
    label: classRoom.name,
    description: `${formatClassGrade(classRoom.grade)} - ${classRoom.shift}`,
  }))
}

export function getSubjectIcon(subject: string): ReactNode {
  const normalizedSubject = normalizeAcademicText(subject)
  if (normalizedSubject.includes('mat') || normalizedSubject.includes('calc') || normalizedSubject.includes('numero')) return <Calculator size={18} />
  if (normalizedSubject.includes('cienc') || normalizedSubject.includes('bio') || normalizedSubject.includes('quim') || normalizedSubject.includes('fis')) return <Microscope size={18} />
  if (normalizedSubject.includes('hist') || normalizedSubject.includes('geo') || normalizedSubject.includes('social')) return <Globe size={18} />
  if (normalizedSubject.includes('port') || normalizedSubject.includes('lingua') || normalizedSubject.includes('liter') || normalizedSubject.includes('redac')) return <BookText size={18} />
  if (normalizedSubject.includes('arte') || normalizedSubject.includes('visual') || normalizedSubject.includes('desenho')) return <Palette size={18} />
  if (normalizedSubject.includes('educ') && normalizedSubject.includes('fis')) return <Dumbbell size={18} />
  if (normalizedSubject.includes('music')) return <Music size={18} />
  if (normalizedSubject.includes('ingles') || normalizedSubject.includes('espanhol') || normalizedSubject.includes('frances')) return <Globe size={18} />
  if (normalizedSubject.includes('lab') || normalizedSubject.includes('experim')) return <FlaskConical size={18} />
  return <BookOpen size={18} />
}

export function getSubjectIconBg(index: number) {
  const palettes = [
    { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    { bg: 'bg-violet-100', text: 'text-violet-600' },
    { bg: 'bg-sky-100', text: 'text-sky-600' },
    { bg: 'bg-amber-100', text: 'text-amber-600' },
    { bg: 'bg-rose-100', text: 'text-rose-600' },
    { bg: 'bg-teal-100', text: 'text-teal-600' },
    { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600' },
  ]
  return palettes[index % palettes.length]
}

export function getSubjectAccent(index: number) {
  const accents = [
    { border: 'border-indigo-500', strip: 'bg-indigo-500', badge: 'bg-indigo-50 border-indigo-400 text-indigo-700', badgeText: 'text-indigo-500', btn: 'border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
    { border: 'border-emerald-500', strip: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-400 text-emerald-700', badgeText: 'text-emerald-500', btn: 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
    { border: 'border-violet-500', strip: 'bg-violet-500', badge: 'bg-violet-50 border-violet-400 text-violet-700', badgeText: 'text-violet-500', btn: 'border-violet-400 bg-violet-50 text-violet-700 hover:bg-violet-100' },
    { border: 'border-sky-500', strip: 'bg-sky-500', badge: 'bg-sky-50 border-sky-400 text-sky-700', badgeText: 'text-sky-500', btn: 'border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100' },
    { border: 'border-amber-500', strip: 'bg-amber-500', badge: 'bg-amber-50 border-amber-400 text-amber-700', badgeText: 'text-amber-500', btn: 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100' },
    { border: 'border-rose-500', strip: 'bg-rose-500', badge: 'bg-rose-50 border-rose-400 text-rose-700', badgeText: 'text-rose-500', btn: 'border-rose-400 bg-rose-50 text-rose-700 hover:bg-rose-100' },
    { border: 'border-teal-500', strip: 'bg-teal-500', badge: 'bg-teal-50 border-teal-400 text-teal-700', badgeText: 'text-teal-500', btn: 'border-teal-400 bg-teal-50 text-teal-700 hover:bg-teal-100' },
    { border: 'border-fuchsia-500', strip: 'bg-fuchsia-500', badge: 'bg-fuchsia-50 border-fuchsia-400 text-fuchsia-700', badgeText: 'text-fuchsia-500', btn: 'border-fuchsia-400 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100' },
  ]
  return accents[index % accents.length]
}

export function CompactProgressMetric({
  label,
  value,
  detail,
  progress,
  tone = 'indigo',
}: {
  label: string
  value: string | number
  detail: string
  progress: number
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose'
}) {
  const safeProgress = Math.max(0, Math.min(100, progress))
  const toneClass = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  }[tone]
  const trackClass = {
    indigo: 'bg-indigo-100',
    emerald: 'bg-emerald-100',
    amber: 'bg-amber-100',
    rose: 'bg-rose-100',
  }[tone]
  const valueClass = {
    indigo: 'text-indigo-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
  }[tone]

  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[10px] font-black uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <strong className={`shrink-0 text-sm font-black ${valueClass}`}>{value}</strong>
      </div>
      <div className={`mt-2 h-2 overflow-hidden rounded-full ${trackClass}`}>
        <span
          className={`block h-full rounded-full ${toneClass}`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      <span className="mt-1.5 block text-[11px] font-semibold text-slate-500">{detail}</span>
    </div>
  )
}

// ─── MetricProgress ──────────────────────────────────────────────────────────

export function MetricProgress({
  label,
  value,
  max = 100,
  tone = 'indigo',
  detail,
  icon,
  delay = 0,
  soft = false,
}: {
  label: string
  value: number
  max?: number
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose'
  detail: string
  icon?: ReactNode
  delay?: number
  soft?: boolean
}) {
  const displayValue = `${value.toFixed(max === 10 ? 1 : 0)}${max === 100 ? '%' : ''}`

  return (
    <div
      className={`animate-fade-slide-up rounded-xl bg-white p-4 shadow-sm ${soft ? 'border border-slate-300' : 'border-2 border-slate-400'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <CircularMetric value={value} max={max} display={displayValue} tone={tone} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-slate-400">{icon}</span>}
            <p className="text-sm font-black text-slate-900">{label}</p>
          </div>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{detail}</p>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Meta: {max === 100 ? '100%' : max}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── ActionButton ────────────────────────────────────────────────────────────

export function ActionButton({
  children,
  onClick,
  tone = 'slate',
}: {
  children: ReactNode
  onClick: () => void
  tone?: 'slate' | 'indigo'
}) {
  const className =
    tone === 'indigo'
      ? 'border-indigo-500 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200 hover:shadow-md btn-primary'
      : 'border-slate-400 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 shadow-sm'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border-2 px-3 text-xs font-black transition-all duration-150 ${className}`}
    >
      {children}
    </button>
  )
}

// ─── SectionHeader ───────────────────────────────────────────────────────────

export function SectionHeader({
  icon,
  label,
  subtitle,
}: {
  icon: ReactNode
  label: string
  subtitle?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-200/70 text-indigo-600">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">{label}</h2>
        {subtitle && <p className="text-[11px] font-semibold text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}

// ─── AlertBanner ─────────────────────────────────────────────────────────────

export function AlertBanner({
  message,
  tone = 'amber',
  soft = false,
}: {
  message: string
  tone?: 'amber' | 'rose' | 'indigo'
  soft?: boolean
}) {
  const config = {
    amber: soft ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-amber-400 bg-amber-50 text-amber-800',
    rose: soft ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-rose-400 bg-rose-50 text-rose-800',
    indigo: soft ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-indigo-400 bg-indigo-50 text-indigo-800',
  }[tone]

  return (
    <div
      className={`animate-fade-in flex items-center gap-2.5 rounded-xl p-4 text-sm font-semibold ${soft ? 'border' : 'border-2'} ${config}`}
    >
      <AlertTriangle size={16} className="shrink-0" />
      {message}
    </div>
  )
}

// ─── EmptyState ──────────────────────────────────────────────────────────────

export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white py-12 px-6 text-center">
      {icon && <span className="text-slate-300">{icon}</span>}
      <p className="text-sm font-semibold text-slate-400">{message}</p>
    </div>
  )
}
