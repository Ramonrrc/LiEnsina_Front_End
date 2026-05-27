import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpen,
  CalendarCheck,
  GraduationCap,
  Percent,
  Search,
  TrendingUp,
  UserRound,
  Users,
  X,
  School,
  BarChart3,
  Award,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Hash,
  CalendarDays,
  UserCheck,
  Layers,
  BadgeCheck,
  Target,
  ChevronRight,
  Mail,
  SlidersHorizontal,
  Sparkles,
  ArrowUpRight,
  Star,
  Activity,
} from 'lucide-react'

import { resolveApiAssetUrl } from '../api'
import { AvatarHoverPreview } from '../components/profile/AvatarSign'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { DEFAULT_PAGE_SIZE, PaginationControls, paginateLocal } from '../components/ui/pagination-controls'
import { getOfficialAcademicSubjectLabel, getOfficialAcademicSubjectList, getOfficialAcademicSubjectListForGrade, splitAcademicList } from '../components/role-portal/portal-components'
import { formatClassGrade } from '../class-grade-options'
import { getStudentAttendanceRateFromLessons } from '../lib/lesson-attendance'
import type {
  ClassRoom,
  Desempenho,
  Role,
  SchoolsScreenPayload,
  Student,
  StudentsPageQuery,
  StudentsPagePayload,
  Teacher,
  UserAccount,
} from '../types'

interface StudentsViewProps {
  schoolsData: SchoolsScreenPayload
  currentUser: UserAccount
  currentRole: Role | null
  assetVersion?: ProfileAssetVersion
  onLoadStudentsPage?: (params: StudentsPageQuery) => Promise<StudentsPagePayload>
}

type ProfileAssetVersion = {
  avatar?: string | number
  banner?: string | number
}

type ProfilePreviewEntity = {
  id?: string
  userId?: string
  name: string
  email?: string
  login?: string
  registrationNumber?: string
  avatarUrl?: string | null
  bannerUrl?: string | null
  user?: {
    name?: string
    email?: string
    login?: string
    avatarUrl?: string | null
    bannerUrl?: string | null
  } | null
}

type StudentPerformanceLevel = 'Otimo' | 'Bom' | 'Medio' | 'Baixo'
type StudentPerformanceFilter = 'Todos' | StudentPerformanceLevel

const performanceFilters: StudentPerformanceFilter[] = ['Todos', 'Otimo', 'Bom', 'Medio', 'Baixo']

const studentPerformanceStyles: Record<StudentPerformanceLevel, {
  dot: string
  text: string
  bg: string
  ring: string
  border: string
  progress: string
  gradient: string
  avatarGradient: string
  glow: string
}> = {
  Otimo: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    border: 'border-emerald-200',
    progress: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
    gradient: 'from-emerald-500 to-teal-500',
    avatarGradient: 'from-emerald-400 to-teal-500',
    glow: 'shadow-emerald-200',
  },
  Bom: {
    dot: 'bg-blue-400',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    ring: 'ring-blue-200',
    border: 'border-blue-200',
    progress: 'bg-gradient-to-r from-blue-400 to-blue-500',
    gradient: 'from-blue-500 to-indigo-500',
    avatarGradient: 'from-blue-400 to-indigo-500',
    glow: 'shadow-blue-200',
  },
  Medio: {
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    border: 'border-amber-200',
    progress: 'bg-gradient-to-r from-amber-400 to-orange-400',
    gradient: 'from-amber-500 to-orange-500',
    avatarGradient: 'from-amber-400 to-orange-500',
    glow: 'shadow-amber-200',
  },
  Baixo: {
    dot: 'bg-rose-400',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    border: 'border-rose-200',
    progress: 'bg-gradient-to-r from-rose-400 to-red-500',
    gradient: 'from-rose-500 to-red-500',
    avatarGradient: 'from-rose-400 to-red-500',
    glow: 'shadow-rose-200',
  },
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v))))
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function getStudentPerformanceLevel(student: Pick<Student, 'averageScore' | 'desempenho'>): StudentPerformanceLevel {
  const score = Number(student.averageScore)
  if (Number.isFinite(score)) {
    if (score >= 8) return 'Otimo'
    if (score >= 7) return 'Bom'
    if (score >= 6) return 'Medio'
    return 'Baixo'
  }
  if (student.desempenho === 'Otimo') return 'Otimo'
  if (student.desempenho === 'Baixo') return 'Baixo'
  return 'Medio'
}

function getAttendanceTextTone(rate: number) {
  if (rate >= 90) return 'text-emerald-600'
  if (rate >= 75) return 'text-amber-600'
  return 'text-rose-600'
}

