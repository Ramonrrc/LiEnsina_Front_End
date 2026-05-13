import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

interface PageTitleBarProps {
  label: string
  title: string
  icon: ReactNode
  actions?: ReactNode
  className?: string
  iconClassName?: string
}

export function PageTitleBar({ label, title, icon, actions, className, iconClassName }: PageTitleBarProps) {
  return (
    <section className={cn('flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-400 bg-white px-5 py-3.5 shadow-sm', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm [&_svg]:h-[15px] [&_svg]:w-[15px]', iconClassName)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">{label}</p>
          <p className="mt-0.5 truncate text-sm font-bold leading-none text-slate-800">{title}</p>
        </div>
      </div>

      {actions ? (
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 max-[760px]:w-full max-[760px]:justify-start">
          {actions}
        </div>
      ) : null}
    </section>
  )
}
