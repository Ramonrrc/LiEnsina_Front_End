import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

interface SurfaceCardProps {
  title?: string
  eyebrow?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
  headerClassName?: string
  bodyClassName?: string
  children: ReactNode
}

export function SurfaceCard({
  title,
  eyebrow,
  icon,
  action,
  className,
  headerClassName,
  bodyClassName,
  children,
}: SurfaceCardProps) {
  const hasHeader = title || eyebrow || icon || action

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-sm',
        className,
      )}
    >
      {hasHeader ? (
        <header
          className={cn(
            'flex flex-col-reverse items-start justify-between gap-4 border-b border-stone-100 bg-white px-4 py-4 sm:px-6 xl:flex-row',
            headerClassName,
          )}
        >
          <div className="flex items-center gap-3">
            {icon ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-50 text-stone-500 ring-1 ring-inset ring-stone-300">
                {icon}
              </div>
            ) : null}

            <div>
              {eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 className="font-display text-lg font-semibold tracking-tight text-stone-950">
                  {title}
                </h2>
              ) : null}
            </div>
          </div>

          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <div
        className={cn(
          'bg-white px-5 py-5 sm:px-6',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}
