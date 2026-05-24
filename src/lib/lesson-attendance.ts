import type { LessonRecord, Student } from '../types'

export type LessonAttendanceRow = {
  record: LessonRecord
  present: boolean
}

function coerceAttendanceBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  const text = String(value ?? '').trim().toLowerCase()
  if (['false', '0', 'nao', 'não', 'faltou', 'falta', 'ausente', 'absent'].includes(text)) return false
  return true
}

export function getLessonAttendanceValue(
  record: LessonRecord,
  studentId: string,
  localAttendance?: Record<string, boolean>,
  getLocalKey?: (record: LessonRecord, studentId: string) => string,
) {
  const storedAttendance = record.attendance ?? {}
  const localKey = getLocalKey?.(record, studentId)

  return coerceAttendanceBoolean(
    storedAttendance[studentId] ??
    (localKey ? storedAttendance[localKey] : undefined) ??
    (localKey ? localAttendance?.[localKey] : undefined) ??
    localAttendance?.[studentId] ??
    true
  )
}

export function getStudentLessonAttendanceRows(
  student: Pick<Student, 'id' | 'classId'> | null | undefined,
  lessonRecords: LessonRecord[],
  localAttendance?: Record<string, boolean>,
  getLocalKey?: (record: LessonRecord, studentId: string) => string,
) {
  if (!student) return []

  return lessonRecords
    .filter((record) => record.classId === student.classId)
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .map((record): LessonAttendanceRow => ({
      record,
      present: getLessonAttendanceValue(record, student.id, localAttendance, getLocalKey),
    }))
}

export function getAttendanceRateFromRows(rows: LessonAttendanceRow[]) {
  if (!rows.length) return null
  const presentCount = rows.filter((row) => row.present).length
  return Math.round((presentCount / rows.length) * 100)
}

export function getStudentAttendanceRateFromLessons(
  student: Pick<Student, 'id' | 'classId'> | null | undefined,
  lessonRecords: LessonRecord[],
  fallbackRate = 0,
  localAttendance?: Record<string, boolean>,
  getLocalKey?: (record: LessonRecord, studentId: string) => string,
) {
  const rows = getStudentLessonAttendanceRows(student, lessonRecords, localAttendance, getLocalKey)
  return getAttendanceRateFromRows(rows) ?? fallbackRate
}

export function getAverageLessonAttendanceRate(
  students: Array<Pick<Student, 'id' | 'classId' | 'attendanceRate'>>,
  lessonRecords: LessonRecord[],
  localAttendance?: Record<string, boolean>,
  getLocalKey?: (record: LessonRecord, studentId: string) => string,
) {
  if (!students.length) return 0
  const rates = students.map((student) => getStudentAttendanceRateFromLessons(
    student,
    lessonRecords,
    student.attendanceRate ?? 0,
    localAttendance,
    getLocalKey,
  ))
  return Math.round(rates.reduce((total, rate) => total + rate, 0) / rates.length)
}

export function getLessonRecordsAttendanceState(
  lessonRecords: LessonRecord[],
  getLocalKey: (record: LessonRecord, studentId: string) => string,
) {
  const next: Record<string, boolean> = {}

  for (const record of lessonRecords) {
    for (const [studentId, present] of Object.entries(record.attendance ?? {})) {
      next[getLocalKey(record, studentId)] = coerceAttendanceBoolean(present)
    }
  }

  return next
}