function getShiftLabel(shift?: string | null) {
  if (shift === 'Manha') return 'Manhã'
  if (shift === 'Tarde') return 'Tarde'
  if (shift === 'Noite') return 'Noite'
  return 'Turno pendente'
}

function getProfileEmail(entity: ProfilePreviewEntity) {
  return entity.email ?? entity.user?.email ?? entity.login ?? entity.user?.login ?? entity.registrationNumber ?? 'Sem e-mail cadastrado'
}

function getProfileAvatarUrl(entity: ProfilePreviewEntity, version?: string | number) {
  return resolveApiAssetUrl(entity.avatarUrl ?? entity.user?.avatarUrl, version)
}

function getProfileBannerUrl(entity: ProfilePreviewEntity, version?: string | number) {
  return resolveApiAssetUrl(entity.bannerUrl ?? entity.user?.bannerUrl, version)
}

function formatScore(score: number | null | undefined) {
  return typeof score === 'number' && Number.isFinite(score) ? score.toFixed(1) : '–'
}

function getPerformanceFromScore(score: number | null): Desempenho | null {
  if (score === null) return null
  if (score >= 8) return 'Otimo'
  if (score >= 6) return 'Medio'
  return 'Baixo'
}

function getPerformanceLabel(level?: StudentPerformanceFilter | Desempenho | null) {
  if (level === 'Todos') return 'Todos'
  if (level === 'Bom') return 'Bom'
  if (level === 'Otimo') return 'Ótimo'
  if (level === 'Medio') return 'Médio'
  if (level === 'Baixo') return 'Baixo'
  return 'Sem notas'
}

function getPerformanceTone(level?: StudentPerformanceLevel | Desempenho | null) {
  if (level === 'Otimo') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (level === 'Bom') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (level === 'Medio') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (level === 'Baixo') return 'border-rose-200 bg-rose-50 text-rose-700'
  return 'border-slate-200 bg-slate-50 text-slate-500'
}

function getPerformanceIcon(level?: StudentPerformanceLevel | Desempenho | null) {
  if (level === 'Otimo') return CheckCircle2
  if (level === 'Bom') return TrendingUp
  if (level === 'Medio') return Target
  if (level === 'Baixo') return AlertTriangle
  return BarChart3
}

function getAverageScore(students: Student[]) {
  const scores = students
    .map((s) => s.averageScore)
    .filter((s): s is number => typeof s === 'number' && Number.isFinite(s))
  if (!scores.length) return null
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    </div>
  )
}

function StudentCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
      style={{ animationDelay: `${delay}ms`, animation: `svFadeUp 0.5s ease both ${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <Bone className="h-13 w-13 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <Bone className="h-4 w-40" />
          <Bone className="h-3 w-28" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Bone className="h-[72px] rounded-xl" />
        <Bone className="h-[72px] rounded-xl" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Bone className="h-5 w-20 rounded-full" />
        <Bone className="h-4 w-16" />
      </div>
    </div>
  )
}

// ─── Label ─────────────────────────────────────────────────────────────────────

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[9.5px] font-bold tracking-[.2em] uppercase text-slate-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function ProfileAvatar({
  entity,
  size = 'sm',
  assetVersion,
  focusable = true,
}: {
  entity: ProfilePreviewEntity
  size?: 'sm' | 'md' | 'lg'
  assetVersion?: ProfileAssetVersion
  focusable?: boolean
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [previewStyle, setPreviewStyle] = useState<CSSProperties | null>(null)
  const name = entity.name || entity.user?.name || 'Usuário'
  const email = getProfileEmail(entity)
  const initials = getInitials(name)
  const avatarSrc = getProfileAvatarUrl(entity, assetVersion?.avatar)
  const bannerSrc = getProfileBannerUrl(entity, assetVersion?.banner)
  const hasProfileImage = Boolean(avatarSrc || bannerSrc)
  const sizeClass = size === 'lg' ? 'h-[52px] w-[52px] text-[15px]' : size === 'md' ? 'h-10 w-10 text-[13px]' : 'h-7 w-7 text-[10px]'

  function showPreview() {
    if (!hasProfileImage) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const previewWidth = Math.min(360, window.innerWidth - 48)
    const left = Math.min(Math.max(24, rect.left), Math.max(24, window.innerWidth - previewWidth - 24))
    const belowTop = rect.bottom + 10
    const previewHeight = 220
    const top = belowTop + previewHeight > window.innerHeight ? Math.max(16, rect.top - previewHeight - 10) : belowTop
    setPreviewStyle({ left, top, width: previewWidth })
  }

  return (
    <div ref={wrapperRef} className="group/avatar relative shrink-0" onMouseEnter={showPreview} onMouseLeave={() => setPreviewStyle(null)}>
      <span
        tabIndex={hasProfileImage && focusable ? 0 : -1}
        className={`grid overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-br from-violet-500 to-indigo-600 font-black text-white shadow-md ring-2 ring-slate-200/80 outline-none transition-all duration-200 ${hasProfileImage ? 'cursor-pointer hover:ring-violet-300 focus:ring-2 focus:ring-violet-400 hover:scale-105' : ''} ${sizeClass}`}
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt={name} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="grid h-full w-full place-items-center">{initials || <UserRound size={size === 'lg' ? 20 : size === 'md' ? 15 : 12} />}</span>
        )}
      </span>
      {hasProfileImage && previewStyle && typeof document !== 'undefined'
        ? createPortal(
            <AvatarHoverPreview name={name} email={email} avatarSrc={avatarSrc} bannerSrc={bannerSrc} initials={initials} position="fixed" style={previewStyle} visible className="" />,
            document.body,
          )
        : null}
    </div>
  )
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 40, strokeWidth = 3.5, color }: { pct: number; size?: number; strokeWidth?: number; color: string }) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-slate-100" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

const ringColors: Record<StudentPerformanceLevel, { stroke: string; text: string; bg: string }> = {
  Otimo: { stroke: '#10b981', text: '#065f46', bg: '#ecfdf5' },
  Bom: { stroke: '#3b82f6', text: '#1e40af', bg: '#eff6ff' },
  Medio: { stroke: '#f59e0b', text: '#92400e', bg: '#fffbeb' },
  Baixo: { stroke: '#f43f5e', text: '#9f1239', bg: '#fff1f2' },
}

function getScorePerformanceLevel(score: number | null | undefined): StudentPerformanceLevel | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  if (score >= 8) return 'Otimo'
  if (score >= 7) return 'Bom'
  if (score >= 6) return 'Medio'
  return 'Baixo'
}

function ScoreRing({ score, size = 44 }: { score: number | null | undefined; size?: number }) {
  const level = getScorePerformanceLevel(score)
  const pct = typeof score === 'number' && Number.isFinite(score) ? Math.min(100, Math.max(0, (score / 10) * 100)) : 0
  const colors = level ? ringColors[level] : { stroke: '#cbd5e1', text: '#94a3b8', bg: '#f8fafc' }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full" style={{ background: colors.bg }} />
      <div className="absolute inset-0">
        <ProgressRing pct={pct} size={size} color={colors.stroke} />
      </div>
      <span className="relative z-10 text-[11px] font-bold tabular-nums" style={{ color: colors.text }}>
        {typeof score === 'number' && Number.isFinite(score) ? score.toFixed(1) : '–'}
      </span>
    </div>
  )
}

// ─── Section Strip ──────────────────────────────────────────────────────────

function StudentInitialBadge({ name, level, size = 'md' }: { name: string; level: StudentPerformanceLevel; size?: 'md' | 'lg' }) {
  const style = studentPerformanceStyles[level]
  const sizeClass = size === 'lg' ? 'h-[52px] w-[52px] rounded-2xl text-base' : 'h-[50px] w-[50px] rounded-2xl text-sm'
  return (
    <div className={`flex shrink-0 items-center justify-center bg-gradient-to-br ${style.avatarGradient} ${sizeClass} font-bold text-white shadow-md shadow-${level === 'Otimo' ? 'emerald' : level === 'Bom' ? 'blue' : level === 'Medio' ? 'amber' : 'rose'}-200`}>
      {getInitials(name)}
    </div>
  )
}

function MiniMetric({ icon: Icon, label, value, valueClass = 'text-slate-900' }: {
  icon: React.ElementType
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-100/80">
      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold tabular-nums leading-none ${valueClass}`}>
        {value}
      </div>
    </div>
  )
}

function ProgressLine({ value, className }: { value: number; className: string }) {
  return (
    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${className}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</dt>
        <dd className="break-words text-[13px] font-medium text-slate-900">{value}</dd>
      </div>
    </div>
  )
}

