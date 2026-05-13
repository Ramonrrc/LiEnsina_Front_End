import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { z } from 'zod'
import {
  BookOpen, Building2, Clock3, Eye, GraduationCap, MoreHorizontal,
  Pencil, Plus, Save, Search, UserRound, Users, X, AlertTriangle,
  MapPin, Hash, User, Mail, Phone, Lock, CheckCircle2,
  Layers, Shield, ChevronRight, Zap, TrendingUp
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { AvatarHoverPreview } from '../components/profile/AvatarSign'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { FieldMessage, fieldStateClass, zodFieldErrors, type FieldErrors } from '../components/ui/form-field'
import { resolveApiAssetUrl } from '../api'
import { formatClassGrade, getClassGradeOptions } from '../class-grade-options'
import type { ClassRoom, Desempenho, Guardian, Role, School, Student, Teacher, UserAccount } from '../types'

/* ─── Types ─── */
interface SchoolsViewProps {
  currentUser: UserAccount
  currentRole: Role | null
  schools: School[]
  classes: ClassRoom[]
  students: Student[]
  teachers: Teacher[]
  guardians: Guardian[]
  assetVersion?: ProfileAssetVersion
  readOnly?: boolean
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

const emptySchool: Partial<School> = { name: '', city: '', address: '', director: '', inepCode: '', active: true }
const emptyClass: Partial<ClassRoom> = { name: '', grade: '', shift: 'Manha', schoolId: '', teacherId: '', teacherIds: [], academicYear: currentYear, schedule: '', bnccFocus: [] }
const emptyTeacher: Partial<Teacher> & { classId?: string; password?: string; phone?: string } = { name: '', email: '', schoolId: '', specialty: '', classId: '', phone: '', password: '', active: true }
const emptyStudent: Partial<Student> & { password?: string } = { name: '', registrationNumber: '', schoolId: '', classId: '', guardianIds: [], status: 'matriculado', attendanceRate: 100, averageScore: 0, desempenho: 'Otimo', password: '' }
const emptyGuardian: Partial<Guardian> & { password?: string } = { name: '', email: '', phone: '', schoolId: '', studentIds: [], password: '' }

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

/* ─── Skeleton ─── */
function SkeletonCard() {
  return (
    <div className="sv-skeleton-card rounded-xl border-2 border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="sv-shimmer w-3 h-3 rounded-full" />
          <div className="sv-shimmer h-4 w-36 rounded" />
        </div>
        <div className="sv-shimmer h-5 w-14 rounded-full" />
      </div>
      <div className="sv-shimmer h-3 w-28 rounded mb-4" />
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[1,2,3].map(i => <div key={i} className="sv-shimmer h-14 rounded-lg" />)}
      </div>
      <div className="flex gap-2 justify-end mt-1">
        <div className="sv-shimmer h-8 w-8 rounded" />
        <div className="sv-shimmer h-8 w-24 rounded" />
      </div>
    </div>
  )
}

/* ─── Badge ─── */
function Badge({ variant, children }: { variant: 'active' | 'inactive' | 'manha' | 'tarde' | 'noite' | 'neutral'; children: React.ReactNode }) {
  const styles = {
    active:  'bg-emerald-500 text-white',
    inactive:'bg-slate-300 text-slate-500',
    manha:   'bg-sky-100 text-sky-700 border border-sky-300',
    tarde:   'bg-amber-100 text-amber-700 border border-amber-300',
    noite:   'bg-indigo-100 text-indigo-700 border border-indigo-300',
    neutral: 'bg-violet-100 text-violet-700 border border-violet-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${styles[variant]}`}>
      {children}
    </span>
  )
}

/* ─── Shift Badge helper ─── */
function ShiftBadge({ shift }: { shift: string }) {
  if (shift === 'Manha') return <Badge variant="manha">Manhã</Badge>
  if (shift === 'Tarde') return <Badge variant="tarde">Tarde</Badge>
  return <Badge variant="noite">Noite</Badge>
}

/* ─── Stat Pill — for school cards ─── */
function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-lg px-3 py-2 ${color}`}>
      <div className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60">{label}</div>
      <div className="text-lg font-black leading-none">{value}</div>
    </div>
  )
}

const performanceOptions: Array<CompactSelectOption<Desempenho>> = [
  { value: 'Otimo', label: 'Ótimo' },
  { value: 'Medio', label: 'Médio' },
  { value: 'Baixo', label: 'Baixo' },
]

function normalizePerformanceValue(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function getStudentPerformance(student: Partial<Student> & { riskLevel?: string | null }): Desempenho {
  const desempenho = normalizePerformanceValue(student.desempenho)
  if (desempenho === 'otimo') return 'Otimo'
  if (desempenho === 'medio') return 'Medio'
  if (desempenho === 'baixo') return 'Baixo'

  const legacyRisk = normalizePerformanceValue(student.riskLevel)
  if (legacyRisk === 'baixo') return 'Otimo'
  if (legacyRisk === 'medio') return 'Medio'
  if (legacyRisk === 'alto') return 'Baixo'

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
  const scores = students
    .map((student) => student.averageScore)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))

  if (scores.length === 0) return { average: null, totalScores: 0 }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  return { average, totalScores: scores.length }
}

function getPerformanceLabel(level: Desempenho | null) {
  if (level === 'Otimo') return 'Ótimo'
  if (level === 'Medio') return 'Médio'
  if (level === 'Baixo') return 'Baixo'
  return 'Sem notas'
}

function getPerformanceTone(level: Desempenho | null) {
  if (level === 'Otimo') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (level === 'Medio') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (level === 'Baixo') return 'bg-red-100 text-red-700 border-red-200'
  return 'bg-slate-100 text-slate-500 border-slate-200'
}

/* ─── Performance Pill ─── */
function PerformancePill({ level }: { level?: string | null }) {
  const performance = getStudentPerformance({ desempenho: level as Student['desempenho'] })
  const styles = performance === 'Baixo'
    ? 'bg-red-100 text-red-700 border border-red-200'
    : performance === 'Medio'
    ? 'bg-amber-100 text-amber-700 border border-amber-200'
    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'

  const labels: Record<Desempenho, string> = {
    Baixo: 'Baixo',
    Medio: 'Médio',
    Otimo: 'Ótimo',
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${styles}`}>
      {labels[performance]}
    </span>
  )
}

/* ─── Field ─── */
function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string
  children: React.ReactNode
  hint?: string
  error?: string | null
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      {children}
      <FieldMessage hint={hint} error={error} />
    </label>
  )
}

const inputCls = "min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"

type ProfileAssetVersion = {
  avatar?: string | number
  banner?: string | number
}

type ProfilePreviewEntity = {
  id?: string
  userId?: string
  name: string
  email?: string
  login?: string
  registrationNumber?: string
  avatarUrl?: string | null
  bannerUrl?: string | null
  user?: {
    name?: string
    email?: string
    login?: string
    avatarUrl?: string | null
    bannerUrl?: string | null
  } | null
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function getProfileEmail(entity: ProfilePreviewEntity) {
  return entity.email ?? entity.user?.email ?? entity.login ?? entity.user?.login ?? entity.registrationNumber ?? 'Sem e-mail cadastrado'
}

function getProfileAvatarUrl(entity: ProfilePreviewEntity, version?: string | number) {
  return resolveApiAssetUrl(entity.avatarUrl ?? entity.user?.avatarUrl, version)
}

function getProfileBannerUrl(entity: ProfilePreviewEntity, version?: string | number) {
  return resolveApiAssetUrl(entity.bannerUrl ?? entity.user?.bannerUrl, version)
}

function ProfileAvatar({
  entity,
  size = 'sm',
  assetVersion,
}: {
  entity: ProfilePreviewEntity
  size?: 'sm' | 'md'
  assetVersion?: ProfileAssetVersion
}) {
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
    const top = belowTop + previewHeight > window.innerHeight
      ? Math.max(16, rect.top - previewHeight - 10)
      : belowTop

    setPreviewStyle({ left, top, width: previewWidth })
  }

  function hidePreview() {
    setPreviewStyle(null)
  }

  return (
    <div
      ref={wrapperRef}
      className="group/avatar relative shrink-0"
      onMouseEnter={showPreview}
      onMouseLeave={hidePreview}
      onFocus={showPreview}
      onBlur={hidePreview}
    >
      <span
        tabIndex={hasProfileImage ? 0 : -1}
        className={`grid overflow-hidden rounded-full border border-white bg-indigo-600 font-black text-white shadow-sm ring-1 ring-slate-300 outline-none transition ${hasProfileImage ? 'cursor-pointer focus:ring-2 focus:ring-indigo-500' : ''} ${sizeClass}`}
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt={name} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="grid h-full w-full place-items-center">{initials || <UserRound size={size === 'md' ? 16 : 13} />}</span>
        )}
      </span>
      {hasProfileImage && previewStyle && typeof document !== 'undefined'
        ? createPortal(
            <AvatarHoverPreview
              name={name}
              email={email}
              avatarSrc={avatarSrc}
              bannerSrc={bannerSrc}
              initials={initials}
              position="fixed"
              style={previewStyle}
              visible
              className=""
            />,
            document.body,
          )
        : null}
    </div>
  )
}

  /* ─── Modal ─── */
  function Modal({ id, title, subtitle, onClose, children, headerAction, maxWidth = '760px' }: { 
    id: string; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; headerAction?: React.ReactNode; maxWidth?: string
  }) {
    return (
      <div role="presentation" onMouseDown={onClose} className="sv-backdrop fixed inset-0 z-[1000] flex items-center justify-center p-5">
        <div
          role="dialog" aria-modal="true" aria-labelledby={id}
          onMouseDown={e => e.stopPropagation()}
          className="sv-modal max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl border-2 border-slate-200"
          style={{ maxWidth }}
        >
          <div className="flex items-start justify-between gap-3 border-b-2 border-slate-100 px-6 py-5">
            <div>
              {subtitle && <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">{subtitle}</p>}
              <h2 id={id} className="font-['Sora',system-ui,sans-serif] text-xl font-bold text-slate-900">{title}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerAction}
              <button type="button" onClick={onClose} aria-label="Fechar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900">
                <X size={17} />
              </button>
            </div>
          </div>
          {children}
        </div>
      </div>
    )
  }

