import type { CSSProperties, ChangeEvent } from 'react'
import { Camera, CheckCircle2, ImageIcon, Mail, Phone, UserRound } from 'lucide-react'

import type { UserAccount } from '../../types'

interface AvatarSignProps {
  currentUser: UserAccount
  avatarSrc?: string
  bannerSrc?: string
  initials: string
  avatarFile: File | null
  bannerFile: File | null
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBannerChange: (event: ChangeEvent<HTMLInputElement>) => void
}

function BannerImage({ src, alt }: { src?: string; alt: string }) {
  if (src) {
    return <img className="h-full w-full object-cover" src={src} alt={alt} draggable={false} />
  }

  return (
    <div
      className="h-full w-full"
      style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 48%, #0284c7 100%)' }}
    />
  )
}

function AvatarImage({
  src,
  initials,
  name,
  size = 'base',
}: {
  src?: string
  initials: string
  name: string
  size?: 'base' | 'preview'
}) {
  const iconSize = size === 'preview' ? 24 : 34
  const textSize = size === 'preview' ? 'text-lg' : 'text-2xl'

  if (src) {
    return <img className="h-full w-full object-cover" src={src} alt={name} draggable={false} />
  }

  return (
    <span className={`grid h-full w-full place-items-center bg-indigo-600 font-black text-white ${textSize}`}>
      {initials || <UserRound size={iconSize} />}
    </span>
  )
}

export function AvatarHoverPreview({
  name,
  email,
  avatarSrc,
  bannerSrc,
  initials,
  className = 'left-0 top-[calc(100%+14px)] max-[640px]:left-1/2 max-[640px]:-translate-x-1/2',
  position = 'absolute',
  style,
  visible,
}: {
  name: string
  email: string
  avatarSrc?: string
  bannerSrc?: string
  initials: string
  className?: string
  position?: 'absolute' | 'fixed'
  style?: CSSProperties
  visible?: boolean
}) {
  const visibilityClass = visible === undefined
    ? 'opacity-0 group-hover/avatar:translate-y-0 group-hover/avatar:opacity-100 group-focus-within/avatar:translate-y-0 group-focus-within/avatar:opacity-100'
    : visible
      ? 'translate-y-0 opacity-100'
      : 'translate-y-1 opacity-0'

  return (
    <div
      style={style}
      className={`pointer-events-none ${position} z-[1200] w-[min(360px,calc(100vw-48px))] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl ring-1 ring-slate-950/5 transition duration-150 ${visibilityClass} ${className}`}
    >
      <div className="relative h-32 overflow-hidden bg-indigo-600">
        <BannerImage src={bannerSrc} alt={`Preview do banner de ${name}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/38 to-transparent" />
      </div>
      <div className="flex min-w-0 items-center gap-3 p-3.5">
        <div className="grid h-[72px] w-[72px] shrink-0 place-items-center overflow-hidden rounded-lg border-4 border-white bg-indigo-600 text-lg font-black text-white shadow-md ring-1 ring-slate-300">
          <AvatarImage src={avatarSrc} initials={initials} name={name} size="preview" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-950">{name}</p>
          <p className="truncate text-xs font-semibold text-slate-500">{email}</p>
        </div>
      </div>
    </div>
  )
}

export function AvatarSign({
  currentUser,
  avatarSrc,
  bannerSrc,
  initials,
  avatarFile,
  bannerFile,
  onAvatarChange,
  onBannerChange,
}: AvatarSignProps) {
  const photoStatus = avatarFile?.name ?? (currentUser.avatarUrl ? 'Foto salva' : 'Sem foto')
  const bannerStatus = bannerFile?.name ?? (currentUser.bannerUrl ? 'Banner salvo' : 'Sem banner')

  return (
    <section className="min-w-0 overflow-visible rounded-2xl border border-slate-400 bg-white shadow-sm">
      <div className="relative h-[clamp(180px,26vw,250px)] overflow-hidden rounded-t-2xl bg-indigo-600">
        <BannerImage src={bannerSrc} alt={`Banner de ${currentUser.name}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-950/12 to-transparent" />

        <label className="absolute right-4 top-4 inline-flex min-h-10 max-w-[calc(100%-32px)] cursor-pointer items-center justify-center gap-2 rounded-sm border border-white/45 bg-white/90 px-3 text-xs font-bold text-slate-900 shadow-sm backdrop-blur transition hover:bg-white active:scale-[0.98]">
          <ImageIcon size={16} className="shrink-0 text-indigo-600" />
          <span className="truncate">Alterar banner</span>
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onBannerChange}
            aria-label="Alterar banner do perfil"
          />
        </label>
      </div>

      <div className="relative grid gap-5 px-5 pb-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:px-6">
        <div className="group/avatar relative -mt-16 h-32 w-32 max-w-full">
          <label className="relative grid h-32 w-32 cursor-pointer place-items-center overflow-hidden rounded-full border-4 border-white bg-indigo-600 text-white shadow-xl ring-1 ring-slate-200 transition duration-150 hover:scale-[1.015] hover:ring-indigo-300 focus-within:ring-2 focus-within:ring-indigo-600">
            <AvatarImage src={avatarSrc} initials={initials} name={currentUser.name} />
            <span className="absolute inset-x-0 bottom-0 grid min-h-10 place-items-center bg-slate-950/76 px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white opacity-0 transition group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100">
              Trocar foto
            </span>
            <span className="absolute bottom-2 right-1.5 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-md">
              <Camera size={16} />
            </span>
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onAvatarChange}
              aria-label="Alterar foto do perfil"
            />
          </label>

          <AvatarHoverPreview
            name={currentUser.name}
            email={currentUser.email}
            avatarSrc={avatarSrc}
            bannerSrc={bannerSrc}
            initials={initials}
          />
        </div>

        <div className="min-w-0 pt-1 sm:pt-5">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-indigo-500">Identidade visual</p>
          <h2 className="truncate font-['Sora',system-ui,sans-serif] text-2xl font-black leading-tight text-slate-950">{currentUser.name}</h2>

          <div className="mt-3 grid gap-1.5 text-sm font-bold text-slate-600">
            <span className="inline-flex min-w-0 items-center gap-2">
              <Mail size={15} className="shrink-0 text-indigo-600" />
              <span className="truncate">{currentUser.email}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <Phone size={15} className="shrink-0 text-violet-600" />
              <span className="truncate">{currentUser.phone || 'Telefone nao informado'}</span>
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800" title={photoStatus}>
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="truncate">{photoStatus}</span>
            </span>
            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800" title={bannerStatus}>
              <CheckCircle2 size={14} className="shrink-0" />
              <span className="truncate">{bannerStatus}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
