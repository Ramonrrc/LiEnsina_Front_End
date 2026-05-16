import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Bell, BellDot, BellOff, CheckCheck,
  ChevronLeft, ChevronRight, Circle, Clock, Info,
  MailOpen, RefreshCw, Zap, SlidersHorizontal, Inbox,
  CheckCircle2, Filter,
} from 'lucide-react'
import { PageTitleBar } from '../components/ui/page-title-bar'
import type { AppNotification } from '../types'

type NotificationFilter = 'all' | 'unread' | 'read'
type ToneFilter = 'all' | 'danger' | 'warning' | 'info'

interface NotificationsViewProps {
  notifications: AppNotification[]
  unreadCount: number
  totalCount: number
  loading?: boolean
  onMarkRead: (id: string) => Promise<void>
  onMarkUnread: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}

const PAGE_SIZE = 8

const TONE = {
  danger: {
    label: 'Crítico',
    icon: Zap,
    pill: { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B' },
    bar: '#EF4444',
    iconWrap: { bg: '#FEE2E2', border: '#FCA5A5', color: '#DC2626' },
  },
  warning: {
    label: 'Atenção',
    icon: AlertTriangle,
    pill: { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E' },
    bar: '#F59E0B',
    iconWrap: { bg: '#FEF3C7', border: '#FCD34D', color: '#D97706' },
  },
  info: {
    label: 'Info',
    icon: Info,
    pill: { bg: '#EEF2FF', border: '#A5B4FC', text: '#3730A3' },
    bar: '#6366F1',
    iconWrap: { bg: '#EEF2FF', border: '#A5B4FC', color: '#4F46E5' },
  },
} as const

function fmtDate(v: string) {
  const d = new Date(v)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────
function SkeletonRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex animate-pulse items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100">
        <Bell className="h-4 w-4 text-slate-300" />
      </div>
      <div className="flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-14 rounded-full bg-slate-200" />
          <div className="h-4 w-10 rounded-full bg-slate-100" />
        </div>
        <div className="h-4 w-3/5 rounded-md bg-slate-200" />
        <div className="h-3.5 w-4/5 rounded bg-slate-100" />
        <div className="h-3 w-36 rounded bg-slate-100" />
      </div>
      <div className="mt-1 h-8 w-28 shrink-0 rounded-xl bg-slate-100" />
    </div>
  )
}

// ─────────────────────────────────────────────
// Stat block (sidebar)
// ─────────────────────────────────────────────
function StatBlock({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string
  value: number
  icon: React.ElementType
  accent: string
  loading?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white p-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${accent}18`, border: `1.5px solid ${accent}40` }}
      >
        <Icon className="h-4.5 w-4.5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        {loading
          ? <div className="mt-1 h-6 w-10 animate-pulse rounded bg-slate-200" />
          : <p className="mt-0.5 text-xl font-black leading-none text-slate-900">{value}</p>
        }
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tone badge filter (sidebar)
// ─────────────────────────────────────────────
function TonePill({
  tone,
  count,
  active,
  onClick,
}: {
  tone: ToneFilter
  count: number
  active: boolean
  onClick: () => void
}) {
  const cfg = tone !== 'all' ? TONE[tone] : null
  const Icon = cfg ? cfg.icon : Bell
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition-all duration-150
        ${active
          ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
    >
      <Icon className="h-4 w-4 shrink-0" style={cfg && !active ? { color: cfg.bar } : undefined} />
      <span className="flex-1 truncate">{cfg ? cfg.label : 'Todos os tipos'}</span>
      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-black
        ${active ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
        {count}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────
// Notification card
// ─────────────────────────────────────────────
function NotificationCard({
  notification,
  pending,
  onAction,
  animDelay,
}: {
  notification: AppNotification
  pending: boolean
  onAction: () => void
  animDelay: number
}) {
  const isRead = Boolean(notification.readAt)
  const tone = (notification.tone as keyof typeof TONE) in TONE
    ? (notification.tone as keyof typeof TONE)
    : 'info'
  const cfg = TONE[tone]
  const ToneIcon = cfg.icon

  return (
    <article
      className={`group relative flex items-start gap-4 overflow-hidden rounded-2xl border p-5 transition-all duration-200
        ${isRead
          ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
          : 'border-slate-300 bg-white shadow-sm hover:shadow-md'
        }`}
      style={{
        animation: `cardIn 320ms cubic-bezier(.16,1,.3,1) ${animDelay}ms both`,
      }}
    >
      {/* Left accent */}
      {!isRead && (
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: cfg.bar, borderRadius: '0' }}
        />
      )}

      {/* Tone icon */}
      <div
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105"
        style={{
          background: cfg.iconWrap.bg,
          borderColor: cfg.iconWrap.border,
          color: cfg.iconWrap.color,
        }}
      >
        <ToneIcon className="h-4.5 w-4.5" />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1" style={!isRead ? { paddingLeft: '2px' } : undefined}>
        {/* Badges */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest"
            style={{
              background: cfg.pill.bg,
              borderColor: cfg.pill.border,
              color: cfg.pill.text,
            }}
          >
            <ToneIcon className="h-2.5 w-2.5" />
            {cfg.label}
          </span>
          {!isRead && (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-indigo-700">
              <Circle className="h-2 w-2 fill-current" />
              Nova
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold leading-snug text-slate-900">
          {notification.title}
        </h3>

        {/* Description */}
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {notification.description}
        </p>

        {/* Meta */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {fmtDate(notification.createdAt)}
          </span>
          {notification.readAt && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              Lida {fmtDate(notification.readAt)}
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        disabled={pending}
        onClick={onAction}
        className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-all duration-150 active:scale-95 disabled:cursor-wait disabled:opacity-50
          ${isRead
            ? 'border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700'
            : 'border-indigo-400 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
          }`}
      >
        {pending
          ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          : isRead
            ? <><MailOpen className="h-3.5 w-3.5" /> Não lida</>
            : <><CheckCheck className="h-3.5 w-3.5" /> Marcar lida</>
        }
      </button>
    </article>
  )
}

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────
function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <BellOff className="h-7 w-7 text-slate-300" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700">Nenhuma notificação aqui</p>
        <p className="mt-1 text-xs text-slate-400">
          {filter === 'unread' ? 'Tudo lido — ótimo!' : 'Sem itens para este filtro.'}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
