import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import type { ZodError } from 'zod'

import { cn } from '../../lib/cn'

export type FieldErrors<TField extends string = string> = Partial<Record<TField, string>>

export function zodFieldErrors<TField extends string = string>(error: ZodError): FieldErrors<TField> {
  return error.issues.reduce<FieldErrors<TField>>((current, issue) => {
    const field = issue.path[0]
    if (typeof field !== 'string' || current[field as TField]) return current
    return { ...current, [field]: issue.message }
  }, {})
}

export function firstZodError(error: ZodError, fallback = 'Revise os campos do formulario.') {
  return error.issues[0]?.message ?? fallback
}

export function fieldStateClass(error?: string | null) {
  return error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
    : ''
}

export function FieldMessage({
  hint,
  error,
  id,
  className,
}: {
  hint?: string
  error?: string | null
  id?: string
  className?: string
}) {
  if (!error && !hint) return null

  return error ? (
    <span
      id={id}
      className={cn('flex min-h-4 min-w-0 max-w-full items-start gap-1 text-[11px] font-bold leading-4 text-red-600', className)}
    >
      <AlertCircle size={12} className="mt-0.5 shrink-0" />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{error}</span>
    </span>
  ) : (
    <span
      id={id}
      title={hint}
      className={cn('block h-4 min-w-0 max-w-full truncate text-left text-[11px] font-semibold leading-4 text-slate-400', className)}
    >
      {hint}
    </span>
  )
}

export function FormField({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
  labelClassName,
  messageClassName,
}: {
  label: string
  hint?: string
  error?: string | null
  htmlFor?: string
  children: ReactNode
  className?: string
  labelClassName?: string
  messageClassName?: string
}) {
  const messageId = htmlFor ? `${htmlFor}-message` : undefined

  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)} htmlFor={htmlFor}>
      <span className={cn('text-[11px] font-bold uppercase tracking-widest text-slate-500', labelClassName)}>
        {label}
      </span>
      {children}
      <FieldMessage id={messageId} hint={hint} error={error} className={messageClassName} />
    </label>
  )
}
