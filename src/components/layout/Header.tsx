import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellDot,
  CheckCheck,
  ChevronDown,
  Info,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  X,
  Zap,
  Wifi,
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import type { Variants, Transition } from 'motion/react'
import { AvatarHoverPreview } from '../profile/AvatarSign'
import type { AppNotification } from '../../types'

type HeaderNotification = AppNotification

interface HeaderProps {
  activeLabel: string
  activeBreadcrumb?: string
  mobileOpen: boolean
  userName: string
  userEmail: string
  userRole: string
  avatarUrl?: string
  bannerUrl?: string
  initials: string
  alertCount: number
  notifications?: HeaderNotification[]
  notificationsLoading?: boolean
  sidebarCollapsed: boolean
  onOpenMenu: () => void
  onToggleSidebar: () => void
  onOpenSearch?: () => void
  onOpenNotifications?: () => void
  onViewAllNotifications?: () => void
  onMarkNotificationRead?: (id: string) => Promise<void>
  onMarkAllNotificationsRead?: () => Promise<void>
  onOpenProfile: () => void
  onLogout: () => void
}

// ── Tone config ───────────────────────────────────────────────────────────────

const TONE_CFG = {
  danger: {
    label: 'Crítico',
    icon: Zap,
    accent: '#dc2626',
    accentBg: 'rgba(220,38,38,0.06)',
    accentBorder: 'rgba(220,38,38,0.20)',
    accentGlow: 'rgba(220,38,38,0.30)',
    pill: 'bg-red-50 border-red-200 text-red-600',
    iconWrap: 'bg-red-50 text-red-500',
    bar: 'from-red-500 to-red-400',
    actionLabel: 'Ação imediata',
    actionColor: 'text-red-500',
    pulse: true,
  },
  warning: {
    label: 'Atenção',
    icon: AlertTriangle,
    accent: '#d97706',
    accentBg: 'rgba(217,119,6,0.05)',
    accentBorder: 'rgba(217,119,6,0.16)',
    accentGlow: 'rgba(217,119,6,0.18)',
    pill: 'bg-amber-50 border-amber-200 text-amber-600',
    iconWrap: 'bg-amber-50 text-amber-500',
    bar: 'from-amber-500 to-amber-400',
    actionLabel: 'Verificar',
    actionColor: 'text-amber-600',
    pulse: false,
  },
  info: {
    label: 'Info',
    icon: Info,
    accent: '#2563eb',
    accentBg: 'rgba(37,99,235,0.04)',
    accentBorder: 'rgba(37,99,235,0.13)',
    accentGlow: 'rgba(37,99,235,0.16)',
    pill: 'bg-blue-50 border-blue-200 text-blue-600',
    iconWrap: 'bg-blue-50 text-blue-500',
    bar: 'from-blue-500 to-blue-400',
    actionLabel: 'Ver detalhes',
    actionColor: 'text-blue-600',
    pulse: false,
  },
} as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  const h = Math.floor(min / 60)
  const d = Math.floor(h / 24)
  if (min < 1)  return 'agora'
  if (min < 60) return `${min}m`
  if (h < 24)   return `${h}h`
  return `${d}d`
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div
      className="space-y-2.5 rounded-2xl p-4"
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-lg animate-pulse bg-slate-200" />
          <div className="h-3.5 w-16 rounded-full animate-pulse bg-slate-200" />
        </div>
        <div className="h-3 w-8 rounded-full animate-pulse bg-slate-100" />
      </div>
      <div className="h-4 w-3/4 rounded animate-pulse bg-slate-200" />
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded animate-pulse bg-slate-100" />
        <div className="h-3 w-2/3 rounded animate-pulse bg-slate-100" />
      </div>
    </div>
  )
}

// ── Notification card ─────────────────────────────────────────────────────────

