import { FormEvent, useMemo, useState } from 'react'
import { BookOpen, GraduationCap, Plus, Save, Users } from 'lucide-react'

import type { ClassRoom, Desempenho, School, Student, Teacher } from '../types'

interface ClassesViewProps {
  classes: ClassRoom[]
  schools: School[]
  teachers: Teacher[]
  students: Student[]
  onCreate: (draft: Partial<ClassRoom>) => Promise<void>
  onUpdate: (id: string, draft: Partial<ClassRoom>) => Promise<void>
}

const currentYear = new Date().getFullYear()
const emptyClass: Partial<ClassRoom> = {
  name: '',
  grade: '',
  shift: 'Manha',
  schoolId: '',
  teacherId: '',
  teacherIds: [],
  academicYear: currentYear,
  schedule: '',
  bnccFocus: [],
}

function getClassAverageScore(students: Student[]) {
  const scores = students
    .map((student) => student.averageScore)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))

  if (scores.length === 0) return null

  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

function getPerformanceFromScore(score: number | null): Desempenho | null {
  if (score === null) return null
  if (score >= 8) return 'Otimo'
  if (score >= 6) return 'Medio'
  return 'Baixo'
}

function getPerformanceLabel(level: Desempenho | null) {
  if (level === 'Otimo') return 'Ótimo'
  if (level === 'Medio') return 'Médio'
  if (level === 'Baixo') return 'Baixo'
  return 'Sem notas'
}