/* ─── Buttons ─── */
function PrimaryBtn({ children, onClick, type = 'button', disabled }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="sv-primary-btn inline-flex min-h-9 items-center justify-center gap-2 rounded-sm bg-indigo-600 px-4 text-[13px] font-bold text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  )
}

function SecondaryBtn({ children, onClick, type = 'button', disabled }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-sm border-2 border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40">
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-sm border border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40">
      {children}
    </button>
  )
}

/* ─── Section Header ─── */
function SectionHeader({ label, title, description }: { label: string; title: string; description?: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">{label}</p>
      <h2 className="font-['Sora',system-ui,sans-serif] text-lg font-bold text-slate-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
    </div>
  )
}

/* ─── Empty State ─── */
function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-[220px] place-items-center content-center gap-3 p-8 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="font-['Sora',system-ui,sans-serif] text-base font-bold text-slate-700">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   Main Component
════════════════════════════════════════════════════════════════ */
export default function SchoolsView({
  currentUser, currentRole, schools, classes, students, teachers, guardians,
  assetVersion,
  readOnly = false,
  onCreate, onUpdate, onCreateClass, onUpdateClass,
  onCreateTeacher, onCreateStudent, onCreateGuardian,
}: SchoolsViewProps) {

  const isDirectorView = currentRole?.code === 'DIRETOR' || currentRole?.name.toLowerCase().includes('diretor') === true
  const linkedSchoolId = isDirectorView ? currentUser.schoolId ?? '' : ''

  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t) }, [])

  const [schoolDraft, setSchoolDraft] = useState<Partial<School>>({ ...emptySchool })
  const [schoolEditingId, setSchoolEditingId] = useState<string | null>(null)
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false)
  const [schoolDetailsId, setSchoolDetailsId] = useState<string | null>(null)
  const [schoolFieldErrors, setSchoolFieldErrors] = useState<FieldErrors<SchoolFormField>>({})

  const [classDraft, setClassDraft] = useState<Partial<ClassRoom>>({ ...emptyClass })
  const [classEditingId, setClassEditingId] = useState<string | null>(null)
  const [isClassModalOpen, setIsClassModalOpen] = useState(false)
  const [classFormError, setClassFormError] = useState<string | null>(null)
  const [classFieldErrors, setClassFieldErrors] = useState<FieldErrors<ClassFormField>>({})
  const [selectedSchoolId, setSelectedSchoolId] = useState(linkedSchoolId)
  const [classDetailsId, setClassDetailsId] = useState<string | null>(null)

  const [teacherDraft, setTeacherDraft] = useState<Partial<Teacher> & { classId?: string; password?: string; phone?: string }>({ ...emptyTeacher })
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false)
  const [teacherFieldErrors, setTeacherFieldErrors] = useState<FieldErrors<TeacherFormField>>({})
  const [studentDraft, setStudentDraft] = useState<Partial<Student> & { password?: string }>({ ...emptyStudent })
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [studentFieldErrors, setStudentFieldErrors] = useState<FieldErrors<StudentFormField>>({})
  const [guardianDraft, setGuardianDraft] = useState<Partial<Guardian> & { password?: string }>({ ...emptyGuardian })
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false)
  const [guardianFieldErrors, setGuardianFieldErrors] = useState<FieldErrors<GuardianFormField>>({})

  const [query, setQuery] = useState('')

  const visibleSchools = useMemo(
    () => isDirectorView ? schools.filter(s => s.id === linkedSchoolId) : schools,
    [isDirectorView, linkedSchoolId, schools],
  )
  const selectedSchool = useMemo(() => visibleSchools.find(s => s.id === selectedSchoolId) ?? null, [selectedSchoolId, visibleSchools])
  const detailsSchool = useMemo(() => schoolDetailsId ? schools.find(s => s.id === schoolDetailsId) ?? null : null, [schoolDetailsId, schools])
  const detailsClass = useMemo(() => classDetailsId ? classes.find(c => c.id === classDetailsId) ?? null : null, [classDetailsId, classes])

  function isCurrentLinkedProfile(entity: ProfilePreviewEntity) {
    return Boolean(
      entity.id
      && (
        entity.id === currentUser.linkedStudentId
        || entity.id === currentUser.linkedTeacherId
        || entity.userId === currentUser.id
      ),
    )
  }

  function withCurrentUserVisuals<T extends ProfilePreviewEntity>(entity: T): T {
    if (!isCurrentLinkedProfile(entity)) return entity

    return {
      ...entity,
      avatarUrl: currentUser.avatarUrl,
      bannerUrl: currentUser.bannerUrl,
    }
  }

  function getProfileAssetVersion(entity: ProfilePreviewEntity) {
    return isCurrentLinkedProfile(entity) ? assetVersion : undefined
  }

  useEffect(() => {
    if (isDirectorView) { setSelectedSchoolId(linkedSchoolId); return }
    if (selectedSchoolId && !visibleSchools.some(s => s.id === selectedSchoolId)) setSelectedSchoolId('')
  }, [isDirectorView, linkedSchoolId, selectedSchoolId, visibleSchools])

  const filteredSchools = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return visibleSchools
    return visibleSchools.filter(s => [s.name, s.city, s.director, s.inepCode].join(' ').toLowerCase().includes(q))
  }, [query, visibleSchools])

  const filteredClasses = useMemo(
    () => selectedSchoolId ? classes.filter(c => c.schoolId === selectedSchoolId) : [],
    [classes, selectedSchoolId],
  )

  const schoolOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: '', label: 'Selecione a escola', disabled: true }, ...visibleSchools.map(s => ({ value: s.id, label: s.name }))],
    [visibleSchools],
  )
  const teacherOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: '', label: 'Selecione o professor', disabled: true }, ...teachers.filter(t => !classDraft.schoolId || t.schoolId === classDraft.schoolId).map(t => ({ value: t.id, label: t.name, description: t.specialty }))],
    [classDraft.schoolId, teachers],
  )
  const classTeacherCandidates = useMemo(
    () => teachers.filter(t => !classDraft.schoolId || t.schoolId === classDraft.schoolId),
    [classDraft.schoolId, teachers],
  )
  const classGradeOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => getClassGradeOptions(classDraft.grade),
    [classDraft.grade],
  )
  const teacherSchoolOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: '', label: 'Selecione a escola', disabled: true }, ...visibleSchools.map(s => ({ value: s.id, label: s.name }))],
    [visibleSchools],
  )
  const classOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: '', label: 'Sem turma vinculada' }, ...classes.filter(c => !teacherDraft.schoolId || c.schoolId === teacherDraft.schoolId).map(c => ({ value: c.id, label: c.name, description: getSchoolName(c.schoolId) }))],
    [classes, teacherDraft.schoolId],
  )
  const studentClassOptions = useMemo<Array<CompactSelectOption<string>>>(
    () => [{ value: '', label: 'Selecione a turma', disabled: true }, ...classes.filter(c => !studentDraft.schoolId || c.schoolId === studentDraft.schoolId).map(c => ({ value: c.id, label: c.name, description: getSchoolName(c.schoolId) }))],
    [classes, studentDraft.schoolId],
  )
  const guardianSchoolStudents = useMemo(() => students.filter(s => !guardianDraft.schoolId || s.schoolId === guardianDraft.schoolId), [guardianDraft.schoolId, students])
  const studentSchoolGuardians = useMemo(() => guardians.filter(g => !studentDraft.schoolId || g.schoolId === studentDraft.schoolId), [guardians, studentDraft.schoolId])
  const shiftOptions: Array<CompactSelectOption<ClassRoom['shift']>> = [{ value: 'Manha', label: 'Manhã' }, { value: 'Tarde', label: 'Tarde' }, { value: 'Noite', label: 'Noite' }]

  function getSchoolName(id: string) { return schools.find(s => s.id === id)?.name ?? 'Escola não localizada' }
  function getTeacherName(id: string) { return teachers.find(t => t.id === id)?.name ?? 'Professor pendente' }
  function getClassTeachers(cr: ClassRoom) {
    const ids = new Set([cr.teacherId, ...(cr.teacherIds ?? [])].filter(Boolean))
    return teachers.filter(t => ids.has(t.id))
  }
  function splitDisciplineList(value: string) {
    return value.split(',').map(x => x.trim()).filter(Boolean)
  }
  function getClassDisciplines(classId?: string) {
    return classes.find(c => c.id === classId)?.bnccFocus ?? []
  }
  function getGuardianName(id: string) { return guardians.find(g => g.id === id)?.name ?? 'Responsável pendente' }
  function getDefaultSchoolId() { return selectedSchoolId || linkedSchoolId }

  function clearSchoolError(field: SchoolFormField) {
    setSchoolFieldErrors((current) => ({ ...current, [field]: undefined }))
  }
  function clearClassError(field: ClassFormField) {
    setClassFieldErrors((current) => ({ ...current, [field]: undefined }))
  }
  function clearTeacherError(field: TeacherFormField) {
    setTeacherFieldErrors((current) => ({ ...current, [field]: undefined }))
  }
  function clearStudentError(field: StudentFormField) {
    setStudentFieldErrors((current) => ({ ...current, [field]: undefined }))
  }
  function clearGuardianError(field: GuardianFormField) {
    setGuardianFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  function openCreateSchoolModal() { setSchoolEditingId(null); setSchoolFieldErrors({}); setSchoolDraft({ ...emptySchool }); setIsSchoolModalOpen(true) }
  function openEditSchoolModal(s: School) { setSchoolEditingId(s.id); setSchoolFieldErrors({}); setSchoolDraft({ ...s }); setIsSchoolModalOpen(true) }
  function closeSchoolModal() { setSchoolEditingId(null); setSchoolFieldErrors({}); setSchoolDraft({ ...emptySchool }); setIsSchoolModalOpen(false) }
  async function handleSchoolSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = schoolFormSchema.safeParse(schoolDraft)
    if (!result.success) {
      setSchoolFieldErrors(zodFieldErrors<SchoolFormField>(result.error))
      return
    }
    setSchoolFieldErrors({})
    const payload = { ...schoolDraft, ...result.data }
    if (schoolEditingId) await onUpdate(schoolEditingId, payload)
    else await onCreate(payload)
    closeSchoolModal()
  }

  function openCreateClassModal() { setClassEditingId(null); setClassFormError(null); setClassFieldErrors({}); setClassDraft({ ...emptyClass, schoolId: getDefaultSchoolId() }); setIsClassModalOpen(true) }
  function openEditClassModal(cr: ClassRoom) { setClassEditingId(cr.id); setClassFormError(null); setClassFieldErrors({}); setClassDraft({ ...cr }); setIsClassModalOpen(true) }
  function closeClassModal() { setClassEditingId(null); setClassFormError(null); setClassFieldErrors({}); setClassDraft({ ...emptyClass }); setIsClassModalOpen(false) }
  async function handleClassSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = classFormSchema.safeParse(classDraft)
    if (!result.success) {
      const errors = zodFieldErrors<ClassFormField>(result.error)
      setClassFieldErrors(errors)
      setClassFormError(Object.values(errors)[0] ?? 'Revise os campos da turma.')
      return
    }
    setClassFormError(null)
    setClassFieldErrors({})
    const parsedClassTeacherIds = Array.from(new Set([result.data.teacherId, ...result.data.teacherIds].filter((id): id is string => Boolean(id))))
    const payload = { ...classDraft, ...result.data, teacherIds: parsedClassTeacherIds }
    if (classEditingId) await onUpdateClass(classEditingId, payload)
    else await onCreateClass(payload)
    closeClassModal()
  }
  function toggleClassTeacher(teacherId: string) {
    setClassDraft((current) => {
      const selected = new Set<string>(
        [...(current.teacherIds ?? []), current.teacherId].filter((id): id is string => Boolean(id)),
      )
      if (teacherId === current.teacherId) selected.add(teacherId)
      else if (selected.has(teacherId)) selected.delete(teacherId)
      else selected.add(teacherId)
      return { ...current, teacherIds: Array.from(selected) }
    })
  }

  function openCreateTeacherModal(cr?: ClassRoom) { setTeacherFieldErrors({}); setTeacherDraft({ ...emptyTeacher, schoolId: cr?.schoolId ?? getDefaultSchoolId(), classId: cr?.id ?? '' }); setIsTeacherModalOpen(true) }
  function closeTeacherModal() { setTeacherFieldErrors({}); setTeacherDraft({ ...emptyTeacher }); setIsTeacherModalOpen(false) }
  async function handleTeacherSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = teacherFormSchema.safeParse(teacherDraft)
    if (!result.success) {
      setTeacherFieldErrors(zodFieldErrors<TeacherFormField>(result.error))
      return
    }
    setTeacherFieldErrors({})
    await onCreateTeacher({ ...teacherDraft, ...result.data })
    closeTeacherModal()
  }

  function openCreateStudentModal(cr?: ClassRoom) { setStudentFieldErrors({}); setStudentDraft({ ...emptyStudent, schoolId: cr?.schoolId ?? getDefaultSchoolId(), classId: cr?.id ?? '', guardianIds: [] }); setIsStudentModalOpen(true) }
  function closeStudentModal() { setStudentFieldErrors({}); setStudentDraft({ ...emptyStudent }); setIsStudentModalOpen(false) }
  async function handleStudentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = studentFormSchema.safeParse({ ...studentDraft, desempenho: getStudentPerformance(studentDraft) })
    if (!result.success) {
      setStudentFieldErrors(zodFieldErrors<StudentFormField>(result.error))
      return
    }
    setStudentFieldErrors({})
    await onCreateStudent({ ...studentDraft, ...result.data })
    closeStudentModal()
  }

  function openCreateGuardianModal(cr?: ClassRoom) {
    setGuardianFieldErrors({})
    setGuardianDraft({ ...emptyGuardian, schoolId: cr?.schoolId ?? getDefaultSchoolId(), studentIds: cr ? students.filter(s => s.classId === cr.id).map(s => s.id) : [] })
    setIsGuardianModalOpen(true)
  }
  function closeGuardianModal() { setGuardianFieldErrors({}); setGuardianDraft({ ...emptyGuardian }); setIsGuardianModalOpen(false) }
  async function handleGuardianSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = guardianFormSchema.safeParse(guardianDraft)
    if (!result.success) {
      setGuardianFieldErrors(zodFieldErrors<GuardianFormField>(result.error))
      return
    }
    setGuardianFieldErrors({})
    await onCreateGuardian({ ...guardianDraft, ...result.data })
    closeGuardianModal()
  }

  function toggleStudentGuardian(id: string) {
    const cur = studentDraft.guardianIds ?? []
    setStudentDraft({ ...studentDraft, guardianIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] })
  }
  function toggleGuardianStudent(id: string) {
    const cur = guardianDraft.studentIds ?? []
    setGuardianDraft({ ...guardianDraft, studentIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] })
  }

  /* ════════════════ RENDER ════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes sv-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sv-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sv-shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        @keyframes sv-scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .sv-page { animation: sv-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both; font-family: 'DM Sans', system-ui, sans-serif; }
        .sv-section { animation: sv-fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .sv-section:nth-child(2) { animation-delay: 0.07s; }
        .sv-card { animation: sv-fade-up 0.38s cubic-bezier(0.22,1,0.36,1) both; }
        .sv-card:nth-child(1) { animation-delay: 0s; }
        .sv-card:nth-child(2) { animation-delay: 0.04s; }
        .sv-card:nth-child(3) { animation-delay: 0.08s; }
        .sv-card:nth-child(4) { animation-delay: 0.12s; }
        .sv-card:nth-child(5) { animation-delay: 0.16s; }
        .sv-card:nth-child(6) { animation-delay: 0.20s; }
        .sv-shimmer {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 600px 100%;
          animation: sv-shimmer 1.5s ease-in-out infinite;
          border-radius: 6px;
        }
        .sv-skeleton-card { animation: sv-fade-in 0.25s ease both; }
        .sv-backdrop {
          background: rgba(15,23,42,0.55);
          backdrop-filter: blur(8px);
          animation: sv-fade-in 0.18s ease both;
        }
        .sv-modal {
          animation: sv-scale-in 0.22s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sv-primary-btn {
          box-shadow: 0 1px 2px rgba(79,70,229,0.25);
        }
        .sv-primary-btn:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(79,70,229,0.35);
          transform: translateY(-1px);
        }
        .sv-school-selected {
          border-color: #4f46e5 !important;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.12), 0 4px 16px rgba(79,70,229,0.1);
        }
        .sv-school-card:hover:not(.sv-school-selected) {
          border-color: #94a3b8;
          box-shadow: 0 4px 16px rgba(15,23,42,0.08);
        }
        .sv-class-card:hover {
          border-color: #94a3b8;
          box-shadow: 0 4px 16px rgba(15,23,42,0.08);
          transform: translateY(-1px);
        }
        .sv-tr:hover td { background: #f8fafc; }
        .sv-icon-btn:hover { background: #f1f5f9; color: #4f46e5; border-color: #c7d2fe; }
      `}</style>

      <div className="sv-page grid min-h-screen gap-4 bg-slate-50 px-[clamp(12px,2.5vw,36px)] py-5 pb-10 text-slate-900">

        {/* ═══ HEADER BAR ═══ */}
        <PageTitleBar
          className="sv-section"
          label="Gestão escolar"
          title="Rede de ensino"
          icon={<Building2 />}
          actions={(
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="hidden sm:block">{visibleSchools.length} escola{visibleSchools.length !== 1 ? 's' : ''}</span>
              <span className="hidden sm:block text-slate-300">·</span>
              <span className="hidden sm:block">{classes.length} turma{classes.length !== 1 ? 's' : ''}</span>
              <span className="hidden sm:block text-slate-300">·</span>
              <span className="hidden sm:block">{students.length} aluno{students.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        />

        {/* ═══════════════════════════════════════
            SECTION 1 — SCHOOLS
        ═══════════════════════════════════════ */}
        <section className="sv-section overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 px-5 py-4">
            <SectionHeader
              label={isDirectorView ? 'Escola vinculada' : 'Escolas'}
              title={isDirectorView ? 'Minha escola' : 'Unidades cadastradas'}
              description={isDirectorView ? 'Visualize e gerencie sua unidade.' : `${visibleSchools.length} unidade${visibleSchools.length !== 1 ? 's' : ''} na rede`}
            />
            {!isDirectorView && !readOnly && (
              <div className="flex items-center gap-2">
                <label className="flex h-9 items-center gap-2 rounded-sm border-2 border-slate-400 bg-slate-50 px-3 text-slate-400 transition-all focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 sm:w-60">
                  <Search size={14} />
                  <input
                    className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar escola…"
                  />
                </label>
                <PrimaryBtn onClick={openCreateSchoolModal}>
                  <Plus size={15} />
                  Nova escola
                </PrimaryBtn>
              </div>
            )}
          </div>

          {/* Cards */}
          <div className="p-4">
            {loading ? (
              <div className="grid grid-cols-3 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
                {[1,2,3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : filteredSchools.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
                {filteredSchools.map(school => {
                  const schoolClasses = classes.filter(c => c.schoolId === school.id)
                  const schoolStudents = students.filter(s => s.schoolId === school.id)
                  const isSelected = selectedSchoolId === school.id

                  return (
                    <article
                      key={school.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedSchoolId(school.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSchoolId(school.id) } }}
                      className={`sv-card sv-school-card group cursor-pointer rounded-xl border-2 bg-white p-4 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 ${isSelected ? 'sv-school-selected border-indigo-500' : 'border-slate-300'}`}
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${school.active ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]' : 'bg-slate-300'}`} />
                          <strong className="min-w-0 truncate font-['Sora',system-ui,sans-serif] text-sm font-bold text-slate-900 leading-snug">{school.name}</strong>
                        </div>
                        <Badge variant={school.active ? 'active' : 'inactive'}>{school.active ? 'Ativa' : 'Inativa'}</Badge>
                      </div>

                      {/* City + Director */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 min-w-0">
                        <MapPin size={11} className="shrink-0 text-slate-400" />
                        <span className="truncate">{school.city || 'Cidade não informada'}</span>
                        {school.director && <>
                          <span className="text-slate-300 shrink-0">·</span>
                          <User size={11} className="shrink-0 text-slate-400" />
                          <span className="truncate text-slate-400">{school.director}</span>
                        </>}
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <StatPill label="Turmas" value={schoolClasses.length} color="bg-indigo-50 text-indigo-700" />
                        <StatPill label="Alunos" value={schoolStudents.length} color="bg-violet-50 text-violet-700" />
                        <StatPill label="INEP" value={school.inepCode || '—'} color="bg-slate-100 text-slate-600" />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t-2 border-slate-100">
                        {isSelected ? (
                          <div className="flex items-center gap-1 rounded-sm bg-indigo-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                            <CheckCircle2 size={10} />
                            Selecionada
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">Clique para selecionar</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button" aria-label="Ver detalhes"
                            className="sv-icon-btn grid h-7 w-7 place-items-center rounded-sm border border-slate-400 hover:border-slate-500 hover:text-slate-500 bg-white text-slate-400 transition-all"
                            onClick={e => { e.stopPropagation(); setSchoolDetailsId(school.id) }}
                          ><MoreHorizontal size={13} /></button>
                          {!readOnly && <button
                            type="button" aria-label="Editar escola"
                            className="sv-icon-btn grid h-7 w-7 place-items-center rounded-sm border border-slate-400 hover:border-slate-500 hover:text-slate-500 bg-white text-slate-400 transition-all"
                            onClick={e => { e.stopPropagation(); openEditSchoolModal(school) }}
                          ><Pencil size={13} /></button>}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title={isDirectorView ? 'Nenhuma escola vinculada' : query.trim() ? 'Sem resultados' : 'Nenhuma escola cadastrada'}
                description={isDirectorView ? 'Seu usuário não possui uma escola vinculada.' : query.trim() ? 'Tente ajustar o termo de busca.' : 'Comece cadastrando a primeira escola da rede.'}
                action={!isDirectorView && !readOnly && !query.trim() ? <PrimaryBtn onClick={openCreateSchoolModal}><Plus size={15} />Cadastrar escola</PrimaryBtn> : undefined}
              />
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 2 — CLASSES
        ═══════════════════════════════════════ */}
        <section className="sv-section overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              {selectedSchool && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600">
                  <GraduationCap size={15} className="text-white" />
                </div>
              )}
              <SectionHeader
                label="Turmas"
                title={selectedSchool ? selectedSchool.name : 'Selecione uma escola'}
                description={selectedSchool
                  ? `${filteredClasses.length} turma${filteredClasses.length !== 1 ? 's' : ''} vinculada${filteredClasses.length !== 1 ? 's' : ''}`
                  : 'Escolha uma escola acima para listar as turmas.'}
              />
            </div>
            <div className="flex items-center gap-2">
              {!readOnly && <PrimaryBtn disabled={!selectedSchool} onClick={openCreateClassModal}>
                <Plus size={15} />
                Nova turma
              </PrimaryBtn>}

              {/* Quick-add toolbar */}
              {!readOnly && <div className="flex items-center gap-0 rounded-sm border-2 border-slate-200 bg-slate-50 overflow-hidden">
                <button type="button" title="Cadastrar professor" disabled={!selectedSchool}
                  onClick={() => openCreateTeacherModal()}
                  className="flex h-9 w-9 items-center justify-center text-slate-500 transition-all hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 border-r-2 border-slate-200">
                  <UserRound size={14} />
                </button>
                <button type="button" title="Cadastrar aluno" disabled={!selectedSchool}
                  onClick={() => openCreateStudentModal()}
                  className="flex h-9 w-9 items-center justify-center text-slate-500 transition-all hover:bg-violet-50 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40 border-r-2 border-slate-200">
                  <GraduationCap size={14} />
                </button>
                <button type="button" title="Cadastrar responsável" disabled={!selectedSchool}
                  onClick={() => openCreateGuardianModal()}
                  className="flex h-9 w-9 items-center justify-center text-slate-500 transition-all hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">
                  <Shield size={14} />
                </button>
              </div>}
            </div>
          </div>

          {/* Cards */}
          <div className="p-4">
            {loading ? (
              <div className="grid grid-cols-3 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
                {[1,2,3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : filteredClasses.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
                {filteredClasses.map(classRoom => {
                  const classStudents = students.filter(s => s.classId === classRoom.id)
                  const classAverageScore = getClassAverageScore(classStudents)
                  const classPerformance = getPerformanceFromScore(classAverageScore.average)
                  const classTeachers = getClassTeachers(classRoom)

                  return (
                    <article key={classRoom.id} className="sv-card sv-class-card flex h-full min-h-[238px] flex-col rounded-xl border border-slate-400 bg-white p-4 transition-all duration-200">
                      {/* Top */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.15)]" />
                          <strong className="min-w-0 truncate font-['Sora',system-ui,sans-serif] text-sm font-bold text-slate-900">{classRoom.name}</strong>
                        </div>
                        <ShiftBadge shift={classRoom.shift} />
                      </div>

                      {/* Grade */}
                      <p className="truncate text-xs font-medium text-slate-500 mb-3">
                        {formatClassGrade(classRoom.grade)} · {getSchoolName(classRoom.schoolId)}
                      </p>

                      {/* Teacher line */}
                      <div className="mb-3 min-h-[34px]">
                        {classTeachers.length > 0 ? (
                          <div className="flex h-[34px] items-center gap-1.5 rounded-lg border-2 border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                            <UserRound size={11} className="shrink-0 text-indigo-400" />
                            <span className="truncate">{classTeachers[0].name}{classTeachers.length > 1 ? ` +${classTeachers.length - 1}` : ''}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Performance summary */}
                      <div className="mb-3 min-h-[42px] rounded-lg border-2 border-slate-100 bg-slate-50 px-2.5 py-2">
                        <p className="mb-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Desempenho geral</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-['Sora',system-ui,sans-serif] text-lg font-black leading-none text-slate-900">
                            {classAverageScore.average === null ? '--' : classAverageScore.average.toFixed(1)}
                          </span>
                          <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-black ${getPerformanceTone(classPerformance)}`}>
                            {getPerformanceLabel(classPerformance)}
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-auto grid grid-cols-2 gap-2 border-t-2 border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => setClassDetailsId(classRoom.id)}
                          className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-sm border-2 border-violet-600 bg-violet-600 px-2 text-center text-[12px] font-bold leading-none text-white transition-all hover:border-violet-700 hover:bg-violet-700"
                        >
                          <Eye size={12} className="shrink-0" />
                          <span className="min-w-0 truncate">Ver informações</span>
                        </button>
                        {!readOnly && <button
                          type="button"
                          onClick={() => openEditClassModal(classRoom)}
                          className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-1.5 rounded-sm border-2 border-slate-400 bg-white px-2 text-center text-[12px] font-bold leading-none text-slate-600 transition-all hover:border-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <Pencil size={12} className="shrink-0" />
                          <span className="min-w-0 truncate">Editar</span>
                        </button>}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={GraduationCap}
                title={selectedSchool ? 'Nenhuma turma cadastrada' : 'Escola não selecionada'}
                description={selectedSchool ? 'Crie uma turma para vincular professores e alunos.' : 'As turmas aparecem aqui após selecionar uma escola acima.'}
                action={selectedSchool && !readOnly ? <PrimaryBtn onClick={openCreateClassModal}><Plus size={15} />Criar turma</PrimaryBtn> : undefined}
              />
            )}
          </div>
        </section>
      </div>

      {/* ══ MODAL — School Details ══ */}
      {detailsSchool && (() => {
        const sc = classes.filter(c => c.schoolId === detailsSchool.id)
        const ss = students.filter(s => s.schoolId === detailsSchool.id)
        return (
          <Modal id="school-details-title" title={detailsSchool.name} subtitle="Detalhes da escola" onClose={() => setSchoolDetailsId(null)}>
            <div className="grid gap-5 p-6">
              <div className="grid grid-cols-3 gap-2 max-[640px]:grid-cols-2">
                {[
                  { label: 'Cidade', value: detailsSchool.city || '—', color: 'bg-sky-50 text-sky-700' },
                  { label: 'Diretor', value: detailsSchool.director || '—', color: 'bg-indigo-50 text-indigo-700' },
                  { label: 'INEP', value: detailsSchool.inepCode || '—', color: 'bg-slate-100 text-slate-600' },
                  { label: 'Status', value: detailsSchool.active ? 'Ativa' : 'Inativa', color: detailsSchool.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500' },
                  { label: 'Turmas', value: sc.length, color: 'bg-violet-50 text-violet-700' },
                  { label: 'Alunos', value: ss.length, color: 'bg-amber-50 text-amber-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg px-3 py-2.5 ${s.color}`}>
                    <div className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60 mb-0.5">{s.label}</div>
                    <div className="text-base font-black">{s.value}</div>
                  </div>
                ))}
              </div>

              {detailsSchool.address && (
                <div className="flex items-center gap-2 rounded-lg border-2 border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                  <MapPin size={14} className="shrink-0 text-slate-400" />
                  {detailsSchool.address}
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Turmas vinculadas</p>
                <div className="grid gap-2">
                  {sc.map(cr => {
                    const cStudents = students.filter(s => s.classId === cr.id)
                    const cTeachers = getClassTeachers(cr)
                    return (
                      <div key={cr.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-slate-300 bg-slate-50 px-4 py-2.5">
                        <div className="min-w-0">
                          <strong className="block text-sm font-bold text-slate-900">{cr.name}</strong>
                          <span className="text-xs text-slate-500">{formatClassGrade(cr.grade)} · {cr.shift} · {cTeachers.length ? cTeachers.map(t => t.name).join(', ') : getTeacherName(cr.teacherId)}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">{cStudents.length} alunos</span>
                          <GhostBtn onClick={() => { setSchoolDetailsId(null); setClassDetailsId(cr.id) }}>
                            <Eye size={11} />Detalhes
                          </GhostBtn>
                        </div>
                      </div>
                    )
                  })}
                  {sc.length === 0 && <p className="text-sm text-slate-400">Nenhuma turma cadastrada.</p>}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t-2 border-slate-100 pt-4">
                <SecondaryBtn onClick={() => setSchoolDetailsId(null)}>Fechar</SecondaryBtn>
                {!readOnly && <PrimaryBtn onClick={() => { setSchoolDetailsId(null); openEditSchoolModal(detailsSchool) }}>
                  <Pencil size={13} />Editar escola
                </PrimaryBtn>}
              </div>
            </div>
          </Modal>
        )
      })()}

  
      {/* ══ MODAL — Class Details ══ */}
      {detailsClass && (() => {
        const classStudents = students.filter(s => s.classId === detailsClass.id)
        const classTeachers = getClassTeachers(detailsClass)
        const classAverageScore = getClassAverageScore(classStudents)
        const classPerformance = getPerformanceFromScore(classAverageScore.average)
        const avgAttendance = classStudents.length ? Math.round(classStudents.reduce((a, s) => a + s.attendanceRate, 0) / classStudents.length) : null
        const avgScore = classAverageScore.average === null ? null : classAverageScore.average.toFixed(1)
        return (
            <Modal
              id="class-details-title"
              title={detailsClass.name}
              subtitle="Detalhes da turma"
              onClose={() => setClassDetailsId(null)}
              maxWidth="1040px"
              headerAction={!readOnly ? (
                <button
                  type="button"
                  onClick={() => { setClassDetailsId(null); openEditClassModal(detailsClass) }}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-slate-400 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <Pencil size={12} />
                  Editar
                </button>
              ) : undefined}
            >
              <div className="grid gap-5 p-6">

              {/* Stats principais */}
              <div className="grid grid-cols-4 gap-2 max-[640px]:grid-cols-2">
                {[
                  { label: 'Turno', value: detailsClass.shift, color: 'bg-sky-50 text-sky-700' },
                  { label: 'Alunos', value: classStudents.length, color: 'bg-violet-50 text-violet-700' },
                  { label: 'Professores', value: classTeachers.length || (detailsClass.teacherId ? 1 : 0), color: 'bg-indigo-50 text-indigo-700' },
                  { label: 'Ano letivo', value: detailsClass.academicYear, color: 'bg-amber-50 text-amber-700' },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg px-3 py-2.5 ${s.color}`}>
                    <div className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60 mb-0.5">{s.label}</div>
                    <div className="text-base font-black">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Métricas de desempenho */}
              {classStudents.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-400 px-3 py-2.5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Freq. média</div>
                    <div className="text-base font-black text-slate-800">{avgAttendance}%</div>
                  </div>
                  <div className="rounded-lg border border-slate-400 px-3 py-2.5">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Média geral</div>
                    <div className="text-base font-black text-slate-800">{avgScore}</div>
                  </div>
                  <div className="rounded-lg border border-slate-400 px-3 py-2.5">
                    <div className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Desempenho geral</div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-black ${getPerformanceTone(classPerformance)}`}>
                        {getPerformanceLabel(classPerformance)}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {classAverageScore.totalScores} nota{classAverageScore.totalScores !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Barra de ações rápidas ── */}
              {!readOnly && <div className="flex items-center gap-2 rounded-xl border border-slate-400 bg-slate-50 p-2">
                <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 shrink-0 pl-1">Adicionar</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setClassDetailsId(null); openCreateTeacherModal(detailsClass) }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 transition-all hover:border-indigo-400 hover:bg-indigo-50"
                  >
                    <Plus size={11} />
                    Professor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setClassDetailsId(null); openCreateStudentModal(detailsClass) }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-[11px] font-bold text-violet-700 transition-all hover:border-violet-400 hover:bg-violet-50"
                  >
                    <Plus size={11} />
                    Aluno
                  </button>
                  <button
                    type="button"
                    onClick={() => { setClassDetailsId(null); openCreateGuardianModal(detailsClass) }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition-all hover:border-emerald-400 hover:bg-emerald-50"
                  >
                    <Plus size={11} />
                    Responsável
                  </button>
                </div>
              </div>}

              {/* Professores */}
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Professores</p>
                <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
                  {classTeachers.map((t, i) => {
                    const colors = ['bg-indigo-50 border-indigo-300', 'bg-violet-50 border-violet-300', 'bg-sky-50 border-sky-300', 'bg-emerald-50 border-emerald-300']
                    const teacherProfile = withCurrentUserVisuals(t)
                    return (
                      <div key={t.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 ${colors[i % colors.length]}`}>
                        <ProfileAvatar entity={teacherProfile} size="md" assetVersion={getProfileAssetVersion(t)} />
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-bold text-slate-900">{t.name}</strong>
                          <span className="text-xs text-slate-500 truncate block">{t.specialty || 'Especialidade não informada'}</span>
                        </div>
                      </div>
                    )
                  })}
                  {classTeachers.length === 0 && <p className="text-sm text-slate-400">Nenhum professor vinculado.</p>}
                </div>
              </div>

              {/* Lista de alunos */}
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Alunos da turma</p>
                <div className="grid gap-2 rounded-lg border border-slate-400 bg-slate-50 p-2">
                  {classStudents.map(s => {
                    const studentProfile = withCurrentUserVisuals(s)
                    return (
                    <article
                      key={s.id}
                      className="grid min-w-0 items-center gap-3 rounded-md border border-slate-300 bg-white p-3 lg:grid-cols-[minmax(190px,1.25fr)_minmax(160px,1fr)_86px_72px_112px] max-lg:grid-cols-2 max-[560px]:grid-cols-1"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <ProfileAvatar entity={studentProfile} assetVersion={getProfileAssetVersion(s)} />
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-bold text-slate-900">{s.name}</strong>
                          <span className="block truncate font-mono text-[11px] font-semibold text-slate-400">
                            {s.registrationNumber || s.registration || 'Sem matrícula'}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Responsáveis</p>
                        <p className="text-xs font-semibold leading-snug text-slate-600 [overflow-wrap:anywhere]">
                          {s.guardianIds?.length ? s.guardianIds.map(getGuardianName).join(', ') : '—'}
                        </p>
                      </div>

                      <div>
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Frequência</p>
                        <p className="text-xs font-bold text-slate-700">{s.attendanceRate}%</p>
                      </div>

                      <div>
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Média</p>
                        <p className="text-xs font-bold text-slate-700">{s.averageScore?.toFixed(1) ?? '—'}</p>
                      </div>

                      <div>
                        <p className="mb-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Desempenho</p>
                        <PerformancePill level={getStudentPerformance(s)} />
                      </div>
                    </article>
                    )
                  })}
                  {classStudents.length === 0 && <div className="py-8 text-center text-sm text-slate-400">Nenhum aluno vinculado.</div>}
                </div>
              </div>

              {/* BNCC + Responsáveis */}
              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                {detailsClass.bnccFocus?.length > 0 && (
                  <div className="rounded-lg border border-slate-400 bg-slate-50 p-3">
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Disciplinas da turma</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailsClass.bnccFocus.map(f => (
                        <span key={f} className="rounded-sm border border-blue-400 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">{f}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-slate-400 bg-slate-50 p-3">
                  <p className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Responsáveis</p>
                  {(() => {
                    const gIds = Array.from(new Set(classStudents.flatMap(s => s.guardianIds ?? [])))
                    return gIds.length > 0
                      ? <div className="flex flex-col gap-1">{gIds.map(id => <span key={id} className="text-xs font-semibold text-slate-700">{getGuardianName(id)}</span>)}</div>
                      : <p className="text-xs text-slate-400">Nenhum responsável vinculado.</p>
                  })()}
                </div>
              </div>

            </div>
          </Modal>
        )
      })()}

      {/* ══ MODAL — Create/Edit School ══ */}
      {isSchoolModalOpen && (
        <Modal id="school-modal-title" title={schoolEditingId ? 'Atualizar unidade' : 'Cadastrar escola'} subtitle={schoolEditingId ? 'Editar escola' : 'Nova escola'} onClose={closeSchoolModal}>
          <form className="grid gap-4 p-6" onSubmit={handleSchoolSubmit} noValidate>
            <div className="grid grid-cols-2 gap-3 max-[580px]:grid-cols-1">
              <Field label="Nome da escola" hint="Digite o nome oficial ou nome usado pela rede." error={schoolFieldErrors.name}>
                <input className={`${inputCls} ${fieldStateClass(schoolFieldErrors.name)}`} value={schoolDraft.name ?? ''} onChange={e => { clearSchoolError('name'); setSchoolDraft({ ...schoolDraft, name: e.target.value }) }} required placeholder="E.E. João da Silva" aria-invalid={Boolean(schoolFieldErrors.name) || undefined} />
              </Field>
              <Field label="Cidade" hint="Digite a cidade onde a escola está localizada." error={schoolFieldErrors.city}>
                <input className={`${inputCls} ${fieldStateClass(schoolFieldErrors.city)}`} value={schoolDraft.city ?? ''} onChange={e => { clearSchoolError('city'); setSchoolDraft({ ...schoolDraft, city: e.target.value }) }} required placeholder="São Paulo" aria-invalid={Boolean(schoolFieldErrors.city) || undefined} />
              </Field>
              <Field label="Endereço" hint="Informe rua, número, bairro e complemento quando houver." error={schoolFieldErrors.address}>
                <input className={`${inputCls} ${fieldStateClass(schoolFieldErrors.address)}`} value={schoolDraft.address ?? ''} onChange={e => { clearSchoolError('address'); setSchoolDraft({ ...schoolDraft, address: e.target.value }) }} required placeholder="Rua, número, bairro" aria-invalid={Boolean(schoolFieldErrors.address) || undefined} />
              </Field>
              <Field label="Diretor(a)" hint="Digite o nome completo da pessoa responsável pela gestão." error={schoolFieldErrors.director}>
                <input className={`${inputCls} ${fieldStateClass(schoolFieldErrors.director)}`} value={schoolDraft.director ?? ''} onChange={e => { clearSchoolError('director'); setSchoolDraft({ ...schoolDraft, director: e.target.value }) }} required placeholder="Nome completo" aria-invalid={Boolean(schoolFieldErrors.director) || undefined} />
              </Field>
              <Field label="Código INEP" hint="Digite o código INEP da escola, somente números quando possível." error={schoolFieldErrors.inepCode}>
                <input className={`${inputCls} ${fieldStateClass(schoolFieldErrors.inepCode)}`} value={schoolDraft.inepCode ?? ''} onChange={e => { clearSchoolError('inepCode'); setSchoolDraft({ ...schoolDraft, inepCode: e.target.value }) }} required placeholder="35000000" aria-invalid={Boolean(schoolFieldErrors.inepCode) || undefined} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t-2 border-slate-100 pt-4">
              <SecondaryBtn onClick={closeSchoolModal}>Cancelar</SecondaryBtn>
              <PrimaryBtn type="submit"><Save size={13} />Salvar escola</PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ MODAL — Create/Edit Class ══ */}
      {isClassModalOpen && (
        <Modal id="class-modal-title" title={classEditingId ? 'Atualizar turma' : 'Cadastrar turma'} subtitle={classEditingId ? 'Editar turma' : 'Nova turma'} onClose={closeClassModal}>
          <form className="grid gap-4 p-6" onSubmit={handleClassSubmit} noValidate>
            {classFormError && (
              <div className="flex items-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
                <AlertTriangle size={14} className="shrink-0" />{classFormError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 max-[580px]:grid-cols-1">
              <Field label="Nome da turma" hint="Digite como a turma aparece na escola, por exemplo 5º Ano A." error={classFieldErrors.name}>
                <input className={`${inputCls} ${fieldStateClass(classFieldErrors.name)}`} value={classDraft.name ?? ''} onChange={e => { clearClassError('name'); setClassDraft({ ...classDraft, name: e.target.value }) }} required placeholder="5º Ano A" aria-invalid={Boolean(classFieldErrors.name) || undefined} />
              </Field>
              <Field label="Série / Ano">
                <CompactSelect value={classDraft.grade ?? ''} onChange={grade => { clearClassError('grade'); setClassDraft({ ...classDraft, grade }) }} options={classGradeOptions} className={`${inputCls} ${fieldStateClass(classFieldErrors.grade)}`} hint="Selecione a etapa escolar correspondente." error={classFieldErrors.grade} dropdownMinWidth={320} />
              </Field>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Escola</span>
                {isDirectorView ? (
                  <div className="flex min-h-10 items-center rounded-lg border-2 border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900">{getSchoolName(classDraft.schoolId || linkedSchoolId)}</div>
                ) : (
                  <CompactSelect value={classDraft.schoolId ?? ''} onChange={sid => { clearClassError('schoolId'); clearClassError('teacherId'); setClassDraft({ ...classDraft, schoolId: sid, teacherId: '', teacherIds: [] }) }} options={schoolOptions} className={`${inputCls} ${fieldStateClass(classFieldErrors.schoolId)}`} hint="Escolha a escola à qual a turma pertence." error={classFieldErrors.schoolId} dropdownMinWidth={280} />
                )}
                {isDirectorView && <FieldMessage hint="A escola vem do seu vínculo de diretor." error={classFieldErrors.schoolId} />}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Professor responsável</span>
                <CompactSelect value={classDraft.teacherId ?? ''} onChange={tid => { clearClassError('teacherId'); setClassDraft({ ...classDraft, teacherId: tid, teacherIds: Array.from(new Set([tid, ...(classDraft.teacherIds ?? [])].filter(Boolean))) }) }} options={teacherOptions} className={`${inputCls} ${fieldStateClass(classFieldErrors.teacherId)}`} hint="Selecione o professor principal da turma." error={classFieldErrors.teacherId} dropdownMinWidth={280} />
              </div>
              <div className="col-span-2 rounded-lg border-2 border-slate-200 bg-slate-50 p-3 max-[580px]:col-span-1">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Professores vinculados a esta turma</p>
                <FieldMessage hint="Opcional: marque professores adicionais que também podem atuar nesta turma." error={classFieldErrors.teacherIds} className="mb-2" />
                <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
                  {classTeacherCandidates.map((teacher) => {
                    const checked = teacher.id === classDraft.teacherId || (classDraft.teacherIds ?? []).includes(teacher.id)
                    return (
                      <label key={teacher.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={checked} onChange={() => toggleClassTeacher(teacher.id)} />
                        <span className="min-w-0">
                          <span className="block truncate">{teacher.name}</span>
                          <span className="block truncate text-[11px] font-medium text-slate-400">{teacher.specialty || 'Sem disciplina informada'}</span>
                        </span>
                      </label>
                    )
                  })}
                  {classTeacherCandidates.length === 0 && <p className="text-sm font-semibold text-slate-400">Cadastre professores nesta escola para vincular.</p>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Turno</span>
                <CompactSelect<ClassRoom['shift']> value={classDraft.shift ?? 'Manha'} onChange={shift => { clearClassError('shift'); setClassDraft({ ...classDraft, shift }) }} options={shiftOptions} className={`${inputCls} ${fieldStateClass(classFieldErrors.shift)}`} hint="Escolha o turno de funcionamento." error={classFieldErrors.shift} dropdownMinWidth={180} />
              </div>
              <Field label="Ano letivo" hint={`Digite o ano letivo, por exemplo ${currentYear}.`} error={classFieldErrors.academicYear}>
                <input className={`${inputCls} ${fieldStateClass(classFieldErrors.academicYear)}`} type="number" value={classDraft.academicYear ?? currentYear} onChange={e => { clearClassError('academicYear'); setClassDraft({ ...classDraft, academicYear: Number(e.target.value) }) }} required aria-invalid={Boolean(classFieldErrors.academicYear) || undefined} />
              </Field>
              <Field label="Horário" hint="Digite dias e horários, por exemplo: Seg a Sex, 07:30-11:30." error={classFieldErrors.schedule}>
                <input className={`${inputCls} ${fieldStateClass(classFieldErrors.schedule)}`} value={classDraft.schedule ?? ''} onChange={e => { clearClassError('schedule'); setClassDraft({ ...classDraft, schedule: e.target.value }) }} placeholder="Seg a Sex, 07:30-11:30" required aria-invalid={Boolean(classFieldErrors.schedule) || undefined} />
              </Field>
              <Field label="Disciplinas da turma (separadas por vírgula)" hint="Opcional: separe disciplinas ou focos BNCC por vírgula." error={classFieldErrors.bnccFocus}>
                <input className={`${inputCls} ${fieldStateClass(classFieldErrors.bnccFocus)}`} value={(classDraft.bnccFocus ?? []).join(', ')} onChange={e => { clearClassError('bnccFocus'); setClassDraft({ ...classDraft, bnccFocus: splitDisciplineList(e.target.value) }) }} placeholder="Matemática, Português, Ciências" aria-invalid={Boolean(classFieldErrors.bnccFocus) || undefined} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t-2 border-slate-100 pt-4">
              <SecondaryBtn onClick={closeClassModal}>Cancelar</SecondaryBtn>
              <PrimaryBtn type="submit"><Save size={13} />Salvar turma</PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ MODAL — Create Teacher ══ */}
      {isTeacherModalOpen && (
        <Modal id="teacher-modal-title" title="Cadastrar professor" subtitle="Novo professor" onClose={closeTeacherModal}>
          <form className="grid gap-4 p-6" onSubmit={handleTeacherSubmit} noValidate>
            <div className="grid grid-cols-2 gap-3 max-[580px]:grid-cols-1">
              <Field label="Nome completo" hint="Digite o nome e sobrenome do professor." error={teacherFieldErrors.name}><input className={`${inputCls} ${fieldStateClass(teacherFieldErrors.name)}`} value={teacherDraft.name ?? ''} onChange={e => { clearTeacherError('name'); setTeacherDraft({ ...teacherDraft, name: e.target.value }) }} placeholder="Nome Completo" required aria-invalid={Boolean(teacherFieldErrors.name) || undefined} /></Field>
              <Field label="E-mail" hint="Digite um e-mail válido para acesso e contato." error={teacherFieldErrors.email}>
                <div className="relative"><Mail size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9 ${fieldStateClass(teacherFieldErrors.email)}`} type="email" value={teacherDraft.email ?? ''} onChange={e => { clearTeacherError('email'); setTeacherDraft({ ...teacherDraft, email: e.target.value }) }} placeholder="Digite o e-mail" required aria-invalid={Boolean(teacherFieldErrors.email) || undefined} /></div>
              </Field>
              <Field label="Disciplinas do professor" hint="Digite as disciplinas separadas por vírgula." error={teacherFieldErrors.specialty}><input className={`${inputCls} ${fieldStateClass(teacherFieldErrors.specialty)}`} value={teacherDraft.specialty ?? ''} onChange={e => { clearTeacherError('specialty'); setTeacherDraft({ ...teacherDraft, specialty: e.target.value }) }} required placeholder="Matemática, Física" aria-invalid={Boolean(teacherFieldErrors.specialty) || undefined} /></Field>
              <Field label="Telefone" hint="Opcional: informe com DDD." error={teacherFieldErrors.phone}>
                <div className="relative"><Phone size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9 ${fieldStateClass(teacherFieldErrors.phone)}`} value={teacherDraft.phone ?? ''} onChange={e => { clearTeacherError('phone'); setTeacherDraft({ ...teacherDraft, phone: e.target.value }) }} placeholder="(86) 9400-0000" aria-invalid={Boolean(teacherFieldErrors.phone) || undefined} /></div>
              </Field>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Escola</span>
                {isDirectorView ? (
                  <div className="flex min-h-10 items-center rounded-lg border-2 border-slate-200 bg-slate-50 px-3 text-sm font-semibold">{getSchoolName(teacherDraft.schoolId || linkedSchoolId)}</div>
                ) : (
                  <CompactSelect value={teacherDraft.schoolId ?? ''} onChange={sid => { clearTeacherError('schoolId'); setTeacherDraft({ ...teacherDraft, schoolId: sid, classId: '' }) }} options={teacherSchoolOptions} className={`${inputCls} ${fieldStateClass(teacherFieldErrors.schoolId)}`} hint="Selecione a escola em que o professor atua." error={teacherFieldErrors.schoolId} dropdownMinWidth={280} />
                )}
                {isDirectorView && <FieldMessage hint="A escola vem do seu vínculo de diretor." error={teacherFieldErrors.schoolId} />}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Vincular turma</span>
                <CompactSelect value={teacherDraft.classId ?? ''} onChange={cid => { clearTeacherError('classId'); setTeacherDraft({ ...teacherDraft, classId: cid }) }} options={classOptions} className={`${inputCls} ${fieldStateClass(teacherFieldErrors.classId)}`} hint="Opcional: vincule uma turma já cadastrada." error={teacherFieldErrors.classId} dropdownMinWidth={280} />
              </div>
              <Field label="Senha inicial" hint="Digite uma senha temporária com pelo menos 8 caracteres." error={teacherFieldErrors.password}>
                <div className="relative"><Lock size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9 ${fieldStateClass(teacherFieldErrors.password)}`} type="password" minLength={8} value={teacherDraft.password ?? ''} onChange={e => { clearTeacherError('password'); setTeacherDraft({ ...teacherDraft, password: e.target.value }) }} placeholder="Digite uma senha inicial" required aria-invalid={Boolean(teacherFieldErrors.password) || undefined} /></div>
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t-2 border-slate-100 pt-4">
              <SecondaryBtn onClick={closeTeacherModal}>Cancelar</SecondaryBtn>
              <PrimaryBtn type="submit"><Save size={13} />Salvar professor</PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ MODAL — Create Student ══ */}
      {isStudentModalOpen && (
        <Modal id="student-modal-title" title="Cadastrar aluno" subtitle="Novo aluno" onClose={closeStudentModal}>
          <form className="grid gap-4 p-6" onSubmit={handleStudentSubmit} noValidate>
            <div className="grid grid-cols-2 gap-3 max-[580px]:grid-cols-1">
              <Field label="Nome completo" hint="Digite o nome completo do aluno." error={studentFieldErrors.name}><input className={`${inputCls} ${fieldStateClass(studentFieldErrors.name)}`} value={studentDraft.name ?? ''} onChange={e => { clearStudentError('name'); setStudentDraft({ ...studentDraft, name: e.target.value }) }} placeholder="Nome Completo" required aria-invalid={Boolean(studentFieldErrors.name) || undefined} /></Field>
              <Field label="Matrícula" hint="Opcional: informe a matrícula usada pela escola." error={studentFieldErrors.registrationNumber}><input className={`${inputCls} ${fieldStateClass(studentFieldErrors.registrationNumber)}`} value={studentDraft.registrationNumber ?? ''} onChange={e => { clearStudentError('registrationNumber'); setStudentDraft({ ...studentDraft, registrationNumber: e.target.value, registration: e.target.value }) }} placeholder="Digite a matrícula" aria-invalid={Boolean(studentFieldErrors.registrationNumber) || undefined} /></Field>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Escola</span>
                {isDirectorView ? (
                  <div className="flex min-h-10 items-center rounded-lg border-2 border-slate-200 bg-slate-50 px-3 text-sm font-semibold">{getSchoolName(studentDraft.schoolId || linkedSchoolId)}</div>
                ) : (
                  <CompactSelect value={studentDraft.schoolId ?? ''} onChange={sid => { clearStudentError('schoolId'); clearStudentError('classId'); setStudentDraft({ ...studentDraft, schoolId: sid, classId: '', guardianIds: [] }) }} options={teacherSchoolOptions} className={`${inputCls} ${fieldStateClass(studentFieldErrors.schoolId)}`} hint="Selecione a escola onde o aluno está matriculado." error={studentFieldErrors.schoolId} dropdownMinWidth={280} />
                )}
                {isDirectorView && <FieldMessage hint="A escola vem do seu vínculo de diretor." error={studentFieldErrors.schoolId} />}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Turma</span>
                <CompactSelect value={studentDraft.classId ?? ''} onChange={cid => { clearStudentError('classId'); setStudentDraft({ ...studentDraft, classId: cid }) }} options={studentClassOptions} className={`${inputCls} ${fieldStateClass(studentFieldErrors.classId)}`} hint="Selecione a turma atual do aluno." error={studentFieldErrors.classId} dropdownMinWidth={280} />
              </div>
              <div className="col-span-2 rounded-lg border-2 border-indigo-100 bg-indigo-50 px-3 py-2.5 max-[580px]:col-span-1">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-indigo-400">Disciplinas vinculadas pela turma</p>
                <div className="flex flex-wrap gap-1.5">
                  {getClassDisciplines(studentDraft.classId).map((discipline) => (
                    <span key={discipline} className="rounded-full border border-indigo-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">{discipline}</span>
                  ))}
                  {getClassDisciplines(studentDraft.classId).length === 0 && <span className="text-xs font-semibold text-indigo-300">Selecione uma turma com disciplinas cadastradas.</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Desempenho</span>
                <CompactSelect<Desempenho> value={getStudentPerformance(studentDraft)} onChange={desempenho => { clearStudentError('desempenho'); setStudentDraft({ ...studentDraft, desempenho }) }} options={performanceOptions} className={`${inputCls} ${fieldStateClass(studentFieldErrors.desempenho)}`} hint="Informe a leitura inicial de desempenho do aluno." error={studentFieldErrors.desempenho} dropdownMinWidth={180} />
              </div>
              <Field label="Senha inicial" hint="Digite uma senha temporária com pelo menos 8 caracteres." error={studentFieldErrors.password}>
                <div className="relative"><Lock size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9 ${fieldStateClass(studentFieldErrors.password)}`} type="password" minLength={8} value={studentDraft.password ?? ''} onChange={e => { clearStudentError('password'); setStudentDraft({ ...studentDraft, password: e.target.value }) }} placeholder="Digite uma senha inicial" required aria-invalid={Boolean(studentFieldErrors.password) || undefined} /></div>
              </Field>
              <div className="flex flex-col gap-1 justify-center rounded-lg border-2 border-indigo-100 bg-indigo-50 px-3 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-indigo-400">Login gerado</p>
                <p className="text-sm font-bold text-indigo-700">
                  {studentDraft.registrationNumber ? `${studentDraft.registrationNumber}@aluno` : <span className="text-indigo-300 font-normal text-xs">Gerado após matrícula</span>}
                </p>
              </div>
            </div>

            <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
              <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Responsáveis vinculados</p>
              <FieldMessage hint="Opcional: marque os responsáveis que acompanharão este aluno." error={studentFieldErrors.guardianIds} className="mb-2" />
              <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
                {studentSchoolGuardians.map(g => (
                  <label key={g.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-indigo-300">
                    <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={(studentDraft.guardianIds ?? []).includes(g.id)} onChange={() => toggleStudentGuardian(g.id)} />
                    {g.name}
                  </label>
                ))}
                {studentSchoolGuardians.length === 0 && <p className="text-sm text-slate-400">Nenhum responsável cadastrado.</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t-2 border-slate-100 pt-4">
              <SecondaryBtn onClick={closeStudentModal}>Cancelar</SecondaryBtn>
              <PrimaryBtn type="submit"><Save size={13} />Salvar aluno</PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ MODAL — Create Guardian ══ */}
      {isGuardianModalOpen && (
        <Modal id="guardian-modal-title" title="Cadastrar responsável" subtitle="Novo responsável" onClose={closeGuardianModal}>
          <form className="grid gap-4 p-6" onSubmit={handleGuardianSubmit} noValidate>
            <div className="grid grid-cols-2 gap-3 max-[580px]:grid-cols-1">
              <Field label="Nome completo" hint="Digite o nome completo do responsável." error={guardianFieldErrors.name}><input className={`${inputCls} ${fieldStateClass(guardianFieldErrors.name)}`} value={guardianDraft.name ?? ''} onChange={e => { clearGuardianError('name'); setGuardianDraft({ ...guardianDraft, name: e.target.value }) }} placeholder="Nome completo" required aria-invalid={Boolean(guardianFieldErrors.name) || undefined} /></Field>
              <Field label="E-mail" hint="Digite um e-mail válido para acesso e contato." error={guardianFieldErrors.email}>
                <div className="relative"><Mail size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9 ${fieldStateClass(guardianFieldErrors.email)}`} type="email" value={guardianDraft.email ?? ''} onChange={e => { clearGuardianError('email'); setGuardianDraft({ ...guardianDraft, email: e.target.value }) }} placeholder="Digite o e-mail" required aria-invalid={Boolean(guardianFieldErrors.email) || undefined} /></div>
              </Field>
              <Field label="Telefone" hint="Opcional: informe com DDD." error={guardianFieldErrors.phone}>
                <div className="relative"><Phone size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9 ${fieldStateClass(guardianFieldErrors.phone)}`} value={guardianDraft.phone ?? ''} onChange={e => { clearGuardianError('phone'); setGuardianDraft({ ...guardianDraft, phone: e.target.value }) }} placeholder="(86) 9400-0000" aria-invalid={Boolean(guardianFieldErrors.phone) || undefined} /></div>
              </Field>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Escola</span>
                {isDirectorView ? (
                  <div className="flex min-h-10 items-center rounded-lg border-2 border-slate-200 bg-slate-50 px-3 text-sm font-semibold">{getSchoolName(guardianDraft.schoolId || linkedSchoolId)}</div>
                ) : (
                  <CompactSelect value={guardianDraft.schoolId ?? ''} onChange={sid => { clearGuardianError('schoolId'); setGuardianDraft({ ...guardianDraft, schoolId: sid, studentIds: [] }) }} options={teacherSchoolOptions} className={`${inputCls} ${fieldStateClass(guardianFieldErrors.schoolId)}`} hint="Selecione a escola relacionada aos alunos acompanhados." error={guardianFieldErrors.schoolId} dropdownMinWidth={280} />
                )}
                {isDirectorView && <FieldMessage hint="A escola vem do seu vínculo de diretor." error={guardianFieldErrors.schoolId} />}
              </div>
              <Field label="Senha inicial" hint="Digite uma senha temporária com pelo menos 8 caracteres." error={guardianFieldErrors.password}>
                <div className="relative"><Lock size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className={`${inputCls} pl-9 ${fieldStateClass(guardianFieldErrors.password)}`} type="password" minLength={8} value={guardianDraft.password ?? ''} onChange={e => { clearGuardianError('password'); setGuardianDraft({ ...guardianDraft, password: e.target.value }) }} placeholder="Digite uma senha inicial" required aria-invalid={Boolean(guardianFieldErrors.password) || undefined} /></div>
              </Field>
            </div>

            <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
              <p className="mb-2.5 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Alunos acompanhados</p>
              <FieldMessage hint="Opcional: marque os alunos acompanhados por este responsável." error={guardianFieldErrors.studentIds} className="mb-2" />
              <div className="grid grid-cols-2 gap-2 max-[640px]:grid-cols-1">
                {guardianSchoolStudents.map(s => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-emerald-300">
                    <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={(guardianDraft.studentIds ?? []).includes(s.id)} onChange={() => toggleGuardianStudent(s.id)} />
                    <span className="min-w-0 truncate">{s.name}</span>
                  </label>
                ))}
                {guardianSchoolStudents.length === 0 && <p className="text-sm text-slate-400">Selecione uma escola com alunos.</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t-2 border-slate-100 pt-4">
              <SecondaryBtn onClick={closeGuardianModal}>Cancelar</SecondaryBtn>
              <PrimaryBtn type="submit"><Save size={13} />Salvar responsável</PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
