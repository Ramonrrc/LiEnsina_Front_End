import { FormEvent, useMemo, useState } from 'react'
import { Building2, CheckCircle2, Plus, Save } from 'lucide-react'

import type { ClassRoom, School, Student } from '../types'

interface SchoolsViewProps {
  schools: School[]
  classes: ClassRoom[]
  students: Student[]
  onCreate: (draft: Partial<School>) => Promise<void>
  onUpdate: (id: string, draft: Partial<School>) => Promise<void>
}

const emptySchool: Partial<School> = { name: '', city: '', address: '', director: '', inepCode: '', active: true }

export default function SchoolsView({ schools, classes, students, onCreate, onUpdate }: SchoolsViewProps) {
  const [draft, setDraft] = useState<Partial<School>>(emptySchool)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const filteredSchools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return schools
    return schools.filter((school) => [school.name, school.city, school.director, school.inepCode].join(' ').toLowerCase().includes(normalizedQuery))
  }, [query, schools])

  function startEditing(school: School) { setEditingId(school.id); setDraft(school) }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingId) await onUpdate(editingId, draft)
    else await onCreate(draft)
    setEditingId(null)
    setDraft(emptySchool)
  }

  return (
    <div className="page-stack">
      <section className="page-hero compact"><div><p className="eyebrow">Secretaria escolar</p><h1>Escolas</h1><span>Cadastro de unidades, diretores, INEP e volume de turmas e alunos.</span></div><div className="hero-badge"><Building2 size={20} />{schools.length} escolas cadastradas</div></section>
      <section className="editor-grid">
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="panel-heading"><div><p className="eyebrow">{editingId ? 'Editar escola' : 'Nova escola'}</p><h2>Dados da unidade</h2></div>{editingId ? <Save size={21} /> : <Plus size={21} />}</div>
          <div className="form-grid"><label className="field-label">Nome<input value={draft.name ?? ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label><label className="field-label">Cidade<input value={draft.city ?? ''} onChange={(event) => setDraft({ ...draft, city: event.target.value })} required /></label><label className="field-label wide">Endereco<input value={draft.address ?? ''} onChange={(event) => setDraft({ ...draft, address: event.target.value })} required /></label><label className="field-label">Diretor<input value={draft.director ?? ''} onChange={(event) => setDraft({ ...draft, director: event.target.value })} required /></label><label className="field-label">Codigo INEP<input value={draft.inepCode ?? ''} onChange={(event) => setDraft({ ...draft, inepCode: event.target.value })} required /></label></div>
          <div className="form-actions">{editingId ? <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setDraft(emptySchool) }}>Cancelar</button> : null}<button type="submit" className="primary-button"><Save size={17} />Salvar escola</button></div>
        </form>
        <aside className="summary-panel"><p className="eyebrow">Censo escolar</p><h2>Base para relatorios oficiais</h2><p>O cadastro de escolas alimenta matriculas, enturmacao, simulados, historicos, boletins e filtros de exportacao para a secretaria.</p><div className="summary-list"><span><CheckCircle2 size={16} />INEP e diretor por unidade</span><span><CheckCircle2 size={16} />Quantidade de alunos e turmas</span><span><CheckCircle2 size={16} />Status da unidade para operacao da rede</span></div></aside>
      </section>
      <section className="table-panel"><div className="panel-heading"><div><p className="eyebrow">Unidades</p><h2>Lista de escolas</h2></div><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar escola" /></div><div className="school-grid">{filteredSchools.map((school) => { const schoolClasses = classes.filter((classRoom) => classRoom.schoolId === school.id); const schoolStudents = students.filter((student) => student.schoolId === school.id); return <article key={school.id} className="entity-card"><div><span className={`status-dot ${school.active ? 'active' : ''}`} /><strong>{school.name}</strong></div><p>{school.address}</p><dl><span><dt>Cidade</dt><dd>{school.city}</dd></span><span><dt>Diretor</dt><dd>{school.director}</dd></span><span><dt>Turmas</dt><dd>{schoolClasses.length}</dd></span><span><dt>Alunos</dt><dd>{schoolStudents.length}</dd></span></dl><button type="button" className="secondary-button" onClick={() => startEditing(school)}>Editar</button></article> })}</div></section>
    </div>
  )
}
