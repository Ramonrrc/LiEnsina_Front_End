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
  MapPin,
  PenLine,
  Save,
  School,
  Sparkles,
  Star,
  Target,
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
import type { RoomReservation } from '../../types'

// Skeleton para card de reserva com ícones
function ReservationCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="animate-pulse rounded-xl border border-slate-300 bg-white p-4 shadow-sm"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-100">
            <DoorOpen size={16} className="text-indigo-300" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded-full bg-slate-200" />
            <div className="h-3 w-20 rounded-full bg-slate-100" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5">
          <Clock size={12} className="text-indigo-300" />
          <div className="h-3 w-16 rounded-full bg-indigo-200" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
          <GraduationCap size={11} className="text-slate-300" />
          <div className="h-3 w-16 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1">
          <Calendar size={11} className="text-slate-300" />
          <div className="h-3 w-20 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-3 w-full rounded-full bg-slate-100" />
        <div className="h-3 w-2/3 rounded-full bg-slate-100" />
      </div>
    </div>
  )
}

// Skeleton para o formulário
function FormSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100">
          <Calendar size={18} className="text-indigo-300" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded-full bg-slate-200" />
          <div className="h-3 w-48 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 rounded-full bg-slate-200" />
            <div className="h-11 w-full rounded-xl bg-slate-100" />
          </div>
        ))}
        <div className="space-y-2 sm:col-span-2 lg:col-span-5">
          <div className="h-3 w-20 rounded-full bg-slate-200" />
          <div className="h-20 w-full rounded-xl bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <div className="h-11 w-40 rounded-xl bg-indigo-100" />
      </div>
    </div>
  )
}

