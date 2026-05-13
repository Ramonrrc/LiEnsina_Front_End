import type { Dispatch, FormEvent, SetStateAction } from 'react'

import type { CompactSelectOption } from '../../components/ui/compact-select'
import type { FieldErrors } from '../../components/ui/form-field'
import type {
  AppSection,
  ClassRoom,
  CreateLessonRecordPayload,
  CreateRoomReservationPayload,
  EvaluationsScreenPayload,
  Guardian,
  LessonRecord,
  Role,
  RoleCode,
  RoomReservation,
  School,
  SchoolsScreenPayload,
  Student,
  Teacher,
  UserAccount,
} from '../../types'

export type LessonRecordFormField = keyof CreateLessonRecordPayload
export type ReservationFormField = keyof CreateRoomReservationPayload

export type SubjectModal = {
  type: 'classes' | 'history' | 'lesson' | 'attendance'
  subject: string
} | null

export type SubjectCardModel = {
  subject: string
  classes: ClassRoom[]
  lessons: LessonRecord[]
}

export interface RolePortalScreenModel {
  section: AppSection
  profile: RoleCode
  currentUser: UserAccount
  currentRole: Role | null
  schoolsData: SchoolsScreenPayload
  evaluationsData?: Pick<
    EvaluationsScreenPayload,
    'evaluations' | 'curriculumSkills' | 'assessmentDescriptors' | 'questionBank'
  >
  onCreateRoomReservation?: (draft: CreateRoomReservationPayload) => Promise<RoomReservation>
  onCreateLessonRecord?: (draft: CreateLessonRecordPayload) => Promise<LessonRecord>
  schools: School[]
  classes: ClassRoom[]
  students: Student[]
  teachers: Teacher[]
  guardians: Guardian[]
  selectedClassId: string
  setSelectedClassId: Dispatch<SetStateAction<string>>
  selectedStudentId: string
  setSelectedStudentId: Dispatch<SetStateAction<string>>
  activeSubject: string
  setActiveSubject: Dispatch<SetStateAction<string>>
  subjectModal: SubjectModal
  setSubjectModal: Dispatch<SetStateAction<SubjectModal>>
  createdLessonRecords: LessonRecord[]
  setCreatedLessonRecords: Dispatch<SetStateAction<LessonRecord[]>>
  lessonHistoryPage: number
  setLessonHistoryPage: Dispatch<SetStateAction<number>>
  subjectHistoryPage: number
  setSubjectHistoryPage: Dispatch<SetStateAction<number>>
  reservations: RoomReservation[]
  setReservations: Dispatch<SetStateAction<RoomReservation[]>>
  selectedReservation: RoomReservation | null
  setSelectedReservation: Dispatch<SetStateAction<RoomReservation | null>>
  lessonRecordStep: 'details' | 'attendance'
  setLessonRecordStep: Dispatch<SetStateAction<'details' | 'attendance'>>
  lessonError: string | null
  setLessonError: Dispatch<SetStateAction<string | null>>
  lessonFieldErrors: FieldErrors<LessonRecordFormField>
  setLessonFieldErrors: Dispatch<SetStateAction<FieldErrors<LessonRecordFormField>>>
  isSavingLesson: boolean
  setIsSavingLesson: Dispatch<SetStateAction<boolean>>
  isSavingReservation: boolean
  setIsSavingReservation: Dispatch<SetStateAction<boolean>>
  reservationError: string | null
  setReservationError: Dispatch<SetStateAction<string | null>>
  reservationFieldErrors: FieldErrors<ReservationFormField>
  setReservationFieldErrors: Dispatch<SetStateAction<FieldErrors<ReservationFormField>>>
  attendance: Record<string, boolean>
  setAttendance: Dispatch<SetStateAction<Record<string, boolean>>>
  savedAttendance: Record<string, boolean>
  setSavedAttendance: Dispatch<SetStateAction<Record<string, boolean>>>
  attendanceDirtyKeys: Set<string>
  setAttendanceDirtyKeys: Dispatch<SetStateAction<Set<string>>>
  lessonDraft: LessonRecord
  setLessonDraft: Dispatch<SetStateAction<LessonRecord>>
  reservationDraft: RoomReservation
  setReservationDraft: Dispatch<SetStateAction<RoomReservation>>
  linkedTeacher: Teacher | undefined
  teacherClasses: ClassRoom[]
  visibleTeacherClasses: ClassRoom[]
  activeSubjectClasses: ClassRoom[]
  lessonRecords: LessonRecord[]
  classScope: ClassRoom[]
  selectedClass: ClassRoom | undefined
  selectedStudent: Student | undefined
  selectedClassStudents: Student[]
  averageScore: number
  averageAttendance: number
  lowAttendanceStudents: Student[]
  lowScoreStudents: Student[]
  subjectCards: SubjectCardModel[]
  modalCard: SubjectCardModel | null
  sortedSubjectHistoryRecords: LessonRecord[]
  subjectHistoryTotalPages: number
  safeSubjectHistoryPage: number
  subjectHistoryStartIndex: number
  subjectHistoryEndIndex: number
  visibleSubjectHistoryRecords: LessonRecord[]
  modalClasses: ClassRoom[]
  modalSelectedClass: ClassRoom | undefined
  modalSelectedStudents: Student[]
  lessonClass: ClassRoom | null
  lessonTimeOptions: CompactSelectOption[]
  lessonAttendanceStudents: Student[]
  lessonAttendanceKeys: string[]
  lessonAttendanceHasChanges: boolean
  modalAttendanceKeys: string[]
  modalAttendanceHasChanges: boolean
  lessonPresentCount: number
  lessonDetailsReady: boolean
  sortedLessonRecords: LessonRecord[]
  lessonHistoryTotalPages: number
  safeLessonHistoryPage: number
  lessonHistoryStartIndex: number
  lessonHistoryEndIndex: number
  visibleLessonHistoryRecords: LessonRecord[]
  reservationEndTimeOptions: CompactSelectOption[]
  getSchoolName: (id: string | null) => string
  getClassName: (id: string) => string
  getClassRoom: (id: string) => ClassRoom | undefined
  getReservationSchoolName: (reservation: RoomReservation | null) => string
  clearLessonFieldError: (field: LessonRecordFormField) => void
  clearReservationFieldError: (field: ReservationFormField) => void
  updateLessonDraftField: <K extends keyof LessonRecord>(field: K, value: LessonRecord[K]) => void
  updateReservationDraftField: <K extends keyof RoomReservation>(field: K, value: RoomReservation[K]) => void
  updateAttendance: (key: string, present: boolean) => void
  commitAttendanceChanges: (keys?: string[]) => void
  openLessonRecord: (subject: string, classId?: string) => void
  openAttendanceList: (subject: string, classId?: string) => void
  getLessonValidationMessage: () => string | null
  handleGoToLessonAttendance: () => void
  handleSaveLesson: (event: FormEvent<HTMLFormElement>) => Promise<void>
  handleSaveReservation: (event: FormEvent<HTMLFormElement>) => Promise<void>
  handleReservationStartTimeChange: (startTime: string) => void
  lessonHistoryPageSize: number
  reservationStartTimeOptions: CompactSelectOption[]
  today: string
  formatReservationDate: (date: string) => string
  formatReservationTime: (time: string) => string
  getLessonAttendanceKey: (lesson: LessonRecord, studentId: string) => string
  getFirstLessonTimeForClass: (classRoom?: ClassRoom | null) => string
  compareLessonRecordsByNewest: (a: LessonRecord, b: LessonRecord) => number
  reservationFieldClass: string
  reservationLabelClass: string
  reservationInputClass: string
  reservationSelectClass: string
}
