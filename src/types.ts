export type RiskLevel = 'baixo' | 'medio' | 'alto'
export type EvaluationStatus = 'planejado' | 'em_aplicacao' | 'corrigindo' | 'concluido'
export type UserStatus = 'ativo' | 'pendente' | 'bloqueado'
export type CalendarEventType = 'aula' | 'reuniao' | 'avaliacao' | 'prazo' | 'evento'
export type AppSection = 'dashboard' | 'schools' | 'classes' | 'evaluations' | 'calendar' | 'access' | 'settings'

export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
}

export interface UserAccount {
  id: string
  name: string
  email: string
  roleId: string
  schoolId: string | null
  status: UserStatus
  phone: string
  avatarUrl?: string
}

export interface School {
  id: string
  name: string
  city: string
  address: string
  director: string
  inepCode: string
  active: boolean
}

export interface Teacher {
  id: string
  name: string
  email: string
  schoolId: string
  specialty: string
}

export interface Student {
  id: string
  name: string
  registration: string
  schoolId: string
  classId: string
  status: 'matriculado' | 'transferido' | 'inativo'
  attendanceRate: number
  averageScore: number
  riskLevel: RiskLevel
}

export interface ClassRoom {
  id: string
  name: string
  grade: string
  shift: 'Manha' | 'Tarde' | 'Noite'
  schoolId: string
  teacherId: string
  academicYear: number
  schedule: string
  bnccFocus: string[]
}

export interface Evaluation {
  id: string
  title: string
  classId: string
  subject: string
  questions: number
  scheduledAt: string
  status: EvaluationStatus
  corrected: number
  participants: number
  averageScore: number
  triLevel: string
}

export interface SchoolCalendarEvent {
  id: string
  title: string
  type: CalendarEventType
  schoolId: string
  classId: string | null
  startsAt: string
  endsAt: string
  allDay: boolean
  location: string
  description: string
}

export interface AuditEvent {
  id: string
  actor: string
  action: string
  target: string
  createdAt: string
}

export interface DashboardMetric {
  id: string
  label: string
  value: string
  detail: string
  tone: 'blue' | 'green' | 'amber' | 'rose'
}

export interface DashboardPayload {
  metrics: DashboardMetric[]
  attendanceByClass: Array<{ className: string; frequencia: number; media: number }>
  proficiencyDistribution: Array<{ level: string; alunos: number }>
  subjectRadar: Array<{ subject: string; acertos: number }>
  alerts: Array<{ id: string; title: string; description: string; tone: 'warning' | 'danger' | 'info' }>
}

export interface BootstrapPayload {
  currentUser: UserAccount
  dashboard: DashboardPayload
  roles: Role[]
  users: UserAccount[]
  schools: School[]
  teachers: Teacher[]
  students: Student[]
  classes: ClassRoom[]
  evaluations: Evaluation[]
  calendarEvents?: SchoolCalendarEvent[]
  auditEvents: AuditEvent[]
}
