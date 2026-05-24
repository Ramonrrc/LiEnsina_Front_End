import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  Filter,
  Info,
  MailOpen,
  Zap,
} from 'lucide-react'
import type { AppNotification } from '../types'

const TONES = ['all', 'info', 'warning', 'danger'] as const
type ToneFilter = (typeof TONES)[number]

interface NotificationsViewProps {
  notifications: AppNotification[]
  unreadCount: number
  totalCount: number
  loading?: boolean
  onMarkRead: (id: string) => Promise<void>
  onMarkUnread: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}

const TONE_META = {
  all: {
    label: 'Todos',
    pill: 'border-slate-200 bg-white text-slate-600',
    activePill: 'border-indigo-300 bg-indigo-50 text-indigo-700',
  },
  danger: {
    label: 'Crítico',
    pill: 'border-red-200 bg-red-50 text-red-700',
    activePill: 'border-red-300 bg-red-100 text-red-800',
    dot: 'bg-red-400',
    card: '#fff7f7',
    border: '#fecaca',
    hoverBorder: '#fca5a5',
    glow: '0 12px 28px rgba(239,68,68,0.10)',
  },
  warning: {
    label: 'Atenção',
    pill: 'border-amber-200 bg-amber-50 text-amber-700',
    activePill: 'border-amber-300 bg-amber-100 text-amber-800',
    dot: 'bg-amber-400',
    card: '#fffbeb',
    border: '#fde68a',
    hoverBorder: '#fcd34d',
    glow: '0 12px 28px rgba(245,158,11,0.10)',
  },
  info: {
    label: 'Info',
    pill: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    activePill: 'border-indigo-300 bg-indigo-100 text-indigo-800',
    dot: 'bg-indigo-400',
    card: '#f5f7ff',
    border: '#c7d2fe',
    hoverBorder: '#a5b4fc',
    glow: '0 12px 28px rgba(99,102,241,0.12)',
  },
} as const

function ToneIcon({ tone }: { tone: AppNotification['tone'] }) {
  if (tone === 'danger') return <Zap className="h-3.5 w-3.5" />
  if (tone === 'warning') return <AlertTriangle className="h-3.5 w-3.5" />
  return <Info className="h-3.5 w-3.5" />
}

function formatDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function NotifSkeleton() {
  return (
    <div
      className="animate-pulse space-y-3 rounded-2xl p-4"
      style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-20 rounded-full bg-slate-200" />
        <div className="h-3.5 w-14 rounded-full bg-slate-100" />
      </div>
      <div className="h-5 w-2/3 rounded-lg bg-slate-200" />
      <div className="space-y-1.5">
        <div className="h-3.5 w-full rounded bg-slate-100" />
        <div className="h-3.5 w-4/5 rounded bg-slate-100" />
      </div>
    </div>
  )
}

interface NotifCardProps {
  notification: AppNotification
  pending: boolean
  onMarkRead: (id: string) => void
  onMarkUnread: (id: string) => void
}

function NotifCard({ notification, pending, onMarkRead, onMarkUnread }: NotifCardProps) {
  const [hovered, setHovered] = useState(false)
  const tone = notification.tone ?? 'info'
  const meta = TONE_META[tone]
  const isRead = Boolean(notification.readAt)
  const createdAt = formatDate(notification.createdAt)

  function markRead() {
    if (!isRead && !pending) onMarkRead(notification.id)
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={markRead}
      onKeyDown={(event) => {
        if (isRead || pending) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onMarkRead(notification.id)
        }
      }}
      role={!isRead ? 'button' : undefined}
      tabIndex={!isRead ? 0 : undefined}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
      style={{
        borderRadius: 16,
        padding: '14px 16px',
        cursor: !isRead ? 'pointer' : 'default',
        background: isRead ? '#ffffff' : meta.card,
        border: `1px solid ${isRead ? '#e2e8f0' : hovered ? meta.hoverBorder : meta.border}`,
        boxShadow: !isRead && hovered ? meta.glow : '0 1px 2px rgba(15,23,42,0.04)',
        transition: 'all 0.15s ease',
        opacity: isRead ? 0.78 : 1,
      }}
    >
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {!isRead && (
            <span
              className={`h-2 w-2 flex-shrink-0 rounded-full ${meta.dot}`}
              style={{ boxShadow: '0 0 6px currentColor' }}
            />
          )}
          <span
            className={[
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3.5px]',
              'text-[9.5px] font-black uppercase tracking-[.15em]',
              meta.pill,
            ].join(' ')}
          >
            <ToneIcon tone={tone} />
            {meta.label}
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {createdAt && (
            <span className="text-[10.5px] font-semibold text-slate-400">
              {createdAt}
            </span>
          )}
          {!isRead ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onMarkRead(notification.id)
              }}
              disabled={pending}
              className="rounded-md px-2 py-[3px] text-[10px] font-black text-indigo-700 transition-all hover:bg-indigo-50 hover:text-indigo-800 disabled:opacity-40"
              style={{ border: '1px solid #c7d2fe' }}
            >
              {pending ? '...' : 'Lida'}
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onMarkUnread(notification.id)
              }}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-md px-2 py-[3px] text-[10px] font-black text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <MailOpen className="h-3 w-3" />
              {pending ? '...' : 'Não lida'}
            </button>
          )}
        </div>
      </div>

      <strong className="mb-1 block text-[14px] font-black leading-snug text-slate-950">
        {notification.title}
      </strong>
      <p className="text-[12px] font-semibold leading-[1.6] text-slate-600">
        {notification.description}
      </p>

      {!isRead && (
        <div
          className="mt-3 flex items-center gap-1.5 text-[10.5px] font-black text-indigo-700 transition-opacity duration-150"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          <ChevronRight className="h-3 w-3" />
          Clique para marcar como lida
        </div>
      )}
    </motion.article>
  )
}

