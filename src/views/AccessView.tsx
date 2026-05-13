import { useMemo, useState } from 'react'
import {
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { permissionOptions } from '../data'
import type { Role, School, UserAccount } from '../types'

interface AccessViewProps {
  roles: Role[]
  users: UserAccount[]
  schools: School[]
  onUpdateRole: (id: string, draft: Partial<Role>) => Promise<void>
  onUpdateUserRole: (id: string, roleId: string) => Promise<void>
}

type UserKindFilter = 'all' | 'professor' | 'coordenador' | 'responsavel' | 'aluno'

type PermissionMeta = {
  label: string
  description: string
  group: 'Gestao escolar' | 'Pessoas' | 'Pedagogico' | 'Relatorios' | 'Sistema'
}

const permissionMeta: Record<string, PermissionMeta> = {
  'dashboard:ler': {
    label: 'Dashboard',
    description: 'Visualizar indicadores e resumo geral.',
    group: 'Gestao escolar',
  },
  'escolas:gerenciar': {
    label: 'Escolas',
    description: 'Cadastrar e editar unidades escolares.',
    group: 'Gestao escolar',
  },
  'turmas:gerenciar': {
    label: 'Turmas',
    description: 'Organizar series, horarios e vinculos.',
    group: 'Gestao escolar',
  },
  'professores:gerenciar': {
    label: 'Professores',
    description: 'Criar, editar e vincular docentes.',
    group: 'Pessoas',
  },
  'alunos:gerenciar': {
    label: 'Alunos',
    description: 'Gerenciar matriculas e dados estudantis.',
    group: 'Pessoas',
  },
  'responsaveis:gerenciar': {
    label: 'Responsaveis',
    description: 'Manter contatos e responsaveis dos alunos.',
    group: 'Pessoas',
  },
  'simulados:gerenciar': {
    label: 'Provas e simulados',
    description: 'Criar avaliacoes, bancos e composicoes.',
    group: 'Pedagogico',
  },
  'merenda:gerenciar': {
    label: 'Merenda',
    description: 'Administrar cardapio, compras e estoque.',
    group: 'Gestao escolar',
  },
  'food.view.own_school': {
    label: 'Ver merenda da escola',
    description: 'Visualizar estoque e cardapio da propria escola.',
    group: 'Gestao escolar',
  },
  'food.request.create': {
    label: 'Solicitar alimento',
    description: 'Criar solicitacoes de alimentos para avaliacao nutricional.',
    group: 'Gestao escolar',
  },
  'food.request.view.own_school': {
    label: 'Ver solicitacoes da escola',
    description: 'Acompanhar solicitacoes da propria escola.',
    group: 'Gestao escolar',
  },
  'food.request.edit_when_adjustment': {
    label: 'Corrigir solicitacao',
    description: 'Editar solicitacoes quando o nutricionista pedir ajuste.',
    group: 'Gestao escolar',
  },
  'food.request.view.all': {
    label: 'Ver todas as solicitacoes',
    description: 'Visualizar solicitacoes de merenda da rede.',
    group: 'Gestao escolar',
  },
  'food.request.approve': {
    label: 'Aprovar solicitacao',
    description: 'Aprovar tecnicamente solicitacoes de alimentos.',
    group: 'Gestao escolar',
  },
  'food.request.reject': {
    label: 'Reprovar solicitacao',
    description: 'Reprovar solicitacoes com motivo obrigatorio.',
    group: 'Gestao escolar',
  },
  'food.request.request_adjustment': {
    label: 'Pedir ajuste',
    description: 'Solicitar correcao de quantidade, unidade ou justificativa.',
    group: 'Gestao escolar',
  },
  'food.stock.view.all': {
    label: 'Ver estoque da rede',
    description: 'Visualizar estoque e alertas de todas as escolas.',
    group: 'Gestao escolar',
  },
  'food.expiration_alerts.view': {
    label: 'Alertas de validade',
    description: 'Ver alimentos proximos do vencimento.',
    group: 'Gestao escolar',
  },
  'food.view.all': {
    label: 'Ver merenda da rede',
    description: 'Acessar dados de merenda de todas as escolas.',
    group: 'Gestao escolar',
  },
  'food.request.manage.all': {
    label: 'Gerenciar solicitacoes',
    description: 'Criar, avaliar e acompanhar solicitacoes da rede.',
    group: 'Gestao escolar',
  },
  'food.stock.manage': {
    label: 'Gerenciar estoque',
    description: 'Adicionar, corrigir e remover itens do estoque oficial.',
    group: 'Gestao escolar',
  },
  'food.purchase.manage': {
    label: 'Gerenciar compras',
    description: 'Registrar compras e entradas no estoque.',
    group: 'Gestao escolar',
  },
  'food.supplier.manage': {
    label: 'Gerenciar fornecedores',
    description: 'Informar e manter fornecedores da merenda.',
    group: 'Gestao escolar',
  },
  'food.audit.view': {
    label: 'Auditoria da merenda',
    description: 'Consultar historico de solicitacoes e movimentacoes.',
    group: 'Gestao escolar',
  },
  'diario:registrar': {
    label: 'Diario',
    description: 'Registrar aulas, presencas e rotina.',
    group: 'Pedagogico',
  },
  'notas:gerenciar': {
    label: 'Notas',
    description: 'Lancar e revisar resultados dos alunos.',
    group: 'Pedagogico',
  },
  'relatorios:tri': {
    label: 'Relatorios TRI',
    description: 'Acessar analises e desempenho da rede.',
    group: 'Relatorios',
  },
  'cargos:gerenciar': {
    label: 'Cargos',
    description: 'Editar permissoes e trocar cargos.',
    group: 'Sistema',
  },
  'auditoria:ler': {
    label: 'Auditoria',
    description: 'Consultar registros sensiveis do sistema.',
    group: 'Sistema',
  },
}

const permissionGroups: PermissionMeta['group'][] = ['Gestao escolar', 'Pessoas', 'Pedagogico', 'Relatorios', 'Sistema']

const groupStyles: Record<PermissionMeta['group'], { icon: typeof Building2; badge: string; selected: string; soft: string }> = {
  'Gestao escolar': {
    icon: Building2,
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    selected: 'border-sky-300 bg-sky-50 ring-sky-100',
    soft: 'bg-sky-500',
  },
  Pessoas: {
    icon: Users,
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    selected: 'border-violet-300 bg-violet-50 ring-violet-100',
    soft: 'bg-violet-500',
  },
  Pedagogico: {
    icon: GraduationCap,
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    selected: 'border-emerald-300 bg-emerald-50 ring-emerald-100',
    soft: 'bg-emerald-500',
  },
  Relatorios: {
    icon: BookOpen,
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    selected: 'border-amber-300 bg-amber-50 ring-amber-100',
    soft: 'bg-amber-500',
  },
  Sistema: {
    icon: KeyRound,
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    selected: 'border-indigo-300 bg-indigo-50 ring-indigo-100',
    soft: 'bg-indigo-500',
  },
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function compactRoleText(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '')
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function getPermissionMeta(permission: string): PermissionMeta {
  const [area, action] = permission.split(':')

  return permissionMeta[permission] ?? {
    label: area || permission,
    description: action ? `Permite ${action} em ${area}.` : 'Permissao personalizada do sistema.',
    group: 'Sistema',
  }
}

export default function AccessView({ roles, users, schools, onUpdateRole, onUpdateUserRole }: AccessViewProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? '')
  const [permissionDraft, setPermissionDraft] = useState<string[]>(roles[0]?.permissions ?? [])
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<UserKindFilter>('all')
  const [userSearch, setUserSearch] = useState('')

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0]
  const selectedCount = permissionDraft.length
  const totalPermissions = permissionOptions.length

  const roleOptions = useMemo<CompactSelectOption[]>(
    () => roles.map((role) => ({
      value: role.id,
      label: role.name,
      description: role.description,
    })),
    [roles],
  )

  const schoolOptions = useMemo<CompactSelectOption[]>(
    () => [
      { value: 'all', label: 'Todas as escolas', description: 'Buscar em toda a rede' },
      { value: 'network', label: 'Rede municipal', description: 'Usuarios sem escola vinculada' },
      ...schools.map((school) => ({
        value: school.id,
        label: school.name,
        description: [school.city, school.inepCode].filter(Boolean).join(' - '),
      })),
    ],
    [schools],
  )

  const userKindOptions = useMemo<CompactSelectOption<UserKindFilter>[]>(
    () => [
      { value: 'all', label: 'Todos os perfis', description: 'Sem filtro por tipo de usuario' },
      { value: 'professor', label: 'Professores', description: 'Usuarios docentes' },
      { value: 'coordenador', label: 'Coordenadores', description: 'Coordenacao pedagogica ou administrativa' },
      { value: 'responsavel', label: 'Responsaveis', description: 'Responsaveis por alunos' },
      { value: 'aluno', label: 'Alunos', description: 'Usuarios estudantes' },
    ],
    [],
  )

  function getRole(id: string) {
    return roles.find((role) => role.id === id)
  }

  function getRoleName(id: string) {
    return getRole(id)?.name ?? 'Cargo nao localizado'
  }

  function getSchoolName(id: string | null) {
    return id ? schools.find((school) => school.id === id)?.name ?? 'Escola nao localizada' : 'Rede municipal'
  }

  function getUserKind(user: UserAccount): Exclude<UserKindFilter, 'all'> | 'outro' {
    const role = getRole(user.roleId)
    const roleText = compactRoleText(`${role?.code ?? ''} ${role?.name ?? ''} ${role?.description ?? ''}`)

    if (user.linkedTeacherId || roleText.includes('professor')) return 'professor'
    if (roleText.includes('coorden') || roleText.includes('pedagog')) return 'coordenador'
    if (user.linkedGuardianId || roleText.includes('responsavel') || roleText.includes('responsaveis')) return 'responsavel'
    if (user.linkedStudentId || roleText.includes('aluno')) return 'aluno'

    return 'outro'
  }

  function getUserKindLabel(user: UserAccount) {
    const kind = getUserKind(user)
    const labels: Record<typeof kind, string> = {
      professor: 'Professor',
      coordenador: 'Coordenador',
      responsavel: 'Responsavel',
      aluno: 'Aluno',
      outro: 'Administrativo',
    }

    return labels[kind]
  }

  function selectRole(role: Role) {
    setSelectedRoleId(role.id)
    setPermissionDraft(role.permissions)
  }

  function togglePermission(permission: string) {
    setPermissionDraft((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    )
  }

  function setGroupPermissions(group: PermissionMeta['group'], checked: boolean) {
    const groupPermissions = permissionOptions.filter((permission) => getPermissionMeta(permission).group === group)

    setPermissionDraft((current) => {
      if (checked) return Array.from(new Set([...current, ...groupPermissions]))
      return current.filter((permission) => !groupPermissions.includes(permission))
    })
  }

  function getSearchScore(user: UserAccount, query: string) {
    const roleName = getRoleName(user.roleId)
    const schoolName = getSchoolName(user.schoolId)
    const kind = getUserKindLabel(user)
    const fields = [
      { value: user.name, weight: 80 },
      { value: user.email, weight: 58 },
      { value: user.login ?? '', weight: 48 },
      { value: user.phone ?? '', weight: 34 },
      { value: roleName, weight: 24 },
      { value: schoolName, weight: 18 },
      { value: kind, weight: 16 },
    ]

    return fields.reduce((best, field) => {
      const value = normalizeText(field.value)
      if (!value) return best
      if (value === query) return Math.max(best, field.weight + 60)
      if (value.startsWith(query)) return Math.max(best, field.weight + 36)
      if (value.includes(query)) return Math.max(best, field.weight + 18)

      const wordScore = value
        .split(/\s+/)
        .some((word) => word.startsWith(query))
        ? field.weight + 28
        : 0

      return Math.max(best, wordScore)
    }, 0)
  }

  const searchedUsers = useMemo(() => {
    const query = normalizeText(userSearch.trim())
    if (!query) return []

    return users
      .filter((user) => {
        const matchesSchool = schoolFilter === 'all'
          || (schoolFilter === 'network' ? !user.schoolId : user.schoolId === schoolFilter)
        const matchesKind = kindFilter === 'all' || getUserKind(user) === kindFilter
        return matchesSchool && matchesKind
      })
      .map((user) => ({ user, score: getSearchScore(user, query) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name))
      .slice(0, 5)
      .map((result) => result.user)
  }, [kindFilter, roles, schoolFilter, schools, userSearch, users])

  const hasUserSearch = Boolean(userSearch.trim())

  return (
    <div className="grid min-h-screen gap-4 bg-slate-50 px-[clamp(12px,2.5vw,40px)] py-6 pb-12 font-['DM_Sans'] text-slate-900">
      <PageTitleBar
        label="Controle de acesso"
        title="Cargos e permissões"
        icon={<ShieldCheck />}
        actions={(
          <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[12px] font-black uppercase tracking-widest text-indigo-700">
            <ShieldCheck size={16} />
            LGPD e auditoria
          </div>
        )}
      />

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">
          <div className="grid gap-2 border-b border-slate-400 bg-white px-5 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Cargos</p>
            <div className="flex flex-row gap-2 overflow-x-auto pb-1">
              {roles.map((role) => {
                const selected = role.id === selectedRoleId
                return (
                  <button
                    key={role.id}
                    type="button"
                    className={`inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[12px] font-black transition-all ${
                      selected
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-300 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                    }`}
                    onClick={() => selectRole(role)}
                  >
                    <UserCog size={13} />
                    <span>{role.name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${selected ? 'bg-white/15 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>
                      {role.permissions.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 border-b border-slate-400 bg-slate-50 px-5 py-4 max-[720px]:flex-col">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Permissoes do cargo</p>
              <h2 className="font-['Sora',system-ui,sans-serif] text-lg font-black leading-tight text-slate-900">{selectedRole?.name ?? 'Cargo'}</h2>
              <p className="mt-1 max-w-[680px] text-sm leading-6 text-slate-500">
                Marque os blocos de acesso permitidos para este cargo. As permissoes ficam agrupadas por area para facilitar a revisao.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 max-[720px]:w-full">
              <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-black uppercase tracking-widest text-slate-600">
                <CheckCircle2 size={15} className="text-emerald-600" />
                {selectedCount}/{totalPermissions}
              </span>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-black uppercase tracking-widest text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
                onClick={() => setPermissionDraft(permissionOptions)}
              >
                Marcar tudo
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-black uppercase tracking-widest text-slate-600 transition hover:border-rose-300 hover:text-rose-700"
                onClick={() => setPermissionDraft([])}
              >
                Limpar
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-indigo-700 bg-indigo-600 px-4 text-[13px] font-black text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => selectedRole && onUpdateRole(selectedRole.id, { permissions: permissionDraft })}
                disabled={!selectedRole}
              >
                <Save size={17} />
                Salvar
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-5">
            {permissionGroups.map((group) => {
              const permissions = permissionOptions.filter((permission) => getPermissionMeta(permission).group === group)
              const selectedInGroup = permissions.filter((permission) => permissionDraft.includes(permission)).length
              const fullySelected = selectedInGroup === permissions.length
              const Icon = groupStyles[group].icon

              return (
                <div key={group} className="rounded-xl border border-slate-300 bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-3 max-[560px]:flex-col max-[560px]:items-start">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white ${groupStyles[group].soft}`}>
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-900">{group}</h3>
                        <p className="text-xs font-semibold text-slate-500">{selectedInGroup} de {permissions.length} selecionadas</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`inline-flex min-h-8 items-center rounded-lg border px-3 text-[11px] font-black uppercase tracking-widest transition ${groupStyles[group].badge}`}
                      onClick={() => setGroupPermissions(group, !fullySelected)}
                    >
                      {fullySelected ? 'Desmarcar area' : 'Marcar area'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 max-[760px]:grid-cols-1">
                    {permissions.map((permission) => {
                      const meta = getPermissionMeta(permission)
                      const checked = permissionDraft.includes(permission)

                      return (
                        <label
                          key={permission}
                          className={`group flex min-h-[92px] cursor-pointer items-start gap-3 rounded-xl border bg-slate-50 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/40 ${
                            checked ? `${groupStyles[group].selected} ring-2` : 'border-slate-300'
                          }`}
                        >
                          <input
                            className="mt-1 h-[18px] w-[18px] shrink-0 accent-indigo-600"
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(permission)}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-black text-slate-800">{meta.label}</span>
                            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{meta.description}</span>
                            <span className="mt-2 inline-flex rounded-md bg-white px-2 py-0.5 font-mono text-[10px] font-black text-slate-400 ring-1 ring-slate-200">
                              {permission}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">
        <div className="grid gap-4 border-b border-slate-400 bg-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-4 max-[920px]:flex-col">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-500">Usuarios</p>
              <h2 className="font-['Sora',system-ui,sans-serif] text-lg font-black leading-tight text-slate-900">Alterar cargo</h2>
              <p className="mt-1 max-w-[760px] text-sm leading-6 text-slate-500">
                Digite para encontrar ate 5 usuarios mais proximos. Use os filtros para restringir por escola e perfil.
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-black uppercase tracking-widest text-slate-600">
              <SlidersHorizontal size={15} />
              Busca guiada
            </div>
          </div>

          <div className="grid grid-cols-[minmax(240px,1fr)_minmax(180px,0.34fr)_minmax(180px,0.28fr)] gap-3 max-[920px]:grid-cols-1">
            <label className="relative min-w-0">
              <span className="sr-only">Buscar usuario</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Buscar por nome, e-mail, login, telefone, cargo..."
                className="min-h-11 w-full min-w-0 rounded-lg border border-slate-400 bg-white pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
              />
            </label>

            <CompactSelect
              value={schoolFilter}
              options={schoolOptions}
              onChange={setSchoolFilter}
              ariaLabel="Filtrar por escola"
              dropdownWidth="trigger"
              className="min-h-11 rounded-lg border border-slate-400 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
            />

            <CompactSelect<UserKindFilter>
              value={kindFilter}
              options={userKindOptions}
              onChange={setKindFilter}
              ariaLabel="Filtrar por perfil"
              dropdownWidth="trigger"
              className="min-h-11 rounded-lg border border-slate-400 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="grid gap-3 p-5">
          {!hasUserSearch ? (
            <div className="grid min-h-[170px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Search size={20} />
                </span>
                <h3 className="mt-3 font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">Digite para buscar usuarios</h3>
                <p className="mt-1 max-w-[420px] text-sm leading-6 text-slate-500">
                  A lista completa fica oculta para evitar ruido. Os 5 resultados mais proximos aparecem aqui.
                </p>
              </div>
            </div>
          ) : searchedUsers.length === 0 ? (
            <div className="grid min-h-[150px] place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
                  <UserRound size={20} />
                </span>
                <h3 className="mt-3 font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">Nenhum usuario encontrado</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Tente outro termo ou ajuste os filtros.</p>
              </div>
            </div>
          ) : (
            searchedUsers.map((user) => {
              const currentRole = getRoleName(user.roleId)

              return (
                <article key={user.id} className="grid min-w-0 grid-cols-[minmax(220px,1fr)_minmax(180px,0.5fr)_minmax(180px,0.42fr)_minmax(220px,0.55fr)] items-center gap-3 rounded-xl border border-slate-300 bg-white p-3 shadow-sm transition hover:border-indigo-300 hover:shadow-md max-[1120px]:grid-cols-2 max-[620px]:grid-cols-1">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-sm font-black text-white shadow-sm">
                      {getInitials(user.name) || <UserRound size={17} />}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-black text-slate-900">{user.name}</strong>
                      <span className="block truncate text-xs font-semibold text-slate-500">{user.email || user.login || 'Sem contato cadastrado'}</span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Escola</p>
                    <p className="truncate text-xs font-bold text-slate-700">{getSchoolName(user.schoolId)}</p>
                  </div>

                  <div className="flex min-w-0 flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <UserCheck size={12} />
                      {getUserKindLabel(user)}
                    </span>
                    <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
                      {currentRole}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Novo cargo</p>
                    <CompactSelect
                      value={user.roleId}
                      options={roleOptions}
                      onChange={(roleId) => onUpdateUserRole(user.id, roleId)}
                      ariaLabel={`Alterar cargo de ${user.name}`}
                      dropdownWidth="trigger"
                      className="min-h-10 rounded-lg border border-slate-400 bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100"
                    />
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
