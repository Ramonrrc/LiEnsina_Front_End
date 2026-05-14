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
  Star,
  ChevronRight,
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
} from 'lucide-react'

import { resolveApiAssetUrl } from '../api'
import { AvatarHoverPreview } from '../components/profile/AvatarSign'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { DEFAULT_PAGE_SIZE, PaginationControls, paginateLocal } from '../components/ui/pagination-controls'
import { formatClassGrade } from '../class-grade-options'
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

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonLine({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return (
    <span
      className={`block animate-pulse rounded-md bg-slate-200 ${w} ${h}`}
      style={{ animationDuration: '1.4s' }}
    />
  )
}

function TeacherCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-slate-300 bg-white px-4 py-3">
      <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200" style={{ animationDuration: '1.4s' }} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SkeletonLine w="w-36" h="h-3.5" />
        <SkeletonLine w="w-48" h="h-2.5" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SkeletonLine w="w-16" h="h-6" />
        <SkeletonLine w="w-12" h="h-6" />
      </div>
    </div>
  )
}

function StudentCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-slate-300 bg-white px-4 py-3">
      <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200" style={{ animationDuration: '1.4s' }} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <SkeletonLine w="w-40" h="h-3.5" />
        <SkeletonLine w="w-24" h="h-2.5" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <SkeletonLine w="w-20" h="h-6" />
        <SkeletonLine w="w-14" h="h-6" />
        <SkeletonLine w="w-14" h="h-6" />
      </div>
    </div>
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
        className={`grid overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-md ring-2 ring-slate-200 outline-none transition ${hasProfileImage ? 'cursor-pointer hover:ring-indigo-400 focus:ring-2 focus:ring-indigo-500' : ''} ${sizeClass}`}
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

