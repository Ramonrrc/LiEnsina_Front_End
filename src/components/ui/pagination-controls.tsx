import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from './compact-select'
import type { PaginationMeta } from '../../types'

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

export type PaginationSource = 'backend' | 'local'

export function getLocalPagination(total: number, page: number, limit: number): PaginationMeta {
  const safeLimit = PAGE_SIZE_OPTIONS.includes(limit as (typeof PAGE_SIZE_OPTIONS)[number])
    ? limit
    : DEFAULT_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))

  return {
    page: Math.min(Math.max(1, page), totalPages),
    limit: safeLimit,
    total,
    totalPages,
  }
}

export function paginateLocal<T>(items: T[], page: number, limit: number) {
  const pagination = getLocalPagination(items.length, page, limit)
  const start = (pagination.page - 1) * pagination.limit

  return {
    items: items.slice(start, start + pagination.limit),
    pagination,
  }
}

export function PaginationControls({
  label,
  pagination,
  limit,
  loading,
  source,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className = '',
  onPageChange,
  onLimitChange,
}: {
  label: string
  pagination: PaginationMeta
  limit: number
  loading: boolean
  source: PaginationSource
  pageSizeOptions?: readonly number[]
  className?: string
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}) {
  const firstItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const lastItem = Math.min(pagination.total, pagination.page * pagination.limit)
  const totalPages = Math.max(1, pagination.totalPages)
  const pageSizeSelectOptions = pageSizeOptions.map<CompactSelectOption>((option) => ({
    value: String(option),
    label: `${option} itens`,
    description: option === DEFAULT_PAGE_SIZE ? 'Padrao da pagina' : `Mostrar ${option} por pagina`,
  }))

  const buttons = [
    { label: 'Primeira pagina', icon: ChevronsLeft, action: () => onPageChange(1), disabled: pagination.page <= 1 },
    { label: 'Pagina anterior', icon: ChevronLeft, action: () => onPageChange(pagination.page - 1), disabled: pagination.page <= 1 },
    { label: 'Proxima pagina', icon: ChevronRight, action: () => onPageChange(pagination.page + 1), disabled: pagination.page >= totalPages },
    { label: 'Ultima pagina', icon: ChevronsRight, action: () => onPageChange(totalPages), disabled: pagination.page >= totalPages },
  ]

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-300 bg-slate-50 px-5 py-3 ${className}`}>
      <div className="min-w-0 text-xs font-bold text-slate-500">
        <span className="block truncate">{label}: {firstItem}-{lastItem} de {pagination.total}</span>
        <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {loading ? 'Carregando...' : source === 'backend' ? 'Servidor' : 'Cache local'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-2 py-1 shadow-sm">
          <span className="hidden items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:inline-flex">
            <SlidersHorizontal size={11} />
            Itens
          </span>
          <CompactSelect
            value={String(limit)}
            options={pageSizeSelectOptions}
            onChange={(value) => onLimitChange(Number(value))}
            ariaLabel={`Itens por pagina de ${label}`}
            disabled={loading}
            dropdownWidth="trigger"
            dropdownMinWidth={170}
            wrapperClassName="w-[116px]"
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-black text-slate-700 outline-none transition hover:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="flex items-center gap-1">
          {buttons.slice(0, 2).map(({ label: buttonLabel, icon: Icon, action, disabled }) => (
            <button
              key={buttonLabel}
              type="button"
              onClick={action}
              disabled={loading || disabled}
              aria-label={buttonLabel}
              className="grid h-8 min-w-8 place-items-center rounded-lg border-2 border-slate-300 bg-white px-2 text-xs font-black text-slate-500 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon size={14} />
            </button>
          ))}

          <span className="grid h-8 min-w-[72px] place-items-center rounded-lg border-2 border-indigo-300 bg-indigo-50 px-3 text-xs font-black text-indigo-700">
            {pagination.page} / {totalPages}
          </span>

          {buttons.slice(2).map(({ label: buttonLabel, icon: Icon, action, disabled }) => (
            <button
              key={buttonLabel}
              type="button"
              onClick={action}
              disabled={loading || disabled}
              aria-label={buttonLabel}
              className="grid h-8 min-w-8 place-items-center rounded-lg border-2 border-slate-300 bg-white px-2 text-xs font-black text-slate-500 transition hover:border-indigo-400 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
