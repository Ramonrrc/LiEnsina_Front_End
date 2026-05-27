import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
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
  CalendarDays,
  UserCheck,
  Layers,
  Target,
  ChevronRight,
  Activity,
} from 'lucide-react'

import { resolveApiAssetUrl } from '../api'
import { AvatarHoverPreview } from '../components/profile/AvatarSign'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { DEFAULT_PAGE_SIZE, PaginationControls, paginateLocal } from '../components/ui/pagination-controls'
import { getOfficialAcademicSubjectList, getOfficialAcademicSubjectListForGrade } from '../components/role-portal/portal-components'
import { formatClassGrade } from '../class-grade-options'
import { getAverageLessonAttendanceRate, getStudentAttendanceRateFromLessons } from '../lib/lesson-attendance'
import type {
  ClassRoom,
  Desempenho,
  Role,
  SchoolsScreenPayload,
  Student,
  Teacher,
  TeachersPageQuery,
  TeachersPagePayload,
  UserAccount,
} from '../types'

interface TeachersViewProps {
  schoolsData: SchoolsScreenPayload
  currentUser: UserAccount
  currentRole: Role | null
  assetVersion?: ProfileAssetVersion
  onLoadTeachersPage?: (params: TeachersPageQuery) => Promise<TeachersPagePayload>
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

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[9.5px] font-bold tracking-[.2em] uppercase text-slate-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

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
        tabIndex={hasProfileImage && focusable ? 0 : -1}
        className={`grid overflow-hidden rounded-2xl border-2 border-white bg-gradient-to-br from-violet-500 to-indigo-600 font-black text-white shadow-md ring-2 ring-slate-200/80 outline-none transition-all duration-200 ${hasProfileImage ? 'cursor-pointer hover:scale-105 hover:ring-violet-300 focus:ring-2 focus:ring-violet-400' : ''} ${sizeClass}`}
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

function SectionStrip({
  icon: Icon, label, title, count,
}: {
  icon: React.ElementType
  label: string
  title: string
  count: number
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-200/60">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <Label className="text-violet-500">{label}</Label>
        <h2 className="mt-0.5 text-sm font-bold leading-tight text-slate-900">{title}</h2>
      </div>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
        {count}
      </span>
    </div>
  )
}

// ─── Teacher Card ─────────────────────────────────────────────────────────────

function MiniMetric({ icon: Icon, label, value, valueClass = 'text-slate-900' }: {
  icon: React.ElementType
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition-colors hover:bg-slate-100/80">
      <div className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-widest text-slate-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold leading-none tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  )
}

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

function EmptyTeachers({ query }: { query: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
        <UserRound size={26} className="text-slate-300" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-600">Nenhum professor encontrado</p>
        {query && (
          <p className="mt-1 text-xs text-slate-400">Tente buscar por um nome ou disciplina diferente</p>
        )}
      </div>
    </div>
  )
}

function TeacherCard({
  teacher,
  teacherClasses,
  teacherSubjects,
  studentCount,
  schoolName,
  profile,
  assetVersion,
  animDelay,
  onClick,
}: {
  teacher: Teacher
  teacherClasses: ClassRoom[]
  teacherSubjects: string[]
  studentCount: number
  schoolName: string
  profile: Teacher
  assetVersion?: ProfileAssetVersion
  animDelay: number
  onClick: () => void
}) {
  const hasProfilePhoto = Boolean(
    getProfileAvatarUrl(profile, assetVersion?.avatar)
    || getProfileBannerUrl(profile, assetVersion?.banner)
  )

  return (
    <button
      type="button"
      onClick={onClick}
      className="sv-card group relative flex flex-col overflow-hidden rounded-2xl border border-slate-300/90 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300 group-hover:h-1" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          {hasProfilePhoto ? (
            <ProfileAvatar entity={profile} size="lg" assetVersion={assetVersion} focusable={false} />
          ) : (
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-base font-bold text-white shadow-md shadow-violet-200">
              {getInitials(teacher.name)}
            </span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-[14.5px] font-bold leading-tight text-slate-900">{teacher.name}</h3>
            <p className="mt-0.5 truncate text-xs text-slate-400">{teacher.email}</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{schoolName}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-violet-500" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniMetric icon={Users} label="Turmas" value={String(teacherClasses.length)} />
          <MiniMetric icon={GraduationCap} label="Alunos" value={String(studentCount)} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10.5px] font-semibold text-violet-700">
            <BookMarked size={10} className="shrink-0" />
            <span className="truncate">{teacherSubjects.join(', ') || 'Sem disciplina'}</span>
          </span>
          <span className="shrink-0 text-[11px] font-medium text-slate-400">
            {teacherSubjects.length} {teacherSubjects.length === 1 ? 'matéria' : 'matérias'}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeachersView({
  schoolsData,
  currentUser,
  currentRole,
  assetVersion,
  onLoadTeachersPage,
}: TeachersViewProps) {
  const { schools, classes, teachers, students, guardians, lessonRecords = [] } = schoolsData
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [disciplineFilter, setDisciplineFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [teacherDetailsId, setTeacherDetailsId] = useState<string | null>(null)
  const [classDetailsId, setClassDetailsId] = useState<string | null>(null)
  const [classReturnTeacherId, setClassReturnTeacherId] = useState<string | null>(null)
  const [teacherPage, setTeacherPage] = useState(1)
  const [teacherLimit, setTeacherLimit] = useState(DEFAULT_PAGE_SIZE)
  const [teacherPageData, setTeacherPageData] = useState<TeachersPagePayload | null>(null)
  const [teacherPageLoading, setTeacherPageLoading] = useState(false)
  const [teacherPageSource, setTeacherPageSource] = useState<'backend' | 'local'>(onLoadTeachersPage ? 'backend' : 'local')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTeacherPage(1) }, [disciplineFilter, query, schoolFilter])

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

  const localTeachersPage = useMemo(() => paginateLocal(filteredTeachers, teacherPage, teacherLimit), [filteredTeachers, teacherLimit, teacherPage])

  const displayedTeachers = teacherPageData?.teachers ?? localTeachersPage.items
  const teacherPagination = teacherPageData?.pagination ?? localTeachersPage.pagination

  function getSchoolName(id: string | null) {
    return id ? schools.find((s) => s.id === id)?.name ?? 'Escola não localizada' : 'Rede municipal'
  }
  function getClassName(id: string) {
    return classes.find((c) => c.id === id)?.name ?? 'Turma não localizada'
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
  const selectedClass = classDetailsId ? classes.find((c) => c.id === classDetailsId) ?? null : null
  const returnTeacher = classReturnTeacherId ? teachers.find((t) => t.id === classReturnTeacherId) ?? displayedTeachers.find((t) => t.id === classReturnTeacherId) ?? null : null
  const hasActiveFilters = schoolFilter !== 'all' || disciplineFilter !== 'all' || query !== ''

  // ── Stats summary ──
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        @keyframes svFadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes svFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes svOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes svModalIn { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(250%) } }
        .sv-card { animation: svFadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both }
        .sv-enter { animation: svFadeUp 0.4s ease both }
        .sv-search-active { box-shadow: 0 0 0 3px rgba(139,92,246,.12) }
      `}</style>

      <div className="min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif", background: 'linear-gradient(135deg, #faf9ff 0%, #f1f5f9 40%, #f8f9ff 100%)' }}>
        <div className="space-y-5 px-4 py-8 pb-24 sm:px-6 lg:px-8">

          {/* ── Header ── */}
          <header className="sv-enter" style={{ animationDelay: '0ms' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-500">Gestão acadêmica</span>
                </div>
                <h1 className="text-3xl font-bold leading-tight text-slate-900 font-DMSans">
                  Professores
                </h1>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                {currentRole?.name && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-semibold text-violet-700">
                    <UserCheck size={11} />
                    {currentRole.name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                  <Activity size={11} />
                  {teacherPagination.total} registros
                </span>
              </div>
            </div>
          </header>

          {/* ── Context card + Filters ── */}
          <section className="sv-enter" style={{ animationDelay: '60ms' }}>
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-100/80">
              <div className="h-px bg-gradient-to-r from-violet-400 via-indigo-500 to-blue-400" />

              {/* Stats row */}
              <div className="grid divide-x divide-slate-100 border-b border-slate-100 sm:grid-cols-3">
                <SummaryStat icon={UserRound} label="Professores" value={teacherPagination.total} color="text-violet-700" bg="bg-violet-50" delay={80} />
                <SummaryStat icon={School} label="Escolas" value={schools.length} color="text-emerald-700" bg="bg-emerald-50" delay={120} />
                <SummaryStat icon={Users} label="Turmas" value={classes.length} color="text-blue-700" bg="bg-blue-50" delay={160} />
              </div>

              {/* Filters */}
              <div className="space-y-3 p-4 sm:space-y-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <label className="group flex h-10 min-w-0 items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50/80 px-3.5 transition-all duration-200 focus-within:border-violet-400 focus-within:bg-white focus-within:sv-search-active">
                    <Search size={13} className="shrink-0 text-slate-400 transition group-focus-within:text-violet-500" strokeWidth={2.5} />
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar professor por nome, e-mail ou disciplina..."
                      className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    {query && (
                      <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus() }} className="shrink-0 text-slate-400 transition hover:text-slate-600">
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

                {hasActiveFilters && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Filtros ativos:</span>
                    {query && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                        "{query}"
                        <button type="button" onClick={() => setQuery('')} className="ml-0.5 transition hover:text-violet-900"><X size={10} /></button>
                      </span>
                    )}
                    {schoolFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                        {schools.find((s) => s.id === schoolFilter)?.name}
                        <button type="button" onClick={() => setSchoolFilter('all')} className="ml-0.5 transition hover:text-violet-900"><X size={10} /></button>
                      </span>
                    )}
                    {disciplineFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                        {disciplineFilter}
                        <button type="button" onClick={() => setDisciplineFilter('all')} className="ml-0.5 transition hover:text-violet-900"><X size={10} /></button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="grid gap-5">

            {/* ── Teachers ── */}
            <div
              className="sv-enter overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
              style={{ animationDelay: '120ms' }}
            >
              <SectionStrip icon={UserRound} label="Corpo docente" title="Professores" count={teacherPagination.total} />

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {teacherPageLoading
                  ? Array.from({ length: 6 }).map((_, i) => <TeacherCardSkeleton key={i} delay={i * 60} />)
                  : displayedTeachers.length === 0
                    ? <EmptyTeachers query={query} />
                    : displayedTeachers.map((teacher, idx) => {
                      const teacherClasses = getTeacherClasses(teacher)
                      const teacherProfile = withCurrentUserVisuals(teacher)
                      const teacherSubjects = getReadableSubjects([teacher.specialty])
                      const teacherStudents = uniqueValues(teacherClasses.flatMap((c) => getClassStudents(c).map((s) => s.id)))
                      return (
                        <TeacherCard
                          key={teacher.id}
                          teacher={teacher}
                          teacherClasses={teacherClasses}
                          teacherSubjects={teacherSubjects}
                          studentCount={teacherStudents.length}
                          schoolName={getSchoolName(teacher.schoolId)}
                          profile={teacherProfile}
                          assetVersion={getProfileAssetVersion(teacher)}
                          animDelay={idx * 40}
                          onClick={() => setTeacherDetailsId(teacher.id)}
                        />
                      )
                    })}
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
