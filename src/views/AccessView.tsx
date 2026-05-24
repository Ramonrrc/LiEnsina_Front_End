import { useEffect, useMemo, useState } from 'react'
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
  Loader2,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  ChevronDown,
  Sparkles,
  LayoutDashboard,
  Layers,
} from 'lucide-react'

import { CompactSelect, type CompactSelectOption } from '../components/ui/compact-select'
import { PageTitleBar } from '../components/ui/page-title-bar'
import { permissionOptions } from '../data'
import type { AccessUserKindFilter, AccessUserSearchPayload, Role, School, UserAccount } from '../types'

interface AccessViewProps {
  roles: Role[]
  users: UserAccount[]
  schools: School[]
  onSearchUsers?: (params: { search: string; schoolId: string; kind: AccessUserKindFilter; limit: number }) => Promise<AccessUserSearchPayload>
  onUpdateRole: (id: string, draft: Partial<Role>) => Promise<void>
  onUpdateUserRole: (id: string, roleId: string) => Promise<void>
  onUpdateUserSchool: (id: string, schoolId: string | null) => Promise<void>
}

type UserKindFilter = AccessUserKindFilter

type PermissionMeta = {
  label: string
  description: string
  group: 'Gestao escolar' | 'Pessoas' | 'Pedagogico' | 'Relatorios' | 'Sistema'
}

const permissionMeta: Record<string, PermissionMeta> = {
  'dashboard:ler': { label: 'Dashboard', description: 'Visualizar indicadores e resumo geral.', group: 'Gestao escolar' },
  'escolas:gerenciar': { label: 'Escolas', description: 'Cadastrar e editar unidades escolares.', group: 'Gestao escolar' },
  'turmas:gerenciar': { label: 'Turmas', description: 'Organizar series, horarios e vinculos.', group: 'Gestao escolar' },
  'professores:gerenciar': { label: 'Professores', description: 'Criar, editar e vincular docentes.', group: 'Pessoas' },
  'alunos:gerenciar': { label: 'Alunos', description: 'Gerenciar matriculas e dados estudantis.', group: 'Pessoas' },
  'responsaveis:gerenciar': { label: 'Responsaveis', description: 'Manter contatos e responsaveis dos alunos.', group: 'Pessoas' },
  'simulados:gerenciar': { label: 'Provas e simulados', description: 'Criar avaliacoes, bancos e composicoes.', group: 'Pedagogico' },
  'merenda:gerenciar': { label: 'Merenda', description: 'Administrar cardapio, compras e estoque.', group: 'Gestao escolar' },
  'food.view.own_school': { label: 'Ver merenda da escola', description: 'Visualizar estoque e cardapio da propria escola.', group: 'Gestao escolar' },
  'food.request.create': { label: 'Solicitar alimento', description: 'Criar solicitacoes de alimentos para avaliacao nutricional.', group: 'Gestao escolar' },
  'food.request.view.own_school': { label: 'Ver solicitacoes da escola', description: 'Acompanhar solicitacoes da propria escola.', group: 'Gestao escolar' },
  'food.request.edit_when_adjustment': { label: 'Corrigir solicitacao', description: 'Editar solicitacoes quando o nutricionista pedir ajuste.', group: 'Gestao escolar' },
  'food.request.view.all': { label: 'Ver todas as solicitacoes', description: 'Visualizar solicitacoes de merenda da rede.', group: 'Gestao escolar' },
  'food.request.approve': { label: 'Aprovar solicitacao', description: 'Aprovar tecnicamente solicitacoes de alimentos.', group: 'Gestao escolar' },
  'food.request.reject': { label: 'Reprovar solicitacao', description: 'Reprovar solicitacoes com motivo obrigatorio.', group: 'Gestao escolar' },
  'food.request.request_adjustment': { label: 'Pedir ajuste', description: 'Solicitar correcao de quantidade, unidade ou justificativa.', group: 'Gestao escolar' },
  'food.stock.view.all': { label: 'Ver estoque da rede', description: 'Visualizar estoque e alertas de todas as escolas.', group: 'Gestao escolar' },
  'food.expiration_alerts.view': { label: 'Alertas de validade', description: 'Ver alimentos proximos do vencimento.', group: 'Gestao escolar' },
  'food.view.all': { label: 'Ver merenda da rede', description: 'Acessar dados de merenda de todas as escolas.', group: 'Gestao escolar' },
  'food.request.manage.all': { label: 'Gerenciar solicitacoes', description: 'Criar, avaliar e acompanhar solicitacoes da rede.', group: 'Gestao escolar' },
  'food.stock.manage': { label: 'Gerenciar estoque', description: 'Adicionar, corrigir e remover itens do estoque oficial.', group: 'Gestao escolar' },
  'food.purchase.manage': { label: 'Gerenciar compras', description: 'Registrar compras e entradas no estoque.', group: 'Gestao escolar' },
  'food.supplier.manage': { label: 'Gerenciar fornecedores', description: 'Informar e manter fornecedores da merenda.', group: 'Gestao escolar' },
  'food.audit.view': { label: 'Auditoria da merenda', description: 'Consultar historico de solicitacoes e movimentacoes.', group: 'Gestao escolar' },
  'diario:registrar': { label: 'Diario', description: 'Registrar aulas, presencas e rotina.', group: 'Pedagogico' },
  'notas:gerenciar': { label: 'Notas', description: 'Lancar e revisar resultados dos alunos.', group: 'Pedagogico' },
  'relatorios:tri': { label: 'Relatorios TRI', description: 'Acessar analises e desempenho da rede.', group: 'Relatorios' },
  'cargos:gerenciar': { label: 'Cargos', description: 'Editar permissoes e trocar cargos.', group: 'Sistema' },
  'auditoria:ler': { label: 'Auditoria', description: 'Consultar registros sensiveis do sistema.', group: 'Sistema' },
}

