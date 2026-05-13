import { useMemo, useState, useEffect, useRef, type ReactNode } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FileDown,
  GraduationCap,
  Info,
  School,
  Shield,
  Table2,
  TrendingUp,
  Users,
} from 'lucide-react'

import { formatClassGrade } from '../class-grade-options'
import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import type { AuditEvent, ClassRoom, DashboardPayload, Evaluation, RoleCode, School as SchoolType } from '../types'

/* ─── Palettes ──────────────────────────────────────────────────────────── */

const SUBJECT_COLORS = ['#4f46e5', '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#4f46e5', '#6366f1']
const PIE_COLORS = ['#4f46e5', '#8b5cf6', '#06b6d4', '#10b981']
const CHART_COLORS = { frequencia: '#10b981', desempenho: '#4f46e5' }

const METRIC_TONE = {
  blue:  { accent: 'bg-indigo-600', iconBg: 'bg-indigo-50 text-indigo-600', delta: 'text-indigo-600', border: 'border-indigo-400' },
  green: { accent: 'bg-emerald-500', iconBg: 'bg-emerald-50 text-emerald-600', delta: 'text-emerald-600', border: 'border-emerald-400' },
  amber: { accent: 'bg-amber-500', iconBg: 'bg-amber-50 text-amber-600', delta: 'text-amber-600', border: 'border-amber-400' },
  rose:  { accent: 'bg-rose-500', iconBg: 'bg-rose-50 text-rose-600', delta: 'text-rose-600', border: 'border-rose-400' },
} as const

const METRIC_ICONS = [Users, CalendarCheck, ClipboardList, Bell]

const ALERT_TONE = {
  danger:  { bg: 'bg-rose-50 border-rose-400', title: 'text-rose-800', desc: 'text-rose-600/80', icon: AlertCircle, counter: 'bg-rose-50 border-rose-400 text-rose-700' },
  warning: { bg: 'bg-amber-50 border-amber-400', title: 'text-amber-800', desc: 'text-amber-600/80', icon: AlertTriangle, counter: 'bg-amber-50 border-amber-400 text-amber-700' },
  info:    { bg: 'bg-indigo-50 border-indigo-400', title: 'text-indigo-800', desc: 'text-indigo-600/80', icon: Info, counter: 'bg-indigo-50 border-indigo-400 text-indigo-700' },
} as const

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function statusPill(status: string) {
  const map: Record<string, string> = {
    concluido:    'border-emerald-400 bg-emerald-50 text-emerald-800',
    ativo:        'border-emerald-400 bg-emerald-50 text-emerald-800',
    corrigindo:   'border-amber-400 bg-amber-50 text-amber-800',
    em_aplicacao: 'border-amber-400 bg-amber-50 text-amber-800',
    planejado:    'border-indigo-400 bg-indigo-50 text-indigo-800',
    pendente:     'border-indigo-400 bg-indigo-50 text-indigo-800',
  }
  const cls = map[status] ?? 'border-slate-400 bg-slate-50 text-slate-700'
  return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black tracking-wide uppercase ${cls}`
}

function statusProgress(corrected: number, participants: number) {
  const pct = participants > 0 ? Math.round((corrected / participants) * 100) : 0
  const color = pct === 100 ? '#10b981' : pct > 50 ? '#4f46e5' : pct > 0 ? '#f59e0b' : '#e2e8f0'
  return { pct, color }
}

/* ─── Skeleton ──────────────────────────────────────────────────────────── */

function Skel({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded-lg bg-indigo-100/60 ${className}`} style={{ animationDuration: '1.4s', ...style }} />
}

function SkeletonMetricCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-indigo-400/40 bg-white p-5">
      <div className="flex items-center justify-between"><Skel className="h-2.5 w-20" /><Skel className="h-8 w-8 rounded-xl" /></div>
      <Skel className="h-9 w-16" />
      <Skel className="h-2.5 w-28" />
    </div>
  )
}

