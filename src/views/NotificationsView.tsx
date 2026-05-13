import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, Bell, BellDot, BellOff,
  CheckCheck, ChevronLeft, ChevronRight, Circle, Clock, Info,
  MailOpen, RefreshCw, Zap,
} from 'lucide-react'

import { PageTitleBar } from '../components/ui/page-title-bar'
import type { AppNotification } from '../types'

type NotificationFilter = 'all' | 'unread' | 'read'

interface NotificationsViewProps {
  notifications: AppNotification[]
  unreadCount: number
  totalCount: number
  loading?: boolean
  onMarkRead: (id: string) => Promise<void>
  onMarkUnread: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}

const filterOptions: Array<{ id: NotificationFilter; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: 'Todas', icon: <Bell className="h-3.5 w-3.5" /> },
  { id: 'unread', label: 'Não lidas', icon: <Circle className="h-3.5 w-3.5 fill-current" /> },
  { id: 'read', label: 'Lidas', icon: <MailOpen className="h-3.5 w-3.5" /> },
]
const notificationsPageSize = 6

const toneConfig = {
  danger: {
    badge: 'border-red-300 bg-red-100 text-red-700',
    card: 'border-red-300 bg-red-50/50',
    cardRead: 'border-slate-300 bg-white',
    dot: 'bg-red-500',
    label: 'Crítico',
    icon: <Zap className="h-3 w-3" />,
    leftBar: 'bg-red-500',
  },
  warning: {
    badge: 'border-amber-300 bg-amber-100 text-amber-700',
    card: 'border-amber-300 bg-amber-50/50',
    cardRead: 'border-slate-300 bg-white',
    dot: 'bg-amber-500',
    label: 'Atenção',
    icon: <AlertTriangle className="h-3 w-3" />,
    leftBar: 'bg-amber-500',
  },
  info: {
    badge: 'border-indigo-300 bg-indigo-100 text-indigo-700',
    card: 'border-indigo-300 bg-indigo-50/50',
    cardRead: 'border-slate-300 bg-white',
    dot: 'bg-indigo-500',
    label: 'Info',
    icon: <Info className="h-3 w-3" />,
    leftBar: 'bg-indigo-500',
  },
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data não informada'
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Skeleton card ──────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="animate-pulse rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-slate-200" />
          <div className="h-4 w-16 rounded-full bg-slate-200" />
          <div className="h-4 w-12 rounded-full bg-slate-200" />
        </div>
        <div className="h-8 w-24 rounded-lg bg-slate-200" />
      </div>
      <div className="mb-2 h-5 w-2/3 rounded-lg bg-slate-200" />
      <div className="mb-1 h-4 w-full rounded bg-slate-200" />
      <div className="mb-4 h-4 w-4/5 rounded bg-slate-200" />
      <div className="h-3 w-40 rounded bg-slate-100" />
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  colorClass,
  icon,
  loading,
}: {
  label: string
  value: number
  colorClass: string
  icon: React.ReactNode
  loading?: boolean
}) {
  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${colorClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</span>
        <span className="opacity-50">{icon}</span>
      </div>
      {loading
        ? <div className="mt-3 h-8 w-16 animate-pulse rounded-lg bg-current opacity-20" />
        : <strong className="mt-2 block font-['Sora',system-ui,sans-serif] text-3xl font-black leading-none">{value}</strong>
      }
    </article>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NotificationsView({
  notifications,
  unreadCount,
  totalCount,
  loading = false,
  onMarkRead,
  onMarkUnread,
  onMarkAllRead,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [page, setPage] = useState(1)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.readAt)
    if (filter === 'read') return notifications.filter((n) => Boolean(n.readAt))
    return notifications
  }, [filter, notifications])
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / notificationsPageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * notificationsPageSize
    return filteredNotifications.slice(start, start + notificationsPageSize)
  }, [currentPage, filteredNotifications])

  useEffect(() => {
    setPage(1)
  }, [filter, notifications.length])

  async function runNotificationAction(id: string, action: (id: string) => Promise<void>) {
    setPendingId(id)
    try {
      await action(id)
    } finally {
      setPendingId(null)
    }
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await onMarkAllRead()
    } finally {
      setMarkingAll(false)
    }
  }

  const readCount = Math.max(0, totalCount - unreadCount)

  return (
    <div className="min-h-screen bg-slate-100 font-['DM_Sans',system-ui,sans-serif] text-slate-900">
      {/* Inner container */}
      <div className="px-[clamp(12px,2.5vw,40px)] py-4 pb-12">

        <PageTitleBar
          label="Central de notificações"
          title="Notificações"
          icon={<Bell />}
          actions={(
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markingAll}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-700 bg-indigo-600 px-5 text-xs font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {markingAll
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Salvando...</>
                : <><CheckCheck className="h-4 w-4" /> Marcar todas como lidas</>
              }
            </button>
          )}
        />

        {/* ── Stats ─────────────────────────────────────────────── */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total"
            value={totalCount}
            icon={<Bell className="h-5 w-5" />}
            colorClass="border-slate-400 bg-white text-slate-900"
            loading={loading}
          />
          <StatCard
            label="Não lidas"
            value={unreadCount}
            icon={<BellDot className="h-5 w-5" />}
            colorClass="border-indigo-400 bg-indigo-600 text-white"
            loading={loading}
          />
          <StatCard
            label="Lidas"
            value={readCount}
            icon={<MailOpen className="h-5 w-5" />}
            colorClass="border-emerald-400 bg-emerald-600 text-white"
            loading={loading}
          />
        </section>

        {/* ── List section ──────────────────────────────────────── */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-400 bg-slate-50 px-5 py-3">
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-400 bg-white p-1 shadow-sm">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-black transition-all
                    ${filter === option.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-500">
              {loading ? '–' : filteredNotifications.length} exibida{filteredNotifications.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Cards */}
          <div className="grid gap-3 p-5">
            {loading ? (
              <>
                <SkeletonCard delay={0} />
                <SkeletonCard delay={80} />
                <SkeletonCard delay={160} />
              </>
            ) : filteredNotifications.length > 0 ? (
              paginatedNotifications.map((notification, i) => {
                const isRead = Boolean(notification.readAt)
                const isPending = pendingId === notification.id
                const cfg = toneConfig[notification.tone] ?? toneConfig.info

                return (
                  <article
                    key={notification.id}
                    style={{
                      animationDelay: `${i * 50}ms`,
                      animation: 'fadeSlideIn 220ms ease both',
                    }}
                    className={`relative overflow-hidden rounded-2xl border transition-all
                      ${isRead ? cfg.cardRead : cfg.card}`}
                  >
                    {/* Left accent bar */}
                    {!isRead && (
                      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${cfg.leftBar}`} />
                    )}

                    <div className="flex items-start justify-between gap-4 px-5 py-4 pl-[calc(20px+4px)]" style={!isRead ? { paddingLeft: '22px' } : undefined}>
                      <div className="min-w-0 flex-1">
                        {/* Badges row */}
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${cfg.badge}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest
                            ${isRead
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                              : 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {isRead
                              ? <><MailOpen className="h-3 w-3" /> Lida</>
                              : <><Circle className="h-3 w-3 fill-current" /> Não lida</>
                            }
                          </span>
                        </div>

                        {/* Title */}
                        <h2 className="font-['Sora',system-ui,sans-serif] text-base font-black leading-snug text-slate-950">
                          {notification.title}
                        </h2>

                        {/* Description */}
                        <p className="mt-1.5 text-sm leading-6 text-slate-600">
                          {notification.description}
                        </p>

                        {/* Timestamps */}
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Criada em {formatDate(notification.createdAt)}
                          </span>
                          {notification.readAt && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <MailOpen className="h-3 w-3" />
                              Lida em {formatDate(notification.readAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action button */}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => runNotificationAction(
                          notification.id,
                          isRead ? onMarkUnread : onMarkRead,
                        )}
                        className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-xs font-black transition active:scale-95 disabled:cursor-wait disabled:opacity-60
                          ${isRead
                            ? 'border-slate-400 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700'
                            : 'border-indigo-400 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          }`}
                      >
                        {isPending
                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          : isRead
                            ? <><Circle className="h-3.5 w-3.5" /> Não lida</>
                            : <><CheckCheck className="h-3.5 w-3.5" /> Marcar lida</>
                        }
                      </button>
                    </div>
                  </article>
                )
              })
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-400 bg-slate-50 px-6 py-14 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-400 shadow-sm">
                  <BellOff className="h-7 w-7" />
                </span>
                <div>
                  <p className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-700">Nenhuma notificação encontrada</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Tente outro filtro ou aguarde novas notificações.</p>
                </div>
              </div>
            )}

            {!loading && filteredNotifications.length > notificationsPageSize ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <span className="text-xs font-bold text-slate-500">
                  Pagina {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage <= 1}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage >= totalPages}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Proxima
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      {/* Keyframe for card entrance */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
