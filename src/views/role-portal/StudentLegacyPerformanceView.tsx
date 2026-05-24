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
  splitAcademicList,
  uniqueAcademicList,
  getClassStudents,
  getSubjectAccent,
} from '../../components/role-portal/portal-components'
import {
  getAttendanceRateFromRows,
  getStudentLessonAttendanceRows,
} from '../../lib/lesson-attendance'
import type { RolePortalScreenModel } from './screen-model'

export function StudentLegacyPerformanceView({ model }: { model: RolePortalScreenModel }) {
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

const student = selectedStudent

    if (!student) {
      return (
        <SectionShell
          label="Aluno"
          title="Meu Desempenho"
          description="Dashboard individual com os indicadores liberados para o aluno logado."
          icon={<BarChart3 size={20} />}
        >
          <EmptyState
            message="Nenhum aluno vinculado ao perfil atual."
            icon={<UserRound size={40} />}
          />
        </SectionShell>
      )
    }

    const classRoom = getClassRoom(student.classId)
    const disciplines = uniqueAcademicList(
      (classRoom?.bnccFocus ?? [])
        .flatMap(splitAcademicList)
        .map((discipline) => getAcademicSubjectLabel(discipline, evaluationsData?.curriculumSkills ?? [])),
    )
    const score = student.averageScore ?? 0
    const attendanceRows = getStudentLessonAttendanceRows(student, lessonRecords, attendance, getLessonAttendanceKey)
    const presentCount = attendanceRows.filter((row) => row.present).length
    const absenceCount = attendanceRows.length - presentCount
    const attendanceRate = getAttendanceRateFromRows(attendanceRows) ?? student.attendanceRate ?? 0
    const hasAcademicAlert = score < 6
    const hasAttendanceAlert = attendanceRate < 75
    const statusLabel = hasAcademicAlert || hasAttendanceAlert ? 'Atenção' : 'Estável'
    const statusDetail =
      hasAcademicAlert && hasAttendanceAlert
        ? 'Média e frequência precisam de acompanhamento'
        : hasAcademicAlert
          ? 'Média abaixo do esperado'
          : hasAttendanceAlert
            ? 'Frequência abaixo do esperado'
            : 'Indicadores dentro do esperado'

    return (
      <SectionShell
        label="Aluno"
        title="Meu Desempenho"
        description="Dashboard individual com notas, frequência, turma, disciplinas e leitura geral dos seus indicadores."
        icon={<BarChart3 size={20} />}
      >
        {(hasAcademicAlert || hasAttendanceAlert) && (
          <AlertBanner
            message={statusDetail}
            tone={hasAcademicAlert && hasAttendanceAlert ? 'rose' : 'amber'}
            soft
          />
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Média geral"
            value={score.toFixed(1)}
            detail="Resultado acadêmico consolidado"
            tone={hasAcademicAlert ? 'amber' : 'emerald'}
            icon={<Star size={18} />}
            delay={0}
            soft
          />
          <InfoCard
            label="Frequência geral"
            value={`${attendanceRate}%`}
            detail="Presenças em relação às aulas"
            tone={hasAttendanceAlert ? 'rose' : 'emerald'}
            icon={<Activity size={18} />}
            delay={60}
            soft
          />
          <InfoCard
            label="Situação"
            value={statusLabel}
            detail={statusDetail}
            tone={hasAcademicAlert || hasAttendanceAlert ? 'amber' : 'emerald'}
            icon={
              hasAcademicAlert || hasAttendanceAlert ? (
                <AlertCircle size={18} />
              ) : (
                <CheckCircle size={18} />
              )
            }
            delay={120}
            soft
          />
          <InfoCard
            label="Disciplinas"
            value={disciplines.length || '—'}
            detail={classRoom ? `${classRoom?.name ?? ''} - ${classRoom?.shift ?? ''}` : 'Turma nao localizada'}
            icon={<BookOpen size={18} />}
            delay={180}
            soft
          />
        </section>

        <PanelCard
          soft
          header={
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                <ClipboardList size={18} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
                  Histórico de aulas
                </p>
                <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">
                  Presenças e faltas vindas do diário
                </h2>
              </div>
            </div>
          }
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Aulas</span>
              <strong className="mt-0.5 block text-lg font-black text-slate-900">{attendanceRows.length}</strong>
            </div>
            <div className="rounded-xl border border-emerald-400 bg-emerald-50 px-3 py-2.5">
              <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-600">Presenças</span>
              <strong className="mt-0.5 block text-lg font-black text-emerald-700">{attendanceRows.length ? presentCount : '—'}</strong>
            </div>
            <div className="rounded-xl border border-rose-400 bg-rose-50 px-3 py-2.5">
              <span className="block text-[10px] font-black uppercase tracking-wider text-rose-600">Faltas</span>
              <strong className="mt-0.5 block text-lg font-black text-rose-700">{attendanceRows.length ? absenceCount : '—'}</strong>
            </div>
          </div>
          <div className="grid gap-2">
            {attendanceRows.slice(0, 8).map(({ record, present }, i) => (
              <article
                key={`${record.id}:${student.id}`}
                className="animate-fade-slide-up flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white p-3"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-black text-slate-900">
                    {getAcademicSubjectLabel(record.subject, evaluationsData?.curriculumSkills ?? [])}
                  </strong>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Clock size={11} />
                    {formatReservationDate(record.date)} {record.time}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-black ${
                    present
                      ? 'border-emerald-400 bg-emerald-100 text-emerald-700'
                      : 'border-rose-400 bg-rose-100 text-rose-700'
                  }`}
                >
                  {present ? <CheckCircle size={12} /> : <X size={12} />}
                  {present ? 'Presente' : 'Faltou'}
                </span>
              </article>
            ))}
            {attendanceRows.length === 0 && (
              <EmptyState
                message="Nenhum registro de aula encontrado para montar o histórico do aluno."
                icon={<ClipboardList size={36} />}
              />
            )}
          </div>
        </PanelCard>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <PanelCard
            soft
            header={
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
                  <Target size={18} />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
                    Análise do aluno
                  </p>
                  <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">
                    Indicadores principais
                  </h2>
                </div>
              </div>
            }
          >
            <MetricProgress
              label="Média geral"
              value={score}
              max={10}
              detail="Escala de 0 a 10"
              tone={hasAcademicAlert ? 'amber' : 'emerald'}
              icon={<Star size={15} />}
              delay={0}
              soft
            />
            <MetricProgress
              label="Frequência geral"
              value={attendanceRate}
              detail="Percentual de presença"
              tone={hasAttendanceAlert ? 'rose' : 'emerald'}
              icon={<Activity size={15} />}
              delay={100}
              soft
            />
            <div
              className="animate-fade-slide-up rounded-xl border border-slate-300 bg-slate-50 p-4"
              style={{ animationDelay: '200ms' }}
            >
              <p className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                <UserRound size={14} className="text-indigo-500" />
                Leitura rápida
              </p>
              <div className="mt-3 grid gap-2">
                {[
                  ['Aluno', student.name],
                  ['Escola', getSchoolName(student.schoolId)],
                  ['Turma', getClassName(student.classId)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      {label}
                    </span>
                    <span className="text-sm font-black text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </PanelCard>

          <aside
            className="animate-fade-slide-up overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md"
            style={{ animationDelay: '100ms' }}
          >
            <div className="border-b border-slate-300 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                  <Layers size={18} />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
                    Disciplinas vinculadas
                  </p>
                  <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">
                    Grade da turma
                  </h2>
                </div>
              </div>
            </div>
            <div className="grid gap-2 p-4">
              {disciplines.map((discipline, i) => (
                <div
                  key={discipline}
                  className="animate-fade-slide-up flex items-center gap-3 rounded-xl border border-slate-300 bg-white p-3"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
                    <BookOpen size={14} />
                  </span>
                  <strong className="text-sm font-black text-slate-900">{discipline}</strong>
                </div>
              ))}
              {disciplines.length === 0 && (
                <EmptyState
                  message="Nenhuma disciplina vinculada à turma do aluno."
                  icon={<BookOpen size={36} />}
                />
              )}
            </div>
          </aside>
        </section>
      </SectionShell>
    )
}
