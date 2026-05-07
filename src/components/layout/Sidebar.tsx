import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, X } from 'lucide-react'

import { cn } from '../../lib/cn'
import type { navItems } from '../../data'
import type { AppSection } from '../../types'

type NavItem = (typeof navItems)[number]

interface SidebarProps {
  appName: string
  items: NavItem[]
  activeSection: AppSection
  mobileOpen: boolean
  collapsed: boolean
  onSectionChange: (section: AppSection) => void
  onCloseMobile: () => void
}

function SidebarPanel({
  appName,
  items,
  activeSection,
  onSectionChange,
  collapsed = false,
  mobile = false,
  onRequestClose,
}: Omit<SidebarProps, 'mobileOpen' | 'onCloseMobile'> & { mobile?: boolean; onRequestClose?: () => void }) {
  const compact = collapsed && !mobile

  return (
    <div className="flex h-full w-full flex-col bg-white text-slate-700">
      <div className={cn('border-b border-slate-300 py-5', compact ? 'px-3' : 'px-6')}>
        <div className={cn('flex items-center gap-4', compact ? 'justify-center' : 'justify-between')}>
          <button
            type="button"
            onClick={() => onSectionChange('dashboard')}
            className={cn('flex min-w-0 items-center text-left', compact ? 'justify-center' : 'gap-3')}
            aria-label={appName}
            title={compact ? appName : undefined}
          >
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-600 font-['Sora',system-ui,sans-serif] text-sm font-black tracking-tight text-white ring-1 ring-indigo-600">
              {appName.slice(0, 2).toUpperCase()}
            </div>
            <div className={cn('min-w-0', compact && 'hidden')}>
              <p className="truncate font-['Sora',system-ui,sans-serif] text-lg font-black tracking-tight text-slate-900">{appName}</p>
              <p className="truncate text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Operacao escolar</p>
            </div>
          </button>

          {mobile && onRequestClose ? (
            <button
              type="button"
              onClick={onRequestClose}
              className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-700 active:scale-95"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <nav className={cn('flex-1 space-y-1.5 overflow-y-auto py-6', compact ? 'px-3' : 'px-4')}>
        {items.map((item) => {
          const Icon = item.icon
          const active = item.id === activeSection

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              aria-label={item.label}
              title={compact ? item.label : undefined}
              className={cn(
                'group relative flex w-full items-center rounded-lg border text-left transition-all duration-200 active:scale-[0.98]',
                compact ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                active
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-100'
                  : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-800',
              )}
            >
              {active ? <span className="absolute -left-1.5 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-indigo-600" /> : null}
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-all duration-300',
                  active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 group-hover:bg-white group-hover:text-indigo-600',
                )}
              >
                <Icon className={cn('h-4 w-4 transition-transform duration-300', active && 'h-5 w-5')} />
              </span>
              <span className={cn('min-w-0', compact && 'hidden')}>
                <span className={cn('block truncate text-sm tracking-tight', active ? 'font-black text-slate-900' : 'font-semibold')}>
                  {item.label}
                </span>
                <span className="block truncate text-[11px] font-semibold text-slate-400 group-hover:text-slate-500">
                  {item.description}
                </span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className={cn('mx-4 mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800', compact && 'mx-3 grid place-items-center p-2')}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span className={cn('text-xs font-semibold', compact && 'hidden')}>Rede sincronizada</span>
        </div>
        <p className={cn('mt-1 text-xs font-medium text-emerald-700', compact && 'hidden')}>Dados ativos pela API escolar.</p>
      </div>
    </div>
  )
}

export function Sidebar({ appName, items, activeSection, mobileOpen, collapsed, onSectionChange, onCloseMobile }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          'hidden h-screen flex-shrink-0 border-r border-slate-300 transition-[width] duration-300 ease-out lg:sticky lg:top-0 lg:flex',
          collapsed ? 'w-[84px]' : 'w-[280px]',
        )}
      >
        <SidebarPanel
          appName={appName}
          items={items}
          activeSection={activeSection}
          collapsed={collapsed}
          onSectionChange={onSectionChange}
        />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
          >
            <motion.aside
              className="h-full w-[304px] max-w-[86vw] bg-white shadow-2xl ring-1 ring-slate-900/5"
              initial={{ x: '-100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(event) => event.stopPropagation()}
            >
              <SidebarPanel
                appName={appName}
                items={items}
                activeSection={activeSection}
                collapsed={false}
                onSectionChange={onSectionChange}
                mobile
                onRequestClose={onCloseMobile}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