export default function NotificationsView({
  notifications,
  unreadCount,
  totalCount,
  loading = false,
  onMarkRead,
  onMarkUnread,
  onMarkAllRead,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<ToneFilter>('all')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const unread = useMemo(() => notifications.filter((notification) => !notification.readAt), [notifications])
  const visible = useMemo(() => (
    filter === 'all'
      ? notifications
      : notifications.filter((notification) => notification.tone === filter)
  ), [filter, notifications])

  const toneStats = useMemo(() => ([
    { tone: 'danger' as const, count: notifications.filter((notification) => notification.tone === 'danger' && !notification.readAt).length },
    { tone: 'warning' as const, count: notifications.filter((notification) => notification.tone === 'warning' && !notification.readAt).length },
    { tone: 'info' as const, count: notifications.filter((notification) => notification.tone === 'info' && !notification.readAt).length },
  ]), [notifications])

  async function handleMarkRead(id: string) {
    setPendingId(id)
    try {
      await onMarkRead(id)
    } finally {
      setPendingId(null)
    }
  }

  async function handleMarkUnread(id: string) {
    setPendingId(id)
    try {
      await onMarkUnread(id)
    } finally {
      setPendingId(null)
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true)
    try {
      await onMarkAllRead()
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div
      className="relative flex min-h-[calc(100vh-80px)] flex-col overflow-hidden font-['DM_Sans',system-ui,sans-serif]"
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
      }}
    >
      <div className="relative z-10 flex-shrink-0 bg-white/80 px-[clamp(16px,3vw,32px)] pb-5 pt-6 backdrop-blur" style={{ borderBottom: '1px solid #e2e8f0' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] text-white"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                border: '1.5px solid rgba(99,102,241,0.6)',
                boxShadow: '0 6px 20px rgba(79,70,229,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-0.5 text-[9.5px] font-black uppercase tracking-[.18em] text-indigo-600">
                Central de alertas
              </p>
              <h1 className="font-['Sora',system-ui,sans-serif] text-[22px] font-black leading-tight tracking-tight text-slate-950">
                Notificações
              </h1>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 pt-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={markingAll}
                className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-black text-slate-700 transition-all hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-50"
                style={{ border: '1px solid #c7d2fe' }}
              >
                <CheckCheck className="h-4 w-4" />
                {markingAll ? 'Marcando...' : 'Marcar todas lidas'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {toneStats.filter((stat) => stat.count > 0).map(({ tone, count }) => (
            <div
              key={tone}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: TONE_META[tone].card,
                border: `1px solid ${TONE_META[tone].border}`,
              }}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${TONE_META[tone].dot}`} />
              <span className="text-[10.5px] font-black text-slate-700">
                {count} {TONE_META[tone].label.toLowerCase()}
              </span>
            </div>
          ))}
          {unread.length === 0 && (
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10.5px] font-black text-emerald-700">Tudo lido</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <div className="flex flex-wrap gap-1.5">
            {TONES.map((tone) => {
              const meta = TONE_META[tone]
              const active = filter === tone
              const count = tone === 'all'
                ? totalCount
                : notifications.filter((notification) => notification.tone === tone).length

              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setFilter(tone)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10.5px] font-black transition-all duration-150',
                    active ? meta.activePill : meta.pill,
                  ].join(' ')}
                >
                  {tone !== 'all' && <ToneIcon tone={tone} />}
                  {meta.label}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none"
                    style={{
                      background: active ? 'rgba(79,70,229,0.12)' : 'rgba(15,23,42,0.06)',
                    }}
                  >
                    {loading ? '...' : count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="notif-scroll relative z-10 flex-1 overflow-y-auto p-[clamp(16px,3vw,32px)]"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.25) transparent' }}
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <NotifSkeleton key={index} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 rounded-2xl px-8 py-16 text-center"
            style={{ border: '1px dashed #c7d2fe', background: '#ffffff' }}
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-slate-400"
              style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
            >
              {unread.length === 0 ? (
                <BellOff className="h-7 w-7" />
              ) : (
                <Bell className="h-7 w-7" />
              )}
            </span>
            <div>
              <p className="text-[15px] font-black text-slate-700">
                {filter === 'all' ? 'Nenhuma notificação' : `Sem alertas do tipo "${TONE_META[filter].label}"`}
              </p>
              <p className="mt-1 text-[12px] font-semibold text-slate-400">
                {filter !== 'all' ? 'Experimente outro filtro acima.' : 'Tudo em ordem por aqui.'}
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((notification) => (
                <NotifCard
                  key={notification.id}
                  notification={notification}
                  pending={pendingId === notification.id}
                  onMarkRead={handleMarkRead}
                  onMarkUnread={handleMarkUnread}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!loading && notifications.length > 0 && (
        <div className="relative z-10 flex-shrink-0 bg-white/80 px-6 py-4 backdrop-blur" style={{ borderTop: '1px solid #e2e8f0' }}>
          <p className="text-center text-[11px] font-semibold text-slate-400">
            {totalCount} notificação{totalCount === 1 ? '' : 'ões'} no total -{' '}
            {unreadCount === 0
              ? 'todas lidas'
              : `${unreadCount} não lida${unreadCount === 1 ? '' : 's'}`}
          </p>
        </div>
      )}

      <style>{`
        .notif-scroll::-webkit-scrollbar { width: 4px; }
        .notif-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 4px; }
      `}</style>
    </div>
  )
}