/* ─── Legend ────────────────────────────────────────────────────────────── */

function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm">
          <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}

/* ─── Panel ─────────────────────────────────────────────────────────────── */

function Panel({ label, title, icon, badge, children, className = '', delay = 0 }: {
  label: string; title: string; icon?: ReactNode; badge?: ReactNode
  children: ReactNode; className?: string; delay?: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <section className={`overflow-hidden rounded-2xl border border-indigo-400/60 bg-white shadow-sm transition-all duration-500 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${className}`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-indigo-400/40 bg-slate-50/80 px-5 py-4">
        {icon && <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">{icon}</div>}
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-indigo-500">{label}</p>
          <h2 className="truncate font-['Sora',system-ui,sans-serif] text-[13px] font-bold leading-tight text-slate-900">{title}</h2>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ─── Animated horizontal bar row ──────────────────────────────────────── */

function HBarRow({ label, freq, perf }: { label: string; freq: number; perf: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [go, setGo] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); io.disconnect() } }, { threshold: 0.1 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="grid items-center gap-2" style={{ gridTemplateColumns: '112px 1fr 36px' }}>
      <span className="truncate text-[11px] font-bold text-slate-600">{label}</span>
      <div className="flex flex-col gap-1">
        <div className="h-2.5 overflow-hidden rounded bg-slate-100">
          <div className="h-full rounded transition-[width] duration-[900ms] ease-out" style={{ background: CHART_COLORS.frequencia, width: go ? `${freq}%` : '0%' }} />
        </div>
        <div className="h-2.5 overflow-hidden rounded bg-slate-100">
          <div className="h-full rounded transition-[width] duration-[900ms] ease-out" style={{ background: CHART_COLORS.desempenho, width: go ? `${perf}%` : '0%', transitionDelay: '120ms' }} />
        </div>
      </div>
      <span className="text-right text-[11px] font-black text-indigo-600">{freq}%</span>
    </div>
  )
}

/* ─── Animated subject column bar ───────────────────────────────────────── */

function SubjectBar({ name, pct, color }: { name: string; pct: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [go, setGo] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); io.disconnect() } }, { threshold: 0.1 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="flex flex-1 flex-col items-center gap-1.5" style={{ minWidth: 48 }}>
      <span className="text-[11px] font-black" style={{ color }}>{pct}%</span>
      <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-md bg-indigo-50" style={{ height: 120 }}>
        <div className="w-full rounded-t-md transition-[height] duration-[900ms] ease-out" style={{ background: color, height: go ? `${pct}%` : '0%' }} />
      </div>
      <span className="max-w-[64px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-[10px] font-bold text-slate-500">{name}</span>
    </div>
  )
}

/* ─── Donut chart ───────────────────────────────────────────────────────── */

