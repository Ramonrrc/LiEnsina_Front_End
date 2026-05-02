import { FormEvent, useMemo, useState } from 'react'
import { BookOpen, GraduationCap, Plus, Save, Users } from 'lucide-react'

import type { ClassRoom, School, Student, Teacher } from '../types'

interface ClassesViewProps {
  classes: ClassRoom[]
  schools: School[]
  teachers: Teacher[]
  students: Student[]
  onCreate: (draft: Partial<ClassRoom>) => Promise<void>
  onUpdate: (id: string, draft: Partial<ClassRoom>) => Promise<void>
}

const currentYear = new Date().getFullYear()
const emptyClass: Partial<ClassRoom> = { name: '', grade: '', shift: 'Manha', schoolId: '', teacherId: '', academicYear: currentYear, schedule: '', bnccFocus: [] }

export default function ClassesView({ classes, schools, teachers, students, onCreate, onUpdate }: ClassesViewProps) {
  const [draft, setDraft] = useState<Partial<ClassRoom>>(emptyClass)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [schoolFilter, setSchoolFilter] = useState('all')
  const filteredClasses = useMemo(() => schoolFilter === 'all' ? classes : classes.filter((classRoom) => classRoom.schoolId === schoolFilter), [classes, schoolFilter])

  function startEditing(classRoom: ClassRoom) { setEditingId(classRoom.id); setDraft({ ...classRoom }) }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (editingId) await onUpdate(editingId, draft); else await onCreate(draft); setEditingId(null); setDraft(emptyClass) }
  function getSchoolName(id: string) { return schools.find((school) => school.id === id)?.name ?? 'Escola nao localizada' }
  function getTeacherName(id: string) { return teachers.find((teacher) => teacher.id === id)?.name ?? 'Professor pendente' }

  return (
    <div className="page-stack">
      <section className="page-hero compact"><div><p className="eyebrow">Enturmacao</p><h1>Turmas</h1><span>Cada turma possui escola, professor responsavel e lista de alunos.</span></div><div className="hero-badge"><GraduationCap size={20} />{classes.length} turmas no ano letivo</div></section>
      <section className="editor-grid">
        <form className="form-panel" onSubmit={handleSubmit}>
          <div className="panel-heading"><div><p className="eyebrow">{editingId ? 'Editar turma' : 'Nova turma'}</p><h2>Dados da turma</h2></div>{editingId ? <Save size={21} /> : <Plus size={21} />}</div>
          <div className="form-grid">
            <label className="field-label">Nome<input value={draft.name ?? ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
            <label className="field-label">Serie/ano<input value={draft.grade ?? ''} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} required /></label>
            <label className="field-label">Escola<select value={draft.schoolId ?? ''} onChange={(event) => setDraft({ ...draft, schoolId: event.target.value })} required><option value="">Selecione</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>
            <label className="field-label">Professor<select value={draft.teacherId ?? ''} onChange={(event) => setDraft({ ...draft, teacherId: event.target.value })} required><option value="">Selecione</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
            <label className="field-label">Turno<select value={draft.shift ?? 'Manha'} onChange={(event) => setDraft({ ...draft, shift: event.target.value as ClassRoom['shift'] })}><option value="Manha">Manha</option><option value="Tarde">Tarde</option><option value="Noite">Noite</option></select></label>
            <label className="field-label">Ano letivo<input type="number" value={draft.academicYear ?? currentYear} onChange={(event) => setDraft({ ...draft, academicYear: Number(event.target.value) })} required /></label>
            <label className="field-label wide">Horario<input value={draft.schedule ?? ''} onChange={(event) => setDraft({ ...draft, schedule: event.target.value })} placeholder="Segunda a sexta, 07:30 as 11:30" required /></label>
            <label className="field-label wide">Focos BNCC<input value={(draft.bnccFocus ?? []).join(', ')} onChange={(event) => setDraft({ ...draft, bnccFocus: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="EF05LP01, EF05MA07" /></label>
          </div>
          <div className="form-actions">{editingId ? <button type="button" className="secondary-button" onClick={() => { setEditingId(null); setDraft(emptyClass) }}>Cancelar</button> : null}<button type="submit" className="primary-button"><Save size={17} />Salvar turma</button></div>
        </form>
        <aside className="summary-panel"><p className="eyebrow">Professor e alunos</p><h2>Visao da turma</h2><p>A turma concentra diario, chamada digital, notas, lacunas de aprendizagem e simulados aplicados ao grupo.</p><div className="summary-list"><span><Users size={16} />Alunos vinculados por matricula</span><span><BookOpen size={16} />Habilidades BNCC por foco pedagogico</span><span><GraduationCap size={16} />Professor responsavel por turma</span></div></aside>
      </section>
      <section className="table-panel"><div className="panel-heading"><div><p className="eyebrow">Quadro de turmas</p><h2>Turmas ativas</h2></div><select className="search-input" value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)}><option value="all">Todas as escolas</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></div><div className="class-grid">{filteredClasses.map((classRoom) => { const classStudents = students.filter((student) => student.classId === classRoom.id); const riskCount = classStudents.filter((student) => student.riskLevel === 'alto').length; return <article key={classRoom.id} className="entity-card"><div><span className="status-dot active" /><strong>{classRoom.name}</strong></div><p>{classRoom.grade} - {classRoom.shift} - {getSchoolName(classRoom.schoolId)}</p><dl><span><dt>Professor</dt><dd>{getTeacherName(classRoom.teacherId)}</dd></span><span><dt>Alunos</dt><dd>{classStudents.length}</dd></span><span><dt>Risco alto</dt><dd>{riskCount}</dd></span><span><dt>BNCC</dt><dd>{classRoom.bnccFocus.length}</dd></span></dl><div className="tag-row">{classRoom.bnccFocus.slice(0, 4).map((focus) => <span key={focus}>{focus}</span>)}</div><button type="button" className="secondary-button" onClick={() => startEditing(classRoom)}>Editar</button></article> })}</div></section>
    </div>
  )
}