function NotificationCard({
  notif,
  index,
  pending,
  onMarkRead,
}: {
  notif: HeaderNotification
  index: number
  pending: boolean
  onMarkRead: (id: string) => void
}) {
  const cfg     = TONE_CFG[notif.tone] ?? TONE_CFG.info
  const isRead  = !!notif.readAt
  const Icon    = cfg.icon
  const reduced = useReducedMotion()
 
  // ── Ease curves tipadas como tupla (motion/react exige BezierDefinition) ────
  const easeOut    = [0.22, 1, 0.36, 1]    as [number, number, number, number]
  const easeSpring = [0.34, 1.46, 0.64, 1] as [number, number, number, number]
 
  // ── Variantes tipadas explicitamente como Variants ───────────────────────────
 
  const dangerVariants: Variants = {
  initial: { opacity: 0, x: -14, scale: 0.97 },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { delay: index * 0.04, duration: 0.35, ease: easeOut } as Transition,
  },
}
 
  const warningVariants: Variants = {
    initial: { opacity: 0, y: 10, scale: 0.98 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { delay: index * 0.05, duration: 0.4, ease: easeSpring } as Transition,
    },
  }
 
  const infoVariants: Variants = {
    initial: { opacity: 0, y: 5 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.06, duration: 0.26, ease: easeOut } as Transition,
    },
  }
 
  const variants =
    notif.tone === 'danger'  ? dangerVariants  :
    notif.tone === 'warning' ? warningVariants : infoVariants
 
  // Para danger não lido, encadeia a variante 'shake' após 'animate'
  const animateSequence = 'animate'
 
  const hoverEffect = isRead
    ? { y: -1, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
    : { y: -2, boxShadow: `0 6px 20px ${cfg.accentGlow}` }
 
  return (
    <motion.article
      variants={reduced ? undefined : variants}
      initial="initial"
      animate={animateSequence}
      onClick={() => { if (!isRead && !pending) onMarkRead(notif.id) }}
      role={!isRead ? 'button' : undefined}
      tabIndex={!isRead ? 0 : undefined}
      onKeyDown={e => {
        if (isRead || pending) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMarkRead(notif.id) }
      }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl transition-colors duration-200"
      style={{
        background:   isRead ? '#f8fafc' : cfg.accentBg,
        border:       `1px solid ${isRead ? '#e2e8f0' : cfg.accentBorder}`,
        paddingLeft:  16, paddingRight: 16,
        paddingTop:   14, paddingBottom: 14,
        boxShadow:    isRead ? 'none' : `0 2px 10px ${cfg.accentGlow}`,
      }}
      whileHover={hoverEffect}
      whileFocus={hoverEffect}
    >
      {/* ── Barra lateral colorida ── */}
      {!isRead && (
        <motion.span
          className={`absolute left-0 top-3 bottom-3 w-[3px] bg-gradient-to-b ${cfg.bar} rounded-r-full`}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          style={{ originY: 0 }}
          transition={{ delay: index * 0.05 + 0.1, duration: 0.3, ease: easeOut }}
        />
      )}
 
      {/* ── Shimmer sweep — só DANGER não lido ── */}
      {!isRead && notif.tone === 'danger' && !reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(105deg, transparent 38%, rgba(220,38,38,0.08) 50%, transparent 62%)',
            backgroundSize: '220% 100%',
          }}
          animate={{ backgroundPosition: ['110% 0%', '-110% 0%'] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: 'linear', repeatDelay: 1.4 }}
        />
      )}
 
      {/* ── Header row ── */}
      <div className="relative mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
 
          {/* Dot pulsante — DANGER */}
          {!isRead && notif.tone === 'danger' && (
            <motion.span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: cfg.accent }}
              animate={reduced ? {} : { scale: [1, 1.55, 1], opacity: [1, 0.35, 1] }}
              transition={{ repeat: Infinity, duration: 1.3, ease: 'easeInOut' }}
            />
          )}
 
          {/* Dot suave — WARNING */}
          {!isRead && notif.tone === 'warning' && (
            <motion.span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: cfg.accent }}
              animate={reduced ? {} : { opacity: [1, 0.45, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            />
          )}
 
          {/* Ícone — pulsa escala só no DANGER */}
          <motion.span
            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${cfg.iconWrap}`}
            style={{ border: `1px solid ${cfg.accentBorder}` }}
            animate={
              !isRead && notif.tone === 'danger' && !reduced
                ? { scale: [1, 1.13, 1] }
                : {}
            }
            transition={
              !isRead && notif.tone === 'danger' && !reduced
                ? { repeat: Infinity, duration: 1.9, ease: 'easeInOut', delay: 0.25 }
                : {}
            }
          >
            <Icon className="h-3 w-3" />
          </motion.span>
 
          {/* Pill */}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[9px] font-black uppercase tracking-[.1em] ${cfg.pill}`}
          >
            {cfg.label}
          </span>
        </div>
 
        <time className="flex-shrink-0 text-[10px] font-semibold tabular-nums text-slate-400">
          {relTime(notif.createdAt)}
        </time>
      </div>
 
      {/* ── Título ── */}
      <p className="relative mb-1 text-[12.5px] font-bold leading-snug text-slate-800">
        {notif.title}
      </p>
 
      {/* ── Descrição ── */}
      <p className="relative line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500">
        {notif.description}
      </p>
 
      {/* ── Footer — não lida ── */}
      {!isRead && (
        <div
          className="relative mt-3 flex items-center justify-between border-t pt-2.5"
          style={{ borderColor: '#e2e8f0' }}
        >
          <button
            type="button"
            disabled={pending}
            onClick={e => { e.stopPropagation(); onMarkRead(notif.id) }}
            className="rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all disabled:cursor-wait disabled:opacity-40 hover:bg-white"
            style={{ color: cfg.accent }}
          >
            {pending ? '…' : 'Marcar como lida'}
          </button>
          <span className={`text-[9.5px] font-black ${cfg.actionColor}`}>
            {cfg.actionLabel}
          </span>
        </div>
      )}
 
      {/* ── Footer — lida ── */}
      {isRead && (
        <div className="relative mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
          <CheckCheck className="h-3 w-3" />
          Lida
        </div>
      )}
    </motion.article>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyNotifications() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl px-4 py-12 text-center"
      style={{ border: '1.5px dashed #cbd5e1', background: '#C1C9D2' }}
    >
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe' }}
      >
        <Bell className="h-6 w-6 text-indigo-400" />
      </span>
      <div>
        <p className="text-[13px] font-bold text-slate-600">Nenhuma notificação</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Tudo está em ordem.</p>
      </div>
    </div>
  )
}

