import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, Bell, BellDot, CheckCheck, ChevronDown,
  Info, LogOut, Menu, PanelLeftClose, PanelLeftOpen,
  UserRound, X, Zap,
} from 'lucide-react'

import { AvatarHoverPreview } from '../profile/AvatarSign'
import type { AppNotification } from '../../types'

type HeaderNotification = AppNotification

interface HeaderProps {
  activeLabel: string
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
  onOpenNotifications?: () => void
  onViewAllNotifications?: () => void
  onMarkNotificationRead?: (id: string) => Promise<void>
  onMarkAllNotificationsRead?: () => Promise<void>
  onOpenProfile: () => void
  onLogout: () => void
}

function ToneIcon({ tone }: { tone: AppNotification['tone'] }) {
  if (tone === 'danger') return <Zap className="h-3 w-3" />
  if (tone === 'warning') return <AlertTriangle className="h-3 w-3" />
  return <Info className="h-3 w-3" />
}

function toneLabel(tone: AppNotification['tone']) {
  if (tone === 'danger') return 'Crítico'
  if (tone === 'warning') return 'Atenção'
  return 'Info'
}

function NotificationSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-300 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-16 rounded-full bg-slate-200" />
        <div className="h-3 w-10 rounded-full bg-slate-200" />
      </div>
      <div className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
      <div className="h-3 w-full rounded bg-slate-200" />
      <div className="mt-1 h-3 w-2/3 rounded bg-slate-200" />
    </div>
  )
}

const toneStyles = {
  danger: {
    badge: 'border-red-300 bg-red-100 text-red-700',
    dot: 'bg-red-500',
    card: 'border-red-200 bg-red-50/40',
  },
  warning: {
    badge: 'border-amber-300 bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    card: 'border-amber-200 bg-amber-50/40',
  },
  info: {
    badge: 'border-indigo-300 bg-indigo-100 text-indigo-700',
    dot: 'bg-indigo-500',
    card: 'border-indigo-200 bg-indigo-50/40',
  },
}

