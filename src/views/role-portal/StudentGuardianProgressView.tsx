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

import { CompactSelect, type CompactSelectOption } from '../../components/ui/compact-select'
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
  getStudentAttendanceRateFromLessons,
  getStudentLessonAttendanceRows,
} from '../../lib/lesson-attendance'
import type { RolePortalScreenModel } from './screen-model'

/* ─── Eyebrow ─── */
function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold tracking-[.16em] uppercase text-stone-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

/* ─── Stat tile ─── */
function StatTile({
  label,
  value,
  detail,
  iconBg,
  iconCls,
  icon: Icon,
  index = 0,
}: {
  label: string
  value: React.ReactNode
  detail?: string
  iconBg: string
  iconCls: string
  icon: React.ElementType
  index?: number
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 shadow-sm"
      style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0, animationDelay: `${index * 60}ms` }}
    >
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconBg}`}>
        <Icon size={16} className={iconCls} />
      </div>
      <div className="min-w-0">
        <Eyebrow className="mb-0.5">{label}</Eyebrow>
        <strong className="block truncate text-base font-bold text-stone-900 leading-tight font-['Lora']">
          {value}
        </strong>
        {detail && <span className="block truncate text-[11px] text-stone-400 font-['DM_Sans']">{detail}</span>}
      </div>
    </div>
  )
}

/* ─── Attendance row ─── */
function AttendanceRow({
  record,
  present,
  subject,
  date,
  time,
  index = 0,
}: {
  record: any
  present: boolean
  subject: string
  date: string
  time: string
  index?: number
}) {
  return (
    <article
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 transition hover:border-indigo-200 hover:shadow-sm"
      style={{ animation: 'fadeSlideUp 0.35s ease-out forwards', opacity: 0, animationDelay: `${index * 35}ms` }}
    >
      <div className="min-w-0">
        <strong className="block truncate text-sm font-semibold text-stone-900 font-['DM_Sans']">
          {subject}
        </strong>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-400 font-['DM_Sans']">
          <Clock size={11} />
          {date} {time}
        </span>
      </div>
      <span
        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold font-['DM_Sans'] ${
          present
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-rose-300 bg-rose-50 text-rose-700'
        }`}
      >
        {present ? <CheckCircle size={12} /> : <X size={12} />}
        {present ? 'Presente' : 'Faltou'}
      </span>
    </article>
  )
}

/* ─── Discipline row ─── */
function DisciplineRow({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 transition hover:border-indigo-200"
      style={{ animation: 'fadeSlideUp 0.35s ease-out forwards', opacity: 0, animationDelay: `${index * 40}ms` }}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100">
        <BookOpen size={14} className="text-emerald-600" />
      </span>
      <strong className="text-sm font-semibold text-stone-900 font-['DM_Sans']">{name}</strong>
    </div>
  )
}

/* ─── Info detail row (label + value) ─── */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5">
      <Eyebrow className="mb-0.5">{label}</Eyebrow>
      <strong className="block truncate text-sm font-semibold text-stone-900 font-['DM_Sans']">{value}</strong>
    </div>
  )
}

/* ─── Panel section card ─── */
function PanelSection({
  eyebrow,
  eyebrowCls = 'text-indigo-500',
  title,
  iconBg,
  iconCls,
  icon: Icon,
  children,
  index = 0,
}: {
  eyebrow: string
  eyebrowCls?: string
  title: string
  iconBg: string
  iconCls: string
  icon: React.ElementType
  children: React.ReactNode
  index?: number
}) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
      style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0, animationDelay: `${index * 80}ms` }}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
      <div className="flex items-center gap-3 border-b border-stone-200 bg-stone-50 px-5 py-4">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconBg} shadow-sm`}>
          <Icon size={15} className={iconCls} />
        </div>
        <div>
          <Eyebrow className={`mb-0.5 ${eyebrowCls}`}>{eyebrow}</Eyebrow>
          <h2 className="font-['Lora'] text-sm font-semibold text-stone-900 leading-snug">{title}</h2>
        </div>
      </div>
      <div className="grid gap-3 p-5">{children}</div>
    </section>
  )
}

/* ─── Progress bar row ─── */
function ProgressRow({
  label,
  value,
  max = 100,
  detail,
  tone,
}: {
  label: string
  value: number
  max?: number
  detail?: string
  tone: 'emerald' | 'amber' | 'rose' | 'indigo'
}) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barCls = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-400',
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500',
  }[tone]
  const valueCls = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700',
    indigo: 'text-indigo-700',
  }[tone]

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>{label}</Eyebrow>
        <span className={`text-sm font-bold font-['Lora'] ${valueCls}`}>
          {max === 10 ? value.toFixed(1) : `${value}%`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barCls}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {detail && <span className="text-[11px] text-stone-400 font-['DM_Sans']">{detail}</span>}
    </div>
  )
}

/* ─── Alert strip ─── */
function AlertStrip({ message, tone }: { message: string; tone: 'rose' | 'amber' }) {
  const cls = tone === 'rose'
    ? 'border-rose-300 bg-rose-50 text-rose-800'
    : 'border-amber-300 bg-amber-50 text-amber-800'
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold font-['DM_Sans'] ${cls}`}
      style={{ animation: 'fadeSlideUp 0.35s ease-out forwards', opacity: 0 }}
    >
      <AlertCircle size={16} className="shrink-0" />
      {message}
    </div>
  )
}

