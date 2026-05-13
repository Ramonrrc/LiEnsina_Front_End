import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
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
  getSubjectIcon,
  getSubjectIconBg,
  normalizeAcademicText,
  getClassStudents,
  getSubjectAccent,
} from '../../components/role-portal/portal-components'
import type { RolePortalScreenModel } from './screen-model'

// Skeleton com ícones para loading states
function SubjectCardSkeleton({ index }: { index: number }) {
  return (
    <article 
      className="animate-pulse relative flex flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-200 to-violet-200" />
      <div className="flex flex-1 flex-col gap-4 p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100">
              <BookOpen size={20} className="text-slate-300" />
            </div>
            <div className="space-y-2">
              <div className="h-2.5 w-16 rounded-full bg-slate-200" />
              <div className="h-4 w-32 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="h-6 w-14 rounded-full bg-slate-100" />
        </div>
        
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-300" />
            <div className="space-y-1">
              <div className="h-2 w-10 rounded-full bg-slate-200" />
              <div className="h-3 w-6 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-slate-300" />
            <div className="space-y-1">
              <div className="h-2 w-10 rounded-full bg-slate-200" />
              <div className="h-3 w-6 rounded-full bg-slate-200" />
            </div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-slate-300" />
            <div className="space-y-1">
              <div className="h-2 w-16 rounded-full bg-slate-200" />
              <div className="h-3 w-12 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
              <GraduationCap size={12} className="text-slate-300" />
              <div className="h-3 w-12 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
          <div className="h-10 rounded-xl bg-slate-100" />
          <div className="h-10 rounded-xl bg-slate-100" />
          <div className="col-span-2 h-11 rounded-xl bg-indigo-100" />
          <div className="col-span-2 h-10 rounded-xl bg-slate-100" />
        </div>
      </div>
    </article>
  )
}

function ClassItemSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="animate-pulse flex items-center gap-4 rounded-xl border border-slate-300 bg-white px-4 py-4"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-100">
        <GraduationCap size={18} className="text-indigo-300" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-32 rounded-full bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="h-5 w-24 rounded-md bg-slate-100" />
          <div className="h-5 w-16 rounded-md bg-indigo-100" />
          <div className="h-5 w-20 rounded-md bg-slate-100" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
        <Zap size={12} className="text-emerald-400" />
        <div className="h-3 w-12 rounded-full bg-emerald-200" />
      </div>
    </div>
  )
}

