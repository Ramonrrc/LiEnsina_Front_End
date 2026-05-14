import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import {
  Save, UserRound, Camera, ImageIcon, Mail, Phone, Calendar,
  CreditCard, ShieldCheck, CheckCircle2, AlertCircle, X, Trash2, RotateCcw,
  AtSign, School as SchoolIcon,
} from 'lucide-react'
import { z } from 'zod'

import { resolveApiAssetUrl } from '../api'
import { AvatarHoverPreview } from '../components/profile/AvatarSign'
import DateInput from '../components/ui/date-input'
import { FieldMessage, fieldStateClass } from '../components/ui/form-field'
import { PageTitleBar } from '../components/ui/page-title-bar'
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
  if (profile === 'ADMIN') return 'Todas as escolas'

  const linkedSchool = currentUser.schoolId
    ? schools.find((school) => school.id === currentUser.schoolId)
    : null

  if (linkedSchool) return linkedSchool.name
  if (schools.length === 1) return schools[0].name
  return 'Escola nao vinculada'
}

function getLinkedSchoolHint(profile: RoleCode) {
  if (profile === 'ADMIN') return 'Administradores possuem acesso a todas as escolas.'
  return 'Campo definido pelo vinculo do usuario.'
}

/* ── Skeleton field ── */
function SkeletonField() {
  return <div className="sv-shimmer h-[68px] rounded-xl" />
}

/* ── Field wrapper ── */
function Field({
  label, icon: Icon, error, children, hint,
}: {
  label: string
  icon?: React.ElementType
  error?: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
        {Icon && <Icon size={11} className="text-slate-400" />}
        {label}
      </span>
      {children}
      <FieldMessage hint={hint} error={error} />
    </label>
  )
}

const inputCls =
  'min-h-11 w-full min-w-0 rounded-sm border border-slate-400 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100'

const inputIconCls =
  'min-h-11 w-full min-w-0 rounded-sm border border-slate-400 bg-slate-50 pl-9 pr-3.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100'