// ── Icon button ───────────────────────────────────────────────────────────────

function IconButton({
  onClick,
  active = false,
  label,
  children,
  className = '',
}: {
  onClick?: () => void
  active?: boolean
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.94 }}
      className={`relative grid h-9 w-9 place-items-center rounded-xl outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${className}`}
      style={{
        border: active ? '1.5px solid #bfdbfe' : '1.5px solid #C1C9D2',
        background: active
          ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
          : '#ffffff',
        color: active ? '#2563eb' : '#64748b',
        boxShadow: active
          ? '0 0 0 3px rgba(37,99,235,0.1), 0 2px 8px rgba(37,99,235,0.12)'
          : '0 1px 3px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.background = '#f0f7ff'
          el.style.borderColor = '#bfdbfe'
          el.style.color = '#2563eb'
          el.style.boxShadow = '0 2px 8px rgba(37,99,235,0.1)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          const el = e.currentTarget as HTMLElement
          el.style.background = '#ffffff'
          el.style.borderColor = '#e2e8f0'
          el.style.color = '#64748b'
          el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
        }
      }}
    >
      {children}
    </motion.button>
  )
}

// ── Light panel wrapper ───────────────────────────────────────────────────────

function LightPanel({
  children,
  style,
  className = '',
  role,
  ariaLabel,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  role?: string
  ariaLabel?: string
}) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={`overflow-hidden rounded-2xl ${className}`}
      style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 20px 60px rgba(15,23,42,0.12), 0 8px 24px rgba(15,23,42,0.06), 0 1px 0 rgba(255,255,255,0.8)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────

