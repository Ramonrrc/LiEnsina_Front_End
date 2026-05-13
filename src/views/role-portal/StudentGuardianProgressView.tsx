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
  getSubjectIcon,
  getSubjectIconBg,
  normalizeAcademicText,
  getClassStudents,
  getSubjectAccent,
} from '../../components/role-portal/portal-components'
import type { RolePortalScreenModel } from './screen-model'

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
    const disciplines = classRoom?.bnccFocus ?? []
    const score = student?.averageScore ?? 0
    const attendanceRate = student?.attendanceRate ?? 0
    const hasAcademicAlert = score < 6
    const hasAttendanceAlert = attendanceRate < 75
    const classLessons = student
      ? [...lessonRecords]
          .filter((record) => record.classId === student.classId)
          .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
      : []
    const attendanceRows = student
      ? classLessons.map((record) => ({
          record,
          present: attendance[getLessonAttendanceKey(record, student.id)] ?? true,
        }))
      : []
    const trackedPresentCount = attendanceRows.filter((row) => row.present).length
    const trackedAbsenceCount = attendanceRows.length - trackedPresentCount
    const attendanceStatus = hasAttendanceAlert ? 'Atenção' : 'Em dia'
    const performanceStatus = hasAcademicAlert ? 'Acompanhar' : 'Adequado'
    const guardianChildrenWithAlerts = students.filter((item) => item.averageScore < 6 || item.attendanceRate < 75)
    const guardianAverageScore = students.length
      ? students.reduce((total, item) => total + (item.averageScore ?? 0), 0) / students.length
      : 0
    const guardianAverageAttendance = students.length
      ? Math.round(students.reduce((total, item) => total + (item.attendanceRate ?? 0), 0) / students.length)
      : 0
    const guardianClassIds = new Set(students.map((item) => item.classId))
    const guardianLessonCount = lessonRecords.filter((record) => guardianClassIds.has(record.classId)).length
    const combinedSummaryMetrics = isStudentCombined
      ? [
          { label: 'Media geral', value: score.toFixed(1), detail: 'Escala de 0 a 10', progress: (score / 10) * 100, tone: hasAcademicAlert ? 'amber' as const : 'emerald' as const },
          { label: 'Frequencia', value: `${attendanceRate}%`, detail: 'Meta minima: 75%', progress: attendanceRate, tone: hasAttendanceAlert ? 'rose' as const : 'emerald' as const },
          { label: 'Alertas', value: Number(hasAcademicAlert) + Number(hasAttendanceAlert), detail: 'Media ou frequencia', progress: hasAcademicAlert || hasAttendanceAlert ? 100 : 0, tone: hasAcademicAlert || hasAttendanceAlert ? 'amber' as const : 'emerald' as const },
          { label: 'Diario', value: classLessons.length, detail: 'Aulas na turma', progress: (classLessons.length / Math.max(1, classLessons.length || 5)) * 100, tone: 'indigo' as const },
        ]
      : [
          { label: 'Vinculados', value: students.length, detail: 'Alunos visiveis', progress: students.length ? 100 : 0, tone: 'indigo' as const },
          { label: 'Media familiar', value: guardianAverageScore.toFixed(1), detail: 'Escala de 0 a 10', progress: (guardianAverageScore / 10) * 100, tone: guardianAverageScore < 6 ? 'amber' as const : 'emerald' as const },
          { label: 'Frequencia media', value: `${guardianAverageAttendance}%`, detail: 'Meta minima: 75%', progress: guardianAverageAttendance, tone: guardianAverageAttendance < 75 ? 'rose' as const : 'emerald' as const },
          { label: 'Alertas', value: guardianChildrenWithAlerts.length, detail: 'Media ou frequencia', progress: students.length ? (guardianChildrenWithAlerts.length / students.length) * 100 : 0, tone: guardianChildrenWithAlerts.length > 0 ? 'amber' as const : 'emerald' as const },
          { label: 'Diario', value: guardianLessonCount, detail: 'Aulas nas turmas', progress: (guardianLessonCount / Math.max(1, students.length * 5)) * 100, tone: 'indigo' as const },
        ]
    const guardianStudentOptions: Array<CompactSelectOption<string>> = students.map((item) => ({
      value: item.id,
      label: item.name,
      description: `${getClassName(item.classId)} - ${getSchoolName(item.schoolId)}`,
    }))
    const title = isCombined
      ? 'Frequência e Desempenho'
      : isAttendance
      ? profile === 'ALUNO'
        ? 'Minha Frequência'
        : 'Frequência do Aluno'
      : profile === 'ALUNO'
        ? 'Meu Desempenho'
        : 'Desempenho do Aluno'

    return (
      <SectionShell
        label={profile === 'ALUNO' ? 'Aluno' : 'Responsável'}
        title={title}
        description={
          isStudentCombined
            ? 'Consulte frequencia, desempenho e alertas em uma unica visao.'
            : isGuardianCombined
            ? 'Selecione um filho vinculado para consultar frequência, desempenho e alertas individuais.'
            : 'Dados filtrados apenas para o aluno permitido pelo perfil logado.'
        }
        icon={isAttendance ? <ListChecks size={20} /> : <BarChart3 size={20} />}
      >
        {students.length > 1 && !isCombined && (
          <CompactSelect
            value={student?.id ?? ''}
            options={students.map((s) => ({
              value: s.id,
              label: s.name,
              description: getClassName(s.classId),
            }))}
            onChange={setSelectedStudentId}
            className="mb-1 min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"
            dropdownWidth="trigger"
          />
        )}
        {student ? (
          isCombined ? (
            <>
              <section className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
                      {isStudentCombined ? 'Resumo do aluno' : 'Resumo dos filhos'}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      {(isStudentCombined ? combinedSummaryMetrics : [
                        {
                          label: 'Vinculados',
                          value: students.length,
                          detail: 'Alunos visíveis',
                          progress: students.length ? 100 : 0,
                          tone: 'indigo' as const,
                        },
                        {
                          label: 'Média familiar',
                          value: guardianAverageScore.toFixed(1),
                          detail: 'Escala de 0 a 10',
                          progress: (guardianAverageScore / 10) * 100,
                          tone: guardianAverageScore < 6 ? 'amber' as const : 'emerald' as const,
                        },
                        {
                          label: 'Frequência média',
                          value: `${guardianAverageAttendance}%`,
                          detail: 'Meta mínima: 75%',
                          progress: guardianAverageAttendance,
                          tone: guardianAverageAttendance < 75 ? 'rose' as const : 'emerald' as const,
                        },
                        {
                          label: 'Alertas',
                          value: guardianChildrenWithAlerts.length,
                          detail: 'Média ou frequência',
                          progress: students.length ? (guardianChildrenWithAlerts.length / students.length) * 100 : 0,
                          tone: guardianChildrenWithAlerts.length > 0 ? 'amber' as const : 'emerald' as const,
                        },
                        {
                          label: 'Diário',
                          value: guardianLessonCount,
                          detail: 'Aulas nas turmas',
                          progress: (guardianLessonCount / Math.max(1, students.length * 5)) * 100,
                          tone: 'indigo' as const,
                        },
                      ]).map((metric) => (
                        <CompactProgressMetric
                          key={metric.label}
                          label={metric.label}
                          value={metric.value}
                          detail={metric.detail}
                          progress={metric.progress}
                          tone={metric.tone}
                        />
                      ))}
                    </div>
                  </div>
                  {isGuardianCombined && guardianStudentOptions.length > 0 && (
                    <div className="grid min-w-0 gap-1.5 lg:w-[340px]">
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        <UserRound size={12} />
                        Filho
                      </span>
                      <CompactSelect
                        value={student.id}
                        options={guardianStudentOptions}
                        onChange={setSelectedStudentId}
                        ariaLabel="Selecionar filho"
                        disabled={guardianStudentOptions.length <= 1}
                        className="min-h-11 rounded-sm border border-slate-500 bg-white px-3 text-sm font-black text-slate-900 shadow-sm transition focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                        dropdownWidth="trigger"
                      />
                    </div>
                  )}
                </div>
              </section>

              <section className="grid gap-2 rounded-xl border border-slate-300 bg-white p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Aluno selecionado', student.name],
                  ['Turma', getClassName(student.classId)],
                  ['Escola', getSchoolName(student.schoolId)],
                  ['Situação', hasAcademicAlert || hasAttendanceAlert ? 'Acompanhar' : 'Em dia'],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {label}
                    </span>
                    <strong className="mt-0.5 block truncate text-sm font-black text-slate-900">
                      {value}
                    </strong>
                  </div>
                ))}
              </section>

              {(hasAcademicAlert || hasAttendanceAlert) && (
                <AlertBanner
                  message={
                    hasAcademicAlert && hasAttendanceAlert
                      ? 'Média e frequência precisam de acompanhamento.'
                      : hasAcademicAlert
                        ? 'Desempenho abaixo do esperado. Acompanhe avaliações e atividades.'
                        : 'Frequência abaixo do esperado. Acompanhe as faltas recentes.'
                  }
                  tone={hasAcademicAlert && hasAttendanceAlert ? 'rose' : 'amber'}
                  soft
                />
              )}

              <section className="grid gap-4 xl:grid-cols-2">
                <PanelCard
                  soft
                  header={
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
                        <BarChart3 size={18} />
                      </span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
                          Desempenho
                        </p>
                        <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">
                          Notas, turma e disciplinas
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
                    icon={<Star className="text-amber-400 fill-amber-400" size={15} />}
                    soft
                  />
                  <div className="grid gap-2">
                    {disciplines.map((discipline) => (
                      <div
                        key={discipline}
                        className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white p-3"
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
                </PanelCard>

                <PanelCard
                  soft
                  header={
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                        <ListChecks size={18} />
                      </span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
                          Frequência
                        </p>
                        <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">
                          Presenças e faltas registradas
                        </h2>
                      </div>
                    </div>
                  }
                >
                  <MetricProgress
                    label="Frequência geral"
                    value={attendanceRate}
                    detail="Meta mínima sugerida: 75%"
                    tone={hasAttendanceAlert ? 'rose' : 'emerald'}
                    icon={<Activity size={15} />}
                    soft
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-emerald-400 bg-emerald-50 px-3 py-2.5">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-600">
                        Presenças
                      </span>
                      <strong className="mt-0.5 block text-lg font-black text-emerald-700">
                        {attendanceRows.length ? trackedPresentCount : '—'}
                      </strong>
                    </div>
                    <div className="rounded-xl border border-rose-400 bg-rose-50 px-3 py-2.5">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-rose-600">
                        Faltas
                      </span>
                      <strong className="mt-0.5 block text-lg font-black text-rose-700">
                        {attendanceRows.length ? trackedAbsenceCount : '—'}
                      </strong>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    {attendanceRows.slice(0, 6).map(({ record, present }, i) => (
                      <article
                        key={`${record.id}:${student.id}`}
                        className="animate-fade-slide-up flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white p-3"
                        style={{ animationDelay: `${i * 35}ms` }}
                      >
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-black text-slate-900">
                            {record.subject}
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
                        message="Nenhum registro de aula encontrado para montar o histórico de frequência."
                        icon={<ClipboardList size={36} />}
                      />
                    )}
                  </div>
                </PanelCard>
              </section>
            </>
          ) : isAttendance ? (
            <>
              {hasAttendanceAlert && (
                <AlertBanner
                  message="Frequência abaixo do esperado. Acompanhe as faltas recentes e procure a escola se necessário."
                  tone="rose"
                  soft
                />
              )}

              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  label="Frequência geral"
                  value={`${attendanceRate}%`}
                  detail="Percentual consolidado de presença"
                  tone={hasAttendanceAlert ? 'rose' : 'emerald'}
                  icon={<Activity size={18} />}
                  delay={0}
                  soft
                />
                <InfoCard
                  label="Situação"
                  value={attendanceStatus}
                  detail={hasAttendanceAlert ? 'Precisa recuperar presença' : 'Dentro do esperado'}
                  tone={hasAttendanceAlert ? 'rose' : 'emerald'}
                  icon={hasAttendanceAlert ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                  delay={60}
                  soft
                />
                <InfoCard
                  label="Aulas no diário"
                  value={classLessons.length}
                  detail={classRoom ? `${classRoom.name} - ${classRoom.shift}` : 'Turma não localizada'}
                  icon={<ClipboardList size={18} />}
                  delay={120}
                  soft
                />
                <InfoCard
                  label="Faltas registradas"
                  value={classLessons.length ? trackedAbsenceCount : '—'}
                  detail={classLessons.length ? `${trackedPresentCount} presença(s) neste diário` : 'Sem diário vinculado'}
                  tone={trackedAbsenceCount > 0 ? 'amber' : 'emerald'}
                  icon={<ListChecks size={18} />}
                  delay={180}
                  soft
                />
              </section>

              <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <PanelCard
                  soft
                  header={
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                        <ListChecks size={18} />
                      </span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
                          Histórico de presença
                        </p>
                        <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">
                          Aulas registradas para a turma
                        </h2>
                      </div>
                    </div>
                  }
                >
                  {attendanceRows.map(({ record, present }, i) => (
                    <article
                      key={`${record.id}:${student.id}`}
                      className="animate-fade-slide-up flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white p-3"
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      <div className="min-w-0">
                        <strong className="block truncate text-sm font-black text-slate-900">
                          {record.subject}
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
                      message="Nenhum registro de aula encontrado para montar o histórico de frequência."
                      icon={<ClipboardList size={36} />}
                    />
                  )}
                </PanelCard>

                <aside className="animate-fade-slide-up rounded-2xl border border-slate-300 bg-white p-4 shadow-md">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
                    Resumo do aluno
                  </p>
                  <h2 className="mt-1 font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-900">
                    {student.name}
                  </h2>
                  <div className="mt-4 grid gap-3">
                    <MetricProgress
                      label="Presença"
                      value={attendanceRate}
                      detail="Meta mínima sugerida: 75%"
                      tone={hasAttendanceAlert ? 'rose' : 'emerald'}
                      icon={<Activity size={15} />}
                      soft
                    />
                    {[
                      ['Escola', getSchoolName(student.schoolId)],
                      ['Turma', getClassName(student.classId)],
                      ['Horário', classRoom?.schedule || 'Não informado'],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5"
                      >
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {label}
                        </span>
                        <strong className="mt-0.5 block text-sm font-black text-slate-900">
                          {value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </aside>
              </section>
            </>
          ) : (
            <>
              {hasAcademicAlert && (
                <AlertBanner
                  message="Desempenho abaixo do esperado. Vale acompanhar notas, atividades e disciplinas com maior dificuldade."
                  tone="amber"
                  soft
                />
              )}

              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  label="Média geral"
                  value={score.toFixed(1)}
                  detail="Resultado acadêmico consolidado"
                  tone={hasAcademicAlert ? 'amber' : 'emerald'}
                  icon={<Award size={18} />}
                  delay={0}
                  soft
                />
                <InfoCard
                  label="Situação"
                  value={performanceStatus}
                  detail={hasAcademicAlert ? 'Precisa de acompanhamento' : 'Dentro do esperado'}
                  tone={hasAcademicAlert ? 'amber' : 'emerald'}
                  icon={hasAcademicAlert ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                  delay={60}
                  soft
                />
                <InfoCard
                  label="Turma"
                  value={getClassName(student.classId)}
                  detail={getSchoolName(student.schoolId)}
                  icon={<GraduationCap size={18} />}
                  delay={120}
                  soft
                />
                <InfoCard
                  label="Disciplinas"
                  value={disciplines.length || '—'}
                  detail="Componentes vinculados à turma"
                  icon={<BookOpen size={18} />}
                  delay={180}
                  soft
                />
              </section>

              <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <PanelCard
                  soft
                  header={
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-600">
                        <BarChart3 size={18} />
                      </span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">
                          Evolução acadêmica
                        </p>
                        <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">
                          Indicadores de desempenho
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
                    label="Frequência"
                    value={attendanceRate}
                    detail="Contexto de presença nas aulas"
                    tone={hasAttendanceAlert ? 'rose' : 'emerald'}
                    icon={<Activity size={15} />}
                    delay={100}
                    soft
                  />
                  <div className="animate-fade-slide-up rounded-xl border border-slate-300 bg-slate-50 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-black text-slate-900">
                      <Target size={14} className="text-indigo-500" />
                      Leitura pedagógica
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      {hasAcademicAlert
                        ? 'Priorize revisão dos conteúdos recentes e converse com a escola sobre atividades de recuperação.'
                        : 'O desempenho geral está adequado. Continue acompanhando avaliações e devolutivas da turma.'}
                    </p>
                  </div>
                </PanelCard>

                <aside className="animate-fade-slide-up overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md">
                  <div className="border-b border-slate-300 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
                      Grade da turma
                    </p>
                    <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">
                      Disciplinas acompanhadas
                    </h2>
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