/* ── Section card ── */
function SectionCard({
  label, title, icon: Icon, iconColor, children,
}: {
  label: string
  title: string
  icon: React.ElementType
  iconColor: string
  children: React.ReactNode
}) {
  return (
    <section className="sv-section rounded-2xl border border-slate-400 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-400 bg-slate-50 px-5 py-4">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconColor}`}>
          <Icon size={15} className="text-white" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">{label}</p>
          <p className="text-sm font-bold text-slate-800 leading-none mt-0.5">{title}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ── Media card (avatar + banner) ── */
function MediaCard({
  avatarSrc, bannerSrc, initials, currentUser, avatarFile, bannerFile,
  avatarMarkedForRemoval, bannerMarkedForRemoval, canRemoveAvatar, canRemoveBanner,
  onAvatarChange, onBannerChange, onAvatarRemove, onBannerRemove, onAvatarRestore, onBannerRestore,
}: {
  avatarSrc: string | null
  bannerSrc: string | null
  initials: string
  currentUser: UserAccount
  avatarFile: File | null
  bannerFile: File | null
  avatarMarkedForRemoval: boolean
  bannerMarkedForRemoval: boolean
  canRemoveAvatar: boolean
  canRemoveBanner: boolean
  onAvatarChange: (e: ChangeEvent<HTMLInputElement>) => void
  onBannerChange: (e: ChangeEvent<HTMLInputElement>) => void
  onAvatarRemove: () => void
  onBannerRemove: () => void
  onAvatarRestore: () => void
  onBannerRestore: () => void
}) {
  const photoStatus = avatarMarkedForRemoval
    ? 'Foto será removida'
    : avatarFile?.name ?? (currentUser.avatarUrl ? 'Foto salva' : 'Sem foto')
  const bannerStatus = bannerMarkedForRemoval
    ? 'Capa será removida'
    : bannerFile?.name ?? (currentUser.bannerUrl ? 'Capa salva' : 'Sem capa')

  return (
    <section className="sv-section relative z-[200] overflow-visible rounded-2xl border border-slate-400 bg-white shadow-sm">

      {/* ── Banner ── */}
      <div className={`relative h-36 overflow-hidden rounded-t-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 sv-banner-wrap ${bannerMarkedForRemoval ? 'sv-removing' : ''}`}>

        {/* Imagem/gradiente do banner */}
        {bannerSrc && (
          <img
            src={bannerSrc}
            alt="Banner"
            className={`h-full w-full object-cover transition-all duration-300 ${bannerMarkedForRemoval ? 'grayscale opacity-30' : ''}`}
          />
        )}

        {/* Overlay de hover: só para trocar */}
        {!bannerMarkedForRemoval && (
          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 transition-all hover:bg-black/30 group">
            <div className="flex flex-col items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg">
                <ImageIcon size={16} className="text-slate-700" />
              </div>
              <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                Alterar capa
              </span>
            </div>
            {bannerFile && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white uppercase tracking-widest shadow pointer-events-none">
                <CheckCircle2 size={10} /> Novo arquivo
              </span>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={onBannerChange} />
          </label>
        )}

        {/* X de remover — fixo no canto superior direito, sempre visível quando há capa */}
        {canRemoveBanner && !bannerMarkedForRemoval && (
          <button
            type="button"
            onClick={onBannerRemove}
            className="sv-remove-x absolute right-2.5 top-2.5 z-20"
            title="Remover capa"
          >
            <X size={12} />
          </button>
        )}

        {/* Estado de remoção pendente: tint + badge + desfazer */}
        {bannerMarkedForRemoval && (
          <>
            <div className="absolute inset-0 bg-red-900/20 transition-all duration-200" />
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700 shadow-sm pointer-events-none">
              <Trash2 size={10} />
              Capa será removida
            </div>
            <button
              type="button"
              onClick={onBannerRestore}
              className="sv-undo-btn absolute bottom-3 right-3"
            >
              <RotateCcw size={12} />
              Desfazer
            </button>
          </>
        )}
      </div>

      {/* ── Avatar + info row ── */}
      <div className="relative flex flex-wrap items-start gap-4 px-6 pb-5 pt-4 sm:flex-nowrap">

        {/* Avatar com overlay de ações */}
        <div className="group/avatar relative -mt-12 shrink-0">
          <div className={`sv-avatar-frame h-20 w-20 overflow-hidden rounded-2xl border-3 border-white bg-gradient-to-br from-indigo-400 to-violet-500 shadow-lg transition-all duration-300 ${avatarMarkedForRemoval ? 'sv-avatar-removing' : ''}`}>
            {avatarSrc
              ? <img src={avatarSrc} alt={currentUser.name} className={`h-full w-full object-cover transition-all duration-300 ${avatarMarkedForRemoval ? 'grayscale opacity-30' : ''}`} />
              : <div className={`flex h-full w-full items-center justify-center font-['Sora',system-ui,sans-serif] text-xl font-black text-white transition-all duration-300 ${avatarMarkedForRemoval ? 'opacity-30' : ''}`}>{initials}</div>
            }
          </div>

          {/* Botão de câmera (trocar foto) — original */}
          {!avatarMarkedForRemoval && (
            <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-indigo-600 shadow-md transition-all hover:bg-indigo-700">
              <Camera size={12} className="text-white" />
              {avatarFile && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
              )}
              <input type="file" accept="image/*" className="sr-only" onChange={onAvatarChange} />
            </label>
          )}

          {/* X de remover — fixo no canto superior direito */}
          {canRemoveAvatar && !avatarMarkedForRemoval && (
            <button
              type="button"
              onClick={onAvatarRemove}
              className="sv-remove-x absolute z-20"
              style={{ top: '-6px', right: '-6px' }}
              title="Remover foto"
            >
              <X size={10} />
            </button>
          )}

          {/* Borda tracejada vermelha quando marcado para remoção */}
          {avatarMarkedForRemoval && (
            <div className="absolute inset-0 rounded-2xl pointer-events-none sv-dashed-danger-ring" style={{ border: '3px solid white' }} />
          )}

          <AvatarHoverPreview
            name={currentUser.name}
            email={currentUser.email}
            avatarSrc={avatarSrc ?? undefined}
            bannerSrc={bannerSrc ?? undefined}
            initials={initials}
            className="left-0 top-[calc(100%+14px)] max-[640px]:left-1/2 max-[640px]:-translate-x-1/2"
          />
        </div>

        {/* Info do usuário */}
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="font-['Sora',system-ui,sans-serif] text-xl font-black leading-tight text-slate-950 [overflow-wrap:anywhere]">
            {currentUser.name}
          </h3>
          <p className="text-sm text-slate-500 truncate">{currentUser.email}</p>

          {/* Status badges */}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
              avatarMarkedForRemoval
                ? 'border-red-300 bg-red-50 text-red-700'
                : avatarFile
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`} title={photoStatus}>
              {avatarMarkedForRemoval ? <Trash2 size={9} /> : <CheckCircle2 size={9} />}
              <span className="truncate">{photoStatus}</span>
            </span>
            <span className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
              bannerMarkedForRemoval
                ? 'border-red-300 bg-red-50 text-red-700'
                : bannerFile
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`} title={bannerStatus}>
              {bannerMarkedForRemoval ? <Trash2 size={9} /> : <CheckCircle2 size={9} />}
              <span className="truncate">{bannerStatus}</span>
            </span>
          </div>

          {/* Botão Desfazer remoção do avatar — aparece abaixo dos badges */}
          {avatarMarkedForRemoval && (
            <button
              type="button"
              onClick={onAvatarRestore}
              className="sv-undo-btn mt-2"
            >
              <RotateCcw size={12} />
              Desfazer remoção da foto
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
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => c[0]?.toUpperCase() ?? '')
    .join('')

  function updateDraftField<K extends keyof ProfileFormDraft>(field: K, value: ProfileFormDraft[K]) {
    setErrors((current) => ({ ...current, [field]: undefined }))
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setRemoveAvatarPending(false)
    event.target.value = ''
  }

  function handleBannerChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
    setRemoveBannerPending(false)
    event.target.value = ''
  }

  function handleAvatarRemove() {
    setAvatarFile(null)
    setAvatarPreview(null)
    setRemoveAvatarPending(Boolean(currentUser.avatarUrl))
  }

  function handleBannerRemove() {
    setBannerFile(null)
    setBannerPreview(null)
    setRemoveBannerPending(Boolean(currentUser.bannerUrl))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = profileSchema.safeParse(draft)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        birthDate: fieldErrors.birthDate?.[0],
        cpf: fieldErrors.cpf?.[0],
      })
      return
    }
    setErrors({})
    setSaving(true)
    const parsed = result.data
    const visualAction = removeAvatarPending || removeBannerPending
      ? { removeAvatar: removeAvatarPending, removeBanner: removeBannerPending }
      : undefined
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
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const hasChanges = !!(
    avatarFile ||
    bannerFile ||
    removeAvatarPending ||
    removeBannerPending ||
    draft.name !== currentUser.name ||
    draft.email !== currentUser.email ||
    onlyDigits(draft.phone) !== (currentUser.phone ?? '') ||
    draft.birthDate !== (currentUser.birthDate ?? '') ||
    onlyDigits(draft.cpf) !== (currentUser.cpf ?? '')
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        @keyframes sv-fade-up {
          from { opacity: 0; transform: translateY(14px); }
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
        @keyframes sv-check-in {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes sv-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes sv-dash-march {
          to { stroke-dashoffset: -20; }
        }

        .sv-page {
          animation: sv-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .sv-section {
          animation: sv-fade-up 0.42s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sv-section:nth-child(1) { animation-delay: 0s; }
        .sv-section:nth-child(2) { animation-delay: 0.07s; }
        .sv-section:nth-child(3) { animation-delay: 0.13s; }
        .sv-section:nth-child(4) { animation-delay: 0.18s; }
        .sv-section:nth-child(5) { animation-delay: 0.22s; }

        .sv-shimmer {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 600px 100%;
          animation: sv-shimmer 1.5s ease-in-out infinite;
        }
        .sv-skeleton-card { animation: sv-fade-in 0.25s ease both; }

        .sv-save-btn {
          box-shadow: 0 1px 2px rgba(79,70,229,0.25);
          transition: all 0.18s cubic-bezier(0.22,1,0.36,1);
        }
        .sv-save-btn:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(79,70,229,0.4);
          transform: translateY(-1px);
        }
        .sv-save-btn:active:not(:disabled) { transform: translateY(0); }

        .sv-check { animation: sv-check-in 0.35s cubic-bezier(0.22,1,0.36,1) both; }

        .sv-spinner {
          display: inline-block;
          width: 15px; height: 15px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          animation: sv-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        .sv-input-wrap { position: relative; }
        .sv-input-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: #94a3b8; transition: color 0.15s;
        }
        .sv-input-wrap:focus-within .sv-input-icon { color: #4f46e5; }

        /* ── Botão X de remover (foto e banner) ── */
        .sv-remove-x {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(30, 10, 10, 0.65);
          color: #fff;
          border: 1.5px solid rgba(255,255,255,0.7);
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          backdrop-filter: blur(4px);
          padding: 0;
          line-height: 1;
        }
        .sv-remove-x:hover {
          background: #dc2626;
          border-color: #fff;
          transform: scale(1.12);
        }
        .sv-remove-x > svg {
          display: block;
          flex-shrink: 0;
        }

        /* ── Undo button (shared) ── */
        .sv-undo-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fef3c7;
          color: #92400e;
          border: 1.5px solid #fcd34d;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          animation: sv-check-in 0.3s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sv-undo-btn:hover {
          background: #fde68a;
          transform: translateY(-1px);
        }
        .sv-undo-btn:active { transform: translateY(0); }

        /* ── Avatar group hover fix ── */
        .group\/avatar:hover > div[class*="absolute"] {
          opacity: 1 !important;
          background: rgba(0,0,0,0.5) !important;
        }
      `}</style>

      <div className="sv-page grid min-h-screen gap-4 bg-slate-50 px-[clamp(12px,2.5vw,40px)] py-6 pb-12 text-slate-900">

        {/* ═══ HEADER BAR ═══ */}
        <PageTitleBar
          className="sv-section"
          label="Conta"
          title="Configurações de perfil"
          icon={<UserRound />}
          actions={hasChanges && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Alterações pendentes
            </span>
          )}
        />

        {loading ? (
          <>
            {/* Skeleton — media card */}
            <div className="sv-skeleton-card overflow-hidden rounded-2xl border border-slate-400">
              <div className="sv-shimmer h-36 w-full" />
              <div className="flex items-start gap-4 px-6 pb-5 pt-4">
                <div className="sv-shimmer -mt-12 h-20 w-20 shrink-0 rounded-2xl" style={{ border: '4px solid white' }} />
                <div className="flex w-full flex-col gap-2 pt-1">
                  <div className="sv-shimmer h-5 w-48 rounded" />
                  <div className="sv-shimmer h-3.5 w-32 rounded" />
                </div>
              </div>
            </div>

            {/* Skeleton — form card */}
            <div className="sv-skeleton-card rounded-2xl border border-slate-400 bg-white overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-400 bg-slate-50 px-5 py-4">
                <div className="sv-shimmer h-8 w-8 rounded-lg" />
                <div className="flex flex-col gap-1.5">
                  <div className="sv-shimmer h-2.5 w-24 rounded" />
                  <div className="sv-shimmer h-3.5 w-36 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 max-[580px]:grid-cols-1">
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonField key={i} />)}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ═══ MEDIA CARD ═══ */}
            <MediaCard
              avatarSrc={avatarSrc}
              bannerSrc={bannerSrc}
              initials={initials}
              currentUser={currentUser}
              avatarFile={avatarFile}
              bannerFile={bannerFile}
              avatarMarkedForRemoval={removeAvatarPending}
              bannerMarkedForRemoval={removeBannerPending}
              canRemoveAvatar={canRemoveAvatar}
              canRemoveBanner={canRemoveBanner}
              onAvatarChange={handleAvatarChange}
              onBannerChange={handleBannerChange}
              onAvatarRemove={handleAvatarRemove}
              onBannerRemove={handleBannerRemove}
              onAvatarRestore={() => setRemoveAvatarPending(false)}
              onBannerRestore={() => setRemoveBannerPending(false)}
            />

            <form onSubmit={handleSubmit} className="relative z-0 grid gap-4" noValidate>

              {/* ─ Dados pessoais ─ */}
              <SectionCard label="Dados pessoais" title="Identificação" icon={UserRound} iconColor="bg-indigo-600">
                <div className="grid grid-cols-2 gap-3.5 max-[580px]:grid-cols-1">

                  <div>
                    <Field label="Nome completo" icon={UserRound} error={errors.name} hint="Mínimo 3 caracteres, máximo 120.">
                      <input
                        className={`${inputCls} ${fieldStateClass(errors.name)}`}
                        value={draft.name}
                        onChange={(e) => updateDraftField('name', e.target.value)}
                        placeholder="Seu nome completo"
                        aria-invalid={Boolean(errors.name) || undefined}
                        required
                      />
                    </Field>
                  </div>

                  <div>
                    <Field label="Nome de usuário" icon={AtSign} hint="Identificador usado para acesso.">
                      <div className="sv-input-wrap">
                        <input
                          className={`${inputIconCls} cursor-not-allowed border-slate-300 bg-slate-100 text-slate-600`}
                          value={usernameValue}
                          disabled
                          readOnly
                        />
                        <AtSign size={13} className="sv-input-icon" />
                      </div>
                    </Field>
                  </div>

                  <div>
                    <Field label="E-mail" icon={Mail} error={errors.email} hint="Digite um e-mail válido para acesso e notificações.">
                      <div className="sv-input-wrap">
                        <input
                          className={`${inputIconCls} ${fieldStateClass(errors.email)}`}
                          type="email"
                          value={draft.email}
                          onChange={(e) => updateDraftField('email', e.target.value)}
                          placeholder="Digite seu e-mail"
                          aria-invalid={Boolean(errors.email) || undefined}
                          required
                        />
                        <Mail size={13} className="sv-input-icon" />
                      </div>
                    </Field>
                  </div>

                  <div>
                    <Field label="Escola vinculada" icon={SchoolIcon} hint={linkedSchoolHint}>
                      <div className="sv-input-wrap">
                        <input
                          className={`${inputIconCls} cursor-not-allowed border-slate-300 bg-slate-100 text-slate-600`}
                          value={linkedSchoolName}
                          disabled
                          readOnly
                        />
                        <SchoolIcon size={13} className="sv-input-icon" />
                      </div>
                    </Field>
                  </div>

                  <Field label="Telefone" icon={Phone} error={errors.phone} hint="Com DDD.">
                    <div className="sv-input-wrap">
                      <input
                        className={`${inputIconCls} ${fieldStateClass(errors.phone)}`}
                        inputMode="tel"
                        maxLength={15}
                        value={draft.phone}
                        onChange={(e) => updateDraftField('phone', formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        aria-invalid={Boolean(errors.phone) || undefined}
                      />
                      <Phone size={13} className="sv-input-icon" />
                    </div>
                  </Field>

                  <Field label="Data de nascimento" icon={Calendar} error={errors.birthDate} hint="Opcional: selecione sua data de nascimento.">
                    <DateInput
                      className={`${inputCls} ${fieldStateClass(errors.birthDate)}`}
                      value={draft.birthDate}
                      onChange={(e) => updateDraftField('birthDate', e.target.value)}
                    />
                  </Field>

                </div>
              </SectionCard>

              {/* ─ Documentos ─ */}
              <SectionCard label="Documentos" title="Dados fiscais" icon={ShieldCheck} iconColor="bg-violet-600">
                <div className="grid grid-cols-1 gap-3.5 max-[580px]:grid-cols-1">

                  <div className="flex flex-col gap-2">
                    <Field label="CPF" icon={CreditCard} error={errors.cpf} hint="Somente números ou formato 000.000.000-00.">
                      <div className="sv-input-wrap">
                        <input
                          className={`${inputIconCls} ${fieldStateClass(errors.cpf)}`}
                          inputMode="numeric"
                          maxLength={14}
                          value={draft.cpf}
                          onChange={(e) => updateDraftField('cpf', formatCpf(e.target.value))}
                          placeholder="000.000.000-00"
                          aria-invalid={Boolean(errors.cpf) || undefined}
                        />
                        <CreditCard size={13} className="sv-input-icon" />
                      </div>
                    </Field>

                    {draft.cpf && onlyDigits(draft.cpf).length === 11 && (
                      <div className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 ${
                        isValidCpf(draft.cpf)
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-red-300 bg-red-50 text-red-700'
                      }`}>
                        {isValidCpf(draft.cpf)
                          ? <CheckCircle2 size={13} className="shrink-0" />
                          : <AlertCircle size={13} className="shrink-0" />}
                        <span className="text-[11px] font-black uppercase tracking-widest">
                          {isValidCpf(draft.cpf) ? 'CPF válido' : 'CPF inválido'}
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              </SectionCard>

              {/* ─ Footer ─ */}
              <div className="sv-section flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-400 bg-white px-5 py-4 shadow-sm">
                <div className="text-xs font-medium">
                  {saved
                    ? <span className="sv-check flex items-center gap-1.5 font-bold text-emerald-600"><CheckCircle2 size={14} />Perfil salvo com sucesso!</span>
                    : hasChanges
                    ? <span className="text-amber-600 font-semibold">Você tem alterações não salvas.</span>
                    : <span className="text-slate-400">Nenhuma alteração pendente.</span>}
                </div>

                <div className="flex items-center gap-2.5">
                  {hasChanges && !saving && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({
                          name: currentUser.name,
                          email: currentUser.email,
                          phone: formatPhone(currentUser.phone),
                          birthDate: currentUser.birthDate ?? '',
                          cpf: formatCpf(currentUser.cpf),
                        })
                        setErrors({})
                        setAvatarFile(null)
                        setAvatarPreview(null)
                        setBannerFile(null)
                        setBannerPreview(null)
                        setRemoveAvatarPending(false)
                        setRemoveBannerPending(false)
                      }}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-sm border border-slate-400 bg-white px-4 text-[13px] font-bold text-slate-600 transition-all hover:border-slate-500 hover:bg-slate-50"
                    >
                      <X size={14} />
                      Descartar
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={saving || !hasChanges}
                    className="sv-save-btn inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-indigo-600 px-5 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving
                      ? <><span className="sv-spinner" />Salvando…</>
                      : saved
                      ? <><CheckCircle2 size={15} />Salvo!</>
                      : <><Save size={15} />Salvar perfil</>}
                  </button>
                </div>
              </div>

            </form>
          </>
        )}
      </div>
    </>
  )
}
