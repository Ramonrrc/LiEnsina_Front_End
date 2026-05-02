import { FormEvent, useMemo, useState } from 'react'
import { ClipboardCheck, FileDown, Plus, QrCode, ScanLine, Upload } from 'lucide-react'

import type { ClassRoom, Evaluation } from '../types'

interface EvaluationsViewProps {
  evaluations: Evaluation[]
  classes: ClassRoom[]
  onCreate: (draft: Partial<Evaluation>) => Promise<void>
}

const emptyEvaluation: Partial<Evaluation> = { title: '', classId: '', subject: '', questions: 20, scheduledAt: new Date().toISOString().slice(0, 10), status: 'planejado', corrected: 0, participants: 0, averageScore: 0, triLevel: 'Aguardando aplicacao' }

export default function EvaluationsView({ evaluations, classes, onCreate }: EvaluationsViewProps) {
  const [draft, setDraft] = useState<Partial<Evaluation>>(emptyEvaluation)
  const [statusFilter, setStatusFilter] = useState('all')
  const filteredEvaluations = useMemo(() => statusFilter === 'all' ? evaluations : evaluations.filter((evaluation) => evaluation.status === statusFilter), [evaluations, statusFilter])
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await onCreate(draft); setDraft(emptyEvaluation) }
  function getClassName(id: string) { return classes.find((classRoom) => classRoom.id === id)?.name ?? 'Turma nao localizada' }

  return (
    <div className="page-stack">
      <section className="page-hero compact"><div><p className="eyebrow">Avaliacao inteligente</p><h1>Simulados</h1><span>Provas, gabaritos com QR Code, upload em lote e diagnostico TRI.</span></div><div className="hero-badge"><ScanLine size={20} />Correcao automatica em lote</div></section>
      <section className="workflow-strip">{[{ icon: <ClipboardCheck />, title: 'Criar prova', text: 'Monte o simulado por turma e disciplina.' }, { icon: <QrCode />, title: 'Gerar gabarito', text: 'Folhas com aluno e QR Code individual.' }, { icon: <Upload />, title: 'Enviar lote', text: 'Fotos ou scans de toda a turma.' }, { icon: <FileDown />, title: 'Publicar notas', text: 'Boletim e diario atualizados.' }].map((step) => <article key={step.title}><div>{step.icon}</div><strong>{step.title}</strong><span>{step.text}</span></article>)}</section>
      <section className="editor-grid">
        <form className="form-panel" onSubmit={handleSubmit}><div className="panel-heading"><div><p className="eyebrow">Novo simulado</p><h2>Planejamento da prova</h2></div><Plus size={21} /></div><div className="form-grid"><label className="field-label wide">Titulo<input value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></label><label className="field-label">Turma<select value={draft.classId ?? ''} onChange={(event) => setDraft({ ...draft, classId: event.target.value })} required><option value="">Selecione</option>{classes.map((classRoom) => <option key={classRoom.id} value={classRoom.id}>{classRoom.name}</option>)}</select></label><label className="field-label">Disciplina<input value={draft.subject ?? ''} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} required /></label><label className="field-label">Questoes<input type="number" min={1} value={draft.questions ?? 20} onChange={(event) => setDraft({ ...draft, questions: Number(event.target.value) })} required /></label><label className="field-label">Data<input type="date" value={draft.scheduledAt ?? ''} onChange={(event) => setDraft({ ...draft, scheduledAt: event.target.value })} required /></label></div><div className="form-actions"><button type="submit" className="primary-button"><Plus size={17} />Criar simulado</button></div></form>
        <aside className="summary-panel"><p className="eyebrow">Leitura optica via IA</p><h2>Pronto para o proximo modulo</h2><p>Esta tela ja organiza o ciclo do simulado. O upload real de imagens pode ser conectado ao motor de leitura optica quando o servico de IA estiver disponivel.</p><div className="summary-list"><span><QrCode size={16} />QR Code por aluno</span><span><ScanLine size={16} />Identificacao de rasuras</span><span><FileDown size={16} />Lancamento automatico no boletim</span></div></aside>
      </section>
      <section className="table-panel"><div className="panel-heading"><div><p className="eyebrow">Avaliacoes</p><h2>Simulados cadastrados</h2></div><select className="search-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos os status</option><option value="planejado">Planejado</option><option value="em_aplicacao">Em aplicacao</option><option value="corrigindo">Corrigindo</option><option value="concluido">Concluido</option></select></div><div className="responsive-table"><table><thead><tr><th>Titulo</th><th>Turma</th><th>Disciplina</th><th>Questoes</th><th>Correcao</th><th>Media</th><th>Status</th></tr></thead><tbody>{filteredEvaluations.map((evaluation) => <tr key={evaluation.id}><td>{evaluation.title}</td><td>{getClassName(evaluation.classId)}</td><td>{evaluation.subject}</td><td>{evaluation.questions}</td><td>{evaluation.corrected}/{evaluation.participants}</td><td>{evaluation.averageScore.toFixed(1)}</td><td><span className={`status-pill ${evaluation.status}`}>{evaluation.status.replace('_', ' ')}</span></td></tr>)}</tbody></table></div></section>
    </div>
  )
}
