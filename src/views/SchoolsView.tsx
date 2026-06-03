import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { z } from 'zod'
import {
  BookOpen, Building2, Clock3, Eye, GraduationCap, Pencil, Plus, Save,
  Search, UserRound, Users, X, MapPin, Hash, User, Mail,
  Phone, Lock, CheckCircle2, Layers, Shield, ChevronRight, Zap,
  School as SchoolIcon, Calendar, Award, BarChart3, Activity, Check,
} from 'lucide-react'

import { AppToastNotice } from '../components/ui/app-toast'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { DEFAULT_PAGE_SIZE, PaginationControls, getLocalPagination } from '../components/ui/pagination-controls'
import { AvatarHoverPreview } from '../components/profile/AvatarSign'
import { FieldMessage, fieldStateClass, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'
import { getOfficialAcademicSubjectList, getOfficialAcademicSubjectListForGrade, getOfficialAcademicSubjectsForGrade } from '../components/role-portal/portal-components'
import { resolveApiAssetUrl } from '../api'
import { formatClassGrade, getClassGradeOptions } from '../class-grade-options'
import { getAverageLessonAttendanceRate, getStudentAttendanceRateFromLessons } from '../lib/lesson-attendance'
import type { ClassesPagePayload, ClassesPageQuery, ClassRoom, Desempenho, Guardian, LessonRecord, PaginationMeta, Role, School, SchoolsPagePayload, SchoolsPageQuery, Student, StudentsPagePayload, StudentsPageQuery, Teacher, UserAccount } from '../types'

/* ─── Types ─── */
interface SchoolsViewProps {
  currentUser: UserAccount
  currentRole: Role | null
  schools: School[]
  schoolsPagination?: PaginationMeta
  classes: ClassRoom[]
  classesPagination?: PaginationMeta
  students: Student[]
  teachers: Teacher[]
  guardians: Guardian[]
  lessonRecords?: LessonRecord[]
  assetVersion?: ProfileAssetVersion
  readOnly?: boolean
  onLoadSchoolsPage?: (params: SchoolsPageQuery) => Promise<SchoolsPagePayload>
  onLoadClassesPage?: (params: ClassesPageQuery) => Promise<ClassesPagePayload>
  onSearchStudents?: (params: StudentsPageQuery) => Promise<StudentsPagePayload>
  onCreate: (draft: Partial<School>) => Promise<void>
  onUpdate: (id: string, draft: Partial<School>) => Promise<void>
  onCreateClass: (draft: Partial<ClassRoom>) => Promise<void>
  onUpdateClass: (id: string, draft: Partial<ClassRoom>) => Promise<void>
  onCreateTeacher: (draft: Partial<Teacher> & { classId?: string; password?: string; phone?: string }) => Promise<void>
  onUpdateTeacher: (id: string, draft: Partial<Teacher> & { classId?: string }) => Promise<void>
  onCreateStudent: (draft: Partial<Student> & { password?: string }) => Promise<void>
  onUpdateStudent: (id: string, draft: Partial<Student>) => Promise<void>
  onCreateGuardian: (draft: Partial<Guardian> & { password?: string }) => Promise<void>
  onUpdateGuardian: (id: string, draft: Partial<Guardian>) => Promise<void>
}

/* ─── Constants ─── */
const currentYear = new Date().getFullYear()
const classPageSizeOptions = [15, 25, 50, 100] as const

const emptySchool: Partial<School> = { name: '', city: '', address: '', director: '', inepCode: '', active: true }
const emptyClass: Partial<ClassRoom> = { name: '', grade: '', shift: 'Manha', schoolId: '', teacherId: '', teacherIds: [], academicYear: currentYear, schedule: '', bnccFocus: [] }
const emptyTeacher: Partial<Teacher> & { classId?: string; password?: string; phone?: string } = { name: '', email: '', schoolId: '', specialty: '', classId: '', phone: '', password: '', active: true }
const emptyStudent: Partial<Student> & { password?: string } = { name: '', registrationNumber: '', schoolId: '', classId: '', guardianIds: [], status: 'matriculado', attendanceRate: 100, averageScore: 0, desempenho: 'Otimo', password: '' }
const emptyGuardian: Partial<Guardian> & { password?: string } = { name: '', email: '', phone: '', schoolId: '', studentIds: [], password: '' }

/* ─── Zod schemas (idênticos ao original) ─── */
const requiredText = (message: string) =>
  z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim().min(1, message))
const optionalText = z.preprocess((value) => typeof value === 'string' ? value : '', z.string().trim())
const stringList = z.preprocess((value) => Array.isArray(value) ? value : [], z.array(z.string()))
const optionalPhone = optionalText.refine((value) => {
  const digits = value.replace(/\D/g, '')
  return !digits || (digits.length >= 10 && digits.length <= 11)
}, 'Informe telefone com DDD e 10 ou 11 dígitos.')

