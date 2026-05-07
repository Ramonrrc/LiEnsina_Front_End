import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  School,
  Settings,
  ShieldCheck,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

import type { AppSection } from './types'

export const appName = import.meta.env.VITE_APP_NAME || 'LiEnsina'
export const logoPath = '/liensina-logo.png'

export const navItems: Array<{ id: AppSection; label: string; description: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Dashboard', description: 'Indicadores pedagogicos', icon: BarChart3 },
  { id: 'schools', label: 'Escolas', description: 'Unidades da rede', icon: School },
  { id: 'evaluations', label: 'Provas e Simulados', description: 'Provas e correcao', icon: ClipboardCheck },
  { id: 'calendar', label: 'Calendário', description: 'Feriados e eventos', icon: CalendarDays },
  { id: 'meals', label: 'Merenda', description: 'Estoque e orcamento', icon: Utensils },
  { id: 'access', label: 'Cargos', description: 'Permissoes por papel', icon: ShieldCheck },
  { id: 'settings', label: 'Perfil', description: 'Conta e preferencias', icon: Settings },
]

export const permissionOptions = [
  'dashboard:ler',
  'escolas:gerenciar',
  'turmas:gerenciar',
  'professores:gerenciar',
  'alunos:gerenciar',
  'responsaveis:gerenciar',
  'simulados:gerenciar',
  'merenda:gerenciar',
  'diario:registrar',
  'notas:gerenciar',
  'relatorios:tri',
  'cargos:gerenciar',
  'auditoria:ler',
]