export function RoomReservationsView({ model }: { model: RolePortalScreenModel }) {
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setTimeout(() => setIsLoading(false), 600)
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

  return (
    <SectionShell
      label="Professor"
      title="Reservar Sala"
      description="Reserve laboratório, sala multimídia ou outro ambiente escolar para uma turma."
      icon={<DoorOpen size={20} />}
    >
      {/* Stats Banner com animação de entrada */}
      <div
        className={`flex flex-wrap items-center gap-4 rounded-2xl border border-slate-400 bg-gradient-to-r from-white via-slate-50/50 to-white px-6 py-4 shadow-sm transition-all duration-700 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
            <DoorOpen size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total de reservas</p>
            <strong className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">{reservations.length}</strong>
          </div>
        </div>
        <div className="mx-2 hidden h-10 w-px bg-slate-300 sm:block" />
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Users size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Turmas disponíveis</p>
            <strong className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">{classes.length}</strong>
          </div>
        </div>
        <div className="mx-2 hidden h-10 w-px bg-slate-300 sm:block" />
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-200">
            <School size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Escolas</p>
            <strong className="font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">{schools.length}</strong>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full border border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Sistema ativo</span>
        </div>
      </div>

      <section className="grid items-start gap-5">
        {/* Formulário de Nova Reserva */}
        {isLoading ? (
          <FormSkeleton />
        ) : (
          <form
            onSubmit={handleSaveReservation}
            className="overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm transition-all duration-500"
            style={{
              animation: 'fadeSlideUp 0.5s ease-out forwards',
              opacity: 0,
              transform: 'translateY(20px)',
            }}
            noValidate
          >
            {/* Header do formulário */}
            <div className="relative border-b border-slate-300 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4">
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
                  <Calendar size={20} />
                </span>
                <div>
                  <h3 className="font-['Sora',system-ui,sans-serif] text-base font-black text-slate-900">Nova Reserva</h3>
                  <p className="text-xs font-semibold text-slate-500">Preencha os dados do ambiente e período desejado</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              {reservationError && (
                <div className="mb-5">
                  <AlertBanner tone="rose" message={reservationError} />
                </div>
              )}

              <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.2fr)_minmax(180px,1fr)_150px_120px_120px]">
                {/* Campo Sala */}
                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                    <MapPin size={12} className="text-indigo-500" />
                    Sala, Laboratório
                    <span className="text-rose-500">*</span>
                  </span>
                  <input
                    className={`min-h-11 rounded-sm border border-slate-400 px-4 text-sm font-semibold shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 ${fieldStateClass(reservationFieldErrors.room)}`}
                    value={reservationDraft.room}
                    onChange={(e) => updateReservationDraftField('room', e.target.value)}
                    placeholder="Ex: Laboratório de Informática"
                    aria-invalid={Boolean(reservationFieldErrors.room) || undefined}
                    required
                  />
                  <FieldMessage hint="Digite o nome do ambiente exatamente como a escola identifica." error={reservationFieldErrors.room} />
                </label>

                {/* Campo Turma */}
                <div className="grid gap-2">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                    <GraduationCap size={12} className="text-violet-500" />
                    Turma
                    <span className="text-rose-500">*</span>
                  </span>
                  <CompactSelect
                    value={reservationDraft.classId}
                    options={classOptions(classes)}
                    onChange={(classId) => updateReservationDraftField('classId', classId)}
                    ariaLabel="Turma"
                    hint="Selecione a turma que usará o ambiente."
                    error={reservationFieldErrors.classId}
                    className="min-h-11 rounded-sm border border-slate-400 bg-white px-4 text-sm font-bold shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    dropdownWidth="trigger"
                  />
                </div>

                {/* Campo Data */}
                <label className="grid gap-2">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                    <CalendarDays size={12} className="text-sky-500" />
                    Data
                    <span className="text-rose-500">*</span>
                  </span>
                  <DateInput
                    value={reservationDraft.date}
                    onChange={(e) => updateReservationDraftField('date', e.target.value)}
                    hint="Informe o dia da reserva."
                    error={reservationFieldErrors.date}
                    className="min-h-11 rounded-sm border border-slate-400 px-4 text-sm font-semibold shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                {/* Campo Início */}
                <div className="grid gap-2">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                    <Clock size={12} className="text-emerald-500" />
                    Início
                    <span className="text-rose-500">*</span>
                  </span>
                  <CompactSelect
                    value={reservationDraft.startTime}
                    options={reservationStartTimeOptions}
                    onChange={(startTime) => {
                      clearReservationFieldError('startTime')
                      clearReservationFieldError('endTime')
                      handleReservationStartTimeChange(startTime)
                    }}
                    ariaLabel="Horário de início"
                    hint="Escolha quando a reserva começa."
                    error={reservationFieldErrors.startTime}
                    className="min-h-11 rounded-sm border border-slate-400 bg-white px-4 text-sm font-bold shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    dropdownWidth="trigger"
                  />
                </div>

                {/* Campo Fim */}
                <div className="grid gap-2">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                    <Clock size={12} className="text-amber-500" />
                    Fim
                    <span className="text-rose-500">*</span>
                  </span>
                  <CompactSelect
                    value={reservationDraft.endTime}
                    options={reservationEndTimeOptions}
                    onChange={(endTime) => updateReservationDraftField('endTime', endTime)}
                    ariaLabel="Horário de fim"
                    hint="Escolha um horário posterior ao início."
                    error={reservationFieldErrors.endTime}
                    className="min-h-11 rounded-sm border border-slate-400 bg-white px-4 text-sm font-bold shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    dropdownWidth="trigger"
                  />
                </div>

                {/* Campo Finalidade */}
                <label className="grid gap-2 sm:col-span-2 lg:col-span-5">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                    <Target size={12} className="text-orange-500" />
                    Finalidade
                    <span className="text-rose-500">*</span>
                  </span>
                  <textarea
                    className={`min-h-24 rounded-xl border border-slate-400 px-4 py-3 text-sm font-semibold shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 ${fieldStateClass(reservationFieldErrors.purpose)}`}
                    value={reservationDraft.purpose}
                    onChange={(e) => updateReservationDraftField('purpose', e.target.value)}
                    placeholder="Descreva o objetivo da reserva, atividades planejadas, etc."
                    aria-invalid={Boolean(reservationFieldErrors.purpose) || undefined}
                    required
                  />
                  <FieldMessage hint="Explique rapidamente o objetivo da reserva." error={reservationFieldErrors.purpose} />
                </label>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingReservation || classes.length === 0}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-sm border border-indigo-500 bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 text-sm font-black text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-600 hover:to-indigo-700 hover:shadow-xl hover:shadow-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto active:scale-[0.98]"
                >
                  <Save size={16} />
                  {isSavingReservation ? 'Salvando...' : 'Salvar reserva'}
                  <ArrowRight size={14} className="ml-1 opacity-80" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Lista de Reservas Recentes */}
        <div
          className="overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm"
          style={{
            animation: 'fadeSlideUp 0.5s ease-out forwards',
            animationDelay: '100ms',
            opacity: 0,
            transform: 'translateY(20px)',
          }}
        >
          {/* Header da lista */}
          <div className="relative border-b border-slate-300 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4">
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-200">
                  <Clock size={20} />
                </span>
                <div>
                  <h3 className="font-['Sora',system-ui,sans-serif] text-base font-black text-slate-900">Reservas Recentes</h3>
                  <p className="text-xs font-semibold text-slate-500">Histórico de ambientes reservados</p>
                </div>
              </div>
              {reservations.length > 0 && (
                <span className="flex items-center gap-2 rounded-full border border-indigo-500 bg-gradient-to-r from-indigo-50 to-indigo-100 px-4 py-2 text-xs font-black text-indigo-700 shadow-sm">
                  <Sparkles size={14} className="text-indigo-500" />
                  {reservations.length} reserva(s)
                </span>
              )}
            </div>
          </div>

          {/* Conteúdo da lista */}
          <div className="p-5">
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <ReservationCardSkeleton key={i} index={i} />
                ))}
              </div>
            ) : reservations.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {reservations.map((r: RoomReservation, i: number) => (
                  <article
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedReservation(r)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedReservation(r)
                      }
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-400 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{
                      animation: 'fadeSlideIn 0.4s ease-out forwards',
                      animationDelay: `${i * 60}ms`,
                      opacity: 0,
                    }}
                    aria-label={`Ver dados da reserva de ${r.room}`}
                  >
                    {/* Barra lateral colorida */}
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-400 to-violet-500 transition-all duration-300 group-hover:w-1.5" />

                    {/* Efeito de brilho no hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-indigo-50/0 transition-all duration-500 group-hover:from-indigo-50/30 group-hover:via-white/0 group-hover:to-violet-50/20" />

                    <div className="relative pl-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200 transition-transform duration-300 group-hover:scale-110">
                            <DoorOpen size={18} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Ambiente</p>
                            <strong className="block truncate font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-900">
                              {r.room}
                            </strong>
                          </div>
                        </div>
                        <span className="flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-500 bg-gradient-to-r from-indigo-50 to-indigo-100 px-3 py-1.5 text-[10px] font-black text-indigo-700 shadow-sm">
                          <Clock size={12} />
                          {formatReservationTime(r.startTime)}–{formatReservationTime(r.endTime)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600 shadow-sm">
                          <GraduationCap size={11} className="text-violet-500" />
                          {getClassName(r.classId)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600 shadow-sm">
                          <CalendarDays size={11} className="text-sky-500" />
                          {formatReservationDate(r.date)}
                        </span>
                      </div>

                      {r.purpose && (
                        <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
                          <p className="line-clamp-2 text-xs font-semibold text-slate-600">{r.purpose}</p>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-end">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-500 opacity-0 transition-opacity group-hover:opacity-100">
                          Ver detalhes
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                message="Nenhuma reserva cadastrada ainda. Preencha o formulário acima para criar sua primeira reserva."
                icon={<DoorOpen size={40} />}
              />
            )}
          </div>
        </div>

        {/* Modal de Detalhes da Reserva */}
        {selectedReservation && typeof document !== 'undefined'
          ? createPortal(
              <div
                role="presentation"
                onMouseDown={() => setSelectedReservation(null)}
                className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-900/40 px-4 py-6 backdrop-blur-sm"
                style={{ animation: 'fadeIn 0.2s ease-out' }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="reservation-detail-title"
                  onMouseDown={(event) => event.stopPropagation()}
                  className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-2xl"
                  style={{ animation: 'scaleIn 0.3s ease-out' }}
                >
                  {/* Header do modal em tema claro */}
                  <div className="relative border-b border-slate-300 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-5">
                    {/* Barra de acento colorida no topo */}
                    <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200">
                          <DoorOpen size={20} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                            Dados da reserva
                          </p>
                          <h2
                            id="reservation-detail-title"
                            className="truncate font-['Sora',system-ui,sans-serif] text-lg font-black text-slate-900"
                          >
                            {selectedReservation.room}
                          </h2>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedReservation(null)}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-400 bg-white text-slate-500 shadow-sm transition-all hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Fechar modal"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo do modal */}
                  <div className="grid gap-4 bg-slate-50/50 p-5">
                    {/* Ambiente */}
                    <div
                      className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm"
                      style={{ animation: 'fadeSlideIn 0.3s ease-out forwards' }}
                    >
                      <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
                        <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100">
                          <MapPin size={14} className="text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                          Ambiente
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        <strong className="font-['Sora',system-ui,sans-serif] text-base font-black text-slate-900">
                          {selectedReservation.room}
                        </strong>
                      </div>
                    </div>

                    {/* Data e Horário */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div
                        className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm"
                        style={{ animation: 'fadeSlideIn 0.3s ease-out forwards', animationDelay: '50ms' }}
                      >
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-sky-100">
                            <CalendarDays size={14} className="text-sky-600" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                            Data
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <strong className="text-sm font-black text-slate-900">
                            {formatReservationDate(selectedReservation.date)}
                          </strong>
                        </div>
                      </div>

                      <div
                        className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm"
                        style={{ animation: 'fadeSlideIn 0.3s ease-out forwards', animationDelay: '100ms' }}
                      >
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100">
                            <Clock size={14} className="text-emerald-600" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                            Horário
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <strong className="text-sm font-black text-slate-900">
                            {formatReservationTime(selectedReservation.startTime)}–{formatReservationTime(selectedReservation.endTime)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Turma e Escola */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div
                        className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm"
                        style={{ animation: 'fadeSlideIn 0.3s ease-out forwards', animationDelay: '150ms' }}
                      >
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-violet-100">
                            <GraduationCap size={14} className="text-violet-600" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                            Turma
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <strong className="text-sm font-black text-slate-900">
                            {getClassName(selectedReservation.classId)}
                          </strong>
                        </div>
                      </div>

                      <div
                        className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm"
                        style={{ animation: 'fadeSlideIn 0.3s ease-out forwards', animationDelay: '200ms' }}
                      >
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100">
                            <School size={14} className="text-amber-600" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                            Escola
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <strong className="text-sm font-black text-slate-900">
                            {getReservationSchoolName(selectedReservation)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Finalidade */}
                    {selectedReservation.purpose && (
                      <div
                        className="overflow-hidden rounded-xl border border-slate-400 bg-white shadow-sm"
                        style={{ animation: 'fadeSlideIn 0.3s ease-out forwards', animationDelay: '250ms' }}
                      >
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-orange-100">
                            <Target size={14} className="text-orange-600" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                            Finalidade
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-sm font-semibold leading-relaxed text-slate-700">
                            {selectedReservation.purpose}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Badge de status */}
                    <div
                      className="flex items-center justify-center gap-3 rounded-xl border border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-3 shadow-sm"
                      style={{ animation: 'fadeSlideIn 0.3s ease-out forwards', animationDelay: '300ms' }}
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      <CheckCircle size={16} className="text-emerald-600" />
                      <span className="text-sm font-black text-emerald-700">Reserva confirmada</span>
                    </div>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </section>

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