const schoolFormSchema = z.object({
  name: requiredText('Informe o nome da escola.').pipe(z.string().min(3, 'Nome deve ter pelo menos 3 caracteres.')),
  city: requiredText('Informe a cidade da escola.'),
  address: requiredText('Informe o endereço da escola.'),
  director: requiredText('Informe o nome do diretor ou diretora.'),
  inepCode: requiredText('Informe o código INEP.').pipe(z.string().min(6, 'Código INEP deve ter pelo menos 6 dígitos.')),
})
const classFormSchema = z.object({
  name: requiredText('Informe o nome da turma.'),
  grade: requiredText('Selecione a série/ano da turma.'),
  schoolId: requiredText('Selecione uma escola para a turma.'),
  teacherId: requiredText('Selecione um professor responsável.'),
  shift: z.enum(['Manha', 'Tarde', 'Noite']),
  academicYear: z.coerce.number().int('Informe um ano letivo válido.').min(2000, 'Ano letivo muito antigo.').max(currentYear + 1, 'Ano letivo fora do período permitido.'),
  schedule: requiredText('Informe o horário da turma.'),
  bnccFocus: stringList,
  teacherIds: stringList,
})
const teacherFormSchema = z.object({
  name: requiredText('Informe o nome completo do professor.'),
  email: requiredText('Informe o e-mail do professor.').pipe(z.string().email('Informe um e-mail válido.')),
  specialty: requiredText('Informe as disciplinas do professor.'),
  phone: optionalPhone,
  schoolId: requiredText('Selecione a escola do professor.'),
  classId: optionalText,
  password: requiredText('Informe uma senha inicial.').pipe(z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.')),
})
const studentFormSchema = z.object({
  name: requiredText('Informe o nome completo do aluno.'),
  registrationNumber: optionalText,
  schoolId: requiredText('Selecione a escola do aluno.'),
  classId: requiredText('Selecione a turma do aluno.'),
  desempenho: z.enum(['Otimo', 'Medio', 'Baixo']),
  password: requiredText('Informe uma senha inicial.').pipe(z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.')),
  guardianIds: stringList,
})
const guardianFormSchema = z.object({
  name: requiredText('Informe o nome completo do responsável.'),
  email: requiredText('Informe o e-mail do responsável.').pipe(z.string().email('Informe um e-mail válido.')),
  phone: optionalPhone,
  schoolId: requiredText('Selecione a escola do responsável.'),
  password: requiredText('Informe uma senha inicial.').pipe(z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.')),
  studentIds: stringList,
})

type SchoolFormField = keyof z.infer<typeof schoolFormSchema>
type ClassFormField = keyof z.infer<typeof classFormSchema>
type TeacherFormField = keyof z.infer<typeof teacherFormSchema>
type StudentFormField = keyof z.infer<typeof studentFormSchema>
type GuardianFormField = keyof z.infer<typeof guardianFormSchema>

/* ─── ProfileAsset ─── */
type ProfileAssetVersion = { avatar?: string | number; banner?: string | number }
type ProfilePreviewEntity = {
  id?: string; userId?: string; name: string; email?: string; login?: string
  registrationNumber?: string; avatarUrl?: string | null; bannerUrl?: string | null
  user?: { name?: string; email?: string; login?: string; avatarUrl?: string | null; bannerUrl?: string | null } | null
}

/* ─── Performance helpers ─── */
function normalizePerformanceValue(value?: string | null) {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}
function getStudentPerformance(student: Partial<Student> & { riskLevel?: string | null }): Desempenho {
  const d = normalizePerformanceValue(student.desempenho)
  if (d === 'otimo') return 'Otimo'
  if (d === 'medio') return 'Medio'
  if (d === 'baixo') return 'Baixo'
  const r = normalizePerformanceValue(student.riskLevel)
  if (r === 'baixo') return 'Otimo'
  if (r === 'medio') return 'Medio'
  if (r === 'alto') return 'Baixo'
  if (typeof student.averageScore === 'number') {
    if (student.averageScore >= 8) return 'Otimo'
    if (student.averageScore >= 6) return 'Medio'
    return 'Baixo'
  }
  return 'Medio'
}
function getPerformanceFromScore(score: number | null): Desempenho | null {
  if (score === null) return null
  if (score >= 8) return 'Otimo'
  if (score >= 6) return 'Medio'
  return 'Baixo'
}
function getClassAverageScore(students: Student[]) {
  const scores = students.map(s => s.averageScore).filter((s): s is number => typeof s === 'number' && Number.isFinite(s))
  if (!scores.length) return { average: null, totalScores: 0 }
  return { average: scores.reduce((a, b) => a + b, 0) / scores.length, totalScores: scores.length }
}

/* ─── Score color helpers (suavizados, mesma semântica) ─── */
function scoreColor(score: number | null): string {
  if (score === null) return 'text-slate-400'
  if (score >= 8) return 'text-emerald-600'
  if (score >= 6) return 'text-amber-600'
  return 'text-rose-600'
}
function scoreBar(score: number | null): string {
  if (score === null) return 'bg-slate-200'
  if (score >= 8) return 'bg-emerald-500'
  if (score >= 6) return 'bg-amber-400'
  return 'bg-rose-500'
}
function perfPill(level: Desempenho | null) {
  if (level === 'Otimo') return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  if (level === 'Medio') return 'bg-amber-50 text-amber-700 border border-amber-200'
  if (level === 'Baixo') return 'bg-rose-50 text-rose-700 border border-rose-200'
  return 'bg-slate-50 text-slate-500 border border-slate-200'
}
function perfLabel(level: Desempenho | null) {
  if (level === 'Otimo') return 'Ótimo'
  if (level === 'Medio') return 'Médio'
  if (level === 'Baixo') return 'Baixo'
  return 'Sem dados'
}
function perfLeftBorder(level: Desempenho | null) {
  if (level === 'Otimo') return 'border-emerald-400/70'
  if (level === 'Medio') return 'border-amber-400/70'
  if (level === 'Baixo') return 'border-rose-400/70'
  return 'border-slate-300'
}

/* ─── Shift helpers ─── */
function shiftLabel(shift: string) {
  return ({ Manha: 'Manhã', Tarde: 'Tarde', Noite: 'Noite' } as Record<string, string>)[shift] ?? shift
}
function shiftPillCls(shift: string) {
  return ({
    Manha: 'bg-amber-50 text-amber-700 border border-amber-200',
    Tarde: 'bg-orange-50 text-orange-700 border border-orange-200',
    Noite: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  } as Record<string, string>)[shift] ?? 'bg-slate-50 text-slate-600 border border-slate-200'
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}
function getProfileEmail(e: ProfilePreviewEntity) {
  return e.email ?? e.user?.email ?? e.login ?? e.user?.login ?? e.registrationNumber ?? ''
}
function getProfileAvatarUrl(e: ProfilePreviewEntity, v?: string | number) {
  return resolveApiAssetUrl(e.avatarUrl ?? e.user?.avatarUrl, v)
}
function getProfileBannerUrl(e: ProfilePreviewEntity, v?: string | number) {
  return resolveApiAssetUrl(e.bannerUrl ?? e.user?.bannerUrl, v)
}

/* ─── Eyebrow (refinado, estilo landing) ─── */
function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-semibold tracking-[.14em] uppercase text-slate-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

/* ─── Spin ─── */
function Spin({ sm, dark }: { sm?: boolean; dark?: boolean }) {
  return (
    <span className={`${sm ? 'h-3.5 w-3.5' : 'h-4 w-4'} animate-spin rounded-full border-2 ${dark ? 'border-slate-200 border-t-slate-700' : 'border-white/30 border-t-white'} inline-block shrink-0`} />
  )
}

/* ─── Bone skeleton ─── */
function Bone({ className }: { className: string }) {
  return <div className={`sv-shimmer rounded-lg ${className}`} />
}

/* ─── Skeleton cards ─── */
function SkeletonSchoolCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Bone className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-3.5 w-2/3" />
          <Bone className="h-2.5 w-1/2" />
        </div>
        <Bone className="h-5 w-12 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0,1,2].map(i => <Bone key={i} className="h-14 rounded-xl" />)}
      </div>
      <div className="flex justify-between pt-2 border-t border-slate-100">
        <Bone className="h-6 w-24 rounded-full" />
        <div className="flex gap-2">
          <Bone className="h-8 w-8 rounded-lg" />
          <Bone className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
function SkeletonClassCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Bone className="h-3.5 w-28 rounded" />
        <Bone className="h-5 w-14 rounded-full" />
      </div>
      <Bone className="h-2.5 w-40 rounded" />
      <Bone className="h-10 w-full rounded-xl" />
      <Bone className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <Bone className="h-9 rounded-lg" />
        <Bone className="h-9 rounded-lg" />
      </div>
    </div>
  )
}

/* ─── EmptyState ─── */
function EmptyState({ icon: Icon, title, sub, action }: { icon: React.ElementType; title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="sv-empty-state grid min-h-[220px] place-items-center content-center gap-3 p-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-400">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="font-['Lora'] text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{sub}</p>
      </div>
      {action}
    </div>
  )
}

/* ─── StatPill ─── */
function StatPill({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon?: React.ElementType }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl px-3 py-2.5 ${color} transition-all`}>
      <div className="flex items-center gap-1">
        {Icon && <Icon size={10} className="opacity-60" />}
        <span className="text-[10px] font-semibold uppercase tracking-[.12em] opacity-70">{label}</span>
      </div>
      <div className="font-['Lora'] text-lg font-semibold leading-none">{value}</div>
    </div>
  )
}

/* ─── MetricTile (header global stats) ─── */
function MetricTile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="flex flex-col gap-1.5 text-center">
      <p className={`font-['Lora'] text-2xl font-semibold leading-none ${accent}`}>{value}</p>
      <Eyebrow>{label}</Eyebrow>
    </div>
  )
}

/* ─── Field ─── */
function Field({ label, children, error, icon: Icon }: { label: string; children: React.ReactNode; error?: string | null; icon?: React.ElementType }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-slate-500 font-['DM_Sans']">
        {Icon && <Icon size={12} className="text-indigo-500" />}
        {label}
      </span>
      {children}
      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
    </label>
  )
}

const inputCls = "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 hover:border-slate-400 font-['DM_Sans']"
const inputErrCls = "border-rose-400 focus:border-rose-500 focus:ring-rose-100"

/* ─── ProfileAvatar ─── */
function ProfileAvatar({ entity, size = 'sm', assetVersion }: { entity: ProfilePreviewEntity; size?: 'sm' | 'md'; assetVersion?: ProfileAssetVersion }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [previewStyle, setPreviewStyle] = useState<CSSProperties | null>(null)
  const name = entity.name || entity.user?.name || 'Usuário'
  const email = getProfileEmail(entity)
  const initials = getInitials(name)
  const avatarSrc = getProfileAvatarUrl(entity, assetVersion?.avatar)
  const bannerSrc = getProfileBannerUrl(entity, assetVersion?.banner)
  const hasProfileImage = Boolean(avatarSrc || bannerSrc)
  const sizeClass = size === 'md' ? 'h-10 w-10 text-[13px]' : 'h-8 w-8 text-[11px]'

  function showPreview() {
    if (!hasProfileImage) return
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const previewWidth = Math.min(360, window.innerWidth - 48)
    const left = Math.min(Math.max(24, rect.left), Math.max(24, window.innerWidth - previewWidth - 24))
    const belowTop = rect.bottom + 10
    const previewHeight = 220
    const top = belowTop + previewHeight > window.innerHeight ? Math.max(16, rect.top - previewHeight - 10) : belowTop
    setPreviewStyle({ left, top, width: previewWidth })
  }

  return (
    <div ref={wrapperRef} className="group/avatar relative shrink-0" onMouseEnter={showPreview} onMouseLeave={() => setPreviewStyle(null)}>
      <span className={`grid overflow-hidden rounded-full border border-white bg-gradient-to-br from-indigo-500 to-violet-600 font-semibold text-white shadow-sm ring-1 ring-slate-200 outline-none transition-all ${hasProfileImage ? 'cursor-pointer hover:ring-indigo-300' : ''} ${sizeClass}`}>
        {avatarSrc
          ? <img src={avatarSrc} alt={name} className="h-full w-full object-cover" draggable={false} />
          : <span className="grid h-full w-full place-items-center">{initials || <UserRound className="h-3.5 w-3.5" />}</span>}
      </span>
      {hasProfileImage && previewStyle && typeof document !== 'undefined'
        ? createPortal(<AvatarHoverPreview name={name} email={email} avatarSrc={avatarSrc} bannerSrc={bannerSrc} initials={initials} position="fixed" style={previewStyle} visible className="" />, document.body)
        : null}
    </div>
  )
}

/* ─── LightModal (header limpo, sem barra colorida) ─── */
function LightModal({ open, onClose, title, subtitle, wide, headerAction, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; wide?: boolean; headerAction?: React.ReactNode; children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 sv-backdrop"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`sv-modal flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full ${wide ? 'h-[90vh] max-w-5xl' : 'max-h-[90vh] max-w-3xl'}`}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
              <SchoolIcon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              {subtitle && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[.14em] text-indigo-500 font-['DM_Sans']">{subtitle}</p>}
              <p className="font-['Lora'] text-lg font-semibold text-slate-900 leading-tight">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button type="button" onClick={onClose} aria-label="Fechar"
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/40">{children}</div>
      </div>
    </div>
  )
}

/* ─── SectionHeader ─── */
function SectionHeader({ label, title, description, icon: Icon }: { label: string; title: string; description?: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
          <Icon size={16} className="text-white" />
        </div>
      )}
      <div>
        <Eyebrow>{label}</Eyebrow>
        <h2 className="font-['Lora'] text-lg font-semibold text-slate-900 mt-0.5">{title}</h2>
        {description && <p className="mt-0.5 text-[12px] text-slate-500 font-['DM_Sans']">{description}</p>}
      </div>
    </div>
  )
}

/* ─── Buttons ─── */
function PrimaryBtn({ children, onClick, type = 'button', disabled }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#5b4fe8] px-4 text-[13px] font-semibold text-white shadow-sm transition-all hover:from-indigo-700 hover:to-violet-700 hover:shadow-md hover:-translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0 font-['DM_Sans']">
      {children}
    </button>
  )
}
function SecondaryBtn({ children, onClick, type = 'button', disabled }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-40 font-['DM_Sans']">
      {children}
    </button>
  )
}
function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 font-['DM_Sans']">
      {children}
    </button>
  )
}

/* ─── SchoolCard ─── */
function SchoolCard({
  school, classCount, studentCount, isSelected, animDelay, onSelect, onEdit, onViewDetails,
}: {
  school: School; classCount: number; studentCount: number
  isSelected: boolean; animDelay: number; onSelect: () => void; onEdit: () => void; onViewDetails: () => void
}) {
  return (
    <article
      style={{ animationDelay: `${animDelay}ms` }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }}
      className={`sv-card sv-school-card group cursor-pointer rounded-2xl border bg-white p-5 text-left focus:outline-none focus:ring-2 focus:ring-indigo-200 flex flex-col gap-3.5
        ${isSelected ? 'sv-school-selected border-indigo-500' : 'border-slate-300'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-semibold text-sm transition-transform group-hover:scale-105
            ${school.active ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
            {school.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || <Building2 size={16} />}
          </div>
          <div className="min-w-0">
            <strong className="block truncate font-['Lora'] text-[15px] font-semibold text-slate-900 leading-snug">{school.name}</strong>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin size={11} className="shrink-0 text-slate-400" />
              <span className="truncate text-[12px] text-slate-500 font-['DM_Sans']">{school.city || 'Cidade não informada'}</span>
            </div>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.12em] border
          ${school.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
          {school.active && <Check size={10} />}
          {school.active ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      {/* Director */}
      {school.director && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-300 px-3 py-2">
          <User size={11} className="shrink-0 text-indigo-500" />
          <span className="truncate text-[12px] font-medium text-slate-600 font-['DM_Sans']">Dir. {school.director}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatPill label="Turmas" value={classCount} color="bg-indigo-50 text-indigo-700 border border-indigo-300" icon={Layers} />
        <StatPill label="Alunos" value={studentCount} color="bg-violet-50 text-violet-700 border border-violet-300" icon={Users} />
        <StatPill label="INEP" value={school.inepCode || '—'} color="bg-slate-50 text-slate-600 border border-slate-300" icon={Hash} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-slate-200">
        {isSelected ? (
          <div className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-white">
            <CheckCircle2 size={11} /> Selecionada
          </div>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 font-['DM_Sans']">
            <ChevronRight size={12} /> Clique para selecionar
          </span>
        )}
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Ver detalhes"
            onClick={e => { e.stopPropagation(); onViewDetails() }}
            className="sv-icon-btn grid h-8 w-8 place-items-center rounded-md border border-slate-500 bg-white text-slate-500 transition-all">
            <Eye size={13} />
          </button>
          <button type="button" aria-label="Editar escola"
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="sv-icon-btn grid h-8 w-8 place-items-center rounded-md border border-slate-500 bg-white text-slate-500 transition-all">
            <Pencil size={13} />
          </button>
        </div>
      </div>
    </article>
  )
}

/* ─── ClassCard ─── */
function ClassCard({
  classRoom, schoolName, teachers, students: classStudents, animDelay, onEdit, onViewDetails,
}: {
  classRoom: ClassRoom; schoolName: string; teachers: Teacher[]; students: Student[]
  animDelay: number; onEdit: () => void; onViewDetails: () => void
}) {
  const avgResult = getClassAverageScore(classStudents)
  const perf = getPerformanceFromScore(avgResult.average)
  const pct = avgResult.average !== null ? Math.min(100, (avgResult.average / 10) * 100) : 0

  return (
    <article
      style={{ animationDelay: `${animDelay}ms` }}
      className={`sv-card sv-class-card flex flex-col rounded-2xl border bg-white p-5 ${perfLeftBorder(perf)} transition-all duration-200 hover:shadow-md`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-600" />
          <strong className="min-w-0 truncate font-['Lora'] text-[15px] font-semibold text-slate-900">{classRoom.name}</strong>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.12em] ${shiftPillCls(classRoom.shift)}`}>
          {shiftLabel(classRoom.shift)}
        </span>
      </div>

      {/* Grade */}
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={11} className="text-violet-500" />
        <p className="truncate text-[12px] font-medium text-slate-500 font-['DM_Sans']">{formatClassGrade(classRoom.grade)} · {schoolName}</p>
      </div>

      {/* Teacher */}
      <div className="mb-3 min-h-[36px]">
        {teachers.length > 0 && (
          <div className="flex h-9 items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50/60 px-3">
            <UserRound size={12} className="shrink-0 text-indigo-500" />
            <span className="truncate text-[12px] font-semibold text-indigo-700 font-['DM_Sans']">
              {teachers[0].name}{teachers.length > 1 ? ` +${teachers.length - 1}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Performance */}
      <div className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <Eyebrow>Desempenho</Eyebrow>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${perfPill(perf)}`}>
            {perfLabel(perf)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className={`font-['Lora'] text-2xl font-semibold leading-none ${scoreColor(avgResult.average)}`}>
            {avgResult.average !== null ? avgResult.average.toFixed(1) : '—'}
          </p>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${scoreBar(avgResult.average)}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 shrink-0 font-['DM_Sans']">{classStudents.length} alunos</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3 border-t border-slate-300">
        <button type="button" onClick={onViewDetails}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#5b4fe8] px-3 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md active:scale-95 font-['DM_Sans']">
          <Eye size={13} /> Ver detalhes
        </button>
        <button type="button" onClick={onEdit}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-500 bg-white px-3 text-xs font-semibold text-slate-600 transition-all hover:border-slate-700 hover:bg-slate-50 active:scale-95 font-['DM_Sans']">
          <Pencil size={13} /> Editar
        </button>
      </div>
    </article>
  )
}

/* ════════════════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════════════════ */
export default function SchoolsView({
  currentUser, currentRole, schools, schoolsPagination, classes, classesPagination, students, teachers, guardians,
  lessonRecords = [], assetVersion, readOnly = false,
  onLoadSchoolsPage, onLoadClassesPage, onSearchStudents,
  onCreate, onUpdate, onCreateClass, onUpdateClass,
  onCreateTeacher, onCreateStudent, onCreateGuardian,
}: SchoolsViewProps) {
  const isDirectorView = currentRole?.code === 'DIRETOR' || currentRole?.name.toLowerCase().includes('diretor') === true
  const linkedSchoolId = isDirectorView ? currentUser.schoolId ?? '' : ''

  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 1200); return () => clearTimeout(t) }, [])

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [schoolDraft, setSchoolDraft] = useState<Partial<School>>({ ...emptySchool })
  const [schoolEditingId, setSchoolEditingId] = useState<string | null>(null)
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false)
  const [schoolDetailsId, setSchoolDetailsId] = useState<string | null>(null)
  const [schoolFieldErrors, setSchoolFieldErrors] = useState<FieldErrors<SchoolFormField>>({})
  const [schoolSaving, setSchoolSaving] = useState(false)

  const [classDraft, setClassDraft] = useState<Partial<ClassRoom>>({ ...emptyClass })
  const [classEditingId, setClassEditingId] = useState<string | null>(null)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false)
  const [classFieldErrors, setClassFieldErrors] = useState<FieldErrors<ClassFormField>>({})
  const [classSaving, setClassSaving] = useState(false)
  const [selectedSchoolId, setSelectedSchoolId] = useState(linkedSchoolId)
  const [classDetailsId, setClassDetailsId] = useState<string | null>(null)

  const [teacherDraft, setTeacherDraft] = useState<Partial<Teacher> & { classId?: string; password?: string; phone?: string }>({ ...emptyTeacher })
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false)
  const [teacherFieldErrors, setTeacherFieldErrors] = useState<FieldErrors<TeacherFormField>>({})
  const [teacherSaving, setTeacherSaving] = useState(false)

  const [studentDraft, setStudentDraft] = useState<Partial<Student> & { password?: string }>({ ...emptyStudent })
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [studentFieldErrors, setStudentFieldErrors] = useState<FieldErrors<StudentFormField>>({})
  const [studentSaving, setStudentSaving] = useState(false)

  const [guardianDraft, setGuardianDraft] = useState<Partial<Guardian> & { password?: string }>({ ...emptyGuardian })
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false)
  const [guardianFieldErrors, setGuardianFieldErrors] = useState<FieldErrors<GuardianFormField>>({})
  const [guardianSaving, setGuardianSaving] = useState(false)
  const [guardianStudentSearch, setGuardianStudentSearch] = useState('')
  const [guardianStudentResults, setGuardianStudentResults] = useState<Student[]>([])
  const [guardianStudentCache, setGuardianStudentCache] = useState<Student[]>([])
  const [guardianStudentSearchLoading, setGuardianStudentSearchLoading] = useState(false)
  const [guardianStudentSearchError, setGuardianStudentSearchError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [schoolBackendSearch, setSchoolBackendSearch] = useState('')
  const [schoolPage, setSchoolPage] = useState(schoolsPagination?.page ?? 1)
  const [schoolLimit, setSchoolLimit] = useState(schoolsPagination?.limit ?? DEFAULT_PAGE_SIZE)
  const [schoolPageSchools, setSchoolPageSchools] = useState(schools)
  const [schoolPagePagination, setSchoolPagePagination] = useState<PaginationMeta>(
    schoolsPagination ?? getLocalPagination(schools.length, 1, DEFAULT_PAGE_SIZE),
  )
  const [schoolPageLoading, setSchoolPageLoading] = useState(false)
  const [schoolPageError, setSchoolPageError] = useState<string | null>(null)
  const loadSchoolsPageRef = useRef(onLoadSchoolsPage)
  const [classQuery, setClassQuery] = useState('')
  const [classBackendSearch, setClassBackendSearch] = useState('')
  const [classPage, setClassPage] = useState(classesPagination?.page ?? 1)
  const [classLimit, setClassLimit] = useState(classesPagination?.limit ?? DEFAULT_PAGE_SIZE)
  const [classPageClasses, setClassPageClasses] = useState(classes)
  const [classPagePagination, setClassPagePagination] = useState<PaginationMeta>(
    classesPagination ?? getLocalPagination(classes.length, 1, DEFAULT_PAGE_SIZE),
  )
  const [classPageLoading, setClassPageLoading] = useState(false)
  const [classPageError, setClassPageError] = useState<string | null>(null)
  const loadClassesPageRef = useRef(onLoadClassesPage)

  useEffect(() => {
    loadSchoolsPageRef.current = onLoadSchoolsPage
  }, [onLoadSchoolsPage])

  useEffect(() => {
    loadClassesPageRef.current = onLoadClassesPage
  }, [onLoadClassesPage])

  useEffect(() => {
    setSchoolPageSchools(schools)
    setSchoolPagePagination(schoolsPagination ?? getLocalPagination(schools.length, schoolPage, schoolLimit))
  }, [schools, schoolsPagination])

  useEffect(() => {
    setClassPageClasses(classes)
    setClassPagePagination(classesPagination ?? getLocalPagination(classes.length, classPage, classLimit))
  }, [classes, classesPagination])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSchoolPage(1)
      setSchoolBackendSearch(query)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setClassPage(1)
      setClassBackendSearch(classQuery)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [classQuery])

  useEffect(() => {
    setClassPage(1)
  }, [selectedSchoolId])

  useEffect(() => {
    const loadSchoolsPage = loadSchoolsPageRef.current
    if (!loadSchoolsPage) return

    let cancelled = false
    setSchoolPageLoading(true)
    setSchoolPageError(null)

    loadSchoolsPage({ page: schoolPage, limit: schoolLimit, search: schoolBackendSearch })
      .then((payload) => {
        if (cancelled) return
        setSchoolPageSchools(payload.schools)
        setSchoolPagePagination(payload.pagination)
      })
      .catch((error) => {
        if (cancelled) return
        setSchoolPageError(error instanceof Error ? error.message : 'Nao foi possivel carregar as escolas.')
      })
      .finally(() => {
        if (!cancelled) setSchoolPageLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [schoolBackendSearch, schoolLimit, schoolPage])

  useEffect(() => {
    const loadClassesPage = loadClassesPageRef.current
    if (!loadClassesPage || !selectedSchoolId) return

    let cancelled = false
    setClassPageLoading(true)
    setClassPageError(null)

    loadClassesPage({ page: classPage, limit: classLimit, search: classBackendSearch, schoolId: selectedSchoolId })
      .then((payload) => {
        if (cancelled) return
        setClassPageClasses(payload.classes)
        setClassPagePagination(payload.pagination)
      })
      .catch((error) => {
        if (cancelled) return
        setClassPageError(error instanceof Error ? error.message : 'Nao foi possivel carregar as turmas.')
      })
      .finally(() => {
        if (!cancelled) setClassPageLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [classBackendSearch, classLimit, classPage, selectedSchoolId, classes])

  useEffect(() => {
    if (!isGuardianModalOpen) return

    const search = guardianStudentSearch.trim()
    if (search.length < 2) {
      setGuardianStudentResults([])
      setGuardianStudentSearchError(null)
      setGuardianStudentSearchLoading(false)
      return
    }

    let active = true
    const timer = window.setTimeout(() => {
      const params: StudentsPageQuery = {
        page: 1,
        limit: 5,
        search,
        schoolId: isDirectorView ? linkedSchoolId : undefined,
      }

      setGuardianStudentSearchLoading(true)
      setGuardianStudentSearchError(null)

      const request = onSearchStudents
        ? onSearchStudents(params)
        : Promise.resolve({ students: searchLocalGuardianStudents(search, params.schoolId), pagination: getLocalPagination(searchLocalGuardianStudents(search, params.schoolId).length, 1, 5) })

      request
        .then((payload) => {
          if (!active) return
          const results = payload.students.slice(0, 5)
          setGuardianStudentResults(results)
          setGuardianStudentCache((current) => {
            const map = new Map(current.map((student) => [student.id, student]))
            results.forEach((student) => map.set(student.id, student))
            return Array.from(map.values())
          })
        })
        .catch((error) => {
          if (!active) return
          setGuardianStudentResults(onSearchStudents ? [] : searchLocalGuardianStudents(search, params.schoolId))
          setGuardianStudentSearchError(error instanceof Error ? error.message : 'Nao foi possivel buscar alunos no banco.')
        })
        .finally(() => {
          if (active) setGuardianStudentSearchLoading(false)
        })
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [guardianStudentSearch, isDirectorView, isGuardianModalOpen, linkedSchoolId, onSearchStudents, students])

  const schoolsForList = onLoadSchoolsPage ? schoolPageSchools : schools
  const classesForList = onLoadClassesPage ? classPageClasses : classes

  const visibleSchools = useMemo(
    () => isDirectorView ? schoolsForList.filter(s => s.id === linkedSchoolId) : schoolsForList,
    [isDirectorView, linkedSchoolId, schoolsForList],
  )
  const selectedSchool = useMemo(() => visibleSchools.find(s => s.id === selectedSchoolId) ?? null, [selectedSchoolId, visibleSchools])
  const detailsSchool = useMemo(() => schoolDetailsId ? schoolsForList.find(s => s.id === schoolDetailsId) ?? schools.find(s => s.id === schoolDetailsId) ?? null : null, [schoolDetailsId, schools, schoolsForList])
  const detailsClass = useMemo(() => classDetailsId ? classesForList.find(c => c.id === classDetailsId) ?? classes.find(c => c.id === classDetailsId) ?? null : null, [classDetailsId, classes, classesForList])

  function isCurrentLinkedProfile(entity: ProfilePreviewEntity) {
    return Boolean(entity.id && (entity.id === currentUser.linkedStudentId || entity.id === currentUser.linkedTeacherId || entity.userId === currentUser.id))
  }
  function withCurrentUserVisuals<T extends ProfilePreviewEntity>(entity: T): T {
    if (!isCurrentLinkedProfile(entity)) return entity
    return { ...entity, avatarUrl: currentUser.avatarUrl, bannerUrl: currentUser.bannerUrl }
  }
  function getProfileAssetVersion(entity: ProfilePreviewEntity) {
    return isCurrentLinkedProfile(entity) ? assetVersion : undefined
  }
  function getStudentAttendanceRate(student: Pick<Student, 'id' | 'classId' | 'attendanceRate'> | null | undefined) {
    return getStudentAttendanceRateFromLessons(student, lessonRecords, student?.attendanceRate ?? 0)
  }
  function getClassAttendanceRate(classStudents: Student[]) {
    if (!classStudents.length) return null
    return getAverageLessonAttendanceRate(classStudents, lessonRecords)
  }

  useEffect(() => {
    if (isDirectorView) { setSelectedSchoolId(linkedSchoolId); return }
    if (selectedSchoolId && !visibleSchools.some(s => s.id === selectedSchoolId)) setSelectedSchoolId('')
  }, [isDirectorView, linkedSchoolId, selectedSchoolId, visibleSchools])

  const filteredSchools = useMemo(() => {
    if (onLoadSchoolsPage) return visibleSchools
    const q = query.trim().toLowerCase()
    if (!q) return visibleSchools
    return visibleSchools.filter(s => s.name.toLowerCase().includes(q))
  }, [onLoadSchoolsPage, query, visibleSchools])

  const filteredClasses = useMemo(() => {
    if (!selectedSchoolId) return []
    if (onLoadClassesPage) return classesForList

    const q = classQuery.trim().toLowerCase()
    return classesForList.filter((classRoom) => (
      classRoom.schoolId === selectedSchoolId
      && (!q || classRoom.name.toLowerCase().includes(q))
    ))
  }, [classQuery, classesForList, onLoadClassesPage, selectedSchoolId])

  const schoolOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: '', label: 'Selecione a escola', disabled: true }, ...visibleSchools.map(s => ({ value: s.id, label: s.name }))], [visibleSchools])
  const teacherOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: '', label: 'Selecione o professor', disabled: true }, ...teachers.filter(t => !classDraft.schoolId || t.schoolId === classDraft.schoolId).map(t => ({ value: t.id, label: t.name, description: getReadableDisciplines([t.specialty]).join(', ') || 'Sem disciplina' }))], [classDraft.schoolId, teachers])
  const classTeacherCandidates = useMemo(() => teachers.filter(t => !classDraft.schoolId || t.schoolId === classDraft.schoolId), [classDraft.schoolId, teachers])
  const classGradeOptions = useMemo<Array<CompactSelectOption<string>>>(() => getClassGradeOptions(classDraft.grade), [classDraft.grade])
  const classOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: '', label: 'Sem turma vinculada' }, ...classes.filter(c => !teacherDraft.schoolId || c.schoolId === teacherDraft.schoolId).map(c => ({ value: c.id, label: c.name, description: getSchoolName(c.schoolId) }))], [classes, teacherDraft.schoolId])
  const officialTeacherSubjects = useMemo(() => Array.from(new Set([
    ...getOfficialAcademicSubjectsForGrade('EF1'),
    ...getOfficialAcademicSubjectsForGrade('EF6'),
    ...getOfficialAcademicSubjectsForGrade('EM1'),
  ])), [])
  const selectedTeacherSubjects = useMemo(() => getReadableDisciplines(splitDisciplineList(teacherDraft.specialty ?? '')), [teacherDraft.specialty])
  const studentClassOptions = useMemo<Array<CompactSelectOption<string>>>(() => [{ value: '', label: 'Selecione a turma', disabled: true }, ...classes.filter(c => !studentDraft.schoolId || c.schoolId === studentDraft.schoolId).map(c => ({ value: c.id, label: c.name, description: getSchoolName(c.schoolId) }))], [classes, studentDraft.schoolId])
  const guardianKnownStudents = useMemo(() => {
    const map = new Map<string, Student>()
    ;[...students, ...guardianStudentResults, ...guardianStudentCache].forEach((student) => map.set(student.id, student))
    return map
  }, [guardianStudentCache, guardianStudentResults, students])
  const guardianSelectedStudents = useMemo(() => (
    (guardianDraft.studentIds ?? []).map((id) => guardianKnownStudents.get(id)).filter((student): student is Student => Boolean(student))
  ), [guardianDraft.studentIds, guardianKnownStudents])
  const studentSchoolGuardians = useMemo(() => guardians.filter(g => !studentDraft.schoolId || g.schoolId === studentDraft.schoolId), [guardians, studentDraft.schoolId])
  const shiftOptions: Array<CompactSelectOption<ClassRoom['shift']>> = [{ value: 'Manha', label: 'Manhã' }, { value: 'Tarde', label: 'Tarde' }, { value: 'Noite', label: 'Noite' }]
  const performanceOptions: Array<CompactSelectOption<Desempenho>> = [{ value: 'Otimo', label: 'Ótimo' }, { value: 'Medio', label: 'Médio' }, { value: 'Baixo', label: 'Baixo' }]

  function getSchoolName(id: string) { return schools.find(s => s.id === id)?.name ?? 'Escola não localizada' }
  function getClassName(id: string) { return classes.find(c => c.id === id)?.name ?? 'Turma não localizada' }
  function getClassTeachers(cr: ClassRoom) {
    const ids = new Set([cr.teacherId, ...(cr.teacherIds ?? [])].filter(Boolean))
    return teachers.filter(t => ids.has(t.id))
  }
  function splitDisciplineList(v: string) { return v.split(',').map(x => x.trim()).filter(Boolean) }
  function getReadableDisciplines(values?: string[], grade?: string | null) {
    return grade ? getOfficialAcademicSubjectListForGrade(values ?? [], grade) : getOfficialAcademicSubjectList(values ?? [])
  }
  function getClassDisciplines(classId?: string) {
    const classRoom = classes.find(c => c.id === classId)
    return getReadableDisciplines(classRoom?.bnccFocus, classRoom?.grade)
  }
  function getGuardianName(id: string) { return guardians.find(g => g.id === id)?.name ?? 'Responsável pendente' }
  function getDefaultSchoolId() { return selectedSchoolId || linkedSchoolId }
  function normalizeSearchText(value?: string | null) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  }
  function searchLocalGuardianStudents(search: string, schoolId?: string) {
    const q = normalizeSearchText(search)
    if (!q) return []
    return students
      .filter((student) => (
        (!schoolId || student.schoolId === schoolId)
        && [
          student.name,
          student.registrationNumber,
          student.registration,
          getClassName(student.classId),
          getSchoolName(student.schoolId),
        ].some((value) => normalizeSearchText(value).includes(q))
      ))
      .sort((a, b) => {
        const an = normalizeSearchText(a.name)
        const bn = normalizeSearchText(b.name)
        const aScore = an === q ? 0 : an.startsWith(q) ? 1 : an.includes(q) ? 2 : 3
        const bScore = bn === q ? 0 : bn.startsWith(q) ? 1 : bn.includes(q) ? 2 : 3
        return aScore - bScore || an.localeCompare(bn)
      })
      .slice(0, 5)
  }
  function toggleTeacherSubject(subject: string) {
    const current = new Set(selectedTeacherSubjects)
    if (current.has(subject)) current.delete(subject)
    else current.add(subject)
    setTeacherDraft({ ...teacherDraft, specialty: Array.from(current).join(', ') })
    clearF(setTeacherFieldErrors, 'specialty')
  }

  const clearF = <T extends string>(setter: React.Dispatch<React.SetStateAction<FieldErrors<T>>>, field: T) =>
    setter(cur => ({ ...cur, [field]: undefined }))

  /* School CRUD */
  function openCreateSchoolModal() { setSchoolEditingId(null); setSchoolFieldErrors({}); setSchoolDraft({ ...emptySchool }); setIsSchoolModalOpen(true) }
  function openEditSchoolModal(s: School) { setSchoolEditingId(s.id); setSchoolFieldErrors({}); setSchoolDraft({ ...s }); setIsSchoolModalOpen(true) }
  function closeSchoolModal() { setSchoolEditingId(null); setSchoolFieldErrors({}); setSchoolDraft({ ...emptySchool }); setIsSchoolModalOpen(false) }
  async function handleSchoolSubmit(e: FormEvent) {
    e.preventDefault()
    const result = schoolFormSchema.safeParse(schoolDraft)
    if (!result.success) { setSchoolFieldErrors(zodFieldErrors<SchoolFormField>(result.error)); return }
    setSchoolFieldErrors({}); setSchoolSaving(true)
    try {
      const payload = { ...schoolDraft, ...result.data }
      if (schoolEditingId) await onUpdate(schoolEditingId, payload); else await onCreate(payload)
      setToast({ msg: schoolEditingId ? 'Escola atualizada com sucesso!' : 'Escola cadastrada com sucesso!', type: 'success' })
      closeSchoolModal()
    } catch { setToast({ msg: 'Não foi possível salvar a escola.', type: 'error' }) }
    finally { setSchoolSaving(false) }
  }

  /* Class CRUD */
  function openCreateClassModal() { setClassEditingId(null); setClassFieldErrors({}); setClassDraft({ ...emptyClass, schoolId: getDefaultSchoolId() }); setIsClassModalOpen(true) }
  function openEditClassModal(cr: ClassRoom) { setClassEditingId(cr.id); setClassFieldErrors({}); setClassDraft({ ...cr, bnccFocus: getOfficialAcademicSubjectListForGrade(cr.bnccFocus ?? [], cr.grade) }); setIsClassModalOpen(true) }
  function closeClassModal() { setClassEditingId(null); setClassFieldErrors({}); setClassDraft({ ...emptyClass }); setIsClassModalOpen(false) }
  async function handleClassSubmit(e: FormEvent) {
    e.preventDefault()
    const result = classFormSchema.safeParse(classDraft)
    if (!result.success) { setClassFieldErrors(zodFieldErrors<ClassFormField>(result.error)); return }
    setClassFieldErrors({}); setClassSaving(true)
    try {
      const parsedIds = Array.from(new Set([result.data.teacherId, ...result.data.teacherIds].filter((id): id is string => Boolean(id))))
      const bnccFocus = getOfficialAcademicSubjectListForGrade(result.data.bnccFocus ?? [], result.data.grade)
      const payload = { ...classDraft, ...result.data, teacherIds: parsedIds, bnccFocus }
      if (classEditingId) await onUpdateClass(classEditingId, payload); else await onCreateClass(payload)
      setToast({ msg: classEditingId ? 'Turma atualizada!' : 'Turma criada com sucesso!', type: 'success' })
      closeClassModal()
    } catch { setToast({ msg: 'Não foi possível salvar a turma.', type: 'error' }) }
    finally { setClassSaving(false) }
  }
  function toggleClassTeacher(teacherId: string) {
    setClassDraft(cur => {
      const sel = new Set<string>([...(cur.teacherIds ?? []), cur.teacherId].filter((id): id is string => Boolean(id)))
      if (teacherId === cur.teacherId) sel.add(teacherId)
      else if (sel.has(teacherId)) sel.delete(teacherId)
      else sel.add(teacherId)
      return { ...cur, teacherIds: Array.from(sel) }
    })
  }

  /* Teacher */
  function openCreateTeacherModal(cr?: ClassRoom) { setTeacherFieldErrors({}); setTeacherDraft({ ...emptyTeacher, schoolId: cr?.schoolId ?? getDefaultSchoolId(), classId: cr?.id ?? '' }); setIsTeacherModalOpen(true) }
  function closeTeacherModal() { setTeacherFieldErrors({}); setTeacherDraft({ ...emptyTeacher }); setIsTeacherModalOpen(false) }
  async function handleTeacherSubmit(e: FormEvent) {
    e.preventDefault()
    const result = teacherFormSchema.safeParse(teacherDraft)
    if (!result.success) { setTeacherFieldErrors(zodFieldErrors<TeacherFormField>(result.error)); return }
    const specialty = getOfficialAcademicSubjectList([result.data.specialty]).join(', ')
    if (!specialty) {
      setTeacherFieldErrors({ specialty: 'Informe apenas disciplinas oficiais do sistema.' })
      return
    }
    setTeacherFieldErrors({}); setTeacherSaving(true)
    try { await onCreateTeacher({ ...teacherDraft, ...result.data, specialty }); setToast({ msg: 'Professor cadastrado!', type: 'success' }); closeTeacherModal() }
    catch { setToast({ msg: 'Não foi possível salvar o professor.', type: 'error' }) }
    finally { setTeacherSaving(false) }
  }

  /* Student */
  function openCreateStudentModal(cr?: ClassRoom) { setStudentFieldErrors({}); setStudentDraft({ ...emptyStudent, schoolId: cr?.schoolId ?? getDefaultSchoolId(), classId: cr?.id ?? '', guardianIds: [] }); setIsStudentModalOpen(true) }
  function closeStudentModal() { setStudentFieldErrors({}); setStudentDraft({ ...emptyStudent }); setIsStudentModalOpen(false) }
  async function handleStudentSubmit(e: FormEvent) {
    e.preventDefault()
    const result = studentFormSchema.safeParse({ ...studentDraft, desempenho: getStudentPerformance(studentDraft) })
    if (!result.success) { setStudentFieldErrors(zodFieldErrors<StudentFormField>(result.error)); return }
    setStudentFieldErrors({}); setStudentSaving(true)
    try { await onCreateStudent({ ...studentDraft, ...result.data }); setToast({ msg: 'Aluno cadastrado!', type: 'success' }); closeStudentModal() }
    catch { setToast({ msg: 'Não foi possível salvar o aluno.', type: 'error' }) }
    finally { setStudentSaving(false) }
  }

  /* Guardian */
  function openCreateGuardianModal(cr?: ClassRoom) {
    setGuardianFieldErrors({})
    setGuardianDraft({ ...emptyGuardian, schoolId: cr?.schoolId ?? getDefaultSchoolId(), studentIds: cr ? students.filter(s => s.classId === cr.id).map(s => s.id) : [] })
    setGuardianStudentSearch('')
    setGuardianStudentResults([])
    setGuardianStudentCache(cr ? students.filter(s => s.classId === cr.id) : [])
    setGuardianStudentSearchError(null)
    setIsGuardianModalOpen(true)
  }
  function closeGuardianModal() {
    setGuardianFieldErrors({})
    setGuardianDraft({ ...emptyGuardian })
    setGuardianStudentSearch('')
    setGuardianStudentResults([])
    setGuardianStudentCache([])
    setGuardianStudentSearchError(null)
    setIsGuardianModalOpen(false)
  }
  async function handleGuardianSubmit(e: FormEvent) {
    e.preventDefault()
    const result = guardianFormSchema.safeParse(guardianDraft)
    if (!result.success) { setGuardianFieldErrors(zodFieldErrors<GuardianFormField>(result.error)); return }
    setGuardianFieldErrors({}); setGuardianSaving(true)
    try { await onCreateGuardian({ ...guardianDraft, ...result.data }); setToast({ msg: 'Responsável cadastrado!', type: 'success' }); closeGuardianModal() }
    catch { setToast({ msg: 'Não foi possível salvar o responsável.', type: 'error' }) }
    finally { setGuardianSaving(false) }
  }

  function toggleStudentGuardian(id: string) {
    const cur = studentDraft.guardianIds ?? []
    setStudentDraft({ ...studentDraft, guardianIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] })
  }
  function toggleGuardianStudent(id: string, student?: Student) {
    const cur = guardianDraft.studentIds ?? []
    if (student) {
      setGuardianStudentCache((current) => {
        const map = new Map(current.map((item) => [item.id, item]))
        map.set(student.id, student)
        return Array.from(map.values())
      })
    }
    setGuardianDraft({ ...guardianDraft, studentIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] })
  }

  const totalActive = visibleSchools.filter(s => s.active).length
  const totalStudents = students.filter(s => visibleSchools.some(sc => sc.id === s.schoolId)).length
  const schoolResultsTotal = onLoadSchoolsPage ? schoolPagePagination.total : filteredSchools.length
  const classResultsTotal = onLoadClassesPage ? classPagePagination.total : filteredClasses.length

  /* ── Render ── */
  return (
    <>
      <style>{`
        @keyframes sv-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sv-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sv-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        @keyframes sv-scale-in {
          from { opacity: 0; transform: scale(0.97) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .sv-page { animation: sv-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .sv-section { animation: sv-fade-up 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .sv-section:nth-child(2) { animation-delay: 0.06s; }
        .sv-section:nth-child(3) { animation-delay: 0.12s; }
        .sv-card { animation: sv-fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .sv-card:nth-child(1) { animation-delay: 0.04s; }
        .sv-card:nth-child(2) { animation-delay: 0.08s; }
        .sv-card:nth-child(3) { animation-delay: 0.12s; }
        .sv-card:nth-child(4) { animation-delay: 0.16s; }
        .sv-card:nth-child(5) { animation-delay: 0.20s; }
        .sv-card:nth-child(6) { animation-delay: 0.24s; }
        .sv-shimmer {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
          background-size: 600px 100%;
          animation: sv-shimmer 1.8s ease-in-out infinite;
          border-radius: 8px;
        }
        .sv-backdrop {
          background: rgba(15,23,42,0.45);
          backdrop-filter: blur(8px);
          animation: sv-fade-in 0.2s ease both;
        }
        .sv-modal { animation: sv-scale-in 0.25s cubic-bezier(0.22,1,0.36,1) both; }
        .sv-school-selected {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.10), 0 6px 18px rgba(99,102,241,0.08);
        }
        .sv-school-card { transition: all 0.2s cubic-bezier(0.22,1,0.36,1); }
        .sv-school-card:hover:not(.sv-school-selected) {
          border-color: #c7d2fe;
          box-shadow: 0 4px 14px rgba(99,102,241,0.06);
          transform: translateY(-2px);
        }
        .sv-class-card { transition: all 0.2s cubic-bezier(0.22,1,0.36,1); }
        .sv-class-card:hover { transform: translateY(-2px); }
        .sv-icon-btn { transition: all 0.15s ease; }
        .sv-icon-btn:hover { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; }
        .sv-empty-state { animation: sv-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
        .fill-mode-both { animation-fill-mode: both; }
      `}</style>

      <div className="sv-page min-h-screen w-full bg-slate-50 text-slate-900 font-['DM_Sans']">
        <div className="mx-auto max-w-[1800px] px-[clamp(12px,3vw,40px)] py-6 pb-20 space-y-5">

          {/* ═══ HEADER (estilo landing: eyebrow + Lora) ═══ */}
          <header className="sv-section">
            <Eyebrow>Gestão escolar · Rede de ensino</Eyebrow>
            <div className="flex items-end justify-between gap-4 flex-wrap mt-1">
              <h1 className="font-DMSans text-3xl lg:text-4xl font-semibold text-slate-900 leading-tight tracking-tight">Escolas</h1>
            </div>

            {/* Context bar (sem barra colorida no topo, divisórias finas) */}
            <div className="mt-4 rounded-2xl border border-slate-300 bg-white shadow-sm overflow-hidden">
              <div className="grid gap-0 divide-x divide-slate-100 sm:grid-cols-[1fr_1fr_auto]">
                {/* Search */}
                {!isDirectorView && (
                  <div className="flex flex-col gap-2 p-4">
                    <Eyebrow>Buscar escola</Eyebrow>
                    <label className="flex items-center gap-2.5 rounded-lg border border-slate-400 bg-white px-3 py-2 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 hover:border-indigo-500">
                      <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome da escola"
                        className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400" />
                      {query && <button type="button" onClick={() => setQuery('')}><X className="h-3.5 w-3.5 text-slate-400" /></button>}
                    </label>
                  </div>
                )}

                {/* Selected school */}
                <div className="flex flex-col gap-2 p-4">
                  <Eyebrow>Escola selecionada</Eyebrow>
                  <div className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-all
                    ${selectedSchool ? 'border-indigo-300 bg-indigo-50/60 text-indigo-900' : 'border-slate-300 bg-slate-50 text-slate-400'}`}>
                    {selectedSchool
                      ? <><Building2 className="h-3.5 w-3.5 shrink-0 text-indigo-500" /><span className="truncate">{selectedSchool.name}</span></>
                      : <><Building2 className="h-3.5 w-3.5 shrink-0" /><span>Clique em uma escola</span></>}
                  </div>
                </div>

                {/* Global metrics */}
                <div className="flex flex-col justify-between gap-3 p-4 min-w-[320px]">
                  <div className="grid grid-cols-3 gap-2">
                    <MetricTile label="Escolas" value={visibleSchools.length} accent="text-slate-900" />
                    <MetricTile label="Turmas" value={classes.length} accent="text-indigo-600" />
                    <MetricTile label="Alunos" value={totalStudents} accent="text-violet-600" />
                  </div>
                  {visibleSchools.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <Eyebrow>Escolas ativas</Eyebrow>
                        <span className="text-[10px] font-semibold text-indigo-600 font-['DM_Sans']">{Math.round((totalActive / visibleSchools.length) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000" style={{ width: `${(totalActive / visibleSchools.length) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Toast */}
          {toast && <AppToastNotice message={toast.msg} tone={toast.type} onClose={() => setToast(null)} />}

          {/* ═══ SECTION 1 — Schools ═══ */}
          {!isDirectorView && (
            <section className="sv-section overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
                <SectionHeader
                  icon={Building2}
                  label="Escolas"
                  title="Unidades cadastradas"
                  description={`${schoolResultsTotal} escola${schoolResultsTotal !== 1 ? 's' : ''} encontrada${schoolResultsTotal !== 1 ? 's' : ''}`}
                />
                {!readOnly && (
                  <PrimaryBtn onClick={openCreateSchoolModal}>
                    <Plus size={15} /> Nova escola
                  </PrimaryBtn>
                )}
              </div>
              <div className="p-5">
                {schoolPageError && (
                  <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                    {schoolPageError}
                  </div>
                )}
                {loading || schoolPageLoading ? (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                    {[0,1,2].map(i => <SkeletonSchoolCard key={i} />)}
                  </div>
                ) : filteredSchools.length > 0 ? (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredSchools.map((school, i) => (
                      <SchoolCard
                        key={school.id} school={school}
                        classCount={classes.filter(c => c.schoolId === school.id).length}
                        studentCount={students.filter(s => s.schoolId === school.id).length}
                        isSelected={selectedSchoolId === school.id}
                        animDelay={i * 50}
                        onSelect={() => setSelectedSchoolId(school.id)}
                        onEdit={() => openEditSchoolModal(school)}
                        onViewDetails={() => setSchoolDetailsId(school.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Building2}
                    title={query ? 'Nenhuma escola encontrada' : 'Nenhuma escola cadastrada'}
                    sub={query ? 'Tente ajustar o termo de busca.' : 'Comece cadastrando a primeira escola da rede.'}
                    action={!readOnly && !query ? (
                      <PrimaryBtn onClick={openCreateSchoolModal}><Plus size={15} /> Cadastrar escola</PrimaryBtn>
                    ) : undefined}
                  />
                )}
              </div>
              {onLoadSchoolsPage && (
                <PaginationControls
                  label="Escolas"
                  pagination={schoolPagePagination}
                  limit={schoolLimit}
                  loading={schoolPageLoading}
                  source="backend"
                  onPageChange={(page) => setSchoolPage(page)}
                  onLimitChange={(limit) => {
                    setSchoolLimit(limit)
                    setSchoolPage(1)
                  }}
                />
              )}
            </section>
          )}

          {/* ═══ SECTION 2 — Classes ═══ */}
          <section className="sv-section overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <SectionHeader
                icon={GraduationCap}
                label="Turmas"
                title={selectedSchool ? selectedSchool.name : 'Selecione uma escola'}
                description={selectedSchool
                  ? `${classResultsTotal} turma${classResultsTotal !== 1 ? 's' : ''} vinculada${classResultsTotal !== 1 ? 's' : ''}`
                  : 'Escolha uma escola acima para listar as turmas.'}
              />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="flex h-10 min-w-[240px] items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 hover:border-indigo-300">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    value={classQuery}
                    onChange={e => setClassQuery(e.target.value)}
                    placeholder="Buscar turma"
                    disabled={!selectedSchool}
                    className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                  />
                  {classQuery && (
                    <button type="button" onClick={() => setClassQuery('')} aria-label="Limpar busca de turmas">
                      <X className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  )}
                </label>
                {/* Quick-add toolbar */}
                {!readOnly && (
                  <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                    {[
                      { title: 'Cadastrar professor', icon: UserRound, action: () => openCreateTeacherModal(), hover: 'hover:bg-indigo-200/90 hover:text-indigo-600' },
                      { title: 'Cadastrar aluno', icon: GraduationCap, action: () => openCreateStudentModal(), hover: 'hover:bg-violet-200/90 hover:text-violet-600' },
                      { title: 'Cadastrar responsável', icon: Shield, action: () => openCreateGuardianModal(), hover: 'hover:bg-emerald-100 hover:text-emerald-600' },
                    ].map((btn, i, arr) => (
                      <button key={btn.title} type="button" title={btn.title} disabled={!selectedSchool}
                        onClick={btn.action}
                        className={`flex h-9 w-9 items-center justify-center text-slate-500 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${btn.hover} ${i < arr.length - 1 ? 'border-r border-slate-200' : ''}`}>
                        <btn.icon size={15} />
                      </button>
                    ))}
                  </div>
                )}
                {!readOnly && (
                  <PrimaryBtn disabled={!selectedSchool} onClick={openCreateClassModal}>
                    <Plus size={15} /> Nova turma
                  </PrimaryBtn>
                )}
              </div>
            </div>
            <div className="p-5">
              {classPageError && (
                <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {classPageError}
                </div>
              )}
              {loading || classPageLoading ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {[0,1,2].map(i => <SkeletonClassCard key={i} />)}
                </div>
              ) : !selectedSchool ? (
                <EmptyState icon={GraduationCap} title="Escola não selecionada" sub="Clique em uma escola acima para listar as turmas." />
              ) : filteredClasses.length > 0 ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredClasses.map((cr, i) => (
                    <ClassCard
                      key={cr.id} classRoom={cr}
                      schoolName={getSchoolName(cr.schoolId)}
                      teachers={getClassTeachers(cr)}
                      students={students.filter(s => s.classId === cr.id)}
                      animDelay={i * 50}
                      onEdit={() => openEditClassModal(cr)}
                      onViewDetails={() => setClassDetailsId(cr.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={GraduationCap}
                  title={classBackendSearch ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada'}
                  sub={classBackendSearch ? 'Tente ajustar o nome pesquisado.' : 'Crie uma turma para vincular professores e alunos.'}
                  action={!readOnly && !classBackendSearch ? <PrimaryBtn onClick={openCreateClassModal}><Plus size={15} /> Criar turma</PrimaryBtn> : undefined}
                />
              )}
            </div>
            {selectedSchool && onLoadClassesPage && (
              <PaginationControls
                label="Turmas"
                pagination={classPagePagination}
                limit={classLimit}
                loading={classPageLoading}
                source="backend"
                pageSizeOptions={classPageSizeOptions}
                onPageChange={(page) => setClassPage(page)}
                onLimitChange={(limit) => {
                  setClassLimit(limit)
                  setClassPage(1)
                }}
              />
            )}
          </section>

        </div>
      </div>

      {/* ══ MODAL — School Details ══ */}
      {detailsSchool && (() => {
        const sc = classes.filter(c => c.schoolId === detailsSchool.id)
        const ss = students.filter(s => s.schoolId === detailsSchool.id)
        return (
          <LightModal open onClose={() => setSchoolDetailsId(null)} title={detailsSchool.name} subtitle="Detalhes da escola" wide>
            <div className="p-6 space-y-5">
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {[
                  { label: 'Cidade', value: detailsSchool.city || '—', cls: 'bg-sky-50 text-sky-700 border border-sky-100', icon: MapPin },
                  { label: 'Diretor', value: detailsSchool.director || '—', cls: 'bg-indigo-50 text-indigo-700 border border-indigo-100', icon: User },
                  { label: 'INEP', value: detailsSchool.inepCode || '—', cls: 'bg-slate-50 text-slate-600 border border-slate-100', icon: Hash },
                  { label: 'Status', value: detailsSchool.active ? 'Ativa' : 'Inativa', cls: detailsSchool.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100', icon: Zap },
                  { label: 'Turmas', value: sc.length, cls: 'bg-violet-50 text-violet-700 border border-violet-100', icon: Layers },
                  { label: 'Alunos', value: ss.length, cls: 'bg-amber-50 text-amber-700 border border-amber-100', icon: Users },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl px-3 py-2.5 ${s.cls}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <s.icon size={10} className="opacity-60" />
                      <span className="text-[10px] font-semibold uppercase tracking-[.12em] opacity-70 font-['DM_Sans']">{s.label}</span>
                    </div>
                    <div className="font-['Lora'] text-base font-semibold leading-none">{s.value}</div>
                  </div>
                ))}
              </div>

              {detailsSchool.address && (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 font-medium">
                  <MapPin size={15} className="shrink-0 text-indigo-500" />
                  {detailsSchool.address}
                </div>
              )}

              {/* Classes list */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Layers size={13} className="text-indigo-500" />
                  <Eyebrow>Turmas vinculadas</Eyebrow>
                </div>
                <div className="space-y-2">
                  {sc.map(cr => {
                    const cStudents = students.filter(s => s.classId === cr.id)
                    const cTeachers = getClassTeachers(cr)
                    return (
                      <div key={cr.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 hover:border-indigo-200 transition-colors">
                        <div className="min-w-0">
                          <p className="font-['Lora'] text-sm font-semibold text-slate-900">{cr.name}</p>
                          <p className="text-[11px] text-slate-400 font-medium">{formatClassGrade(cr.grade)} · {cr.shift} · {cTeachers.map(t => t.name).join(', ') || 'Professor pendente'}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="flex items-center gap-1 text-xs font-semibold text-slate-400"><Users size={11} />{cStudents.length}</span>
                          <GhostBtn onClick={() => { setSchoolDetailsId(null); setClassDetailsId(cr.id) }}>
                            <Eye size={12} /> Ver
                          </GhostBtn>
                        </div>
                      </div>
                    )
                  })}
                  {sc.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">Nenhuma turma cadastrada.</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <SecondaryBtn onClick={() => setSchoolDetailsId(null)}>Fechar</SecondaryBtn>
                {!readOnly && (
                  <PrimaryBtn onClick={() => { setSchoolDetailsId(null); openEditSchoolModal(detailsSchool) }}>
                    <Pencil size={14} /> Editar escola
                  </PrimaryBtn>
                )}
              </div>
            </div>
          </LightModal>
        )
      })()}

      {/* ══ MODAL — Class Details ══ */}
      {detailsClass && (() => {
        const classStudents = students.filter(s => s.classId === detailsClass.id)
        const classTeachers = getClassTeachers(detailsClass)
        const avgResult = getClassAverageScore(classStudents)
        const perf = getPerformanceFromScore(avgResult.average)
        const avgAttendance = getClassAttendanceRate(classStudents)
        const pct = avgResult.average !== null ? Math.min(100, (avgResult.average / 10) * 100) : 0

        return (
          <LightModal open onClose={() => setClassDetailsId(null)} title={detailsClass.name} subtitle="Detalhes da turma" wide
            headerAction={!readOnly ? (
              <button type="button" onClick={() => { setClassDetailsId(null); openEditClassModal(detailsClass) }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-500 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 font-['DM_Sans']">
                <Pencil size={13} /> Editar turma
              </button>
            ) : undefined}
          >
            <div className="p-6 space-y-5">

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3 max-[640px]:grid-cols-2">
                {[
                  { label: 'Turno', value: shiftLabel(detailsClass.shift), icon: Clock3, cls: 'bg-slate-50 border border-slate-300 text-slate-700' },
                  { label: 'Alunos', value: classStudents.length, icon: Users, cls: 'bg-indigo-50 border border-indigo-200 text-indigo-700' },
                  { label: 'Professores', value: classTeachers.length || (detailsClass.teacherId ? 1 : 0), icon: UserRound, cls: 'bg-violet-50 border border-violet-200 text-violet-700' },
                  { label: 'Ano letivo', value: detailsClass.academicYear, icon: Calendar, cls: 'bg-slate-50 border border-slate-300 text-slate-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl px-3.5 py-2.5 ${s.cls}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <s.icon size={11} className="opacity-50" />
                      <span className="text-[10px] font-semibold uppercase tracking-[.14em] opacity-60 font-['DM_Sans']">{s.label}</span>
                    </div>
                    <div className="font-['Lora'] text-xl font-semibold leading-none">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Quick add */}
              {!readOnly && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-2.5">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-indigo-500 mr-1 font-['DM_Sans']">
                    <Plus size={11} /> Adicionar
                  </span>
                  {[
                    { label: 'Professor', icon: UserRound, action: () => { setClassDetailsId(null); openCreateTeacherModal(detailsClass) }, cls: 'border-indigo-200 text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50' },
                    { label: 'Aluno', icon: GraduationCap, action: () => { setClassDetailsId(null); openCreateStudentModal(detailsClass) }, cls: 'border-violet-200 text-violet-700 hover:border-violet-400 hover:bg-violet-50' },
                    { label: 'Responsável', icon: Shield, action: () => { setClassDetailsId(null); openCreateGuardianModal(detailsClass) }, cls: 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50' },
                  ].map(btn => (
                    <button key={btn.label} type="button" onClick={btn.action}
                      className={`inline-flex items-center gap-1.5 rounded-md border bg-white px-2.5 py-1 text-xs font-semibold transition-all font-['DM_Sans'] ${btn.cls}`}>
                      <btn.icon size={12} /> {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Teachers */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <UserRound size={13} className="text-indigo-500" />
                  <Eyebrow>Professores</Eyebrow>
                </div>
                <div className="grid max-h-[220px] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-1 max-[640px]:max-h-[180px] max-[640px]:grid-cols-1">
                  {classTeachers.map((t, i) => {
                    const p = withCurrentUserVisuals(t)
                    const rowColors = ['border-indigo-300/80 bg-indigo-50/60', 'border-violet-100 bg-violet-50/60', 'border-slate-100 bg-slate-50', 'border-slate-100 bg-slate-50']
                    return (
                      <div key={t.id} className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 ${rowColors[i % rowColors.length]}`}>
                        <ProfileAvatar entity={p} size="md" assetVersion={getProfileAssetVersion(t)} />
                        <div className="min-w-0">
                          <p className="truncate font-['Lora'] text-sm font-semibold text-slate-900">{t.name}</p>
                          <p className="truncate text-[11px] text-slate-400 font-medium">{getReadableDisciplines([t.specialty]).join(', ') || 'Especialidade não informada'}</p>
                        </div>
                      </div>
                    )
                  })}
                  {classTeachers.length === 0 && (
                    <div className="col-span-2 rounded-lg border border-dashed border-slate-200 py-5 text-center text-sm text-slate-400">Nenhum professor vinculado.</div>
                  )}
                </div>
              </div>

              {/* Students list */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-indigo-500" />
                    <Eyebrow>Alunos da turma</Eyebrow>
                  </div>
                  <span className="rounded-full bg-indigo-50 border border-indigo-300 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{classStudents.length}</span>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  {classStudents.map((s, i) => {
                    const sp = withCurrentUserVisuals(s)
                    const perf = getStudentPerformance(s)
                    const sc = s.averageScore ?? null
                    const scorePct = sc !== null ? Math.min(100, (sc / 10) * 100) : 0
                    const attendanceRate = getStudentAttendanceRate(s)
                    const freqGood = attendanceRate >= 75
                    const freqWarn = attendanceRate >= 60
                    const freqBarCls = freqGood ? 'bg-emerald-500' : freqWarn ? 'bg-amber-400' : 'bg-rose-500'
                    const freqTextCls = freqGood ? 'text-emerald-600' : freqWarn ? 'text-amber-600' : 'text-rose-600'

                    return (
                      <article
                        key={s.id}
                        style={{ animationDelay: `${i * 20}ms` }}
                        className={`relative flex items-center gap-3.5 overflow-hidden rounded-lg border-l-[3px] border border-slate-300 bg-white px-3.5 py-2.5 animate-in fade-in duration-150 fill-mode-both ${perfLeftBorder(perf)} hover:border-indigo-200 transition-colors`}
                      >
                        <ProfileAvatar entity={sp} assetVersion={getProfileAssetVersion(s)} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-['Lora'] text-sm font-semibold text-slate-900">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{s.registrationNumber || s.registration || 'Sem matrícula'}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 shrink-0">
                          {/* Frequência */}
                          <div className="text-right min-w-[56px]">
                            <Eyebrow>Freq.</Eyebrow>
                            <p className={`text-sm font-semibold ${freqTextCls}`}>{attendanceRate}%</p>
                            <div className="mt-1 h-1 w-full rounded-full bg-slate-300/80 overflow-hidden">
                              <div className={`h-full rounded-full ${freqBarCls}`} style={{ width: `${attendanceRate}%` }} />
                            </div>
                          </div>
                          {/* Média ring */}
                          <div className="text-right">
                            <Eyebrow>Média</Eyebrow>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="relative flex h-8 w-8 items-center justify-center">
                                <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
                                  <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-300/80" strokeWidth="3" />
                                  <circle cx="18" cy="18" r="15" fill="none"
                                    className={sc !== null && sc >= 8 ? 'stroke-emerald-400' : sc !== null && sc >= 6 ? 'stroke-amber-400' : 'stroke-rose-400'}
                                    strokeWidth="3.5"
                                    strokeDasharray={`${(scorePct / 100) * 94.2} 94.2`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span className={`relative z-10 text-[10px] font-semibold ${scoreColor(sc)}`}>
                                  {sc !== null ? sc.toFixed(1) : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Perf pill */}
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${perfPill(perf)}`}>
                            {perfLabel(perf)}
                          </span>
                        </div>
                      </article>
                    )
                  })}
                  {classStudents.length === 0 && (
                    <div className="py-6 text-center text-sm text-slate-400">Nenhum aluno vinculado.</div>
                  )}
                </div>
              </div>

              {/* Disciplines + Guardians */}
              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                {getReadableDisciplines(detailsClass.bnccFocus, detailsClass.grade).length > 0 && (
                  <div className="rounded-xl border border-slate-300 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <BookOpen size={12} className="text-indigo-500" />
                      <Eyebrow>Disciplinas</Eyebrow>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {getReadableDisciplines(detailsClass.bnccFocus, detailsClass.grade).map(f => (
                        <span key={f} className="rounded-md border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-slate-300 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Shield size={12} className="text-slate-500" />
                    <Eyebrow>Responsáveis</Eyebrow>
                  </div>
                  {(() => {
                    const gIds = Array.from(new Set(classStudents.flatMap(s => s.guardianIds ?? [])))
                    return gIds.length > 0
                      ? (
                        <div className="flex flex-col gap-1.5">
                          {gIds.map(id => (
                            <span key={id} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                              {getGuardianName(id)}
                            </span>
                          ))}
                        </div>
                      )
                      : <p className="text-xs text-slate-400">Nenhum responsável vinculado.</p>
                  })()}
                </div>
              </div>
            </div>
          </LightModal>
        )
      })()}

      {/* ══ MODAL — Create/Edit School ══ */}
      <LightModal open={isSchoolModalOpen} onClose={closeSchoolModal}
        title={schoolEditingId ? 'Atualizar escola' : 'Cadastrar escola'}
        subtitle={schoolEditingId ? 'Editar unidade' : 'Nova unidade'}>
        <form className="p-6 space-y-5" onSubmit={handleSchoolSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4 max-[580px]:grid-cols-1">
            <Field label="Nome da escola" error={schoolFieldErrors.name} icon={Building2}>
              <input className={`${inputCls} ${schoolFieldErrors.name ? inputErrCls : ''}`} value={schoolDraft.name ?? ''} onChange={e => { clearF(setSchoolFieldErrors, 'name'); setSchoolDraft({ ...schoolDraft, name: e.target.value }) }} placeholder="E.E. João da Silva" />
            </Field>
            <Field label="Cidade" error={schoolFieldErrors.city} icon={MapPin}>
              <input className={`${inputCls} ${schoolFieldErrors.city ? inputErrCls : ''}`} value={schoolDraft.city ?? ''} onChange={e => { clearF(setSchoolFieldErrors, 'city'); setSchoolDraft({ ...schoolDraft, city: e.target.value }) }} placeholder="São Paulo" />
            </Field>
            <Field label="Endereço" error={schoolFieldErrors.address} icon={MapPin}>
              <input className={`${inputCls} ${schoolFieldErrors.address ? inputErrCls : ''}`} value={schoolDraft.address ?? ''} onChange={e => { clearF(setSchoolFieldErrors, 'address'); setSchoolDraft({ ...schoolDraft, address: e.target.value }) }} placeholder="Rua, número, bairro" />
            </Field>
            <Field label="Diretor(a)" error={schoolFieldErrors.director} icon={User}>
              <input className={`${inputCls} ${schoolFieldErrors.director ? inputErrCls : ''}`} value={schoolDraft.director ?? ''} onChange={e => { clearF(setSchoolFieldErrors, 'director'); setSchoolDraft({ ...schoolDraft, director: e.target.value }) }} placeholder="Nome completo" />
            </Field>
            <Field label="Código INEP" error={schoolFieldErrors.inepCode} icon={Hash}>
              <input className={`${inputCls} ${schoolFieldErrors.inepCode ? inputErrCls : ''}`} value={schoolDraft.inepCode ?? ''} onChange={e => { clearF(setSchoolFieldErrors, 'inepCode'); setSchoolDraft({ ...schoolDraft, inepCode: e.target.value }) }} placeholder="35000000" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <SecondaryBtn onClick={closeSchoolModal}>Cancelar</SecondaryBtn>
            <PrimaryBtn type="submit" disabled={schoolSaving}>
              {schoolSaving ? <Spin sm /> : <Save size={14} />} Salvar escola
            </PrimaryBtn>
          </div>
        </form>
      </LightModal>

      {/* ══ MODAL — Create/Edit Class ══ */}
      <LightModal open={isClassModalOpen} onClose={closeClassModal}
        title={classEditingId ? 'Atualizar turma' : 'Cadastrar turma'}
        subtitle={classEditingId ? 'Editar turma' : 'Nova turma'} wide>
        <form className="p-6 space-y-5" onSubmit={handleClassSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4 max-[580px]:grid-cols-1">
            <Field label="Nome da turma" error={classFieldErrors.name} icon={GraduationCap}>
              <input className={`${inputCls} ${classFieldErrors.name ? inputErrCls : ''}`} value={classDraft.name ?? ''} onChange={e => { clearF(setClassFieldErrors, 'name'); setClassDraft({ ...classDraft, name: e.target.value }) }} placeholder="5º Ano A" />
            </Field>
            <Field label="Série / Ano" error={classFieldErrors.grade} icon={Layers}>
              <CompactSelect value={classDraft.grade ?? ''} onChange={grade => { clearF(setClassFieldErrors, 'grade'); setClassDraft({ ...classDraft, grade }) }} options={classGradeOptions} className={`${inputCls} ${classFieldErrors.grade ? inputErrCls : ''}`} dropdownMinWidth={320} />
            </Field>
            <Field label="Escola" error={classFieldErrors.schoolId} icon={Building2}>
              {isDirectorView
                ? <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">{getSchoolName(classDraft.schoolId || linkedSchoolId)}</div>
                : <CompactSelect value={classDraft.schoolId ?? ''} onChange={sid => { clearF(setClassFieldErrors, 'schoolId'); setClassDraft({ ...classDraft, schoolId: sid, teacherId: '', teacherIds: [] }) }} options={schoolOptions} className={`${inputCls} ${classFieldErrors.schoolId ? inputErrCls : ''}`} dropdownMinWidth={280} />}
            </Field>
            <Field label="Professor responsável" error={classFieldErrors.teacherId} icon={UserRound}>
              <CompactSelect value={classDraft.teacherId ?? ''} onChange={tid => { clearF(setClassFieldErrors, 'teacherId'); setClassDraft({ ...classDraft, teacherId: tid, teacherIds: Array.from(new Set([tid, ...(classDraft.teacherIds ?? [])].filter(Boolean))) }) }} options={teacherOptions} className={`${inputCls} ${classFieldErrors.teacherId ? inputErrCls : ''}`} dropdownMinWidth={280} />
            </Field>
            <Field label="Turno" icon={Clock3}>
              <CompactSelect<ClassRoom['shift']> value={classDraft.shift ?? 'Manha'} onChange={shift => setClassDraft({ ...classDraft, shift })} options={shiftOptions} className={inputCls} dropdownMinWidth={180} />
            </Field>
            <Field label="Ano letivo" error={classFieldErrors.academicYear} icon={Calendar}>
              <input type="number" className={`${inputCls} ${classFieldErrors.academicYear ? inputErrCls : ''}`} value={classDraft.academicYear ?? currentYear} onChange={e => { clearF(setClassFieldErrors, 'academicYear'); setClassDraft({ ...classDraft, academicYear: Number(e.target.value) }) }} />
            </Field>
            <Field label="Horário" error={classFieldErrors.schedule} icon={Clock3}>
              <input className={`${inputCls} ${classFieldErrors.schedule ? inputErrCls : ''}`} value={classDraft.schedule ?? ''} onChange={e => { clearF(setClassFieldErrors, 'schedule'); setClassDraft({ ...classDraft, schedule: e.target.value }) }} placeholder="Seg a Sex, 07:30–11:30" />
            </Field>
            <Field label="Disciplinas (separadas por vírgula)" icon={BookOpen}>
              <input className={inputCls} value={(classDraft.bnccFocus ?? []).join(', ')} onChange={e => setClassDraft({ ...classDraft, bnccFocus: splitDisciplineList(e.target.value) })} placeholder="Matemática, Português, Ciências" />
            </Field>
          </div>

          {/* Additional teachers */}
          <div className="rounded-xl border border-slate-300 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={12} className="text-indigo-500" />
              <Eyebrow>Professores adicionais</Eyebrow>
            </div>
            <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
              {classTeacherCandidates.map(t => {
                const checked = t.id === classDraft.teacherId || (classDraft.teacherIds ?? []).includes(t.id)
                return (
                  <label key={t.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-all
                    ${checked ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-200'}`}>
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={checked} onChange={() => toggleClassTeacher(t.id)} />
                    <span className="min-w-0">
                      <span className="block truncate">{t.name}</span>
                      <span className="block truncate text-[10px] font-normal text-slate-400">{getReadableDisciplines([t.specialty]).join(', ') || 'Sem disciplina'}</span>
                    </span>
                  </label>
                )
              })}
              {classTeacherCandidates.length === 0 && <p className="col-span-2 py-4 text-center text-sm text-slate-400">Nenhum professor nesta escola.</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <SecondaryBtn onClick={closeClassModal}>Cancelar</SecondaryBtn>
            <PrimaryBtn type="submit" disabled={classSaving}>
              {classSaving ? <Spin sm /> : <Save size={14} />} Salvar turma
            </PrimaryBtn>
          </div>
        </form>
      </LightModal>

      {/* ══ MODAL — Create Teacher ══ */}
      <LightModal open={isTeacherModalOpen} onClose={closeTeacherModal} title="Cadastrar professor" subtitle="Novo professor">
        <form className="p-6 space-y-5" onSubmit={handleTeacherSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4 max-[580px]:grid-cols-1">
            <Field label="Nome completo" error={teacherFieldErrors.name} icon={User}>
              <input className={`${inputCls} ${teacherFieldErrors.name ? inputErrCls : ''}`} value={teacherDraft.name ?? ''} onChange={e => { clearF(setTeacherFieldErrors, 'name'); setTeacherDraft({ ...teacherDraft, name: e.target.value }) }} placeholder="Nome Completo" />
            </Field>
            <Field label="E-mail" error={teacherFieldErrors.email} icon={Mail}>
              <div className="relative">
                <Mail size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input type="email" className={`${inputCls} pl-10 ${teacherFieldErrors.email ? inputErrCls : ''}`} value={teacherDraft.email ?? ''} onChange={e => { clearF(setTeacherFieldErrors, 'email'); setTeacherDraft({ ...teacherDraft, email: e.target.value }) }} placeholder="email@escola.br" />
              </div>
            </Field>
            <Field label="Disciplinas" error={teacherFieldErrors.specialty} icon={BookOpen}>
              <div className={`max-h-[176px] overflow-y-auto rounded-xl border bg-white p-2 ${teacherFieldErrors.specialty ? inputErrCls : 'border-slate-300'}`}>
                <div className="grid grid-cols-2 gap-1.5 max-[520px]:grid-cols-1">
                  {officialTeacherSubjects.map((subject) => {
                    const checked = selectedTeacherSubjects.includes(subject)
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleTeacherSubject(subject)}
                        className={`flex min-h-8 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-semibold transition-all font-['DM_Sans'] ${
                          checked ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60'
                        }`}
                      >
                        <span className="truncate">{subject}</span>
                        {checked && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </Field>
            <Field label="Telefone" error={teacherFieldErrors.phone} icon={Phone}>
              <div className="relative">
                <Phone size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input className={`${inputCls} pl-10 ${teacherFieldErrors.phone ? inputErrCls : ''}`} value={teacherDraft.phone ?? ''} onChange={e => { clearF(setTeacherFieldErrors, 'phone'); setTeacherDraft({ ...teacherDraft, phone: e.target.value }) }} placeholder="(86) 9400-0000" />
              </div>
            </Field>
            <Field label="Escola" error={teacherFieldErrors.schoolId} icon={Building2}>
              {isDirectorView
                ? <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">{getSchoolName(teacherDraft.schoolId || linkedSchoolId)}</div>
                : <CompactSelect value={teacherDraft.schoolId ?? ''} onChange={sid => { clearF(setTeacherFieldErrors, 'schoolId'); setTeacherDraft({ ...teacherDraft, schoolId: sid, classId: '' }) }} options={schoolOptions} className={`${inputCls} ${teacherFieldErrors.schoolId ? inputErrCls : ''}`} dropdownMinWidth={280} />}
            </Field>
            <Field label="Vincular turma" icon={GraduationCap}>
              <CompactSelect value={teacherDraft.classId ?? ''} onChange={cid => setTeacherDraft({ ...teacherDraft, classId: cid })} options={classOptions} className={inputCls} dropdownMinWidth={280} />
            </Field>
            <Field label="Senha inicial" error={teacherFieldErrors.password} icon={Lock}>
              <div className="relative">
                <Lock size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input type="password" className={`${inputCls} pl-10 ${teacherFieldErrors.password ? inputErrCls : ''}`} value={teacherDraft.password ?? ''} onChange={e => { clearF(setTeacherFieldErrors, 'password'); setTeacherDraft({ ...teacherDraft, password: e.target.value }) }} placeholder="Mínimo 8 caracteres" />
              </div>
            </Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <SecondaryBtn onClick={closeTeacherModal}>Cancelar</SecondaryBtn>
            <PrimaryBtn type="submit" disabled={teacherSaving}>
              {teacherSaving ? <Spin sm /> : <Save size={14} />} Salvar professor
            </PrimaryBtn>
          </div>
        </form>
      </LightModal>

      {/* ══ MODAL — Create Student ══ */}
      <LightModal open={isStudentModalOpen} onClose={closeStudentModal} title="Cadastrar aluno" subtitle="Novo aluno" wide>
        <form className="p-6 space-y-5" onSubmit={handleStudentSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4 max-[580px]:grid-cols-1">
            <Field label="Nome completo" error={studentFieldErrors.name} icon={User}>
              <input className={`${inputCls} ${studentFieldErrors.name ? inputErrCls : ''}`} value={studentDraft.name ?? ''} onChange={e => { clearF(setStudentFieldErrors, 'name'); setStudentDraft({ ...studentDraft, name: e.target.value }) }} placeholder="Nome Completo" />
            </Field>
            <Field label="Matrícula" icon={Hash}>
              <input className={inputCls} value={studentDraft.registrationNumber ?? ''} onChange={e => setStudentDraft({ ...studentDraft, registrationNumber: e.target.value, registration: e.target.value })} placeholder="Opcional" />
            </Field>
            <Field label="Escola" error={studentFieldErrors.schoolId} icon={Building2}>
              {isDirectorView
                ? <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">{getSchoolName(studentDraft.schoolId || linkedSchoolId)}</div>
                : <CompactSelect value={studentDraft.schoolId ?? ''} onChange={sid => { clearF(setStudentFieldErrors, 'schoolId'); setStudentDraft({ ...studentDraft, schoolId: sid, classId: '', guardianIds: [] }) }} options={schoolOptions} className={`${inputCls} ${studentFieldErrors.schoolId ? inputErrCls : ''}`} dropdownMinWidth={280} />}
            </Field>
            <Field label="Turma" error={studentFieldErrors.classId} icon={GraduationCap}>
              <CompactSelect value={studentDraft.classId ?? ''} onChange={cid => { clearF(setStudentFieldErrors, 'classId'); setStudentDraft({ ...studentDraft, classId: cid }) }} options={studentClassOptions} className={`${inputCls} ${studentFieldErrors.classId ? inputErrCls : ''}`} dropdownMinWidth={280} />
            </Field>
            <Field label="Desempenho" icon={Award}>
              <CompactSelect<Desempenho> value={getStudentPerformance(studentDraft)} onChange={desempenho => setStudentDraft({ ...studentDraft, desempenho })} options={performanceOptions} className={inputCls} dropdownMinWidth={180} />
            </Field>
            <Field label="Senha inicial" error={studentFieldErrors.password} icon={Lock}>
              <div className="relative">
                <Lock size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input type="password" className={`${inputCls} pl-10 ${studentFieldErrors.password ? inputErrCls : ''}`} value={studentDraft.password ?? ''} onChange={e => { clearF(setStudentFieldErrors, 'password'); setStudentDraft({ ...studentDraft, password: e.target.value }) }} placeholder="Mínimo 8 caracteres" />
              </div>
            </Field>
          </div>

          {/* Disciplines preview */}
          {getClassDisciplines(studentDraft.classId).length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
              <Eyebrow className="mb-2 text-indigo-500">Disciplinas da turma</Eyebrow>
              <div className="flex flex-wrap gap-1.5">
                {getClassDisciplines(studentDraft.classId).map(d => (
                  <span key={d} className="inline-flex items-center rounded-md border border-indigo-100 bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{d}</span>
                ))}
              </div>
            </div>
          )}

          {/* Guardians */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={12} className="text-emerald-500" />
              <Eyebrow>Responsáveis</Eyebrow>
            </div>
            <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
              {studentSchoolGuardians.map(g => (
                <label key={g.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-all
                  ${(studentDraft.guardianIds ?? []).includes(g.id) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
                  <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={(studentDraft.guardianIds ?? []).includes(g.id)} onChange={() => toggleStudentGuardian(g.id)} />
                  {g.name}
                </label>
              ))}
              {studentSchoolGuardians.length === 0 && <p className="col-span-2 py-4 text-center text-sm text-slate-400">Nenhum responsável cadastrado.</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <SecondaryBtn onClick={closeStudentModal}>Cancelar</SecondaryBtn>
            <PrimaryBtn type="submit" disabled={studentSaving}>
              {studentSaving ? <Spin sm /> : <Save size={14} />} Salvar aluno
            </PrimaryBtn>
          </div>
        </form>
      </LightModal>

      {/* ══ MODAL — Create Guardian ══ */}
      <LightModal open={isGuardianModalOpen} onClose={closeGuardianModal} title="Cadastrar responsável" subtitle="Novo responsável">
        <form className="p-6 space-y-5" onSubmit={handleGuardianSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4 max-[580px]:grid-cols-1">
            <Field label="Nome completo" error={guardianFieldErrors.name} icon={User}>
              <input className={`${inputCls} ${guardianFieldErrors.name ? inputErrCls : ''}`} value={guardianDraft.name ?? ''} onChange={e => { clearF(setGuardianFieldErrors, 'name'); setGuardianDraft({ ...guardianDraft, name: e.target.value }) }} placeholder="Nome completo" />
            </Field>
            <Field label="E-mail" error={guardianFieldErrors.email} icon={Mail}>
              <div className="relative">
                <Mail size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input type="email" className={`${inputCls} pl-10 ${guardianFieldErrors.email ? inputErrCls : ''}`} value={guardianDraft.email ?? ''} onChange={e => { clearF(setGuardianFieldErrors, 'email'); setGuardianDraft({ ...guardianDraft, email: e.target.value }) }} placeholder="email@exemplo.com" />
              </div>
            </Field>
            <Field label="Telefone" error={guardianFieldErrors.phone} icon={Phone}>
              <div className="relative">
                <Phone size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input className={`${inputCls} pl-10 ${guardianFieldErrors.phone ? inputErrCls : ''}`} value={guardianDraft.phone ?? ''} onChange={e => { clearF(setGuardianFieldErrors, 'phone'); setGuardianDraft({ ...guardianDraft, phone: e.target.value }) }} placeholder="(86) 9400-0000" />
              </div>
            </Field>
            <Field label="Escola" error={guardianFieldErrors.schoolId} icon={Building2}>
              {isDirectorView
                ? <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">{getSchoolName(guardianDraft.schoolId || linkedSchoolId)}</div>
                : <CompactSelect value={guardianDraft.schoolId ?? ''} onChange={sid => { clearF(setGuardianFieldErrors, 'schoolId'); setGuardianDraft({ ...guardianDraft, schoolId: sid, studentIds: [] }) }} options={schoolOptions} className={`${inputCls} ${guardianFieldErrors.schoolId ? inputErrCls : ''}`} dropdownMinWidth={280} />}
            </Field>
            <Field label="Senha inicial" error={guardianFieldErrors.password} icon={Lock}>
              <div className="relative">
                <Lock size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
                <input type="password" className={`${inputCls} pl-10 ${guardianFieldErrors.password ? inputErrCls : ''}`} value={guardianDraft.password ?? ''} onChange={e => { clearF(setGuardianFieldErrors, 'password'); setGuardianDraft({ ...guardianDraft, password: e.target.value }) }} placeholder="Mínimo 8 caracteres" />
              </div>
            </Field>
          </div>

          {/* Students */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={12} className="text-violet-500" />
              <Eyebrow>Alunos acompanhados</Eyebrow>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-500" />
                <input
                  className={`${inputCls} pl-10 pr-10`}
                  value={guardianStudentSearch}
                  onChange={e => setGuardianStudentSearch(e.target.value)}
                  placeholder="Buscar aluno por nome ou matrícula"
                />
                {guardianStudentSearchLoading && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <Spin sm dark />
                  </span>
                )}
              </div>

              {guardianSelectedStudents.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {guardianSelectedStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleGuardianStudent(student.id, student)}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-100 font-['DM_Sans']"
                    >
                      <span className="truncate">{student.name}</span>
                      <X className="h-3 w-3 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {guardianStudentSearchError && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 font-['DM_Sans']">{guardianStudentSearchError}</p>
              )}

              <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
                {guardianStudentResults.map(s => {
                  const checked = (guardianDraft.studentIds ?? []).includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleGuardianStudent(s.id, s)}
                      className={`flex min-w-0 items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm font-semibold transition-all ${
                        checked ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/60'
                      }`}
                    >
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${checked ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-300 bg-white'}`}>
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{s.name}</span>
                        <span className="block truncate text-[10px] font-normal text-slate-400">{getClassName(s.classId)} · {getSchoolName(s.schoolId)}</span>
                      </span>
                    </button>
                  )
                })}
                {guardianStudentSearch.trim().length >= 2 && !guardianStudentSearchLoading && guardianStudentResults.length === 0 && (
                  <p className="col-span-2 py-4 text-center text-sm text-slate-400">Nenhum aluno encontrado.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <SecondaryBtn onClick={closeGuardianModal}>Cancelar</SecondaryBtn>
            <PrimaryBtn type="submit" disabled={guardianSaving}>
              {guardianSaving ? <Spin sm /> : <Save size={14} />} Salvar responsável
            </PrimaryBtn>
          </div>
        </form>
      </LightModal>
    </>
  )
}
