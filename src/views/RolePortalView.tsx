import { FormEvent, useMemo, useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { z } from 'zod'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  ListChecks,
  Save,
  UserRound,
  Users,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Clock,
  BookMarked,
  Zap,
  Target,
  Star,
  AlertCircle,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  School,
  Layers,
  FileText,
  PenLine,
  LayoutGrid,
  FlaskConical,
  Globe,
  Music,
  Dumbbell,
  Palette,
  Calculator,
  Microscope,
  BookText,
  ArrowRight,
  BadgeCheck,
  Flame,
  BarChart2,
  UserCheck,
} from 'lucide-react'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import DateInput from '../components/ui/date-input'
import { FieldMessage, fieldStateClass, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { PedagogicalDashboard } from './role-portal/PedagogicalDashboard'
import { PedagogyPortalView } from './role-portal/PedagogyPortalView'
import { TeacherSubjectsView } from './role-portal/TeacherSubjectsView'
import { RoomReservationsView } from './role-portal/RoomReservationsView'
import { LessonRecordsView } from './role-portal/LessonRecordsView'
import { AttendanceListView } from './role-portal/AttendanceListView'
import { StudentLegacyPerformanceView } from './role-portal/StudentLegacyPerformanceView'
import { StudentGuardianProgressView } from './role-portal/StudentGuardianProgressView'
import { StudentGradesView } from './role-portal/StudentGradesView'
import { RolePortalFallbackView } from './role-portal/RolePortalFallbackView'
import type { RolePortalFileResponse, RolePortalScreenModel } from './role-portal/screen-model'
import { formatClassGrade } from '../class-grade-options'
import {
  ActionButton,
  AlertBanner,
  EmptyState,
  InfoCard,
  InfoCardSkeleton,
  LockedSchoolField,
  MetricProgress,
  PanelCard,
  SectionHeader,
  SectionShell,
  StudentCardSkeleton,
  classMatchesSubject,
  classOptions,
  getAcademicSubjectLabel,
  getOfficialAcademicSubjectLabel,
  getOfficialAcademicSubjectList,
  getOfficialAcademicSubjectListForGrade,
  getAverage,
  getClassStudents,
  getSubjectAccent,
  getSubjectIcon,
  getSubjectIconBg,
  normalizeAcademicText,
  uniqueAcademicList,
} from '../components/role-portal/portal-components'
import {
  getAverageLessonAttendanceRate,
  getLessonRecordsAttendanceState,
  getStudentAttendanceRateFromLessons,
} from '../lib/lesson-attendance'
import type {
  AppSection,
  ClassRoom,
  CreateLessonRecordPayload,
  CreateRoomReservationPayload,
  EvaluationCorrection,
  EvaluationDownloadKind,
  EvaluationsScreenPayload,
  LessonRecord,
  Role,
  RoleCode,
  RoomReservation,
  SchoolsScreenPayload,
  Student,
  StudentSubjectCardsPagePayload,
  StudentSubjectsPageQuery,
  TeacherSubjectCardsPagePayload,
  TeacherSubjectsPageQuery,
  UpdateLessonRecordPayload,
  UserAccount,
} from '../types'

interface RolePortalViewProps {
  section: AppSection
  profile: RoleCode
  currentUser: UserAccount
  currentRole: Role | null
  schoolsData: SchoolsScreenPayload
  evaluationsData?: Pick<
    EvaluationsScreenPayload,
    'evaluations' | 'evaluationCorrections' | 'curriculumSkills' | 'assessmentDescriptors' | 'questionBank'
  >
  onCreateRoomReservation?: (draft: CreateRoomReservationPayload) => Promise<RoomReservation>
  onCreateLessonRecord?: (draft: CreateLessonRecordPayload) => Promise<LessonRecord>
  onUpdateLessonRecord?: (id: string, draft: UpdateLessonRecordPayload) => Promise<LessonRecord>
  onLoadTeacherSubjectCardsPage?: (params: TeacherSubjectsPageQuery) => Promise<TeacherSubjectCardsPagePayload>
  onLoadStudentSubjectCardsPage?: (params: StudentSubjectsPageQuery) => Promise<StudentSubjectCardsPagePayload>
  onLoadEvaluationsData?: () => Promise<Pick<
    EvaluationsScreenPayload,
    'evaluations' | 'evaluationCorrections' | 'curriculumSkills' | 'assessmentDescriptors' | 'questionBank'
  >>
  onDownloadEvaluation?: (evaluationId: string) => Promise<void>
  onDownloadAnswerKey?: (evaluationId: string) => Promise<void>
  onLoadEvaluationFile?: (evaluationId: string, kind?: EvaluationDownloadKind) => Promise<RolePortalFileResponse>
  onLoadCorrectionDetail?: (correctionId: string) => Promise<EvaluationCorrection>
  onLoadCorrectionCardPreview?: (correctionId: string) => Promise<RolePortalFileResponse>
}


const today = new Date().toISOString().slice(0, 10)
const lessonHistoryPageSize = 5
const requiredLessonText = (message: string) => z.string().trim().min(1, message)
const lessonRecordSchema = z.object({
  classId: requiredLessonText('Selecione uma turma para registrar a aula.'),
  subject: requiredLessonText('Informe a matéria da aula.'),
  date: requiredLessonText('Informe a data da aula.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`)
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
    }, 'Informe uma data válida.'),
  time: requiredLessonText('Selecione o horário da aula.')
    .regex(/^\d{2}:\d{2}$/, 'Horário da aula deve usar HH:mm.'),
  content: requiredLessonText('Informe o conteúdo ministrado.'),
  plan: requiredLessonText('Informe o plano de aula.'),
  resources: requiredLessonText('Informe os recursos utilizados.'),
  activity: requiredLessonText('Informe a atividade da aula.'),
  notes: z.string().trim().optional(),
})
const reservationSchema = z.object({
  room: requiredLessonText('Informe o ambiente da reserva.').min(2, 'Ambiente deve ter pelo menos 2 caracteres.'),
  date: requiredLessonText('Informe a data da reserva.')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.'),
  startTime: requiredLessonText('Selecione o horário de início.'),
  endTime: requiredLessonText('Selecione o horário de fim.'),
  classId: requiredLessonText('Selecione uma turma para reservar o ambiente.'),
  purpose: requiredLessonText('Informe a finalidade da reserva.').min(3, 'Finalidade deve ter pelo menos 3 caracteres.'),
}).refine((value) => value.endTime > value.startTime, {
  path: ['endTime'],
  message: 'Horário final precisa ser posterior ao início.',
})
type LessonRecordFormField = keyof z.infer<typeof lessonRecordSchema>
type ReservationFormField = keyof z.infer<typeof reservationSchema>
const reservationTimeOptions: CompactSelectOption[] = Array.from({ length: 23 }, (_, index) => {
  const totalMinutes = 7 * 60 + index * 30
  const hour = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const value = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  return { value, label: `${hour}:${String(minutes).padStart(2, '0')}` }
})
const reservationStartTimeOptions = reservationTimeOptions.slice(0, -1)

