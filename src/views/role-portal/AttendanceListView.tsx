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
  getSubjectIcon,
  getSubjectIconBg,
  normalizeAcademicText,
  getClassStudents,
  getSubjectAccent,
} from '../../components/role-portal/portal-components'
import type { RolePortalScreenModel } from './screen-model'

export function AttendanceListView({ model }: { model: RolePortalScreenModel }) {
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

const selectedClassAttendanceKeys = selectedClassStudents.map((student) => `${selectedClass?.id}:${student.id}`)
    const selectedClassAttendanceHasChanges = selectedClassAttendanceKeys.some((key) => attendanceDirtyKeys.has(key))
    const presentCount = selectedClassStudents.filter(
      (s) => (attendance[`${selectedClass?.id}:${s.id}`] ?? true),
    ).length
    const totalCount = selectedClassStudents.length

    return (
      <SectionShell
        label="Professor"
        title="Lista de Frequência"
        description="Marque presença ou falta por aluno. Switch ligado significa presente."
        icon={<ListChecks size={20} />}
      >
        <section className="animate-fade-slide-up overflow-hidden rounded-2xl border-2 border-slate-400 bg-white shadow-md">
          <div className="border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <CompactSelect
                value={selectedClass?.id ?? ''}
                options={classOptions(classScope)}
                onChange={setSelectedClassId}
                className="min-h-10 rounded-lg border-2 border-slate-400 bg-white px-3 text-sm font-bold"
                dropdownWidth="trigger"
              />
              {totalCount > 0 && (
                <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                  <span className="flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">
                    <CheckCircle size={13} />
                    {presentCount} presentes
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg border border-rose-400 bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-700">
                    <X size={13} />
                    {totalCount - presentCount} faltas
                  </span>
                  <button
                    type="button"
                    onClick={() => commitAttendanceChanges(selectedClassAttendanceKeys)}
                    disabled={!selectedClassAttendanceHasChanges}
                    className="btn-primary inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save size={13} />Salvar
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-2 p-4">
            {selectedClassStudents.map((student, i) => {
              const key = `${selectedClass?.id}:${student.id}`
              const present = attendance[key] ?? true
              return (
                <label
                  key={student.id}
                  className="animate-fade-slide-up flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 transition hover:border-slate-400 hover:bg-slate-50"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                        present ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <UserRound size={15} />
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
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-black transition ${
                        present ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {present ? 'Presente' : 'Faltou'}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateAttendance(key, !present)}
                      className={`relative h-7 w-12 rounded-full p-1 transition-all duration-200 ${
                        present ? 'bg-emerald-500 shadow-md shadow-emerald-200' : 'bg-slate-300'
                      }`}
                      aria-label={present ? 'Presente' : 'Faltou'}
                    >
                      <span
                        className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                          present ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                </label>
              )
            })}
            {selectedClassStudents.length === 0 && (
              <EmptyState
                message="Nenhum aluno vinculado a esta turma."
                icon={<Users size={40} />}
              />
            )}
          </div>
        </section>
      </SectionShell>
    )
}