export default function NotificationsView({
  notifications,
  unreadCount,
  totalCount,
  loading = false,
  onMarkRead,
  onMarkUnread,
  onMarkAllRead,
}: NotificationsViewProps) {
  const [readFilter, setReadFilter] = useState<NotificationFilter>('all')
  const [toneFilter, setToneFilter] = useState<ToneFilter>('all')
  const [page, setPage] = useState(1)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const readCount = Math.max(0, totalCount - unreadCount)

  // Tone counts
  const toneCounts = useMemo(() => {
    const base = readFilter === 'unread'
      ? notifications.filter((n) => !n.readAt)
      : readFilter === 'read'
        ? notifications.filter((n) => Boolean(n.readAt))
        : notifications
    return {
      all: base.length,
      danger: base.filter((n) => n.tone === 'danger').length,
      warning: base.filter((n) => n.tone === 'warning').length,
      info: base.filter((n) => n.tone === 'info').length,
    }
  }, [notifications, readFilter])

  const filtered = useMemo(() => {
    let items = notifications
    if (readFilter === 'unread') items = items.filter((n) => !n.readAt)
    if (readFilter === 'read') items = items.filter((n) => Boolean(n.readAt))
    if (toneFilter !== 'all') items = items.filter((n) => n.tone === toneFilter)
    return items
  }, [notifications, readFilter, toneFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [readFilter, toneFilter, notifications.length])

  async function act(id: string, fn: (id: string) => Promise<void>) {
    setPendingId(id)
    try { await fn(id) } finally { setPendingId(null) }
  }

  async function markAll() {
    setMarkingAll(true)
    try { await onMarkAllRead() } finally { setMarkingAll(false) }
  }

  function changePage(next: number) {
    setPage(next)
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-slate-50 font-['DM_Sans',system-ui,sans-serif] text-slate-900">
      <div className="px-[clamp(16px,3vw,48px)] py-6 pb-16">

        {/* Header */}
        <PageTitleBar
          label="Central de notificações"
          title="Notificações"
          icon={<Bell />}
          actions={(
            <button
              type="button"
              onClick={markAll}
              disabled={unreadCount === 0 || markingAll}
              className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md border border-indigo-700 bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-white disabled:text-slate-400 disabled:shadow-none"
            >
              {markingAll
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Salvando...</>
                : <><CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas</>}
            </button>
          )}
        />

        {/* Two-column layout */}
        <div className="mt-6 flex items-start gap-5 lg:flex-row flex-col">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside
            className="w-full shrink-0 space-y-3 lg:sticky lg:top-6 lg:w-64"
            style={{ animation: 'fadeUp 340ms ease both' }}
          >
            {/* Stats */}
            <div className="space-y-2">
              <StatBlock label="Total" value={totalCount} icon={Bell} accent="#6366F1" loading={loading} />
              <StatBlock label="Não lidas" value={unreadCount} icon={BellDot} accent="#6366F1" loading={loading} />
              <StatBlock label="Lidas" value={readCount} icon={MailOpen} accent="#10B981" loading={loading} />
            </div>

            {/* Read/unread tabs */}
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <p className="flex items-center gap-1.5 border-b border-slate-100 px-3.5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <Filter className="h-3 w-3" /> Status
              </p>
              <div className="p-2 space-y-1">
                {([
                  { id: 'all' as const, label: 'Todas', icon: Inbox, count: totalCount },
                  { id: 'unread' as const, label: 'Não lidas', icon: Circle, count: unreadCount },
                  { id: 'read' as const, label: 'Lidas', icon: CheckCircle2, count: readCount },
                ] as const).map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setReadFilter(id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-all duration-150
                      ${readFilter === id
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-transparent text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">{label}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-black
                      ${readFilter === id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                      {loading ? '—' : count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone filter */}
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <p className="flex items-center gap-1.5 border-b border-slate-100 px-3.5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <SlidersHorizontal className="h-3 w-3" /> Tipo
              </p>
              <div className="p-2 space-y-1">
                {(['all', 'danger', 'warning', 'info'] as ToneFilter[]).map((t) => (
                  <TonePill
                    key={t}
                    tone={t}
                    count={loading ? 0 : toneCounts[t]}
                    active={toneFilter === t}
                    onClick={() => setToneFilter(t)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* ── Main list ───────────────────────────────────────── */}
          <div ref={listRef} className="min-w-0 flex-1" style={{ animation: 'fadeUp 400ms ease both' }}>

            {/* List header */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">
                {loading ? '—' : `${filtered.length} notificaç${filtered.length === 1 ? 'ão' : 'ões'}`}
              </p>
              {!loading && filtered.length > 0 && (
                <p className="text-xs text-slate-400">
                  Página {safePage} de {totalPages}
                </p>
              )}
            </div>

            {/* Cards */}
            <div className="space-y-2.5">
              {loading ? (
                <>
                  <SkeletonRow delay={0} />
                  <SkeletonRow delay={80} />
                  <SkeletonRow delay={160} />
                  <SkeletonRow delay={240} />
                </>
              ) : filtered.length === 0 ? (
                <div
                  className="rounded-2xl border border-slate-200 bg-white"
                  style={{ animation: 'cardIn 300ms ease both' }}
                >
                  <EmptyState filter={readFilter} />
                </div>
              ) : (
                paginated.map((n, i) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    pending={pendingId === n.id}
                    animDelay={i * 55}
                    onAction={() => act(n.id, Boolean(n.readAt) ? onMarkUnread : onMarkRead)}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {!loading && filtered.length > PAGE_SIZE && (
              <div
                className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3.5"
                style={{ animation: 'fadeUp 500ms ease both' }}
              >
                <button
                  type="button"
                  onClick={() => changePage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition-all duration-150 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => changePage(p)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all duration-150
                        ${p === safePage
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => changePage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition-all duration-150 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px) scale(.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}