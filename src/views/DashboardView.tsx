import { AlertTriangle, ClipboardCheck, GraduationCap, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { SurfaceCard } from '../components/ui/surface-card'
import type { AuditEvent, DashboardPayload, Evaluation } from '../types'

const pieColors = ['#1d6fa4', '#2a7a4e', '#b45309', '#b91c1c']

const metricTone = {
  blue: {
    icon: 'bg-blue-50 text-blue-600',
    delta: 'text-blue-700',
  },
  green: {
    icon: 'bg-emerald-50 text-emerald-700',
    delta: 'text-emerald-700',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700',
    delta: 'text-amber-700',
  },
  rose: {
    icon: 'bg-red-50 text-red-700',
    delta: 'text-rose-700',
  },
} as const

interface DashboardViewProps {
  dashboard: DashboardPayload
  evaluations: Evaluation[]
  auditEvents: AuditEvent[]
}

export default function DashboardView({ dashboard, evaluations, auditEvents }: DashboardViewProps) {
  const activeEvaluations = evaluations.filter((evaluation) => evaluation.status !== 'concluido')

  return (
    <div className="page-stack">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Central pedagogica</p>
          <h1>Dashboard da rede</h1>
          <span>
            Frequencia, desempenho, simulados e alertas de risco em uma leitura unica para secretaria, direcao e coordenacao.
          </span>
        </div>

        <div className="hero-badge">
          <TrendingUp className="h-4 w-4" />
          Atualizado pela API
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => {
          const tone = metricTone[metric.tone]

          return (
            <article
              key={metric.id}
              className="bg-white border border-stone-300 rounded-2xl p-5 flex flex-col gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-widest uppercase text-stone-400">{metric.label}</span>
                <span className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${tone.icon}`}>
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <strong className="font-['Lora'] text-[32px] font-semibold text-stone-900 leading-none">{metric.value}</strong>
              <span className={`text-[12px] font-medium ${tone.delta}`}>{metric.detail}</span>
            </article>
          )
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.8fr)]">
        <SurfaceCard
          title="Frequencia e media"
          eyebrow="Turmas"
          icon={<GraduationCap className="h-5 w-5" />}
          className="xl:row-span-2"
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.attendanceByClass}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(168,162,158,0.28)" />
                <XAxis dataKey="className" stroke="#78716c" tickLine={false} />
                <YAxis stroke="#78716c" tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="frequencia" stroke="#2a7a4e" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="media" stroke="#1d6fa4" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard title="Proficiencia" eyebrow="TRI" icon={<ClipboardCheck className="h-5 w-5" />}>
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
              <span key={entry.level} className="inline-flex items-center gap-2 text-sm font-medium text-stone-600">
                <i className="h-3 w-3 rounded-full" style={{ background: pieColors[index % pieColors.length] }} />
                {entry.level}: {entry.alunos}
              </span>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard title="Taxa de acerto" eyebrow="Disciplinas" icon={<TrendingUp className="h-5 w-5" />}>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.subjectRadar}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(168,162,158,0.28)" />
                <XAxis dataKey="subject" stroke="#78716c" tickLine={false} />
                <YAxis stroke="#78716c" tickLine={false} />
                <Tooltip />
                <Bar dataKey="acertos" fill="#1d6fa4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <SurfaceCard title="Risco pedagogico" eyebrow="Alertas inteligentes" icon={<AlertTriangle className="h-5 w-5" />}>
          <div className="grid gap-3">
            {dashboard.alerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-stone-300 bg-stone-50 p-4">
                <strong className="block text-sm font-semibold text-stone-900">{alert.title}</strong>
                <span className="mt-1 block text-sm leading-6 text-stone-600">{alert.description}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard title="Ultimas acoes" eyebrow="Auditoria">
          <div className="grid gap-3">
            {auditEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="rounded-lg border border-stone-300 bg-stone-50 p-4">
                <strong className="block text-sm font-semibold text-stone-900">{event.action}</strong>
                <span className="mt-1 block text-sm text-stone-600">{event.actor} - {event.target}</span>
                <small className="mt-2 block text-xs font-medium text-stone-400">{new Date(event.createdAt).toLocaleString('pt-BR')}</small>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard title="Fila de aplicacao e correcao" eyebrow="Simulados ativos">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Disciplina</th>
                <th>Participantes</th>
                <th>Corrigidos</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeEvaluations.map((evaluation) => (
                <tr key={evaluation.id}>
                  <td>{evaluation.title}</td>
                  <td>{evaluation.subject}</td>
                  <td>{evaluation.participants}</td>
                  <td>{evaluation.corrected}</td>
                  <td><span className={`status-pill ${evaluation.status}`}>{evaluation.status.replace('_', ' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  )
}
