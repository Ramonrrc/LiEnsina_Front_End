import { ChangeEvent, FormEvent, useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  Save, UserRound, Camera, ImageIcon, Mail, Phone, Calendar,
  CreditCard, ShieldCheck, CheckCircle2, AlertCircle, X, Trash2, RotateCcw,
  AtSign, School as SchoolIcon, Wifi,
} from 'lucide-react'
import { z } from 'zod'

import { resolveApiAssetUrl } from '../api'
import { AvatarHoverPreview } from '../components/profile/AvatarSign'
import DateInput from '../components/ui/date-input'
import { FieldMessage, fieldStateClass } from '../components/ui/form-field'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { PROFILE_IMAGE_ACCEPT, validateProfileImageFile } from '../lib/file-security'
import type { RoleCode, School as SchoolType, UserAccount } from '../types'

interface SettingsViewProps {
  currentUser: UserAccount
  profile: RoleCode
  schools?: SchoolType[]
  assetVersion?: {
    avatar?: string | number | null
    banner?: string | number | null
  }
  onSave: (
    draft: Partial<UserAccount>,
    avatarFile?: File | null,
    bannerFile?: File | null,
    visualAction?: ProfileVisualAction,
  ) => Promise<void>
}

type ProfileVisualAction = {
  removeAvatar?: boolean
  removeBanner?: boolean
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function isValidCpf(value: string) {
  const digits = onlyDigits(value)
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const calculateDigit = (factor: number) => {
    let total = 0
    for (let index = 0; index < factor - 1; index += 1) {
      total += Number(digits[index]) * (factor - index)
    }
    const remainder = (total * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return calculateDigit(10) === Number(digits[9]) && calculateDigit(11) === Number(digits[10])
}

function formatCpf(value?: string | null) {
  const digits = onlyDigits(value ?? '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatPhone(value?: string | null) {
  const digits = onlyDigits(value ?? '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function isValidBirthDate(value: string) {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return false
  const normalized = date.toISOString().slice(0, 10)
  const today = new Date()
  const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate())
  return normalized === value && date <= today && date >= minDate
}

const profileSchema = z.object({
  name: z.string().trim().min(3, 'Informe pelo menos 3 caracteres.').max(120, 'Use no máximo 120 caracteres.'),
  email: z.string().trim().email('Informe um e-mail válido.').max(160, 'Use no máximo 160 caracteres.'),
  phone: z.string().trim().refine((value) => {
    const digits = onlyDigits(value)
    return !digits || (digits.length >= 10 && digits.length <= 11)
  }, 'Telefone deve ter DDD e 10 ou 11 dígitos.'),
  birthDate: z.string().trim().refine(isValidBirthDate, 'Informe uma data válida.'),
  cpf: z.string().trim().refine((value) => {
    const digits = onlyDigits(value)
    return !digits || isValidCpf(digits)
  }, 'Informe um CPF válido.'),
})

type ProfileFormDraft = z.infer<typeof profileSchema>
type ProfileFormErrors = Partial<Record<keyof ProfileFormDraft, string>>

function getLinkedSchoolName(currentUser: UserAccount, profile: RoleCode, schools: SchoolType[]) {
  if (profile === 'SUPERADMIN') return 'Todas as escolas'
  const linkedSchool = currentUser.schoolId
    ? schools.find((school) => school.id === currentUser.schoolId)
    : null
  if (linkedSchool) return linkedSchool.name
  if (schools.length === 1) return schools[0].name
  return 'Escola não vinculada'
}

function getLinkedSchoolHint(profile: RoleCode) {
  if (profile === 'SUPERADMIN') return 'Superadministradores possuem acesso global auditado.'
  return 'Campo definido pelo vínculo do usuário.'
}

/* ─── Eyebrow ─── */
function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold tracking-[.16em] uppercase text-stone-400 font-['DM_Sans'] ${className}`}>
      {children}
    </p>
  )
}

/* ─── Bone skeleton ─── */
function Bone({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-stone-200 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  )
}

/* ─── Field wrapper ─── */
function Field({
  label,
  icon: Icon,
  iconColor = 'text-stone-400',
  error,
  children,
  hint,
}: {
  label: string
  icon?: React.ElementType
  iconColor?: string
  error?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5">
        {Icon && <Icon size={11} className={`shrink-0 ${iconColor}`} />}
        <Eyebrow className="text-stone-500">{label}</Eyebrow>
      </span>
      {children}
      <FieldMessage hint={hint} error={error} />
    </label>
  )
}

/* ─── Section card ─── */
function SectionCard({
  label,
  title,
  icon: Icon,
  iconBg,
  iconCls,
  children,
  index = 0,
}: {
  label: string
  title: string
  icon: React.ElementType
  iconBg: string
  iconCls: string
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
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg} shadow-sm`}>
          <Icon size={15} className={iconCls} />
        </div>
        <div>
          <Eyebrow className="mb-0.5">{label}</Eyebrow>
          <p className="font-['Lora'] text-sm font-semibold text-stone-900 leading-snug">{title}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ─── Skeleton field ─── */
function SkeletonField() {
  return (
    <div className="flex flex-col gap-2">
      <Bone className="h-2.5 w-24" />
      <Bone className="h-10 w-full rounded-xl" />
    </div>
  )
}

/* ─── Skeleton section card ─── */
function SkeletonSectionCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm">
      <div className="h-0.5 w-full bg-stone-200" />
      <div className="flex items-center gap-3 border-b border-stone-200 bg-stone-50 px-5 py-4">
        <Bone className="h-9 w-9 rounded-lg shrink-0" />
        <div className="flex flex-col gap-2">
          <Bone className="h-2.5 w-20" />
          <Bone className="h-3.5 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 p-5 max-[580px]:grid-cols-1">
        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonField key={i} />)}
      </div>
    </div>
  )
}