// ─── Metric Card (monocromático, sem rainbows) ────────────────────────────────

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string | number
  detail: string
  icon: React.ElementType
}) {
  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
          <Icon size={14} />
        </span>
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      </div>
      <p className="text-2xl font-black leading-none text-slate-900 mb-1">{value}</p>
      <p className="text-[11px] font-semibold text-slate-400 leading-tight">{detail}</p>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  id,
  title,
  subtitle,
  onClose,
  children,
  maxWidth = '920px',
}: {
  id: string
  title: string
  subtitle: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}) {
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
        className="pv-modal-enter max-h-[92vh] w-full overflow-y-auto rounded-2xl border-2 border-slate-300 bg-white shadow-2xl shadow-slate-900/15"
        style={{ maxWidth }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b-2 border-slate-300 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-indigo-500">{subtitle}</p>
            <h2 id={id} className="mt-0.5 truncate text-xl font-black text-slate-900" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-slate-300 text-slate-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Score Badge (neutro, sem excesso de cor) ─────────────────────────────────

function ScoreBadge({ score }: { score: number | null | undefined }) {
  const hasScore = typeof score === 'number' && Number.isFinite(score)
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border-2 border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600">
      <TrendingUp size={9} />
      {hasScore ? (score as number).toFixed(1) : '—'}
    </span>
  )
}

function AttendanceBadge({ rate }: { rate: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border-2 border-slate-300 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600">
      <Percent size={9} />
      {rate}%
    </span>
  )
}

// ─── Section Header Strip ─────────────────────────────────────────────────────

function SectionStrip({
  icon: Icon,
  label,
  title,
  count,
}: {
  icon: React.ElementType
  label: string
  title: string
  count: number
}) {
  return (
    <div className="flex items-center gap-3 border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-indigo-500">{label}</p>
        <h2 className="text-sm font-black text-slate-900 leading-tight" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
          {title}
        </h2>
      </div>
      <span className="rounded-full border-2 border-slate-300 bg-white px-3 py-1 text-[11px] font-black text-slate-600">
        {count}
      </span>
    </div>
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
  const { schools, classes, teachers, students, guardians } = schoolsData
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
      ...teachers.map((t) => t.specialty),
      ...classes.flatMap((c) => c.bnccFocus ?? []),
    ]).map((d) => ({ value: d, label: d })),
  ], [classes, teachers])

  const filteredTeachers = useMemo(() => {
    const q = normalize(query)
    return teachers.filter((t) => {
      if (schoolFilter !== 'all' && t.schoolId !== schoolFilter) return false
      if (disciplineFilter !== 'all' && normalize(t.specialty) !== normalize(disciplineFilter)) return false
      if (!q) return true
      return normalize(`${t.name} ${t.email} ${t.specialty}`).includes(q)
    })
  }, [disciplineFilter, query, schoolFilter, teachers])

  const filteredStudents = useMemo(() => {
    const q = normalize(query)
    const disciplineClassIds = new Set(classes
      .filter((c) => disciplineFilter === 'all' || (c.bnccFocus ?? []).some((f) => normalize(f).includes(normalize(disciplineFilter))))
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
  function getGuardianName(id: string) {
    return guardians.find((g) => g.id === id)?.name ?? 'Responsável pendente'
  }
  function getStudentSubjects(student: Student) {
    const classRoom = getClassById(student.classId)
    const subjects = classRoom?.bnccFocus?.length
      ? classRoom.bnccFocus
      : classRoom ? getClassTeachers(classRoom).map((t) => t.specialty).filter(Boolean) : []
    return uniqueValues(subjects.length ? subjects : ['Média geral'])
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes pv-fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pv-slideUp { from { opacity: 0; transform: translateY(12px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes pv-cardIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .pv-modal-enter { animation: pv-slideUp 0.22s cubic-bezier(0.16,1,0.3,1) both }
        .pv-card-enter { animation: pv-cardIn 0.2s cubic-bezier(0.16,1,0.3,1) both }
      `}</style>

      <div className="grid min-h-screen gap-4 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 px-[clamp(12px,2.5vw,36px)] py-5 pb-10" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* ── Header ── */}
        <PageTitleBar
          label="Gestão"
          title="Pessoas"
          icon={<Users />}
          actions={(
            <div className="flex items-center gap-2">
              {currentRole?.name && (
                <span className="hidden items-center gap-1.5 rounded-full border-2 border-indigo-300 bg-indigo-50 px-3 py-1 text-[11px] font-black text-indigo-700 sm:inline-flex">
                  <UserCheck size={11} />
                  {currentRole.name}
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-full border-2 border-slate-300 bg-white px-3 py-1 text-[11px] font-black text-slate-500">
                <Layers size={11} />
                {teacherPagination.total + studentPagination.total} registros
              </span>
            </div>
          )}
        />

        {/* ── Filters ── */}
        <section className="grid grid-cols-[minmax(240px,1fr)_minmax(200px,0.4fr)_minmax(200px,0.35fr)] gap-2.5 rounded-2xl border-2 border-slate-300 bg-white p-3 shadow-sm max-[920px]:grid-cols-1">
          <label className="group flex h-11 min-w-0 items-center gap-2.5 rounded-sm border-2 border-slate-300 bg-slate-50 px-3.5 transition focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100 hover:border-slate-300">
            <Search size={15} className="shrink-0 text-slate-400 transition group-focus-within:text-indigo-500" strokeWidth={2.4} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, e-mail ou matrícula…"
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
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
            className="h-11 rounded-sm border-2 border-slate-300 bg-slate-50 px-3.5 text-sm font-bold text-slate-700 focus:border-indigo-400"
          />
          <CompactSelect
            value={disciplineFilter}
            options={disciplineOptions}
            onChange={setDisciplineFilter}
            dropdownWidth="trigger"
            className="h-11 rounded-sm border-2 border-slate-300 bg-slate-50 px-3.5 text-sm font-bold text-slate-700 focus:border-indigo-400"
          />
        </section>

        <div className="grid gap-4">

          {/* ── Teachers ── */}
          <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
            <SectionStrip icon={UserRound} label="Corpo docente" title="Professores" count={teacherPagination.total} />

            <div className="grid gap-2 p-4">
              {teacherPageLoading
                ? Array.from({ length: 4 }).map((_, i) => <TeacherCardSkeleton key={i} />)
                : displayedTeachers.map((teacher, idx) => {
                  const teacherClasses = getTeacherClasses(teacher)
                  const teacherProfile = withCurrentUserVisuals(teacher)

                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => setTeacherDetailsId(teacher.id)}
                      className="pv-card-enter group flex min-w-0 items-center gap-3 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50/40 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      style={{ animationDelay: `${idx * 25}ms` }}
                    >
                      <ProfileAvatar entity={teacherProfile} size="md" assetVersion={getProfileAssetVersion(teacher)} />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-[13px] font-black text-slate-900 group-hover:text-indigo-800 transition-colors">{teacher.name}</strong>
                        <span className="block truncate text-[11px] font-semibold text-slate-500">{teacher.email}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="hidden items-center gap-1 rounded-lg border-2 border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 sm:inline-flex">
                          <BookMarked size={9} />
                          {teacher.specialty || 'Sem disciplina'}
                        </span>
                        <span className="hidden items-center gap-1 rounded-lg border-2 border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 lg:inline-flex">
                          <School size={9} />
                          {getSchoolName(teacher.schoolId).split(' ').slice(0, 2).join(' ')}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg border-2 border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
                          <Users size={9} />
                          {teacherClasses.length}t
                        </span>
                        <ChevronRight size={15} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                      </div>
                    </button>
                  )
                })}
              {!teacherPageLoading && displayedTeachers.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 py-12 text-slate-400">
                  <UserRound size={30} className="opacity-30" />
                  <p className="text-sm font-bold">Nenhum professor encontrado.</p>
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
          <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
            <SectionStrip icon={GraduationCap} label="Corpo discente" title="Alunos" count={studentPagination.total} />

            <div className="grid gap-2 p-4">
              {studentPageLoading
                ? Array.from({ length: 4 }).map((_, i) => <StudentCardSkeleton key={i} />)
                : displayedStudents.map((student, idx) => {
                  const studentProfile = withCurrentUserVisuals(student)
                  const perf = student.desempenho ?? getPerformanceFromScore(student.averageScore)
                  const PerfIcon = getPerformanceIcon(perf)

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setStudentDetailsId(student.id)}
                      className="pv-card-enter group flex min-w-0 items-center gap-3 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50/40 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      style={{ animationDelay: `${idx * 25}ms` }}
                    >
                      <ProfileAvatar entity={studentProfile} size="md" assetVersion={getProfileAssetVersion(student)} />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-[13px] font-black text-slate-900 group-hover:text-indigo-800 transition-colors">{student.name}</strong>
                        <span className="block truncate text-[11px] font-semibold text-slate-500">{student.registrationNumber || student.login}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="hidden items-center gap-1 rounded-lg border-2 border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600 sm:inline-flex">
                          <Users size={9} />
                          {getClassName(student.classId)}
                        </span>
                        <AttendanceBadge rate={student.attendanceRate} />
                        <ScoreBadge score={student.averageScore} />
                        <span className={`hidden items-center gap-1 rounded-lg border-2 px-2.5 py-1 text-[10px] font-black lg:inline-flex ${getPerformanceTone(perf)}`}>
                          <PerfIcon size={9} />
                          {getPerformanceLabel(perf)}
                        </span>
                        <ChevronRight size={15} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                      </div>
                    </button>
                  )
                })}
              {!studentPageLoading && displayedStudents.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 py-12 text-slate-400">
                  <GraduationCap size={30} className="opacity-30" />
                  <p className="text-sm font-bold">Nenhum aluno encontrado.</p>
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

        {/* ─── Teacher Modal ─────────────────────────────────────────────────── */}
        {selectedTeacher ? (() => {
          const teacherProfile = withCurrentUserVisuals(selectedTeacher)
          const teacherClasses = getTeacherClasses(selectedTeacher)
          const teacherStudents = uniqueValues(teacherClasses.flatMap((c) => getClassStudents(c).map((s) => s.id)))
          const teacherSubjects = uniqueValues([selectedTeacher.specialty, ...teacherClasses.flatMap((c) => c.bnccFocus ?? [])])

          return (
            <Modal id="teacher-details-title" title={selectedTeacher.name} subtitle="Professor" onClose={() => setTeacherDetailsId(null)} maxWidth="980px">
              <div className="grid gap-5 p-6">
                {/* Profile strip */}
                <div className="flex min-w-0 items-center gap-4 rounded-2xl border-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white p-4">
                  <ProfileAvatar entity={teacherProfile} size="lg" assetVersion={getProfileAssetVersion(selectedTeacher)} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black text-slate-900" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>{selectedTeacher.name}</h3>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">{selectedTeacher.email}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-300 bg-white px-3 py-1 text-[10px] font-black text-slate-600">
                        <BookMarked size={10} />{selectedTeacher.specialty || 'Disciplina não informada'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-300 bg-white px-3 py-1 text-[10px] font-black text-slate-500">
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
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                    <Layers size={11} />Turmas vinculadas
                  </p>
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
                          className="group min-w-0 rounded-2xl border-2 border-slate-300 bg-white p-4 text-left transition hover:border-indigo-400 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-100"
                        >
                          <span className="flex min-w-0 items-start justify-between gap-2">
                            <span className="min-w-0">
                              <strong className="block truncate text-sm font-black text-slate-900 group-hover:text-indigo-800 transition-colors">{classRoom.name}</strong>
                              <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">
                                {formatClassGrade(classRoom.grade)} · {classRoom.shift} · {getSchoolName(classRoom.schoolId).split(' ').slice(0, 3).join(' ')}
                              </span>
                            </span>
                            <span className="shrink-0 rounded-full border-2 border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[10px] font-black text-slate-600">
                              {classStudents.length} al.
                            </span>
                          </span>
                          <span className="mt-3 grid grid-cols-3 gap-2">
                            {[
                              { label: 'Média', value: formatScore(classAverage) },
                              { label: 'Ano', value: String(classRoom.academicYear) },
                              { label: 'Disciplinas', value: String(classRoom.bnccFocus?.length ?? 0) },
                            ].map(({ label, value }) => (
                              <span key={label} className="rounded-xl border-2 border-slate-300 bg-slate-50 px-2 py-2">
                                <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                                <span className="mt-0.5 block text-sm font-black text-slate-800">{value}</span>
                              </span>
                            ))}
                          </span>
                          <span className="mt-3 flex items-center gap-1">
                            {previewStudents.map((s) => <ProfileAvatar key={s.id} entity={withCurrentUserVisuals(s)} assetVersion={getProfileAssetVersion(s)} />)}
                            {classStudents.length > previewStudents.length && (
                              <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-slate-300 bg-slate-100 text-[9px] font-black text-slate-500">
                                +{classStudents.length - previewStudents.length}
                              </span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                    {teacherClasses.length === 0 && (
                      <p className="col-span-2 rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-400">
                        Nenhuma turma vinculada.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Modal>
          )
        })() : null}

        {/* ─── Student Modal ─────────────────────────────────────────────────── */}
        {selectedStudent ? (() => {
          const classRoom = getClassById(selectedStudent.classId)
          const classStudents = classRoom ? getClassStudents(classRoom) : []
          const classAverage = getAverageScore(classStudents)
          const subjects = getStudentSubjects(selectedStudent)
          const studentProfile = withCurrentUserVisuals(selectedStudent)
          const perf = selectedStudent.desempenho ?? getPerformanceFromScore(selectedStudent.averageScore)

          const score = selectedStudent.averageScore ?? null
          const scorePct = score !== null ? Math.min(100, (score / 10) * 100) : 0
          const freqPct = selectedStudent.attendanceRate ?? 0

          // Frequency color logic (matching SchoolsView)
          const freqGood = freqPct >= 75
          const freqFill = freqGood ? 'from-emerald-400 to-emerald-500' : 'from-red-400 to-red-500'
          const freqLabel = freqGood ? 'Regular' : 'Baixa'
          const freqLabelTone = freqGood ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700'

          // Score color logic (matching SchoolsView)
          const scoreLevel = perf === 'Otimo' ? 'emerald' : perf === 'Medio' ? 'amber' : perf === 'Baixo' ? 'red' : 'slate'
          const scoreFill: Record<string, string> = {
            emerald: 'from-emerald-400 to-emerald-500',
            amber: 'from-amber-400 to-amber-500',
            red: 'from-red-400 to-red-500',
            slate: 'from-slate-200 to-slate-300',
          }
          const scoreTrack: Record<string, string> = {
            emerald: 'bg-emerald-100', amber: 'bg-amber-100', red: 'bg-red-100', slate: 'bg-slate-100',
          }
          const scoreText: Record<string, string> = {
            emerald: 'text-emerald-700', amber: 'text-amber-700', red: 'text-red-700', slate: 'text-slate-400',
          }

          // Distribution
          const otimo = classStudents.filter(s => (s.desempenho ?? getPerformanceFromScore(s.averageScore)) === 'Otimo').length
          const medio = classStudents.filter(s => (s.desempenho ?? getPerformanceFromScore(s.averageScore)) === 'Medio').length
          const baixo = classStudents.filter(s => (s.desempenho ?? getPerformanceFromScore(s.averageScore)) === 'Baixo').length
          const totalInClass = classStudents.length

          return (
            <Modal id="student-details-title" title={selectedStudent.name} subtitle="Aluno" onClose={() => setStudentDetailsId(null)} maxWidth="960px">
              <div className="grid gap-5 p-6">

                {/* Profile strip */}
                <div className="flex min-w-0 items-center gap-4 rounded-2xl border-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white p-4">
                  <ProfileAvatar entity={studentProfile} size="lg" assetVersion={getProfileAssetVersion(selectedStudent)} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-black text-slate-900" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>{selectedStudent.name}</h3>
                    <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">{selectedStudent.email ?? selectedStudent.login}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-bold text-indigo-600">
                      <Users size={10} />{classRoom?.name ?? 'Sem turma vinculada'}
                    </p>
                  </div>
                  <span className={`hidden shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-xs font-black sm:inline-flex ${getPerformanceTone(perf)}`}>
                    {(() => { const Icon = getPerformanceIcon(perf); return <Icon size={13} /> })()}
                    {getPerformanceLabel(perf)}
                  </span>
                </div>

                {/* ── Metrics 4-col ── */}
                <div className="grid gap-3 md:grid-cols-4">
                  <MetricCard
                    label="Frequência"
                    value={`${freqPct}%`}
                    detail="Presença consolidada"
                    icon={BadgeCheck}
                  />
                  <MetricCard
                    label="Média geral"
                    value={formatScore(score)}
                    detail="Notas consolidadas"
                    icon={TrendingUp}
                  />
                  <MetricCard
                    label="Turma"
                    value={classRoom?.name ?? '—'}
                    detail={classRoom ? `${formatClassGrade(classRoom.grade)} · ${classRoom.shift}` : 'Sem turma'}
                    icon={Users}
                  />
                  <MetricCard label="Matérias" value={subjects.length} detail="Componentes curriculares" icon={BookOpen} />
                </div>

                {/* ── Frequência + Média (estilo SchoolsView) ── */}
                {classStudents.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">

                    {/* Frequência */}
                    <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                          <TrendingUp size={13} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Frequência</span>
                      </div>
                      <div className="mb-3">
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all bg-gradient-to-r ${freqFill}`}
                            style={{ width: `${freqPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="font-['Sora',system-ui,sans-serif] text-3xl font-black leading-none text-slate-900">{freqPct}%</span>
                        <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black ${freqLabelTone}`}>
                          {freqLabel}
                        </span>
                      </div>
                    </div>

                    {/* Média geral */}
                    <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
                          <BarChart3 size={13} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Média geral</span>
                      </div>
                      <div className="mb-3">
                        <div className={`h-2 w-full rounded-full overflow-hidden ${scoreTrack[scoreLevel]}`}>
                          <div
                            className={`h-full rounded-full transition-all bg-gradient-to-r ${scoreFill[scoreLevel]}`}
                            style={{ width: `${scorePct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className={`font-['Sora',system-ui,sans-serif] text-3xl font-black leading-none ${scoreText[scoreLevel]}`}>
                          {score !== null ? score.toFixed(1) : '—'}
                        </span>
                        <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black ${getPerformanceTone(perf)}`}>
                          {getPerformanceLabel(perf)}
                        </span>
                      </div>
                    </div>

                    {/* Distribuição da turma */}
                    <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500">
                          <Award size={13} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Turma</span>
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
                            <span className={`text-lg font-black leading-none ${d.color}`}>{d.count}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{d.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Data + Table */}
                <div className="grid gap-4 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
                  <div className="rounded-2xl border-2 border-slate-300 bg-slate-50 p-4">
                    <p className="mb-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                      <Hash size={10} />Dados acadêmicos
                    </p>
                    <dl className="grid gap-3 text-sm">
                      {[
                        { label: 'Matrícula', value: selectedStudent.registrationNumber || selectedStudent.registration || '—', icon: Hash },
                        { label: 'Escola', value: getSchoolName(selectedStudent.schoolId), icon: Building2 },
                        { label: 'Ano letivo', value: classRoom?.academicYear ? String(classRoom.academicYear) : '—', icon: CalendarDays },
                        { label: 'Responsáveis', value: selectedStudent.guardianIds?.length ? selectedStudent.guardianIds.map(getGuardianName).join(', ') : '—', icon: UserCheck },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-start gap-2.5">
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 border-slate-300 bg-white text-slate-400">
                            <Icon size={10} />
                          </span>
                          <div className="min-w-0">
                            <dt className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</dt>
                            <dd className="mt-0.5 truncate text-xs font-bold text-slate-800">{value}</dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white">
                    <div className="flex items-center gap-2 border-b-2 border-slate-300 bg-slate-50 px-4 py-3">
                      <BarChart3 size={13} className="text-indigo-500" />
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Matérias, notas e médias</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-left">
                        <thead>
                          <tr className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-400">
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
                            const sTrack: Record<string, string> = { emerald: 'bg-emerald-100', amber: 'bg-amber-100', red: 'bg-red-100', slate: 'bg-slate-100' }

                            const cScore = classAverage
                            const cPct = cScore !== null ? Math.min(100, (cScore / 10) * 100) : 0
                            const cPerf = getPerformanceFromScore(cScore)
                            const cLevel = cPerf === 'Otimo' ? 'emerald' : cPerf === 'Medio' ? 'amber' : cPerf === 'Baixo' ? 'red' : 'slate'

                            return (
                              <tr key={subject} className="transition hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-sm text-slate-800">{subject}</td>

                                {/* Nota — anel SVG + barra */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                                      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                                        <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-100" strokeWidth="3" />
                                        <circle
                                          cx="18" cy="18" r="15" fill="none"
                                          className={sRing[sLevel]}
                                          strokeWidth="3.5"
                                          strokeDasharray={`${(sPct / 100) * 94.2} 94.2`}
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                      <span className={`relative z-10 text-[10px] font-black ${sText[sLevel]}`}>
                                        {sScore !== null ? sScore.toFixed(1) : '—'}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Média turma — anel SVG + barra */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                                      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                                        <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-100" strokeWidth="3" />
                                        <circle
                                          cx="18" cy="18" r="15" fill="none"
                                          className={sRing[cLevel]}
                                          strokeWidth="3.5"
                                          strokeDasharray={`${(cPct / 100) * 94.2} 94.2`}
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                      <span className={`relative z-10 text-[10px] font-black ${sText[cLevel]}`}>
                                        {cScore !== null ? cScore.toFixed(1) : '—'}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1 rounded-lg border-2 px-2 py-0.5 text-[10px] font-black ${getPerformanceTone(performance)}`}>
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

        {/* ─── Class Modal ───────────────────────────────────────────────────── */}
        {selectedClass ? (() => {
          const classStudents = getClassStudents(selectedClass)
          const classTeachers = getClassTeachers(selectedClass)
          const classAverage = getAverageScore(classStudents)
          const classPerformance = getPerformanceFromScore(classAverage)
          const avgAttendance = classStudents.length
            ? Math.round(classStudents.reduce((s, st) => s + st.attendanceRate, 0) / classStudents.length)
            : null
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
                  <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
                    <button
                      type="button"
                      onClick={returnToTeacherClasses}
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-indigo-300 bg-white px-3 py-1.5 text-sm font-black text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <ArrowLeft size={14} />Voltar ao professor
                    </button>
                    {returnTeacher && <p className="min-w-0 truncate text-xs font-bold text-slate-500">{returnTeacher.name}</p>}
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricCard label="Turno" value={selectedClass.shift} detail={selectedClass.schedule || 'Horário não informado'} icon={Clock} />
                  <MetricCard label="Alunos" value={classStudents.length} detail="Vinculados à turma" icon={GraduationCap} />
                  <MetricCard label="Professores" value={classTeachers.length || (selectedClass.teacherId ? 1 : 0)} detail="Docentes" icon={UserRound} />
                  <MetricCard label="Ano letivo" value={selectedClass.academicYear} detail={getSchoolName(selectedClass.schoolId).split(' ').slice(0, 3).join(' ')} icon={CalendarDays} />
                </div>

                {/* Performance summary (estilo SchoolsView) */}
                {classStudents.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
                    {/* Freq */}
                    <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                          <TrendingUp size={13} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Freq. média</span>
                      </div>
                      <div className="mb-3">
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${freqFillClass}`} style={{ width: `${freqPctClass}%` }} />
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="font-['Sora',system-ui,sans-serif] text-3xl font-black leading-none text-slate-900">{avgAttendance ?? '—'}%</span>
                        <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black ${freqGoodClass ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
                          {freqGoodClass ? 'Regular' : 'Baixa'}
                        </span>
                      </div>
                    </div>

                    {/* Média */}
                    <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
                          <BarChart3 size={13} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Média geral</span>
                      </div>
                      <div className="mb-3">
                        <div className={`h-2 w-full rounded-full overflow-hidden ${scoreTrackMap[scoreColorClass]}`}>
                          <div className={`h-full rounded-full bg-gradient-to-r ${scoreFillMap[scoreColorClass]}`} style={{ width: `${scorePctClass}%` }} />
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="font-['Sora',system-ui,sans-serif] text-3xl font-black leading-none text-slate-900">
                          {classAverage !== null ? classAverage.toFixed(1) : '—'}
                        </span>
                        <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black ${getPerformanceTone(classPerformance)}`}>
                          {getPerformanceLabel(classPerformance)}
                        </span>
                      </div>
                    </div>

                    {/* Distribuição */}
                    <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500">
                          <Award size={13} className="text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Distribuição</span>
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
                            <span className={`text-lg font-black leading-none ${d.color}`}>{d.count}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{d.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Teachers */}
                <div>
                  <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                    <UserRound size={11} />Professores
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {classTeachers.map((teacher) => (
                      <div key={teacher.id} className="flex min-w-0 items-center gap-3 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 py-3">
                        <ProfileAvatar entity={withCurrentUserVisuals(teacher)} size="md" assetVersion={getProfileAssetVersion(teacher)} />
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-black text-slate-900">{teacher.name}</strong>
                          <span className="flex items-center gap-1 truncate text-[11px] font-semibold text-indigo-600">
                            <BookMarked size={9} />{teacher.specialty || 'Especialidade não informada'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {classTeachers.length === 0 && (
                      <p className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-400">
                        Nenhum professor vinculado.
                      </p>
                    )}
                  </div>
                </div>

                {/* Students list */}
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                      <GraduationCap size={11} />Alunos da turma
                    </p>
                    <span className="rounded-full border-2 border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[10px] font-black text-slate-600">
                      {classStudents.length}
                    </span>
                  </div>
                  <div className="grid gap-2 rounded-2xl border-2 border-slate-300 bg-slate-50 p-3">
                    {classStudents.map((student) => {
                      const perf = student.desempenho ?? getPerformanceFromScore(student.averageScore)
                      const score = student.averageScore ?? null
                      const scorePctS = score !== null ? Math.min(100, (score / 10) * 100) : 0
                      const scoreLevelS = perf === 'Otimo' ? 'emerald' : perf === 'Medio' ? 'amber' : perf === 'Baixo' ? 'red' : 'slate'
                      const scoreRingColorMap: Record<string, string> = {
                        emerald: 'stroke-emerald-400', amber: 'stroke-amber-400',
                        red: 'stroke-red-400', slate: 'stroke-slate-200',
                      }
                      const scoreTextColorMap: Record<string, string> = {
                        emerald: 'text-emerald-700', amber: 'text-amber-700',
                        red: 'text-red-700', slate: 'text-slate-400',
                      }
                      const stripeColor: Record<string, string> = {
                        Otimo: 'bg-emerald-500', Medio: 'bg-amber-500', Baixo: 'bg-red-500',
                      }
                      const freqGoodS = (student.attendanceRate ?? 0) >= 75
                      const freqWarnS = (student.attendanceRate ?? 0) >= 60
                      const freqBarS = freqGoodS ? 'from-emerald-400 to-emerald-500' : freqWarnS ? 'from-amber-400 to-amber-500' : 'from-red-400 to-red-500'
                      const freqTextS = freqGoodS ? 'text-emerald-600' : freqWarnS ? 'text-amber-600' : 'text-red-600'

                      return (
                        <article
                          key={student.id}
                          className="relative overflow-hidden grid min-w-0 items-center gap-3 rounded-xl border-2 border-slate-300 bg-white p-3 lg:grid-cols-[minmax(180px,1.3fr)_minmax(140px,1fr)_100px_90px_110px] max-lg:grid-cols-2 max-[560px]:grid-cols-1 transition hover:border-indigo-300 hover:shadow-sm"
                        >
                          <div className={`absolute left-0 top-0 h-full w-[3px] ${stripeColor[perf] ?? 'bg-slate-300'}`} />
                          <div className="pl-3 flex min-w-0 items-center gap-2.5">
                            <ProfileAvatar entity={withCurrentUserVisuals(student)} assetVersion={getProfileAssetVersion(student)} />
                            <div className="min-w-0">
                              <strong className="block truncate text-[12px] font-black text-slate-900">{student.name}</strong>
                              <span className="block truncate font-mono text-[10px] font-semibold text-slate-400">
                                {student.registrationNumber || student.registration || 'Sem matrícula'}
                              </span>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Responsáveis</p>
                            <p className="truncate text-[11px] font-semibold text-slate-600">
                              {student.guardianIds?.length ? student.guardianIds.map(getGuardianName).join(', ') : <span className="text-slate-300">—</span>}
                            </p>
                          </div>

                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5">Frequência</p>
                            <p className={`text-sm font-black mb-1.5 leading-none ${freqTextS}`}>{student.attendanceRate}%</p>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${freqBarS}`} style={{ width: `${student.attendanceRate ?? 0}%` }} />
                            </div>
                          </div>

                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1.5">Média</p>
                            <div className="relative flex h-9 w-9 items-center justify-center">
                              <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                                <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-100" strokeWidth="3" />
                                <circle
                                  cx="18" cy="18" r="15" fill="none"
                                  className={scoreRingColorMap[scoreLevelS]}
                                  strokeWidth="3.5"
                                  strokeDasharray={`${(scorePctS / 100) * 94.2} 94.2`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className={`relative z-10 text-[10px] font-black ${scoreTextColorMap[scoreLevelS]}`}>
                                {score !== null ? score.toFixed(1) : '—'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="mb-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">Desempenho</p>
                            <span className={`inline-flex items-center gap-1 rounded-lg border-2 px-2 py-0.5 text-[10px] font-black ${getPerformanceTone(perf)}`}>
                              {(() => { const I = getPerformanceIcon(perf); return <I size={9} /> })()}
                              {getPerformanceLabel(perf)}
                            </span>
                          </div>
                        </article>
                      )
                    })}
                    {classStudents.length === 0 && (
                      <p className="py-8 text-center text-sm font-semibold text-slate-400">Nenhum aluno vinculado.</p>
                    )}
                  </div>
                </div>

                {/* Disciplines + Guardians */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                    <p className="mb-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                      <BookOpen size={10} />Disciplinas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedClass.bnccFocus?.map((focus) => (
                        <span key={focus} className="rounded-lg border-2 border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">{focus}</span>
                      ))}
                      {!selectedClass.bnccFocus?.length && (
                        <span className="text-xs font-semibold text-slate-400">Nenhuma disciplina cadastrada.</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border-2 border-slate-300 bg-white p-4">
                    <p className="mb-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                      <UserCheck size={10} />Responsáveis
                    </p>
                    <div className="grid gap-1.5">
                      {guardianIds.map((id) => (
                        <span key={id} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          {getGuardianName(id)}
                        </span>
                      ))}
                      {guardianIds.length === 0 && (
                        <p className="text-xs font-semibold text-slate-400">Nenhum responsável vinculado.</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </Modal>
          )
        })() : null}

      </div>
    </>
  )
}
