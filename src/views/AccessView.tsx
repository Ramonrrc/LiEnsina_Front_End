import { useMemo, useState } from 'react'
import { Save, ShieldCheck, UserCog } from 'lucide-react'

import { permissionOptions } from '../data'
import type { Role, School, UserAccount } from '../types'

interface AccessViewProps {
  roles: Role[]
  users: UserAccount[]
  schools: School[]
  onUpdateRole: (id: string, draft: Partial<Role>) => Promise<void>
  onUpdateUserRole: (id: string, roleId: string) => Promise<void>
}

export default function AccessView({ roles, users, schools, onUpdateRole, onUpdateUserRole }: AccessViewProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? '')
  const [permissionDraft, setPermissionDraft] = useState<string[]>(roles[0]?.permissions ?? [])
  const [schoolFilter, setSchoolFilter] = useState('all')

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0]
  const filteredUsers = useMemo(
    () => schoolFilter === 'all' ? users : users.filter((user) => user.schoolId === schoolFilter),
    [schoolFilter, users],
  )

  function selectRole(role: Role) {
    setSelectedRoleId(role.id)
    setPermissionDraft(role.permissions)
  }

  function togglePermission(permission: string) {
    setPermissionDraft((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    )
  }

  function getRoleName(id: string) {
    return roles.find((role) => role.id === id)?.name ?? 'Cargo nao localizado'
  }

  function getSchoolName(id: string | null) {
    return id ? schools.find((school) => school.id === id)?.name ?? 'Escola nao localizada' : 'Rede municipal'
  }

  return (
    <div className="grid min-h-screen gap-4 bg-slate-50 px-[clamp(12px,2.5vw,40px)] py-6 pb-12 font-['DM_Sans'] text-slate-900">
      <section className="flex items-center justify-between gap-4 rounded-xl border border-slate-400 bg-white px-5 py-3.5 shadow-sm max-[920px]:flex-col max-[920px]:items-start">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">Controle de acesso</p>
          <h1 className="font-['Sora',system-ui,sans-serif] text-2xl font-black leading-tight text-slate-950">Cargos e permissoes</h1>
          <p className="mt-1 max-w-[760px] text-sm leading-6 text-slate-500">
            Configure cargos, permissoes e vinculos de usuarios sem sair do fluxo administrativo.
          </p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] font-black uppercase tracking-widest text-indigo-700 max-[920px]:w-full">
          <ShieldCheck size={16} />
          LGPD e auditoria
        </div>
      </section>

      <section className="grid grid-cols-[minmax(250px,0.35fr)_minmax(0,1fr)] gap-4 max-[920px]:grid-cols-1">
        <aside className="grid content-start gap-2.5 rounded-2xl border border-slate-400 bg-white p-3 shadow-sm">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              className={`rounded-xl border px-3.5 py-3 text-left transition-all hover:border-indigo-300 hover:bg-indigo-50/50 ${
                role.id === selectedRoleId ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-300 bg-white'
              }`}
              onClick={() => selectRole(role)}
            >
              <strong className="block text-sm font-bold text-slate-900">{role.name}</strong>
              <span className="mt-1 block text-sm leading-6 text-slate-500">{role.description}</span>
            </button>
          ))}
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-400 bg-slate-50 px-5 py-4 max-[640px]:items-start">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Permissoes</p>
              <h2 className="truncate font-['Sora',system-ui,sans-serif] text-sm font-bold leading-tight text-slate-800">{selectedRole?.name ?? 'Cargo'}</h2>
            </div>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white"><UserCog size={15} /></span>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-3 gap-2.5 max-[920px]:grid-cols-1">
              {permissionOptions.map((permission) => (
                <label key={permission} className="flex min-h-11 items-center gap-2.5 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-sm font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50">
                  <input className="h-[18px] w-[18px] accent-indigo-600" type="checkbox" checked={permissionDraft.includes(permission)} onChange={() => togglePermission(permission)} />
                  <span>{permission}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-indigo-700 bg-indigo-600 px-4 text-[13px] font-black text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70" onClick={() => selectedRole && onUpdateRole(selectedRole.id, { permissions: permissionDraft })}>
                <Save size={17} />Salvar permissoes
              </button>
            </div>
          </div>
        </section>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-400 bg-slate-50 px-5 py-4 max-[920px]:flex-col">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Usuarios</p>
            <h2 className="font-['Sora',system-ui,sans-serif] text-sm font-bold leading-tight text-slate-800">Alterar cargo</h2>
          </div>
          <select className="min-h-10 w-full min-w-0 max-w-sm rounded-sm border border-slate-400 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100" value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)}>
            <option value="all">Todas as escolas</option>
            {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
          </select>
        </div>

        <div className="w-full overflow-x-auto p-5">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Nome</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">E-mail</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Escola</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Cargo atual</th>
                <th className="border-b border-slate-200 px-3 py-3 text-left align-middle text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Novo cargo</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-slate-50">
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm font-semibold text-slate-700">{user.name}</td>
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm text-slate-600">{user.email}</td>
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm text-slate-600">{getSchoolName(user.schoolId)}</td>
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm text-slate-600">{getRoleName(user.roleId)}</td>
                  <td className="border-b border-slate-200 px-3 py-3 align-middle text-sm text-slate-600">
                    <select className="min-h-10 w-full min-w-0 rounded-sm border border-slate-400 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100" value={user.roleId} onChange={(event) => onUpdateUserRole(user.id, event.target.value)}>
                      {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
