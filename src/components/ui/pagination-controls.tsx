import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  HardDrive,
  Loader2,
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from './compact-select'
import type { PaginationMeta } from '../../types'

export const DEFAULT_PAGE_SIZE = 25
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

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
  const progressPct =
    totalPages <= 1 ? 100 : Math.round(((pagination.page - 1) / (totalPages - 1)) * 100)

  const pageSizeSelectOptions = pageSizeOptions.map<CompactSelectOption>((option) => ({
    value: String(option),
    label: `${option} / página`,
    description: option === DEFAULT_PAGE_SIZE ? 'Padrão' : `${option} por página`,
  }))

  const navButtons = [
    { label: 'Primeira página', icon: ChevronsLeft,  action: () => onPageChange(1),                   disabled: pagination.page <= 1 },
    { label: 'Página anterior', icon: ChevronLeft,   action: () => onPageChange(pagination.page - 1), disabled: pagination.page <= 1 },
    { label: 'Próxima página',  icon: ChevronRight,  action: () => onPageChange(pagination.page + 1), disabled: pagination.page >= totalPages },
    { label: 'Última página',   icon: ChevronsRight, action: () => onPageChange(totalPages),          disabled: pagination.page >= totalPages },
  ]

  const SourceBadge = () => {
    if (loading) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5">
          <Loader2 size={9} className="animate-spin text-indigo-500" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
            Carregando
          </span>
        </span>
      )
    }
    if (source === 'backend') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5">
          <Database size={9} className="text-emerald-600" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
            Servidor
          </span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-gray-100 px-1.5 py-0.5">
        <HardDrive size={9} className="text-gray-500" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          Local
        </span>
      </span>
    )
  }

  const NavButton = ({
    label: btnLabel,
    icon: Icon,
    action,
    disabled,
    size = 'md',
  }: {
    label: string
    icon: React.ElementType
    action: () => void
    disabled: boolean
    size?: 'sm' | 'md'
  }) => (
    <button
      type="button"
      onClick={action}
      disabled={loading || disabled}
      aria-label={btnLabel}
      title={btnLabel}
      className={`
        group grid place-items-center rounded-lg border transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-1
        ${size === 'md' ? 'h-10 w-10' : 'h-8 w-8'}
        ${disabled || loading
          ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
          : 'cursor-pointer border-gray-300 bg-white text-gray-500 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95'
        }
      `}
    >
      <Icon size={size === 'md' ? 14 : 12} strokeWidth={2} className="transition-transform duration-150 group-hover:scale-110" />
    </button>
  )

  return (
    <div
      className={`relative w-full border-t border-gray-200 bg-white ${className}`}
      role="navigation"
      aria-label={`Paginação de ${label}`}
    >
      {/* Accent line top */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, #6366F1 100%)' }}
      />

      {/* ── MOBILE LAYOUT (< sm) ── */}
      <div className="flex w-full flex-col gap-3 px-4 pb-4 pt-5 sm:hidden">

        {/* Row 1: label + badge à esquerda, contagem à direita */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              {label}
            </span>
            <SourceBadge />
          </div>
          <span className="font-mono text-sm">
            {pagination.total === 0 ? (
              <span className="text-gray-400">—</span>
            ) : (
              <>
                <span className="font-semibold text-indigo-600">{firstItem}–{lastItem}</span>
                <span className="mx-1 text-gray-300">/</span>
                <span className="text-gray-500">{pagination.total.toLocaleString('pt-BR')}</span>
              </>
            )}
          </span>
        </div>

        {/* Row 2: progress bar full width */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
            }}
          />
        </div>

        {/* Row 3: seletor de itens — w-full */}
        {pageSizeOptions.length > 1 && (
          <CompactSelect
            value={String(limit)}
            options={pageSizeSelectOptions}
            onChange={(value) => onLimitChange(Number(value))}
            ariaLabel={`Itens por página de ${label}`}
            disabled={loading}
            dropdownWidth="trigger"
            dropdownMinWidth={160}
            wrapperClassName="w-full"
            className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 text-sm font-semibold text-gray-700 outline-none transition hover:border-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
        )}

        {/* Row 4: controles de navegação — w-full, centralizado */}
        <div className="flex w-full items-center justify-center gap-1.5">
          <NavButton {...navButtons[0]} size="md" />
          <NavButton {...navButtons[1]} size="md" />

          <div className="mx-1 grid h-10 flex-1 place-items-center rounded-lg border border-gray-300 bg-gray-50">
            {loading ? (
              <Loader2 size={13} className="animate-spin text-indigo-500" />
            ) : (
              <span className="font-mono text-sm">
                <span className="font-semibold text-gray-800">{pagination.page}</span>
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="text-gray-400">{totalPages}</span>
              </span>
            )}
          </div>

          <NavButton {...navButtons[2]} size="md" />
          <NavButton {...navButtons[3]} size="md" />
        </div>
      </div>

      {/* ── DESKTOP LAYOUT (sm+) ── */}
      <div className="hidden w-full items-center justify-between gap-3 px-5 py-3.5 sm:flex sm:flex-wrap">

        {/* Left: label + badge + count + progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              {label}
            </span>
            <SourceBadge />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm">
              {pagination.total === 0 ? (
                <span className="text-gray-400">Nenhum resultado</span>
              ) : (
                <>
                  <span className="font-semibold text-indigo-600">{firstItem}–{lastItem}</span>
                  <span className="mx-1.5 text-gray-300">/</span>
                  <span className="text-gray-500">{pagination.total.toLocaleString('pt-BR')}</span>
                </>
              )}
            </span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: page size + divider + nav */}
        <div className="flex items-center gap-2.5">
          {pageSizeOptions.length > 1 && (
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Itens
              </span>
              <CompactSelect
                value={String(limit)}
                options={pageSizeSelectOptions}
                onChange={(value) => onLimitChange(Number(value))}
                ariaLabel={`Itens por página de ${label}`}
                disabled={loading}
                dropdownWidth="trigger"
                dropdownMinWidth={160}
                wrapperClassName="w-[104px]"
                className="h-7 rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-700 outline-none transition hover:border-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          )}

          {pageSizeOptions.length > 1 && (
            <div className="h-5 w-px bg-gray-300" aria-hidden="true" />
          )}

          <div className="flex items-center gap-1">
            <NavButton {...navButtons[0]} size="sm" />
            <NavButton {...navButtons[1]} size="sm" />

            <div className="mx-0.5 grid h-8 min-w-[68px] place-items-center rounded-lg border border-gray-300 bg-gray-50 px-2">
              {loading ? (
                <Loader2 size={11} className="animate-spin text-indigo-500" />
              ) : (
                <span className="font-mono text-xs">
                  <span className="font-semibold text-gray-800">{pagination.page}</span>
                  <span className="mx-1 text-gray-300">·</span>
                  <span className="text-gray-400">{totalPages}</span>
                </span>
              )}
            </div>

            <NavButton {...navButtons[2]} size="sm" />
            <NavButton {...navButtons[3]} size="sm" />
          </div>
        </div>
      </div>
    </div>
  )
}