function SectionStrip({
  icon: Icon, label, title, count,
}: {
  icon: React.ElementType
  label: string
  title: string
  count: number
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-slate-50/80 to-white">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-200/60">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <Label className="text-violet-500">{label}</Label>
        <h2 className="text-sm font-bold text-slate-900 leading-tight mt-0.5">{title}</h2>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
        {count}
      </span>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  id, title, subtitle, onClose, children, maxWidth = '720px',
}: {
  id: string
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-[2px]"
      style={{ animation: 'svOverlayIn 0.2s ease both' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20"
        style={{ maxWidth, maxHeight: '92vh', animation: 'svModalIn 0.3s cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <h2 id={id} className="sr-only">{title}</h2>
        <p className="sr-only">{subtitle}</p>
        {/* drag handle on mobile */}
        <div className="sticky top-0 z-10 flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-200" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={16} />
        </button>
        <div className="p-6 pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Performance Filter Chip ──────────────────────────────────────────────────

const filterMeta: Record<StudentPerformanceFilter, { icon: React.ElementType; color: string; activeClass: string }> = {
  Todos: { icon: Layers, color: 'text-slate-500', activeClass: 'bg-slate-900 border-slate-900 text-white' },
  Otimo: { icon: Star, color: 'text-emerald-600', activeClass: 'bg-emerald-500 border-emerald-500 text-white' },
  Bom: { icon: TrendingUp, color: 'text-blue-600', activeClass: 'bg-blue-500 border-blue-500 text-white' },
  Medio: { icon: Target, color: 'text-amber-600', activeClass: 'bg-amber-500 border-amber-500 text-white' },
  Baixo: { icon: AlertTriangle, color: 'text-rose-600', activeClass: 'bg-rose-500 border-rose-500 text-white' },
}

// ─── Student Card ─────────────────────────────────────────────────────────────

function StudentCard({
  student,
  profile,
  profileAssetVersion,
  className,
  attendanceRate,
  perf,
  subjectCount,
  animDelay,
  onClick,
}: {
  student: Student
  profile: ProfilePreviewEntity
  profileAssetVersion?: ProfileAssetVersion
  className: string
  attendanceRate: number
  perf: StudentPerformanceLevel
  subjectCount: number
  animDelay: number
  onClick: () => void
}) {
  const style = studentPerformanceStyles[perf]
  const login = student.login || student.registrationNumber || student.registration || 'aluno'
  const hasProfilePhoto = Boolean(
    getProfileAvatarUrl(profile, profileAssetVersion?.avatar)
    || getProfileBannerUrl(profile, profileAssetVersion?.banner)
  )
  const score = student.averageScore

  return (
    <button
      type="button"
      onClick={onClick}
      className="sv-card group relative flex flex-col rounded-2xl border border-slate-300/90 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 overflow-hidden"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* colored top bar */}
      <div className={`h-0.5 w-full bg-gradient-to-r ${style.gradient} transition-all duration-300 group-hover:h-1`} />

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start gap-3">
          {hasProfilePhoto ? (
            <ProfileAvatar entity={profile} size="lg" assetVersion={profileAssetVersion} focusable={false} />
          ) : (
            <StudentInitialBadge name={student.name} level={perf} />
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-[14.5px] font-bold text-slate-900 leading-tight">{student.name}</h3>
            <p className="truncate text-xs text-slate-400 mt-0.5">
              @{login}
            </p>
            <p className="truncate text-[11px] text-slate-500 mt-0.5 font-medium">{className}</p>
          </div>
          <div className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5">
            <ScoreRing score={score} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniMetric icon={TrendingUp} label="Média" value={formatScore(student.averageScore)} />
          <MiniMetric icon={CalendarCheck} label="Frequência" value={`${attendanceRate}%`} valueClass={getAttendanceTextTone(attendanceRate)} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${style.bg} ${style.text} ${style.border}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {getPerformanceLabel(perf)}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {subjectCount} {subjectCount === 1 ? 'matéria' : 'matérias'}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Summary Stat ─────────────────────────────────────────────────────────────

function SummaryStat({
  icon: Icon, label, value, color, bg, delay,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  bg: string
  delay: number
}) {
  return (
    <div
      className="flex items-center gap-3 px-5 py-4"
      style={{ animation: `svFadeUp 0.4s ease both ${delay}ms` }}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${bg}`}>
        <Icon size={16} className={color} />
      </span>
      <div>
        <p className={`text-2xl font-bold leading-none tabular-nums ${color}`}>{value}</p>
        <Label className="mt-1">{label}</Label>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyStudents({ query }: { query: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 py-16 px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
        <GraduationCap size={26} className="text-slate-300" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-600">Nenhum aluno encontrado</p>
        {query && (
          <p className="mt-1 text-xs text-slate-400">Tente buscar por um nome diferente</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentsView({
  schoolsData,
  currentUser,
  currentRole,
  assetVersion,
  onLoadStudentsPage,
}: StudentsViewProps) {
  const { schools, classes, teachers, students, guardians, lessonRecords = [] } = schoolsData
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [disciplineFilter, setDisciplineFilter] = useState('all')
  const [performanceFilter, setPerformanceFilter] = useState<StudentPerformanceFilter>('Todos')
  const [query, setQuery] = useState('')
  const [studentDetailsId, setStudentDetailsId] = useState<string | null>(null)
  const [studentPage, setStudentPage] = useState(1)
  const [studentLimit, setStudentLimit] = useState(DEFAULT_PAGE_SIZE)
  const [studentSubjectsPage, setStudentSubjectsPage] = useState(1)
  const [studentSubjectsLimit, setStudentSubjectsLimit] = useState(DEFAULT_PAGE_SIZE)
  const [studentPageData, setStudentPageData] = useState<StudentsPagePayload | null>(null)
  const [studentPageLoading, setStudentPageLoading] = useState(false)
  const [studentPageSource, setStudentPageSource] = useState<'backend' | 'local'>(onLoadStudentsPage ? 'backend' : 'local')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setStudentPage(1) }, [disciplineFilter, performanceFilter, query, schoolFilter])
  useEffect(() => {
    setStudentSubjectsPage(1)
    setStudentSubjectsLimit(DEFAULT_PAGE_SIZE)
  }, [studentDetailsId])

  const schoolOptions = useMemo<CompactSelectOption[]>(() => [
    { value: 'all', label: 'Todas as escolas' },
    ...schools.map((s) => ({ value: s.id, label: s.name, description: s.city })),
  ], [schools])

  const disciplineOptions = useMemo<CompactSelectOption[]>(() => [
    { value: 'all', label: 'Todas as disciplinas' },
    ...uniqueValues([
      ...teachers.flatMap((t) => getOfficialAcademicSubjectList([t.specialty])),
      ...classes.flatMap((c) => getOfficialAcademicSubjectListForGrade(c.bnccFocus ?? [], c.grade)),
    ]).map((d) => ({ value: d, label: d })),
  ], [classes, teachers])

  const filteredStudents = useMemo(() => {
    const q = normalize(query)
    const disciplineClassIds = new Set(classes
      .filter((c) => disciplineFilter === 'all' || (c.bnccFocus ?? [])
        .flatMap(splitAcademicList)
        .map((focus) => getOfficialAcademicSubjectListForGrade([focus], c.grade)[0] ?? getOfficialAcademicSubjectLabel(focus))
        .filter(Boolean)
        .some((focus) => normalize(focus).includes(normalize(disciplineFilter))))
      .map((c) => c.id))
    return students.filter((s) => {
      if (schoolFilter !== 'all' && s.schoolId !== schoolFilter) return false
      if (disciplineFilter !== 'all' && !disciplineClassIds.has(s.classId)) return false
      if (performanceFilter !== 'Todos' && getStudentPerformanceLevel(s) !== performanceFilter) return false
      if (!q) return true
      return normalize(`${s.name} ${s.email ?? ''} ${s.login} ${s.registrationNumber}`).includes(q)
    })
  }, [classes, disciplineFilter, performanceFilter, query, schoolFilter, students])

  useEffect(() => {
    if (!onLoadStudentsPage || performanceFilter !== 'Todos') { setStudentPageData(null); setStudentPageSource('local'); return }
    let cancelled = false
    setStudentPageLoading(true)
    onLoadStudentsPage({ page: studentPage, limit: studentLimit, search: query, schoolId: schoolFilter, discipline: disciplineFilter })
      .then((data) => { if (!cancelled) { setStudentPageData(data); setStudentPageSource('backend') } })
      .catch(() => { if (!cancelled) { setStudentPageData(null); setStudentPageSource('local') } })
      .finally(() => { if (!cancelled) setStudentPageLoading(false) })
    return () => { cancelled = true }
  }, [disciplineFilter, onLoadStudentsPage, performanceFilter, query, schoolFilter, studentLimit, studentPage])

  const localStudentsPage = useMemo(() => paginateLocal(filteredStudents, studentPage, studentLimit), [filteredStudents, studentLimit, studentPage])

  const displayedStudents = studentPageData?.students ?? localStudentsPage.items
  const studentPagination = studentPageData?.pagination ?? localStudentsPage.pagination

  function getSchoolName(id: string | null) {
    return id ? schools.find((s) => s.id === id)?.name ?? 'Escola não localizada' : 'Rede municipal'
  }
  function getClassName(id: string) {
    return classes.find((c) => c.id === id)?.name ?? 'Turma não localizada'
  }
  function getClassById(id: string) {
    return classes.find((c) => c.id === id) ?? null
  }
  function getClassTeachers(classRoom: ClassRoom) {
    const ids = new Set([classRoom.teacherId, ...(classRoom.teacherIds ?? [])].filter(Boolean))
    return teachers.filter((t) => ids.has(t.id))
  }
  function getClassStudents(classRoom: ClassRoom) {
    return students.filter((s) => s.classId === classRoom.id)
  }
  function getStudentAttendanceRate(student: Pick<Student, 'id' | 'classId' | 'attendanceRate'> | null | undefined) {
    return getStudentAttendanceRateFromLessons(student, lessonRecords, student?.attendanceRate ?? 0)
  }
  function getGuardianName(id: string) {
    return guardians.find((g) => g.id === id)?.name ?? 'Responsável pendente'
  }
  function getReadableSubjects(subjects: string[], grade?: string | null) {
    const officialSubjects = grade ? getOfficialAcademicSubjectListForGrade(subjects, grade) : getOfficialAcademicSubjectList(subjects)
    return officialSubjects.length ? officialSubjects : uniqueValues(subjects.filter((s) => normalize(s) === normalize('Média geral')))
  }
  function getStudentSubjects(student: Student) {
    const classRoom = getClassById(student.classId)
    const subjects = classRoom?.bnccFocus?.length
      ? classRoom.bnccFocus
      : classRoom ? getClassTeachers(classRoom).map((t) => t.specialty).filter(Boolean) : []
    return getReadableSubjects(subjects.length ? subjects : ['Média geral'], classRoom?.grade)
  }
  function isCurrentLinkedProfile(entity: ProfilePreviewEntity) {
    return Boolean(entity.id && (entity.id === currentUser.linkedStudentId || entity.id === currentUser.linkedTeacherId || entity.userId === currentUser.id))
  }
  function withCurrentUserVisuals<T extends ProfilePreviewEntity>(entity: T): T {
    if (!isCurrentLinkedProfile(entity)) return entity
    return { ...entity, avatarUrl: currentUser.avatarUrl, bannerUrl: currentUser.bannerUrl }
  }
  function getProfileAssetVersion(entity: ProfilePreviewEntity) {
    return isCurrentLinkedProfile(entity) ? assetVersion : undefined
  }
  const selectedStudent = studentDetailsId ? students.find((s) => s.id === studentDetailsId) ?? displayedStudents.find((s) => s.id === studentDetailsId) ?? null : null

  const hasActiveFilters = schoolFilter !== 'all' || disciplineFilter !== 'all' || query !== ''

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        @keyframes svFadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes svFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes svOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes svModalIn { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(250%) } }
        @keyframes svPulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }
        .sv-card { animation: svFadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both }
        .sv-enter { animation: svFadeUp 0.4s ease both }
        .sv-fade { animation: svFadeIn 0.3s ease both }
        .sv-search-active { box-shadow: 0 0 0 3px rgba(139,92,246,.12) }
      `}</style>

      <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif", background: 'linear-gradient(135deg, #faf9ff 0%, #f1f5f9 40%, #f8f9ff 100%)' }}>
        <div className="px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-5">

          {/* ── Header ── */}
          <header className="sv-enter" style={{ animationDelay: '0ms' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">Gestão acadêmica</span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 leading-tight font-DMSans">
                  Alunos
                </h1>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end mt-1">
                {currentRole?.name && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700">
                    <UserCheck size={11} />
                    {currentRole.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                  <Activity size={11} />
                  {studentPagination.total} registros
                </span>
              </div>
            </div>
          </header>

          {/* ── Stats + Filters card ── */}
          <section className="sv-enter" style={{ animationDelay: '60ms' }}>
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-100/80">

              {/* Top accent */}
              <div className="h-px bg-gradient-to-r from-violet-400 via-indigo-500 to-blue-400" />

              {/* Stats row */}
              <div className="grid divide-x divide-slate-100 border-b border-slate-100 sm:grid-cols-3">
                <SummaryStat icon={GraduationCap} label="Alunos" value={studentPagination.total} color="text-violet-700" bg="bg-violet-50" delay={80} />
                <SummaryStat icon={School} label="Escolas" value={schools.length} color="text-emerald-700" bg="bg-emerald-50" delay={120} />
                <SummaryStat icon={Users} label="Turmas" value={classes.length} color="text-blue-700" bg="bg-blue-50" delay={160} />
              </div>

              {/* Performance filter chips */}
              <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
                {performanceFilters.map((filter) => {
                  const active = performanceFilter === filter
                  const meta = filterMeta[filter]
                  const FilterIcon = meta.icon
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setPerformanceFilter(filter)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition-all duration-200 ${
                        active
                          ? `${meta.activeClass} shadow-sm scale-105`
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <FilterIcon size={10} />
                      {getPerformanceLabel(filter)}
                    </button>
                  )
                })}
              </div>

              {/* Search + selects */}
              <div className="p-4 space-y-3 sm:space-y-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                  {/* Search */}
                  <label className="group flex h-10 min-w-0 items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50/80 px-3.5 transition-all duration-200 focus-within:border-violet-400 focus-within:bg-white focus-within:sv-search-active">
                    <Search size={13} className="shrink-0 text-slate-400 transition group-focus-within:text-violet-500" strokeWidth={2.5} />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar aluno por nome, e-mail ou matrícula…"
                      className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    {query && (
                      <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus() }} className="shrink-0 text-slate-400 hover:text-slate-600 transition">
                        <X size={13} />
                      </button>
                    )}
                  </label>

                  <CompactSelect
                    value={schoolFilter}
                    options={schoolOptions}
                    onChange={setSchoolFilter}
                    dropdownWidth="trigger"
                    className={`h-10 min-w-[180px] rounded-xl border px-3.5 text-[13px] font-semibold transition-colors ${schoolFilter !== 'all' ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}
                  />
                  <CompactSelect
                    value={disciplineFilter}
                    options={disciplineOptions}
                    onChange={setDisciplineFilter}
                    dropdownWidth="trigger"
                    className={`h-10 min-w-[180px] rounded-xl border px-3.5 text-[13px] font-semibold transition-colors ${disciplineFilter !== 'all' ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50/80 text-slate-700'}`}
                  />
                </div>

                {/* Active filter tags */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Filtros ativos:</span>
                    {query && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                        "{query}"
                        <button onClick={() => setQuery('')} className="ml-0.5 hover:text-violet-900 transition"><X size={10} /></button>
                      </span>
                    )}
                    {schoolFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                        {schools.find((s) => s.id === schoolFilter)?.name}
                        <button onClick={() => setSchoolFilter('all')} className="ml-0.5 hover:text-violet-900 transition"><X size={10} /></button>
                      </span>
                    )}
                    {disciplineFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                        {disciplineFilter}
                        <button onClick={() => setDisciplineFilter('all')} className="ml-0.5 hover:text-violet-900 transition"><X size={10} /></button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Students grid ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sv-enter" style={{ animationDelay: '120ms' }}>
            <SectionStrip icon={GraduationCap} label="Corpo discente" title="Alunos" count={studentPagination.total} />

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {studentPageLoading
                ? Array.from({ length: 6 }).map((_, i) => <StudentCardSkeleton key={i} delay={i * 60} />)
                : displayedStudents.length === 0
                  ? <EmptyStudents query={query} />
                  : displayedStudents.map((student, idx) => {
                      const perf = getStudentPerformanceLevel(student)
                      const attendanceRate = getStudentAttendanceRate(student)
                      const subjectCount = getStudentSubjects(student).length
                      const studentProfile = withCurrentUserVisuals(student)
                      return (
                        <StudentCard
                          key={student.id}
                          student={student}
                          profile={studentProfile}
                          profileAssetVersion={getProfileAssetVersion(student)}
                          className={getClassName(student.classId)}
                          attendanceRate={attendanceRate}
                          perf={perf}
                          subjectCount={subjectCount}
                          animDelay={idx * 40}
                          onClick={() => setStudentDetailsId(student.id)}
                        />
                      )
                    })}
            </div>

            <PaginationControls
              label="Alunos"
              pagination={studentPagination}
              limit={studentLimit}
              loading={studentPageLoading}
              source={studentPageSource}
              onPageChange={setStudentPage}
              onLimitChange={(n) => { setStudentLimit(n); setStudentPage(1) }}
            />
          </div>

          {/* ─── Student Modal ─────────────────────────────────────────────── */}
          {selectedStudent ? (() => {
            const classRoom = getClassById(selectedStudent.classId)
            const classStudents = classRoom ? getClassStudents(classRoom) : []
            const classAverage = getAverageScore(classStudents)
            const subjects = getStudentSubjects(selectedStudent)
            const subjectsPage = paginateLocal(subjects, studentSubjectsPage, studentSubjectsLimit)
            const displayedSubjects = subjectsPage.items
            const subjectsPagination = subjectsPage.pagination
            const studentProfile = withCurrentUserVisuals(selectedStudent)
            const studentProfileAssetVersion = getProfileAssetVersion(selectedStudent)
            const hasStudentProfilePhoto = Boolean(
              getProfileAvatarUrl(studentProfile, studentProfileAssetVersion?.avatar)
              || getProfileBannerUrl(studentProfile, studentProfileAssetVersion?.banner)
            )
            const perf = getStudentPerformanceLevel(selectedStudent)
            const perfStyle = studentPerformanceStyles[perf]
            const score = selectedStudent.averageScore ?? null
            const scorePct = score !== null ? Math.min(100, (score / 10) * 100) : 0
            const freqPct = getStudentAttendanceRate(selectedStudent)
            const PerformanceIcon = getPerformanceIcon(perf)

            return (
              <Modal id="student-details-title" title={selectedStudent.name} subtitle="Aluno" onClose={() => setStudentDetailsId(null)}>
                <div className="space-y-6">

                  {/* Header */}
                  <div className="flex items-start gap-4 pr-8">
                    {hasStudentProfilePhoto ? (
                      <ProfileAvatar entity={studentProfile} size="lg" assetVersion={studentProfileAssetVersion} />
                    ) : (
                      <StudentInitialBadge name={selectedStudent.name} level={perf} size="lg" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-bold text-slate-900 leading-tight font-DMSans">
                        {selectedStudent.name}
                      </h3>
                      <p className="mt-1 text-[12.5px] text-slate-500 font-medium">
                        @{selectedStudent.login || selectedStudent.registrationNumber} · Matrícula {selectedStudent.registrationNumber || selectedStudent.registration || 'pendente'}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {classRoom?.name && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            <Users size={9} /> {classRoom.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          <CalendarDays size={9} /> {getShiftLabel(classRoom?.shift)}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${perfStyle.bg} ${perfStyle.text} ${perfStyle.border}`}>
                          <PerformanceIcon size={9} />
                          {getPerformanceLabel(perf)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-300 bg-white p-4">
                      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-slate-400">
                        <TrendingUp className="h-3 w-3" /> Média geral
                      </div>
                      <div className="mt-1.5 text-2xl font-bold font-DMSans tabular-nums text-slate-900" >
                        {formatScore(score)}
                      </div>
                      <ProgressLine value={scorePct} className={perfStyle.progress} />
                    </div>
                    <div className="rounded-xl border border-slate-300 bg-white p-4">
                      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-slate-400">
                        <CalendarCheck className="h-3 w-3" /> Frequência
                      </div>
                      <div className={`mt-1.5 text-2xl font-bold font-DMSans tabular-nums ${getAttendanceTextTone(freqPct)}`} >
                        {freqPct}%
                      </div>
                      <ProgressLine value={freqPct} className={freqPct >= 75 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'} />
                    </div>
                    <div className="rounded-xl border border-slate-300 bg-white p-4">
                      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-slate-400">
                        <BookOpen className="h-3 w-3" /> Matérias
                      </div>
                      <div className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900 font-DMSans">
                        {subjects.length}
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400 font-medium">Componentes</p>
                    </div>
                  </div>

                  {/* Info grid */}
                  <section>
                    <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Dados acadêmicos</h4>
                    <dl className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
                      <InfoRow icon={Hash} label="Matrícula" value={selectedStudent.registrationNumber || selectedStudent.registration || 'Pendente'} />
                      <InfoRow icon={GraduationCap} label="Ano letivo" value={classRoom?.academicYear ? String(classRoom.academicYear) : 'Pendente'} />
                      <InfoRow icon={School} label="Escola" value={getSchoolName(selectedStudent.schoolId)} />
                      <InfoRow icon={BookOpen} label="Série" value={classRoom ? formatClassGrade(classRoom.grade) : 'Sem turma'} />
                      <InfoRow icon={Users} label="Responsáveis" value={selectedStudent.guardianIds?.length ? selectedStudent.guardianIds.map(getGuardianName).join(', ') : 'Pendente'} />
                      {selectedStudent.email && <InfoRow icon={Mail} label="E-mail" value={selectedStudent.email} />}
                    </dl>
                  </section>

                  {/* Subjects table */}
                  <section>
                    <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Matérias, notas e médias</h4>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                              <th className="px-4 py-3">Matéria</th>
                              <th className="px-4 py-3 text-center">Nota</th>
                              <th className="px-4 py-3 text-center">Média da turma</th>
                              <th className="px-4 py-3 text-right">Desempenho</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {displayedSubjects.map((subject) => (
                              <tr key={subject} className="bg-white transition-colors hover:bg-violet-50/30">
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-900 text-[13px]">{subject}</div>
                                  <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-400">Componente curricular</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-center">
                                    <ScoreRing score={score} />
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-center">
                                    <ScoreRing score={classAverage} />
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${getPerformanceTone(perf)}`}>
                                    <PerformanceIcon size={9} />
                                    {getPerformanceLabel(perf)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <PaginationControls
                        label="Matérias"
                        pagination={subjectsPagination}
                        limit={studentSubjectsLimit}
                        loading={false}
                        source="local"
                        pageSizeOptions={[DEFAULT_PAGE_SIZE]}
                        onPageChange={setStudentSubjectsPage}
                        onLimitChange={(n) => { setStudentSubjectsLimit(Math.min(DEFAULT_PAGE_SIZE, n)); setStudentSubjectsPage(1) }}
                      />
                    </div>
                  </section>
                </div>
              </Modal>
            )
          })() : null}

        </div>
      </div>
    </>
  )
}
