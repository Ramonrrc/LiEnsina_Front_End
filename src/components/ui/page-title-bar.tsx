import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'

/* ── Shimmer bone ─────────────────────────────────────────────────────────── */
function Bone({ className = '' }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg bg-slate-100', className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
    </div>
  )
}

type PageTitleBarProps = {
  label: string
  title: string
  icon: React.ReactNode
  actions?: React.ReactNode
  className?: string
  iconClassName?: string
  loading?: boolean
}

export function PageTitleBar({
  label,
  title,
  icon,
  actions,
  className,
  iconClassName,
  loading = false,
}: PageTitleBarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <style>{`
        @keyframes shimmer {
          to { transform: translateX(200%) }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes fade-left {
          from { opacity: 0; transform: translateX(-8px) }
          to   { opacity: 1; transform: translateX(0) }
        }
        @keyframes fade-right {
          from { opacity: 0; transform: translateX(8px) }
          to   { opacity: 1; transform: translateX(0) }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.85) }
          to   { opacity: 1; transform: scale(1) }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.18) }
          50%       { box-shadow: 0 0 0 5px rgba(99,102,241,0) }
        }
      `}</style>

      <section
        className={cn(
          'relative flex flex-wrap items-center justify-between gap-4 overflow-visible rounded-2xl border border-slate-300 bg-white px-5 py-2 shadow-sm',
          'transition-all duration-500',
          mounted ? 'opacity-100' : 'opacity-0',
          className,
        )}
        style={{
          animation: mounted ? 'slide-down .45s cubic-bezier(.16,1,.3,1) forwards' : 'none',
        }}
      >
        {/* Subtle left accent */}
        <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-gradient-to-b from-indigo-400 via-violet-500 to-indigo-400 opacity-80" />

        {/* Top shimmer line — decorative, very faint */}
        <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />

        {loading ? (
          /* ── Skeleton state ─────────────────────────────────────────── */
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bone className="h-9 w-9 rounded-xl" />
              <div className="space-y-2">
                <Bone className="h-2.5 w-20 rounded-full" />
                <Bone className="h-3.5 w-36 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Bone className="h-8 w-24 rounded-xl" />
              <Bone className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            {/* ── Identity ─────────────────────────────────────────────── */}
            <div
              className="flex min-w-0 items-center gap-3.5"
              style={{ animation: 'fade-left .5s cubic-bezier(.16,1,.3,1) .08s both' }}
            >
              {/* Icon */}
              <div
                className={cn(
                  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md',
                  'transition-transform duration-200 hover:scale-105',
                  '[&_svg]:h-[17px] [&_svg]:w-[17px]',
                  iconClassName,
                )}
                style={{ animation: 'scale-in .4s cubic-bezier(.16,1,.3,1) .1s both, pulse-ring 3s ease-in-out 1.2s 2' }}
              >
                {icon}
                {/* Inner glow rim */}
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/20" />
              </div>

              {/* Text */}
              <div className="min-w-0">
                <p className="font-DMSans text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 leading-none">
                  {label}
                </p>
                <p className="mt-1.5 truncate font-DMSans text-[15px] font-bold leading-none text-slate-800 tracking-tight">
                  {title}
                </p>
              </div>
            </div>

            {/* ── Actions ──────────────────────────────────────────────── */}
            {actions ? (
              <div
                className="flex font-DMSans min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 max-[760px]:w-full max-[760px]:justify-start"
                style={{ animation: 'fade-right .5s cubic-bezier(.16,1,.3,1) .14s both' }}
              >
                {actions}
              </div>
            ) : null}
          </>
        )}
      </section>
    </>
  )
}
