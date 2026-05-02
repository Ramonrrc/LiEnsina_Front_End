import { Bell, LogOut, Menu, RefreshCw, UserRound, X } from 'lucide-react'

interface HeaderProps {
  activeLabel: string
  mobileOpen: boolean
  userName: string
  userRole: string
  avatarUrl?: string
  initials: string
  alertCount: number
  onOpenMenu: () => void
  onRefresh: () => void
  onOpenProfile: () => void
  onLogout: () => void
}

export function Header({
  activeLabel,
  mobileOpen,
  userName,
  userRole,
  avatarUrl,
  initials,
  alertCount,
  onOpenMenu,
  onRefresh,
  onOpenProfile,
  onLogout,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center border-b border-stone-300 bg-white/90 backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-4 sm:px-6 lg:pr-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-stone-500 transition-all hover:bg-stone-100 hover:text-stone-900 active:scale-95 lg:hidden"
            aria-label={mobileOpen ? 'Fechar menu lateral' : 'Abrir menu lateral'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold tracking-tight text-stone-950">{activeLabel}</p>
            <p className="truncate text-xs font-medium text-stone-500">{userRole} - {userName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="grid h-10 w-10 place-items-center rounded-lg border border-stone-300 bg-white text-stone-500 transition-all hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900 active:scale-95"
            aria-label="Recarregar dados"
            title="Recarregar dados"
          >
            <RefreshCw className="h-[18px] w-[18px]" />
          </button>

          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-lg border border-stone-300 bg-white text-stone-500 transition-all hover:border-stone-400 hover:bg-stone-50 hover:text-stone-900 active:scale-95"
            aria-label="Alertas"
          >
            <Bell className="h-[18px] w-[18px]" />
            {alertCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-stone-900 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
                {alertCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="group flex h-10 items-center gap-2.5 rounded-lg border border-transparent bg-transparent pl-1 pr-2 text-left transition-all hover:bg-stone-50 active:scale-[0.98]"
            aria-label="Abrir perfil"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white" />
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-900 text-[11px] font-semibold tracking-wide text-white ring-2 ring-white">
                {initials || <UserRound className="h-4 w-4" />}
              </span>
            )}
            <span className="hidden min-w-0 md:block">
              <span className="block max-w-[140px] truncate text-sm font-semibold leading-tight text-stone-900">{userName}</span>
              <span className="block max-w-[140px] truncate text-[11px] font-medium leading-tight text-stone-500">{userRole}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-semibold text-red-700 transition-all hover:border-red-300 hover:bg-red-50 active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}
