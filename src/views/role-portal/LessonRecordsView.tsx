import { createPortal } from 'react-dom'
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
  getAcademicSubjectLabel,
  getSubjectIcon,
  getSubjectIconBg,
  normalizeAcademicText,
  getClassStudents,
  getSubjectAccent,
} from '../../components/role-portal/portal-components'
import type { LessonRecordFormField, RolePortalScreenModel } from './screen-model'
import type { LessonRecord } from '../../types'

export function LessonRecordsView({ model }: { model: RolePortalScreenModel }) {
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
        title="Registro de Aula"
        description="Registre conteúdo ministrado, plano, recursos e observações para acompanhamento pedagógico."
        icon={<ClipboardList size={20} />}
      >
        <form
          onSubmit={handleSaveLesson}
          className="animate-fade-slide-up rounded-2xl border-2 border-slate-400 bg-white p-5 shadow-md"
          noValidate
        >
          <SectionHeader
            icon={<BookMarked size={16} />}
            label="Novo registro"
            subtitle="Preencha os dados da aula ministrada"
          />
          {lessonError && <div className="mt-4"><AlertBanner tone="rose" message={lessonError} /></div>}
          <div className="mt-4 grid items-start gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_150px_150px]">
            <div className="grid min-w-0 gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Turma
              </span>
              <CompactSelect
                value={lessonDraft.classId}
                options={classOptions(classScope)}
                onChange={(classId) => updateLessonDraftField('classId', classId)}
                hint="Turma que recebeu a aula."
                error={lessonFieldErrors.classId}
                className="min-h-10 rounded-sm border-2 border-slate-400 bg-white px-3 text-sm font-bold"
                dropdownWidth="trigger"
              />
            </div>
            <label className="grid min-w-0 gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Matéria
              </span>
              <input
                className={`min-h-10 rounded-sm border-2 border-slate-400 px-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 ${fieldStateClass(lessonFieldErrors.subject)}`}
                value={lessonDraft.subject}
                onChange={(e) => updateLessonDraftField('subject', e.target.value)}
                placeholder="Matéria / disciplina"
                aria-invalid={Boolean(lessonFieldErrors.subject) || undefined}
                required
              />
              <FieldMessage hint="Matéria trabalhada." error={lessonFieldErrors.subject} />
            </label>
            <div className="grid min-w-0 gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Data
              </span>
              <DateInput
                value={lessonDraft.date}
                onChange={(e) => updateLessonDraftField('date', e.target.value)}
                hint="Data da aula."
                error={lessonFieldErrors.date}
                className="min-h-10 rounded-sm border-2 border-slate-400 px-3 text-sm font-semibold"
              />
            </div>
            <div className="grid min-w-0 gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Horário
              </span>
              <CompactSelect
                value={lessonDraft.time}
                options={lessonTimeOptions}
                onChange={(time) => updateLessonDraftField('time', time)}
                ariaLabel="Horário da aula"
                hint="Horário da turma."
                error={lessonFieldErrors.time}
                className="min-h-10 rounded-sm border-2 border-slate-400 bg-white px-3 text-sm font-bold"
                dropdownWidth="trigger"
              />
            </div>
            {(
              [
                ['content', 'Conteúdo ministrado'],
                ['plan', 'Plano de aula'],
                ['resources', 'Recursos utilizados'],
                ['activity', 'Atividade realizada'],
                ['notes', 'Observações do professor'],
              ] as [keyof LessonRecord, string][]
            ).map(([key, label]) => (
              <div key={key} className="grid gap-1.5 md:col-span-2">
                <textarea
                  className={`min-h-20 rounded-lg border-2 border-slate-400 px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 ${fieldStateClass(lessonFieldErrors[key as LessonRecordFormField])}`}
                  value={lessonDraft[key] as string}
                  onChange={(e) => updateLessonDraftField(key, e.target.value)}
                  placeholder={label}
                  aria-invalid={Boolean(lessonFieldErrors[key as LessonRecordFormField]) || undefined}
                  required={key !== 'notes'}
                />
                <FieldMessage
                  hint={key === 'notes'
                    ? 'Opcional: registre observações pedagógicas relevantes.'
                    : `Digite ${label.toLowerCase()} da aula.`}
                  error={lessonFieldErrors[key as LessonRecordFormField]}
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={isSavingLesson}
            className="btn-primary mt-3 inline-flex min-h-10 items-center gap-2 rounded-sm bg-indigo-600 px-5 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} />{isSavingLesson ? 'Salvando...' : 'Salvar registro'}
          </button>
        </form>

        {lessonRecords.length > 0 && (
          <div
            className="animate-fade-slide-up overflow-hidden rounded-2xl border-2 border-slate-400 bg-white shadow-md"
            style={{ animationDelay: '100ms' }}
          >
            <div className="border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <SectionHeader
                icon={<CalendarDays size={16} />}
                label="Histórico desta sessão"
                subtitle={`${lessonRecords.length} registro(s) salvo(s)`}
              />
            </div>
            <div className="grid gap-3 p-4">
              {visibleLessonHistoryRecords.map((record, i) => (
                <article
                  key={record.id}
                  className="animate-fade-slide-up rounded-xl border-2 border-slate-300 bg-slate-50 p-4"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                      <BookMarked size={13} className="text-indigo-500" />
                      {getAcademicSubjectLabel(record.subject, evaluationsData?.curriculumSkills ?? [])} – {getClassName(record.classId)}
                    </strong>
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                      <Clock size={11} />
                      {formatReservationDate(record.date)} {record.time}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{record.content}</p>
                </article>
              ))}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-300 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Mostrando {lessonHistoryStartIndex + 1}-{lessonHistoryEndIndex} de {sortedLessonRecords.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLessonHistoryPage((current) => Math.max(1, current - 1))}
                    disabled={safeLessonHistoryPage === 1}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft size={14} />
                    Anterior
                  </button>
                  <span className="min-w-20 text-center text-xs font-black text-slate-500">
                    {safeLessonHistoryPage}/{lessonHistoryTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLessonHistoryPage((current) => Math.min(lessonHistoryTotalPages, current + 1))}
                    disabled={safeLessonHistoryPage === lessonHistoryTotalPages}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Próxima
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionShell>
    )
}