export function Header({
  activeLabel,
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
  onOpenNotifications,
  onViewAllNotifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenProfile,
  onLogout,
}: HeaderProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false)
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false)
  const [pendingNotificationId, setPendingNotificationId] = useState<string | null>(null)
  const [markingAllNotifications, setMarkingAllNotifications] = useState(false)
  const [visible, setVisible] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const notificationMenuRef = useRef<HTMLDivElement | null>(null)

  // Animate dropdown in
  useEffect(() => {
    if (notificationMenuOpen) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [notificationMenuOpen])

  useEffect(() => {
    if (!profileMenuOpen && !notificationMenuOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (profileMenuOpen && !profileMenuRef.current?.contains(target)) setProfileMenuOpen(false)
      if (notificationMenuOpen && !notificationMenuRef.current?.contains(target)) setNotificationMenuOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false)
        setNotificationMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [notificationMenuOpen, profileMenuOpen])

  function handleOpenProfile() {
    setProfileMenuOpen(false)
    onOpenProfile()
  }

  function handleLogout() {
    setProfileMenuOpen(false)
    onLogout()
  }

  function handleToggleNotifications() {
    const nextOpen = !notificationMenuOpen
    setNotificationMenuOpen(nextOpen)
    setProfileMenuOpen(false)
    setAvatarPreviewOpen(false)
    if (nextOpen) onOpenNotifications?.()
  }

  function handleViewAllNotifications() {
    setNotificationMenuOpen(false)
    onViewAllNotifications?.()
  }

  async function handleMarkNotificationRead(id: string) {
    if (!onMarkNotificationRead) return
    setPendingNotificationId(id)
    try {
      await onMarkNotificationRead(id)
    } finally {
      setPendingNotificationId(null)
    }
  }

  async function handleMarkAllNotificationsRead() {
    if (!onMarkAllNotificationsRead) return
    setMarkingAllNotifications(true)
    try {
      await onMarkAllNotificationsRead()
    } finally {
      setMarkingAllNotifications(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b border-slate-400 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:pr-8">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile menu */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-400 text-slate-600 transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 lg:hidden"
            aria-label={mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop sidebar toggle */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-400 bg-white text-slate-600 transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 lg:grid"
            aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'}
            aria-pressed={sidebarCollapsed}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          <div className="min-w-0">
            <p className="truncate font-['Sora',system-ui,sans-serif] text-base font-black tracking-tight text-slate-950">
              {activeLabel}
            </p>
            <p className="truncate text-xs font-semibold text-slate-500">
              {userRole} — {userName}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* ── Notification bell ─────────────────────────────── */}
          <div ref={notificationMenuRef} className="relative">
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`relative grid h-10 w-10 place-items-center rounded-lg border transition-all active:scale-95
                ${notificationMenuOpen
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-inner'
                  : 'border-slate-400 bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              aria-label="Abrir notificações"
              aria-expanded={notificationMenuOpen}
              aria-haspopup="dialog"
            >
              {alertCount > 0
                ? <BellDot className="h-[18px] w-[18px] [&_circle]:fill-indigo-700" />
                : <Bell className="h-[18px] w-[18px]" />}

              {alertCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-indigo-600 px-1 py-px text-[10px] font-black leading-none text-white ring-2 ring-white">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {notificationMenuOpen && (
              <div
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
                  transition: 'opacity 160ms ease, transform 160ms ease',
                }}
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-2xl"
                role="dialog"
                aria-label="Notificações"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">Notificações</p>
                      <p className="text-sm font-black text-slate-950 leading-tight">
                        {alertCount > 0 ? `${alertCount} não lida${alertCount === 1 ? '' : 's'}` : 'Tudo em dia'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {alertCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        disabled={markingAllNotifications}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-60"
                        aria-label="Marcar todas como lidas"
                        title="Marcar todas como lidas"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNotificationMenuOpen(false)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-500 transition hover:border-slate-400 hover:bg-slate-100"
                      aria-label="Fechar notificações"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="max-h-[380px] overflow-y-auto p-3">
                  {notificationsLoading ? (
                    <div className="grid gap-2">
                      <NotificationSkeleton />
                      <NotificationSkeleton />
                      <NotificationSkeleton />
                    </div>
                  ) : notifications.length > 0 ? (
                    <div className="grid gap-2">
                      {notifications.map((notification, i) => {
                        const styles = toneStyles[notification.tone] ?? toneStyles.info
                        return (
                          <article
                            key={notification.id}
                            style={{ animationDelay: `${i * 40}ms` }}
                            onClick={() => {
                              if (!notification.readAt && pendingNotificationId !== notification.id) void handleMarkNotificationRead(notification.id)
                            }}
                            onKeyDown={(event) => {
                              if (notification.readAt || pendingNotificationId === notification.id) return
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                void handleMarkNotificationRead(notification.id)
                              }
                            }}
                            role={!notification.readAt ? 'button' : undefined}
                            tabIndex={!notification.readAt ? 0 : undefined}
                            className={`group rounded-xl border p-3 transition-all
                              ${notification.readAt
                                ? 'border-slate-300 bg-white'
                                : `${styles.card} shadow-sm cursor-pointer`
                              }`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                {!notification.readAt && (
                                  <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                                )}
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${styles.badge}`}>
                                  <ToneIcon tone={notification.tone} />
                                  {toneLabel(notification.tone)}
                                </span>
                              </div>
                              {!notification.readAt && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void handleMarkNotificationRead(notification.id)
                                  }}
                                  disabled={pendingNotificationId === notification.id}
                                  className="rounded-md border border-transparent px-2 py-1 text-[10px] font-black text-indigo-700 transition hover:border-indigo-300 hover:bg-white disabled:cursor-wait disabled:opacity-60"
                                >
                                  {pendingNotificationId === notification.id ? '...' : 'Marcar lida'}
                                </button>
                              )}
                            </div>
                            <strong className="block text-sm font-black text-slate-900">{notification.title}</strong>
                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 line-clamp-2">{notification.description}</p>
                          </article>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Bell className="h-5 w-5" />
                      </span>
                      <p className="text-xs font-bold text-slate-400">Nenhuma notificação ativa no momento.</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-300 bg-slate-50 p-3">
                  <button
                    type="button"
                    onClick={handleViewAllNotifications}
                    className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-indigo-700 active:scale-[0.98]"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Ver todas as Notificações
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Profile ───────────────────────────────────────── */}
          <div ref={profileMenuRef} className="group/avatar relative">
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen((c) => !c)
                setNotificationMenuOpen(false)
              }}
              onMouseEnter={() => setAvatarPreviewOpen(true)}
              onMouseLeave={() => setAvatarPreviewOpen(false)}
              onFocus={() => setAvatarPreviewOpen(true)}
              onBlur={() => setAvatarPreviewOpen(false)}
              className={`group flex h-10 items-center gap-2.5 rounded-lg border pl-1 pr-2 text-left transition-all active:scale-[0.98]
                ${profileMenuOpen
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-slate-400 bg-white hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              aria-label="Abrir menu do perfil"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={userName} className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-600 text-[11px] font-black tracking-wide text-white ring-2 ring-white">
                  {initials || <UserRound className="h-4 w-4" />}
                </span>
              )}
              <span className="hidden min-w-0 md:block">
                <span className="block max-w-[140px] truncate text-sm font-bold leading-tight text-slate-900">{userName}</span>
                <span className="block max-w-[140px] truncate text-[11px] font-semibold leading-tight text-slate-500">{userRole}</span>
              </span>
              <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform duration-200 md:block ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {!profileMenuOpen && (
              <AvatarHoverPreview
                name={userName}
                email={userEmail}
                avatarSrc={avatarUrl}
                bannerSrc={bannerUrl}
                initials={initials}
                visible={avatarPreviewOpen}
                className="right-0 top-[calc(100%+12px)]"
              />
            )}

            {profileMenuOpen && (
              <div
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-2xl border border-slate-400 bg-white py-2 shadow-2xl"
                role="menu"
              >
                <div className="border-b border-slate-300 px-3 pb-3 pt-1">
                  <div className="flex items-center gap-2">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={userName} className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-indigo-100" />
                    ) : (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-600 text-[11px] font-black text-white ring-2 ring-indigo-100">
                        {initials || <UserRound className="h-4 w-4" />}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">{userName}</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{userRole}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="mt-1 flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                  role="menuitem"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-indigo-100 group-hover:text-indigo-700">
                    <UserRound className="h-4 w-4" />
                  </span>
                  Meu perfil
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  role="menuitem"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500">
                    <LogOut className="h-4 w-4" />
                  </span>
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