/* ══════════════════════════════════════
   Main Component
══════════════════════════════════════ */
export function StudentGuardianProgressView({ model }: { model: RolePortalScreenModel }) {
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
  const isGuardianCombined = profile === 'RESPONSAVEL' && (section === 'child-attendance' || section === 'child-performance')
  const isStudentCombined = profile === 'ALUNO' && (section === 'student-attendance' || section === 'student-performance')
  const isCombined = isGuardianCombined || isStudentCombined
  const isAttendance = !isCombined && section.includes('attendance')
  const classRoom = student ? getClassRoom(student.classId) : undefined
  const disciplines = uniqueAcademicList(
    (classRoom?.bnccFocus ?? [])
      .flatMap(splitAcademicList)
      .map((discipline) => getAcademicSubjectLabel(discipline, evaluationsData?.curriculumSkills ?? [])),
  )
  const score = student?.averageScore ?? 0
  const attendanceRows = getStudentLessonAttendanceRows(student, lessonRecords, attendance, getLessonAttendanceKey)
  const classLessons = attendanceRows.map((row) => row.record)
  const attendanceRate = getAttendanceRateFromRows(attendanceRows) ?? student?.attendanceRate ?? 0
  const hasAcademicAlert = score < 6
  const hasAttendanceAlert = attendanceRate < 75
  const trackedPresentCount = attendanceRows.filter((row) => row.present).length
  const trackedAbsenceCount = attendanceRows.length - trackedPresentCount
  const attendanceStatus = hasAttendanceAlert ? 'Atenção' : 'Em dia'
  const performanceStatus = hasAcademicAlert ? 'Acompanhar' : 'Adequado'
  const guardianChildrenWithAlerts = students.filter((item) => (
    item.averageScore < 6 ||
    getStudentAttendanceRateFromLessons(item, lessonRecords, item.attendanceRate ?? 0, attendance, getLessonAttendanceKey) < 75
  ))
  const guardianAverageScore = students.length
    ? students.reduce((total, item) => total + (item.averageScore ?? 0), 0) / students.length
    : 0
  const guardianAverageAttendance = students.length
    ? Math.round(students.reduce((total, item) => total + getStudentAttendanceRateFromLessons(item, lessonRecords, item.attendanceRate ?? 0, attendance, getLessonAttendanceKey), 0) / students.length)
    : 0
  const guardianClassIds = new Set(students.map((item) => item.classId))
  const guardianLessonCount = lessonRecords.filter((record) => guardianClassIds.has(record.classId)).length

  const guardianStudentOptions: Array<CompactSelectOption<string>> = students.map((item) => ({
    value: item.id,
    label: item.name,
    description: `${getClassName(item.classId)} - ${getSchoolName(item.schoolId)}`,
  }))

  const title = isCombined
    ? 'Frequência e Desempenho'
    : isAttendance
    ? profile === 'ALUNO' ? 'Minha Frequência' : 'Frequência do Aluno'
    : profile === 'ALUNO' ? 'Meu Desempenho' : 'Desempenho do Aluno'

  /* ── summary metrics ── */
  const studentSummaryMetrics = [
    { label: 'Média geral',  value: score.toFixed(1),     detail: 'Escala de 0 a 10',    progress: (score / 10) * 100,    tone: hasAcademicAlert  ? 'amber' as const : 'emerald' as const },
    { label: 'Frequência',   value: `${attendanceRate}%`, detail: 'Meta mínima: 75%',    progress: attendanceRate,         tone: hasAttendanceAlert ? 'rose'  as const : 'emerald' as const },
    { label: 'Alertas',      value: Number(hasAcademicAlert) + Number(hasAttendanceAlert), detail: 'Média ou frequência', progress: hasAcademicAlert || hasAttendanceAlert ? 100 : 0, tone: hasAcademicAlert || hasAttendanceAlert ? 'amber' as const : 'emerald' as const },
    { label: 'Diário',       value: classLessons.length,  detail: 'Aulas na turma',      progress: 100,                    tone: 'indigo' as const },
  ]
  const guardianSummaryMetrics = [
    { label: 'Vinculados',       value: students.length,                    detail: 'Alunos visíveis',    progress: students.length ? 100 : 0,                                              tone: 'indigo'  as const },
    { label: 'Média familiar',   value: guardianAverageScore.toFixed(1),    detail: 'Escala de 0 a 10',  progress: (guardianAverageScore / 10) * 100,                                      tone: guardianAverageScore < 6 ? 'amber' as const : 'emerald' as const },
    { label: 'Frequência média', value: `${guardianAverageAttendance}%`,    detail: 'Meta mínima: 75%',  progress: guardianAverageAttendance,                                              tone: guardianAverageAttendance < 75 ? 'rose' as const : 'emerald' as const },
    { label: 'Alertas',          value: guardianChildrenWithAlerts.length,  detail: 'Média ou frequência', progress: students.length ? (guardianChildrenWithAlerts.length / students.length) * 100 : 0, tone: guardianChildrenWithAlerts.length > 0 ? 'amber' as const : 'emerald' as const },
    { label: 'Diário',           value: guardianLessonCount,                detail: 'Aulas nas turmas',  progress: 100,                                                                    tone: 'indigo'  as const },
  ]
  const summaryMetrics = isStudentCombined ? studentSummaryMetrics : guardianSummaryMetrics

  const toneBarCls: Record<string, string> = {
    emerald: 'bg-emerald-500',
    amber:   'bg-amber-400',
    rose:    'bg-rose-500',
    indigo:  'bg-indigo-500',
  }
  const toneValueCls: Record<string, string> = {
    emerald: 'text-emerald-700',
    amber:   'text-amber-700',
    rose:    'text-rose-700',
    indigo:  'text-indigo-700',
  }

  return (
    <SectionShell
      label={profile === 'ALUNO' ? 'Aluno' : 'Responsável'}
      title={title}
      description={
        isStudentCombined
          ? 'Consulte frequência, desempenho e alertas em uma única visão.'
          : isGuardianCombined
          ? 'Selecione um filho vinculado para consultar frequência, desempenho e alertas individuais.'
          : 'Dados filtrados apenas para o aluno permitido pelo perfil logado.'
      }
      icon={isAttendance ? <ListChecks size={20} /> : <BarChart3 size={20} />}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shimmer { to { transform: translateX(200%) } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* Selector for multiple students (non-combined) */}
      {students.length > 1 && !isCombined && (
        <div
          className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
          style={{ animation: 'fadeSlideUp 0.35s ease-out forwards', opacity: 0 }}
        >
          <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-100">
              <UserRound size={13} className="text-indigo-600" />
            </div>
            <Eyebrow className="text-stone-500">Aluno</Eyebrow>
            <CompactSelect
              value={student?.id ?? ''}
              options={students.map((s) => ({
                value: s.id,
                label: s.name,
                description: getClassName(s.classId),
              }))}
              onChange={setSelectedStudentId}
              className="ml-auto min-h-9 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-900 font-['DM_Sans']"
              dropdownWidth="trigger"
            />
          </div>
        </div>
      )}

      {student ? (
        isCombined ? (
          /* ═══════════════════════════════
             COMBINED VIEW (student + guardian)
          ═══════════════════════════════ */
          <>
            {/* Summary metrics strip */}
            <section
              className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
              style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0 }}
            >
              <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
              <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <Eyebrow className="mb-3 text-indigo-500">
                    {isStudentCombined ? 'Resumo do aluno' : 'Resumo dos filhos'}
                  </Eyebrow>
                  <div className={`grid gap-2 sm:grid-cols-2 ${isStudentCombined ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}>
                    {summaryMetrics.map((metric) => (
                      <div key={metric.label} className="grid gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <Eyebrow>{metric.label}</Eyebrow>
                          <span className={`text-sm font-bold font-['Lora'] ${toneValueCls[metric.tone]}`}>
                            {metric.value}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-300">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${toneBarCls[metric.tone]}`}
                            style={{ width: `${Math.min(100, metric.progress)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-stone-400 font-['DM_Sans']">{metric.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {isGuardianCombined && guardianStudentOptions.length > 0 && (
                  <div className="grid min-w-0 gap-1.5 lg:w-[300px]">
                    <Eyebrow className="text-stone-500">Filho selecionado</Eyebrow>
                    <CompactSelect
                      value={student.id}
                      options={guardianStudentOptions}
                      onChange={setSelectedStudentId}
                      ariaLabel="Selecionar filho"
                      disabled={guardianStudentOptions.length <= 1}
                      className="min-h-10 rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-900 shadow-sm transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 font-['DM_Sans']"
                      dropdownWidth="trigger"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Student info bar */}
            <section
              className="grid gap-2 rounded-xl border border-stone-300 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-4"
              style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0, animationDelay: '60ms' }}
            >
              {[
                ['Aluno selecionado', student.name],
                ['Turma',            getClassName(student.classId)],
                ['Escola',           getSchoolName(student.schoolId)],
                ['Situação',         hasAcademicAlert || hasAttendanceAlert ? 'Acompanhar' : 'Em dia'],
              ].map(([label, value]) => (
                <DetailRow key={label} label={label} value={value} />
              ))}
            </section>

            {/* Alert strip */}
            {(hasAcademicAlert || hasAttendanceAlert) && (
              <AlertStrip
                tone={hasAcademicAlert && hasAttendanceAlert ? 'rose' : 'amber'}
                message={
                  hasAcademicAlert && hasAttendanceAlert
                    ? 'Média e frequência precisam de acompanhamento.'
                    : hasAcademicAlert
                    ? 'Desempenho abaixo do esperado. Acompanhe avaliações e atividades.'
                    : 'Frequência abaixo do esperado. Acompanhe as faltas recentes.'
                }
              />
            )}

            {/* Two panels */}
            <div className="grid gap-4 xl:grid-cols-2">
              {/* Performance panel */}
              <PanelSection
                eyebrow="Desempenho"
                eyebrowCls="text-indigo-500"
                title="Notas, turma e disciplinas"
                icon={BarChart3}
                iconBg="bg-indigo-100"
                iconCls="text-indigo-600"
                index={2}
              >
                <ProgressRow
                  label="Média geral"
                  value={score}
                  max={10}
                  detail="Escala de 0 a 10"
                  tone={hasAcademicAlert ? 'amber' : 'emerald'}
                />
                {disciplines.map((discipline, i) => (
                  <DisciplineRow key={discipline} name={discipline} index={i} />
                ))}
                {disciplines.length === 0 && (
                  <EmptyState message="Nenhuma disciplina vinculada à turma do aluno." icon={<BookOpen size={36} />} />
                )}
              </PanelSection>

              {/* Attendance panel */}
              <PanelSection
                eyebrow="Frequência"
                eyebrowCls="text-emerald-600"
                title="Presenças e faltas registradas"
                icon={ListChecks}
                iconBg="bg-emerald-100"
                iconCls="text-emerald-600"
                index={3}
              >
                <ProgressRow
                  label="Frequência geral"
                  value={attendanceRate}
                  detail="Meta mínima sugerida: 75%"
                  tone={hasAttendanceAlert ? 'rose' : 'emerald'}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5">
                    <Eyebrow className="mb-0.5 text-emerald-600">Presenças</Eyebrow>
                    <strong className="text-lg font-bold text-emerald-700 font-['Lora']">
                      {attendanceRows.length ? trackedPresentCount : '—'}
                    </strong>
                  </div>
                  <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5">
                    <Eyebrow className="mb-0.5 text-rose-600">Faltas</Eyebrow>
                    <strong className="text-lg font-bold text-rose-700 font-['Lora']">
                      {attendanceRows.length ? trackedAbsenceCount : '—'}
                    </strong>
                  </div>
                </div>
                {attendanceRows.slice(0, 6).map(({ record, present }, i) => (
                  <AttendanceRow
                    key={`${record.id}:${student.id}`}
                    record={record}
                    present={present}
                    subject={getAcademicSubjectLabel(record.subject, evaluationsData?.curriculumSkills ?? [])}
                    date={formatReservationDate(record.date)}
                    time={record.time}
                    index={i}
                  />
                ))}
                {attendanceRows.length === 0 && (
                  <EmptyState message="Nenhum registro de aula encontrado para montar o histórico de frequência." icon={<ClipboardList size={36} />} />
                )}
              </PanelSection>
            </div>
          </>
        ) : isAttendance ? (
          /* ═══════════════════════════════
             ATTENDANCE-ONLY VIEW
          ═══════════════════════════════ */
          <>
            {hasAttendanceAlert && (
              <AlertStrip
                tone="rose"
                message="Frequência abaixo do esperado. Acompanhe as faltas recentes e procure a escola se necessário."
              />
            )}

            {/* Stats */}
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Frequência geral',  value: `${attendanceRate}%`,                                         detail: 'Percentual consolidado',                                              iconBg: hasAttendanceAlert ? 'bg-rose-100'    : 'bg-emerald-100', iconCls: hasAttendanceAlert ? 'text-rose-600'    : 'text-emerald-600', icon: Activity       },
                { label: 'Situação',          value: attendanceStatus,                                             detail: hasAttendanceAlert ? 'Precisa recuperar presença' : 'Dentro do esperado', iconBg: hasAttendanceAlert ? 'bg-rose-100' : 'bg-emerald-100', iconCls: hasAttendanceAlert ? 'text-rose-600' : 'text-emerald-600', icon: hasAttendanceAlert ? AlertCircle : CheckCircle },
                { label: 'Aulas no diário',   value: classLessons.length,                                          detail: classRoom ? `${classRoom.name} · ${classRoom.shift}` : 'Turma não localizada', iconBg: 'bg-indigo-100', iconCls: 'text-indigo-600', icon: ClipboardList  },
                { label: 'Faltas registradas',value: classLessons.length ? trackedAbsenceCount : '—',             detail: classLessons.length ? `${trackedPresentCount} presença(s) neste diário` : 'Sem diário vinculado', iconBg: trackedAbsenceCount > 0 ? 'bg-amber-100' : 'bg-emerald-100', iconCls: trackedAbsenceCount > 0 ? 'text-amber-600' : 'text-emerald-600', icon: ListChecks },
              ].map((s, i) => (
                <StatTile key={s.label} {...s} index={i} />
              ))}
            </section>

            {/* Content */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <PanelSection
                eyebrow="Histórico de presença"
                eyebrowCls="text-emerald-600"
                title="Aulas registradas para a turma"
                icon={ListChecks}
                iconBg="bg-emerald-100"
                iconCls="text-emerald-600"
                index={1}
              >
                {attendanceRows.map(({ record, present }, i) => (
                  <AttendanceRow
                    key={`${record.id}:${student.id}`}
                    record={record}
                    present={present}
                    subject={getAcademicSubjectLabel(record.subject, evaluationsData?.curriculumSkills ?? [])}
                    date={formatReservationDate(record.date)}
                    time={record.time}
                    index={i}
                  />
                ))}
                {attendanceRows.length === 0 && (
                  <EmptyState message="Nenhum registro de aula encontrado para montar o histórico de frequência." icon={<ClipboardList size={36} />} />
                )}
              </PanelSection>

              {/* Sidebar */}
              <aside
                className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
                style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0, animationDelay: '120ms' }}
              >
                <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
                  <Eyebrow className="mb-0.5 text-indigo-500">Resumo do aluno</Eyebrow>
                  <h2 className="font-['Lora'] text-sm font-semibold text-stone-900">{student.name}</h2>
                </div>
                <div className="grid gap-3 p-5">
                  <ProgressRow
                    label="Presença"
                    value={attendanceRate}
                    detail="Meta mínima sugerida: 75%"
                    tone={hasAttendanceAlert ? 'rose' : 'emerald'}
                  />
                  <DetailRow label="Escola"   value={getSchoolName(student.schoolId)} />
                  <DetailRow label="Turma"    value={getClassName(student.classId)} />
                  <DetailRow label="Horário"  value={classRoom?.schedule || 'Não informado'} />
                </div>
              </aside>
            </div>
          </>
        ) : (
          /* ═══════════════════════════════
             PERFORMANCE-ONLY VIEW
          ═══════════════════════════════ */
          <>
            {hasAcademicAlert && (
              <AlertStrip
                tone="amber"
                message="Desempenho abaixo do esperado. Vale acompanhar notas, atividades e disciplinas com maior dificuldade."
              />
            )}

            {/* Stats */}
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Média geral',  value: score.toFixed(1),          detail: 'Resultado acadêmico consolidado',                               iconBg: hasAcademicAlert ? 'bg-amber-100' : 'bg-emerald-100', iconCls: hasAcademicAlert ? 'text-amber-600' : 'text-emerald-600', icon: Award          },
                { label: 'Situação',     value: performanceStatus,          detail: hasAcademicAlert ? 'Precisa de acompanhamento' : 'Dentro do esperado', iconBg: hasAcademicAlert ? 'bg-amber-100' : 'bg-emerald-100', iconCls: hasAcademicAlert ? 'text-amber-600' : 'text-emerald-600', icon: hasAcademicAlert ? AlertCircle : CheckCircle },
                { label: 'Turma',        value: getClassName(student.classId), detail: getSchoolName(student.schoolId),                            iconBg: 'bg-violet-100', iconCls: 'text-violet-600', icon: GraduationCap  },
                { label: 'Disciplinas',  value: disciplines.length || '—', detail: 'Componentes vinculados à turma',                               iconBg: 'bg-sky-100',    iconCls: 'text-sky-600',    icon: BookOpen       },
              ].map((s, i) => (
                <StatTile key={s.label} {...s} index={i} />
              ))}
            </section>

            {/* Content */}
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <PanelSection
                eyebrow="Evolução acadêmica"
                eyebrowCls="text-indigo-500"
                title="Indicadores de desempenho"
                icon={BarChart3}
                iconBg="bg-indigo-100"
                iconCls="text-indigo-600"
                index={1}
              >
                <ProgressRow
                  label="Média geral"
                  value={score}
                  max={10}
                  detail="Escala de 0 a 10"
                  tone={hasAcademicAlert ? 'amber' : 'emerald'}
                />
                <ProgressRow
                  label="Frequência"
                  value={attendanceRate}
                  detail="Contexto de presença nas aulas"
                  tone={hasAttendanceAlert ? 'rose' : 'emerald'}
                />
                <div
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
                  style={{ animation: 'fadeSlideUp 0.35s ease-out forwards', opacity: 0, animationDelay: '120ms' }}
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 font-['DM_Sans']">
                    <Target size={13} className="text-indigo-500 shrink-0" />
                    Leitura pedagógica
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-stone-500 font-['DM_Sans']">
                    {hasAcademicAlert
                      ? 'Priorize revisão dos conteúdos recentes e converse com a escola sobre atividades de recuperação.'
                      : 'O desempenho geral está adequado. Continue acompanhando avaliações e devolutivas da turma.'}
                  </p>
                </div>
              </PanelSection>

              {/* Sidebar */}
              <aside
                className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
                style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0, animationDelay: '120ms' }}
              >
                <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
                  <Eyebrow className="mb-0.5 text-emerald-600">Grade da turma</Eyebrow>
                  <h2 className="font-['Lora'] text-sm font-semibold text-stone-900">Disciplinas acompanhadas</h2>
                </div>
                <div className="grid gap-2 p-5">
                  {disciplines.map((discipline, i) => (
                    <DisciplineRow key={discipline} name={discipline} index={i} />
                  ))}
                  {disciplines.length === 0 && (
                    <EmptyState message="Nenhuma disciplina vinculada à turma do aluno." icon={<BookOpen size={36} />} />
                  )}
                </div>
              </aside>
            </div>
          </>
        )
      ) : (
        <EmptyState
          message="Nenhum aluno vinculado ao perfil atual."
          icon={<UserRound size={40} />}
        />
      )}
    </SectionShell>
  )
}