function compareTeacherSubjectCardsByPriority(
  first: { subject: string; classes: ClassRoom[]; lessons: LessonRecord[] },
  second: { subject: string; classes: ClassRoom[]; lessons: LessonRecord[] },
) {
  const firstHasClasses = first.classes.length > 0 ? 1 : 0
  const secondHasClasses = second.classes.length > 0 ? 1 : 0

  return (
    secondHasClasses - firstHasClasses ||
    second.classes.length - first.classes.length ||
    second.lessons.length - first.lessons.length ||
    first.subject.localeCompare(second.subject, 'pt-BR')
  )
}

function getNextReservationTime(time: string) {
  const currentIndex = reservationTimeOptions.findIndex((option) => option.value === time)
  if (currentIndex < 0) return '07:30'
  return (
    reservationTimeOptions[Math.min(currentIndex + 1, reservationTimeOptions.length - 1)]?.value ??
    '07:30'
  )
}
function getReservationEndTimeOptions(startTime: string) {
  return reservationTimeOptions.filter((option) => option.value > startTime)
}
function formatReservationTime(time: string) {
  return reservationTimeOptions.find((option) => option.value === time)?.label ?? time
}
function formatReservationDate(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return date

  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}
function compareLessonRecordsByNewest(a: LessonRecord, b: LessonRecord) {
  const dateDiff = `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
  if (dateDiff !== 0) return dateDiff
  return b.id.localeCompare(a.id)
}
function normalizeLessonTime(value?: string | null) {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return ''

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return ''

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
function isCurriculumSkillCode(value?: string | null) {
  return /^EF\d{2}[A-Z]{2}\d{2}[A-Z]?$/i.test(String(value ?? '').trim())
}
function getLessonTimeOptions(classRoom?: ClassRoom | null): CompactSelectOption[] {
  const schedule = classRoom?.schedule?.trim() ?? ''
  const times = Array.from(schedule.matchAll(/\b\d{1,2}:\d{2}\b/g))
    .map((match) => normalizeLessonTime(match[0]))
    .filter(Boolean)

  if (times.length >= 2) {
    return [{
      value: times[0],
      label: times[0],
      description: `Até ${times[1]} - ${schedule || 'Horário cadastrado na turma'}`,
    }]
  }

  if (times.length === 1) {
    return [{ value: times[0], label: times[0], description: schedule || 'Horário cadastrado na turma' }]
  }

  if (schedule) {
    return [{ value: schedule, label: schedule, description: 'Horário cadastrado na turma' }]
  }

  const fallback = classRoom?.shift === 'Tarde' ? '13:00' : classRoom?.shift === 'Noite' ? '19:00' : '07:00'
  return [{ value: fallback, label: fallback, description: `Horário padrão - ${classRoom?.shift ?? 'Manha'}` }]
}
function getFirstLessonTimeForClass(classRoom?: ClassRoom | null) {
  return getLessonTimeOptions(classRoom)[0]?.value ?? ''
}
function getLessonAttendanceKey(lesson: LessonRecord, studentId: string) {
  if (lesson.id) return ['lesson', lesson.id, studentId].join(':')

  return [
    lesson.classId,
    lesson.date,
    lesson.time,
    normalizeAcademicText(lesson.subject),
    studentId,
  ].join(':')
}
function buildLessonAttendancePayload(
  lesson: LessonRecord,
  students: Student[],
  attendance: Record<string, boolean>,
) {
  return students.reduce<Record<string, boolean>>((acc, student) => {
    acc[student.id] = attendance[getLessonAttendanceKey(lesson, student.id)] ?? true
    return acc
  }, {})
}
function parseLessonRecordDraft(draft: LessonRecord) {
  const result = lessonRecordSchema.safeParse(draft)
  if (!result.success) {
    return {
      success: false as const,
      message: result.error.issues[0]?.message ?? 'Revise os dados do registro de aula.',
      errors: zodFieldErrors<LessonRecordFormField>(result.error),
    }
  }

  return {
    success: true as const,
    data: {
      ...draft,
      ...result.data,
      notes: result.data.notes ?? '',
    },
  }
}
function parseReservationDraft(draft: RoomReservation) {
  const result = reservationSchema.safeParse(draft)
  if (!result.success) {
    return {
      success: false as const,
      message: result.error.issues[0]?.message ?? 'Revise os dados da reserva.',
      errors: zodFieldErrors<ReservationFormField>(result.error),
    }
  }

  return {
    success: true as const,
    data: {
      ...draft,
      ...result.data,
    },
  }
}
export default function RolePortalView({
  section,
  profile,
  currentUser,
  currentRole,
  schoolsData,
  evaluationsData,
  onCreateRoomReservation,
  onCreateLessonRecord,
  onUpdateLessonRecord,
  onLoadTeacherSubjectCardsPage,
  onLoadStudentSubjectCardsPage,
  onLoadEvaluationsData,
  onDownloadEvaluation,
  onDownloadAnswerKey,
  onLoadEvaluationFile,
  onLoadCorrectionDetail,
  onLoadCorrectionCardPreview,
}: RolePortalViewProps) {
  const { schools, classes, students, teachers, guardians } = schoolsData
  const [lazyEvaluationsData, setLazyEvaluationsData] = useState(evaluationsData)
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? '')
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? '')
  const [activeSubject, setActiveSubject] = useState('')
  const [subjectModal, setSubjectModal] = useState<{
    type: 'classes' | 'history' | 'lesson' | 'evaluations'
    subject: string
  } | null>(null)
  const [createdLessonRecords, setCreatedLessonRecords] = useState<LessonRecord[]>([])
  const [lessonHistoryPage, setLessonHistoryPage] = useState(1)
  const [subjectHistoryPage, setSubjectHistoryPage] = useState(1)
  const [reservations, setReservations] = useState<RoomReservation[]>(schoolsData.roomReservations ?? [])
  const [selectedReservation, setSelectedReservation] = useState<RoomReservation | null>(null)
  const [lessonRecordStep, setLessonRecordStep] = useState<'details' | 'attendance'>('details')
  const [lessonError, setLessonError] = useState<string | null>(null)
  const [lessonFieldErrors, setLessonFieldErrors] = useState<FieldErrors<LessonRecordFormField>>({})
  const [isSavingLesson, setIsSavingLesson] = useState(false)
  const [isSavingReservation, setIsSavingReservation] = useState(false)
  const [reservationError, setReservationError] = useState<string | null>(null)
  const [reservationFieldErrors, setReservationFieldErrors] = useState<FieldErrors<ReservationFormField>>({})
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [savedAttendance, setSavedAttendance] = useState<Record<string, boolean>>({})
  const [attendanceDirtyKeys, setAttendanceDirtyKeys] = useState<Set<string>>(() => new Set())
  const [lessonDraft, setLessonDraft] = useState<LessonRecord>({
    id: '',
    classId: classes[0]?.id ?? '',
    subject: teachers[0]?.specialty ?? '',
    date: today,
    time: '',
    content: '',
    plan: '',
    resources: '',
    activity: '',
    notes: '',
  })
  const [reservationDraft, setReservationDraft] = useState<RoomReservation>({
    id: '',
    room: '',
    date: today,
    startTime: '07:00',
    endTime: '07:30',
    classId: classes[0]?.id ?? '',
    purpose: '',
  })

  useEffect(() => {
    setLazyEvaluationsData(evaluationsData)
  }, [evaluationsData])

  const handleLoadEvaluationsData = onLoadEvaluationsData
    ? async () => {
        const payload = await onLoadEvaluationsData()
        setLazyEvaluationsData(payload)
        return payload
      }
    : undefined

  const linkedTeacher = teachers.find(
    (t) => t.userId === currentUser.id || t.id === currentUser.linkedTeacherId,
  )
  const teacherClasses = useMemo(
    () =>
      classes.filter(
        (c) =>
          !linkedTeacher ||
          c.teacherId === linkedTeacher.id ||
          (c.teacherIds ?? []).includes(linkedTeacher.id),
      ),
    [classes, linkedTeacher],
  )
  const visibleTeacherClasses = useMemo(
    () => (teacherClasses.length ? teacherClasses : classes),
    [classes, teacherClasses],
  )
  const curriculumSkills = useMemo(
    () => lazyEvaluationsData?.curriculumSkills ?? [],
    [lazyEvaluationsData?.curriculumSkills],
  )
  const activeSubjectClasses = useMemo(
    () =>
      activeSubject
        ? visibleTeacherClasses.filter((c) => classMatchesSubject(c, activeSubject, curriculumSkills))
        : visibleTeacherClasses,
    [activeSubject, curriculumSkills, visibleTeacherClasses],
  )
  const lessonRecords = useMemo(() => {
    const seen = new Set<string>()
    return [...createdLessonRecords, ...(schoolsData.lessonRecords ?? [])].filter((record) => {
      if (seen.has(record.id)) return false
      seen.add(record.id)
      return true
    })
  }, [createdLessonRecords, schoolsData.lessonRecords])
  useEffect(() => {
    const persistedAttendance = getLessonRecordsAttendanceState(lessonRecords, getLessonAttendanceKey)
    setSavedAttendance(persistedAttendance)
    setAttendance((current) => {
      const next = { ...persistedAttendance }
      attendanceDirtyKeys.forEach((key) => {
        if (key in current) next[key] = current[key]
      })
      return next
    })
  }, [attendanceDirtyKeys, lessonRecords])
  const classScope = activeSubjectClasses.length ? activeSubjectClasses : visibleTeacherClasses
  const selectedClass = classScope.find((c) => c.id === selectedClassId) ?? classScope[0] ?? classes[0]
  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? students[0]
  const selectedClassStudents = selectedClass ? getClassStudents(students, selectedClass.id) : []
  const averageScore = getAverage(students)
  const averageAttendance = getAverageLessonAttendanceRate(students, lessonRecords, attendance, getLessonAttendanceKey)
  const lowAttendanceStudents = students.filter((s) => getStudentAttendanceRateFromLessons(s, lessonRecords, s.attendanceRate ?? 0, attendance, getLessonAttendanceKey) < 75)
  const lowScoreStudents = students.filter((s) => s.averageScore < 6)

  const subjectCards = useMemo(() => {
    const teacherSubjects = linkedTeacher
      ? getOfficialAcademicSubjectList([linkedTeacher.specialty], curriculumSkills)
      : teachers.flatMap((t) => getOfficialAcademicSubjectList([t.specialty], curriculumSkills))
    const classSubjects = visibleTeacherClasses.flatMap((c) =>
      getOfficialAcademicSubjectListForGrade(c.bnccFocus ?? [], c.grade, curriculumSkills),
    )
    const subjects = uniqueAcademicList([
      ...teacherSubjects,
      ...classSubjects,
      getOfficialAcademicSubjectLabel(lessonDraft.subject, curriculumSkills),
    ])
    return subjects.map((subject) => ({
      subject,
      classes: visibleTeacherClasses.filter((c) => classMatchesSubject(c, subject, curriculumSkills)),
    })).map((card) => {
      const cardClassIds = new Set(card.classes.map((classRoom) => classRoom.id))
      const scopedClassIds = cardClassIds.size ? cardClassIds : new Set(visibleTeacherClasses.map((classRoom) => classRoom.id))

      return {
        ...card,
        lessons: lessonRecords.filter(
          (record) =>
            scopedClassIds.has(record.classId) &&
            normalizeAcademicText(getOfficialAcademicSubjectLabel(record.subject, curriculumSkills) || getAcademicSubjectLabel(record.subject, curriculumSkills)) === normalizeAcademicText(card.subject),
        ),
      }
    }).sort(compareTeacherSubjectCardsByPriority)
  }, [curriculumSkills, lessonDraft.subject, lessonRecords, linkedTeacher, teachers, visibleTeacherClasses])

  const modalCard = subjectModal
    ? subjectCards.find(
        (c) => normalizeAcademicText(c.subject) === normalizeAcademicText(subjectModal.subject),
      ) ?? null
    : null
  const sortedSubjectHistoryRecords = useMemo(
    () => (modalCard ? [...modalCard.lessons].sort(compareLessonRecordsByNewest) : []),
    [modalCard],
  )
  const subjectHistoryTotalPages = Math.max(1, Math.ceil(sortedSubjectHistoryRecords.length / lessonHistoryPageSize))
  const safeSubjectHistoryPage = Math.min(subjectHistoryPage, subjectHistoryTotalPages)
  const subjectHistoryStartIndex = (safeSubjectHistoryPage - 1) * lessonHistoryPageSize
  const subjectHistoryEndIndex = Math.min(subjectHistoryStartIndex + lessonHistoryPageSize, sortedSubjectHistoryRecords.length)
  const visibleSubjectHistoryRecords = sortedSubjectHistoryRecords.slice(subjectHistoryStartIndex, subjectHistoryEndIndex)
  const modalClasses = modalCard ? (modalCard.classes.length ? modalCard.classes : classScope) : []
  const modalSelectedClass = modalClasses.find((c) => c.id === selectedClassId) ?? modalClasses[0]
  const modalSelectedStudents = modalSelectedClass
    ? getClassStudents(students, modalSelectedClass.id)
    : []
  const lessonClass = classes.find((c) => c.id === lessonDraft.classId) ?? modalSelectedClass ?? selectedClass ?? null
  const lessonTimeOptions = useMemo(
    () => getLessonTimeOptions(lessonClass),
    [lessonClass?.id, lessonClass?.schedule, lessonClass?.shift],
  )
  const lessonAttendanceStudents = lessonDraft.classId
    ? getClassStudents(students, lessonDraft.classId)
    : modalSelectedStudents
  const lessonAttendanceKeys = lessonAttendanceStudents.map((student) => getLessonAttendanceKey(lessonDraft, student.id))
  const lessonAttendanceHasChanges = lessonAttendanceKeys.some((key) => attendanceDirtyKeys.has(key))
  const modalAttendanceKeys = modalSelectedStudents.map((student) => `${modalSelectedClass?.id}:${student.id}`)
  const modalAttendanceHasChanges = modalAttendanceKeys.some((key) => attendanceDirtyKeys.has(key))
  const lessonPresentCount = lessonAttendanceStudents.filter(
    (student) => attendance[getLessonAttendanceKey(lessonDraft, student.id)] ?? true,
  ).length
  const lessonDetailsReady = parseLessonRecordDraft(lessonDraft).success
  const sortedLessonRecords = useMemo(
    () => [...lessonRecords].sort(compareLessonRecordsByNewest),
    [lessonRecords],
  )
  const lessonHistoryTotalPages = Math.max(1, Math.ceil(sortedLessonRecords.length / lessonHistoryPageSize))
  const safeLessonHistoryPage = Math.min(lessonHistoryPage, lessonHistoryTotalPages)
  const lessonHistoryStartIndex = (safeLessonHistoryPage - 1) * lessonHistoryPageSize
  const lessonHistoryEndIndex = Math.min(lessonHistoryStartIndex + lessonHistoryPageSize, sortedLessonRecords.length)
  const visibleLessonHistoryRecords = sortedLessonRecords.slice(lessonHistoryStartIndex, lessonHistoryEndIndex)
  const reservationEndTimeOptions = getReservationEndTimeOptions(reservationDraft.startTime)

  useEffect(() => {
    setLessonHistoryPage((current) => Math.min(current, lessonHistoryTotalPages))
  }, [lessonHistoryTotalPages])

  useEffect(() => {
    setSubjectHistoryPage(1)
  }, [subjectModal?.subject, subjectModal?.type])

  useEffect(() => {
    setSubjectHistoryPage((current) => Math.min(current, subjectHistoryTotalPages))
  }, [subjectHistoryTotalPages])

  useEffect(() => {
    setReservations(schoolsData.roomReservations ?? [])
  }, [schoolsData.roomReservations])

  useEffect(() => {
    if (!students.length) {
      if (selectedStudentId) setSelectedStudentId('')
      return
    }

    if (!selectedStudentId || !students.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(students[0].id)
    }
  }, [selectedStudentId, students])

  useEffect(() => {
    if (!lessonTimeOptions.length) return

    setLessonDraft((cur) => (
      lessonTimeOptions.some((option) => option.value === cur.time)
        ? cur
        : { ...cur, time: lessonTimeOptions[0].value }
    ))
  }, [lessonTimeOptions])


  function getSchoolName(id: string | null) {
    return id
      ? schools.find((s) => s.id === id)?.name ?? 'Escola não localizada'
      : 'Rede municipal'
  }
  function getClassName(id: string) {
    return classes.find((c) => c.id === id)?.name ?? 'Turma não localizada'
  }
  function getClassRoom(id: string) {
    return classes.find((c) => c.id === id)
  }
  function getReservationSchoolName(reservation: RoomReservation | null) {
    if (!reservation) return 'Escola nao localizada'
    return getSchoolName(getClassRoom(reservation.classId)?.schoolId ?? null)
  }
  function clearLessonFieldError(field: LessonRecordFormField) {
    setLessonFieldErrors((current) => ({ ...current, [field]: undefined }))
  }
  function clearReservationFieldError(field: ReservationFormField) {
    setReservationFieldErrors((current) => ({ ...current, [field]: undefined }))
  }
  function updateLessonDraftField<K extends keyof LessonRecord>(field: K, value: LessonRecord[K]) {
    clearLessonFieldError(field as LessonRecordFormField)
    setLessonDraft((current) => ({ ...current, [field]: value }))
  }
  function updateReservationDraftField<K extends keyof RoomReservation>(field: K, value: RoomReservation[K]) {
    clearReservationFieldError(field as ReservationFormField)
    setReservationDraft((current) => ({ ...current, [field]: value }))
  }
  function updateAttendance(key: string, present: boolean) {
    setAttendance((current) => ({ ...current, [key]: present }))
    setAttendanceDirtyKeys((current) => {
      const next = new Set(current)
      if (present === (savedAttendance[key] ?? true)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function commitAttendanceChanges(keys?: string[]) {
    const keysToCommit = keys ?? Array.from(attendanceDirtyKeys)
    if (keysToCommit.length === 0) return

    setSavedAttendance((current) => {
      const next = { ...current }
      keysToCommit.forEach((key) => {
        next[key] = attendance[key] ?? true
      })
      return next
    })
    setAttendanceDirtyKeys((current) => {
      if (!keys) return new Set()

      const next = new Set(current)
      keysToCommit.forEach((key) => next.delete(key))
      return next
    })
  }

  async function handleSaveLessonAttendance(lesson: LessonRecord, attendanceStudents: Student[]) {
    const keys = attendanceStudents.map((student) => getLessonAttendanceKey(lesson, student.id))
    if (!keys.length) return

    if (!onUpdateLessonRecord) {
      commitAttendanceChanges(keys)
      return
    }

    setIsSavingLesson(true)
    setLessonError(null)
    try {
      const savedLesson = await onUpdateLessonRecord(lesson.id, {
        classId: lesson.classId,
        subject: lesson.subject,
        date: lesson.date,
        time: lesson.time,
        content: lesson.content,
        plan: lesson.plan,
        resources: lesson.resources,
        activity: lesson.activity,
        notes: lesson.notes,
        attendance: buildLessonAttendancePayload(lesson, attendanceStudents, attendance),
      })
      setCreatedLessonRecords((current) => [
        savedLesson,
        ...current.filter((record) => record.id !== savedLesson.id),
      ])
      commitAttendanceChanges(keys)
    } catch {
      setLessonError('Nao foi possivel salvar a frequencia no banco.')
    } finally {
      setIsSavingLesson(false)
    }
  }

  function openLessonRecord(subject: string, classId?: string) {
    const nextClassId =
      classId ??
      visibleTeacherClasses.find((c) => classMatchesSubject(c, subject))?.id ??
      visibleTeacherClasses[0]?.id ??
      ''
    const nextClassRoom = classes.find((c) => c.id === nextClassId)
    setActiveSubject(subject)
    setLessonError(null)
    setLessonFieldErrors({})
    setLessonRecordStep('details')
    if (nextClassId) setSelectedClassId(nextClassId)
    setLessonDraft((cur) => ({
      ...cur,
      subject,
      classId: nextClassId || cur.classId,
      time: getFirstLessonTimeForClass(nextClassRoom) || cur.time,
    }))
    setSubjectModal({ type: 'lesson', subject })
  }

  function openAttendanceList(subject: string, classId?: string) {
    const nextClassId =
      classId ??
      visibleTeacherClasses.find((c) => classMatchesSubject(c, subject))?.id ??
      visibleTeacherClasses[0]?.id ??
      ''
    const nextClassRoom = classes.find((c) => c.id === nextClassId)
    setActiveSubject(subject)
    setLessonError(null)
    setLessonFieldErrors({})
    setLessonRecordStep('attendance')
    if (nextClassId) setSelectedClassId(nextClassId)
    setLessonDraft((cur) => ({
      ...cur,
      subject,
      classId: nextClassId || cur.classId,
      time: getFirstLessonTimeForClass(nextClassRoom) || cur.time,
    }))
    setSubjectModal({ type: 'lesson', subject })
  }


  function getLessonValidationMessage() {
    const result = parseLessonRecordDraft(lessonDraft)
    return result.success ? null : result.message
  }

  function handleGoToLessonAttendance() {
    const validationResult = parseLessonRecordDraft(lessonDraft)
    if (!validationResult.success) {
      setLessonError(validationResult.message)
      setLessonFieldErrors(validationResult.errors)
      return
    }

    setLessonError(null)
    setLessonFieldErrors({})
    setLessonRecordStep('attendance')
  }

  async function handleSaveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationResult = parseLessonRecordDraft(lessonDraft)
    if (!validationResult.success) {
      if (lessonRecordStep === 'attendance' && lessonAttendanceHasChanges) {
        commitAttendanceChanges(lessonAttendanceKeys)
        setLessonError(null)
        setLessonFieldErrors({})
        return
      }

      setLessonError(validationResult.message)
      setLessonFieldErrors(validationResult.errors)
      setLessonRecordStep('details')
      return
    }

    const payload: CreateLessonRecordPayload = {
      classId: validationResult.data.classId,
      subject: validationResult.data.subject,
      date: validationResult.data.date,
      time: validationResult.data.time,
      content: validationResult.data.content,
      plan: validationResult.data.plan,
      resources: validationResult.data.resources,
      activity: validationResult.data.activity,
      notes: validationResult.data.notes ?? '',
      attendance: buildLessonAttendancePayload(lessonDraft, lessonAttendanceStudents, attendance),
    }

    setIsSavingLesson(true)
    setLessonError(null)
    try {
      const savedLesson = onCreateLessonRecord
        ? await onCreateLessonRecord(payload)
        : { ...payload, id: crypto.randomUUID() }

      setCreatedLessonRecords((cur) => [
        savedLesson,
        ...cur.filter((record) => record.id !== savedLesson.id),
      ])
      commitAttendanceChanges(lessonAttendanceKeys)
      setLessonDraft((cur) => ({ ...cur, content: '', plan: '', resources: '', activity: '', notes: '' }))
      setLessonFieldErrors({})
      setLessonRecordStep('details')
      setLessonHistoryPage(1)
      setSubjectHistoryPage(1)
      if (subjectModal?.type === 'lesson') setSubjectModal(null)
    } catch (error) {
      setLessonError(error instanceof Error ? error.message : 'Nao foi possivel salvar o registro de aula.')
    } finally {
      setIsSavingLesson(false)
    }
  }

  async function handleSaveReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setReservationError(null)
    const validationResult = parseReservationDraft(reservationDraft)
    if (!validationResult.success) {
      setReservationError(validationResult.message)
      setReservationFieldErrors(validationResult.errors)
      return
    }

    const payload: CreateRoomReservationPayload = {
      room: validationResult.data.room,
      date: validationResult.data.date,
      startTime: validationResult.data.startTime,
      endTime: validationResult.data.endTime,
      classId: validationResult.data.classId,
      purpose: validationResult.data.purpose,
    }

    setIsSavingReservation(true)
    try {
      const savedReservation = onCreateRoomReservation
        ? await onCreateRoomReservation(payload)
        : { ...payload, id: crypto.randomUUID() }

      setReservations((cur) => [
        savedReservation,
        ...cur.filter((reservation) => reservation.id !== savedReservation.id),
      ])
      setReservationDraft((cur) => ({ ...cur, room: '', purpose: '' }))
      setReservationFieldErrors({})
    } catch (error) {
      setReservationError(error instanceof Error ? error.message : 'Nao foi possivel salvar a reserva.')
    } finally {
      setIsSavingReservation(false)
    }
  }

  function handleReservationStartTimeChange(startTime: string) {
    setReservationDraft((cur) => ({
      ...cur,
      startTime,
      endTime: cur.endTime > startTime ? cur.endTime : getNextReservationTime(startTime),
    }))
  }

  const reservationFieldClass = 'flex min-w-0 flex-col gap-1.5'
  const reservationLabelClass = 'text-[10px] font-black uppercase tracking-[0.14em] text-slate-500'
  const reservationInputClass = 'min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400'
  const reservationSelectClass = 'min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-bold'

  const screenModel: RolePortalScreenModel = {
    section, profile, currentUser, currentRole, schoolsData, evaluationsData: lazyEvaluationsData, onCreateRoomReservation, onCreateLessonRecord, onUpdateLessonRecord, onLoadTeacherSubjectCardsPage, onLoadStudentSubjectCardsPage, onLoadEvaluationsData: handleLoadEvaluationsData, onDownloadEvaluation, onDownloadAnswerKey, onLoadEvaluationFile, onLoadCorrectionDetail, onLoadCorrectionCardPreview,
    schools, classes, students, teachers, guardians, selectedClassId, setSelectedClassId, selectedStudentId, setSelectedStudentId, activeSubject, setActiveSubject, subjectModal, setSubjectModal, createdLessonRecords, setCreatedLessonRecords, lessonHistoryPage, setLessonHistoryPage, subjectHistoryPage, setSubjectHistoryPage, reservations, setReservations, selectedReservation, setSelectedReservation, lessonRecordStep, setLessonRecordStep, lessonError, setLessonError, lessonFieldErrors, setLessonFieldErrors, isSavingLesson, setIsSavingLesson, isSavingReservation, setIsSavingReservation, reservationError, setReservationError, reservationFieldErrors, setReservationFieldErrors, attendance, setAttendance, savedAttendance, setSavedAttendance, attendanceDirtyKeys, setAttendanceDirtyKeys, lessonDraft, setLessonDraft, reservationDraft, setReservationDraft, linkedTeacher, teacherClasses, visibleTeacherClasses, activeSubjectClasses, lessonRecords, classScope, selectedClass, selectedStudent, selectedClassStudents, averageScore, averageAttendance, lowAttendanceStudents, lowScoreStudents, subjectCards, modalCard, sortedSubjectHistoryRecords, subjectHistoryTotalPages, safeSubjectHistoryPage, subjectHistoryStartIndex, subjectHistoryEndIndex, visibleSubjectHistoryRecords, modalClasses, modalSelectedClass, modalSelectedStudents, lessonClass, lessonTimeOptions, lessonAttendanceStudents, lessonAttendanceKeys, lessonAttendanceHasChanges, modalAttendanceKeys, modalAttendanceHasChanges, lessonPresentCount, lessonDetailsReady, sortedLessonRecords, lessonHistoryTotalPages, safeLessonHistoryPage, lessonHistoryStartIndex, lessonHistoryEndIndex, visibleLessonHistoryRecords, reservationEndTimeOptions, getSchoolName, getClassName, getClassRoom, getReservationSchoolName, clearLessonFieldError, clearReservationFieldError, updateLessonDraftField, updateReservationDraftField, updateAttendance, commitAttendanceChanges, handleSaveLessonAttendance, openLessonRecord, openAttendanceList, getLessonValidationMessage, handleGoToLessonAttendance, handleSaveLesson, handleSaveReservation, handleReservationStartTimeChange, lessonHistoryPageSize, reservationStartTimeOptions, today, formatReservationDate, formatReservationTime, getLessonAttendanceKey, getFirstLessonTimeForClass, compareLessonRecordsByNewest, reservationFieldClass, reservationLabelClass, reservationInputClass, reservationSelectClass,
  }

  if (section === 'pedagogy' || (profile === 'COORDENADOR' && section === 'dashboard')) {
    return <PedagogyPortalView model={screenModel} />
  }

  if (section === 'teacher-subjects') {
    return <TeacherSubjectsView model={screenModel} />
  }

  if (section === 'room-reservations') {
    return <RoomReservationsView model={screenModel} />
  }

  if (section === 'lesson-records') {
    return <LessonRecordsView model={screenModel} />
  }

  if (section === 'attendance-list') {
    return <AttendanceListView model={screenModel} />
  }

  if (false && profile === 'ALUNO' && section === 'student-performance') {
    return <StudentLegacyPerformanceView model={screenModel} />
  }

  if (section === 'student-grades') {
    return <StudentGradesView model={screenModel} />
  }

  if (
    section === 'student-performance' ||
    section === 'student-attendance' ||
    section === 'child-performance' ||
    section === 'child-attendance'
  ) {
    return <StudentGuardianProgressView model={screenModel} />
  }

  return <RolePortalFallbackView model={screenModel} />
}
