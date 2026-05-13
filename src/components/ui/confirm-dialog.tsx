import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'

import { cn } from '../../lib/cn'

type ConfirmDialogTone = 'danger' | 'warning'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  tone?: ConfirmDialogTone
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

const toneClasses: Record<ConfirmDialogTone, { icon: string; confirm: string }> = {
  danger: {
    icon: 'border-rose-200 bg-rose-50 text-rose-600',
    confirm: 'border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700',
  },
  warning: {
    icon: 'border-amber-200 bg-amber-50 text-amber-600',
    confirm: 'border-amber-600 bg-amber-600 text-white hover:border-amber-700 hover:bg-amber-700',
  },
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  tone = 'danger',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const colors = toneClasses[tone]

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, onCancel])

  const dialog = (
    <div
      role="presentation"
      onMouseDown={() => {
        if (!loading) onCancel()
      }}
      className="fixed inset-0 z-[1200] grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-sm border border-slate-300 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-sm border', colors.icon)}>
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-['Sora',system-ui,sans-serif] text-base font-bold text-slate-900">
                {title}
              </h2>
              <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Fechar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-sm text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center rounded-sm border border-slate-300 bg-white px-4 text-sm font-bold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={loading}
            className={cn(
              'inline-flex min-h-10 items-center justify-center rounded-sm border px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              colors.confirm,
            )}
          >
            {loading ? 'Excluindo...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body)
}
