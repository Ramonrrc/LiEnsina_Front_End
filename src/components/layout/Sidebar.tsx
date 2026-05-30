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
    <div
      className={cn(
        'sb-skeleton-item mb-[3px] flex items-center rounded-2xl overflow-hidden',
        compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
      )}
      style={{
        background: 'rgba(99,102,241,0.04)',
        border: '1px solid rgba(99,102,241,0.07)',
        animationDelay: `${delay}s`,
      }}
    >
      <div
        className="sb-shimmer-box shrink-0 rounded-xl relative overflow-hidden"
        style={{
          width: 34,
          height: 34,
          background: 'rgba(99,102,241,0.07)',
          ['--shimmer-delay' as string]: `${delay + 0.3}s`,
        }}
      />
      {!compact && (
        <div className="flex flex-1 flex-col gap-2">
          <div
            className="sb-shimmer-box h-2.5 rounded-full relative overflow-hidden"
            style={{
              width: '55%',
              background: 'rgba(99,102,241,0.07)',
              ['--shimmer-delay' as string]: `${delay + 0.5}s`,
            }}
          />
          <div
            className="h-2 rounded-full"
            style={{ width: '38%', background: 'rgba(99,102,241,0.05)' }}
          />
        </div>
      )}
    </div>
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
    <div className="mb-1 mt-5 flex items-center gap-2 px-3 first:mt-2">
      <span
        style={{
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase' as const,
          color: 'rgba(99,102,241,0.40)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'rgba(99,102,241,0.09)' }} />
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
          background: '#6366f1',
          boxShadow: '0 0 0 2px #f4f3fe',
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
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'rgba(99,102,241,0.10)',
        border: '1px solid rgba(99,102,241,0.18)',
        color: '#4f46e5',
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
  animDelay,
  onSectionChange,
  btnRef: btnRefProp,
}: {
  item: NavItem
  active: boolean
  compact: boolean
  animDelay: number
  onSectionChange: (section: AppSection) => void
  btnRef: (el: HTMLButtonElement | null) => void
}) {
  const Icon = item.icon

  return (
    <button
      ref={btnRefProp}
      type="button"
      onClick={() => onSectionChange(item.id)}
      aria-label={item.label}
      title={compact ? item.label : undefined}
      className={cn(
        'sb-nav-item group relative mb-[3px] flex w-full items-center rounded-2xl text-left',
        compact ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
        active && 'active',
      )}
      style={{ animationDelay: `${animDelay}s` }}
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
      <span aria-hidden className="sb-nav-item-indicator" />

      {/* Ícone */}
      <span className="sb-nav-item-icon relative flex shrink-0 items-center justify-center rounded-xl">
        <Icon style={{ width: 15, height: 15 }} />
        {compact && <Badge count={(item as any).badge} compact />}
      </span>

      {/* Labels */}
      {!compact && (
        <span className="min-w-0 flex-1">
          <span className="sb-nav-item-label block truncate">{item.label}</span>
          <span className="sb-nav-item-desc block truncate">{item.description}</span>
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
  const pillRef = useRef<HTMLSpanElement>(null)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (loading) return
    const btn = btnRefs.current.get(activeSection)
    const nav = navRef.current
    const pill = pillRef.current
    if (!btn || !nav || !pill) return

    const btnRect = btn.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    const top = btnRect.top - navRect.top + nav.scrollTop
    pill.style.top = `${top}px`
    pill.style.height = `${btnRect.height}px`
    pill.style.opacity = '1'
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
      className="sb-root relative flex h-full w-full flex-col overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* ── Camadas decorativas ── */}
      <div className="sb-layer-mesh pointer-events-none absolute inset-x-0 top-0 z-0" aria-hidden />
      <div className="sb-layer-dots pointer-events-none absolute inset-0 z-0" aria-hidden />
      <div className="sb-layer-glow pointer-events-none absolute inset-x-0 bottom-0 z-0 h-40" aria-hidden />
      <div className="sb-layer-border pointer-events-none absolute inset-y-0 right-0 z-0 w-px" aria-hidden />

      {/* ── Header ── */}
      <motion.div
        className="sb-header relative z-10 px-4 py-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="sb-header-sweep absolute left-0 right-0 top-0 h-[2px] overflow-hidden" aria-hidden>
          <div className="sb-header-sweep-inner absolute inset-0" />
        </div>

        <div className={cn('flex items-center', compact ? 'justify-center' : 'justify-between')}>
          <button
            type="button"
            onClick={() => onSectionChange('dashboard')}
            className={cn('flex min-w-0 items-center text-left', compact ? 'justify-center' : 'gap-3')}
            aria-label={appName}
          >
            <motion.div
              className="sb-logo relative grid shrink-0 place-items-center rounded-2xl"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            >
              {appName.slice(0, 2).toUpperCase()}
              <span className="sb-logo-dot absolute -right-0.5 -top-0.5 block rounded-full" />
            </motion.div>

            <div
              className={cn(
                'min-w-0 transition-all duration-300',
                compact ? 'pointer-events-none w-0 overflow-hidden opacity-0' : 'opacity-100',
              )}
            >
              <p className="sb-app-name truncate">{appName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="sb-app-badge inline-block rounded-md px-1.5 py-px">
                  Operação Escolar
                </span>
              </div>
            </div>
          </button>

          {mobile && onRequestClose && (
            <motion.button
              type="button"
              onClick={onRequestClose}
              className="sb-close-btn grid place-items-center rounded-xl"
              whileHover={{ background: 'rgba(99,102,241,0.10)' }}
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
      >
        {/* Pill deslizante — CSS transition no lugar do Framer spring */}
        <span
          ref={pillRef}
          aria-hidden
          className="sb-pill pointer-events-none absolute rounded-2xl"
          style={{
            left: compact ? 10 : 12,
            right: compact ? 10 : 12,
            opacity: 0,
          }}
        />

        {loading ? (
          <div>
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonItem key={i} compact={compact} delay={i * 0.12} />
            ))}
          </div>
        ) : (
          <div>
            {grouped.map(group => {
              let delay = 0
              return (
                <div key={group.label ?? '__default'}>
                  {group.label && <NavGroupLabel label={group.label} compact={compact} />}
                  {group.items.map((item, idx) => {
                    const d = delay
                    delay += 0.04
                    return (
                      <NavButton
                        key={item.id}
                        item={item}
                        active={item.id === activeSection}
                        compact={compact}
                        animDelay={d}
                        onSectionChange={onSectionChange}
                        btnRef={setRef(item.id)}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </nav>

      {/* ── Footer ── */}
      <motion.div
        className="sb-footer relative z-10 px-3 pb-4 pt-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.36 }}
      >
        <div
          className={cn(
            'sb-footer-card relative flex items-center gap-3 rounded-2xl overflow-hidden',
            compact ? 'justify-center px-0 py-2.5' : 'px-3 py-3',
          )}
        >
          <div className="sb-footer-shimmer absolute left-3 right-3 top-0 h-px" aria-hidden />
          <span className="sb-footer-icon relative grid shrink-0 place-items-center rounded-xl" aria-hidden>
            <Wifi style={{ width: 14, height: 14 }} />
            <span className="sb-footer-dot absolute -right-0.5 -top-0.5 block rounded-full" />
          </span>
          <div className={cn('min-w-0', compact && 'hidden')}>
            <p className="sb-footer-title">Rede sincronizada</p>
            <p className="sb-footer-sub">API escolar ativa</p>
          </div>
        </div>
      </motion.div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        /* ── Keyframes — CSS puro, sem Framer Motion ── */

        @keyframes sbPulse {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50%       { transform: scale(1.45); opacity: 0.45; box-shadow: 0 0 0 4px rgba(16,185,129,0); }
        }
        @keyframes sbGoldDot {
          0%, 100% { box-shadow: 0 0 3px rgba(240,200,64,0.60), 0 0 0 0 rgba(240,200,64,0.25); }
          50%       { box-shadow: 0 0 8px rgba(240,200,64,1.00), 0 0 0 4px rgba(240,200,64,0); }
        }
        @keyframes sbSweep {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes sbShimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes sbSkeletonPulse {
          0%, 100% { opacity: 0.45; }
          50%       { opacity: 0.85; }
        }
        @keyframes sbFadeSlideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* ── Root ── */
        .sb-root { background: #f4f3fe; }

        /* ── Decorative layers ── */
        .sb-layer-mesh {
          height: 55%;
          background:
            radial-gradient(ellipse 140% 60% at 60% -10%, rgba(165,180,252,0.28) 0%, transparent 70%),
            radial-gradient(ellipse 80% 40% at 10% 20%, rgba(196,181,253,0.18) 0%, transparent 60%);
        }
        .sb-layer-dots {
          background-image: radial-gradient(circle, rgba(99,102,241,0.16) 1px, transparent 1px);
          background-size: 22px 22px;
          opacity: 0.28;
        }
        .sb-layer-glow {
          background: radial-gradient(ellipse 80% 80% at 50% 110%, rgba(224,231,255,0.50) 0%, transparent 100%);
        }
        .sb-layer-border {
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(99,102,241,0.14) 25%,
            rgba(99,102,241,0.22) 55%,
            rgba(99,102,241,0.10) 100%
          );
        }

        /* ── Header ── */
        .sb-header { border-bottom: 1px solid rgba(99,102,241,0.10); }
        .sb-header-sweep-inner {
          background: linear-gradient(90deg, #818cf8 0%, #6366f1 30%, #a78bfa 60%, #6366f1 80%, #818cf8 100%);
          background-size: 200% 100%;
          animation: sbSweep 4s linear infinite;
        }

        /* ── Logo ── */
        .sb-logo {
          width: 40px; height: 40px;
          background: linear-gradient(145deg, #4338ca 0%, #4f46e5 45%, #6366f1 75%, #818cf8 100%);
          border: 1px solid rgba(99,102,241,0.32);
          box-shadow: 0 1px 0 rgba(255,255,255,0.88) inset, 0 3px 12px rgba(79,70,229,0.26);
          font-size: 12px; font-weight: 800; color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          letter-spacing: 0.06em;
        }
        .sb-logo-dot {
          width: 8px; height: 8px;
          background: radial-gradient(circle at 35% 30%, #fde68a, #f0c040);
          border: 1.5px solid #f4f3fe;
          animation: sbGoldDot 2.6s ease-in-out infinite;
        }

        /* ── App name / badge ── */
        .sb-app-name {
          font-size: 14px; font-weight: 700; letter-spacing: -0.25px;
          color: #1e1b4b; font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .sb-app-badge {
          font-size: 8px; font-weight: 700; letter-spacing: 0.18em;
          text-transform: uppercase;
          background: rgba(99,102,241,0.09); border: 1px solid rgba(99,102,241,0.18);
          color: #4338ca; font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* ── Close btn (mobile) ── */
        .sb-close-btn {
          width: 32px; height: 32px; flex-shrink: 0;
          border: 1px solid rgba(99,102,241,0.15);
          background: rgba(99,102,241,0.05);
          color: rgba(99,102,241,0.55);
        }

        /* ── Nav scroll ── */
        nav::-webkit-scrollbar { width: 2px; }
        nav::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.18); border-radius: 4px; }
        nav::-webkit-scrollbar-track { background: transparent; }

        /* ── Sliding pill — transition CSS (substitui Framer spring) ── */
        .sb-pill {
          top: 0;
          background: linear-gradient(135deg, #3730a3 0%, #4338ca 20%, #4f46e5 55%, #6366f1 80%, #818cf8 100%);
          box-shadow:
            0 2px 10px rgba(67,56,202,0.35),
            0 8px 24px rgba(67,56,202,0.20),
            inset 0 1px 0 rgba(255,255,255,0.20);
          border: 1px solid rgba(129,140,248,0.40);
          transition: top 0.32s cubic-bezier(0.34, 1.56, 0.64, 1),
                      height 0.20s ease,
                      opacity 0.16s ease;
        }

        /* ── Nav items ── */
        .sb-nav-item {
          background: transparent;
          border: 1px solid transparent;
          animation: sbFadeSlideIn 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .sb-nav-item-indicator {
          position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          width: 3px; height: 0%; border-radius: 0 3px 3px 0;
          background: rgba(255,255,255,0.80); opacity: 0; z-index: 1;
          transition: height 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.20s ease;
        }
        .sb-nav-item.active .sb-nav-item-indicator { height: 50%; opacity: 1; }

        .sb-nav-item-icon {
          width: 34px; height: 34px;
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.09);
          transition: background 0.20s ease, border-color 0.20s ease, box-shadow 0.20s ease;
        }
        .sb-nav-item.active .sb-nav-item-icon {
          background: rgba(255,255,255,0.22);
          border-color: rgba(255,255,255,0.30);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
        }
        .sb-nav-item-icon svg {
          color: rgba(99,102,241,0.45);
          transition: color 0.20s ease;
        }
        .sb-nav-item.active .sb-nav-item-icon svg { color: #ffffff; }

        .sb-nav-item-label {
          font-size: 13px; font-weight: 500;
          color: #5b5ea6; letter-spacing: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: color 0.20s ease;
        }
        .sb-nav-item.active .sb-nav-item-label {
          color: #ffffff; font-weight: 600; letter-spacing: -0.20px;
        }
        .sb-nav-item-desc {
          font-size: 11px; color: rgba(148,154,190,1);
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: color 0.20s ease;
        }
        .sb-nav-item.active .sb-nav-item-desc { color: rgba(255,255,255,0.65); }

        /* ── Skeleton — shimmer via CSS ::after (substitui motion.div) ── */
        .sb-skeleton-item {
          animation: sbSkeletonPulse 1.8s ease-in-out infinite;
        }
        .sb-shimmer-box::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(
            105deg,
            transparent 25%,
            rgba(255,255,255,0.22) 50%,
            transparent 75%
          );
          animation: sbShimmer 1.5s ease-in-out infinite;
          animation-delay: var(--shimmer-delay, 0s);
        }

        /* ── Footer ── */
        .sb-footer { border-top: 1px solid rgba(99,102,241,0.08); }
        .sb-footer-card {
          background: linear-gradient(120deg, rgba(5,150,105,0.07) 0%, rgba(6,95,70,0.04) 100%);
          border: 1px solid rgba(52,211,153,0.22);
        }
        .sb-footer-shimmer {
          background: linear-gradient(90deg, transparent, rgba(52,211,153,0.40), transparent);
        }
        .sb-footer-icon {
          width: 32px; height: 32px;
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(52,211,153,0.22);
        }
        .sb-footer-icon svg { color: #059669; }
        .sb-footer-dot {
          width: 7px; height: 7px;
          background: #10b981; border: 1.5px solid #f4f3fe;
          animation: sbPulse 2.4s ease-in-out infinite;
        }
        .sb-footer-title {
          font-size: 12px; font-weight: 600; color: #065f46;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .sb-footer-sub {
          font-size: 10.5px; color: #34d399; margin-top: 1px;
          font-family: 'Plus Jakarta Sans', sans-serif;
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
          boxShadow: '1px 0 0 rgba(99,102,241,0.06), 6px 0 20px rgba(99,102,241,0.05)',
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
            style={{ background: 'rgba(17,12,64,0.54)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.20 }}
            onClick={onCloseMobile}
          >
            <motion.aside
              className="h-full w-[280px] max-w-[88vw]"
              style={{
                boxShadow: '10px 0 44px rgba(79,70,229,0.16), 1px 0 0 rgba(99,102,241,0.12)',
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