export default function ClassesView({ classes, schools, teachers, students, onCreate, onUpdate }: ClassesViewProps) {
  const [draft, setDraft] = useState<Partial<ClassRoom>>({ ...emptyClass })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [schoolFilter, setSchoolFilter] = useState('all')

  const filteredClasses = useMemo(
    () => schoolFilter === 'all' ? classes : classes.filter((classRoom) => classRoom.schoolId === schoolFilter),
    [classes, schoolFilter],
  )

  function startEditing(classRoom: ClassRoom) {
    setEditingId(classRoom.id)
    setDraft({ ...classRoom })
  }

  function resetForm() {
    setEditingId(null)
    setDraft({ ...emptyClass })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingId) await onUpdate(editingId, draft)
    else await onCreate(draft)
    resetForm()
  }

  function getSchoolName(id: string) {
    return schools.find((school) => school.id === id)?.name ?? 'Escola nao localizada'
  }

  function getTeacherName(id: string) {
    return teachers.find((teacher) => teacher.id === id)?.name ?? 'Professor pendente'
  }

  return (
    <div className="grid min-h-screen gap-4 bg-slate-50 px-[clamp(12px,2.5vw,40px)] py-6 pb-12 font-['DM_Sans'] text-slate-900">
      <section className="flex items-center justify-between gap-4 rounded-xl border border-slate-400 bg-white px-5 py-3.5 shadow-sm max-[920px]:flex-col max-[920px]:items-start">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Enturmacao</p>
          <h1 className="font-['Sora',system-ui,sans-serif] text-2xl font-black leading-tight text-slate-950">Turmas</h1>
          <p className="mt-1 max-w-[760px] text-sm leading-6 text-slate-500">
            Cada turma possui escola, professor responsavel e lista de alunos.
          </p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] font-black uppercase tracking-widest text-indigo-700 max-[920px]:w-full">
          <GraduationCap size={16} />
          {classes.length} turmas
        </div>
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] gap-4 max-[1180px]:grid-cols-1">
        <form className="min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-4 border-b border-slate-400 bg-slate-50 px-5 py-4 max-[640px]:items-start">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">{editingId ? 'Editar turma' : 'Nova turma'}</p>
              <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-bold leading-tight text-slate-800">Dados da turma</h2>
            </div>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">{editingId ? <Save size={15} /> : <Plus size={15} />}</span>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 gap-3.5 max-[640px]:grid-cols-1">
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Nome</span>
                <input className="min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={draft.name ?? ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Serie/ano</span>
                <input className="min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={draft.grade ?? ''} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} required />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Escola</span>
                <select className="min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={draft.schoolId ?? ''} onChange={(event) => setDraft({ ...draft, schoolId: event.target.value })} required>
                  <option value="">Selecione</option>
                  {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Professor</span>
                <select className="min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={draft.teacherId ?? ''} onChange={(event) => setDraft({ ...draft, teacherId: event.target.value, teacherIds: Array.from(new Set([event.target.value, ...(draft.teacherIds ?? [])].filter(Boolean))) })} required>
                  <option value="">Selecione</option>
                  {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Turno</span>
                <select className="min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={draft.shift ?? 'Manha'} onChange={(event) => setDraft({ ...draft, shift: event.target.value as ClassRoom['shift'] })}>
                  <option value="Manha">Manha</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Ano letivo</span>
                <input className="min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" type="number" value={draft.academicYear ?? currentYear} onChange={(event) => setDraft({ ...draft, academicYear: Number(event.target.value) })} required />
              </label>
              <label className="col-span-2 flex min-w-0 flex-col gap-1.5 max-[640px]:col-span-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Horario</span>
                <input className="min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={draft.schedule ?? ''} onChange={(event) => setDraft({ ...draft, schedule: event.target.value })} placeholder="Segunda a sexta, 07:30 as 11:30" required />
              </label>
              <label className="col-span-2 flex min-w-0 flex-col gap-1.5 max-[640px]:col-span-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Focos BNCC</span>
                <input className="min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={(draft.bnccFocus ?? []).join(', ')} onChange={(event) => setDraft({ ...draft, bnccFocus: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="EF05LP01, EF05MA07" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {editingId ? <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-slate-400 bg-white px-4 text-[13px] font-bold text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-70" onClick={resetForm}>Cancelar</button> : null}
              <button type="submit" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-indigo-700 bg-indigo-600 px-4 text-[13px] font-black text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"><Save size={17} />Salvar turma</button>
            </div>
          </div>
        </form>

        <aside className="min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">
          <div className="border-b border-slate-400 bg-slate-50 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Professor e alunos</p>
            <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-bold leading-tight text-slate-800">Visao da turma</h2>
          </div>
          <div className="p-5">
            <p className="text-sm leading-6 text-slate-500">
              A turma concentra diario, chamada digital, notas, lacunas de aprendizagem e simulados aplicados ao grupo.
            </p>
            <div className="mt-4 grid gap-2.5">
              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-600"><Users size={16} className="text-indigo-600" />Alunos vinculados por matricula</span>
              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-600"><BookOpen size={16} className="text-indigo-600" />Habilidades BNCC por foco pedagogico</span>
              <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold text-slate-600"><GraduationCap size={16} className="text-indigo-600" />Professor responsavel por turma</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-400 bg-slate-50 px-5 py-4 max-[920px]:flex-col">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Quadro de turmas</p>
            <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-bold leading-tight text-slate-800">Turmas ativas</h2>
          </div>
          <select className="min-h-10 w-full min-w-0 max-w-sm rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)}>
            <option value="all">Todas as escolas</option>
            {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3.5 p-5 max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
          {filteredClasses.map((classRoom) => {
            const classStudents = students.filter((student) => student.classId === classRoom.id)
            const classAverageScore = getClassAverageScore(classStudents)
            const classPerformance = getPerformanceFromScore(classAverageScore)

            return (
              <article key={classRoom.id} className="grid min-w-0 gap-3.5 rounded-xl border border-slate-300 bg-white p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/30 hover:shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.16)]" />
                  <strong className="min-w-0 [overflow-wrap:anywhere] font-['Sora',system-ui,sans-serif] text-sm font-bold text-slate-900">{classRoom.name}</strong>
                </div>
                <p className="text-sm leading-6 text-slate-500">{classRoom.grade} - {classRoom.shift} - {getSchoolName(classRoom.schoolId)}</p>
                <dl className="grid grid-cols-2 gap-2.5">
                  <span><dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Professor</dt><dd className="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-700">{getTeacherName(classRoom.teacherId)}</dd></span>
                  <span><dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Alunos</dt><dd className="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-700">{classStudents.length}</dd></span>
                  <span><dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Desempenho geral</dt><dd className="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-700">{classAverageScore === null ? 'Sem notas' : `${classAverageScore.toFixed(1)} · ${getPerformanceLabel(classPerformance)}`}</dd></span>
                  <span><dt className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">BNCC</dt><dd className="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-700">{classRoom.bnccFocus.length}</dd></span>
                </dl>
                <div className="flex flex-wrap gap-2.5">
                  {classRoom.bnccFocus.slice(0, 4).map((focus) => <span className="inline-flex min-w-0 items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[12px] font-bold text-indigo-700" key={focus}>{focus}</span>)}
                </div>
                <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-slate-400 bg-white px-4 text-[13px] font-bold text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-70" onClick={() => startEditing(classRoom)}>Editar</button>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
