import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Percent,
  Search,
  TrendingUp,
  UserRound,
  Users,
  X,
  School,
  BookMarked,
  BarChart3,
  Clock,
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
  Star,
} from 'lucide-react'

import { resolveApiAssetUrl } from '../api'
import { AvatarHoverPreview } from '../components/profile/AvatarSign'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { DEFAULT_PAGE_SIZE, PaginationControls, paginateLocal } from '../components/ui/pagination-controls'
import { getOfficialAcademicSubjectLabel, getOfficialAcademicSubjectList, getOfficialAcademicSubjectListForGrade, splitAcademicList } from '../components/role-portal/portal-components'
import { formatClassGrade } from '../class-grade-options'
import { getAverageLessonAttendanceRate, getStudentAttendanceRateFromLessons } from '../lib/lesson-attendance'
import type {
  ClassRoom,
  Desempenho,
  PeoplePageQuery,
  Role,
  SchoolsScreenPayload,
  Student,
  StudentsPagePayload,
  Teacher,
  TeachersPagePayload,
  UserAccount,
} from '../types'

interface PeopleViewProps {
  schoolsData: SchoolsScreenPayload
  currentUser: UserAccount
  currentRole: Role | null
  assetVersion?: ProfileAssetVersion
  onLoadTeachersPage?: (params: PeoplePageQuery) => Promise<TeachersPagePayload>
  onLoadStudentsPage?: (params: PeoplePageQuery) => Promise<StudentsPagePayload>
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

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v))))
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('')
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
  return typeof score === 'number' && Number.isFinite(score) ? score.toFixed(1) : '—'
}

function getPerformanceFromScore(score: number | null): Desempenho | null {
  if (score === null) return null
  if (score >= 8) return 'Otimo'
  if (score >= 6) return 'Medio'
  return 'Baixo'
}

function getPerformanceLabel(level?: Desempenho | null) {
  if (level === 'Otimo') return 'Ótimo'
  if (level === 'Medio') return 'Médio'
  if (level === 'Baixo') return 'Baixo'
  return 'Sem notas'
}

function getPerformanceTone(level?: Desempenho | null) {
  if (level === 'Otimo') return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  if (level === 'Medio') return 'border-amber-300 bg-amber-50 text-amber-700'
  if (level === 'Baixo') return 'border-rose-300 bg-rose-50 text-rose-700'
  return 'border-slate-300 bg-slate-50 text-slate-500'
}

function getPerformanceIcon(level?: Desempenho | null) {
  if (level === 'Otimo') return CheckCircle2
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

// ─── Bone Skeleton ────────────────────────────────────────────────────────────

function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  )
}

function TeacherCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-3.5 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Bone className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Bone className="h-3.5 w-40" />
        <Bone className="h-2.5 w-56" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Bone className="h-7 w-24 rounded-xl" />
        <Bone className="h-7 w-14 rounded-xl" />
      </div>
    </div>
  )
}

function StudentCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center gap-3.5 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Bone className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Bone className="h-3.5 w-44" />
        <Bone className="h-2.5 w-28" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Bone className="h-7 w-20 rounded-xl" />
        <Bone className="h-7 w-14 rounded-xl" />
        <Bone className="h-7 w-16 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Label ────────────────────────────────────────────────────────────────────

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-bold tracking-[.18em] uppercase text-slate-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ProfileAvatar({
  entity,
  size = 'sm',
  assetVersion,
}: {
  entity: ProfilePreviewEntity
  size?: 'sm' | 'md' | 'lg'
  assetVersion?: ProfileAssetVersion
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [previewStyle, setPreviewStyle] = useState<CSSProperties | null>(null)
  const name = entity.name || entity.user?.name || 'Usuário'
  const email = getProfileEmail(entity)
  const initials = getInitials(name)
  const avatarSrc = getProfileAvatarUrl(entity, assetVersion?.avatar)
  const bannerSrc = getProfileBannerUrl(entity, assetVersion?.banner)
  const hasProfileImage = Boolean(avatarSrc || bannerSrc)
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-base' : size === 'md' ? 'h-10 w-10 text-[13px]' : 'h-7 w-7 text-[10px]'

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
        tabIndex={hasProfileImage ? 0 : -1}
        className={`grid overflow-hidden rounded-xl border-2 border-white bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-md ring-2 ring-slate-200 outline-none transition ${hasProfileImage ? 'cursor-pointer hover:ring-indigo-400 focus:ring-2 focus:ring-indigo-500' : ''} ${sizeClass}`}
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

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label, value, detail, icon: Icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
          <Icon size={14} />
        </span>
        <Label>{label}</Label>
      </div>
      <p className="text-2xl font-bold leading-none text-slate-900 mb-1 font-['Lora'] tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold text-slate-400 leading-tight font-['DM_Sans']">{detail}</p>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  id, title, subtitle, onClose, children, maxWidth = '920px',
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
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      style={{ animation: 'pv-fadeIn 0.15s ease' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onMouseDown={(e) => e.stopPropagation()}
        className="pv-modal-enter max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-white/80 bg-white shadow-2xl shadow-slate-900/15"
        style={{ maxWidth }}
      >
        <div className="h-px w-full bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-400" />
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-300 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="min-w-0 flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 border border-indigo-100">
              <Users size={16} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <Label className="text-indigo-500">{subtitle}</Label>
              <h2 id={id} className="mt-0.5 truncate text-xl font-bold text-slate-900 font-['Lora']">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-300 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Score Badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null | undefined }) {
  const hasScore = typeof score === 'number' && Number.isFinite(score)
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 font-['DM_Sans']">
      <TrendingUp size={9} />
      {hasScore ? (score as number).toFixed(1) : '—'}
    </span>
  )
}

function AttendanceBadge({ rate }: { rate: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600 font-['DM_Sans']">
      <Percent size={9} />
      {rate}%
    </span>
  )
}

// ─── Section Strip ────────────────────────────────────────────────────────────

function SectionStrip({
  icon: Icon, label, title, count,
}: {
  icon: React.ElementType
  label: string
  title: string
  count: number
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-300 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <Label className="text-indigo-500">{label}</Label>
        <h2 className="text-sm font-bold text-slate-900 leading-tight font-['Lora']">{title}</h2>
      </div>
      <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 font-['DM_Sans']">
        {count}
      </span>
    </div>
  )
}

// ─── Teacher Card ─────────────────────────────────────────────────────────────

function TeacherCard({
  teacher,
  teacherClasses,
  teacherSubjects,
  schoolName,
  profile,
  assetVersion,
  animDelay,
  onClick,
}: {
  teacher: Teacher
  teacherClasses: ClassRoom[]
  teacherSubjects: string[]
  schoolName: string
  profile: Teacher
  assetVersion?: ProfileAssetVersion
  animDelay: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pv-card-enter group flex min-w-0 items-center gap-3.5 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-left transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-md hover:shadow-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 overflow-hidden relative"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Accent left bar */}
      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-indigo-400 to-violet-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <ProfileAvatar entity={profile} size="md" assetVersion={assetVersion} />

      <div className="min-w-0 flex-1 pl-1">
        <strong className="block truncate text-[13px] font-bold text-slate-900 group-hover:text-indigo-800 transition-colors font-['DM_Sans']">
          {teacher.name}
        </strong>
        <span className="block truncate text-[11px] font-medium text-slate-400 font-['DM_Sans']">{teacher.email}</span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="hidden items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 sm:inline-flex font-['DM_Sans']">
          <BookMarked size={9} />
          {teacherSubjects.join(', ') || 'Sem disciplina'}
        </span>
        <span className="hidden items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500 lg:inline-flex font-['DM_Sans']">
          <School size={9} />
          {schoolName.split(' ').slice(0, 2).join(' ')}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 font-['DM_Sans']">
          <Users size={9} />
          {teacherClasses.length}t
        </span>
        <ChevronRight size={14} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
      </div>
    </button>
  )
}

// ─── Student Card ─────────────────────────────────────────────────────────────

function StudentCard({
  student,
  className,
  attendanceRate,
  perf,
  profile,
  assetVersion,
  animDelay,
  onClick,
}: {
  student: Student
  className: string
  attendanceRate: number
  perf: Desempenho | null
  profile: Student
  assetVersion?: ProfileAssetVersion
  animDelay: number
  onClick: () => void
}) {
  const PerfIcon = getPerformanceIcon(perf)

  return (
    <button
      type="button"
      onClick={onClick}
      className="pv-card-enter group flex min-w-0 items-center gap-3.5 rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-left transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50/30 hover:shadow-md hover:shadow-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 overflow-hidden relative"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Accent left bar */}
      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-indigo-400 to-violet-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <ProfileAvatar entity={profile} size="md" assetVersion={assetVersion} />

      <div className="min-w-0 flex-1 pl-1">
        <strong className="block truncate text-[13px] font-bold text-slate-900 group-hover:text-indigo-800 transition-colors font-['DM_Sans']">
          {student.name}
        </strong>
        <span className="block truncate text-[11px] font-medium text-slate-400 font-['DM_Sans']">
          {student.registrationNumber || student.login}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="hidden items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 sm:inline-flex font-['DM_Sans']">
          <Users size={9} />
          {className}
        </span>
        <AttendanceBadge rate={attendanceRate} />
        <ScoreBadge score={student.averageScore} />
        <span className={`hidden items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold lg:inline-flex ${getPerformanceTone(perf)} font-['DM_Sans']`}>
          <PerfIcon size={9} />
          {getPerformanceLabel(perf)}
        </span>
        <ChevronRight size={14} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
      </div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PeopleView({
  schoolsData,
  currentUser,
  currentRole,
  assetVersion,
  onLoadTeachersPage,
  onLoadStudentsPage,
}: PeopleViewProps) {
  const { schools, classes, teachers, students, guardians, lessonRecords = [] } = schoolsData
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [disciplineFilter, setDisciplineFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [teacherDetailsId, setTeacherDetailsId] = useState<string | null>(null)
  const [studentDetailsId, setStudentDetailsId] = useState<string | null>(null)
  const [classDetailsId, setClassDetailsId] = useState<string | null>(null)
  const [classReturnTeacherId, setClassReturnTeacherId] = useState<string | null>(null)
  const [teacherPage, setTeacherPage] = useState(1)
  const [studentPage, setStudentPage] = useState(1)
  const [teacherLimit, setTeacherLimit] = useState(DEFAULT_PAGE_SIZE)
  const [studentLimit, setStudentLimit] = useState(DEFAULT_PAGE_SIZE)
  const [teacherPageData, setTeacherPageData] = useState<TeachersPagePayload | null>(null)
  const [studentPageData, setStudentPageData] = useState<StudentsPagePayload | null>(null)
  const [teacherPageLoading, setTeacherPageLoading] = useState(false)
  const [studentPageLoading, setStudentPageLoading] = useState(false)
  const [teacherPageSource, setTeacherPageSource] = useState<'backend' | 'local'>(onLoadTeachersPage ? 'backend' : 'local')
  const [studentPageSource, setStudentPageSource] = useState<'backend' | 'local'>(onLoadStudentsPage ? 'backend' : 'local')

  useEffect(() => { setTeacherPage(1); setStudentPage(1) }, [disciplineFilter, query, schoolFilter])

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

  const filteredTeachers = useMemo(() => {
    const q = normalize(query)
    return teachers.filter((t) => {
      const teacherDisciplines = getOfficialAcademicSubjectList([t.specialty])
      if (schoolFilter !== 'all' && t.schoolId !== schoolFilter) return false
      if (disciplineFilter !== 'all' && !teacherDisciplines.some((d) => normalize(d) === normalize(disciplineFilter))) return false
      if (!q) return true
      return normalize(`${t.name} ${t.email} ${t.specialty} ${teacherDisciplines.join(' ')}`).includes(q)
    })
  }, [disciplineFilter, query, schoolFilter, teachers])

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
      if (!q) return true
      return normalize(`${s.name} ${s.email ?? ''} ${s.login} ${s.registrationNumber}`).includes(q)
    })
  }, [classes, disciplineFilter, query, schoolFilter, students])

  useEffect(() => {
    if (!onLoadTeachersPage) { setTeacherPageData(null); setTeacherPageSource('local'); return }
    let cancelled = false
    setTeacherPageLoading(true)
    onLoadTeachersPage({ page: teacherPage, limit: teacherLimit, search: query, schoolId: schoolFilter, discipline: disciplineFilter })
      .then((data) => { if (!cancelled) { setTeacherPageData(data); setTeacherPageSource('backend') } })
      .catch(() => { if (!cancelled) { setTeacherPageData(null); setTeacherPageSource('local') } })
      .finally(() => { if (!cancelled) setTeacherPageLoading(false) })
    return () => { cancelled = true }
  }, [disciplineFilter, onLoadTeachersPage, query, schoolFilter, teacherLimit, teacherPage])

  useEffect(() => {
    if (!onLoadStudentsPage) { setStudentPageData(null); setStudentPageSource('local'); return }
    let cancelled = false
    setStudentPageLoading(true)
    onLoadStudentsPage({ page: studentPage, limit: studentLimit, search: query, schoolId: schoolFilter, discipline: disciplineFilter })
      .then((data) => { if (!cancelled) { setStudentPageData(data); setStudentPageSource('backend') } })
      .catch(() => { if (!cancelled) { setStudentPageData(null); setStudentPageSource('local') } })
      .finally(() => { if (!cancelled) setStudentPageLoading(false) })
    return () => { cancelled = true }
  }, [disciplineFilter, onLoadStudentsPage, query, schoolFilter, studentLimit, studentPage])

  const localTeachersPage = useMemo(() => paginateLocal(filteredTeachers, teacherPage, teacherLimit), [filteredTeachers, teacherLimit, teacherPage])
  const localStudentsPage = useMemo(() => paginateLocal(filteredStudents, studentPage, studentLimit), [filteredStudents, studentLimit, studentPage])

  const displayedTeachers = teacherPageData?.teachers ?? localTeachersPage.items
  const displayedStudents = studentPageData?.students ?? localStudentsPage.items
  const teacherPagination = teacherPageData?.pagination ?? localTeachersPage.pagination
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
  function getTeacherClasses(teacher: Teacher) {
    return classes.filter((c) => {
      const ids = new Set([c.teacherId, ...(c.teacherIds ?? [])].filter(Boolean))
      return ids.has(teacher.id)
    })
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
  function getClassAttendanceRate(classStudents: Student[]) {
    if (!classStudents.length) return null
    return getAverageLessonAttendanceRate(classStudents, lessonRecords)
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
  function closeClassDetails() { setClassDetailsId(null); setClassReturnTeacherId(null) }
  function returnToTeacherClasses() {
    const tid = classReturnTeacherId
    setClassDetailsId(null); setClassReturnTeacherId(null)
    if (tid) setTeacherDetailsId(tid)
  }

  const selectedTeacher = teacherDetailsId ? teachers.find((t) => t.id === teacherDetailsId) ?? displayedTeachers.find((t) => t.id === teacherDetailsId) ?? null : null
  const selectedStudent = studentDetailsId ? students.find((s) => s.id === studentDetailsId) ?? displayedStudents.find((s) => s.id === studentDetailsId) ?? null : null
  const selectedClass = classDetailsId ? classes.find((c) => c.id === classDetailsId) ?? null : null
  const returnTeacher = classReturnTeacherId ? teachers.find((t) => t.id === classReturnTeacherId) ?? displayedTeachers.find((t) => t.id === classReturnTeacherId) ?? null : null

  // ── Stats summary ──
  const totalRecords = teacherPagination.total + studentPagination.total

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes pv-fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pv-slideUp { from { opacity: 0; transform: translateY(14px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes pv-cardIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes shimmer { to { transform: translateX(200%) } }
        .pv-modal-enter { animation: pv-slideUp 0.24s cubic-bezier(0.16,1,0.3,1) both }
        .pv-card-enter { animation: pv-cardIn 0.22s cubic-bezier(0.16,1,0.3,1) both; animation-fill-mode: both; }
        .fill-mode-both { animation-fill-mode: both }
      `}</style>

      <div
        className="min-h-screen font-['DM_Sans']"
        style={{ background: 'linear-gradient(160deg, #f8f7ff 0%, #f1f5f9 50%, #f0fdf4 100%)' }}
      >
        <div className="mx-auto px-[clamp(16px,3vw,48px)] py-8 pb-20 space-y-5">

          {/* ── Header ── */}
          <header className="animate-in fade-in slide-in-from-top-4 duration-500">
            <PageTitleBar
              label="Gestão"
              title="Pessoas"
              icon={<Users />}
              actions={(
                <div className="flex items-center gap-2">
                  {currentRole?.name && (
                    <span className="hidden items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700 sm:inline-flex font-['DM_Sans']">
                      <UserCheck size={11} />
                      {currentRole.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-bold text-slate-500 font-['DM_Sans']">
                    <Layers size={11} />
                    {totalRecords} registros
                  </span>
                </div>
              )}
            />
          </header>

          {/* ── Context card + Filters ── */}
          <section className="animate-in fade-in slide-in-from-top-2 duration-500 delay-75">
            <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-100/80">
              <div className="h-px bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-400" />

              {/* Stats row */}
              <div className="grid divide-x divide-slate-100 border-b border-slate-300 sm:grid-cols-4">
                {[
                  { l: 'Professores', v: teacherPagination.total, cls: 'text-indigo-700', bg: 'bg-indigo-50 ring-1 ring-indigo-200', icon: UserRound },
                  { l: 'Alunos',      v: studentPagination.total, cls: 'text-violet-700', bg: 'bg-violet-50 ring-1 ring-violet-200', icon: GraduationCap },
                  { l: 'Escolas',     v: schools.length,           cls: 'text-emerald-700', bg: 'bg-emerald-50 ring-1 ring-emerald-200', icon: School },
                  { l: 'Turmas',      v: classes.length,           cls: 'text-amber-700',   bg: 'bg-amber-50 ring-1 ring-amber-200', icon: Users },
                ].map((s) => (
                  <div key={s.l} className="flex items-center gap-3 px-5 py-4">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${s.bg}`}>
                      <s.icon size={15} className={s.cls} />
                    </span>
                    <div>
                      <p className={`text-2xl font-bold leading-none font-['Lora'] tabular-nums ${s.cls}`}>{s.v}</p>
                      <Label className="mt-1">{s.l}</Label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="grid grid-cols-[minmax(240px,1fr)_minmax(180px,0.38fr)_minmax(180px,0.34fr)] gap-3 p-4 max-[880px]:grid-cols-1">
                <label className="group flex h-11 min-w-0 items-center gap-2.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 transition focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 hover:border-slate-400">
                  <Search size={14} className="shrink-0 text-slate-400 transition group-focus-within:text-indigo-500" strokeWidth={2.4} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome, e-mail ou matrícula…"
                    className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 font-['DM_Sans']"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} className="shrink-0 text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </label>
                <CompactSelect
                  value={schoolFilter}
                  options={schoolOptions}
                  onChange={setSchoolFilter}
                  dropdownWidth="trigger"
                  className="h-11 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-bold text-slate-700 focus:border-indigo-400 font-['DM_Sans']"
                />
                <CompactSelect
                  value={disciplineFilter}
                  options={disciplineOptions}
                  onChange={setDisciplineFilter}
                  dropdownWidth="trigger"
                  className="h-11 rounded-xl border border-slate-300 bg-slate-50 px-3.5 text-sm font-bold text-slate-700 focus:border-indigo-400 font-['DM_Sans']"
                />
              </div>
            </div>
          </section>

          <div className="grid gap-5">

            {/* ── Teachers ── */}
            <div
              className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-100/80 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100"
            >
              <SectionStrip icon={UserRound} label="Corpo docente" title="Professores" count={teacherPagination.total} />

              <div className="grid gap-2 p-4">
                {teacherPageLoading
                  ? Array.from({ length: 4 }).map((_, i) => <TeacherCardSkeleton key={i} delay={i * 50} />)
                  : displayedTeachers.map((teacher, idx) => {
                    const teacherClasses = getTeacherClasses(teacher)
                    const teacherProfile = withCurrentUserVisuals(teacher)
                    const teacherSubjects = getReadableSubjects([teacher.specialty])
                    return (
                      <TeacherCard
                        key={teacher.id}
                        teacher={teacher}
                        teacherClasses={teacherClasses}
                        teacherSubjects={teacherSubjects}
                        schoolName={getSchoolName(teacher.schoolId)}
                        profile={teacherProfile}
                        assetVersion={getProfileAssetVersion(teacher)}
                        animDelay={idx * 30}
                        onClick={() => setTeacherDetailsId(teacher.id)}
                      />
                    )
                  })}
                {!teacherPageLoading && displayedTeachers.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 py-14 text-slate-400">
                    <UserRound size={28} className="opacity-30" />
                    <p className="text-sm font-bold font-['DM_Sans']">Nenhum professor encontrado.</p>
                  </div>
                )}
              </div>

              <PaginationControls
                label="Professores"
                pagination={teacherPagination}
                limit={teacherLimit}
                loading={teacherPageLoading}
                source={teacherPageSource}
                onPageChange={setTeacherPage}
                onLimitChange={(n) => { setTeacherLimit(n); setTeacherPage(1) }}
              />
            </div>

            {/* ── Students ── */}
            <div
              className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-100/80 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150"
            >
              <SectionStrip icon={GraduationCap} label="Corpo discente" title="Alunos" count={studentPagination.total} />

              <div className="grid gap-2 p-4">
                {studentPageLoading
                  ? Array.from({ length: 4 }).map((_, i) => <StudentCardSkeleton key={i} delay={i * 50} />)
                  : displayedStudents.map((student, idx) => {
                    const studentProfile = withCurrentUserVisuals(student)
                    const perf = student.desempenho ?? getPerformanceFromScore(student.averageScore)
                    const attendanceRate = getStudentAttendanceRate(student)
                    return (
                      <StudentCard
                        key={student.id}
                        student={student}
                        className={getClassName(student.classId)}
                        attendanceRate={attendanceRate}
                        perf={perf}
                        profile={studentProfile}
                        assetVersion={getProfileAssetVersion(student)}
                        animDelay={idx * 30}
                        onClick={() => setStudentDetailsId(student.id)}
                      />
                    )
                  })}
                {!studentPageLoading && displayedStudents.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 py-14 text-slate-400">
                    <GraduationCap size={28} className="opacity-30" />
                    <p className="text-sm font-bold font-['DM_Sans']">Nenhum aluno encontrado.</p>
                  </div>
                )}
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
          </div>

          {/* ─── Teacher Modal ──────────────────────────────────────────────── */}
          {selectedTeacher ? (() => {
            const teacherProfile = withCurrentUserVisuals(selectedTeacher)
            const teacherClasses = getTeacherClasses(selectedTeacher)
            const teacherStudents = uniqueValues(teacherClasses.flatMap((c) => getClassStudents(c).map((s) => s.id)))
            const selectedTeacherSpecialties = getOfficialAcademicSubjectList([selectedTeacher.specialty])
            const teacherSubjects = uniqueValues([
              ...selectedTeacherSpecialties,
              ...teacherClasses.flatMap((c) => getOfficialAcademicSubjectListForGrade(c.bnccFocus ?? [], c.grade)),
            ])

            return (
              <Modal id="teacher-details-title" title={selectedTeacher.name} subtitle="Professor" onClose={() => setTeacherDetailsId(null)} maxWidth="980px">
                <div className="grid gap-5 p-6">

                  {/* Profile strip */}
                  <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-300 bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm">
                    <ProfileAvatar entity={teacherProfile} size="lg" assetVersion={getProfileAssetVersion(selectedTeacher)} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold text-slate-900 font-['Lora']">{selectedTeacher.name}</h3>
                      <p className="mt-0.5 truncate text-sm font-medium text-slate-500 font-['DM_Sans']">{selectedTeacher.email}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-bold text-slate-600 font-['DM_Sans']">
                          <BookMarked size={10} />{selectedTeacherSpecialties.join(', ') || 'Disciplina não informada'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-bold text-slate-500 font-['DM_Sans']">
                          <Building2 size={10} />{getSchoolName(selectedTeacher.schoolId)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MetricCard label="Turmas" value={teacherClasses.length} detail="Vínculos ativos" icon={Users} />
                    <MetricCard label="Alunos" value={teacherStudents.length} detail="Nas turmas vinculadas" icon={GraduationCap} />
                    <MetricCard label="Matérias" value={teacherSubjects.length} detail="Disciplinas lecionadas" icon={BookOpen} />
                  </div>

                  {/* Classes */}
                  <div>
                    <Label className="mb-3 flex items-center gap-2 text-indigo-600">
                      <Layers size={11} />Turmas vinculadas
                    </Label>
                    <div className="grid gap-3 md:grid-cols-2">
                      {teacherClasses.map((classRoom) => {
                        const classStudents = getClassStudents(classRoom)
                        const classAverage = getAverageScore(classStudents)
                        const previewStudents = classStudents.slice(0, 4)
                        return (
                          <button
                            key={classRoom.id}
                            type="button"
                            onClick={() => { setClassReturnTeacherId(selectedTeacher.id); setTeacherDetailsId(null); setClassDetailsId(classRoom.id) }}
                            className="group min-w-0 rounded-2xl border border-slate-300 bg-white p-4 text-left transition-all hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 overflow-hidden relative"
                          >
                            <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-indigo-400 to-violet-600 opacity-0 transition-opacity group-hover:opacity-100" />
                            <span className="flex min-w-0 items-start justify-between gap-2 pl-1">
                              <span className="min-w-0">
                                <strong className="block truncate text-sm font-bold text-slate-900 group-hover:text-indigo-800 transition-colors font-['DM_Sans']">{classRoom.name}</strong>
                                <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500 font-['DM_Sans']">
                                  {formatClassGrade(classRoom.grade)} · {classRoom.shift} · {getSchoolName(classRoom.schoolId).split(' ').slice(0, 3).join(' ')}
                                </span>
                              </span>
                              <span className="shrink-0 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 font-['DM_Sans']">
                                {classStudents.length} al.
                              </span>
                            </span>
                            <span className="mt-3 grid grid-cols-3 gap-2">
                              {[
                                { label: 'Média', value: formatScore(classAverage) },
                                { label: 'Ano', value: String(classRoom.academicYear) },
                                { label: 'Disciplinas', value: String(getReadableSubjects(classRoom.bnccFocus ?? [], classRoom.grade).length) },
                              ].map(({ label, value }) => (
                                <span key={label} className="rounded-xl border border-slate-300 bg-slate-50 px-2 py-2">
                                  <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 font-['DM_Sans']">{label}</span>
                                  <span className="mt-0.5 block text-sm font-bold text-slate-800 font-['Lora'] tabular-nums">{value}</span>
                                </span>
                              ))}
                            </span>
                            <span className="mt-3 flex items-center gap-1">
                              {previewStudents.map((s) => <ProfileAvatar key={s.id} entity={withCurrentUserVisuals(s)} assetVersion={getProfileAssetVersion(s)} />)}
                              {classStudents.length > previewStudents.length && (
                                <span className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 bg-slate-100 text-[9px] font-bold text-slate-500 font-['DM_Sans']">
                                  +{classStudents.length - previewStudents.length}
                                </span>
                              )}
                            </span>
                          </button>
                        )
                      })}
                      {teacherClasses.length === 0 && (
                        <p className="col-span-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-medium text-slate-400 font-['DM_Sans']">
                          Nenhuma turma vinculada.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Modal>
            )
          })() : null}

          {/* ─── Student Modal ──────────────────────────────────────────────── */}
          {selectedStudent ? (() => {
            const classRoom = getClassById(selectedStudent.classId)
            const classStudents = classRoom ? getClassStudents(classRoom) : []
            const classAverage = getAverageScore(classStudents)
            const subjects = getStudentSubjects(selectedStudent)
            const studentProfile = withCurrentUserVisuals(selectedStudent)
            const perf = selectedStudent.desempenho ?? getPerformanceFromScore(selectedStudent.averageScore)

            const score = selectedStudent.averageScore ?? null
            const scorePct = score !== null ? Math.min(100, (score / 10) * 100) : 0
            const freqPct = getStudentAttendanceRate(selectedStudent)
            const freqGood = freqPct >= 75
            const freqFill = freqGood ? 'from-emerald-400 to-emerald-500' : 'from-red-400 to-red-500'

            const scoreLevel = perf === 'Otimo' ? 'emerald' : perf === 'Medio' ? 'amber' : perf === 'Baixo' ? 'red' : 'slate'
            const scoreFill: Record<string, string> = {
              emerald: 'from-emerald-400 to-emerald-500', amber: 'from-amber-400 to-amber-500',
              red: 'from-red-400 to-red-500', slate: 'from-slate-200 to-slate-300',
            }
            const scoreTrack: Record<string, string> = {
              emerald: 'bg-emerald-100', amber: 'bg-amber-100', red: 'bg-red-100', slate: 'bg-slate-100',
            }
            const scoreText: Record<string, string> = {
              emerald: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700', slate: 'text-slate-400',
            }

            const otimo = classStudents.filter(s => (s.desempenho ?? getPerformanceFromScore(s.averageScore)) === 'Otimo').length
            const medio = classStudents.filter(s => (s.desempenho ?? getPerformanceFromScore(s.averageScore)) === 'Medio').length
            const baixo = classStudents.filter(s => (s.desempenho ?? getPerformanceFromScore(s.averageScore)) === 'Baixo').length
            const totalInClass = classStudents.length

            return (
              <Modal id="student-details-title" title={selectedStudent.name} subtitle="Aluno" onClose={() => setStudentDetailsId(null)} maxWidth="960px">
                <div className="grid gap-5 p-6">

                  {/* Profile strip */}
                  <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-300 bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm">
                    <ProfileAvatar entity={studentProfile} size="lg" assetVersion={getProfileAssetVersion(selectedStudent)} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold text-slate-900 font-['Lora']">{selectedStudent.name}</h3>
                      <p className="mt-0.5 truncate text-sm font-medium text-slate-500 font-['DM_Sans']">{selectedStudent.email ?? selectedStudent.login}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-bold text-indigo-600 font-['DM_Sans']">
                        <Users size={10} />{classRoom?.name ?? 'Sem turma vinculada'}
                      </p>
                    </div>
                    <span className={`hidden shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold sm:inline-flex ${getPerformanceTone(perf)} font-['DM_Sans']`}>
                      {(() => { const Icon = getPerformanceIcon(perf); return <Icon size={13} /> })()}
                      {getPerformanceLabel(perf)}
                    </span>
                  </div>

                  {/* Metrics 4-col */}
                  <div className="grid gap-3 md:grid-cols-4">
                    <MetricCard label="Frequência" value={`${freqPct}%`} detail="Presença consolidada" icon={BadgeCheck} />
                    <MetricCard label="Média geral" value={formatScore(score)} detail="Notas consolidadas" icon={TrendingUp} />
                    <MetricCard label="Turma" value={classRoom?.name ?? '—'} detail={classRoom ? `${formatClassGrade(classRoom.grade)} · ${classRoom.shift}` : 'Sem turma'} icon={Users} />
                    <MetricCard label="Matérias" value={subjects.length} detail="Componentes curriculares" icon={BookOpen} />
                  </div>

                  {/* Charts row */}
                  {classStudents.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
                      {/* Frequência */}
                      <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shadow-indigo-200">
                            <TrendingUp size={13} className="text-white" />
                          </div>
                          <Label>Frequência</Label>
                        </div>
                        <div className="mb-3">
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full transition-all bg-gradient-to-r ${freqFill}`} style={{ width: `${freqPct}%` }} />
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-bold leading-none text-slate-900 font-['Lora'] tabular-nums">{freqPct}%</span>
                          <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold font-['DM_Sans'] ${freqGood ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
                            {freqGood ? 'Regular' : 'Baixa'}
                          </span>
                        </div>
                      </div>

                      {/* Média geral */}
                      <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 shadow-sm shadow-violet-200">
                            <BarChart3 size={13} className="text-white" />
                          </div>
                          <Label>Média geral</Label>
                        </div>
                        <div className="mb-3">
                          <div className={`h-2 w-full rounded-full overflow-hidden ${scoreTrack[scoreLevel]}`}>
                            <div className={`h-full rounded-full transition-all bg-gradient-to-r ${scoreFill[scoreLevel]}`} style={{ width: `${scorePct}%` }} />
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className={`text-3xl font-bold leading-none font-['Lora'] tabular-nums ${scoreText[scoreLevel]}`}>
                            {score !== null ? score.toFixed(1) : '—'}
                          </span>
                          <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold font-['DM_Sans'] ${getPerformanceTone(perf)}`}>
                            {getPerformanceLabel(perf)}
                          </span>
                        </div>
                      </div>

                      {/* Distribuição da turma */}
                      <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 shadow-sm shadow-sky-200">
                            <Award size={13} className="text-white" />
                          </div>
                          <Label>Turma</Label>
                        </div>
                        <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          {totalInClass > 0 && <>
                            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(otimo / totalInClass) * 100}%` }} />
                            <div className="h-full bg-amber-400 transition-all" style={{ width: `${(medio / totalInClass) * 100}%` }} />
                            <div className="h-full bg-red-400 transition-all" style={{ width: `${(baixo / totalInClass) * 100}%` }} />
                          </>}
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          {[
                            { label: 'Ótimo', count: otimo, color: 'text-emerald-600' },
                            { label: 'Médio', count: medio, color: 'text-amber-600' },
                            { label: 'Baixo', count: baixo, color: 'text-red-600' },
                          ].map(d => (
                            <div key={d.label} className="flex flex-col items-center">
                              <span className={`text-lg font-bold leading-none font-['Lora'] ${d.color}`}>{d.count}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide font-['DM_Sans']">{d.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data + Table */}
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
                    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
                      <Label className="mb-3 flex items-center gap-1.5">
                        <Hash size={10} />Dados acadêmicos
                      </Label>
                      <dl className="grid gap-3 text-sm">
                        {[
                          { label: 'Matrícula', value: selectedStudent.registrationNumber || selectedStudent.registration || '—', icon: Hash },
                          { label: 'Escola', value: getSchoolName(selectedStudent.schoolId), icon: Building2 },
                          { label: 'Ano letivo', value: classRoom?.academicYear ? String(classRoom.academicYear) : '—', icon: CalendarDays },
                          { label: 'Responsáveis', value: selectedStudent.guardianIds?.length ? selectedStudent.guardianIds.map(getGuardianName).join(', ') : '—', icon: UserCheck },
                        ].map(({ label, value, icon: Icon }) => (
                          <div key={label} className="flex items-start gap-2.5">
                            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-slate-400">
                              <Icon size={10} />
                            </span>
                            <div className="min-w-0">
                              <dt className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-['DM_Sans']">{label}</dt>
                              <dd className="mt-0.5 truncate text-xs font-bold text-slate-800 font-['DM_Sans']">{value}</dd>
                            </div>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
                      <div className="flex items-center gap-2 border-b border-slate-300 bg-slate-50 px-4 py-3">
                        <BarChart3 size={13} className="text-indigo-500" />
                        <Label>Matérias, notas e médias</Label>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-left">
                          <thead>
                            <tr className="bg-slate-50 text-[9px] font-bold uppercase tracking-widest text-slate-400 font-['DM_Sans']">
                              <th className="px-4 py-2.5">Matéria</th>
                              <th className="px-4 py-2.5">Nota</th>
                              <th className="px-4 py-2.5">Média turma</th>
                              <th className="px-4 py-2.5">Desempenho</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {subjects.map((subject) => {
                              const performance = getPerformanceFromScore(selectedStudent.averageScore)
                              const PIcon = getPerformanceIcon(performance)
                              const sScore = selectedStudent.averageScore ?? null
                              const sPct = sScore !== null ? Math.min(100, (sScore / 10) * 100) : 0
                              const sLevel = performance === 'Otimo' ? 'emerald' : performance === 'Medio' ? 'amber' : performance === 'Baixo' ? 'red' : 'slate'
                              const sRing: Record<string, string> = { emerald: 'stroke-emerald-400', amber: 'stroke-amber-400', red: 'stroke-red-400', slate: 'stroke-slate-200' }
                              const sText: Record<string, string> = { emerald: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700', slate: 'text-slate-400' }
                              const cScore = classAverage
                              const cPct = cScore !== null ? Math.min(100, (cScore / 10) * 100) : 0
                              const cPerf = getPerformanceFromScore(cScore)
                              const cLevel = cPerf === 'Otimo' ? 'emerald' : cPerf === 'Medio' ? 'amber' : cPerf === 'Baixo' ? 'red' : 'slate'

                              return (
                                <tr key={subject} className="transition hover:bg-slate-50">
                                  <td className="px-4 py-3 font-bold text-sm text-slate-800 font-['DM_Sans']">{subject}</td>
                                  <td className="px-4 py-3">
                                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                                      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                                        <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-100" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="15" fill="none" className={sRing[sLevel]} strokeWidth="3.5"
                                          strokeDasharray={`${(sPct / 100) * 94.2} 94.2`} strokeLinecap="round" />
                                      </svg>
                                      <span className={`relative z-10 text-[10px] font-bold font-['DM_Sans'] ${sText[sLevel]}`}>
                                        {sScore !== null ? sScore.toFixed(1) : '—'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                                      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                                        <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-100" strokeWidth="3" />
                                        <circle cx="18" cy="18" r="15" fill="none" className={sRing[cLevel]} strokeWidth="3.5"
                                          strokeDasharray={`${(cPct / 100) * 94.2} 94.2`} strokeLinecap="round" />
                                      </svg>
                                      <span className={`relative z-10 text-[10px] font-bold font-['DM_Sans'] ${sText[cLevel]}`}>
                                        {cScore !== null ? cScore.toFixed(1) : '—'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold font-['DM_Sans'] ${getPerformanceTone(performance)}`}>
                                      <PIcon size={9} />{getPerformanceLabel(performance)}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </Modal>
            )
          })() : null}

          {/* ─── Class Modal ────────────────────────────────────────────────── */}
          {selectedClass ? (() => {
            const classStudents = getClassStudents(selectedClass)
            const classTeachers = getClassTeachers(selectedClass)
            const classAverage = getAverageScore(classStudents)
            const classPerformance = getPerformanceFromScore(classAverage)
            const avgAttendance = getClassAttendanceRate(classStudents)
            const guardianIds = Array.from(new Set(classStudents.flatMap((s) => s.guardianIds ?? [])))

            const freqPctClass = avgAttendance ?? 0
            const freqGoodClass = freqPctClass >= 75
            const freqFillClass = freqGoodClass ? 'from-emerald-400 to-emerald-500' : 'from-red-400 to-red-500'
            const scorePctClass = classAverage !== null ? Math.min(100, (classAverage / 10) * 100) : 0
            const scoreColorClass = classPerformance === 'Otimo' ? 'emerald' : classPerformance === 'Medio' ? 'amber' : classPerformance === 'Baixo' ? 'red' : 'slate'
            const scoreFillMap: Record<string, string> = {
              emerald: 'from-emerald-400 to-emerald-500', amber: 'from-amber-400 to-amber-500',
              red: 'from-red-400 to-red-500', slate: 'from-slate-200 to-slate-300',
            }
            const scoreTrackMap: Record<string, string> = {
              emerald: 'bg-emerald-100', amber: 'bg-amber-100', red: 'bg-red-100', slate: 'bg-slate-100',
            }
            const otimoC = classStudents.filter(s => (s.desempenho ?? getPerformanceFromScore(s.averageScore)) === 'Otimo').length
            const medioC = classStudents.filter(s => (s.desempenho ?? getPerformanceFromScore(s.averageScore)) === 'Medio').length
            const baixoC = classStudents.filter(s => (s.desempenho ?? getPerformanceFromScore(s.averageScore)) === 'Baixo').length

            return (
              <Modal id="class-details-title" title={selectedClass.name} subtitle="Turma" onClose={closeClassDetails} maxWidth="1040px">
                <div className="grid gap-5 p-6">

                  {/* Back button */}
                  {classReturnTeacherId && (
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3">
                      <button
                        type="button"
                        onClick={returnToTeacherClasses}
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-white px-3 py-1.5 text-sm font-bold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 font-['DM_Sans']"
                      >
                        <ArrowLeft size={14} />Voltar ao professor
                      </button>
                      {returnTeacher && <p className="min-w-0 truncate text-xs font-bold text-slate-500 font-['DM_Sans']">{returnTeacher.name}</p>}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <MetricCard label="Turno" value={selectedClass.shift} detail={selectedClass.schedule || 'Horário não informado'} icon={Clock} />
                    <MetricCard label="Alunos" value={classStudents.length} detail="Vinculados à turma" icon={GraduationCap} />
                    <MetricCard label="Professores" value={classTeachers.length || (selectedClass.teacherId ? 1 : 0)} detail="Docentes" icon={UserRound} />
                    <MetricCard label="Ano letivo" value={selectedClass.academicYear} detail={getSchoolName(selectedClass.schoolId).split(' ').slice(0, 3).join(' ')} icon={CalendarDays} />
                  </div>

                  {/* Performance summary */}
                  {classStudents.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
                      <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 shadow-sm shadow-indigo-200">
                            <TrendingUp size={13} className="text-white" />
                          </div>
                          <Label>Freq. média</Label>
                        </div>
                        <div className="mb-3">
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${freqFillClass}`} style={{ width: `${freqPctClass}%` }} />
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-bold leading-none text-slate-900 font-['Lora'] tabular-nums">{avgAttendance ?? '—'}%</span>
                          <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold font-['DM_Sans'] ${freqGoodClass ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
                            {freqGoodClass ? 'Regular' : 'Baixa'}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 shadow-sm shadow-violet-200">
                            <BarChart3 size={13} className="text-white" />
                          </div>
                          <Label>Média geral</Label>
                        </div>
                        <div className="mb-3">
                          <div className={`h-2 w-full rounded-full overflow-hidden ${scoreTrackMap[scoreColorClass]}`}>
                            <div className={`h-full rounded-full bg-gradient-to-r ${scoreFillMap[scoreColorClass]}`} style={{ width: `${scorePctClass}%` }} />
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-bold leading-none text-slate-900 font-['Lora'] tabular-nums">
                            {classAverage !== null ? classAverage.toFixed(1) : '—'}
                          </span>
                          <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold font-['DM_Sans'] ${getPerformanceTone(classPerformance)}`}>
                            {getPerformanceLabel(classPerformance)}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500 shadow-sm shadow-sky-200">
                            <Award size={13} className="text-white" />
                          </div>
                          <Label>Distribuição</Label>
                        </div>
                        <div className="mb-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          {classStudents.length > 0 && <>
                            <div className="h-full bg-emerald-400" style={{ width: `${(otimoC / classStudents.length) * 100}%` }} />
                            <div className="h-full bg-amber-400" style={{ width: `${(medioC / classStudents.length) * 100}%` }} />
                            <div className="h-full bg-red-400" style={{ width: `${(baixoC / classStudents.length) * 100}%` }} />
                          </>}
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          {[
                            { label: 'Ótimo', count: otimoC, color: 'text-emerald-600' },
                            { label: 'Médio', count: medioC, color: 'text-amber-600' },
                            { label: 'Baixo', count: baixoC, color: 'text-red-600' },
                          ].map(d => (
                            <div key={d.label} className="flex flex-col items-center">
                              <span className={`text-lg font-bold leading-none font-['Lora'] ${d.color}`}>{d.count}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide font-['DM_Sans']">{d.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Teachers */}
                  <div>
                    <Label className="mb-3 flex items-center gap-2 text-indigo-600">
                      <UserRound size={11} />Professores
                    </Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {classTeachers.map((teacher) => (
                        <div key={teacher.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 shadow-sm">
                          <ProfileAvatar entity={withCurrentUserVisuals(teacher)} size="md" assetVersion={getProfileAssetVersion(teacher)} />
                          <div className="min-w-0">
                            <strong className="block truncate text-sm font-bold text-slate-900 font-['DM_Sans']">{teacher.name}</strong>
                            <span className="flex items-center gap-1 truncate text-[11px] font-medium text-indigo-600 font-['DM_Sans']">
                              <BookMarked size={9} />{getReadableSubjects([teacher.specialty]).join(', ') || 'Especialidade não informada'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {classTeachers.length === 0 && (
                        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-medium text-slate-400 font-['DM_Sans']">
                          Nenhum professor vinculado.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Students list */}
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <Label className="flex items-center gap-2 text-indigo-600">
                        <GraduationCap size={11} />Alunos da turma
                      </Label>
                      <span className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 font-['DM_Sans']">
                        {classStudents.length}
                      </span>
                    </div>
                    <div className="grid gap-2 rounded-2xl border border-slate-300 bg-slate-50 p-3">
                      {classStudents.map((student) => {
                        const perf = student.desempenho ?? getPerformanceFromScore(student.averageScore)
                        const score = student.averageScore ?? null
                        const scorePctS = score !== null ? Math.min(100, (score / 10) * 100) : 0
                        const scoreLevelS = perf === 'Otimo' ? 'emerald' : perf === 'Medio' ? 'amber' : perf === 'Baixo' ? 'red' : 'slate'
                        const scoreRingColorMap: Record<string, string> = {
                          emerald: 'stroke-emerald-400', amber: 'stroke-amber-400', red: 'stroke-red-400', slate: 'stroke-slate-200',
                        }
                        const scoreTextColorMap: Record<string, string> = {
                          emerald: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700', slate: 'text-slate-400',
                        }
                        const stripeColor: Record<string, string> = {
                          Otimo: 'bg-emerald-500', Medio: 'bg-amber-500', Baixo: 'bg-red-500',
                        }
                        const attendanceRate = getStudentAttendanceRate(student)
                        const freqGoodS = attendanceRate >= 75
                        const freqWarnS = attendanceRate >= 60
                        const freqBarS = freqGoodS ? 'from-emerald-400 to-emerald-500' : freqWarnS ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'
                        const freqTextS = freqGoodS ? 'text-emerald-600' : freqWarnS ? 'text-amber-600' : 'text-red-600'

                        return (
                          <article
                            key={student.id}
                            className="relative overflow-hidden grid min-w-0 items-center gap-3 rounded-xl border border-slate-300 bg-white p-3 lg:grid-cols-[minmax(180px,1.3fr)_minmax(140px,1fr)_100px_90px_110px] max-lg:grid-cols-2 max-[560px]:grid-cols-1 transition hover:border-indigo-300 hover:shadow-sm"
                          >
                            <div className={`absolute left-0 top-0 h-full w-[3px] ${stripeColor[perf] ?? 'bg-slate-300'}`} />
                            <div className="pl-3 flex min-w-0 items-center gap-2.5">
                              <ProfileAvatar entity={withCurrentUserVisuals(student)} assetVersion={getProfileAssetVersion(student)} />
                              <div className="min-w-0">
                                <strong className="block truncate text-[12px] font-bold text-slate-900 font-['DM_Sans']">{student.name}</strong>
                                <span className="block truncate font-mono text-[10px] font-medium text-slate-400">
                                  {student.registrationNumber || student.registration || 'Sem matrícula'}
                                </span>
                              </div>
                            </div>

                            <div className="min-w-0">
                              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1 font-['DM_Sans']">Responsáveis</p>
                              <p className="truncate text-[11px] font-medium text-slate-600 font-['DM_Sans']">
                                {student.guardianIds?.length ? student.guardianIds.map(getGuardianName).join(', ') : <span className="text-slate-300">—</span>}
                              </p>
                            </div>

                            <div>
                              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1.5 font-['DM_Sans']">Frequência</p>
                              <p className={`text-sm font-bold mb-1.5 leading-none font-['Lora'] ${freqTextS}`}>{attendanceRate}%</p>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${freqBarS}`} style={{ width: `${attendanceRate}%` }} />
                              </div>
                            </div>

                            <div>
                              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1.5 font-['DM_Sans']">Média</p>
                              <div className="relative flex h-9 w-9 items-center justify-center">
                                <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                                  <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-100" strokeWidth="3" />
                                  <circle cx="18" cy="18" r="15" fill="none" className={scoreRingColorMap[scoreLevelS]} strokeWidth="3.5"
                                    strokeDasharray={`${(scorePctS / 100) * 94.2} 94.2`} strokeLinecap="round" />
                                </svg>
                                <span className={`relative z-10 text-[10px] font-bold font-['DM_Sans'] ${scoreTextColorMap[scoreLevelS]}`}>
                                  {score !== null ? score.toFixed(1) : '—'}
                                </span>
                              </div>
                            </div>

                            <div>
                              <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400 font-['DM_Sans']">Desempenho</p>
                              <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold font-['DM_Sans'] ${getPerformanceTone(perf)}`}>
                                {(() => { const I = getPerformanceIcon(perf); return <I size={9} /> })()}
                                {getPerformanceLabel(perf)}
                              </span>
                            </div>
                          </article>
                        )
                      })}
                      {classStudents.length === 0 && (
                        <p className="py-8 text-center text-sm font-medium text-slate-400 font-['DM_Sans']">Nenhum aluno vinculado.</p>
                      )}
                    </div>
                  </div>

                  {/* Disciplines + Guardians */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                      <Label className="mb-3 flex items-center gap-1.5">
                        <BookOpen size={10} />Disciplinas
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {getReadableSubjects(selectedClass.bnccFocus ?? [], selectedClass.grade).map((focus) => (
                          <span key={focus} className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600 font-['DM_Sans']">{focus}</span>
                        ))}
                        {getReadableSubjects(selectedClass.bnccFocus ?? [], selectedClass.grade).length === 0 && (
                          <span className="text-xs font-medium text-slate-400 font-['DM_Sans']">Nenhuma disciplina cadastrada.</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                      <Label className="mb-3 flex items-center gap-1.5">
                        <UserCheck size={10} />Responsáveis
                      </Label>
                      <div className="grid gap-1.5">
                        {guardianIds.map((id) => (
                          <span key={id} className="flex items-center gap-2 text-xs font-medium text-slate-700 font-['DM_Sans']">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                            {getGuardianName(id)}
                          </span>
                        ))}
                        {guardianIds.length === 0 && (
                          <p className="text-xs font-medium text-slate-400 font-['DM_Sans']">Nenhum responsável vinculado.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Modal>
            )
          })() : null}

        </div>
      </div>
    </>
  )
}