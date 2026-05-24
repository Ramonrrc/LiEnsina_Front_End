import { createPortal } from 'react-dom'
import { useMemo, useState, useEffect } from 'react'
import {
  Activity,
  ArrowRight,
  AlertCircle,
  Award,
  BarChart2,
  BarChart3,
  BadgeCheck,
  BookMarked,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  DoorOpen,
  FileText,
  Flame,
  GraduationCap,
  Layers,
  LayoutGrid,
  ListChecks,
  PenLine,
  Save,
  School,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserRound,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react'

import { CompactSelect } from '../../components/ui/compact-select'
import DateInput from '../../components/ui/date-input'
import { FieldMessage, fieldStateClass } from '../../components/ui/form-field'
import { PaginationControls } from '../../components/ui/pagination-controls'
import { PedagogicalDashboard } from './PedagogicalDashboard'
import { formatClassGrade } from '../../class-grade-options'
import {
  ActionButton,
  AlertBanner,
  CompactProgressMetric,
  EmptyState,
  InfoCard,
  InfoCardSkeleton,
  LockedSchoolField,
  MetricProgress,
  PanelCard,
  SectionHeader,
  SectionShell,
  StudentCardSkeleton,
  classOptions,
  getAcademicSubjectLabel,
  getSubjectIcon,
  getSubjectIconBg,
  normalizeAcademicText,
  getClassStudents,
  getSubjectAccent,
} from '../../components/role-portal/portal-components'
import type { RolePortalScreenModel } from './screen-model'
import type { TeacherSubjectCardsPagePayload } from '../../types'

/* ─── Eyebrow label ──────────────────────────────────────────────────────── */
function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold tracking-[.16em] uppercase text-stone-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

/* ─── Field wrapper com iconColor ───────────────────────────────────────── */
function Field({
  label,
  icon: Icon,
  iconColor = 'text-stone-400',
  error,
  children,
  hint,
  required,
}: {
  label: string
  icon?: React.ElementType
  iconColor?: string
  error?: string
  children: React.ReactNode
  hint?: string
  required?: boolean
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5">
        {Icon && <Icon size={11} className={`shrink-0 ${iconColor}`} />}
        <Eyebrow className="text-stone-500">{label}</Eyebrow>
        {required && <span className="ml-0.5 text-rose-400 text-[10px] font-bold">*</span>}
      </span>
      {children}
      <FieldMessage hint={hint} error={error} />
    </label>
  )
}

/* ─── Skeletons ──────────────────────────────────────────────────────────── */
function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-stone-200 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  )
}

function SubjectCardSkeleton({ index }: { index: number }) {
  return (
    <article
      className="relative flex flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-indigo-200 to-violet-200" />
      <div className="flex flex-1 flex-col gap-4 p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bone className="h-11 w-11 rounded-lg shrink-0" />
            <div className="space-y-2">
              <Bone className="h-2.5 w-16" />
              <Bone className="h-4 w-32" />
            </div>
          </div>
          <Bone className="h-5 w-14 rounded-full" />
        </div>
        <Bone className="h-12 w-full rounded-lg" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <Bone key={i} className="h-7 w-20 rounded-lg" />)}
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <Bone className="h-9 rounded-lg" />
          <Bone className="h-9 rounded-lg" />
          <Bone className="col-span-2 h-10 rounded-lg" />
          <Bone className="col-span-2 h-9 rounded-lg" />
        </div>
      </div>
    </article>
  )
}