const permissionGroups: PermissionMeta['group'][] = ['Gestao escolar', 'Pessoas', 'Pedagogico', 'Relatorios', 'Sistema']

const groupConfig: Record<PermissionMeta['group'], {
  icon: typeof Building2
  color: string
  bg: string
  border: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
  checkboxAccent: string
  selectedBorder: string
  selectedBg: string
  selectedRing: string
  headerBg: string
  iconBg: string
  iconText: string
  progressFill: string
  buttonHover: string
}> = {
  'Gestao escolar': {
    icon: Building2,
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-400',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-400',
    checkboxAccent: 'accent-sky-600',
    selectedBorder: 'border-sky-500',
    selectedBg: 'bg-sky-50/80',
    selectedRing: 'ring-sky-200',
    headerBg: 'bg-sky-50/60',
    iconBg: 'bg-sky-500',
    iconText: 'text-white',
    progressFill: 'bg-sky-500',
    buttonHover: 'hover:border-sky-500 hover:bg-sky-50 hover:text-sky-800',
  },
  Pessoas: {
    icon: Users,
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-400',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-800',
    badgeBorder: 'border-violet-400',
    checkboxAccent: 'accent-violet-600',
    selectedBorder: 'border-violet-500',
    selectedBg: 'bg-violet-50/80',
    selectedRing: 'ring-violet-200',
    headerBg: 'bg-violet-50/60',
    iconBg: 'bg-violet-500',
    iconText: 'text-white',
    progressFill: 'bg-violet-500',
    buttonHover: 'hover:border-violet-500 hover:bg-violet-50 hover:text-violet-800',
  },
  Pedagogico: {
    icon: GraduationCap,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-400',
    checkboxAccent: 'accent-emerald-600',
    selectedBorder: 'border-emerald-500',
    selectedBg: 'bg-emerald-50/80',
    selectedRing: 'ring-emerald-200',
    headerBg: 'bg-emerald-50/60',
    iconBg: 'bg-emerald-500',
    iconText: 'text-white',
    progressFill: 'bg-emerald-500',
    buttonHover: 'hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800',
  },
  Relatorios: {
    icon: BookOpen,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-400',
    checkboxAccent: 'accent-amber-600',
    selectedBorder: 'border-amber-500',
    selectedBg: 'bg-amber-50/80',
    selectedRing: 'ring-amber-200',
    headerBg: 'bg-amber-50/60',
    iconBg: 'bg-amber-500',
    iconText: 'text-white',
    progressFill: 'bg-amber-500',
    buttonHover: 'hover:border-amber-500 hover:bg-amber-50 hover:text-amber-800',
  },
  Sistema: {
    icon: KeyRound,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-400',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-400',
    checkboxAccent: 'accent-indigo-600',
    selectedBorder: 'border-indigo-500',
    selectedBg: 'bg-indigo-50/80',
    selectedRing: 'ring-indigo-200',
    headerBg: 'bg-indigo-50/60',
    iconBg: 'bg-indigo-500',
    iconText: 'text-white',
    progressFill: 'bg-indigo-500',
    buttonHover: 'hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-800',
  },
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function compactRoleText(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '')
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function getPermissionMeta(permission: string): PermissionMeta {
  const [area, action] = permission.split(':')
  return permissionMeta[permission] ?? {
    label: area || permission,
    description: action ? `Permite ${action} em ${area}.` : 'Permissao personalizada do sistema.',
    group: 'Sistema',
  }
}

function SkeletonUserCard() {
  return (
    <div className="animate-pulse grid grid-cols-[minmax(220px,1fr)_minmax(210px,0.55fr)_minmax(180px,0.42fr)_minmax(220px,0.55fr)] items-center gap-3 rounded-2xl border border-slate-300 bg-white p-4 max-[1120px]:grid-cols-2 max-[620px]:grid-cols-1">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded-full bg-slate-200" />
          <div className="h-3 w-44 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-20 rounded-full bg-slate-100" />
        <div className="h-10 w-full rounded-lg bg-slate-200" />
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-16 rounded-full bg-slate-100" />
        <div className="flex gap-1.5">
          <div className="h-6 w-20 rounded-full bg-slate-100" />
          <div className="h-6 w-16 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 w-16 rounded-full bg-slate-100" />
        <div className="h-10 w-full rounded-lg bg-slate-200" />
      </div>
    </div>
  )
}

const kindBadgeConfig: Record<string, { bg: string; text: string; border: string }> = {
  professor: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-400' },
  coordenador: { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-400' },
  responsavel: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-400' },
  aluno: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-400' },
  outro: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-400' },
}

export default function AccessView({ roles, users, schools, onSearchUsers, onUpdateRole, onUpdateUserRole, onUpdateUserSchool }: AccessViewProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? '')
  const [permissionDraft, setPermissionDraft] = useState<string[]>(roles[0]?.permissions ?? [])
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState<UserKindFilter>('all')
  const [userSearch, setUserSearch] = useState('')
  const [remoteUsers, setRemoteUsers] = useState<UserAccount[]>([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [userSearchError, setUserSearchError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0]
  const selectedCount = permissionDraft.length
  const totalPermissions = permissionOptions.length
  const isDirty = JSON.stringify(permissionDraft.slice().sort()) !== JSON.stringify((selectedRole?.permissions ?? []).slice().sort())

  const roleOptions = useMemo<CompactSelectOption[]>(
    () => roles.map((role) => ({ value: role.id, label: role.name, description: role.description })),
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

  const schoolLinkOptions = useMemo<CompactSelectOption[]>(
    () => [
      { value: 'network', label: 'Sem escola vinculada', description: 'Usuario com acesso de rede ou administrativo' },
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
    setSaveSuccess(false)
  }

  function togglePermission(permission: string) {
    setPermissionDraft((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    )
    setSaveSuccess(false)
  }

  function setGroupPermissions(group: PermissionMeta['group'], checked: boolean) {
    const groupPermissions = permissionOptions.filter((permission) => getPermissionMeta(permission).group === group)
    setPermissionDraft((current) => {
      if (checked) return Array.from(new Set([...current, ...groupPermissions]))
      return current.filter((permission) => !groupPermissions.includes(permission))
    })
    setSaveSuccess(false)
  }

  function toggleGroupCollapse(group: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
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
      const wordScore = value.split(/\s+/).some((word) => word.startsWith(query)) ? field.weight + 28 : 0
      return Math.max(best, wordScore)
    }, 0)
  }

  const localSearchedUsers = useMemo(() => {
    const query = normalizeText(userSearch.trim())
    if (!query) return []
    return users
      .filter((user) => {
        const matchesSchool = schoolFilter === 'all' || (schoolFilter === 'network' ? !user.schoolId : user.schoolId === schoolFilter)
        const matchesKind = kindFilter === 'all' || getUserKind(user) === kindFilter
        return matchesSchool && matchesKind
      })
      .map((user) => ({ user, score: getSearchScore(user, query) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.user.name.localeCompare(b.user.name))
      .slice(0, 10)
      .map((result) => result.user)
  }, [kindFilter, roles, schoolFilter, schools, userSearch, users])

  const hasUserSearch = Boolean(userSearch.trim())
  const searchedUsers = onSearchUsers && !userSearchError ? remoteUsers : localSearchedUsers
  const searchSourceLabel = onSearchUsers && !userSearchError ? 'Backend integrado' : 'Busca local'

  useEffect(() => {
    const query = userSearch.trim()
    if (!onSearchUsers || !query) {
      setRemoteUsers([])
      setUserSearchLoading(false)
      setUserSearchError(null)
      return
    }
    let cancelled = false
    setUserSearchLoading(true)
    setUserSearchError(null)
    const timer = window.setTimeout(() => {
      onSearchUsers({ search: query, schoolId: schoolFilter, kind: kindFilter, limit: 10 })
        .then((payload) => { if (cancelled) return; setRemoteUsers(payload.users) })
        .catch((error) => { if (cancelled) return; setRemoteUsers([]); setUserSearchError(error instanceof Error ? error.message : 'Nao foi possivel buscar usuarios no backend.') })
        .finally(() => { if (!cancelled) setUserSearchLoading(false) })
    }, 280)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [kindFilter, onSearchUsers, schoolFilter, userSearch])

  function getRoleVisibilitySummary(roleId: string) {
    const role = getRole(roleId)
    if (!role) return ['Cargo nao localizado']
    const groups = permissionGroups
      .map((group) => {
        const count = role.permissions.filter((permission) => getPermissionMeta(permission).group === group).length
        return count > 0 ? `${group} (${count})` : null
      })
      .filter((item): item is string => Boolean(item))
    return groups.length ? groups : ['Sem permissoes ativas']
  }

  async function handleSave() {
    if (!selectedRole) return
    setSaving(true)
    try {
      await onUpdateRole(selectedRole.id, { permissions: permissionDraft })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleUserRoleChange(userId: string, roleId: string) {
    await onUpdateUserRole(userId, roleId)
    setRemoteUsers((current) => current.map((user) => user.id === userId ? { ...user, roleId } : user))
  }

  async function handleUserSchoolChange(userId: string, schoolValue: string) {
    const schoolId = schoolValue === 'network' ? null : schoolValue
    await onUpdateUserSchool(userId, schoolId)
    setRemoteUsers((current) => current.map((user) => user.id === userId ? { ...user, schoolId } : user))
  }

  const progressPercent = totalPermissions > 0 ? Math.round((selectedCount / totalPermissions) * 100) : 0

  return (
    <div
      className={`grid min-h-screen gap-6 bg-slate-50 px-[clamp(12px,2.5vw,40px)] py-6 pb-16 font-['DM_Sans'] text-slate-900 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      style={{ transitionProperty: 'opacity, transform' }}
    >
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-fade-slide { animation: fadeSlideIn 0.35s ease both; }
        .animate-scale-in { animation: scaleIn 0.25s ease both; }
        .perm-card { transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s, transform 0.12s; }
        .perm-card:hover { transform: translateY(-1px); }
        .perm-card:active { transform: scale(0.99); }
        .role-btn { transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1); }
        .role-btn:hover { transform: translateY(-1px); }
        .section-card { transition: box-shadow 0.2s; }
        .section-card:hover { box-shadow: 0 4px 24px 0 rgba(99,102,241,0.07); }
        .save-btn { transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1); }
        .save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79,70,229,0.25); }
        .save-btn:active:not(:disabled) { transform: scale(0.98); }
        .progress-bar { transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
        .user-card { transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s; }
        .user-card:hover { transform: translateY(-1px); box-shadow: 0 4px 20px 0 rgba(99,102,241,0.08); }
        .group-header { transition: background-color 0.15s; }
        .collapse-icon { transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>

      <PageTitleBar
        label="Controle de acesso"
        title="Cargos e permissões"
        icon={<ShieldCheck />}
        actions={(
          <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-indigo-700 shadow-sm">
            <ShieldCheck size={15} />
            LGPD e auditoria
          </div>
        )}
      />

      {/* SECTION: Roles & Permissions */}
      <section
        className="section-card min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm animate-fade-slide"
        style={{ animationDelay: '0.05s' }}
      >
        {/* Role tabs */}
        <div className="border-b border-slate-400 bg-white px-5 py-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cargos disponíveis</p>
          <div className="flex flex-row gap-2 overflow-x-auto pb-1">
            {roles.map((role, i) => {
              const selected = role.id === selectedRoleId
              const rolePerms = role.permissions.length
              return (
                <button
                  key={role.id}
                  type="button"
                  className={`role-btn inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-xl border px-4 text-[12px] font-black tracking-wide animate-scale-in ${
                    selected
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-md'
                      : 'border-slate-400 bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => selectRole(role)}
                >
                  <UserCog size={14} />
                  <span>{role.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 ring-1 ring-slate-300'}`}>
                    {rolePerms}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Role header */}
        <div className="border-b border-slate-400 bg-gradient-to-r from-slate-50 to-indigo-50/30 px-5 py-5">
          <div className="flex items-start justify-between gap-4 max-[720px]:flex-col">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Permissões do cargo</p>
                {isDirty && (
                  <span className="animate-scale-in inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-800">
                    <Sparkles size={9} />
                    Alterações pendentes
                  </span>
                )}
              </div>
              <h2 className="mt-0.5 font-['Sora',system-ui,sans-serif] text-xl font-black leading-tight text-slate-900">{selectedRole?.name ?? 'Cargo'}</h2>
              <p className="mt-1.5 max-w-[640px] text-sm leading-6 text-slate-500">
                Marque os blocos de acesso para este cargo. As permissões ficam agrupadas por área.
              </p>

              {/* Progress bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 max-w-[280px] overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="progress-bar h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-black text-slate-500">
                  {selectedCount}/{totalPermissions} permissões
                  <span className="ml-1.5 text-indigo-600">({progressPercent}%)</span>
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 max-[720px]:w-full">
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-400 bg-white px-3.5 text-[11px] font-black uppercase tracking-widest text-slate-600 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={() => { setPermissionDraft(permissionOptions); setSaveSuccess(false) }}
              >
                <Layers size={14} className="mr-1.5" />
                Marcar tudo
              </button>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-400 bg-white px-3.5 text-[11px] font-black uppercase tracking-widest text-slate-600 transition hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => { setPermissionDraft([]); setSaveSuccess(false) }}
              >
                Limpar
              </button>
              <button
                type="button"
                className={`save-btn inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-5 text-[13px] font-black tracking-wide ${
                  saveSuccess
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700'
                } disabled:cursor-not-allowed disabled:opacity-60`}
                onClick={handleSave}
                disabled={!selectedRole || saving}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : saveSuccess ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>

        {/* Permission groups */}
        <div className="grid gap-4 p-5">
          {permissionGroups.map((group, groupIdx) => {
            const cfg = groupConfig[group]
            const Icon = cfg.icon
            const permissions = permissionOptions.filter((permission) => getPermissionMeta(permission).group === group)
            const selectedInGroup = permissions.filter((permission) => permissionDraft.includes(permission)).length
            const fullySelected = selectedInGroup === permissions.length
            const partiallySelected = selectedInGroup > 0 && !fullySelected
            const isCollapsed = collapsedGroups.has(group)
            const groupProgress = permissions.length > 0 ? Math.round((selectedInGroup / permissions.length) * 100) : 0

            return (
              <div
                key={group}
                className="overflow-hidden rounded-2xl border border-slate-400 bg-white animate-fade-slide"
                style={{ animationDelay: `${0.1 + groupIdx * 0.06}s` }}
              >
                {/* Group header */}
                <div
                  className={`group-header flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 ${cfg.headerBg} border-b border-slate-400`}
                  onClick={() => toggleGroupCollapse(group)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggleGroupCollapse(group)}
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cfg.iconBg} shadow-sm`}>
                      <Icon size={17} className={cfg.iconText} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-900">{group}</h3>
                        {partiallySelected && (
                          <span className={`inline-flex rounded-full border ${cfg.badgeBorder} ${cfg.badgeBg} px-2 py-0.5 text-[10px] font-black ${cfg.badgeText}`}>
                            Parcial
                          </span>
                        )}
                        {fullySelected && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                            <CheckCircle2 size={10} /> Completo
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/80 border border-slate-300">
                          <div
                            className={`progress-bar h-full rounded-full ${cfg.progressFill}`}
                            style={{ width: `${groupProgress}%` }}
                          />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500">{selectedInGroup}/{permissions.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className={`inline-flex min-h-8 items-center rounded-lg border px-3 text-[11px] font-black uppercase tracking-widest transition ${cfg.badgeBorder} ${cfg.badgeBg} ${cfg.badgeText} ${cfg.buttonHover}`}
                      onClick={(e) => { e.stopPropagation(); setGroupPermissions(group, !fullySelected) }}
                    >
                      {fullySelected ? 'Desmarcar' : 'Marcar área'}
                    </button>
                    <ChevronDown
                      size={18}
                      className={`collapse-icon shrink-0 text-slate-400 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </div>
                </div>

                {/* Permission cards grid */}
                {!isCollapsed && (
                  <div className="grid grid-cols-2 gap-3 p-4 max-[760px]:grid-cols-1">
                    {permissions.map((permission, permIdx) => {
                      const meta = getPermissionMeta(permission)
                      const checked = permissionDraft.includes(permission)

                      return (
                        <label
                          key={permission}
                          className={`perm-card group flex min-h-[96px] cursor-pointer items-start gap-3 rounded-xl border p-3.5 animate-scale-in ${
                            checked
                              ? `${cfg.selectedBorder} ${cfg.selectedBg} ring-2 ${cfg.selectedRing}`
                              : 'border-slate-400 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/30'
                          }`}
                          style={{ animationDelay: `${permIdx * 0.02}s` }}
                        >
                          <input
                            className={`mt-0.5 h-[18px] w-[18px] shrink-0 rounded ${cfg.checkboxAccent}`}
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(permission)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-slate-800">{meta.label}</span>
                            <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{meta.description}</span>
                            <span className="mt-2 inline-flex rounded-md border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                              {permission}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* SECTION: Users */}
      <section
        className="section-card min-w-0 overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm animate-fade-slide"
        style={{ animationDelay: '0.18s' }}
      >
        <div className="border-b border-slate-400 bg-gradient-to-r from-slate-50 to-violet-50/30 px-5 py-5">
          <div className="flex items-start justify-between gap-4 max-[920px]:flex-col">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">Usuários</p>
              <h2 className="mt-0.5 font-['Sora',system-ui,sans-serif] text-xl font-black leading-tight text-slate-900">Alterar cargo e escola vinculada</h2>
              <p className="mt-1.5 max-w-[680px] text-sm leading-6 text-slate-500">
                Busque pessoas na base. Use os filtros de escola e perfil para refinar os resultados.
              </p>
            </div>
            <div className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-black uppercase tracking-widest ${
              userSearchLoading
                ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-slate-400 bg-white text-slate-600'
            }`}>
              {userSearchLoading
                ? <Loader2 size={14} className="animate-spin text-indigo-600" />
                : <SlidersHorizontal size={14} />}
              {searchSourceLabel}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(240px,1fr)_minmax(180px,0.34fr)_minmax(180px,0.28fr)] gap-3 max-[920px]:grid-cols-1">
            <label className="relative min-w-0">
              <span className="sr-only">Buscar usuario</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Nome, e-mail, login, telefone, cargo..."
                className="min-h-11 w-full min-w-0 rounded-xl border border-slate-400 bg-white pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </label>

            <CompactSelect
              value={schoolFilter}
              options={schoolOptions}
              onChange={setSchoolFilter}
              ariaLabel="Filtrar por escola"
              dropdownWidth="trigger"
              className="min-h-11 rounded-xl border border-slate-400 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <CompactSelect<UserKindFilter>
              value={kindFilter}
              options={userKindOptions}
              onChange={setKindFilter}
              ariaLabel="Filtrar por perfil"
              dropdownWidth="trigger"
              className="min-h-11 rounded-xl border border-slate-400 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="grid gap-3 p-5">
          {hasUserSearch && userSearchError ? (
            <div className="animate-scale-in flex items-start gap-3 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3">
              <span className="mt-0.5 text-amber-600">⚠</span>
              <p className="text-xs font-semibold text-amber-800">
                Não foi possível concluir a busca integrada. Exibindo resultados locais carregados na tela.
              </p>
            </div>
          ) : null}

          {!hasUserSearch ? (
            <div className="grid min-h-[200px] place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
              <div className="animate-fade-slide">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-500 shadow-sm">
                  <Search size={22} />
                </span>
                <h3 className="mt-4 font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">Digite para buscar usuários</h3>
                <p className="mt-1.5 max-w-[380px] text-sm leading-6 text-slate-500">
                  A lista fica oculta para evitar ruído. Os 10 resultados mais próximos aparecem aqui.
                </p>
              </div>
            </div>
          ) : userSearchLoading ? (
            <div className="grid gap-3">
              {[0, 1, 2].map((i) => <SkeletonUserCard key={i} />)}
            </div>
          ) : searchedUsers.length === 0 ? (
            <div className="grid min-h-[170px] place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 p-8 text-center animate-scale-in">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <UserRound size={22} />
                </span>
                <h3 className="mt-4 font-['Sora',system-ui,sans-serif] text-sm font-black text-slate-800">Nenhum usuário encontrado</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500">Tente outro termo ou ajuste os filtros.</p>
              </div>
            </div>
          ) : (
            searchedUsers.map((user, i) => {
              const currentRole = getRoleName(user.roleId)
              const roleVisibility = getRoleVisibilitySummary(user.roleId)
              const kind = getUserKind(user)
              const kindLabel = getUserKindLabel(user)
              const kindStyle = kindBadgeConfig[kind] ?? kindBadgeConfig.outro
              const initials = getInitials(user.name)

              const avatarColors = [
                'bg-indigo-500', 'bg-violet-500', 'bg-sky-500',
                'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
              ]
              const avatarColor = avatarColors[user.name.charCodeAt(0) % avatarColors.length]

              return (
                <article
                  key={user.id}
                  className="user-card animate-fade-slide grid min-w-0 grid-cols-[minmax(220px,1fr)_minmax(210px,0.55fr)_minmax(180px,0.42fr)_minmax(220px,0.55fr)] items-center gap-3 rounded-2xl border border-slate-400 bg-white p-4 shadow-sm max-[1120px]:grid-cols-2 max-[620px]:grid-cols-1"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {/* Identity */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${avatarColor} text-sm font-black text-white shadow-md`}>
                      {initials || <UserRound size={17} />}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-black text-slate-900">{user.name}</strong>
                      <span className="block truncate text-xs font-semibold text-slate-500">{user.email || user.login || 'Sem contato cadastrado'}</span>
                    </div>
                  </div>

                  {/* School */}
                  <div className="min-w-0">
                    <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Escola vinculada</p>
                    <CompactSelect
                      value={user.schoolId ?? 'network'}
                      options={schoolLinkOptions}
                      onChange={(schoolValue) => handleUserSchoolChange(user.id, schoolValue)}
                      ariaLabel={`Vincular ${user.name} a uma escola`}
                      dropdownWidth="trigger"
                      className="min-h-10 w-full rounded-xl border border-slate-400 bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100"
                    />
                  </div>

                  {/* Visibility badges */}
                  <div className="min-w-0">
                    <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Perfil e acesso</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${kindStyle.bg} ${kindStyle.border} ${kindStyle.text}`}>
                        <UserCheck size={11} />
                        {kindLabel}
                      </span>
                      <span className="inline-flex rounded-full border border-indigo-400 bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-800">
                        {currentRole}
                      </span>
                      {roleVisibility.slice(0, 2).map((item) => (
                        <span key={item} className="inline-flex rounded-full border border-emerald-400 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Role change */}
                  <div className="min-w-0">
                    <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Alterar cargo</p>
                    <CompactSelect
                      value={user.roleId}
                      options={roleOptions}
                      onChange={(roleId) => handleUserRoleChange(user.id, roleId)}
                      ariaLabel={`Alterar cargo de ${user.name}`}
                      dropdownWidth="trigger"
                      className="min-h-10 w-full rounded-xl border border-slate-400 bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100"
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