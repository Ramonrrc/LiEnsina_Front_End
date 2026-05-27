import { motion, AnimatePresence } from 'motion/react'
import { X, Wifi } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

import { cn } from '../../lib/cn'
import type { navItems } from '../../data'
import type { AppSection } from '../../types'

type NavItem = (typeof navItems)[number]

interface SidebarProps {
  appName: string
  items: NavItem[]
  activeSection: AppSection
  mobileOpen: boolean
  collapsed: boolean
  onSectionChange: (section: AppSection) => void
  onCloseMobile: () => void
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonItem({ compact, delay = 0 }: { compact: boolean; delay?: number }) {
  return (
    <motion.div
      className={cn(
        'mb-[3px] flex items-center rounded-xl',
        compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.45, 0.2, 0.45, 0] }}
      transition={{ delay, duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        background: 'rgba(99,102,241,0.05)',
        border: '1px solid rgba(99,102,241,0.07)',
      }}
    >
      <div
        className="shrink-0 rounded-[10px]"
        style={{ width: 34, height: 34, background: 'rgba(99,102,241,0.07)' }}
      />
      {!compact && (
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-2.5 rounded-full" style={{ width: '55%', background: 'rgba(99,102,241,0.07)' }} />
          <div className="h-2 rounded-full" style={{ width: '38%', background: 'rgba(99,102,241,0.05)' }} />
        </div>
      )}
    </motion.div>
  )
}

// ─── Group label ──────────────────────────────────────────────────────────────

function NavGroupLabel({ label, compact }: { label: string; compact: boolean }) {
  if (compact) {
    return (
      <div
        className="mx-auto my-3 h-px w-5"
        style={{ background: 'rgba(99,102,241,0.18)' }}
      />
    )
  }
  return (
    <div className="mb-1 mt-4 flex items-center gap-2 px-3 first:mt-2">
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.20em',
          textTransform: 'uppercase' as const,
          color: 'rgba(99,102,241,0.50)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'rgba(99,102,241,0.10)' }} />
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ count, compact }: { count?: number; compact: boolean }) {
  if (!count) return null
  if (compact) {
    return (
      <span
        className="absolute right-1.5 top-1.5 block rounded-full"
        style={{
          width: 6,
          height: 6,
          background: '#4F46E5',
          boxShadow: '0 0 0 2px #f8f7ff',
        }}
      />
    )
  }
  return (
    <span
      className="ml-auto shrink-0 rounded-md px-2 py-0.5"
      style={{
        fontSize: '10px',
        fontWeight: 700,
        fontFamily: "'DM Sans', sans-serif",
        background: '#EEF2FF',
        border: '1px solid #C7D2FE',
        color: '#4338CA',
        lineHeight: 1.4,
      }}
    >
      {count}
    </span>
  )
}

// ─── NavButton ────────────────────────────────────────────────────────────────

function NavButton({
  item,
  active,
  compact,
  index,
  onSectionChange,
  btnRef: btnRefProp,
}: {
  item: NavItem
  active: boolean
  compact: boolean
  index: number
  onSectionChange: (section: AppSection) => void
  btnRef: (el: HTMLButtonElement | null) => void
}) {
  const Icon = item.icon
  const localRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = localRef.current
    if (!el) return
    el.style.background = 'transparent'
    el.style.borderColor = 'transparent'
  }, [active])

  const setRefs = (el: HTMLButtonElement | null) => {
    ;(localRef as React.MutableRefObject<HTMLButtonElement | null>).current = el
    btnRefProp(el)
  }

  return (
    <button
      ref={setRefs}
      type="button"
      onClick={() => onSectionChange(item.id)}
      aria-label={item.label}
      title={compact ? item.label : undefined}
      className={cn(
        'group relative mb-[3px] flex w-full items-center rounded-xl text-left',
        compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
      )}
      style={{ background: 'transparent', border: '1px solid transparent' }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(99,102,241,0.05)'
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.10)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
        }
      }}
    >
      {/* Indicador lateral ativo */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 3,
          height: active ? '50%' : '0%',
          borderRadius: '0 3px 3px 0',
          background: 'rgba(255,255,255,0.70)',
          opacity: active ? 1 : 0,
          transition: 'height 0.24s cubic-bezier(0.34,1.56,0.64,1), opacity 0.20s ease',
          zIndex: 1,
        }}
      />

      {/* Ícone */}
      <span
        className="relative flex shrink-0 items-center justify-center rounded-[10px]"
        style={{
          width: 34,
          height: 34,
          background: active
            ? 'rgba(255,255,255,0.22)'
            : 'rgba(99,102,241,0.06)',
          border: active
            ? '1px solid rgba(255,255,255,0.30)'
            : '1px solid rgba(99,102,241,0.09)',
          boxShadow: active
            ? 'inset 0 1px 0 rgba(255,255,255,0.25)'
            : 'none',
          transition: 'background 0.20s ease, border-color 0.20s ease, box-shadow 0.20s ease',
        }}
      >
        <Icon
          style={{
            width: 15,
            height: 15,
            color: active ? '#ffffff' : 'rgba(99,102,241,0.40)',
            transition: 'color 0.20s ease',
          }}
        />
        {compact && <Badge count={(item as any).badge} compact />}
      </span>

      {/* Labels */}
      {!compact && (
        <span className="min-w-0 flex-1">
          <span
            className="block truncate"
            style={{
              fontSize: '13px',
              fontWeight: active ? 600 : 500,
              color: active ? '#ffffff' : '#6B7280',
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: active ? '-0.20px' : '0',
              transition: 'color 0.20s ease',
            }}
          >
            {item.label}
          </span>
          <span
            className="block truncate"
            style={{
              fontSize: '11px',
              color: active ? 'rgba(255,255,255,0.65)' : '#9CA3AF',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'color 0.20s ease',
            }}
          >
            {item.description}
          </span>
        </span>
      )}

      {!compact && <Badge count={(item as any).badge} compact={false} />}
    </button>
  )
}

