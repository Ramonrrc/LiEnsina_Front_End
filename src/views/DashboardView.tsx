import type { ReactNode } from 'react'
import { AlertTriangle, ClipboardCheck, GraduationCap, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { AuditEvent, DashboardPayload, Evaluation } from '../types'

const pieColors = ['#4f46e5', '#7c3aed', '#0284c7', '#059669']

const metricTone = {
  blue: {
    icon: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    delta: 'text-indigo-700',
  },
  green: {
    icon: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    delta: 'text-emerald-700',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700 border-amber-200',
    delta: 'text-amber-700',
  },
  rose: {
    icon: 'bg-red-50 text-red-700 border-red-200',
    delta: 'text-red-700',
  },
} as const

function statusPillClass(status: string) {
  const tone =
    status === 'concluido' || status === 'ativo'
      ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
      : status === 'corrigindo' || status === 'em_aplicacao'
        ? 'border-amber-200 bg-amber-100 text-amber-800'
        : status === 'planejado' || status === 'pendente'
          ? 'border-sky-200 bg-sky-100 text-sky-800'
          : 'border-slate-300 bg-slate-50 text-slate-600'

  return `inline-flex min-h-7 items-center rounded-full border px-2.5 text-[12px] font-bold capitalize ${tone}`
}

function SectionPanel({
  label,
  title,
  icon,
  children,
  className = '',
}: {
  label: string
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-3 border-b border-slate-400 bg-slate-50 px-5 py-4">
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">{label}</p>
          <h2 className="truncate font-['Sora',system-ui,sans-serif] text-sm font-bold leading-tight text-slate-800">{title}</h2>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

interface DashboardViewProps {
  dashboard: DashboardPayload
  evaluations: Evaluation[]
  auditEvents: AuditEvent[]
}

export default function DashboardView({ dashboard, evaluations, auditEvents }: DashboardViewProps) {
  const activeEvaluations = evaluations.filter((evaluation) => evaluation.status !== 'concluido')

  return (
    <div className="grid min-h-screen gap-4 bg-slate-50 px-[clamp(12px,2.5vw,40px)] py-6 pb-12 font-['DM_Sans'] text-slate-900">
      <section className="flex items-center justify-between gap-4 rounded-xl border border-slate-400 bg-white px-5 py-3.5 shadow-sm max-[920px]:flex-col max-[920px]:items-start">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Central pedagogica</p>
          <h1 className="font-['Sora',system-ui,sans-serif] text-2xl font-black leading-tight text-slate-950">Dashboard da rede</h1>
          <p className="mt-1 max-w-[760px] text-sm leading-6 text-slate-500">
            Frequencia, desempenho, simulados e alertas em uma leitura unica para secretaria, direcao e coordenacao.
          </p>
        </div>

        <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] font-black uppercase tracking-widest text-indigo-700 max-[920px]:w-full">
          <TrendingUp className="h-4 w-4" />
          Atualizado pela API
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => {
          const tone = metricTone[metric.tone]

          return (
            <article
              key={metric.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-400 bg-white p-4 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{metric.label}</span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tone.icon}`}>
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <strong className="font-['Sora',system-ui,sans-serif] text-[30px] font-black leading-none text-slate-950">{metric.value}</strong>
              <span className={`text-xs font-bold ${tone.delta}`}>{metric.detail}</span>
            </article>
          )
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.8fr)]">
        <SectionPanel
          label="Turmas"
          title="Frequencia e media"
          icon={<GraduationCap className="h-4 w-4" />}
          className="xl:row-span-2"
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.attendanceByClass}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.34)" />
                <XAxis dataKey="className" stroke="#64748b" tickLine={false} />
                <YAxis stroke="#64748b" tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="frequencia" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="media" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel label="TRI" title="Proficiencia" icon={<ClipboardCheck className="h-4 w-4" />}>
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.proficiencyDistribution} dataKey="alunos" nameKey="level" innerRadius={58} outerRadius={88} paddingAngle={4}>
                  {dashboard.proficiencyDistribution.map((entry, index) => <Cell key={entry.level} fill={pieColors[index % pieColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-2">
            {dashboard.proficiencyDistribution.map((entry, index) => (
              <span key={entry.level} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
                <i className="h-3 w-3 rounded-full" style={{ background: pieColors[index % pieColors.length] }} />
                {entry.level}: {entry.alunos}
              </span>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel label="Disciplinas" title="Taxa de acerto" icon={<TrendingUp className="h-4 w-4" />}>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.subjectRadar}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.34)" />
                <XAxis dataKey="subject" stroke="#64748b" tickLine={false} />
                <YAxis stroke="#64748b" tickLine={false} />
                <Tooltip />
                <Bar dataKey="acertos" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionPanel label="Alertas inteligentes" title="Risco pedagogico" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="grid gap-3">
            {dashboard.alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                <strong className="block text-sm font-bold text-slate-900">{alert.title}</strong>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{alert.description}</span>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel label="Auditoria" title="Ultimas acoes">
          <div className="grid gap-3">
            {auditEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                <strong className="block text-sm font-bold text-slate-900">{event.action}</strong>
                <span className="mt-1 block text-sm text-slate-600">{event.actor} - {event.target}</span>
                <small className="mt-2 block text-xs font-bold text-slate-400">{new Date(event.createdAt).toLocaleString('pt-BR')}</small>
              </div>
            ))}
          </div>
        </SectionPanel>
      </section>

      <SectionPanel label="Simulados ativos" title="Fila de aplicacao e correcao">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Titulo</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Disciplina</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Participantes</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Corrigidos</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeEvaluations.map((evaluation) => (
                <tr key={evaluation.id} className="transition-colors hover:bg-slate-50">
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm font-semibold text-slate-700">{evaluation.title}</td>
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm text-slate-600">{evaluation.subject}</td>
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm text-slate-600">{evaluation.participants}</td>
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm text-slate-600">{evaluation.corrected}</td>
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm text-slate-600"><span className={statusPillClass(evaluation.status)}>{evaluation.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  )
}