export function Header({
  activeLabel,
  activeBreadcrumb,
  mobileOpen,
  userName,
  userEmail,
  userRole,
  avatarUrl,
  bannerUrl,
  initials,
  alertCount,
  notifications = [],
  notificationsLoading = false,
  sidebarCollapsed,
  onOpenMenu,
  onToggleSidebar,
  onOpenSearch,
  onOpenNotifications,
  onViewAllNotifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenProfile,
  onLogout,
}: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [avatarHover, setAvatarHover] = useState(false)
  const [avatarPreviewStyle, setAvatarPreviewStyle] = useState<CSSProperties | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  function positionAvatarPreview(target: HTMLElement) {
    const rect = target.getBoundingClientRect()
    const previewWidth = Math.min(360, window.innerWidth - 48)
    const previewHeight = 220
    const viewportPadding = 24
    const left = Math.min(
      Math.max(viewportPadding, rect.right - previewWidth),
      Math.max(viewportPadding, window.innerWidth - previewWidth - viewportPadding),
    )
    const belowTop = rect.bottom + 10
    const top = belowTop + previewHeight > window.innerHeight
      ? Math.max(16, rect.top - previewHeight - 10)
      : belowTop

    setAvatarPreviewStyle({ left, top, width: previewWidth })
  }

  function hideAvatarPreview() {
    setAvatarHover(false)
    setAvatarPreviewStyle(null)
  }

  useEffect(() => {
    if (!profileOpen && !notifOpen) return
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (profileOpen && !profileRef.current?.contains(t)) setProfileOpen(false)
      if (notifOpen && !notifRef.current?.contains(t)) setNotifOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setProfileOpen(false); setNotifOpen(false) }
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [profileOpen, notifOpen])

  const openNotif = () => {
    const next = !notifOpen
    setNotifOpen(next)
    setProfileOpen(false)
    hideAvatarPreview()
    if (next) onOpenNotifications?.()
  }

  async function handleMarkRead(id: string) {
    if (!onMarkNotificationRead) return
    setPendingId(id)
    try { await onMarkNotificationRead(id) } finally { setPendingId(null) }
  }

  async function handleMarkAll() {
    if (!onMarkAllNotificationsRead) return
    setMarkingAll(true)
    try { await onMarkAllNotificationsRead() } finally { setMarkingAll(false) }
  }

  const unreadCount = notifications.filter(n => !n.readAt).length
  const dangerCount = notifications.filter(n => !n.readAt && n.tone === 'danger').length

  const panelMotion = {
    initial: { opacity: 0, y: -8, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -6, scale: 0.97 },
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-16 w-full items-center"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 4px 20px rgba(15,23,42,0.06)',
      }}
    >
      {/* Subtle top accent line */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, #3b82f6 30%, #6366f1 60%, transparent 100%)',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      <div className="flex w-full items-center justify-between px-5 lg:px-6">

        {/* ── Left ── */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile hamburger */}
          <IconButton onClick={onOpenMenu} label={mobileOpen ? 'Fechar menu' : 'Abrir menu'} className="lg:hidden">
            {mobileOpen ? <X className="h-[16px] w-[16px]" /> : <Menu className="h-[16px] w-[16px]" />}
          </IconButton>

          {/* Desktop sidebar toggle */}
          <IconButton onClick={onToggleSidebar} label={sidebarCollapsed ? 'Expandir menu' : 'Minimizar menu'} className="hidden lg:grid">
            {sidebarCollapsed
              ? <PanelLeftOpen className="h-[16px] w-[16px]" />
              : <PanelLeftClose className="h-[16px] w-[16px]" />}
          </IconButton>

          <div className="hidden h-6 w-px lg:block" style={{ background: '#e2e8f0' }} />

          {/* Context label */}
          <div className="min-w-0">
            {activeBreadcrumb && (
              <div className="mb-[2px] flex items-center gap-1.5">
                <span className="text-[9.5px] font-bold uppercase tracking-[.12em] text-slate-400">
                  {activeBreadcrumb}
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-[9.5px] font-bold uppercase tracking-[.12em] text-blue-500">
                  {activeLabel}
                </span>
              </div>
            )}
            <p
              className="truncate text-[15px] font-bold tracking-tight text-slate-800 leading-tight"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: '-0.3px' }}
            >
              {activeLabel}
            </p>
            {!activeBreadcrumb && (
              <p className="truncate text-[11px] font-medium leading-tight text-slate-400">
                {userRole} — {userName}
              </p>
            )}
          </div>
        </div>

        {/* ── Right ── */}
        <div className="flex items-center gap-2 sm:gap-2.5">

          {/* ── Notifications ── */}
          <div ref={notifRef} className="relative">
            <IconButton onClick={openNotif} active={notifOpen} label="Notificações">
              {alertCount > 0 ? <BellDot className="h-[16px] w-[16px]" /> : <Bell className="h-[16px] w-[16px]" />}
              {alertCount > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex min-w-[18px] items-center justify-center rounded-full border-2 border-white px-1 py-px text-[9px] font-black leading-none text-white"
                  style={{
                    background: dangerCount > 0 ? '#dc2626' : '#2563eb',
                    boxShadow: dangerCount > 0
                      ? '0 0 0 2px rgba(220,38,38,0.2)'
                      : '0 0 0 2px rgba(37,99,235,0.2)',
                    animation: dangerCount > 0 ? 'badgePulse 1.8s ease-in-out infinite' : 'none',
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </IconButton>

            {/* ── Notifications panel ── */}
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  {...panelMotion}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 10px)',
                    zIndex: 50,
                    width: 'min(390px, calc(100vw - 24px))',
                  }}
                >
                  <LightPanel role="dialog" ariaLabel="Central de alertas">

                    {/* Top header gradient */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-28 rounded-t-2xl"
                      style={{
                        background: dangerCount > 0
                          ? 'linear-gradient(180deg, rgba(254,242,242,0.9) 0%, transparent 100%)'
                          : 'linear-gradient(180deg, rgba(239,246,255,0.9) 0%, transparent 100%)',
                      }}
                    />

                    {/* Panel header */}
                    <div
                      className="relative flex items-center justify-between gap-3 px-5 py-4"
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                          style={{
                            background: dangerCount > 0
                              ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
                              : 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                            border: dangerCount > 0
                              ? '1.5px solid #fecaca'
                              : '1.5px solid #bfdbfe',
                            boxShadow: dangerCount > 0
                              ? '0 4px 12px rgba(220,38,38,0.15)'
                              : '0 4px 12px rgba(37,99,235,0.15)',
                          }}
                        >
                          {dangerCount > 0
                            ? <AlertCircle className="h-4.5 w-4.5 text-red-500" style={{ width: 18, height: 18 }} />
                            : <Bell className="h-4.5 w-4.5 text-indigo-500" style={{ width: 18, height: 18 }} />}
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[.2em] text-slate-400">
                            Central de alertas
                          </p>
                          <p className="text-[14px] font-bold leading-tight text-slate-800">
                            {unreadCount > 0
                              ? `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}`
                              : 'Tudo em dia'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        {unreadCount > 0 && (
                          <motion.button
                            type="button"
                            onClick={handleMarkAll}
                            disabled={markingAll}
                            whileTap={{ scale: 0.93 }}
                            className="grid h-8 w-8 place-items-center rounded-xl transition-all disabled:cursor-wait disabled:opacity-40 hover:bg-blue-50"
                            style={{
                              background: '#f0f7ff',
                              border: '1px solid #bfdbfe',
                              color: '#2563eb',
                            }}
                            title="Marcar todas como lidas"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                          </motion.button>
                        )}
                        <motion.button
                          type="button"
                          onClick={() => setNotifOpen(false)}
                          whileTap={{ scale: 0.93 }}
                          className="grid h-8 w-8 place-items-center rounded-xl transition-all hover:bg-slate-100"
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#94a3b8',
                          }}
                          aria-label="Fechar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Panel body */}
                    <div
                      className="max-h-[400px] space-y-2 overflow-y-auto p-3"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
                    >
                      {notificationsLoading ? (
                        <>
                          <NotificationSkeleton />
                          <NotificationSkeleton />
                          <NotificationSkeleton />
                        </>
                      ) : notifications.length > 0 ? (
                        notifications.map((n, i) => (
                          <NotificationCard
                            key={n.id}
                            notif={n}
                            index={i}
                            pending={pendingId === n.id}
                            onMarkRead={handleMarkRead}
                          />
                        ))
                      ) : (
                        <EmptyNotifications />
                      )}
                    </div>

                    {/* Panel footer */}
                    <div className="p-3" style={{ borderTop: '1px solid #f1f5f9' }}>
                      <motion.button
                        type="button"
                        onClick={() => { setNotifOpen(false); onViewAllNotifications?.() }}
                        whileTap={{ scale: 0.98 }}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[11px] font-bold uppercase tracking-[.1em] transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #2563eb, #6366F1)',
                          color: '#ffffff',
                          boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(37,99,235,0.4)'
                          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.3)'
                          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                        }}
                      >
                        <Bell className="h-3.5 w-3.5" />
                        Ver todas as notificações
                      </motion.button>
                    </div>
                  </LightPanel>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Separator */}
          <div className="h-6 w-px flex-shrink-0" style={{ background: '#e2e8f0' }} />

          {/* ── Profile ── */}
          <div ref={profileRef} className="relative">
            <motion.button
              type="button"
              onClick={() => { setProfileOpen(c => !c); setNotifOpen(false); hideAvatarPreview() }}
              onMouseEnter={e => {
                setAvatarHover(true)
                positionAvatarPreview(e.currentTarget)
                if (!profileOpen) {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = '#f0f7ff'
                  el.style.borderColor = '#bfdbfe'
                  el.style.boxShadow = '0 2px 8px rgba(37,99,235,0.1)'
                }
              }}
              onMouseLeave={e => {
                hideAvatarPreview()
                if (!profileOpen) {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = '#ffffff'
                  el.style.borderColor = '#e2e8f0'
                  el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                }
              }}
              onFocus={e => { setAvatarHover(true); positionAvatarPreview(e.currentTarget) }}
              onBlur={hideAvatarPreview}
              whileTap={{ scale: 0.97 }}
              className="flex h-9 items-center gap-2.5 rounded-xl pl-1 pr-2.5 text-left transition-all duration-150"
              style={{
                border: profileOpen ? '1.5px solid #bfdbfe' : '1.5px solid #e2e8f0',
                background: profileOpen ? '#eff6ff' : '#ffffff',
                boxShadow: profileOpen
                  ? '0 0 0 3px rgba(37,99,235,0.1), 0 2px 8px rgba(37,99,235,0.12)'
                  : '0 1px 3px rgba(0,0,0,0.06)',
              }}
              aria-label="Abrir perfil"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              {/* Avatar */}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-7 w-7 flex-shrink-0 rounded-[9px] object-cover"
                  style={{ boxShadow: '0 0 0 2px #bfdbfe' }}
                />
              ) : (
                <span
                className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-[9px] text-[10px] font-black text-white"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',   // indigo-500 → indigo-600
                  boxShadow: '0 0 0 2px #c7d2fe',                            // indigo-200
                }}
              >
                {initials || <UserRound className="h-3.5 w-3.5" />}
              </span>
              )}

              {/* Name + role */}
              <span className="hidden min-w-0 md:block">
                <span className="block max-w-[130px] truncate text-[12px] font-bold leading-tight text-slate-800">
                  {userName}
                </span>
                <span className="block max-w-[130px] truncate text-[10px] font-medium leading-tight text-indigo-500">
                  {userRole}
                </span>
              </span>

              {/* Chevron */}
              <motion.span
                animate={{ rotate: profileOpen ? 180 : 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="hidden md:block"
              >
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </motion.span>
            </motion.button>

            {/* Avatar hover preview */}
            {!profileOpen && avatarHover && avatarPreviewStyle && typeof document !== 'undefined'
              ? createPortal(
                <AvatarHoverPreview
                  name={userName}
                  email={userEmail}
                  avatarSrc={avatarUrl}
                  bannerSrc={bannerUrl}
                  initials={initials}
                  position="fixed"
                  style={avatarPreviewStyle}
                  visible
                  className=""
                />,
                document.body,
              )
              : null}

            {/* ── Profile dropdown ── */}
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  {...panelMotion}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 10px)',
                    zIndex: 50,
                    width: 250,
                  }}
                >
                  <LightPanel role="menu">

                    {/* Top gradient */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-2xl"
                      style={{ background: 'linear-gradient(180deg, #eff6ff 0%, transparent 100%)' }}
                    />

                    {/* User card */}
                    <div className="relative p-3 pb-0">
                      <div
                        className="flex items-center gap-3 rounded-2xl p-3"
                        style={{
                          background: 'linear-gradient(135deg, #f0f7ff, #eff6ff)',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={userName}
                            className="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
                            style={{ boxShadow: '0 0 0 2.5px #bfdbfe, 0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                        ) : (
                          <span
                          className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl text-[12px] font-black text-white"
                          style={{
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',   // indigo-500 → indigo-600
                            boxShadow: '0 0 0 2.5px #c7d2fe, 0 4px 12px rgba(99,102,241,0.22)',
                          }}
                        >
                          {initials || <UserRound className="h-4 w-4" />}
                        </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold leading-tight text-slate-800">{userName}</p>
                          <p className="mt-0.5 truncate text-[10.5px] font-medium text-indigo-500">{userRole}</p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span
                              className="h-[6px] w-[6px] rounded-full bg-emerald-400"
                              style={{ boxShadow: '0 0 6px rgba(52,211,153,0.5)', animation: 'sbPulseDot 2.5s ease-in-out infinite' }}
                            />
                            <span className="text-[9px] font-bold text-emerald-500">Online</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="relative p-2 pt-2">
                      <motion.button
                        type="button"
                        onClick={() => { setProfileOpen(false); onOpenProfile() }}
                        whileTap={{ scale: 0.98 }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        role="menuitem"
                      >
                        <span
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}
                        >
                          <UserRound className="h-[13px] w-[13px]" />
                        </span>
                        <span className="text-[13px] font-semibold">Meu perfil</span>
                      </motion.button>

                      {/* Divider */}
                      <div className="mx-2 my-1.5 h-px bg-slate-100" />

                      <motion.button
                        type="button"
                        onClick={() => { setProfileOpen(false); onLogout() }}
                        whileTap={{ scale: 0.98 }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all text-red-500 hover:bg-red-50 hover:text-red-600"
                        role="menuitem"
                      >
                        <span
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                        >
                          <LogOut className="h-[13px] w-[13px]" />
                        </span>
                        <span className="text-[13px] font-semibold">Sair da conta</span>
                      </motion.button>
                    </div>

                    {/* Sync footer */}
                    <div className="px-3 pb-3">
                      <div
                        className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{
                          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        <Wifi className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                        <span className="text-[10px] font-semibold text-emerald-600">
                          Sessão ativa · API conectada
                        </span>
                      </div>
                    </div>
                  </LightPanel>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes notifDotPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          50%       { box-shadow: 0 0 0 5px rgba(220,38,38,0); }
        }
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(220,38,38,0.2); }
          50%       { box-shadow: 0 0 0 5px rgba(220,38,38,0); }
        }
        @keyframes sbPulseDot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.4); }
          50%       { box-shadow: 0 0 0 5px rgba(52,211,153,0); }
        }
      `}</style>
    </header>
  )
}
