import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, UserRound, X } from 'lucide-react'

import { AvatarHoverPreview } from '../profile/AvatarSign'

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
  sidebarCollapsed: boolean
  onOpenMenu: () => void
  onToggleSidebar: () => void
  onOpenProfile: () => void
  onLogout: () => void
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
  sidebarCollapsed,
  onOpenMenu,
  onToggleSidebar,
  onOpenProfile,
  onLogout,
}: HeaderProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!profileMenuOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [profileMenuOpen])

  function handleOpenProfile() {
    setProfileMenuOpen(false)
    onOpenProfile()
  }

  function handleLogout() {
    setProfileMenuOpen(false)
    onLogout()
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b border-slate-300 bg-white/95 backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:pr-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 transition-all hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 lg:hidden"
            aria-label={mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 lg:grid"
            aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'}
            aria-pressed={sidebarCollapsed}
            title={sidebarCollapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>

          <div className="min-w-0">
            <p className="truncate font-['Sora',system-ui,sans-serif] text-base font-black tracking-tight text-slate-950">{activeLabel}</p>
            <p className="truncate text-xs font-semibold text-slate-500">{userRole} - {userName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-lg border border-slate-300 bg-white text-slate-500 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95"
            aria-label="Alertas"
          >
            <Bell className="h-[18px] w-[18px]" />
            {alertCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {alertCount}
              </span>
            ) : null}
          </button>

          <div ref={profileMenuRef} className="group/avatar relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((current) => !current)}
              onMouseEnter={() => setAvatarPreviewOpen(true)}
              onMouseLeave={() => setAvatarPreviewOpen(false)}
              onFocus={() => setAvatarPreviewOpen(true)}
              onBlur={() => setAvatarPreviewOpen(false)}
              className="group flex h-10 items-center gap-2.5 rounded-lg border border-transparent bg-transparent pl-1 pr-2 text-left transition-all hover:bg-indigo-50 active:scale-[0.98]"
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
              <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition md:block ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {!profileMenuOpen ? (
              <AvatarHoverPreview
                name={userName}
                email={userEmail}
                avatarSrc={avatarUrl}
                bannerSrc={bannerUrl}
                initials={initials}
                visible={avatarPreviewOpen}
                className="right-0 top-[calc(100%+12px)]"
              />
            ) : null}

            {profileMenuOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-slate-950/5"
                role="menu"
              >
                <div className="border-b border-slate-100 px-3 pb-2">
                  <p className="truncate text-sm font-bold text-slate-950">{userName}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{userRole}</p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="mt-1 flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                  role="menuitem"
                >
                  <UserRound className="h-4 w-4" />
                  Meu perfil
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  )
}
