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
  const filteredUsers = useMemo(() => schoolFilter === 'all' ? users : users.filter((user) => user.schoolId === schoolFilter), [schoolFilter, users])

  function selectRole(role: Role) { setSelectedRoleId(role.id); setPermissionDraft(role.permissions) }
  function togglePermission(permission: string) { setPermissionDraft((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]) }
  function getRoleName(id: string) { return roles.find((role) => role.id === id)?.name ?? 'Cargo nao localizado' }
  function getSchoolName(id: string | null) { return id ? schools.find((school) => school.id === id)?.name ?? 'Escola nao localizada' : 'Rede municipal' }

  return (
    <div className="page-stack">
      <section className="page-hero compact"><div><p className="eyebrow">Controle de acesso</p><h1>Cargos e permissoes</h1><span>Somente cargos entram aqui: secretaria, direcao, professor e apoio.</span></div><div className="hero-badge"><ShieldCheck size={20} />LGPD e auditoria</div></section>
      <section className="access-grid"><aside className="role-list">{roles.map((role) => <button key={role.id} type="button" className={role.id === selectedRoleId ? 'is-active' : ''} onClick={() => selectRole(role)}><strong>{role.name}</strong><span>{role.description}</span></button>)}</aside><section className="form-panel"><div className="panel-heading"><div><p className="eyebrow">Permissoes</p><h2>{selectedRole?.name ?? 'Cargo'}</h2></div><UserCog size={21} /></div><div className="permission-grid">{permissionOptions.map((permission) => <label key={permission} className="check-row"><input type="checkbox" checked={permissionDraft.includes(permission)} onChange={() => togglePermission(permission)} /><span>{permission}</span></label>)}</div><div className="form-actions"><button type="button" className="primary-button" onClick={() => selectedRole && onUpdateRole(selectedRole.id, { permissions: permissionDraft })}><Save size={17} />Salvar permissoes</button></div></section></section>
      <section className="table-panel"><div className="panel-heading"><div><p className="eyebrow">Usuarios</p><h2>Alterar cargo</h2></div><select className="search-input" value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)}><option value="all">Todas as escolas</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></div><div className="responsive-table"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Escola</th><th>Cargo atual</th><th>Novo cargo</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{getSchoolName(user.schoolId)}</td><td>{getRoleName(user.roleId)}</td><td><select value={user.roleId} onChange={(event) => onUpdateUserRole(user.id, event.target.value)}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></td></tr>)}</tbody></table></div></section>
    </div>
  )
}