function DonutChart({ data, total }: { data: Array<{ level: string; alunos: number }>; total: number }) {
  const R = 70; const C = 2 * Math.PI * R
  const [go, setGo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGo(true), 350); return () => clearTimeout(t) }, [])
  let cum = 0
  const segs = data.map((d, i) => { const pct = d.alunos / (total || 1); const offset = cum * C; cum += pct; return { ...d, pct, offset, color: PIE_COLORS[i % PIE_COLORS.length] } })
  return (
    <div className="relative mx-auto" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }} role="img" aria-label={`Distribuição de proficiência: ${segs.map((s) => `${s.level} ${Math.round(s.pct * 100)}%`).join(', ')}`}>
        <circle cx="90" cy="90" r={R} fill="none" stroke="#e8eaf6" strokeWidth="20" />
        {segs.map((s) => (
          <circle key={s.level} cx="90" cy="90" r={R} fill="none" stroke={s.color} strokeWidth="20" strokeLinecap="round"
            style={{ strokeDasharray: go ? `${s.pct * C} ${C}` : `0 ${C}`, strokeDashoffset: go ? -s.offset : 0, transition: 'stroke-dasharray .9s cubic-bezier(.23,1,.32,1), stroke-dashoffset .9s cubic-bezier(.23,1,.32,1)' }} />
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-['Sora',system-ui,sans-serif] text-[26px] font-black text-slate-900">{total.toLocaleString('pt-BR')}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">alunos</span>
      </div>
    </div>
  )
}

/* ─── Main ──────────────────────────────────────────────────────────────── */

interface DashboardViewProps {
  dashboard: DashboardPayload
  evaluations: Evaluation[]
  auditEvents: AuditEvent[]
  profile?: RoleCode
  schools?: SchoolType[]
  classes?: ClassRoom[]
  loading?: boolean
}

export default function DashboardView({ dashboard, evaluations, auditEvents, profile = 'ADMIN', schools = [], classes = [], loading = false }: DashboardViewProps) {
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('month')
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t) }, [])

  const activeEvaluations = evaluations.filter((e) => e.status !== 'concluido')
  const canViewAudit = profile === 'ADMIN'
  const dashboardTitle = profile === 'DIRETOR' ? 'Dashboard da escola' : profile === 'COORDENADOR' ? 'Dashboard pedagógico' : 'Dashboard geral'

  const subjectOptions = useMemo<CompactSelectOption[]>(
    () => [{ value: 'all', label: 'Todas as disciplinas' }, ...Array.from(new Set([...dashboard.subjectRadar.map((i) => i.subject), ...evaluations.map((e) => e.subject)])).filter(Boolean).map((s) => ({ value: s, label: s }))],
    [dashboard.subjectRadar, evaluations],
  )
  const schoolOptions = useMemo<CompactSelectOption[]>(
    () => [{ value: 'all', label: 'Todas as escolas' }, ...schools.map((s) => ({ value: s.id, label: s.name, description: s.city }))],
    [schools],
  )
  const classOptions = useMemo<CompactSelectOption[]>(
    () => [{ value: 'all', label: 'Todas as turmas' }, ...classes.filter((c) => schoolFilter === 'all' || c.schoolId === schoolFilter).map((c) => ({ value: c.id, label: c.name, description: `${formatClassGrade(c.grade)} - ${c.shift}` }))],
    [classes, schoolFilter],
  )

  const proficiencyTotal = dashboard.proficiencyDistribution.reduce((s, e) => s + e.alunos, 0)
  const alertCounts = useMemo(() => dashboard.alerts.reduce<Record<string, number>>((acc, a) => { acc[a.tone] = (acc[a.tone] ?? 0) + 1; return acc }, {}), [dashboard.alerts])
  const topSubjects = useMemo(() => [...dashboard.subjectRadar].sort((a, b) => b.acertos - a.acertos), [dashboard.subjectRadar])

  function exportDashboard(format: 'pdf' | 'excel') {
    if (format === 'pdf') { window.print(); return }
    const rows = dashboard.metrics.map((m) => [m.label, m.value, m.detail].join(';')).join('\n')
    const blob = new Blob([`Indicador;Valor;Detalhe\n${rows}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'dashboard.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const sel = 'min-h-10 rounded-xl border border-slate-400 bg-slate-50 px-3 text-sm font-semibold transition-colors hover:border-indigo-400 hover:bg-white'

  return (
    <div className="grid min-h-screen gap-5 bg-slate-100 px-[clamp(12px,2.5vw,40px)] py-6 pb-16 font-['DM_Sans',system-ui,sans-serif] text-slate-900"
      style={{ backgroundImage: 'radial-gradient(circle at 18% 0%,rgba(99,102,241,.07) 0%,transparent 50%)' }}>

      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
        <PageTitleBar label="Central pedagógica" title={dashboardTitle} icon={<BarChart3 />}
          actions={<div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-indigo-400 bg-indigo-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white shadow-sm"><TrendingUp className="h-3.5 w-3.5" />Ao vivo</div>} />
      </div>

      {/* Filters */}
      <div className={`grid gap-3 rounded-2xl border border-slate-400 bg-white p-4 shadow-sm transition-all duration-500 lg:grid-cols-[minmax(160px,1fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(130px,.8fr)_auto] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`} style={{ transitionDelay: '60ms' }}>
        <CompactSelect value={schoolFilter} options={schoolOptions} onChange={setSchoolFilter} dropdownWidth="trigger" className={sel} />
        <CompactSelect value={classFilter} options={classOptions} onChange={setClassFilter} dropdownWidth="trigger" className={sel} />
        <CompactSelect value={subjectFilter} options={subjectOptions} onChange={setSubjectFilter} dropdownWidth="trigger" className={sel} />
        <CompactSelect value={periodFilter} options={[{ value: 'week', label: 'Semana' }, { value: 'month', label: 'Mês' }, { value: 'year', label: 'Ano' }]} onChange={setPeriodFilter} dropdownWidth="trigger" className={sel} />
        <div className="flex gap-2">
          <button type="button" onClick={() => exportDashboard('pdf')} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-indigo-400 bg-indigo-50 px-3 text-xs font-black uppercase tracking-widest text-indigo-700 transition-all hover:bg-indigo-600 hover:text-white"><FileDown size={14} />PDF</button>
          <button type="button" onClick={() => exportDashboard('excel')} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-400 bg-emerald-50 px-3 text-xs font-black uppercase tracking-widest text-emerald-700 transition-all hover:bg-emerald-600 hover:text-white"><Table2 size={14} />CSV</button>
        </div>
      </div>

      {/* Metrics */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading ? [...Array(4)].map((_, i) => <SkeletonMetricCard key={i} />) : dashboard.metrics.map((metric, idx) => {
          const tone = METRIC_TONE[metric.tone]; const Icon = METRIC_ICONS[idx % METRIC_ICONS.length]
          return (
            <article key={metric.id} className={`group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-500 hover:-translate-y-0.5 hover:shadow-md ${tone.border} ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${120 + idx * 60}ms` }}>
              <div className={`absolute inset-x-0 top-0 h-[3px] ${tone.accent}`} />
              <div className="flex items-start justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-[.2em] text-slate-400">{metric.label}</span>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${tone.iconBg}`}><Icon className="h-4 w-4" /></span>
              </div>
              <strong className="font-['Sora',system-ui,sans-serif] text-[32px] font-black leading-none text-slate-950">{metric.value}</strong>
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${tone.delta}`}><span className={`h-1.5 w-1.5 rounded-full ${tone.accent}`} />{metric.detail}</div>
            </article>
          )
        })}
      </section>

      {/* Attendance + Donut */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,.5fr)]">
        <Panel label="Turmas" title="Frequência e desempenho por turma" icon={<School className="h-4 w-4" />}
          badge={<span className="rounded-lg border border-slate-400 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500">{dashboard.attendanceByClass.length} turmas</span>} delay={220}>
          {loading ? <div className="flex flex-col gap-3 py-2">{[80, 65, 90, 55, 72, 85].map((w, i) => (<div key={i} className="grid items-center gap-3" style={{ gridTemplateColumns: '110px 1fr 36px' }}><Skel className="h-3" /><div className="flex flex-col gap-1.5"><Skel className="h-2.5" style={{ width: `${w}%` }} /><Skel className="h-2.5" style={{ width: `${w * .85}%` }} /></div><Skel className="h-3 w-8" /></div>))}</div> : (
            <>
              <div className="mb-4"><Legend items={[{ label: 'Frequência', color: CHART_COLORS.frequencia }, { label: 'Desempenho', color: CHART_COLORS.desempenho }]} /></div>
              <div className="flex flex-col gap-3 overflow-y-auto rounded-xl border border-slate-400 bg-slate-50/80 p-4" style={{ maxHeight: 460 }}>
                {dashboard.attendanceByClass.map((item) => {
                  const perf = Math.max(0, Math.min(100, item.media <= 10 ? item.media * 10 : item.media))
                  return <HBarRow key={item.className} label={item.className} freq={item.frequencia} perf={perf} />
                })}
              </div>
            </>
          )}
        </Panel>

        <Panel label="TRI" title="Proficiência dos alunos" icon={<ClipboardList className="h-4 w-4" />} delay={300}>
          {loading ? <div className="flex h-64 items-center justify-center"><div className="h-36 w-36 animate-pulse rounded-full border-[20px] border-indigo-100" /></div> : (
            <>
              <DonutChart data={dashboard.proficiencyDistribution} total={proficiencyTotal} />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {dashboard.proficiencyDistribution.map((entry, i) => (
                  <span key={entry.level} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
                    <span className="h-2 w-2 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {entry.level} · {Math.round((entry.alunos / (proficiencyTotal || 1)) * 100)}%
                  </span>
                ))}
              </div>
            </>
          )}
        </Panel>
      </section>

      {/* Subject bars */}
      <Panel label="Disciplinas" title="Taxa de acerto por disciplina (%)" icon={<BookOpen className="h-4 w-4" />}
        badge={<span className="rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">Atualizado hoje</span>} delay={360}>
        {loading ? <div className="h-52 flex flex-col gap-3 py-2">{[80, 65, 90, 55].map((w, i) => (<div key={i} className="grid items-center gap-3" style={{ gridTemplateColumns: '110px 1fr 36px' }}><Skel className="h-3" /><Skel className="h-2.5" style={{ width: `${w}%` }} /><Skel className="h-3 w-8" /></div>))}</div> : (
          <div className="flex gap-5">
            <div className="flex flex-1 items-end gap-2 overflow-x-auto rounded-xl border border-slate-400 bg-slate-50/80 p-4" style={{ height: 200 }}>
              {dashboard.subjectRadar.map((s, i) => <SubjectBar key={s.subject} name={s.subject} pct={s.acertos} color={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />)}
            </div>
            <div className="flex w-44 shrink-0 flex-col gap-2">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-slate-400">Ranking</p>
              {topSubjects.slice(0, 3).map((s, i) => (
                <div key={s.subject} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${i === 0 ? 'border-indigo-400 bg-indigo-50' : i === 1 ? 'border-purple-400/60 bg-purple-50/60' : 'border-slate-400 bg-slate-50'}`}>
                  <span className={`text-base font-black ${i === 0 ? 'text-indigo-600' : i === 1 ? 'text-purple-500' : 'text-slate-400'}`}>{i + 1}</span>
                  <span className="flex-1 truncate text-[11px] font-bold text-slate-800">{s.subject}</span>
                  <span className={`text-[11px] font-black ${i === 0 ? 'text-indigo-600' : i === 1 ? 'text-purple-500' : 'text-slate-500'}`}>{s.acertos}%</span>
                </div>
              ))}
              {topSubjects.length > 0 && (
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-rose-400 bg-rose-50 px-3 py-2">
                  <ArrowDown className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                  <span className="flex-1 truncate text-[11px] font-bold text-rose-800">{topSubjects[topSubjects.length - 1]?.subject}</span>
                  <span className="text-[11px] font-black text-rose-600">{topSubjects[topSubjects.length - 1]?.acertos}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>

      {/* Alerts + Audit */}
      <section className={`grid gap-5 ${canViewAudit ? 'xl:grid-cols-2' : ''}`}>
        <Panel label="Alertas inteligentes" title="Risco pedagógico" icon={<Bell className="h-4 w-4" />}
          badge={dashboard.alerts.length > 0 ? <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400 bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700"><AlertTriangle className="h-3 w-3" />{dashboard.alerts.length} alertas</span> : null}
          delay={420}>
          <div className="mb-4 grid grid-cols-3 gap-3">
            {(['danger', 'warning', 'info'] as const).map((tone) => {
              const t = ALERT_TONE[tone]; const count = alertCounts[tone] ?? 0
              return (
                <div key={tone} className={`rounded-xl border py-3 text-center ${t.counter}`}>
                  <div className="text-xl font-black">{count}</div>
                  <div className="mt-0.5 text-[9px] font-black uppercase tracking-widest opacity-80">{tone === 'danger' ? 'Crítico' : tone === 'warning' ? 'Atenção' : 'Informativo'}</div>
                </div>
              )
            })}
          </div>
          <div className="flex flex-col gap-2">
            {dashboard.alerts.length > 0
              ? dashboard.alerts.map((alert) => {
                  const t = ALERT_TONE[alert.tone as keyof typeof ALERT_TONE] ?? ALERT_TONE.info; const AlertIcon = t.icon
                  return (
                    <div key={alert.id} className={`rounded-xl border p-3 ${t.bg}`}>
                      <strong className={`flex items-center gap-1.5 text-xs font-black ${t.title}`}><AlertIcon className="h-3.5 w-3.5 shrink-0" />{alert.title}</strong>
                      <span className={`mt-1 block text-[11px] leading-5 ${t.desc}`}>{alert.description}</span>
                    </div>
                  )
                })
              : <div className="rounded-xl border border-emerald-400 bg-emerald-50 p-4"><strong className="block text-xs font-black text-emerald-800">Tudo certo</strong><span className="mt-1 block text-[11px] text-emerald-600">Nenhuma turma em risco no escopo atual.</span></div>}
          </div>
        </Panel>

        {canViewAudit && (
          <Panel label="Auditoria do sistema" title="Últimas ações" icon={<Shield className="h-4 w-4" />} delay={480}>
            <div className="flex flex-col gap-2">
              {auditEvents.slice(0, 5).map((event, idx) => (
                <div key={event.id} className="group flex items-start gap-3 rounded-xl border border-slate-400 bg-slate-50 p-3.5 transition-all hover:border-indigo-400 hover:bg-indigo-50/50">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[11px] font-black text-indigo-700">{idx + 1}</div>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-[12px] font-black text-slate-900">{event.action}</strong>
                    <span className="block truncate text-[11px] text-slate-400">{event.actor} · {event.target}</span>
                    <small className="mt-0.5 block text-[10px] font-bold text-slate-400">{new Date(event.createdAt).toLocaleString('pt-BR')}</small>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </Panel>
        )}
      </section>

      {/* Table */}
      <Panel label="Simulados ativos" title="Fila de aplicação e correção" icon={<ClipboardList className="h-4 w-4" />}
        badge={<span className="rounded-lg border border-slate-400 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500">{activeEvaluations.length} ativos</span>}
        delay={540}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-slate-400">
                {['Título', 'Disciplina', 'Participantes', 'Corrigidos', 'Progresso', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[.16em] text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(4)].map((_, i) => (<tr key={i} className="border-b border-slate-200">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-4"><Skel className="h-3 w-20" /></td>)}</tr>))
                : activeEvaluations.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Nenhum simulado ativo no momento.</td></tr>
                  : activeEvaluations.map((ev) => {
                      const { pct, color } = statusProgress(ev.corrected, ev.participants)
                      return (
                        <tr key={ev.id} className="group border-b border-slate-200 transition-colors hover:bg-indigo-50/40">
                          <td className="px-4 py-3.5 text-[13px] font-bold text-slate-800">{ev.title}</td>
                          <td className="px-4 py-3.5 text-[13px] text-slate-500">{ev.subject}</td>
                          <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-700">{ev.participants}</td>
                          <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-700">{ev.corrected}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-100"><div className="h-full rounded transition-[width] duration-700" style={{ width: `${pct}%`, background: color }} /></div>
                              <span className="min-w-[28px] text-right text-[11px] font-black" style={{ color }}>{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5"><span className={statusPill(ev.status)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{ev.status.replace('_', ' ')}</span></td>
                        </tr>
                      )
                    })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}