/* ─── Input with icon wrapper ─── */
function InputIconWrap({ icon: Icon, iconColor, children }: { icon: React.ElementType; iconColor: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Icon size={13} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${iconColor}`} />
      {children}
    </div>
  )
}

/* ─── Media card ─── */
function MediaCard({
  avatarSrc, bannerSrc, initials, currentUser, avatarFile, bannerFile,
  avatarMarkedForRemoval, bannerMarkedForRemoval, canRemoveAvatar, canRemoveBanner,
  onAvatarChange, onBannerChange, onAvatarRemove, onBannerRemove, onAvatarRestore, onBannerRestore,
}: {
  avatarSrc: string | null; bannerSrc: string | null; initials: string
  currentUser: UserAccount; avatarFile: File | null; bannerFile: File | null
  avatarMarkedForRemoval: boolean; bannerMarkedForRemoval: boolean
  canRemoveAvatar: boolean; canRemoveBanner: boolean
  onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void
  onBannerChange: (e: ChangeEvent<HTMLInputElement>) => void
  onAvatarRemove: () => void; onBannerRemove: () => void
  onAvatarRestore: () => void; onBannerRestore: () => void
}) {
  const avatarWrapperRef = useRef<HTMLDivElement | null>(null)
  const [previewStyle, setPreviewStyle] = useState<CSSProperties | null>(null)
  const photoStatus = avatarMarkedForRemoval
    ? 'Foto será removida'
    : avatarFile?.name ?? (currentUser.avatarUrl ? 'Foto salva' : 'Sem foto')
  const bannerStatus = bannerMarkedForRemoval
    ? 'Capa será removida'
    : bannerFile?.name ?? (currentUser.bannerUrl ? 'Capa salva' : 'Sem capa')
  const showPreview = () => {
    const rect = avatarWrapperRef.current?.getBoundingClientRect()
    if (!rect) return
    const previewWidth = Math.min(360, window.innerWidth - 48)
    const left = Math.min(Math.max(24, rect.left), Math.max(24, window.innerWidth - previewWidth - 24))
    const previewHeight = 220
    const belowTop = rect.bottom + 14
    const top = belowTop + previewHeight > window.innerHeight
      ? Math.max(16, rect.top - previewHeight - 10)
      : belowTop
    setPreviewStyle({ left, top, width: previewWidth })
  }

  return (
    <section
      className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
      style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0 }}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      {/* Banner */}
      <div
        className={`relative h-36 overflow-hidden transition-opacity duration-300 ${bannerMarkedForRemoval ? 'opacity-60' : ''}`}
        style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 55%, #fae8ff 100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, #818cf8 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-indigo-200/40" style={{ filter: 'blur(24px)' }} />
        <div className="pointer-events-none absolute -right-4 bottom-0 h-32 w-32 rounded-full bg-purple-200/40" style={{ filter: 'blur(24px)' }} />

        {bannerSrc && (
          <img
            src={bannerSrc} alt="Banner"
            className={`h-full w-full object-cover transition-all duration-300 ${bannerMarkedForRemoval ? 'grayscale opacity-40' : ''}`}
          />
        )}
        {!bannerMarkedForRemoval && (
          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-stone-900/0 transition-all hover:bg-stone-900/15 group">
            <div className="flex flex-col items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md">
                <ImageIcon size={16} className="text-indigo-600" />
              </div>
              <span className="rounded-full bg-stone-900/60 px-3 py-1 text-[11px] font-semibold text-white uppercase tracking-wide backdrop-blur-sm font-['DM_Sans']">
                Alterar capa
              </span>
            </div>
            {bannerFile && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-semibold text-white uppercase tracking-wide shadow pointer-events-none font-['DM_Sans']">
                <CheckCircle2 size={10} /> Novo arquivo
              </span>
            )}
            <input type="file" accept={PROFILE_IMAGE_ACCEPT} className="sr-only" onChange={onBannerChange} />
          </label>
        )}
        {canRemoveBanner && !bannerMarkedForRemoval && (
          <button
            type="button"
            onClick={onBannerRemove}
            className="absolute right-2.5 top-2.5 z-20 grid h-6 w-6 place-items-center rounded-full border border-stone-300 bg-white/90 text-stone-500 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
            title="Remover capa"
          >
            <X size={11} />
          </button>
        )}
        {bannerMarkedForRemoval && (
          <>
            <div className="absolute inset-0 bg-rose-50/70" />
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-rose-300 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-600 shadow-sm pointer-events-none font-['DM_Sans']">
              <Trash2 size={10} /> Capa será removida
            </div>
            <button
              type="button"
              onClick={onBannerRestore}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 font-['DM_Sans']"
            >
              <RotateCcw size={11} /> Desfazer
            </button>
          </>
        )}
      </div>

      {/* Avatar + info */}
      <div className="relative flex flex-wrap items-start gap-4 px-6 pb-5 pt-4 sm:flex-nowrap">
        <div
          ref={avatarWrapperRef}
          className="group/avatar relative z-10 -mt-10 shrink-0"
          onMouseEnter={showPreview}
          onMouseLeave={() => setPreviewStyle(null)}
          onFocus={showPreview}
          onBlur={() => setPreviewStyle(null)}
        >
          <div
            className={`h-20 w-20 overflow-hidden rounded-xl border-[3px] border-white shadow-md transition-all duration-300 ${avatarMarkedForRemoval ? 'opacity-40 grayscale' : ''}`}
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5 60%, #4338ca)' }}
          >
            {avatarSrc
              ? <img src={avatarSrc} alt={currentUser.name} className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center font-['Lora'] text-xl font-bold text-white">{initials}</div>
            }
          </div>
          {!avatarMarkedForRemoval && (
            <label
              className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-indigo-600 border-2 border-white shadow-md transition hover:bg-indigo-700 active:scale-95"
            >
              <Camera size={12} className="text-white" />
              {avatarFile && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />}
              <input type="file" accept={PROFILE_IMAGE_ACCEPT} className="sr-only" onChange={onAvatarChange} />
            </label>
          )}
          {canRemoveAvatar && !avatarMarkedForRemoval && (
            <button
              type="button"
              onClick={onAvatarRemove}
              className="absolute -top-1.5 -right-1.5 z-20 grid h-5 w-5 place-items-center rounded-full border border-stone-300 bg-white text-stone-400 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500"
              title="Remover foto"
            >
              <X size={10} />
            </button>
          )}
          {previewStyle && typeof document !== 'undefined'
            ? createPortal(
              <AvatarHoverPreview
                name={currentUser.name} email={currentUser.email}
                avatarSrc={avatarSrc ?? undefined} bannerSrc={bannerSrc ?? undefined}
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

        <div className="min-w-0 flex-1 pt-1">
          <h3 className="font-['Lora'] text-xl font-bold leading-tight text-stone-900 [overflow-wrap:anywhere]">
            {currentUser.name}
          </h3>
          <p className="text-sm text-stone-500 truncate font-['DM_Sans'] mt-0.5">{currentUser.email}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span
              className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide font-['DM_Sans'] ${
                avatarMarkedForRemoval
                  ? 'border-rose-300 bg-rose-50 text-rose-600'
                  : avatarFile
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-stone-300 bg-stone-50 text-stone-500'
              }`}
              title={photoStatus}
            >
              {avatarMarkedForRemoval ? <Trash2 size={9} /> : <CheckCircle2 size={9} />}
              <span className="truncate">{photoStatus}</span>
            </span>
            <span
              className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide font-['DM_Sans'] ${
                bannerMarkedForRemoval
                  ? 'border-rose-300 bg-rose-50 text-rose-600'
                  : bannerFile
                  ? 'border-violet-300 bg-violet-50 text-violet-700'
                  : 'border-stone-300 bg-stone-50 text-stone-500'
              }`}
              title={bannerStatus}
            >
              {bannerMarkedForRemoval ? <Trash2 size={9} /> : <CheckCircle2 size={9} />}
              <span className="truncate">{bannerStatus}</span>
            </span>
          </div>
          {avatarMarkedForRemoval && (
            <button
              type="button"
              onClick={onAvatarRestore}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 font-['DM_Sans']"
            >
              <RotateCcw size={11} /> Desfazer remoção da foto
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════
   Main Component
══════════════════════════════════════ */
export default function SettingsView({ currentUser, profile, schools = [], assetVersion, onSave }: SettingsViewProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [draft, setDraft] = useState<ProfileFormDraft>({
    name: currentUser.name,
    email: currentUser.email,
    phone: formatPhone(currentUser.phone),
    birthDate: currentUser.birthDate ?? '',
    cpf: formatCpf(currentUser.cpf),
  })
  const [errors, setErrors] = useState<ProfileFormErrors>({})
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [removeAvatarPending, setRemoveAvatarPending] = useState(false)
  const [removeBannerPending, setRemoveBannerPending] = useState(false)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t) }, [])

  useEffect(() => {
    setDraft({
      name: currentUser.name,
      email: currentUser.email,
      phone: formatPhone(currentUser.phone),
      birthDate: currentUser.birthDate ?? '',
      cpf: formatCpf(currentUser.cpf),
    })
    setErrors({})
  }, [currentUser.birthDate, currentUser.cpf, currentUser.email, currentUser.name, currentUser.phone])

  useEffect(() => { return () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) } }, [avatarPreview])
  useEffect(() => { return () => { if (bannerPreview) URL.revokeObjectURL(bannerPreview) } }, [bannerPreview])
  useEffect(() => { setAvatarFile(null); setAvatarPreview(null); setRemoveAvatarPending(false) }, [assetVersion?.avatar, currentUser.avatarUrl, currentUser.id])
  useEffect(() => { setBannerFile(null); setBannerPreview(null); setRemoveBannerPending(false) }, [assetVersion?.banner, currentUser.bannerUrl, currentUser.id])

  const avatarSrc: string | null = removeAvatarPending ? null : avatarPreview ?? resolveApiAssetUrl(currentUser.avatarUrl, assetVersion?.avatar) ?? null
  const bannerSrc: string | null = removeBannerPending ? null : bannerPreview ?? resolveApiAssetUrl(currentUser.bannerUrl, assetVersion?.banner) ?? null
  const canRemoveAvatar = Boolean(currentUser.avatarUrl || avatarFile || removeAvatarPending)
  const canRemoveBanner = Boolean(currentUser.bannerUrl || bannerFile || removeBannerPending)
  const linkedSchoolName = getLinkedSchoolName(currentUser, profile, schools)
  const linkedSchoolHint = getLinkedSchoolHint(profile)
  const usernameValue = currentUser.login ?? currentUser.email

  const initials = currentUser.name
    .split(' ').filter(Boolean).slice(0, 2)
    .map((c) => c[0]?.toUpperCase() ?? '').join('')

  function updateDraftField<K extends keyof ProfileFormDraft>(field: K, value: ProfileFormDraft[K]) {
    setErrors((current) => ({ ...current, [field]: undefined }))
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    const validation = await validateProfileImageFile(file)
    if (!validation.ok) {
      setMediaError(validation.message ?? 'Imagem de perfil invalida.')
      return
    }
    setMediaError(null)
    setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file))
    setRemoveAvatarPending(false)
  }
  async function handleBannerChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    const validation = await validateProfileImageFile(file)
    if (!validation.ok) {
      setMediaError(validation.message ?? 'Imagem de capa invalida.')
      return
    }
    setMediaError(null)
    setBannerFile(file); setBannerPreview(URL.createObjectURL(file))
    setRemoveBannerPending(false)
  }
  function handleAvatarRemove() {
    setAvatarFile(null); setAvatarPreview(null)
    setRemoveAvatarPending(Boolean(currentUser.avatarUrl))
  }
  function handleBannerRemove() {
    setBannerFile(null); setBannerPreview(null)
    setRemoveBannerPending(Boolean(currentUser.bannerUrl))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = profileSchema.safeParse(draft)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        name: fieldErrors.name?.[0], email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0], birthDate: fieldErrors.birthDate?.[0],
        cpf: fieldErrors.cpf?.[0],
      })
      return
    }
    setErrors({}); setSaving(true)
    const parsed = result.data
    const visualAction = removeAvatarPending || removeBannerPending
      ? { removeAvatar: removeAvatarPending, removeBanner: removeBannerPending }
      : undefined
    try {
      await onSave(
        {
          name: parsed.name.trim(),
          email: parsed.email.trim().toLowerCase(),
          phone: onlyDigits(parsed.phone),
          birthDate: parsed.birthDate.trim(),
          cpf: onlyDigits(parsed.cpf),
        },
        removeAvatarPending ? null : avatarFile,
        removeBannerPending ? null : bannerFile,
        visualAction,
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = !!(
    avatarFile || bannerFile || removeAvatarPending || removeBannerPending ||
    draft.name !== currentUser.name ||
    draft.email !== currentUser.email ||
    onlyDigits(draft.phone) !== (currentUser.phone ?? '') ||
    draft.birthDate !== (currentUser.birthDate ?? '') ||
    onlyDigits(draft.cpf) !== (currentUser.cpf ?? '')
  )

  /* ─── Input class helpers ─── */
  const inputCls = "min-h-10 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 font-['DM_Sans'] disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
  const inputIconCls = "min-h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3.5 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 hover:border-stone-400 font-['DM_Sans'] disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
  const inputError = "border-rose-400 focus:border-rose-400 focus:ring-rose-100"

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        @keyframes shimmer { to { transform: translateX(200%) } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes checkIn {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .check-in { animation: checkIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .spinner {
          display: inline-block; width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          animation: spin 0.7s linear infinite; flex-shrink: 0;
        }
      `}</style>

      <div className="min-h-screen bg-stone-50 font-['DM_Sans',system-ui,sans-serif] grid gap-4 px-[clamp(12px,2.5vw,40px)] py-6 pb-14 text-stone-900">

        {/* ── Header ── */}
        <section
          className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
          style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0 }}
        >
          <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow-sm">
                <UserRound size={16} className="text-white" />
              </div>
              <div>
                <Eyebrow className="mb-0.5">Conta</Eyebrow>
                <h1 className="font-['Lora'] text-base font-bold text-stone-900 leading-tight">
                  Configurações de perfil
                </h1>
              </div>
            </div>
            {hasChanges && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 font-['DM_Sans']">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Alterações pendentes
              </span>
            )}
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4">
            {/* Media card skeleton */}
            <div className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm">
              <div className="h-0.5 w-full bg-stone-200" />
              <Bone className="h-36 w-full rounded-none" />
              <div className="flex items-start gap-4 px-6 pb-5 pt-4">
                <Bone className="-mt-10 h-20 w-20 shrink-0 rounded-xl" />
                <div className="flex w-full flex-col gap-2 pt-1">
                  <Bone className="h-5 w-48" />
                  <Bone className="h-3.5 w-32" />
                  <div className="flex gap-2 mt-1">
                    <Bone className="h-5 w-20 rounded-full" />
                    <Bone className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <SkeletonSectionCard />
            <div className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm">
              <div className="h-0.5 w-full bg-stone-200" />
              <div className="flex items-center gap-3 border-b border-stone-200 bg-stone-50 px-5 py-4">
                <Bone className="h-9 w-9 rounded-lg shrink-0" />
                <div className="flex flex-col gap-2">
                  <Bone className="h-2.5 w-20" />
                  <Bone className="h-3.5 w-32" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-5"><SkeletonField /></div>
            </div>
          </div>
        ) : (
          <>
            <MediaCard
              avatarSrc={avatarSrc} bannerSrc={bannerSrc} initials={initials}
              currentUser={currentUser} avatarFile={avatarFile} bannerFile={bannerFile}
              avatarMarkedForRemoval={removeAvatarPending} bannerMarkedForRemoval={removeBannerPending}
              canRemoveAvatar={canRemoveAvatar} canRemoveBanner={canRemoveBanner}
              onAvatarChange={handleAvatarChange} onBannerChange={handleBannerChange}
              onAvatarRemove={handleAvatarRemove} onBannerRemove={handleBannerRemove}
              onAvatarRestore={() => setRemoveAvatarPending(false)}
              onBannerRestore={() => setRemoveBannerPending(false)}
            />
            {mediaError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {mediaError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-4" noValidate>

              {/* ── Dados pessoais ── */}
              <SectionCard
                label="Dados pessoais" title="Identificação"
                icon={UserRound} iconBg="bg-indigo-100" iconCls="text-indigo-600"
                index={0}
              >
                <div className="grid grid-cols-2 gap-x-5 gap-y-4 max-[580px]:grid-cols-1">

                  <Field label="Nome completo" icon={UserRound} iconColor="text-indigo-400" error={errors.name} hint="Mínimo 3 caracteres, máximo 120.">
                    <InputIconWrap icon={UserRound} iconColor="text-stone-400">
                      <input
                        className={`${inputIconCls} ${errors.name ? inputError : ''}`}
                        value={draft.name}
                        onChange={(e) => updateDraftField('name', e.target.value)}
                        placeholder="Seu nome completo"
                        aria-invalid={Boolean(errors.name) || undefined}
                        required
                      />
                    </InputIconWrap>
                  </Field>

                  <Field label="Nome de usuário" icon={AtSign} iconColor="text-violet-400" hint="Identificador usado para acesso.">
                    <InputIconWrap icon={AtSign} iconColor="text-stone-300">
                      <input className={inputIconCls} value={usernameValue} disabled readOnly />
                    </InputIconWrap>
                  </Field>

                  <Field label="E-mail" icon={Mail} iconColor="text-sky-500" error={errors.email} hint="Usado para acesso e notificações.">
                    <InputIconWrap icon={Mail} iconColor="text-stone-400">
                      <input
                        className={`${inputIconCls} ${errors.email ? inputError : ''}`}
                        type="email"
                        value={draft.email}
                        onChange={(e) => updateDraftField('email', e.target.value)}
                        placeholder="Digite seu e-mail"
                        aria-invalid={Boolean(errors.email) || undefined}
                        required
                      />
                    </InputIconWrap>
                  </Field>

                  <Field label="Escola vinculada" icon={SchoolIcon} iconColor="text-emerald-500" hint={linkedSchoolHint}>
                    <InputIconWrap icon={SchoolIcon} iconColor="text-stone-300">
                      <input className={inputIconCls} value={linkedSchoolName} disabled readOnly />
                    </InputIconWrap>
                  </Field>

                  <Field label="Telefone" icon={Phone} iconColor="text-amber-500" error={errors.phone} hint="Com DDD.">
                    <InputIconWrap icon={Phone} iconColor="text-stone-400">
                      <input
                        className={`${inputIconCls} ${errors.phone ? inputError : ''}`}
                        inputMode="tel"
                        maxLength={15}
                        value={draft.phone}
                        onChange={(e) => updateDraftField('phone', formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        aria-invalid={Boolean(errors.phone) || undefined}
                      />
                    </InputIconWrap>
                  </Field>

                  <Field label="Data de nascimento" icon={Calendar} iconColor="text-sky-600" error={errors.birthDate} hint="Opcional: selecione sua data de nascimento.">
                    <DateInput
                      className={`${inputCls} ${errors.birthDate ? inputError : ''}`}
                      icon={<Calendar size={13} className="text-stone-400" />}
                      value={draft.birthDate}
                      onChange={(e) => updateDraftField('birthDate', e.target.value)}
                    />
                  </Field>

                </div>
              </SectionCard>

              {/* ── Documentos ── */}
              <SectionCard
                label="Documentos" title="Dados fiscais"
                icon={ShieldCheck} iconBg="bg-violet-100" iconCls="text-violet-600"
                index={1}
              >
                <div className="grid grid-cols-1 gap-4 max-w-sm">

                  <Field label="CPF" icon={CreditCard} iconColor="text-violet-500" error={errors.cpf} hint="Somente números ou formato 000.000.000-00.">
                    <InputIconWrap icon={CreditCard} iconColor="text-stone-400">
                      <input
                        className={`${inputIconCls} ${errors.cpf ? inputError : ''}`}
                        inputMode="numeric"
                        maxLength={14}
                        value={draft.cpf}
                        onChange={(e) => updateDraftField('cpf', formatCpf(e.target.value))}
                        placeholder="000.000.000-00"
                        aria-invalid={Boolean(errors.cpf) || undefined}
                      />
                    </InputIconWrap>
                  </Field>

                  {draft.cpf && onlyDigits(draft.cpf).length === 11 && (
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] font-semibold font-['DM_Sans'] ${
                        isValidCpf(draft.cpf)
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-rose-300 bg-rose-50 text-rose-600'
                      }`}
                      style={{ animation: 'fadeIn 0.2s ease-out' }}
                    >
                      {isValidCpf(draft.cpf) ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                      {isValidCpf(draft.cpf) ? 'CPF válido' : 'CPF inválido'}
                    </div>
                  )}

                </div>
              </SectionCard>

              {/* ── Footer / Save bar ── */}
              <section
                className="overflow-hidden rounded-xl border border-stone-300 bg-white shadow-sm"
                style={{ animation: 'fadeSlideUp 0.45s ease-out forwards', opacity: 0, animationDelay: '160ms' }}
              >
                <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

                {/* Sync row */}
                <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 bg-stone-50 px-5 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-600">
                    <Wifi size={13} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-emerald-700 leading-tight">Rede sincronizada</p>
                    <p className="text-[11px] text-stone-400 leading-tight">Dados ativos pela API escolar.</p>
                  </div>
                  <div className="text-[13px] font-medium font-['DM_Sans']">
                    {saved ? (
                      <span className="check-in flex items-center gap-1.5 font-semibold text-emerald-600">
                        <CheckCircle2 size={14} />Perfil salvo com sucesso!
                      </span>
                    ) : hasChanges ? (
                      <span className="flex items-center gap-1.5 font-semibold text-amber-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                        Alterações não salvas.
                      </span>
                    ) : (
                      <span className="text-stone-400">Nenhuma alteração pendente.</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5 px-5 py-4">
                  {hasChanges && !saving && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({
                          name: currentUser.name, email: currentUser.email,
                          phone: formatPhone(currentUser.phone),
                          birthDate: currentUser.birthDate ?? '', cpf: formatCpf(currentUser.cpf),
                        })
                        setErrors({})
                        setMediaError(null)
                        setAvatarFile(null); setAvatarPreview(null)
                        setBannerFile(null); setBannerPreview(null)
                        setRemoveAvatarPending(false); setRemoveBannerPending(false)
                      }}
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 text-[13px] font-semibold text-stone-600 transition hover:border-stone-400 hover:text-stone-800 active:scale-95 font-['DM_Sans']"
                    >
                      <X size={14} /> Descartar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving || !hasChanges}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-indigo-500 bg-indigo-600 px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 font-['DM_Sans']"
                  >
                    {saving
                      ? <><span className="spinner" />Salvando…</>
                      : saved
                      ? <><CheckCircle2 size={14} />Salvo!</>
                      : <><Save size={14} />Salvar perfil</>}
                  </button>
                </div>
              </section>

            </form>
          </>
        )}
      </div>
    </>
  )
}
