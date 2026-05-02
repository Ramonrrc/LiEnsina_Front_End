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
  onSectionChange: (section: AppSection) => void
  onCloseMobile: () => void
}

function SidebarPanel({
  appName,
  items,
  activeSection,
  onSectionChange,
  mobile = false,
  onRequestClose,
}: Omit<SidebarProps, 'mobileOpen' | 'onCloseMobile'> & { mobile?: boolean; onRequestClose?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col bg-white text-stone-700">
      <div className="border-b border-stone-300 px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => onSectionChange('dashboard')} className="flex min-w-0 items-center gap-3 text-left">
            <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-stone-900 font-display text-sm font-semibold tracking-tight text-white ring-1 ring-stone-900">
              {appName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold tracking-tight text-stone-900">{appName}</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Operacao escolar</p>
            </div>
          </button>

          {mobile && onRequestClose ? (
            <button
              type="button"
              onClick={onRequestClose}
              className="grid h-9 w-9 place-items-center rounded-lg bg-stone-50 text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-700 active:scale-95"
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="scrollbar-soft flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.id === activeSection

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'group relative flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.98]',
                active
                  ? 'border-stone-400 bg-stone-100 text-stone-950'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900',
              )}
            >
              {active ? <span className="absolute -left-1.5 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-stone-900" /> : null}
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-all duration-300',
                  active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 group-hover:bg-stone-100 group-hover:text-stone-600',
                )}
              >
                <Icon className={cn('h-4 w-4 transition-transform duration-300', active && 'h-5 w-5')} />
              </span>
              <span className="min-w-0">
                <span className={cn('block truncate text-sm tracking-tight', active ? 'font-semibold text-stone-900' : 'font-medium')}>
                  {item.label}
                </span>
                <span className="block truncate text-[11px] font-medium text-stone-400 group-hover:text-stone-500">
                  {item.description}
                </span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mx-4 mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-semibold">Rede sincronizada</span>
        </div>
        <p className="mt-1 text-xs font-medium text-emerald-700">Dados ativos pela API escolar.</p>
      </div>
    </div>
  )
}

export function Sidebar({ appName, items, activeSection, mobileOpen, onSectionChange, onCloseMobile }: SidebarProps) {
  return (
    <>
      <aside className="sidebar-shell hidden h-screen w-[280px] flex-shrink-0 border-r border-stone-300 lg:sticky lg:top-0 lg:flex">
        <SidebarPanel appName={appName} items={items} activeSection={activeSection} onSectionChange={onSectionChange} />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
          >
            <motion.aside
              className="sidebar-shell h-full w-[304px] max-w-[86vw] bg-white shadow-2xl ring-1 ring-stone-900/5"
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