function StudentItemSkeleton({ index }: { index: number }) {
  return (
    <div 
      className="animate-pulse flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100">
          <UserRound size={16} className="text-slate-300" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded-full bg-slate-200" />
          <div className="h-3 w-20 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-3 w-14 rounded-full bg-slate-200" />
        <div className="h-7 w-12 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}

function LessonHistorySkeleton({ index }: { index: number }) {
  return (
    <div 
      className="animate-pulse overflow-hidden rounded-xl border border-slate-300 bg-white"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <GraduationCap size={14} className="text-indigo-300" />
          <div className="h-4 w-24 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
          <Clock size={12} className="text-slate-300" />
          <div className="h-3 w-20 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex items-start gap-2">
          <FileText size={14} className="mt-0.5 text-indigo-300" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-full rounded-full bg-slate-200" />
            <div className="h-3 w-3/4 rounded-full bg-slate-200" />
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Target size={12} className="mt-0.5 text-slate-300" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 w-full rounded-full bg-slate-200" />
              <div className="h-2.5 w-1/2 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TeacherSubjectsView({ model }: { model: RolePortalScreenModel }) {
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const {
    section,
    profile,
    currentUser,
    currentRole,
    schoolsData,
    evaluationsData,
    onCreateRoomReservation,
    onCreateLessonRecord,
    schools,
    classes,
    students,
    teachers,
    guardians,
    selectedClassId,
    setSelectedClassId,
    selectedStudentId,
    setSelectedStudentId,
    activeSubject,
    setActiveSubject,
    subjectModal,
    setSubjectModal,
    createdLessonRecords,
    setCreatedLessonRecords,
    lessonHistoryPage,
    setLessonHistoryPage,
    subjectHistoryPage,
    setSubjectHistoryPage,
    reservations,
    setReservations,
    selectedReservation,
    setSelectedReservation,
    lessonRecordStep,
    setLessonRecordStep,
    lessonError,
    setLessonError,
    lessonFieldErrors,
    setLessonFieldErrors,
    isSavingLesson,
    setIsSavingLesson,
    isSavingReservation,
    setIsSavingReservation,
    reservationError,
    setReservationError,
    reservationFieldErrors,
    setReservationFieldErrors,
    attendance,
    setAttendance,
    savedAttendance,
    setSavedAttendance,
    attendanceDirtyKeys,
    setAttendanceDirtyKeys,
    lessonDraft,
    setLessonDraft,
    reservationDraft,
    setReservationDraft,
    linkedTeacher,
    teacherClasses,
    visibleTeacherClasses,
    activeSubjectClasses,
    lessonRecords,
    classScope,
    selectedClass,
    selectedStudent,
    selectedClassStudents,
    averageScore,
    averageAttendance,
    lowAttendanceStudents,
    lowScoreStudents,
    subjectCards,
    modalCard,
    sortedSubjectHistoryRecords,
    subjectHistoryTotalPages,
    safeSubjectHistoryPage,
    subjectHistoryStartIndex,
    subjectHistoryEndIndex,
    visibleSubjectHistoryRecords,
    modalClasses,
    modalSelectedClass,
    modalSelectedStudents,
    lessonClass,
    lessonTimeOptions,
    lessonAttendanceStudents,
    lessonAttendanceKeys,
    lessonAttendanceHasChanges,
    modalAttendanceKeys,
    modalAttendanceHasChanges,
    lessonPresentCount,
    lessonDetailsReady,
    sortedLessonRecords,
    lessonHistoryTotalPages,
    safeLessonHistoryPage,
    lessonHistoryStartIndex,
    lessonHistoryEndIndex,
    visibleLessonHistoryRecords,
    reservationEndTimeOptions,
    getSchoolName,
    getClassName,
    getClassRoom,
    getReservationSchoolName,
    clearLessonFieldError,
    clearReservationFieldError,
    updateLessonDraftField,
    updateReservationDraftField,
    updateAttendance,
    commitAttendanceChanges,
    openLessonRecord,
    openAttendanceList,
    getLessonValidationMessage,
    handleGoToLessonAttendance,
    handleSaveLesson,
    handleSaveReservation,
    handleReservationStartTimeChange,
    lessonHistoryPageSize,
    reservationStartTimeOptions,
    today,
    formatReservationDate,
    formatReservationTime,
    getLessonAttendanceKey,
    getFirstLessonTimeForClass,
    compareLessonRecordsByNewest,
    reservationFieldClass,
    reservationLabelClass,
    reservationInputClass,
    reservationSelectClass,
  } = model

  const modalCardIndex = subjectCards.findIndex(
    (card) => subjectModal && normalizeAcademicText(card.subject) === normalizeAcademicText(subjectModal.subject),
  )
  const modalAccent = getSubjectAccent(modalCardIndex >= 0 ? modalCardIndex : 0)
  const modalIconStyle = getSubjectIconBg(modalCardIndex >= 0 ? modalCardIndex : 0)
  const subjectLessonCount = subjectCards.reduce((total, card) => total + card.lessons.length, 0)

  // Cores vibrantes para diferentes tipos de modal
  const getModalAccentColor = () => {
    if (!subjectModal) return { bg: 'bg-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-600' }
    switch (subjectModal.type) {
      case 'classes':
        return { bg: 'bg-sky-500', light: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-600' }
      case 'history':
        return { bg: 'bg-violet-500', light: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-600' }
      case 'lesson':
        return lessonRecordStep === 'attendance' 
          ? { bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-600' }
          : { bg: 'bg-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-600' }
      case 'attendance':
        return { bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-600' }
      default:
        return { bg: 'bg-indigo-500', light: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-600' }
    }
  }

  const modalColors = getModalAccentColor()

  return (
    <SectionShell
      label="Professor"
      title="Minhas Matérias"
      description="Matérias vinculadas ao professor, turmas atendidas e histórico de aulas."
      icon={<BookOpen size={20} />}
    >
      {/* Stats Banner com animação de entrada */}
      <div 
        className={`flex flex-wrap items-center gap-4 rounded-2xl border border-slate-400 bg-gradient-to-r from-white via-slate-50/50 to-white px-6 py-4 shadow-sm transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
            <LayoutGrid size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total de matérias</p>
            <strong className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">{subjectCards.length}</strong>
          </div>
        </div>
        <div className="mx-2 hidden h-10 w-px bg-slate-300 sm:block" />
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Users size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Turmas vinculadas</p>
            <strong className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">{visibleTeacherClasses.length}</strong>
          </div>
        </div>
        <div className="mx-2 hidden h-10 w-px bg-slate-300 sm:block" />
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-200">
            <ClipboardList size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Aulas registradas</p>
            <strong className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">{subjectLessonCount}</strong>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Ativo</span>
        </div>
      </div>

      {/* Grid de Cards de Matérias */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          [0, 1, 2].map((i) => <SubjectCardSkeleton key={i} index={i} />)
        ) : (
          subjectCards.map((card, index) => {
            const iconStyle = getSubjectIconBg(index)
            const lastLesson = card.lessons.length
              ? [...card.lessons].sort(compareLessonRecordsByNewest)[0]
              : null

            return (
              <article
                key={card.subject}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm transition-all duration-300 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50 hover:-translate-y-1"
                style={{ 
                  animationDelay: `${index * 80}ms`,
                  animation: 'fadeSlideUp 0.5s ease-out forwards',
                  opacity: 0,
                  transform: 'translateY(20px)'
                }}
              >
                {/* Barra lateral colorida com gradiente */}
                <div className={`absolute left-0 top-0 h-full w-1 ${modalAccent.strip} transition-all duration-300 group-hover:w-1.5`} />
                
                {/* Efeito de brilho no hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-indigo-50/0 transition-all duration-500 group-hover:from-indigo-50/30 group-hover:via-white/0 group-hover:to-violet-50/20" />

                <div className="relative flex flex-1 flex-col gap-4 p-5 pl-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${iconStyle.bg} ${iconStyle.text} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                        {getSubjectIcon(card.subject)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Matéria
                        </p>
                        <h2 className="mt-0.5 truncate font-['Sora',system-ui,sans-serif] text-base font-black leading-tight text-slate-900">
                          {card.subject}
                        </h2>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-400 bg-gradient-to-r from-emerald-50 to-emerald-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 shadow-sm">
                      Ativa
                    </span>
                  </div>

                  {/* Stats compactos com bordas mais visíveis */}
                  <div className="flex items-center gap-4 rounded-xl border border-slate-400 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100">
                        <Users size={13} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Turmas</p>
                        <strong className="text-sm font-black text-slate-900">{card.classes.length}</strong>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-slate-300" />
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100">
                        <ClipboardList size={13} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Aulas</p>
                        <strong className="text-sm font-black text-slate-900">{card.lessons.length}</strong>
                      </div>
                    </div>
                    {lastLesson && (
                      <>
                        <div className="h-8 w-px bg-slate-300" />
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-100">
                            <Clock size={13} className="text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Última</p>
                            <strong className="block truncate text-xs font-black text-slate-700">
                              {formatReservationDate(lastLesson.date)}
                            </strong>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tags de turmas com visual melhorado */}
                  {card.classes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {card.classes.slice(0, 3).map((classRoom) => (
                        <span
                          key={classRoom.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600 shadow-sm transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <GraduationCap size={11} />
                          {classRoom.name}
                        </span>
                      ))}
                      {card.classes.length > 3 && (
                        <span className="inline-flex items-center rounded-lg border border-slate-400 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black text-slate-500">
                          +{card.classes.length - 3} mais
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botões de ação com visual aprimorado */}
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSubjectModal({ type: 'classes', subject: card.subject })}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-slate-400 bg-white px-3 text-[11px] font-black text-slate-600 transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 hover:shadow-sm active:scale-[0.98]"
                    >
                      <Users size={14} />
                      Ver Turmas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubjectModal({ type: 'history', subject: card.subject })}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-slate-400 bg-white px-3 text-[11px] font-black text-slate-600 transition-all hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 hover:shadow-sm active:scale-[0.98]"
                    >
                      <CalendarDays size={14} />
                      Histórico
                    </button>
                    <button
                      type="button"
                      onClick={() => openLessonRecord(card.subject, card.classes[0]?.id)}
                      className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-indigo-500 bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 text-[11px] font-black text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-600 hover:to-indigo-700 hover:shadow-xl hover:shadow-indigo-300 active:scale-[0.98]"
                    >
                      <PenLine size={14} />
                      Registrar Nova Aula
                      <ArrowRight size={13} className="ml-auto opacity-80" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubjectModal({ type: 'attendance', subject: card.subject })}
                      className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-slate-400 bg-white px-3 text-[11px] font-black text-slate-600 transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm active:scale-[0.98]"
                    >
                      <UserCheck size={14} />
                      Lista de Frequência
                    </button>
                  </div>
                </div>
              </article>
            )
          })
        )}
        {!isLoading && subjectCards.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              message="Nenhuma matéria vinculada ao professor atual."
              icon={<BookOpen size={40} />}
            />
          </div>
        )}
      </section>

      {/* Modal em tema claro */}
      {subjectModal && modalCard && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="presentation"
              onMouseDown={() => setSubjectModal(null)}
              className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-900/40 px-4 py-6 backdrop-blur-sm sm:items-center"
              style={{ animation: 'fadeIn 0.2s ease-out' }}
            >
              <div className="flex w-full items-end justify-center sm:items-center">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="teacher-subject-modal-title"
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-2xl"
                  style={{ animation: 'scaleIn 0.3s ease-out' }}
                >
                  {/* Header em tema claro */}
                  <div className={`relative shrink-0 overflow-hidden border-b border-slate-300 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-5`}>
                    {/* Barra de acento colorida no topo */}
                    <div className={`absolute left-0 top-0 h-1 w-full ${modalColors.bg}`} />
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${modalIconStyle.bg} ${modalIconStyle.text} shadow-lg`}>
                          {getSubjectIcon(modalCard.subject)}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${modalColors.text}`}>
                            {subjectModal.type === 'classes'
                              ? 'Turmas vinculadas'
                              : subjectModal.type === 'history'
                                ? 'Histórico de aulas'
                                : subjectModal.type === 'lesson'
                                  ? lessonRecordStep === 'attendance'
                                    ? 'Frequência da aula'
                                    : 'Registro de aula'
                                  : 'Lista de frequência'}
                          </p>
                          <h2
                            id="teacher-subject-modal-title"
                            className="truncate font-['Sora',system-ui,sans-serif] text-lg font-black text-slate-900"
                          >
                            {modalCard.subject}
                          </h2>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <div className="hidden items-center gap-2 sm:flex">
                          <span className="flex items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-[10px] font-black text-slate-600 shadow-sm">
                            <Users size={12} className="text-indigo-500" />
                            {modalCard.classes.length} turmas
                          </span>
                          <span className="flex items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-[10px] font-black text-slate-600 shadow-sm">
                            <ClipboardList size={12} className="text-violet-500" />
                            {modalCard.lessons.length} aulas
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSubjectModal(null)}
                          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-400 bg-white text-slate-500 shadow-sm transition-all hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Fechar modal"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Tabs de navegação em tema claro */}
                    <div className="mt-5 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-300 bg-slate-100 p-1.5">
                      {([
                        { type: 'classes' as const, icon: <Users size={14} />, label: 'Turmas', color: 'sky' },
                        { type: 'history' as const, icon: <CalendarDays size={14} />, label: 'Histórico', color: 'violet' },
                        { type: 'lesson' as const, icon: <PenLine size={14} />, label: 'Registro', color: 'indigo' },
                        { type: 'attendance' as const, icon: <UserCheck size={14} />, label: 'Frequência', color: 'emerald' },
                      ] as const).map((tab) => {
                        const active =
                          tab.type === 'lesson'
                            ? subjectModal.type === 'lesson' && lessonRecordStep === 'details'
                            : tab.type === 'attendance'
                              ? subjectModal.type === 'attendance' || (subjectModal.type === 'lesson' && lessonRecordStep === 'attendance')
                              : subjectModal.type === tab.type

                        const colorStyles = {
                          sky: active ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'text-slate-500 hover:bg-white hover:text-sky-600',
                          violet: active ? 'bg-violet-500 text-white shadow-lg shadow-violet-200' : 'text-slate-500 hover:bg-white hover:text-violet-600',
                          indigo: active ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-white hover:text-indigo-600',
                          emerald: active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-500 hover:bg-white hover:text-emerald-600',
                        }

                        return (
                          <button
                            key={tab.type}
                            type="button"
                            onClick={() => {
                              if (tab.type === 'lesson') {
                                openLessonRecord(modalCard.subject, modalClasses[0]?.id)
                              } else if (tab.type === 'attendance') {
                                setSubjectModal({ type: 'attendance', subject: modalCard.subject })
                              } else {
                                setSubjectModal({ type: tab.type, subject: modalCard.subject })
                              }
                            }}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-[11px] font-black transition-all duration-200 ${colorStyles[tab.color]}`}
                          >
                            {tab.icon}
                            {tab.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Conteúdo do modal em tema claro */}
                  <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-5">
                    {subjectModal.type === 'classes' ? (
                      <div className="grid gap-4">
                        {modalClasses.length > 0 && (
                          <div className="flex items-center gap-3 rounded-xl border border-sky-400 bg-gradient-to-r from-sky-50 to-sky-100/50 px-4 py-3 shadow-sm">
                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500 text-white shadow-lg shadow-sky-200">
                              <Users size={16} />
                            </div>
                            <p className="text-sm font-black text-sky-700">
                              {modalClasses.length} turma(s) vinculadas a esta matéria
                            </p>
                          </div>
                        )}
                        {modalClasses.map((classRoom, i) => (
                          <article
                            key={classRoom.id}
                            className="flex items-center gap-4 rounded-xl border border-slate-400 bg-white px-5 py-4 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md"
                            style={{ 
                              animation: 'fadeSlideIn 0.4s ease-out forwards',
                              animationDelay: `${i * 60}ms`,
                              opacity: 0
                            }}
                          >
                            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
                              <GraduationCap size={20} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <strong className="block truncate font-['Sora',system-ui,sans-serif] text-base font-black text-slate-900">
                                {classRoom.name}
                              </strong>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-400 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
                                  <School size={11} />
                                  {getSchoolName(classRoom.schoolId)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400 bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-700">
                                  <Star size={11} />
                                  {formatClassGrade(classRoom.grade)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-400 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-600">
                                  <Clock size={11} />
                                  {classRoom.shift}
                                </span>
                              </div>
                            </div>
                            <span className="flex shrink-0 items-center gap-2 rounded-xl border border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100 px-3 py-2 text-[11px] font-black text-emerald-700 shadow-sm">
                              <Zap size={13} className="text-emerald-500" />
                              {getClassStudents(students, classRoom.id).length} alunos
                            </span>
                          </article>
                        ))}
                        {modalClasses.length === 0 && (
                          <EmptyState
                            message="Nenhuma turma vinculada a esta matéria."
                            icon={<Users size={36} />}
                          />
                        )}
                      </div>
                    ) : subjectModal.type === 'history' ? (
                      <div className="grid gap-4">
                        {sortedSubjectHistoryRecords.length > 0 && (
                          <div className="flex items-center gap-3 rounded-xl border border-violet-400 bg-gradient-to-r from-violet-50 to-violet-100/50 px-4 py-3 shadow-sm">
                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500 text-white shadow-lg shadow-violet-200">
                              <BarChart2 size={16} />
                            </div>
                            <p className="text-sm font-black text-violet-700">
                              {sortedSubjectHistoryRecords.length} aula(s) registrada(s) nesta matéria
                            </p>
                          </div>
                        )}
                        {visibleSubjectHistoryRecords.map((record, i) => (
                          <article
                            key={record.id}
                            className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm transition-all hover:border-violet-400 hover:shadow-md"
                            style={{ 
                              animation: 'fadeSlideIn 0.4s ease-out forwards',
                              animationDelay: `${i * 60}ms`,
                              opacity: 0
                            }}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                              <strong className="flex items-center gap-2 text-sm font-black text-slate-900">
                                <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100">
                                  <GraduationCap size={14} className="text-indigo-600" />
                                </span>
                                {getClassName(record.classId)}
                              </strong>
                              <span className="flex items-center gap-2 rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-[10px] font-black text-slate-600 shadow-sm">
                                <Clock size={12} className="text-violet-500" />
                                {formatReservationDate(record.date)} • {record.time}
                              </span>
                            </div>
                            <div className="grid gap-3 p-4">
                              <div className="flex items-start gap-3">
                                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-100">
                                  <FileText size={14} className="text-indigo-600" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700 leading-relaxed">{record.content}</p>
                              </div>
                              <div className="grid gap-2">
                                {record.plan && (
                                  <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
                                    <Target size={14} className="mt-0.5 shrink-0 text-slate-500" />
                                    <span className="text-xs font-semibold text-slate-600">
                                      <strong className="text-slate-700">Plano:</strong> {record.plan}
                                    </span>
                                  </div>
                                )}
                                {record.resources && (
                                  <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
                                    <Layers size={14} className="mt-0.5 shrink-0 text-slate-500" />
                                    <span className="text-xs font-semibold text-slate-600">
                                      <strong className="text-slate-700">Recursos:</strong> {record.resources}
                                    </span>
                                  </div>
                                )}
                                {record.activity && (
                                  <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
                                    <Flame size={14} className="mt-0.5 shrink-0 text-orange-500" />
                                    <span className="text-xs font-semibold text-slate-600">
                                      <strong className="text-slate-700">Atividade:</strong> {record.activity}
                                    </span>
                                  </div>
                                )}
                                {record.notes && (
                                  <div className="flex items-start gap-3 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                                    <span className="text-xs font-semibold text-amber-700">
                                      <strong>Obs.:</strong> {record.notes}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                        {sortedSubjectHistoryRecords.length > 0 && (
                          <div className="flex flex-col gap-3 rounded-xl border border-slate-400 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                              Mostrando {subjectHistoryStartIndex + 1}-{subjectHistoryEndIndex} de {sortedSubjectHistoryRecords.length}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setSubjectHistoryPage((current) => Math.max(1, current - 1))}
                                disabled={safeSubjectHistoryPage === 1}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-400 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <ChevronLeft size={15} />
                                Anterior
                              </button>
                              <span className="min-w-20 text-center text-xs font-black text-slate-600">
                                {safeSubjectHistoryPage}/{subjectHistoryTotalPages}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSubjectHistoryPage((current) => Math.min(subjectHistoryTotalPages, current + 1))}
                                disabled={safeSubjectHistoryPage === subjectHistoryTotalPages}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-400 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Próxima
                                <ChevronRight size={15} />
                              </button>
                            </div>
                          </div>
                        )}
                        {sortedSubjectHistoryRecords.length === 0 && (
                          <EmptyState
                            message="Nenhuma aula cadastrada para esta matéria ainda."
                            icon={<CalendarDays size={36} />}
                          />
                        )}
                      </div>
                    ) : subjectModal.type === 'lesson' ? (
                      <form onSubmit={handleSaveLesson} className="grid gap-5" noValidate>
                        {/* Steps indicator melhorado */}
                        <div className="flex items-center gap-2 rounded-xl border border-slate-400 bg-white p-2 shadow-sm">
                          <button
                            type="button"
                            onClick={() => setLessonRecordStep('details')}
                            className={`flex min-h-11 flex-1 items-center justify-center gap-2.5 rounded-sm px-4 text-xs font-black transition-all duration-200 ${
                              lessonRecordStep === 'details'
                                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                          >
                            <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${
                              lessonRecordStep === 'details' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>1</span>
                            <PenLine size={14} />
                            Registro
                          </button>
                          <div className="flex items-center gap-1 text-slate-300">
                            <ChevronRight size={16} />
                          </div>
                          <button
                            type="button"
                            onClick={handleGoToLessonAttendance}
                            className={`flex min-h-11 flex-1 items-center justify-center gap-2.5 rounded-sm px-4 text-xs font-black transition-all duration-200 ${
                              lessonRecordStep === 'attendance'
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200'
                                : lessonDetailsReady
                                  ? 'border border-emerald-400 bg-emerald-50 text-emerald-700'
                                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                            }`}
                          >
                            <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-black ${
                              lessonRecordStep === 'attendance' ? 'bg-white/20 text-white' : lessonDetailsReady ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-200 text-slate-600'
                            }`}>2</span>
                            <UserCheck size={14} />
                            Frequência
                          </button>
                        </div>

                        {lessonError && <AlertBanner tone="rose" message={lessonError} />}

                        {lessonRecordStep === 'details' ? (
                          <>
                            <div className="grid items-start gap-4 md:grid-cols-[minmax(180px,1fr)_150px_150px]">
                              <div className="grid min-w-0 gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                                  Turma
                                </span>
                                <CompactSelect
                                  value={lessonDraft.classId}
                                  options={classOptions(modalClasses)}
                                  onChange={(classId) => {
                                    const nextClassRoom = classes.find((c) => c.id === classId)
                                    setSelectedClassId(classId)
                                    clearLessonFieldError('classId')
                                    clearLessonFieldError('time')
                                    setLessonDraft({
                                      ...lessonDraft,
                                      classId,
                                      time: getFirstLessonTimeForClass(nextClassRoom),
                                    })
                                  }}
                                  ariaLabel="Turma"
                                  hint="Turma que recebeu a aula."
                                  error={lessonFieldErrors.classId}
                                  className="min-h-11 rounded-sm border border-slate-400 bg-white px-4 text-sm font-bold shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                  dropdownWidth="trigger"
                                />
                              </div>
                              <div className="grid min-w-0 gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                                  Data
                                </span>
                                <DateInput
                                  value={lessonDraft.date}
                                  onChange={(e) => updateLessonDraftField('date', e.target.value)}
                                  hint="Data real da aula."
                                  error={lessonFieldErrors.date}
                                  className="min-h-11 rounded-sm border border-slate-400 px-4 text-sm font-semibold shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                              </div>
                              <div className="grid min-w-0 gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                                  Horário
                                </span>
                                <CompactSelect
                                  value={lessonDraft.time}
                                  options={lessonTimeOptions}
                                  onChange={(time) => updateLessonDraftField('time', time)}
                                  ariaLabel="Horário da aula"
                                  hint="Horário da turma."
                                  error={lessonFieldErrors.time}
                                  className="min-h-11 rounded-sm border border-slate-400 bg-white px-4 text-sm font-bold shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                  dropdownWidth="trigger"
                                />
                              </div>
                            </div>

                            {(
                              [
                                ['content', 'Conteúdo ministrado', <FileText size={14} key="content" />, 'indigo'],
                                ['plan', 'Plano de aula', <Target size={14} key="plan" />, 'violet'],
                                ['resources', 'Recursos utilizados', <Layers size={14} key="resources" />, 'sky'],
                                ['activity', 'Atividade realizada', <Flame size={14} key="activity" />, 'orange'],
                                ['notes', 'Observações do professor', <AlertCircle size={14} key="notes" />, 'amber'],
                              ] as [keyof typeof lessonDraft, string, React.ReactNode, string][]
                            ).map(([key, label, fieldIcon, color]) => (
                              <label key={key} className="grid gap-2">
                                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                                  <span className={`text-${color}-500`}>{fieldIcon}</span>
                                  {label}
                                  {key !== 'notes' && <span className="text-rose-500">*</span>}
                                </span>
                                <textarea
                                  className={`min-h-20 rounded-xl border border-slate-400 px-4 py-3 text-sm font-semibold shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 ${fieldStateClass(lessonFieldErrors[key as keyof typeof lessonFieldErrors])}`}
                                  value={lessonDraft[key] as string}
                                  onChange={(e) => updateLessonDraftField(key, e.target.value)}
                                  placeholder={label}
                                  required={key !== 'notes'}
                                  aria-invalid={Boolean(lessonFieldErrors[key as keyof typeof lessonFieldErrors]) || undefined}
                                />
                                <FieldMessage
                                  hint={key === 'notes'
                                    ? 'Opcional: registre alertas, combinados ou observações pedagógicas.'
                                    : `Digite ${label.toLowerCase()} da aula.`}
                                  error={lessonFieldErrors[key as keyof typeof lessonFieldErrors]}
                                />
                              </label>
                            ))}

                            <div className="flex w-full sm:justify-end">
                              <button
                                type="button"
                                onClick={handleGoToLessonAttendance}
                                className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-sm bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-600 hover:to-indigo-700 hover:shadow-xl sm:w-auto"
                              >
                                <UserCheck size={16} />
                                Continuar para frequência
                                <ArrowRight size={15} className="ml-1" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="grid gap-4">
                            {/* Resumo da aula */}
                            <div className="grid gap-4 rounded-xl border border-slate-400 bg-white p-5 shadow-sm sm:grid-cols-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Turma</p>
                                <strong className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
                                  <GraduationCap size={14} className="text-indigo-500" />
                                  {getClassName(lessonDraft.classId)}
                                </strong>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Data</p>
                                <strong className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
                                  <Calendar size={14} className="text-violet-500" />
                                  {formatReservationDate(lessonDraft.date)}
                                </strong>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Horário</p>
                                <strong className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900">
                                  <Clock size={14} className="text-sky-500" />
                                  {lessonDraft.time || 'Não informado'}
                                </strong>
                              </div>
                            </div>

                            {/* Counter de presença */}
                            {lessonAttendanceStudents.length > 0 && (
                              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-400 bg-white px-5 py-3 shadow-sm">
                                <span className="text-sm font-black text-slate-700">
                                  {lessonAttendanceStudents.length} aluno(s) na turma
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-2 rounded-xl border border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 text-xs font-black text-emerald-700 shadow-sm">
                                    <CheckCircle size={14} />
                                    {lessonPresentCount} presentes
                                  </span>
                                  <span className="flex items-center gap-2 rounded-xl border border-rose-500 bg-gradient-to-r from-rose-50 to-rose-100 px-4 py-2 text-xs font-black text-rose-700 shadow-sm">
                                    <X size={14} />
                                    {lessonAttendanceStudents.length - lessonPresentCount} faltas
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Lista de alunos */}
                            <div className="grid gap-3">
                              {lessonAttendanceStudents.map((student, i) => {
                                const key = getLessonAttendanceKey(lessonDraft, student.id)
                                const present = attendance[key] ?? true
                                return (
                                  <label
                                    key={student.id}
                                    className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-400 bg-white px-5 py-3 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md"
                                    style={{ 
                                      animation: 'fadeSlideIn 0.3s ease-out forwards',
                                      animationDelay: `${i * 40}ms`,
                                      opacity: 0
                                    }}
                                  >
                                    <span className="flex items-center gap-4">
                                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all ${present ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-400'}`}>
                                        <UserRound size={16} />
                                      </span>
                                      <span>
                                        <strong className="block text-sm font-black leading-tight text-slate-900">
                                          {student.name}
                                        </strong>
                                        <span className="text-xs font-semibold text-slate-400">
                                          {student.registrationNumber}
                                        </span>
                                      </span>
                                    </span>
                                    <div className="flex shrink-0 items-center gap-3">
                                      <span className={`text-xs font-black transition-colors ${present ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {present ? 'Presente' : 'Faltou'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => updateAttendance(key, !present)}
                                        className={`relative h-8 w-14 rounded-full p-1 transition-all duration-300 ${
                                          present
                                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-200'
                                            : 'bg-slate-300'
                                        }`}
                                        aria-label={present ? 'Presente' : 'Faltou'}
                                      >
                                        <span
                                          className={`block h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                                            present ? 'translate-x-6' : ''
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  </label>
                                )
                              })}
                              {lessonAttendanceStudents.length === 0 && (
                                <EmptyState
                                  message="Nenhum aluno vinculado a esta turma."
                                  icon={<Users size={36} />}
                                />
                              )}
                            </div>

                            {/* Botões de ação */}
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                              <button
                                type="button"
                                onClick={() => setLessonRecordStep('details')}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-slate-400 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
                              >
                                <ChevronLeft size={15} />
                                Voltar ao registro
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingLesson || (!lessonDetailsReady && !lessonAttendanceHasChanges)}
                                className="inline-flex min-h-11 w-full items-center justify-center gap-2.5 rounded-sm bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                              >
                                <Save size={16} />
                                {isSavingLesson ? 'Salvando...' : lessonDetailsReady ? 'Salvar registro e frequência' : 'Salvar frequência'}
                              </button>
                            </div>
                          </div>
                        )}
                      </form>
                    ) : (
                      <div className="grid gap-4">
                        <CompactSelect
                          value={modalSelectedClass?.id ?? ''}
                          options={classOptions(modalClasses)}
                          onChange={setSelectedClassId}
                          className="min-h-11 rounded-xl border border-slate-400 bg-white px-4 text-sm font-bold shadow-sm"
                          dropdownWidth="trigger"
                        />
                        {modalSelectedStudents.length > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-400 bg-white px-5 py-3 shadow-sm">
                            <span className="text-sm font-black text-slate-700">
                              {modalSelectedStudents.length} aluno(s)
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-2 rounded-xl border border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 text-xs font-black text-emerald-700 shadow-sm">
                                <CheckCircle size={14} />
                                {modalSelectedStudents.filter((student) => attendance[`${modalSelectedClass?.id}:${student.id}`] ?? true).length} presentes
                              </span>
                              <span className="flex items-center gap-2 rounded-xl border border-rose-500 bg-gradient-to-r from-rose-50 to-rose-100 px-4 py-2 text-xs font-black text-rose-700 shadow-sm">
                                <X size={14} />
                                {modalSelectedStudents.filter((student) => !(attendance[`${modalSelectedClass?.id}:${student.id}`] ?? true)).length} faltas
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="grid gap-3">
                          {modalSelectedStudents.map((student, i) => {
                            const key = `${modalSelectedClass?.id}:${student.id}`
                            const present = attendance[key] ?? true
                            return (
                              <label
                                key={student.id}
                                className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-400 bg-white px-5 py-3 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md"
                                style={{ 
                                  animation: 'fadeSlideIn 0.3s ease-out forwards',
                                  animationDelay: `${i * 40}ms`,
                                  opacity: 0
                                }}
                              >
                                <span className="flex items-center gap-4">
                                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all ${present ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-400'}`}>
                                    <UserRound size={16} />
                                  </span>
                                  <span>
                                    <strong className="block text-sm font-black leading-tight text-slate-900">
                                      {student.name}
                                    </strong>
                                    <span className="text-xs font-semibold text-slate-400">
                                      {student.registrationNumber}
                                    </span>
                                  </span>
                                </span>
                                <div className="flex shrink-0 items-center gap-3">
                                  <span className={`text-xs font-black transition-colors ${present ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {present ? 'Presente' : 'Faltou'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateAttendance(key, !present)}
                                    className={`relative h-8 w-14 rounded-full p-1 transition-all duration-300 ${
                                      present
                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-200'
                                        : 'bg-slate-300'
                                    }`}
                                    aria-label={present ? 'Presente' : 'Faltou'}
                                  >
                                    <span
                                      className={`block h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                                        present ? 'translate-x-6' : ''
                                      }`}
                                    />
                                  </button>
                                </div>
                              </label>
                            )
                          })}
                          {modalSelectedStudents.length === 0 && (
                            <EmptyState
                              message="Nenhum aluno vinculado a esta turma."
                              icon={<Users size={36} />}
                            />
                          )}
                        </div>
                        {modalSelectedStudents.length > 0 && (
                          <div className="flex w-full sm:justify-end">
                            <button
                              type="button"
                              onClick={() => commitAttendanceChanges(modalAttendanceKeys)}
                              disabled={!modalAttendanceHasChanges}
                              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-200 transition-all hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                              <Save size={16} />
                              Salvar frequência
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* Estilos de animação */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </SectionShell>
  )
}
