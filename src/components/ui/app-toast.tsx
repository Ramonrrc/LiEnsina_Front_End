import { AlertTriangle, CheckCircle2, X } from 'lucide-react'

export type AppToastTone = 'success' | 'error'

type AppToastNoticeProps = {
  message: string
  tone?: AppToastTone
  onClose?: () => void
  floating?: boolean
}

const toastStyles = {
  success: {
    shell: 'border-emerald-100 bg-white text-emerald-950 shadow-emerald-950/10',
    rail: 'bg-gradient-to-b from-emerald-400 to-emerald-600',
    iconWrap: 'bg-emerald-50 text-emerald-500 ring-1 ring-emerald-200/80',
    icon: CheckCircle2,
    label: 'Sucesso',
    glow: 'shadow-emerald-100',
    progress: 'bg-emerald-400/20',
  },
  error: {
    shell: 'border-rose-100 bg-white text-rose-950 shadow-rose-950/10',
    rail: 'bg-gradient-to-b from-rose-400 to-rose-600',
    iconWrap: 'bg-rose-50 text-rose-500 ring-1 ring-rose-200/80',
    icon: AlertTriangle,
    label: 'Erro',
    glow: 'shadow-rose-100',
    progress: 'bg-rose-400/20',
  },
} satisfies Record<
  AppToastTone,
  {
    shell: string
    rail: string
    iconWrap: string
    icon: typeof CheckCircle2
    label: string
    glow: string
    progress: string
  }
>

export function AppToastNotice({
  message,
  tone = 'success',
  onClose,
  floating = false,
}: AppToastNoticeProps) {
  const styles = toastStyles[tone]
  const Icon = styles.icon

  const content = (
    <div
      className={`
        toast-enter
        group relative flex min-h-16 w-full overflow-hidden
        rounded-xl border pr-3 text-sm
        shadow-xl ${styles.glow} ${styles.shell}
        transition-all duration-300 ease-out
        hover:shadow-2xl hover:-translate-y-px
      `}
      role="status"
      aria-live="polite"
    >
      {/* Left accent rail */}
      <div className={`w-1 shrink-0 ${styles.rail} opacity-90`} />

      {/* Content */}
      <div className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3.5">
        {/* Icon */}
        <span
          className={`
            mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full
            ${styles.iconWrap}
            transition-transform duration-200 group-hover:scale-105
          `}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </span>

        {/* Text */}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400/90">
            {styles.label}
          </span>
          <span className="mt-0.5 block break-words text-[13.5px] font-medium leading-relaxed text-slate-700">
            {message}
          </span>
        </span>

        {/* Close button */}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="
              mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center
              rounded-lg text-slate-300 opacity-60
              transition-all duration-150
              hover:bg-slate-50 hover:text-slate-500 hover:opacity-100
              active:scale-95
            "
            aria-label="Fechar notificacao"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>

      {/* Subtle inner shimmer line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />

      <style>{`
        @keyframes toast-in {
          0%   { opacity: 0; transform: translateY(-8px) scale(0.97); }
          60%  { opacity: 1; transform: translateY(2px) scale(1.005); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .toast-enter {
          animation: toast-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
    </div>
  )

  if (!floating) return content

  return (
    <div className="fixed left-1/2 top-4 z-[2000] w-[min(440px,calc(100vw-32px))] -translate-x-1/2">
      {content}
    </div>
  )
}