/* ─── Modal wrapper ─────────────────────────────────────────────────────── */
function LightModal({
  open, onClose, title, eyebrow, wide, children, tabs,
}: {
  open: boolean
  onClose: () => void
  title: string
  eyebrow?: string
  wide?: boolean
  children: React.ReactNode
  tabs?: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden p-4 py-6 backdrop-blur-sm sm:items-center"
      style={{ background: 'rgba(15,23,42,0.25)', animation: 'fadeIn 0.15s ease-out' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-2xl
          ${wide ? 'max-h-[calc(100dvh-3rem)] max-w-5xl' : 'max-h-[calc(100dvh-3rem)] max-w-2xl'}`}
        style={{ animation: 'scaleIn 0.25s ease-out' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Gradient strip */}
        <div className="h-0.5 w-full shrink-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-200 bg-stone-50 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              {eyebrow && <Eyebrow className="mb-0.5 text-indigo-500">{eyebrow}</Eyebrow>}
              <h2 className="truncate text-lg font-semibold text-stone-900 leading-tight font-['Lora']">{title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-stone-300 bg-white text-stone-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab strip */}
        {tabs && (
          <div className="border-b border-stone-200 bg-white px-5 py-3 shrink-0">
            {tabs}
          </div>
        )}

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-stone-50/50 p-5">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Subject card ───────────────────────────────────────────────────────── */
function SubjectCard({
  card, index, onClasses, onHistory, onLesson, onEvaluations,
  formatReservationDate, compareLessonRecordsByNewest,
}: {
  card: any
  index: number
  onClasses: () => void
  onHistory: () => void
  onLesson: () => void
  onEvaluations: () => void
  formatReservationDate: (d: string) => string
  compareLessonRecordsByNewest: (a: any, b: any) => number
}) {
  const iconStyle = getSubjectIconBg(index)
  const accent = getSubjectAccent(index)
  const lastLesson = card.lessons.length
    ? [...card.lessons].sort(compareLessonRecordsByNewest)[0]
    : null

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5"
      style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0, transform: 'translateY(16px)', animationDelay: `${index * 70}ms` }}
    >
      {/* Left accent strip */}
      <div className={`absolute left-0 top-0 h-full w-[3px] ${accent.strip} transition-all duration-300 group-hover:w-1`} />

      <div className="relative flex flex-1 flex-col gap-4 p-5 pl-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${iconStyle.bg} ${iconStyle.text} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
              {getSubjectIcon(card.subject)}
            </span>
            <div className="min-w-0">
              <Eyebrow className="mb-0.5">Matéria</Eyebrow>
              <h2 className="truncate text-base font-semibold text-stone-900 leading-tight font-['Lora']">
                {card.subject}
              </h2>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 font-['DM_Sans']">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Ativa
          </span>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-indigo-100">
              <Users className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div>
              <Eyebrow className="mb-0">Turmas</Eyebrow>
              <strong className="text-sm font-bold text-stone-900 font-['Lora']">{card.classes.length}</strong>
            </div>
          </div>
          <div className="h-7 w-px bg-stone-200" />
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-violet-100">
              <ClipboardList className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <div>
              <Eyebrow className="mb-0">Aulas</Eyebrow>
              <strong className="text-sm font-bold text-stone-900 font-['Lora']">{card.lessons.length}</strong>
            </div>
          </div>
          {lastLesson && (
            <>
              <div className="h-7 w-px bg-stone-200" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-100">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <Eyebrow className="mb-0">Última</Eyebrow>
                  <strong className="block truncate text-xs font-bold text-stone-700 font-['DM_Sans']">
                    {formatReservationDate(lastLesson.date)}
                  </strong>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Class tags */}
        {card.classes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.classes.slice(0, 3).map((classRoom: any) => (
              <span
                key={classRoom.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-stone-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 font-['DM_Sans']"
              >
                <GraduationCap className="h-3 w-3 text-violet-500" />
                {classRoom.name}
              </span>
            ))}
            {card.classes.length > 3 && (
              <span className="inline-flex items-center rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-semibold text-stone-400 font-['DM_Sans']">
                +{card.classes.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onClasses}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-[11px] font-semibold text-stone-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-[0.98] font-['DM_Sans']"
          >
            <Users className="h-3.5 w-3.5 text-sky-500" />
            Ver turmas
          </button>
          <button
            type="button"
            onClick={onHistory}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-[11px] font-semibold text-stone-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 active:scale-[0.98] font-['DM_Sans']"
          >
            <CalendarDays className="h-3.5 w-3.5 text-violet-500" />
            Histórico
          </button>
          <button
            type="button"
            onClick={onLesson}
            className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-indigo-500 bg-indigo-600 px-4 text-[11px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] font-['DM_Sans']"
          >
            <PenLine className="h-3.5 w-3.5" />
            Registrar nova aula
            <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-70" />
          </button>
          <button
            type="button"
            onClick={onEvaluations}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-[11px] font-semibold text-stone-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 active:scale-[0.98] font-['DM_Sans']"
          >
            <FileText className="h-3.5 w-3.5 text-amber-500" />
            Provas
          </button>
          <button
            type="button"
            onClick={onLesson}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-[11px] font-semibold text-stone-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.98] font-['DM_Sans']"
          >
            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
            Aula e frequência
          </button>
        </div>
      </div>
    </article>
  )
}

/* ─── Attendance toggle ──────────────────────────────────────────────────── */
function AttendanceRow({
  student, present, onToggle, animDelay,
}: {
  student: any
  present: boolean
  onToggle: () => void
  animDelay: number
}) {
  return (
    <label
      className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border border-stone-300 bg-white px-5 py-3 transition-all hover:border-indigo-200 hover:shadow-sm font-['DM_Sans']"
      style={{ animation: 'fadeSlideUp 0.3s ease-out forwards', opacity: 0, animationDelay: `${animDelay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all ${present ? 'bg-emerald-500 text-white shadow-sm' : 'bg-stone-100 text-stone-400'}`}>
          <UserRound className="h-4 w-4" />
        </div>
        <div>
          <strong className="block text-sm font-semibold text-stone-900 leading-tight">{student.name}</strong>
          <span className="text-xs text-stone-400">{student.registrationNumber}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={`text-xs font-semibold transition-colors ${present ? 'text-emerald-600' : 'text-stone-400'}`}>
          {present ? 'Presente' : 'Faltou'}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label={present ? 'Presente' : 'Faltou'}
          className={`relative h-7 w-12 rounded-full p-1 transition-all duration-300 ${present ? 'bg-emerald-500' : 'bg-stone-300'}`}
        >
          <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ${present ? 'translate-x-5' : ''}`} />
        </button>
      </div>
    </label>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
const teacherSubjectsPageSize = 6

function getErrorStatusCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('statusCode' in error)) return null
  const statusCode = Number((error as { statusCode?: unknown }).statusCode)
  return Number.isFinite(statusCode) ? statusCode : null
}

export function TeacherSubjectsView({ model }: { model: RolePortalScreenModel }) {
  const [selectedSubjectEvaluationId, setSelectedSubjectEvaluationId] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')
  const [debouncedSubjectSearch, setDebouncedSubjectSearch] = useState('')
  const [subjectPage, setSubjectPage] = useState(1)
  const [subjectCardsPage, setSubjectCardsPage] = useState<TeacherSubjectCardsPagePayload | null>(null)
  const [isSubjectCardsLoading, setIsSubjectCardsLoading] = useState(false)
  const [subjectCardsError, setSubjectCardsError] = useState<string | null>(null)
  const [isEvaluationsDataLoading, setIsEvaluationsDataLoading] = useState(false)
  const [evaluationsDataError, setEvaluationsDataError] = useState<string | null>(null)

  const {
    section, profile, currentUser, currentRole, schoolsData, evaluationsData,
    onCreateRoomReservation, onCreateLessonRecord, onLoadTeacherSubjectCardsPage, onLoadEvaluationsData, schools, classes, students,
    teachers, guardians, selectedClassId, setSelectedClassId, selectedStudentId,
    setSelectedStudentId, activeSubject, setActiveSubject, subjectModal, setSubjectModal,
    createdLessonRecords, setCreatedLessonRecords, lessonHistoryPage, setLessonHistoryPage,
    subjectHistoryPage, setSubjectHistoryPage, reservations, setReservations,
    selectedReservation, setSelectedReservation, lessonRecordStep, setLessonRecordStep,
    lessonError, setLessonError, lessonFieldErrors, setLessonFieldErrors,
    isSavingLesson, setIsSavingLesson, isSavingReservation, setIsSavingReservation,
    reservationError, setReservationError, reservationFieldErrors, setReservationFieldErrors,
    attendance, setAttendance, savedAttendance, setSavedAttendance,
    attendanceDirtyKeys, setAttendanceDirtyKeys, lessonDraft, setLessonDraft,
    reservationDraft, setReservationDraft, linkedTeacher, teacherClasses,
    visibleTeacherClasses, activeSubjectClasses, lessonRecords, classScope,
    selectedClass, selectedStudent, selectedClassStudents, averageScore,
    averageAttendance, lowAttendanceStudents, lowScoreStudents, subjectCards,
    modalCard, sortedSubjectHistoryRecords, subjectHistoryTotalPages,
    safeSubjectHistoryPage, subjectHistoryStartIndex, subjectHistoryEndIndex,
    visibleSubjectHistoryRecords, modalClasses, modalSelectedClass,
    modalSelectedStudents, lessonClass, lessonTimeOptions, lessonAttendanceStudents,
    lessonAttendanceKeys, lessonAttendanceHasChanges, modalAttendanceKeys,
    modalAttendanceHasChanges, lessonPresentCount, lessonDetailsReady,
    sortedLessonRecords, lessonHistoryTotalPages, safeLessonHistoryPage,
    lessonHistoryStartIndex, lessonHistoryEndIndex, visibleLessonHistoryRecords,
    reservationEndTimeOptions, getSchoolName, getClassName, getClassRoom,
    getReservationSchoolName, clearLessonFieldError, clearReservationFieldError,
    updateLessonDraftField, updateReservationDraftField, updateAttendance,
    commitAttendanceChanges, openLessonRecord, openAttendanceList,
    getLessonValidationMessage, handleGoToLessonAttendance, handleSaveLesson,
    handleSaveReservation, handleReservationStartTimeChange, lessonHistoryPageSize,
    reservationStartTimeOptions, today, formatReservationDate, formatReservationTime,
    getLessonAttendanceKey, getFirstLessonTimeForClass, compareLessonRecordsByNewest,
    reservationFieldClass, reservationLabelClass, reservationInputClass,
    reservationSelectClass,
  } = model

  const modalCardIndex = subjectCards.findIndex(
    card => subjectModal && normalizeAcademicText(card.subject) === normalizeAcademicText(subjectModal.subject),
  )
  const modalIconStyle = getSubjectIconBg(modalCardIndex >= 0 ? modalCardIndex : 0)
  const subjectLessonCount = (subjectCards ?? []).reduce(
  (total, card) => total + card.lessons.length, 0
)
  const localFilteredSubjectCards = useMemo(() => {
    const query = normalizeAcademicText(debouncedSubjectSearch)
    if (!query) return subjectCards

    return subjectCards.filter((card) => {
      const subjectKey = normalizeAcademicText(card.subject)
      if (subjectKey.includes(query)) return true

      const haystack = normalizeAcademicText([
        ...card.classes.flatMap((classRoom) => [
          classRoom.name,
          formatClassGrade(classRoom.grade),
          classRoom.shift,
          classRoom.schedule,
        ]),
        ...card.lessons.flatMap((lesson) => [
          lesson.subject,
          lesson.date,
          lesson.time,
          lesson.content,
          lesson.plan,
          lesson.resources,
          lesson.activity,
          lesson.notes,
        ]),
      ].filter(Boolean).join(' '))

      return haystack.includes(query)
    })
  }, [debouncedSubjectSearch, subjectCards])
  const localSubjectTotalPages = Math.max(1, Math.ceil(localFilteredSubjectCards.length / teacherSubjectsPageSize))
  const safeLocalSubjectPage = Math.min(Math.max(1, subjectPage), localSubjectTotalPages)
  const localSubjectStartIndex = (safeLocalSubjectPage - 1) * teacherSubjectsPageSize
  const localSubjectPagination = {
    page: safeLocalSubjectPage,
    limit: teacherSubjectsPageSize,
    total: localFilteredSubjectCards.length,
    totalPages: localSubjectTotalPages,
  }
  const localSubjectCardsPage = {
  subjectCards: (localFilteredSubjectCards ?? []).slice(
    localSubjectStartIndex,
    localSubjectStartIndex + teacherSubjectsPageSize
  ),
  pagination: localSubjectPagination,
  totals: {
    subjects: (subjectCards ?? []).length,
    classes: (visibleTeacherClasses ?? []).length,
    lessons: subjectLessonCount,
  },
}
  const canUseBackendSubjectCards = Boolean(onLoadTeacherSubjectCardsPage)
  const backendSubjectCardsIncomplete = Boolean(
  subjectCardsPage && subjectCards.length > (subjectCardsPage.totals?.subjects ?? 0),
)
  const shouldUseBackendSubjectCards = Boolean(
    subjectCardsPage && !subjectCardsError && !backendSubjectCardsIncomplete,
  )
  const activeSubjectCardsPage =
  shouldUseBackendSubjectCards && subjectCardsPage
    ? (subjectCardsPage as typeof localSubjectCardsPage)
    : localSubjectCardsPage

  const visibleSubjectCards = activeSubjectCardsPage.subjectCards
  const subjectPagination = activeSubjectCardsPage.pagination
  const subjectStats = activeSubjectCardsPage.totals
  const subjectPageSource = shouldUseBackendSubjectCards ? 'backend' : 'local'
  const showSubjectSkeletons = canUseBackendSubjectCards && isSubjectCardsLoading && !subjectCardsPage
  const headerStats = [
    { icon: LayoutGrid, iconBg: 'bg-indigo-100', iconCls: 'text-indigo-600', label: 'Total de matérias', value: subjectStats.subjects },
    { icon: Users, iconBg: 'bg-emerald-100', iconCls: 'text-emerald-600', label: 'Turmas vinculadas', value: subjectStats.classes },
    { icon: ClipboardList, iconBg: 'bg-violet-100', iconCls: 'text-violet-600', label: 'Aulas registradas', value: subjectStats.lessons },
  ]

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSubjectSearch(subjectSearch.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [subjectSearch])

  useEffect(() => {
    setSubjectPage(1)
  }, [debouncedSubjectSearch])

  useEffect(() => {
    if (!onLoadTeacherSubjectCardsPage) return

    let active = true
    setIsSubjectCardsLoading(true)
    setSubjectCardsError(null)

    onLoadTeacherSubjectCardsPage({
      page: subjectPage,
      limit: teacherSubjectsPageSize,
      search: debouncedSubjectSearch,
    })
      .then((payload) => {
        if (!active) return
        setSubjectCardsPage(payload)
        if (payload.pagination.page !== subjectPage) setSubjectPage(payload.pagination.page)
      })
      .catch((error) => {
        if (!active) return
        setSubjectCardsPage(null)
        setSubjectCardsError(getErrorStatusCode(error) === 404 ? null : error instanceof Error ? error.message : 'Não foi possível buscar matérias no banco.')
      })
      .finally(() => {
        if (active) setIsSubjectCardsLoading(false)
      })

    return () => { active = false }
  }, [debouncedSubjectSearch, onLoadTeacherSubjectCardsPage, subjectPage])

  useEffect(() => {
    if (canUseBackendSubjectCards) return
    if (subjectPage !== safeLocalSubjectPage) setSubjectPage(safeLocalSubjectPage)
  }, [canUseBackendSubjectCards, safeLocalSubjectPage, subjectPage])

  useEffect(() => {
    if (subjectModal?.type !== 'evaluations') return
    if (evaluationsData?.evaluations) return
    if (!onLoadEvaluationsData) return

    let active = true
    setIsEvaluationsDataLoading(true)
    setEvaluationsDataError(null)

    onLoadEvaluationsData()
      .catch((error) => {
        if (!active) return
        setEvaluationsDataError(error instanceof Error ? error.message : 'Nao foi possivel buscar provas desta materia.')
      })
      .finally(() => {
        if (active) setIsEvaluationsDataLoading(false)
      })

    return () => { active = false }
  }, [evaluationsData?.evaluations, onLoadEvaluationsData, subjectModal?.type])

  const modalEyebrow = !subjectModal ? '' : (
    subjectModal.type === 'classes' ? 'Turmas vinculadas' :
    subjectModal.type === 'history' ? 'Histórico de aulas' :
    subjectModal.type === 'evaluations' ? 'Provas e notas' :
    lessonRecordStep === 'attendance' ? 'Frequência da aula' : 'Registro de aula'
  )

  const subjectEvaluations = useMemo(() => {
    const modalClassIds = new Set(modalClasses.map(c => c.id))
    const curriculumSkills = evaluationsData?.curriculumSkills ?? []
    const subjectText = normalizeAcademicText(getAcademicSubjectLabel(subjectModal?.subject ?? '', curriculumSkills))
    return (evaluationsData?.evaluations ?? []).filter(evaluation => {
      const evaluationSubject = normalizeAcademicText(getAcademicSubjectLabel(evaluation.subject, curriculumSkills))
      const subjectMatches = !subjectText || !evaluationSubject || evaluationSubject.includes(subjectText) || subjectText.includes(evaluationSubject)
      return modalClassIds.has(evaluation.classId) && subjectMatches
    })
  }, [evaluationsData?.curriculumSkills, evaluationsData?.evaluations, modalClasses, subjectModal?.subject])

  const selectedSubjectEvaluation = subjectEvaluations.find(e => e.id === selectedSubjectEvaluationId) ?? subjectEvaluations[0] ?? null
  const selectedSubjectEvaluationClass = selectedSubjectEvaluation ? classes.find(c => c.id === selectedSubjectEvaluation.classId) : null
  const selectedSubjectEvaluationStudents = selectedSubjectEvaluation ? getClassStudents(students, selectedSubjectEvaluation.classId) : []
  const selectedSubjectEvaluationCorrections = (evaluationsData?.evaluationCorrections ?? []).filter(c => c.evaluationId === selectedSubjectEvaluation?.id)
  const correctionByStudentId = new Map(selectedSubjectEvaluationCorrections.map(c => [c.studentId, c]))
  const scoredEvaluationRows = selectedSubjectEvaluationStudents.map(student => {
    const correction = correctionByStudentId.get(student.id)
    const canShowScore = correction && (profile !== 'ALUNO' || correction.status === 'CONFIRMED')
    const score = canShowScore ? correction.finalScore ?? correction.suggestedScore : null
    return { student, correction, score }
  })
  const evaluatedRows = scoredEvaluationRows.filter(row => row.score !== null)
  const selectedSubjectEvaluationAverage = evaluatedRows.length
    ? evaluatedRows.reduce((total, row) => total + Number(row.score ?? 0), 0) / evaluatedRows.length
    : null

  useEffect(() => {
    if (selectedSubjectEvaluationId && subjectEvaluations.some(e => e.id === selectedSubjectEvaluationId)) return
    setSelectedSubjectEvaluationId(subjectEvaluations[0]?.id ?? '')
  }, [selectedSubjectEvaluationId, subjectEvaluations])

  function formatEvaluationScore(value?: number | null) {
    if (value == null || Number.isNaN(Number(value))) return '—'
    return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
  }

  function formatEvaluationDate(value?: string | null) {
    if (!value) return 'Sem data'
    const date = value.includes('T') ? value.slice(0, 10) : value
    return formatReservationDate(date)
  }

  function correctionStatusLabel(status?: string | null) {
    if (status === 'CONFIRMED') return 'Confirmada'
    if (status === 'NEEDS_RETAKE') return 'Reenviar foto'
    if (status === 'REJECTED') return 'Rejeitada'
    if (status === 'SUGGESTED') return 'Sugerida'
    return 'Sem nota'
  }

  /* Tab strip for lesson modal */
  const lessonTabs = subjectModal && modalCard && subjectModal.type !== 'history' && subjectModal.type !== 'evaluations' ? (
    <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-100 p-1">
      {([
        { type: 'classes' as const, icon: Users, label: 'Turmas', iconColor: 'text-sky-500' },
        { type: 'lesson' as const, icon: PenLine, label: 'Registro', iconColor: 'text-indigo-500' },
      ] as const).map(tab => {
        const active = tab.type === 'lesson' ? subjectModal.type === 'lesson' : subjectModal.type === tab.type
        return (
          <button
            key={tab.type}
            type="button"
            onClick={() => {
              if (tab.type === 'lesson') openLessonRecord(modalCard.subject, modalClasses[0]?.id)
              else setSubjectModal({ type: tab.type, subject: modalCard.subject })
            }}
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-[11px] font-semibold transition-all duration-200 font-['DM_Sans'] ${
              active
                ? tab.type === 'lesson'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-sky-500 text-white shadow-sm'
                : 'text-stone-500 hover:bg-white hover:text-stone-800'
            }`}
          >
            <tab.icon className={`h-3.5 w-3.5 ${active ? 'text-white' : tab.iconColor}`} />
            {tab.label}
          </button>
        )
      })}
    </div>
  ) : undefined

  /* ─── input classes ─── */
  const inputCls = "min-h-10 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 font-['DM_Sans']"
  const inputIconCls = "min-h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 font-['DM_Sans']"
  const textareaCls = "min-h-20 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 font-['DM_Sans']"

  return (
    <SectionShell
      label="Professor"
      title="Minhas Matérias"
      description="Matérias vinculadas ao professor, turmas atendidas e histórico de aulas."
      icon={<BookOpen size={20} />}
      headerActions={
        <div className="flex flex-wrap items-center gap-5 divide-x divide-stone-200">
          {headerStats.map((stat, index) => (
            <div key={stat.label} className={`flex items-center gap-2 ${index > 0 ? 'pl-5' : ''}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${stat.iconBg}`}>
                <stat.icon size={13} className={stat.iconCls} />
              </div>
              <div>
                <Eyebrow>{stat.label}</Eyebrow>
                <p className="font-['Lora'] text-base font-bold text-stone-900 leading-none">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      }
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer { to { transform: translateX(200%) } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>

      {/* ── Search and pagination summary ── */}
      <section className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm">
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative min-w-0 flex-1 lg:max-w-xl">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
            <input
              type="text"
              inputMode="search"
              aria-label="Buscar matérias"
              value={subjectSearch}
              onChange={(event) => {
                setSubjectSearch(event.target.value)
                setSubjectPage(1)
              }}
              placeholder="Buscar matéria, turma, conteúdo ou aula"
              className={`${inputIconCls} pr-10`}
            />
            {subjectSearch && (
              <button
                type="button"
                onClick={() => {
                  setSubjectSearch('')
                  setDebouncedSubjectSearch('')
                  setSubjectPage(1)
                }}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>

          {subjectCardsError && (
            <span className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 font-['DM_Sans']">
              {subjectCardsError}
            </span>
          )}
        </div>
      </section>

      {/* ── Subject cards grid ── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {showSubjectSkeletons
          ? Array.from({ length: teacherSubjectsPageSize }, (_, i) => <SubjectCardSkeleton key={i} index={i} />)
          : visibleSubjectCards.map((card, index) => (
            <SubjectCard
              key={card.subject}
              card={card}
              index={index}
              onClasses={() => setSubjectModal({ type: 'classes', subject: card.subject })}
              onHistory={() => setSubjectModal({ type: 'history', subject: card.subject })}
              onLesson={() => openLessonRecord(card.subject, card.classes[0]?.id)}
              onEvaluations={() => setSubjectModal({ type: 'evaluations', subject: card.subject })}
              formatReservationDate={formatReservationDate}
              compareLessonRecordsByNewest={compareLessonRecordsByNewest}
            />
          ))}
        {!showSubjectSkeletons && visibleSubjectCards.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              message={debouncedSubjectSearch ? 'Nenhuma matéria encontrada para esta busca.' : 'Nenhuma matéria vinculada ao professor atual.'}
              icon={<BookOpen size={40} />}
            />
          </div>
        )}
      </section>

      {subjectPagination.total > 0 && (
      <div className="overflow-hidden rounded-2xl border-2 border-stone-200 bg-white shadow-sm">
        <PaginationControls
          label="Matérias"
          pagination={subjectPagination}
          limit={teacherSubjectsPageSize}
          loading={isSubjectCardsLoading}
          source={subjectPageSource}
          pageSizeOptions={[teacherSubjectsPageSize]}
          onPageChange={setSubjectPage}
          onLimitChange={() => setSubjectPage(1)}
        />
      </div>
    )}

      {/* ══ Modal ══ */}
      {subjectModal && modalCard && typeof document !== 'undefined'
        ? createPortal(
          <LightModal
            open
            onClose={() => setSubjectModal(null)}
            title={modalCard.subject}
            eyebrow={modalEyebrow}
            wide={subjectModal.type === 'evaluations'}
            tabs={lessonTabs}
          >

            {/* ── Turmas ── */}
            {subjectModal.type === 'classes' && (
              <div className="grid gap-3">
                {modalClasses.length > 0 && (
                  <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500 text-white">
                      <Users className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-sky-800 font-['DM_Sans']">
                      {modalClasses.length} turma(s) vinculadas a esta matéria
                    </p>
                  </div>
                )}

                {modalClasses.map((classRoom, i) => (
                  <article
                    key={classRoom.id}
                    className="flex items-center gap-4 rounded-xl border border-stone-300 bg-white px-5 py-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                    style={{ animation: 'fadeSlideIn 0.35s ease-out forwards', animationDelay: `${i * 55}ms`, opacity: 0 }}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-semibold text-stone-900 font-['Lora']">{classRoom.name}</strong>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-600 font-['DM_Sans']">
                          <School className="h-3 w-3 text-emerald-500" />
                          {getSchoolName(classRoom.schoolId)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 font-['DM_Sans']">
                          {formatClassGrade(classRoom.grade)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-600 font-['DM_Sans']">
                          <Clock className="h-3 w-3 text-amber-500" />
                          {classRoom.shift}
                        </span>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 font-['DM_Sans']">
                      <Zap className="h-3 w-3 text-emerald-500" />
                      {getClassStudents(students, classRoom.id).length} alunos
                    </span>
                  </article>
                ))}

                {modalClasses.length === 0 && (
                  <EmptyState message="Nenhuma turma vinculada a esta matéria." icon={<Users size={36} />} />
                )}
              </div>
            )}

            {/* ── Paginação do histórico no modal — substitui os botões manuais ── */}
            {sortedSubjectHistoryRecords.length > 0 && (
              <div className="overflow-hidden rounded-xl border-2 border-stone-200 bg-white shadow-sm">
                <PaginationControls
                  label="Aulas"
                  pagination={{
                    page: safeSubjectHistoryPage,
                    limit: lessonHistoryPageSize,
                    total: sortedSubjectHistoryRecords.length,
                    totalPages: subjectHistoryTotalPages,
                  }}
                  limit={lessonHistoryPageSize}
                  loading={false}
                  source="local"
                  pageSizeOptions={[lessonHistoryPageSize]}
                  onPageChange={setSubjectHistoryPage}
                  onLimitChange={() => {}}
                />
              </div>
            )}

            {/* ── Avaliações ── */}
            {subjectModal.type === 'evaluations' && (
              <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                {/* Evaluation list */}
                <div className="grid content-start gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-white">
                      <FileText className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-amber-800 font-['DM_Sans']">
                      {isEvaluationsDataLoading ? 'Carregando provas...' : `${subjectEvaluations.length} prova(s)`}
                    </p>
                  </div>

                  {evaluationsDataError && (
                    <AlertBanner tone="amber" message={evaluationsDataError} />
                  )}

                  {isEvaluationsDataLoading && (
                    <div className="grid gap-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Bone key={index} className="h-20 rounded-xl" />
                      ))}
                    </div>
                  )}

                  {!isEvaluationsDataLoading && subjectEvaluations.map((evaluation, index) => {
                    const active = selectedSubjectEvaluation?.id === evaluation.id
                    const evaluationClass = classes.find(c => c.id === evaluation.classId)
                    return (
                      <button
                        key={evaluation.id}
                        type="button"
                        onClick={() => setSelectedSubjectEvaluationId(evaluation.id)}
                        className={`grid gap-2 rounded-xl border px-4 py-3 text-left shadow-sm transition-all hover:border-amber-300 hover:shadow-md font-['DM_Sans'] ${active ? 'border-amber-400 bg-amber-50' : 'border-stone-300 bg-white'}`}
                        style={{ animation: 'fadeSlideIn 0.3s ease-out forwards', animationDelay: `${index * 40}ms`, opacity: 0 }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <strong className="line-clamp-2 text-sm font-semibold text-stone-900 leading-snug">{evaluation.title}</strong>
                          {active && (
                            <span className="shrink-0 rounded-md bg-amber-500 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                              Selecionada
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                            <GraduationCap className="h-3 w-3 text-violet-500" />
                            {evaluationClass?.name ?? 'Turma não localizada'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                            <Calendar className="h-3 w-3 text-sky-500" />
                            {formatEvaluationDate(evaluation.scheduledAt)}
                          </span>
                        </div>
                      </button>
                    )
                  })}

                  {!isEvaluationsDataLoading && subjectEvaluations.length === 0 && (
                    <EmptyState message="Nenhuma prova encontrada." icon={<FileText size={36} />} />
                  )}
                </div>

                {/* Evaluation detail */}
                <div className="grid content-start gap-4">
                  {selectedSubjectEvaluation ? (
                    <>
                      {/* Metric tiles */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          { label: 'Turma',  value: selectedSubjectEvaluationClass?.name ?? 'Turma', icon: GraduationCap, cls: 'border-stone-300 bg-stone-50', iconCls: 'text-violet-500', textCls: 'text-stone-700' },
                          { label: 'Alunos', value: selectedSubjectEvaluationStudents.length,         icon: Users,         cls: 'border-indigo-200 bg-indigo-50', iconCls: 'text-indigo-500', textCls: 'text-indigo-700' },
                          { label: 'Notas',  value: evaluatedRows.length,                             icon: BadgeCheck,    cls: 'border-emerald-200 bg-emerald-50', iconCls: 'text-emerald-500', textCls: 'text-emerald-700' },
                          { label: 'Média',  value: formatEvaluationScore(selectedSubjectEvaluationAverage), icon: Award, cls: 'border-amber-200 bg-amber-50', iconCls: 'text-amber-500', textCls: 'text-amber-700' },
                        ].map(item => (
                          <div key={item.label} className={`rounded-xl border px-4 py-3 ${item.cls}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <item.icon className={`h-3 w-3 ${item.iconCls}`} />
                              <Eyebrow>{item.label}</Eyebrow>
                            </div>
                            <div className={`truncate text-xl font-bold leading-none font-['Lora'] ${item.textCls}`}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Students table */}
                      <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-100 px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-amber-500" />
                            <Eyebrow>Notas dos alunos</Eyebrow>
                          </div>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 font-['DM_Sans']">
                            {selectedSubjectEvaluation.title}
                          </span>
                        </div>

                        <div className="grid gap-2 p-3">
                          {scoredEvaluationRows.map(({ student, correction, score }) => {
                            const scoreNumber = score == null ? null : Number(score)
                            const scoreColor = scoreNumber == null ? 'text-stone-400' : scoreNumber >= 8 ? 'text-emerald-700' : scoreNumber >= 6 ? 'text-amber-700' : 'text-rose-700'
                            const canShowCorrection = Boolean(correction && (profile !== 'ALUNO' || correction.status === 'CONFIRMED'))
                            return (
                              <article
                                key={student.id}
                                className="grid min-w-0 items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 transition hover:border-amber-200 hover:shadow-sm lg:grid-cols-[minmax(160px,1.4fr)_100px_120px_minmax(100px,1fr)] max-lg:grid-cols-2 max-[560px]:grid-cols-1"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-500">
                                    <UserRound className="h-4 w-4" />
                                  </span>
                                  <div className="min-w-0">
                                    <strong className="block truncate text-sm font-semibold text-stone-900 font-['DM_Sans']">{student.name}</strong>
                                    <span className="block truncate font-mono text-[10px] text-stone-400">
                                      {student.registrationNumber || student.registration || 'Sem matrícula'}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <Eyebrow className="mb-0.5">Nota</Eyebrow>
                                  <p className={`text-xl font-bold leading-none font-['Lora'] ${scoreColor}`}>
                                    {formatEvaluationScore(score)}
                                  </p>
                                </div>

                                <div>
                                  <Eyebrow className="mb-0.5">Status</Eyebrow>
                                  <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-semibold font-['DM_Sans'] ${
                                    canShowCorrection && correction?.status === 'CONFIRMED'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : canShowCorrection
                                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                                        : 'border-stone-200 bg-stone-50 text-stone-500'
                                  }`}>
                                    {correctionStatusLabel(canShowCorrection ? correction?.status : undefined)}
                                  </span>
                                </div>

                                <div>
                                  <Eyebrow className="mb-0.5">Acertos</Eyebrow>
                                  <p className="text-sm font-bold text-stone-700 font-['DM_Sans']">
                                    {canShowCorrection && correction ? `${correction.correctCount}/${correction.totalQuestions}` : '—'}
                                  </p>
                                </div>
                              </article>
                            )
                          })}

                          {scoredEvaluationRows.length === 0 && (
                            <div className="rounded-xl border border-dashed border-stone-300 bg-white py-10 text-center text-sm font-medium text-stone-400 font-['DM_Sans']">
                              Nenhum aluno vinculado à turma desta prova.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <EmptyState message="Selecione uma prova para ver as notas." icon={<FileText size={36} />} />
                  )}
                </div>
              </div>
            )}

            {/* ── Registro de aula ── */}
            {subjectModal.type === 'lesson' && (
              <form onSubmit={handleSaveLesson} className="grid gap-5" noValidate>
                {/* Step indicator */}
                <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-100 p-1">
                  <button
                    type="button"
                    onClick={() => setLessonRecordStep('details')}
                    className={`flex flex-1 min-h-10 items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold transition-all duration-200 font-['DM_Sans'] ${
                      lessonRecordStep === 'details'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-stone-500 hover:bg-white hover:text-stone-800'
                    }`}
                  >
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${lessonRecordStep === 'details' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'}`}>1</span>
                    <PenLine className={`h-3.5 w-3.5 ${lessonRecordStep === 'details' ? 'text-white' : 'text-indigo-400'}`} />
                    Registro
                  </button>
                  <ChevronRight className="h-3.5 w-3.5 text-stone-300 shrink-0" />
                  <button
                    type="button"
                    onClick={handleGoToLessonAttendance}
                    className={`flex flex-1 min-h-10 items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold transition-all duration-200 font-['DM_Sans'] ${
                      lessonRecordStep === 'attendance'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : lessonDetailsReady
                          ? 'border border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'text-stone-500 hover:bg-white hover:text-stone-800'
                    }`}
                  >
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${lessonRecordStep === 'attendance' ? 'bg-white/20' : lessonDetailsReady ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'}`}>2</span>
                    <UserCheck className={`h-3.5 w-3.5 ${lessonRecordStep === 'attendance' ? 'text-white' : 'text-emerald-500'}`} />
                    Frequência
                  </button>
                </div>

                {lessonError && <AlertBanner tone="rose" message={lessonError} />}

                {lessonRecordStep === 'details' ? (
                  <>
                    {/* Turma / Data / Horário */}
                    <div className="grid items-start gap-4 md:grid-cols-[minmax(160px,1fr)_140px_140px]">

                      <Field label="Turma" icon={GraduationCap} iconColor="text-violet-500" error={lessonFieldErrors.classId} hint="Turma que recebeu a aula.">
                        <CompactSelect
                          value={lessonDraft.classId}
                          options={classOptions(modalClasses)}
                          onChange={classId => {
                            const nextClassRoom = classes.find(c => c.id === classId)
                            setSelectedClassId(classId)
                            clearLessonFieldError('classId')
                            clearLessonFieldError('time')
                            setLessonDraft({ ...lessonDraft, classId, time: getFirstLessonTimeForClass(nextClassRoom) })
                          }}
                          ariaLabel="Turma"
                          error={lessonFieldErrors.classId}
                          className={`${inputCls} ${fieldStateClass(lessonFieldErrors.classId)}`}
                          dropdownWidth="trigger"
                        />
                      </Field>

                      <Field label="Data" icon={CalendarDays} iconColor="text-sky-500" error={lessonFieldErrors.date} hint="Data real da aula.">
                        <DateInput
                          value={lessonDraft.date}
                          onChange={e => updateLessonDraftField('date', e.target.value)}
                          error={lessonFieldErrors.date}
                          className={`${inputCls} ${fieldStateClass(lessonFieldErrors.date)}`}
                        />
                      </Field>

                      <Field label="Horário" icon={Clock} iconColor="text-amber-500" error={lessonFieldErrors.time} hint="Horário da turma.">
                        <CompactSelect
                          value={lessonDraft.time}
                          options={lessonTimeOptions}
                          onChange={time => updateLessonDraftField('time', time)}
                          ariaLabel="Horário da aula"
                          error={lessonFieldErrors.time}
                          className={`${inputCls} ${fieldStateClass(lessonFieldErrors.time)}`}
                          dropdownWidth="trigger"
                        />
                      </Field>
                    </div>

                    {/* Textareas */}
                    {([
                      ['content',   'Conteúdo ministrado',          FileText,    'text-indigo-500', true],
                      ['plan',      'Plano de aula',                  Target,      'text-violet-500', true],
                      ['resources', 'Recursos utilizados',            Layers,      'text-sky-500',    true],
                      ['activity',  'Atividade realizada',            Flame,       'text-orange-500', true],
                      ['notes',     'Observações do professor',       AlertCircle, 'text-amber-500',  false],
                    ] as [keyof typeof lessonDraft, string, any, string, boolean][]).map(([key, label, Icon, iconCls, req]) => (
                      <Field
                        key={key}
                        label={label}
                        icon={Icon}
                        iconColor={iconCls}
                        error={lessonFieldErrors[key as keyof typeof lessonFieldErrors]}
                        hint={key === 'notes' ? 'Opcional: alertas ou observações pedagógicas.' : `Digite ${label.toLowerCase()} da aula.`}
                        required={req}
                      >
                        <textarea
                          className={`${textareaCls} ${fieldStateClass(lessonFieldErrors[key as keyof typeof lessonFieldErrors])}`}
                          value={lessonDraft[key] as string}
                          onChange={e => updateLessonDraftField(key, e.target.value)}
                          placeholder={label}
                          required={req}
                        />
                      </Field>
                    ))}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleGoToLessonAttendance}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-500 bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md active:scale-95 font-['DM_Sans']"
                      >
                        <UserCheck className="h-4 w-4" />
                        Continuar para frequência
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid gap-4">
                    {/* Lesson summary */}
                    <div className="grid gap-4 rounded-xl border border-stone-300 bg-white p-5 shadow-sm sm:grid-cols-3">
                      {[
                        { label: 'Turma',   value: getClassName(lessonDraft.classId),      icon: GraduationCap, cls: 'text-violet-500' },
                        { label: 'Data',    value: formatReservationDate(lessonDraft.date), icon: CalendarDays,  cls: 'text-sky-500' },
                        { label: 'Horário', value: lessonDraft.time || 'Não informado',     icon: Clock,         cls: 'text-amber-500' },
                      ].map(s => (
                        <div key={s.label}>
                          <Eyebrow className="mb-1">{s.label}</Eyebrow>
                          <strong className="flex items-center gap-1.5 text-sm font-semibold text-stone-900 font-['DM_Sans']">
                            <s.icon className={`h-3.5 w-3.5 shrink-0 ${s.cls}`} />
                            {s.value}
                          </strong>
                        </div>
                      ))}
                    </div>

                    {/* Attendance counter */}
                    {lessonAttendanceStudents.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-5 py-3">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 font-['DM_Sans']">
                          <Users className="h-4 w-4 text-indigo-400" />
                          {lessonAttendanceStudents.length} aluno(s)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 font-['DM_Sans']">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            {lessonPresentCount} presentes
                          </span>
                          <span className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 font-['DM_Sans']">
                            <X className="h-3.5 w-3.5 text-rose-500" />
                            {lessonAttendanceStudents.length - lessonPresentCount} faltas
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Students */}
                    <div className="grid gap-2">
                      {lessonAttendanceStudents.map((student, i) => {
                        const key = getLessonAttendanceKey(lessonDraft, student.id)
                        return (
                          <AttendanceRow
                            key={student.id}
                            student={student}
                            present={attendance[key] ?? true}
                            onToggle={() => updateAttendance(key, !(attendance[key] ?? true))}
                            animDelay={i * 35}
                          />
                        )
                      })}
                      {lessonAttendanceStudents.length === 0 && (
                        <EmptyState message="Nenhum aluno vinculado a esta turma." icon={<Users size={36} />} />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setLessonRecordStep('details')}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 font-['DM_Sans']"
                      >
                        <ChevronLeft className="h-4 w-4 text-indigo-400" /> Voltar ao registro
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingLesson || (!lessonDetailsReady && !lessonAttendanceHasChanges)}
                        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-indigo-500 bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto font-['DM_Sans']"
                      >
                        <Save className="h-4 w-4" />
                        {isSavingLesson ? 'Salvando…' : lessonDetailsReady ? 'Salvar registro e frequência' : 'Salvar frequência'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* ── Attendance standalone ── */}
            {subjectModal.type !== 'classes' && subjectModal.type !== 'history' && subjectModal.type !== 'evaluations' && subjectModal.type !== 'lesson' && (
              <div className="grid gap-4">
                <CompactSelect
                  value={modalSelectedClass?.id ?? ''}
                  options={classOptions(modalClasses)}
                  onChange={setSelectedClassId}
                  className={inputCls}
                  dropdownWidth="trigger"
                />
                {modalSelectedStudents.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-5 py-3">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 font-['DM_Sans']">
                      <Users className="h-4 w-4 text-indigo-400" />
                      {modalSelectedStudents.length} aluno(s)
                    </span>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 font-['DM_Sans']">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        {modalSelectedStudents.filter(s => attendance[`${modalSelectedClass?.id}:${s.id}`] ?? true).length} presentes
                      </span>
                      <span className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 font-['DM_Sans']">
                        <X className="h-3.5 w-3.5 text-rose-500" />
                        {modalSelectedStudents.filter(s => !(attendance[`${modalSelectedClass?.id}:${s.id}`] ?? true)).length} faltas
                      </span>
                    </div>
                  </div>
                )}
                <div className="grid gap-2">
                  {modalSelectedStudents.map((student, i) => {
                    const key = `${modalSelectedClass?.id}:${student.id}`
                    return (
                      <AttendanceRow
                        key={student.id}
                        student={student}
                        present={attendance[key] ?? true}
                        onToggle={() => updateAttendance(key, !(attendance[key] ?? true))}
                        animDelay={i * 35}
                      />
                    )
                  })}
                  {modalSelectedStudents.length === 0 && (
                    <EmptyState message="Nenhum aluno vinculado a esta turma." icon={<Users size={36} />} />
                  )}
                </div>
                {modalSelectedStudents.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => commitAttendanceChanges(modalAttendanceKeys)}
                      disabled={!modalAttendanceHasChanges}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-500 bg-emerald-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 font-['DM_Sans']"
                    >
                      <Save className="h-4 w-4" />
                      Salvar frequência
                    </button>
                  </div>
                )}
              </div>
            )}
          </LightModal>,
          document.body,
        )
        : null}
    </SectionShell>
  )
}
