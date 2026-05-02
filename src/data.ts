import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  School,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

import type { AppSection } from './types'

export const appName = import.meta.env.VITE_APP_NAME || 'LiEnsina'
export const logoPath = '/liensina-logo.png'

export const navItems: Array<{ id: AppSection; label: string; description: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Dashboard', description: 'Indicadores pedagogicos', icon: BarChart3 },
  { id: 'schools', label: 'Escolas', description: 'Unidades da rede', icon: School },
  { id: 'classes', label: 'Turmas', description: 'Professor e alunos', icon: GraduationCap },
  { id: 'evaluations', label: 'Simulados', description: 'Provas e correcao', icon: ClipboardCheck },
  { id: 'calendar', label: 'Calendário', description: 'Feriados e eventos', icon: CalendarDays },
  { id: 'access', label: 'Cargos', description: 'Permissoes por papel', icon: ShieldCheck },
  { id: 'settings', label: 'Perfil', description: 'Conta e preferencias', icon: Settings },
]

export const permissionOptions = [
  'dashboard:ler',
  'escolas:gerenciar',
  'turmas:gerenciar',
  'alunos:gerenciar',
  'simulados:gerenciar',
  'diario:registrar',
  'relatorios:tri',
  'cargos:gerenciar',
  'auditoria:ler',
]

export const localCredentials = [
  { label: 'Secretaria', email: 'secretaria@liensina.local' },
  { label: 'Diretor', email: 'diretor@liensina.local' },
  { label: 'Professor', email: 'professor@liensina.local' },
]