// ─── SidebarPanel ─────────────────────────────────────────────────────────────

function SidebarPanel({
  appName,
  items,
  activeSection,
  onSectionChange,
  collapsed = false,
  mobile = false,
  onRequestClose,
}: Omit<SidebarProps, 'mobileOpen' | 'onCloseMobile'> & {
  mobile?: boolean
  onRequestClose?: () => void
}) {
  const compact = collapsed && !mobile
  const [loading, setLoading] = useState(true)
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [pillY, setPillY] = useState<number | null>(null)
  const [pillH, setPillH] = useState(0)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const btn = btnRefs.current.get(activeSection)
    const nav = navRef.current
    if (!btn || !nav) return
    const btnRect = btn.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    setPillY(btnRect.top - navRect.top + nav.scrollTop)
    setPillH(btnRect.height)
  }, [activeSection, loading, compact])

  const setRef = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) btnRefs.current.set(id, el)
    else btnRefs.current.delete(id)
  }

  const grouped = items.reduce<{ label: string | null; items: NavItem[] }[]>((acc, item) => {
    const g = (item as any).group ?? null
    const last = acc[acc.length - 1]
    if (last && last.label === g) last.items.push(item)
    else acc.push({ label: g, items: [item] })
    return acc
  }, [])

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: '#f8f7ff',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Camadas de textura / profundidade ── */}

      {/* Borda direita com gradiente sutil */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0 w-px"
        aria-hidden
        style={{
          background: 'linear-gradient(to bottom, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.18) 40%, rgba(99,102,241,0.08) 100%)',
        }}
      />

      {/* Brilho topo */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-48"
        aria-hidden
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(224,231,255,0.70) 0%, transparent 100%)',
        }}
      />

      {/* Brilho bottom suave */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32"
        aria-hidden
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% 100%, rgba(238,242,255,0.60) 0%, transparent 100%)',
        }}
      />

      {/* Grid pontilhado finíssimo */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(99,102,241,0.20) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.30,
        }}
      />

      {/* ── Header ── */}
      <motion.div
        className="relative z-10 px-4 py-4"
        style={{ borderBottom: '1px solid rgba(99,102,241,0.10)' }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Linha de acento topo */}
        <div
          className="absolute left-0 right-0 top-0 h-0.5"
          style={{
            background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            borderRadius: '0 0 2px 2px',
          }}
        />

        <div className={cn('flex items-center', compact ? 'justify-center' : 'justify-between')}>
          <button
            type="button"
            onClick={() => onSectionChange('dashboard')}
            className={cn('flex min-w-0 items-center text-left', compact ? 'justify-center' : 'gap-3')}
            aria-label={appName}
          >
            <motion.div
              className="relative grid shrink-0 place-items-center rounded-xl"
              style={{
                width: 38,
                height: 38,
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #818cf8 100%)',
                border: '1px solid rgba(99,102,241,0.30)',
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.90) inset, 0 2px 8px rgba(79,70,229,0.22)',
                fontSize: 12,
                fontWeight: 800,
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.04em',
              }}
              whileHover={{
                scale: 1.05,
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.95) inset, 0 4px 14px rgba(79,70,229,0.32)',
              }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            >
              {appName.slice(0, 2).toUpperCase()}
              {/* Dot dourado */}
              <span
                className="absolute -right-0.5 -top-0.5 block rounded-full"
                style={{
                  width: 7,
                  height: 7,
                  background: '#f0c860',
                  border: '1.5px solid #f8f7ff',
                  boxShadow: '0 0 6px rgba(240,200,96,0.80)',
                  animation: 'sbGoldDot 2.6s ease-in-out infinite',
                }}
              />
            </motion.div>

            <div
              className={cn(
                'min-w-0 transition-all duration-300',
                compact ? 'pointer-events-none w-0 overflow-hidden opacity-0' : 'opacity-100',
              )}
            >
              <p
                className="truncate"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '-0.2px',
                  color: '#1e1b4b',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {appName}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="inline-block rounded-sm px-1.5 py-px"
                  style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    background: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    color: '#4338CA',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Operação Escolar
                </span>
              </div>
            </div>
          </button>

          {mobile && onRequestClose && (
            <motion.button
              type="button"
              onClick={onRequestClose}
              className="grid place-items-center rounded-lg transition-colors"
              style={{
                width: 32,
                height: 32,
                border: '1px solid rgba(99,102,241,0.15)',
                background: 'rgba(99,102,241,0.05)',
                color: 'rgba(99,102,241,0.55)',
                flexShrink: 0,
              }}
              whileHover={{ color: '#4338ca', background: 'rgba(99,102,241,0.10)' }}
              whileTap={{ scale: 0.92 }}
              aria-label="Fechar menu"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ── Nav ── */}
      <nav
        ref={navRef}
        className={cn(
          'relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-2',
          compact ? 'px-2.5' : 'px-3',
        )}
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(99,102,241,0.18) transparent' }}
      >
        {/* Pill deslizante (active indicator) */}
        {!loading && pillY !== null && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute rounded-xl"
            style={{
              top: 0,
              left: compact ? 10 : 12,
              right: compact ? 10 : 12,
              height: pillH,
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 60%, #818cf8 100%)',
              boxShadow:
                '0 2px 8px rgba(79,70,229,0.28), 0 6px 20px rgba(79,70,229,0.18), inset 0 1px 0 rgba(255,255,255,0.18)',
              border: '1px solid rgba(99,102,241,0.40)',
              zIndex: 0,
            }}
            animate={{ y: pillY }}
            transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.6 }}
          />
        )}

        {loading ? (
          <div>
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonItem key={i} compact={compact} delay={i * 0.07} />
            ))}
          </div>
        ) : (
          <div>
            {grouped.map(group => (
              <div key={group.label ?? '__default'}>
                {group.label && <NavGroupLabel label={group.label} compact={compact} />}
                {group.items.map((item, idx) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={item.id === activeSection}
                    compact={compact}
                    index={idx}
                    onSectionChange={onSectionChange}
                    btnRef={setRef(item.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* ── Footer ── */}
      <motion.div
        className="relative z-10 px-3 pb-4 pt-2"
        style={{ borderTop: '1px solid rgba(99,102,241,0.08)' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.50, duration: 0.36 }}
      >
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl transition-all duration-200',
            compact ? 'justify-center px-0 py-2.5' : 'px-3 py-3',
          )}
          style={{
            background: 'linear-gradient(110deg, rgba(5,150,105,0.07), rgba(6,95,70,0.04))',
            border: '1px solid rgba(52,211,153,0.22)',
          }}
        >
          <span
            className="relative grid shrink-0 place-items-center rounded-lg"
            style={{
              width: 30,
              height: 30,
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.22)',
            }}
            aria-hidden
          >
            <Wifi style={{ width: 13, height: 13, color: '#059669' }} />
            <span
              className="absolute -right-0.5 -top-0.5 block rounded-full"
              style={{
                width: 7,
                height: 7,
                background: '#10b981',
                border: '1.5px solid #f8f7ff',
                boxShadow: '0 0 5px rgba(16,185,129,0.70)',
                animation: 'sbPulse 2.4s ease-in-out infinite',
              }}
            />
          </span>
          <div className={cn('min-w-0', compact && 'hidden')}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#065f46',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Rede sincronizada
            </p>
            <p
              style={{
                fontSize: '10.5px',
                fontWeight: 400,
                color: '#6ee7b7',
                fontFamily: "'DM Sans', sans-serif",
                marginTop: 1,
              }}
            >
              API escolar ativa
            </p>
          </div>
        </div>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes sbPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.50); opacity: 0.45; }
        }
        @keyframes sbGoldDot {
          0%, 100% { box-shadow: 0 0 4px rgba(240,200,96,0.65); }
          50% { box-shadow: 0 0 10px rgba(240,200,96,0.95); }
        }
        nav::-webkit-scrollbar { width: 2px; }
        nav::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,0.18);
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}

// ─── Sidebar (export) ─────────────────────────────────────────────────────────

export function Sidebar({
  appName,
  items,
  activeSection,
  mobileOpen,
  collapsed,
  onSectionChange,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'hidden h-screen flex-shrink-0 transition-[width] duration-300 ease-out lg:sticky lg:top-0 lg:flex',
          collapsed ? 'w-[72px]' : 'w-[264px]',
        )}
        style={{
          borderRight: '1px solid rgba(99,102,241,0.12)',
          boxShadow: '1px 0 0 rgba(99,102,241,0.06), 4px 0 16px rgba(99,102,241,0.04)',
        }}
      >
        <SidebarPanel
          appName={appName}
          items={items}
          activeSection={activeSection}
          collapsed={collapsed}
          onSectionChange={onSectionChange}
        />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(30,27,75,0.50)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.20 }}
            onClick={onCloseMobile}
          >
            <motion.aside
              className="h-full w-[280px] max-w-[88vw]"
              style={{
                boxShadow:
                  '8px 0 40px rgba(79,70,229,0.14), 1px 0 0 rgba(99,102,241,0.12)',
              }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
            >
              <SidebarPanel
                appName={appName}
                items={items}
                activeSection={activeSection}
                collapsed={false}
                onSectionChange={onSectionChange}
                mobile
                onRequestClose={onCloseMobile}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}