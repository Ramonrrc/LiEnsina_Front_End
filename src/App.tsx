import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useTransform, useMotionValue, animate } from "motion/react"
import {
  ApiError,
  addMealFoodRequestToStock,
  confirmEvaluationCorrections,
  createClassRoom,
  createGuardian,
  createCalendarEvent,
  createEvaluation,
  createLessonRecord,
  createQuestion,
  generateQuestionSelection,
  getEvaluationCorrection,
  getEvaluationCorrectionCardFile,
  getStudentEvaluationCorrectionCardFile,
  getStudentGradeCorrectionDetail,
  createMealItem,
  createMealManagement,
  createMealFoodRequest,
  createRoomReservation,
  createSchool,
  createStudent,
  createTeacher,
  deleteCalendarEvent,
  deleteEvaluation,
  deleteQuestion,
  deleteMealFoodRequest,
  downloadEvaluationFile,
  downloadStudentEvaluationFile,
  loadAcademicScopeScreen,
  loadAccessScreen,
  loadCalendarScreen,
  loadClassesScreen,
  loadDashboardScreen,
  loadEvaluationCorrectionsScreen,
  loadEvaluationsScreen,
  loadMealsScreen,
  loadMePermissions,
  loadNotificationsScreen,
  loadRoomReservationsScreen,
  loadSchoolsScreen,
  loadSession,
  loadSettingsScreen,
  loadStudentsScreen,
  loadStudentGradesEvaluationsScreen,
  loadTeachersScreen,
  loadTeacherSubjectEvaluationsScreen,
  listLessonRecords,
  listClassesPage,
  listSchoolsPage,
  listQuestionsPage,
  listStudentSubjectCardsPage,
  listTeacherSubjectCardsPage,
  searchAccessUsers,
  searchStudentsForGuardian,
  listStudentsPage,
  listTeachersPage,
  listMealManagementSchoolPage,
  login,
  logout as logoutSession,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  processEvaluationOmr,
  processEvaluationOmrBatch,
  removeProfileAvatar,
  removeProfileBanner,
  resolveApiAssetUrl,
  refreshAccessToken,
  searchMealFoods,
  updateMealBudget,
  updateMealFoodRequest,
  updateCalendarEvent,
  updateClassRoom,
  updateGuardian,
  updateLessonRecord,
  updateProfile,
  updateRole,
  updateSchool,
  updateStudent,
  updateTeacher,
  updateUserRole,
  updateUserSchool,
  reviewEvaluationCorrection,
  reviewMealFoodRequest,
  uploadProfileAvatar,
  uploadProfileBanner,
} from './api'
import { appName, navItems } from './data'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import LandingPage from './views/LandingPage'
import LoginView from './views/LoginView'
import { getAnswerCardEvaluationId, getBatchCorrections, getCreatedAnswerCards, getCreatedEvaluation } from './lib/evaluation-omr'
import type {
  AppSection,
  CalendarScreenPayload,
  ClassesPageQuery,
  EvaluationAnswerCard,
  DashboardAlertsPagePayload,
  DashboardFiltersQuery,
  DashboardScreenPayload,
  EvaluationCorrection,
  EvaluationOmrBatchResponse,
  EvaluationsScreenPayload,
  MealManagement,
  MealManagementsPagePayload,
  MePermissionsPayload,
  MealsScreenPayload,
  NotificationsScreenPayload,
  Question,
  QuestionBankPageQuery,
  LessonRecord,
  Role,
  RoleCode,
  RoomReservation,
  School,
  SchoolsPageQuery,
  SchoolsScreenPayload,
  ScreenPayloads,
  SessionPayload,
  Teacher,
  UserAccount,
} from './types'
import { cn } from './lib/cn'

const ACCESS_TOKEN_REFRESH_FALLBACK_MS = 12 * 60 * 1000
const ACCESS_TOKEN_REFRESH_SKEW_MS = 60 * 1000
const ACCESS_TOKEN_REFRESH_MIN_DELAY_MS = 5 * 1000

let refreshAccessTokenRequest: ReturnType<typeof refreshAccessToken> | null = null

function refreshAccessTokenOnce() {
  refreshAccessTokenRequest ??= refreshAccessToken().finally(() => {
    refreshAccessTokenRequest = null
  })
  return refreshAccessTokenRequest
}

const DashboardView = lazy(() => import('./views/DashboardView'))
const SchoolsView = lazy(() => import('./views/SchoolsView'))
const ClassesView = lazy(() => import('./views/ClassesView'))
const TeachersView = lazy(() => import('./views/TeachersView'))
const StudentsView = lazy(() => import('./views/StudentsView'))
const RolePortalView = lazy(() => import('./views/RolePortalView'))
const EvaluationsView = lazy(() => import('./views/EvaluationsView'))
const EvaluationCorrectionsView = lazy(() => import('./views/EvaluationCorrectionsView'))
const CalendarView = lazy(() => import('./views/CalendarView'))
const MealsView = lazy(() => import('./views/MealsView'))
const NutritionRequestsView = lazy(() => import('./views/NutritionRequestsView'))
const AccessView = lazy(() => import('./views/AccessView'))
const NotificationsView = lazy(() => import('./views/NotificationsView'))
const SettingsView = lazy(() => import('./views/SettingsView'))

type ScreenCache = Partial<ScreenPayloads>
type ScreenFlags = Partial<Record<AppSection, boolean>>
type ScreenErrors = Partial<Record<AppSection, string>>
type AppToast = { tone: 'success' | 'error'; message: string }
type RoleProfile = RoleCode
type NavigationItem = (typeof navItems)[number]

const superAdminSections: AppSection[] = ['dashboard', 'schools', 'teachers', 'students', 'evaluations', 'evaluation-corrections', 'meals', 'access', 'notifications', 'settings']
const adminSections: AppSection[] = ['dashboard', 'schools', 'teachers', 'students', 'evaluations', 'evaluation-corrections', 'calendar', 'meals', 'notifications', 'settings']
const schoolAdminSections: AppSection[] = ['dashboard', 'schools', 'teachers', 'students', 'evaluations', 'evaluation-corrections', 'calendar', 'meals', 'notifications', 'settings']
const directorSections: AppSection[] = ['dashboard', 'schools', 'teachers', 'students', 'evaluations', 'evaluation-corrections', 'meals', 'notifications', 'settings']
const coordinatorSections: AppSection[] = ['pedagogy', 'evaluations', 'evaluation-corrections', 'calendar', 'notifications', 'settings']
const teacherSections: AppSection[] = ['teacher-subjects', 'room-reservations', 'evaluations', 'evaluation-corrections', 'calendar', 'notifications', 'settings']
const studentSections: AppSection[] = ['student-performance', 'student-grades', 'calendar', 'notifications', 'settings']
const guardianSections: AppSection[] = ['child-performance', 'child-attendance', 'calendar', 'notifications', 'settings']
const nutritionistSections: AppSection[] = ['food-requests', 'meals', 'notifications', 'settings']
const hiddenSidebarSections: AppSection[] = ['notifications', 'child-attendance']
const lessonRecordsPayloadSections: AppSection[] = [
  'teachers',
  'students',
  'pedagogy',
  'teacher-subjects',
  'lesson-records',
  'attendance-list',
  'student-performance',
  'student-attendance',
  'child-attendance',
  'child-performance',
]

const sectionLabels: Partial<Record<RoleProfile, Partial<Record<AppSection, Pick<NavigationItem, 'label' | 'description'>>>>> = {
  SUPERADMIN: {
    dashboard: { label: 'Dashboard Geral', description: 'Rede, escolas e resultados' },
    meals: { label: 'Gestao Alimentar', description: 'Cardapios, estoque e orcamento da rede' },
    notifications: { label: 'Notificacoes', description: 'Alertas e comunicados' },
    settings: { label: 'Meu Perfil', description: 'Conta do superadmin' },
  },
  ADMIN: {
    dashboard: { label: 'Dashboard Geral', description: 'Rede, escolas e resultados' },
    calendar: { label: 'Calendario Escolar', description: 'Eventos das escolas vinculadas' },
    meals: { label: 'Gestao Alimentar', description: 'Cardapios, estoque e orcamento da rede' },
    notifications: { label: 'Notificações', description: 'Alertas e comunicados' },
    settings: { label: 'Meu Perfil', description: 'Conta do administrador' },
  },
  ADMIN_ESCOLA: {
    dashboard: { label: 'Dashboard da Escola', description: 'Indicadores da unidade' },
    calendar: { label: 'Calendario Escolar', description: 'Eventos da escola' },
    meals: { label: 'Gestao Alimentar', description: 'Cardapios, estoque e orcamento da escola' },
    notifications: { label: 'Notificacoes', description: 'Alertas e comunicados' },
    settings: { label: 'Meu Perfil', description: 'Conta do administrador escolar' },
  },
  DIRETOR: {
    dashboard: { label: 'Dashboard da Escola', description: 'Indicadores da unidade' },
    schools: { label: 'Escolas', description: 'Minha unidade escolar' },
    teachers: { label: 'Professores', description: 'Equipe docente' },
    students: { label: 'Alunos', description: 'Estudantes da escola' },
    evaluations: { label: 'Provas e Simulados', description: 'Acompanhamento pedagogico' },
    'evaluation-corrections': { label: 'Correcao de Provas', description: 'Revisao de cartoes resposta' },
    meals: { label: 'Gestao Alimentar', description: 'Solicitacoes, cardapios e estoque da unidade' },
    notifications: { label: 'Notificações', description: 'Alertas da unidade' },
    settings: { label: 'Meu Perfil', description: 'Dados do diretor' },
  },
  COORDENADOR: {
    pedagogy: { label: 'Dashboard Pedagogico', description: 'Frequencia, aulas e alertas' },
    evaluations: { label: 'Provas e Simulados', description: 'Acompanhamento pedagogico' },
    'evaluation-corrections': { label: 'Correcao de Provas', description: 'Sugestoes OMR e revisao' },
    calendar: { label: 'Calendario Escolar', description: 'Eventos da escola' },
    notifications: { label: 'Notificações', description: 'Alertas pedagogicos' },
    settings: { label: 'Meu Perfil', description: 'Dados do coordenador' },
  },
  PROFESSOR: {
    'teacher-subjects': { label: 'Minhas Materias', description: 'Materias e turmas' },
    'room-reservations': { label: 'Reservar Sala', description: 'Ambientes escolares' },
    evaluations: { label: 'Provas e Simulados', description: 'Criar e aplicar avaliacoes' },
    'evaluation-corrections': { label: 'Correcao de Provas', description: 'Cartoes resposta e notas' },
    calendar: { label: 'Calendario Escolar', description: 'Eventos e avisos' },
    notifications: { label: 'Notificações', description: 'Alertas das suas turmas' },
    settings: { label: 'Meu Perfil', description: 'Dados do professor' },
  },
  ALUNO: {
    'student-performance': { label: 'Frequencia e Desempenho', description: 'Presencas, notas e alertas' },
    'student-grades': { label: 'Minhas Materias', description: 'Materias e notas confirmadas' },
    calendar: { label: 'Calendario e Comunicados', description: 'Eventos e avisos' },
    notifications: { label: 'Notificações', description: 'Alertas academicos' },
    settings: { label: 'Meu Perfil', description: 'Dados do aluno' },
  },
  RESPONSAVEL: {
    'child-attendance': { label: 'Frequencia e Desempenho', description: 'Presencas, notas e alertas' },
    'child-performance': { label: 'Frequencia e Desempenho', description: 'Presencas, notas e alertas' },
    calendar: { label: 'Calendario e Comunicados', description: 'Eventos dos filhos' },
    notifications: { label: 'Notificações', description: 'Alertas dos alunos vinculados' },
    settings: { label: 'Meu Perfil', description: 'Dados do responsavel' },
  },
  NUTRITIONIST: {
    'food-requests': { label: 'Aprovacao de Alimentos', description: 'Solicitacoes das escolas' },
    meals: { label: 'Gestao Alimentar', description: 'Cardapios, alertas e vencimentos' },
    notifications: { label: 'Notificacoes', description: 'Alertas nutricionais' },
    settings: { label: 'Meu Perfil', description: 'Dados do nutricionista' },
  },
}

function normalizeRoleText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

const roleProfileTokens: Record<RoleProfile, string[]> = {
  SUPERADMIN: ['SUPERADMIN', 'SUPER_ADMIN', 'SUPER', 'ROOT'],
  ADMIN: ['ADMIN', 'ADMINISTRADOR', 'ADMINISTRADORA'],
  ADMIN_ESCOLA: ['ADMINESCOLA', 'ADMINISTRADORESCOLAR', 'ADMINISTRADORAESCOLAR'],
  DIRETOR: ['DIRETOR', 'DIRETORA', 'DIRECAO', 'DIRETORIA'],
  COORDENADOR: ['COORDENADOR', 'COORDENADORA', 'COORDENACAO', 'PEDAGOGO', 'PEDAGOGA', 'PEDAGOGICO', 'PEDAGOGICA'],
  PROFESSOR: ['PROFESSOR', 'PROFESSORA', 'DOCENTE', 'TEACHER'],
  ALUNO: ['ALUNO', 'ALUNA', 'ESTUDANTE', 'STUDENT'],
  RESPONSAVEL: ['RESPONSAVEL', 'RESPONSAVEIS', 'PAI', 'MAE', 'PAIS', 'GUARDIAN'],
  NUTRITIONIST: ['NUTRITIONIST', 'NUTRICIONISTA', 'NUTRICAO', 'NUTRICAOESCOLAR'],
}

function normalizeRoleTokens(value?: string | null) {
  return normalizeRoleText(value)
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function matchRoleProfileFromText(value?: string | null): RoleProfile | null {
  const normalizedText = normalizeRoleText(value).replace(/[^A-Z0-9]+/g, ' ').trim()
  if (/\b(SUPERADMIN|SUPER ADMIN|ROOT)\b/.test(normalizedText)) return 'SUPERADMIN'
  if (/\bADMIN ESCOLA\b|\bADMINISTRADOR ESCOLAR\b|\bADMINISTRADORA ESCOLAR\b/.test(normalizedText)) return 'ADMIN_ESCOLA'

  const tokens = normalizeRoleTokens(value)
  if (!tokens.length) return null

  for (const profile of ['SUPERADMIN', 'ADMIN_ESCOLA', 'ADMIN', 'DIRETOR', 'COORDENADOR', 'PROFESSOR', 'ALUNO', 'RESPONSAVEL', 'NUTRITIONIST'] as RoleProfile[]) {
    if (tokens.some((token) => roleProfileTokens[profile].includes(token))) return profile
  }

  return null
}

function getRoleProfileOrNull(role: Role | null): RoleProfile | null {
  if (!role) return null

  return matchRoleProfileFromText(`${role.code ?? ''} ${role.name ?? ''}`)
    ?? matchRoleProfileFromText(role.description)
}

function getLinkedUserProfile(user?: UserAccount | null): RoleProfile | null {
  if (!user) return null
  if (user.linkedStudentId) return 'ALUNO'
  if (user.linkedGuardianId) return 'RESPONSAVEL'
  if (user.linkedTeacherId) return 'PROFESSOR'

  return matchRoleProfileFromText(user.roleId)
}

export function getRoleProfile(role: Role | null): RoleProfile | null {
  return getRoleProfileOrNull(role)
}

export function getSessionRoleProfile(session: SessionPayload | null): RoleProfile | null {
  if (!session) return null
  const currentRoleMatchesUser = !session.currentRole?.id || !session.currentUser.roleId || session.currentRole.id === session.currentUser.roleId
  const currentRoleProfile = currentRoleMatchesUser ? getRoleProfileOrNull(session.currentRole) : null

  return matchRoleProfileFromText(session.currentUser.roleId)
    ?? currentRoleProfile
    ?? getLinkedUserProfile(session.currentUser)
    ?? getRoleProfileOrNull(session.currentRole)
}

function getFallbackRole(profile: RoleProfile, role: Role | null): Role {
  return {
    id: role?.id ?? profile,
    code: profile,
    name: {
      SUPERADMIN: 'Superadmin',
      ADMIN: 'Admin',
      ADMIN_ESCOLA: 'Admin Escolar',
      DIRETOR: 'Diretor',
      COORDENADOR: 'Coordenador',
      PROFESSOR: 'Professor',
      ALUNO: 'Aluno',
      RESPONSAVEL: 'Responsavel',
      NUTRITIONIST: 'Nutricionista',
    }[profile],
    description: role?.description ?? '',
    permissions: role?.permissions ?? [],
  }
}

function resolveSessionRole(session: SessionPayload | null, profile: RoleProfile | null): Role | null {
  if (!session) return null
  if (!profile) return session.currentRole
  const currentRoleMatchesUser = !session.currentRole?.id || !session.currentUser.roleId || session.currentRole.id === session.currentUser.roleId
  const currentProfile = getRoleProfileOrNull(session.currentRole)
  if (session.currentRole && currentRoleMatchesUser && currentProfile === profile) return session.currentRole

  return getFallbackRole(profile, session.currentRole)
}

function getSectionsForProfile(profile: RoleProfile | null) {
  if (!profile) return []
  if (profile === 'SUPERADMIN') return superAdminSections
  if (profile === 'ADMIN_ESCOLA') return schoolAdminSections
  if (profile === 'DIRETOR') return directorSections
  if (profile === 'COORDENADOR') return coordinatorSections
  if (profile === 'PROFESSOR') return teacherSections
  if (profile === 'ALUNO') return studentSections
  if (profile === 'RESPONSAVEL') return guardianSections
  if (profile === 'NUTRITIONIST') return nutritionistSections
  return adminSections
}

export function getExplicitAllowedSections(profile: RoleProfile | null, permissions: MePermissionsPayload | null) {
  if (!profile || !permissions || permissions.roleCode !== profile) return []
  const backendSections = new Set<string>(permissions.allowedSections)
  if (backendSections.has('people')) {
    backendSections.add('teachers')
    backendSections.add('students')
  }
  if ((profile === 'ADMIN' || profile === 'ADMIN_ESCOLA') && backendSections.has('dashboard')) {
    backendSections.add('calendar')
  }
  return getSectionsForProfile(profile).filter((section) => backendSections.has(section))
}

function getDefaultSectionForSession(session: SessionPayload | null, permissions: MePermissionsPayload | null = null) {
  const profile = getSessionRoleProfile(session)
  return getExplicitAllowedSections(profile, permissions)[0] ?? null
}

function getSectionAliasForProfile(section: AppSection, profile: RoleProfile | null): AppSection {
  if (profile === 'COORDENADOR' && section === 'dashboard') return 'pedagogy'
  return section
}

export function getNavItemsForProfile(profile: RoleProfile | null) {
  if (!profile) return []
  const labels = sectionLabels[profile] ?? {}
  return getSectionsForProfile(profile)
    .filter((section) => !hiddenSidebarSections.includes(section))
    .map((section) => {
      const item = navItems.find((navItem) => navItem.id === section)
      if (!item) return null
      return { ...item, ...(labels[section] ?? {}) }
    })
    .filter((item): item is NavigationItem => Boolean(item))
}

function isAdminProfile(profile: RoleProfile | null) {
  return profile === 'SUPERADMIN' || profile === 'ADMIN' || profile === 'ADMIN_ESCOLA'
}

function isSuperAdminProfile(profile: RoleProfile | null) {
  return profile === 'SUPERADMIN'
}

function isNetworkAdminProfile(profile: RoleProfile | null) {
  return profile === 'SUPERADMIN' || profile === 'ADMIN'
}

function isSchoolLeadership(profile: RoleProfile | null) {
  return profile === 'ADMIN_ESCOLA' || profile === 'DIRETOR' || profile === 'COORDENADOR'
}

function userMatchesSchool(user: UserAccount, schoolId: string) {
  return Boolean(user.schoolId && user.schoolId === schoolId)
}

function userRelatedSchoolIds(
  user: UserAccount,
  schools: School[],
  mealManagements: MealManagement[] = [],
) {
  const schoolIds = new Set<string>()
  if (user.schoolId) schoolIds.add(user.schoolId)

  const userName = normalizeRoleText(user.name)
  for (const school of schools) {
    const directorName = normalizeRoleText(school.director)
    if (directorName && userName && (directorName === userName || directorName.includes(userName) || userName.includes(directorName))) {
      schoolIds.add(school.id)
    }
  }

  const userIds = new Set([user.id, user.linkedTeacherId].filter((id): id is string => Boolean(id)))
  for (const management of mealManagements) {
    if (userIds.has(management.responsaveisGestao.diretorId)) {
      schoolIds.add(management.escolaId)
    }
  }

  return schoolIds
}

function buildMealManagementsPagePayload(data: MealsScreenPayload, page: number, limit: number, search = ''): MealManagementsPagePayload {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25))
  const normalizedSearch = normalizeRoleText(search)
  const managementBySchoolId = new Map(data.mealManagements.map((management) => [management.escolaId, management]))
  const schools = data.schools.filter((school) => {
    if (!normalizedSearch) return true
    return normalizeRoleText([school.name, school.director, school.address].filter(Boolean).join(' ')).includes(normalizedSearch)
  })
  const total = schools.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * safeLimit
  const pageSchools = schools.slice(start, start + safeLimit)

  return {
    schools: pageSchools,
    mealManagements: pageSchools
      .map((school) => managementBySchoolId.get(school.id))
      .filter((management): management is MealManagement => Boolean(management)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  }
}

function buildDashboardAlertsPagePayload(alerts: DashboardAlertsPagePayload['alerts'], page: number, limit: number): DashboardAlertsPagePayload {
  const safeLimit = [25, 50, 100].includes(limit) ? limit : 25
  const total = alerts.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * safeLimit

  return {
    alerts: alerts.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  }
}

function splitAcademicTokens(value?: string | null) {
  return normalizeRoleText(value)
    .split(/[,;|/]+|\s+-\s+|\s+(?:E|OU)\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function academicSubjectCodes(value?: string | null): string[] {
  const text = normalizeRoleText(value).replace(/[^A-Z0-9]+/g, ' ').trim()
  if (!text) return []

  const codes: string[] = []
  const withoutPhysicalEducation = text.replace(/EDUCACAO FISICA|ED FISICA/g, ' ')
  if (/(EDUCACAO FISICA|ED FISICA)/.test(text)) codes.push('EDUCACAO_FISICA')
  if (/(LINGUA PORTUGUESA|PORTUGUES|PORTUGUESA|PORTUGUES BRASIL)/.test(text)) codes.push('LINGUA_PORTUGUESA')
  if (/(LINGUA INGLESA|INGLES|INGLESA|ENGLISH)/.test(text)) codes.push('LINGUA_INGLESA')
  if (/(LINGUA ESPANHOLA|ESPANHOL|ESPANHOLA|ESPANOL|SPANISH)/.test(text)) codes.push('LINGUA_ESPANHOLA')
  if (/(ENSINO RELIGIOSO|RELIGIAO|RELIGIOSO)/.test(text)) codes.push('ENSINO_RELIGIOSO')
  if (/(PROJETO DE VIDA|PROJETO VIDA)/.test(text)) codes.push('PROJETO_DE_VIDA')
  if (/LITERATURA/.test(text)) codes.push('LITERATURA')
  if (/REDACAO/.test(text)) codes.push('REDACAO')
  if (/MATEMATICA/.test(text)) codes.push('MATEMATICA')
  if (/BIOLOGIA/.test(text)) codes.push('BIOLOGIA')
  if (/(^|\s)FISICA(\s|$)/.test(withoutPhysicalEducation)) codes.push('FISICA')
  if (/QUIMICA/.test(text)) codes.push('QUIMICA')
  if (/HISTORIA/.test(text)) codes.push('HISTORIA')
  if (/GEOGRAFIA/.test(text)) codes.push('GEOGRAFIA')
  if (/FILOSOFIA/.test(text)) codes.push('FILOSOFIA')
  if (/SOCIOLOGIA/.test(text)) codes.push('SOCIOLOGIA')
  if (/CIENCIAS/.test(text) && !/(CIENCIAS DA NATUREZA|NATUREZA)/.test(text)) codes.push('CIENCIAS')
  if (/(^|\s)ARTES?(\s|$)/.test(text)) codes.push('ARTE')
  return Array.from(new Set(codes))
}

function academicSubjectCode(value?: string | null): string | null {
  return academicSubjectCodes(value)[0] ?? null
}

function teacherSubjectCodes(teacher: Teacher) {
  return new Set([
    ...academicSubjectCodes(teacher.specialty),
    ...splitAcademicTokens(teacher.specialty).flatMap(academicSubjectCodes),
  ].filter((code): code is string => Boolean(code)))
}

function academicSubjectMatches(first?: string | null, second?: string | null) {
  const firstSubjectCodes = academicSubjectCodes(first)
  const secondSubjectCodes = academicSubjectCodes(second)
  if (firstSubjectCodes.length || secondSubjectCodes.length) {
    return firstSubjectCodes.some((code) => secondSubjectCodes.includes(code))
  }

  const normalize = (value?: string | null) => normalizeRoleText(value).replace(/[^A-Z0-9]+/g, ' ').trim()
  const firstKey = normalize(first)
  const secondKey = normalize(second)
  if (!firstKey || !secondKey) return false
  if (firstKey === secondKey || firstKey.includes(secondKey) || secondKey.includes(firstKey)) return true

  const stopWords = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'EM', 'ENSINO', 'ANOS', 'AREA', 'LINGUA'])
  const firstWords = firstKey.split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word))
  const secondWords = secondKey.split(/\s+/).filter((word) => word.length > 3 && !stopWords.has(word))
  return firstWords.some((firstWord) => secondWords.some((secondWord) => (
    firstWord === secondWord
    || firstWord.includes(secondWord)
    || secondWord.includes(firstWord)
  )))
}

function teacherCanTeachSubject(teacher: Teacher, subject?: string | null) {
  const subjectCode = academicSubjectCode(subject)
  if (subjectCode) return teacherSubjectCodes(teacher).has(subjectCode)
  return splitAcademicTokens(teacher.specialty).some((token) => academicSubjectMatches(token, subject))
}

function getSectionFromPath(pathname: string): AppSection | null {
  const route = pathname.replace(/^\/+/, '').replace(/\/+$/, '')
  const match = navItems.find((item) => item.id === route)
  return match?.id ?? null
}

function isLoginPath(pathname: string) {
  return pathname.replace(/\/+$/, '') === '/login'
}

function isLandingPath(pathname: string) {
  return pathname.replace(/\/+$/, '') === '/landing'
}

function getCurrentPath() {
  return window.location.pathname || '/'
}

function replaceById<T extends { id: string }>(items: T[], updated: T) {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

function upsertById<T extends { id: string }>(items: T[], updated: T) {
  return items.some((item) => item.id === updated.id) ? replaceById(items, updated) : [...items, updated]
}

function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id)
}

function mergeById<T extends { id: string }>(...groups: T[][]) {
  const byId = new Map<string, T>()
  for (const group of groups) {
    for (const item of group) byId.set(item.id, item)
  }
  return Array.from(byId.values())
}

function mergeDashboardScope(payload: DashboardScreenPayload, previous?: DashboardScreenPayload): DashboardScreenPayload {
  return {
    ...payload,
    schools: mergeById(previous?.schools ?? [], payload.schools ?? []),
    classes: mergeById(previous?.classes ?? [], payload.classes ?? []),
  }
}

function normalizeMealsPayload(payload: MealsScreenPayload | MealManagement[] | null | undefined): MealsScreenPayload {
  if (!payload) {
    return { schools: [], mealManagements: [], foodRequests: [], mealRequestHistory: [] }
  }

  if (Array.isArray(payload)) {
    return { schools: [], mealManagements: payload, foodRequests: [], mealRequestHistory: [] }
  }

  const rawPayload = payload as MealsScreenPayload & {
    data?: MealsScreenPayload | MealManagement[]
    items?: MealManagement[]
    results?: MealManagement[]
    mealFoodRequests?: MealsScreenPayload['foodRequests']
  }

  if (Array.isArray(rawPayload.data)) {
    return { schools: rawPayload.schools ?? [], mealManagements: rawPayload.data, foodRequests: rawPayload.foodRequests ?? rawPayload.mealFoodRequests ?? [], mealRequestHistory: rawPayload.mealRequestHistory ?? [] }
  }

  if (rawPayload.data && typeof rawPayload.data === 'object') {
    const dataPayload = normalizeMealsPayload(rawPayload.data)
    return {
      schools: mergeById(rawPayload.schools ?? [], dataPayload.schools),
      mealManagements: mergeById(rawPayload.mealManagements ?? rawPayload.items ?? rawPayload.results ?? [], dataPayload.mealManagements),
      foodRequests: mergeById(rawPayload.foodRequests ?? rawPayload.mealFoodRequests ?? [], dataPayload.foodRequests),
      mealRequestHistory: mergeById(rawPayload.mealRequestHistory ?? [], dataPayload.mealRequestHistory),
    }
  }

  return {
    schools: rawPayload.schools ?? [],
    mealManagements: rawPayload.mealManagements ?? rawPayload.items ?? rawPayload.results ?? [],
    foodRequests: rawPayload.foodRequests ?? rawPayload.mealFoodRequests ?? [],
    mealRequestHistory: rawPayload.mealRequestHistory ?? [],
  }
}

function mergeMealsPayloads(...payloads: Array<MealsScreenPayload | MealManagement[] | null | undefined>): MealsScreenPayload {
  const normalizedPayloads = payloads.map(normalizeMealsPayload)
  return {
    schools: mergeById(...normalizedPayloads.map((payload) => payload.schools)),
    mealManagements: mergeById(...normalizedPayloads.map((payload) => payload.mealManagements)),
    foodRequests: mergeById(...normalizedPayloads.map((payload) => payload.foodRequests)),
    mealRequestHistory: mergeById(...normalizedPayloads.map((payload) => payload.mealRequestHistory)),
  }
}

function getStrictSchoolScopeIds(
  user: UserAccount,
  schools: School[],
  mealManagements: MealManagement[] = [],
) {
  if (user.schoolId) return new Set([user.schoolId])

  const schoolIds = new Set<string>()
  const userName = normalizeRoleText(user.name)
  if (userName) {
    for (const school of schools) {
      if (normalizeRoleText(school.director) === userName) schoolIds.add(school.id)
    }
  }

  const userIds = new Set([user.id, user.linkedTeacherId].filter((id): id is string => Boolean(id)))
  for (const management of mealManagements) {
    if (userIds.has(management.responsaveisGestao.diretorId)) {
      schoolIds.add(management.escolaId)
    }
  }

  return schoolIds
}

async function loadSectionPayload(section: AppSection, token: string, profile: RoleProfile | null) {
  const networkScope = isNetworkAdminProfile(profile)
  const scopedOptions = { networkScope }
  const loadAcademicScopeWithLessonRecords = async (options: { includeTeachers?: boolean } = {}) => {
    const [scopePayload, lessonRecords] = await Promise.all([
      loadAcademicScopeScreen(token, { ...options, ...scopedOptions }),
      listLessonRecords(token, scopedOptions),
    ])
    return { ...scopePayload, lessonRecords }
  }

  switch (section) {
    case 'dashboard':
      return Promise.all([
        loadDashboardScreen(token, { period: 'month' }),
        loadAcademicScopeScreen(token, {
          ...scopedOptions,
          includeTeachers: false,
          includeStudents: false,
          classesView: 'summary',
        }),
      ]).then(([dashboardPayload, scopePayload]) => ({
        ...dashboardPayload,
        schools: mergeById(scopePayload.schools, dashboardPayload.schools ?? []),
        classes: mergeById(scopePayload.classes, dashboardPayload.classes ?? []),
      }))
    case 'notifications':
      return loadNotificationsScreen(token)
    case 'pedagogy':
      return Promise.all([
        loadAcademicScopeWithLessonRecords(),
        loadTeacherSubjectEvaluationsScreen(token, scopedOptions),
      ]).then(([scopePayload, evaluationsPayload]) => ({
        ...scopePayload,
        evaluations: evaluationsPayload.evaluations,
        evaluationCorrections: evaluationsPayload.evaluationCorrections,
        curriculumSkills: evaluationsPayload.curriculumSkills,
        assessmentDescriptors: evaluationsPayload.assessmentDescriptors,
        questionBank: evaluationsPayload.questionBank,
      }))
    case 'schools':
      return loadSchoolsScreen(token, scopedOptions)
    case 'teachers':
      return loadTeachersScreen(token, scopedOptions)
    case 'students':
      return loadStudentsScreen(token, scopedOptions)
    case 'classes':
      return loadClassesScreen(token, scopedOptions)
    case 'lesson-records':
    case 'attendance-list':
      return loadAcademicScopeWithLessonRecords()
    case 'student-performance':
    case 'student-attendance':
    case 'child-attendance':
    case 'child-performance':
      return loadAcademicScopeWithLessonRecords({ includeTeachers: false })
    case 'student-grades':
      return Promise.all([
        loadAcademicScopeScreen(token, {
          ...scopedOptions,
          includeTeachers: false,
          schoolsView: 'identity',
          studentsView: 'identity',
          classesView: 'summary',
        }),
        loadStudentGradesEvaluationsScreen(token),
      ]).then(([scopePayload, evaluationsPayload]) => ({
        ...scopePayload,
        evaluations: evaluationsPayload.evaluations,
        evaluationCorrections: evaluationsPayload.evaluationCorrections,
        curriculumSkills: evaluationsPayload.curriculumSkills,
        questionBank: evaluationsPayload.questionBank,
      }))
    case 'teacher-subjects':
      return loadAcademicScopeWithLessonRecords()
    case 'room-reservations':
      return loadRoomReservationsScreen(token, scopedOptions)
    case 'evaluations':
      return Promise.all([loadEvaluationsScreen(token, { ...scopedOptions, includeClasses: false }), loadAcademicScopeScreen(token, scopedOptions)]).then(([evaluationsPayload, scopePayload]) => ({
        ...evaluationsPayload,
        classes: scopePayload.classes,
        schools: scopePayload.schools,
        teachers: scopePayload.teachers,
        students: scopePayload.students,
      }))
    case 'evaluation-corrections':
      return Promise.all([loadEvaluationCorrectionsScreen(token, scopedOptions), loadAcademicScopeScreen(token, scopedOptions)]).then(([evaluationsPayload, scopePayload]) => ({
        ...evaluationsPayload,
        classes: scopePayload.classes,
        schools: scopePayload.schools,
        teachers: scopePayload.teachers,
        students: scopePayload.students,
      }))
    case 'calendar':
      return loadCalendarScreen(token, { networkScope: isSuperAdminProfile(profile) }).then((calendarPayload) => ({
        ...calendarPayload,
        scope: {
          schools: calendarPayload.schools,
          classes: calendarPayload.classes,
          teachers: [],
          guardians: [],
          students: [],
        },
      }))
    case 'meals':
    case 'food-requests': {
      const mealOptions = { networkScope: networkScope || profile === 'NUTRITIONIST' }
      const [mealsPayload, schoolsPayload] = await Promise.all([
        loadMealsScreen(token, mealOptions),
        loadAcademicScopeScreen(token, scopedOptions),
      ])
      const mergedMeals = normalizeMealsPayload(mealsPayload)

      return {
        ...mergedMeals,
        schools: mergedMeals.schools.length ? mergedMeals.schools : schoolsPayload.schools,
      }
    }
    case 'access':
      return loadAccessScreen(token)
    case 'settings':
      return loadSettingsScreen(token)
  }
}

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null)
  const [route, setRoute] = useState(getCurrentPath)
  const [session, setSession] = useState<SessionPayload | null>(null)
  const [mePermissions, setMePermissions] = useState<MePermissionsPayload | null>(null)
  const [screenData, setScreenData] = useState<ScreenCache>({})
  const [screenLoading, setScreenLoading] = useState<ScreenFlags>({})
  const [screenErrors, setScreenErrors] = useState<ScreenErrors>({})
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [appError, setAppError] = useState<string | null>(null)
  const [toast, setToast] = useState<AppToast | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isAuthRestoring, setIsAuthRestoring] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profileAssetVersion, setProfileAssetVersion] = useState({ avatar: 0, banner: 0 })

  const roleProfile = getSessionRoleProfile(session)
  const userRole = useMemo(() => resolveSessionRole(session, roleProfile), [roleProfile, session])
  const allowedSections = useMemo(() => getExplicitAllowedSections(roleProfile, mePermissions), [mePermissions, roleProfile])
  const visibleNavItems = useMemo(() => (
    getNavItemsForProfile(roleProfile).filter((item) => allowedSections.includes(item.id))
  ), [allowedSections, roleProfile])
  const fallbackSection = visibleNavItems[0]?.id ?? allowedSections[0] ?? 'dashboard'
  const routeSection = getSectionFromPath(route)
  const requestedSection = routeSection ?? fallbackSection
  const requestedSectionAlias = getSectionAliasForProfile(requestedSection, roleProfile)
  const activeSection = allowedSections.includes(requestedSectionAlias) ? requestedSectionAlias : fallbackSection
  const activeLabel = visibleNavItems.find((item) => item.id === activeSection)?.label
    ?? navItems.find((item) => item.id === activeSection)?.label
    ?? appName
  const loadQuestionsPageForEvaluations = useCallback((params: QuestionBankPageQuery) => {
    if (!token) return Promise.reject(new Error('Sessao expirada.'))
    return listQuestionsPage(token, params)
  }, [token])
  const loadDashboardWithFilters = useCallback(async (filters: Partial<DashboardFiltersQuery>) => {
    if (!token) throw new Error('Sessao expirada.')

    setScreenLoading((current) => ({ ...current, dashboard: true }))
    setScreenErrors((current) => ({ ...current, dashboard: undefined }))

    try {
      const payload = await loadDashboardScreen(token, filters)
      setScreenData((current) => ({ ...current, dashboard: mergeDashboardScope(payload, current.dashboard) }))
      return payload
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        const refreshedToken = await renewAccessToken()
        if (refreshedToken) {
          const payload = await loadDashboardScreen(refreshedToken, filters)
          setScreenData((current) => ({ ...current, dashboard: mergeDashboardScope(payload, current.dashboard) }))
          return payload
        }
      }

      const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar o dashboard.'
      setScreenErrors((current) => ({ ...current, dashboard: message }))
      throw error
    } finally {
      setScreenLoading((current) => ({ ...current, dashboard: false }))
    }
  }, [token])
  const applyDashboardFilters = useCallback(async (filters: Partial<DashboardFiltersQuery>) => {
    await loadDashboardWithFilters(filters)
  }, [loadDashboardWithFilters])
  const loadDashboardAlertsPage = useCallback(async ({ page, limit, filters }: {
    page: number
    limit: number
    filters: Partial<DashboardFiltersQuery>
  }) => {
    if (!token) throw new Error('Sessao expirada.')
    const payload = await loadDashboardScreen(token, { ...filters, alertPage: page, alertLimit: limit })
    return payload.dashboard.alertsPagination
      ? { alerts: payload.dashboard.alerts, pagination: payload.dashboard.alertsPagination }
      : buildDashboardAlertsPagePayload(payload.dashboard.alerts, page, limit)
  }, [token])

  useEffect(() => {
    if (window.location.hash.startsWith('#/')) {
      const legacyRoute = window.location.hash.replace(/^#\/?/, '')
      window.history.replaceState(null, '', legacyRoute ? `/${legacyRoute}` : '/')
      setRoute(getCurrentPath())
    }

    const handlePopState = () => setRoute(getCurrentPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function restoreSessionFromRefreshCookie() {
      setIsAuthRestoring(true)

      try {
        const result = await refreshAccessTokenOnce()
        if (cancelled) return
        setToken(result.token)
        setTokenExpiresAt(result.expiresAt)
      } catch {
        if (cancelled) return
        setToken(null)
        setTokenExpiresAt(null)
        setSession(null)
        setMePermissions(null)
        setScreenData({})
        setScreenErrors({})
        setIsSessionLoading(false)
      } finally {
        if (!cancelled) setIsAuthRestoring(false)
      }
    }

    void restoreSessionFromRefreshCookie()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setSession(null)
      setMePermissions(null)
      setScreenData({})
      setScreenLoading({})
      setScreenErrors({})
      setIsSessionLoading(false)
      return
    }

    void refreshSession(token)
  }, [token])

  useEffect(() => {
    if (!token) return

    const expiresAtMs = tokenExpiresAt ? new Date(tokenExpiresAt).getTime() : Number.NaN
    const targetDelay = Number.isFinite(expiresAtMs)
      ? expiresAtMs - Date.now() - ACCESS_TOKEN_REFRESH_SKEW_MS
      : ACCESS_TOKEN_REFRESH_FALLBACK_MS
    const refreshDelay = Math.max(
      ACCESS_TOKEN_REFRESH_MIN_DELAY_MS,
      Math.min(ACCESS_TOKEN_REFRESH_FALLBACK_MS, targetDelay),
    )

    const refreshTimer = window.setTimeout(() => {
      void renewAccessToken()
    }, refreshDelay)

    return () => window.clearTimeout(refreshTimer)
  }, [token, tokenExpiresAt])

  useEffect(() => {
    if (!token || !session) return
    if (!allowedSections.includes(activeSection)) return
    if (!getSectionFromPath(route) || isLoginPath(route)) return
    if (routeSection && requestedSectionAlias !== activeSection) {
      navigateToSection(fallbackSection, 'replace')
      return
    }
    if (routeSection && requestedSection !== activeSection) {
      navigateToSection(activeSection, 'replace')
      return
    }
    if (screenData[activeSection] || screenLoading[activeSection] || screenErrors[activeSection]) return

    void loadScreen(activeSection, token)
  }, [activeSection, allowedSections, fallbackSection, requestedSection, requestedSectionAlias, route, routeSection, screenData, screenErrors, screenLoading, session, token])

  function navigateToPath(path: string, mode: 'push' | 'replace' = 'push') {
    if (mode === 'replace') {
      window.history.replaceState(null, '', path)
    } else {
      window.history.pushState(null, '', path)
    }
    setRoute(getCurrentPath())
  }

  function navigateToSection(section: AppSection, mode: 'push' | 'replace' = 'push') {
    navigateToPath(`/${section}`, mode)
  }

  function clearAuthState() {
    setToken(null)
    setTokenExpiresAt(null)
    setSession(null)
    setMePermissions(null)
    setScreenData({})
    setScreenErrors({})
    setScreenLoading({})
  }

  async function renewAccessToken() {
    try {
      const result = await refreshAccessTokenOnce()
      setToken(result.token)
      setTokenExpiresAt(result.expiresAt)
      return result.token
    } catch {
      clearAuthState()
      navigateToPath('/login', 'replace')
      return null
    }
  }

  async function refreshSession(currentToken = token) {
    if (!currentToken) return
    setIsSessionLoading(true)
    setAppError(null)

    try {
      const [nextSession, nextPermissions] = await Promise.all([
        loadSession(currentToken),
        loadMePermissions(currentToken),
      ])
      setSession(nextSession)
      setMePermissions(nextPermissions)
      if ((!getSectionFromPath(window.location.pathname) || isLoginPath(window.location.pathname)) && !isLandingPath(window.location.pathname)) {
        const defaultSection = getDefaultSectionForSession(nextSession, nextPermissions)
        if (defaultSection) navigateToSection(defaultSection, 'replace')
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        const refreshedToken = await renewAccessToken()
        if (refreshedToken) return
      }

      setAppError(error instanceof Error ? error.message : 'Falha ao carregar sessao do MeuEnsino.')
      clearAuthState()
    } finally {
      setIsSessionLoading(false)
    }
  }

  async function loadScreen(section: AppSection, currentToken = token) {
    if (!currentToken) return
    if (!allowedSections.includes(section)) {
      setScreenErrors((current) => ({ ...current, [section]: 'Acesso nao permitido para esta area.' }))
      return
    }
    setScreenLoading((current) => ({ ...current, [section]: true }))
    setScreenErrors((current) => ({ ...current, [section]: undefined }))
    setAppError(null)

    try {
      const nextData = await loadSectionPayload(section, currentToken, roleProfile)
      setScreenData((current) => {
        if (section === 'calendar') {
          const calendarData = nextData as CalendarScreenPayload
          return { ...current, calendar: calendarData }
        }

        const next: ScreenCache = { ...current }
        ;(next as Partial<Record<AppSection, unknown>>)[section] = nextData
        return next
      })

      if (section === 'notifications') {
        const notificationsData = nextData as ScreenPayloads['notifications']
        const scopedNotificationsData = getScopedNotificationsData(notificationsData)
        setSession((current) => current ? { ...current, alertCount: scopedNotificationsData.unreadCount } : current)
      }

      if (section === 'settings') {
        const settingsData = nextData as ScreenPayloads['settings']
        setSession((current) => current ? { ...current, currentUser: settingsData.currentUser } : current)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel carregar esta tela.'
      if (error instanceof ApiError && error.statusCode === 401) {
        const refreshedToken = await renewAccessToken()
        if (refreshedToken) {
          window.setTimeout(() => {
            void loadScreen(section, refreshedToken)
          }, 0)
        }
      } else {
        setScreenErrors((current) => ({ ...current, [section]: message }))
        setAppError(message)
      }
    } finally {
      setScreenLoading((current) => ({ ...current, [section]: false }))
    }
  }

  function updateScreenData<K extends AppSection>(section: K, updater: (current: ScreenPayloads[K]) => ScreenPayloads[K]) {
    setScreenData((current) => {
      const sectionData = current[section] as ScreenPayloads[K] | undefined
      if (!sectionData) return current
      return { ...current, [section]: updater(sectionData) }
    })
  }

  function upsertLessonRecordInCachedScreens(record: LessonRecord) {
    setScreenData((current) => {
      const next: ScreenCache = { ...current }
      const nextSchoolsPayloads = next as Partial<Record<AppSection, SchoolsScreenPayload>>
      let changed = false

      for (const section of lessonRecordsPayloadSections) {
        const payload = current[section] as SchoolsScreenPayload | undefined
        if (!payload) continue

        nextSchoolsPayloads[section] = {
          ...payload,
          lessonRecords: [
            record,
            ...(payload.lessonRecords ?? []).filter((item) => item.id !== record.id),
          ],
        }
        changed = true
      }

      return changed ? next : current
    })
  }

  function syncNotificationsPayload(payload: NotificationsScreenPayload) {
    setScreenData((current) => ({ ...current, notifications: payload }))
    const scopedPayload = getScopedNotificationsData(payload)
    setSession((current) => current ? { ...current, alertCount: scopedPayload.unreadCount } : current)
  }

  async function runNotificationUpdate(action: (currentToken: string) => Promise<NotificationsScreenPayload>) {
    if (!token) {
      showToast({ tone: 'error', message: 'Sessao expirada. Entre novamente para continuar.' })
      return
    }

    try {
      const payload = await action(token)
      syncNotificationsPayload(payload)
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error ? error.message : 'Nao foi possivel atualizar a notificacao.' })
      throw error
    }
  }

  function handleMarkNotificationRead(id: string) {
    return runNotificationUpdate((currentToken) => markNotificationRead(currentToken, id))
  }

  function handleMarkNotificationUnread(id: string) {
    return runNotificationUpdate((currentToken) => markNotificationUnread(currentToken, id))
  }

  function handleMarkAllNotificationsRead() {
    return runNotificationUpdate((currentToken) => markAllNotificationsRead(currentToken))
  }

  function invalidateScreens(sections: AppSection[]) {
    setScreenData((current) => {
      const next = { ...current }
      for (const section of sections) delete next[section]
      return next
    })
    setScreenErrors((current) => {
      const next = { ...current }
      for (const section of sections) delete next[section]
      return next
    })
  }

  function getScopedSchoolsData(data: SchoolsScreenPayload): SchoolsScreenPayload {
    if (!session || isNetworkAdminProfile(roleProfile)) return data

    const user = session.currentUser
    const withScopedAcademicExtras = (
      base: Omit<SchoolsScreenPayload, 'lessonRecords' | 'roomReservations'>,
    ): SchoolsScreenPayload => {
      const classIds = new Set(base.classes.map((classRoom) => classRoom.id))
      const schoolIds = new Set(base.schools.map((school) => school.id))
      const reservationSchoolByClassId = new Map(data.classes.map((classRoom) => [classRoom.id, classRoom.schoolId]))

      return {
        ...base,
        lessonRecords: (data.lessonRecords ?? []).filter((record) => classIds.has(record.classId)),
        roomReservations: (data.roomReservations ?? []).filter((reservation) => {
          const reservationSchoolId = reservationSchoolByClassId.get(reservation.classId)
          return reservationSchoolId ? schoolIds.has(reservationSchoolId) : classIds.has(reservation.classId)
        }),
      }
    }
    const linkedTeachers = data.teachers.filter((teacher) => teacher.id === user.linkedTeacherId || teacher.userId === user.id)
    const teacherIds = new Set(linkedTeachers.map((teacher) => teacher.id))
    const studentIds = new Set(data.students
      .filter((student) => student.id === user.linkedStudentId || student.userId === user.id)
      .map((student) => student.id))
    const guardianIds = new Set([
      user.linkedGuardianId,
      ...data.guardians
        .filter((guardian) => guardian.id === user.linkedGuardianId || guardian.userId === user.id)
        .map((guardian) => guardian.id),
    ].filter((id): id is string => Boolean(id)))

    if (isSchoolLeadership(roleProfile)) {
      const relatedSchoolIds = userRelatedSchoolIds(user, data.schools)
      const schoolIds = new Set(data.schools.filter((school) => relatedSchoolIds.has(school.id) || userMatchesSchool(user, school.id)).map((school) => school.id))
      const classes = data.classes.filter((classRoom) => schoolIds.has(classRoom.schoolId))
      const classIds = new Set(classes.map((classRoom) => classRoom.id))
      return withScopedAcademicExtras({
        schools: data.schools.filter((school) => schoolIds.has(school.id)),
        classes,
        teachers: data.teachers.filter((teacher) => schoolIds.has(teacher.schoolId)),
        students: data.students.filter((student) => schoolIds.has(student.schoolId) || classIds.has(student.classId)),
        guardians: data.guardians.filter((guardian) => schoolIds.has(guardian.schoolId)),
      })
    }

    if (roleProfile === 'PROFESSOR') {
      const classes = data.classes.filter((classRoom) => (
        teacherIds.has(classRoom.teacherId)
        || (classRoom.teacherIds ?? []).some((teacherId) => teacherIds.has(teacherId))
      ))
      const classIds = new Set(classes.map((classRoom) => classRoom.id))
      const schoolIds = new Set([
        ...linkedTeachers.map((teacher) => teacher.schoolId),
        ...classes.map((classRoom) => classRoom.schoolId),
      ])
      const students = data.students.filter((student) => classIds.has(student.classId))
      const guardianIdsFromStudents = new Set(students.flatMap((student) => student.guardianIds ?? []))

      return withScopedAcademicExtras({
        schools: data.schools.filter((school) => schoolIds.has(school.id)),
        classes,
        teachers: data.teachers.filter((teacher) => teacherIds.has(teacher.id)),
        students,
        guardians: data.guardians.filter((guardian) => guardianIdsFromStudents.has(guardian.id)),
      })
    }

    if (roleProfile === 'ALUNO') {
      const students = data.students.filter((student) => studentIds.has(student.id))
      const classIds = new Set(students.map((student) => student.classId))
      const schoolIds = new Set(students.map((student) => student.schoolId))
      const classes = data.classes.filter((classRoom) => classIds.has(classRoom.id))
      const teacherIdsFromClasses = new Set(classes.flatMap((classRoom) => [classRoom.teacherId, ...(classRoom.teacherIds ?? [])].filter(Boolean)))

      return withScopedAcademicExtras({
        schools: data.schools.filter((school) => schoolIds.has(school.id)),
        classes,
        teachers: data.teachers.filter((teacher) => teacherIdsFromClasses.has(teacher.id)),
        students,
        guardians: [],
      })
    }

    if (roleProfile === 'RESPONSAVEL') {
      const guardians = data.guardians.filter((guardian) => guardianIds.has(guardian.id))
      const linkedStudentIds = new Set(guardians.flatMap((guardian) => guardian.studentIds ?? []))
      const students = data.students.filter((student) => linkedStudentIds.has(student.id) || (student.guardianIds ?? []).some((guardianId) => guardianIds.has(guardianId)))
      const classIds = new Set(students.map((student) => student.classId))
      const schoolIds = new Set(students.map((student) => student.schoolId))
      const classes = data.classes.filter((classRoom) => classIds.has(classRoom.id))
      const teacherIdsFromClasses = new Set(classes.flatMap((classRoom) => [classRoom.teacherId, ...(classRoom.teacherIds ?? [])].filter(Boolean)))

      return withScopedAcademicExtras({
        schools: data.schools.filter((school) => schoolIds.has(school.id)),
        classes,
        teachers: data.teachers.filter((teacher) => teacherIdsFromClasses.has(teacher.id)),
        students,
        guardians,
      })
    }

    return data
  }

  function getScopedEvaluationsData(data: EvaluationsScreenPayload): EvaluationsScreenPayload {
    if (!session || isNetworkAdminProfile(roleProfile)) return data

    const currentQuestionCreatorIds = new Set(
      [session.currentUser.id, session.currentUser.linkedTeacherId].filter((id): id is string => Boolean(id)),
    )
    const scopedSchools = screenData.schools ? getScopedSchoolsData(screenData.schools) : null
    const relatedSchoolIds = userRelatedSchoolIds(session.currentUser, data.schools ?? scopedSchools?.schools ?? [])
    const allowedSchoolIds = new Set([
      ...(scopedSchools?.schools.map((school) => school.id) ?? []),
      ...Array.from(relatedSchoolIds),
    ])
    if (session.currentUser.schoolId) allowedSchoolIds.add(session.currentUser.schoolId)
    if (allowedSchoolIds.size === 0 && (data.schools ?? []).length === 1 && data.schools?.[0]?.id) allowedSchoolIds.add(data.schools[0].id)
    const allowedClassIdsFromSchools = new Set(scopedSchools?.classes.map((classRoom) => classRoom.id) ?? [])
    const schoolScopedEvaluations = roleProfile === 'PROFESSOR' || isSchoolLeadership(roleProfile)
    const allowedClasses = data.classes.filter((classRoom) => {
      if (schoolScopedEvaluations) return allowedSchoolIds.has(classRoom.schoolId)
      if (allowedClassIdsFromSchools.size > 0) return allowedClassIdsFromSchools.has(classRoom.id)
      return allowedSchoolIds.has(classRoom.schoolId)
    })
    const allowedClassIds = new Set(allowedClasses.map((classRoom) => classRoom.id))

    const currentTeacherIds = new Set([session.currentUser.linkedTeacherId].filter((id): id is string => Boolean(id)))
    const teacherPool = mergeById(data.teachers ?? [], scopedSchools?.teachers ?? [])
    const currentTeachers = teacherPool.filter((teacher) => (
      teacher.userId === session.currentUser.id
      || teacher.id === session.currentUser.linkedTeacherId
      || currentQuestionCreatorIds.has(teacher.userId)
    ))
    for (const teacher of currentTeachers) currentTeacherIds.add(teacher.id)
    const evaluationMatchesTeacherSubject = (evaluation: EvaluationsScreenPayload['evaluations'][number]) => {
      if (roleProfile !== 'PROFESSOR') return true

      const evaluationClass = allowedClasses.find((classRoom) => classRoom.id === evaluation.classId)
      if (!evaluationClass) return false
      const evaluationSchoolId = evaluation.schoolId ?? evaluationClass.schoolId
      if (!allowedSchoolIds.has(evaluationSchoolId)) return false

      const creatorIds = [evaluation.createdById, evaluation.teacherId, evaluation.createdBy?.id].filter((id): id is string => Boolean(id))
      if (creatorIds.some((id) => currentQuestionCreatorIds.has(id) || currentTeacherIds.has(id))) return true

      return currentTeachers.some((teacher) => teacherCanTeachSubject(teacher, evaluation.subject))
    }

    const scopedEvaluations = data.evaluations.filter((evaluation) => allowedClassIds.has(evaluation.classId) && evaluationMatchesTeacherSubject(evaluation))
    const scopedEvaluationIds = new Set(scopedEvaluations.map((evaluation) => evaluation.id))
    const referencedQuestionIds = new Set(scopedEvaluations.flatMap((evaluation) => evaluation.questionIds ?? []))

    return {
      ...data,
      classes: allowedClasses,
      evaluations: scopedEvaluations,
      students: data.students?.filter((student) => allowedClassIds.has(student.classId)),
      evaluationCorrections: data.evaluationCorrections?.filter((correction) => scopedEvaluationIds.has(correction.evaluationId)),
      answerCards: data.answerCards?.filter((card) => scopedEvaluationIds.has(getAnswerCardEvaluationId(card))),
      schools: data.schools?.filter((school) => allowedSchoolIds.has(school.id)),
      teachers: data.teachers?.filter((teacher) => allowedSchoolIds.has(teacher.schoolId)),
      questionBank: data.questionBank?.filter((question) => {
        if (referencedQuestionIds.has(question.id)) return true
        if (question.sourceType === 'INEP_ENEM') return true
        if (question.visibility === 'PRIVATE') return currentQuestionCreatorIds.has(question.createdById)
        if (question.visibility === 'GLOBAL' || question.visibility === 'NETWORK') return true
        if (roleProfile === 'PROFESSOR') return allowedSchoolIds.has(question.schoolId) || currentQuestionCreatorIds.has(question.createdById)
        if (isSchoolLeadership(roleProfile)) return allowedSchoolIds.has(question.schoolId)
        return currentQuestionCreatorIds.has(question.createdById)
      }),
    }
  }

  function getScopedCalendarData(data: CalendarScreenPayload): CalendarScreenPayload {
    if (!session || isSuperAdminProfile(roleProfile)) return data

    const scopeSource = data.scope ?? screenData.schools
    const scopedSchools = data.scope
      ? data.scope
      : scopeSource
        ? getScopedSchoolsData(scopeSource)
        : null
    const schoolIds = new Set(scopedSchools?.schools.map((school) => school.id) ?? [session.currentUser.schoolId].filter(Boolean) as string[])
    const classIds = new Set(scopedSchools?.classes.map((classRoom) => classRoom.id) ?? [])

    return {
      ...data,
      schools: data.schools.filter((school) => schoolIds.has(school.id)),
      classes: data.classes.filter((classRoom) => classIds.size ? classIds.has(classRoom.id) : schoolIds.has(classRoom.schoolId)),
      evaluations: data.evaluations.filter((evaluation) => !classIds.size || classIds.has(evaluation.classId)),
      calendarEvents: data.calendarEvents.filter((event) => (
        schoolIds.has(event.schoolId)
        && (!event.classId || classIds.size === 0 || classIds.has(event.classId))
      )),
    }
  }

  function getScopedNotificationsData(data: NotificationsScreenPayload): NotificationsScreenPayload {
    if (!session || isSuperAdminProfile(roleProfile)) return data

    const notifications = data.notifications.filter((notification) => notification.userId === session.currentUser.id)
    return {
      notifications,
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
      totalCount: notifications.length,
    }
  }

  function getScopedMealsData(data: MealsScreenPayload): MealsScreenPayload {
    if (!session || isNetworkAdminProfile(roleProfile) || roleProfile === 'NUTRITIONIST') return data

    const allowedSchoolIds = isSchoolLeadership(roleProfile)
      ? getStrictSchoolScopeIds(session.currentUser, data.schools, data.mealManagements)
      : userRelatedSchoolIds(session.currentUser, data.schools, data.mealManagements)
    if (isSchoolLeadership(roleProfile) && allowedSchoolIds.size === 0 && data.schools.length === 1) {
      allowedSchoolIds.add(data.schools[0].id)
    }
    return {
      schools: data.schools.filter((school) => allowedSchoolIds.has(school.id)),
      mealManagements: data.mealManagements.filter((management) => allowedSchoolIds.has(management.escolaId)),
      foodRequests: (data.foodRequests ?? []).filter((request) => allowedSchoolIds.has(request.schoolId)),
      mealRequestHistory: (data.mealRequestHistory ?? []).filter((entry) => allowedSchoolIds.has(entry.schoolId)),
    }
  }

  function blockUnauthorizedAction(message = 'Seu perfil nao possui permissao para esta acao.') {
    showToast({ tone: 'error', message })
    return Promise.resolve()
  }

  function syncCurrentUser(updated: UserAccount) {
    setSession((current) => current ? { ...current, currentUser: updated } : current)
    updateScreenData('settings', (current) => ({ ...current, currentUser: updated }))
    updateScreenData('access', (current) => ({ ...current, users: replaceById(current.users, updated) }))
    updateScreenData('schools', (current) => ({
      ...current,
      students: current.students.map((student) => (
        student.id === updated.linkedStudentId || student.userId === updated.id
          ? { ...student, avatarUrl: updated.avatarUrl, bannerUrl: updated.bannerUrl }
          : student
      )),
      teachers: current.teachers.map((teacher) => (
        teacher.id === updated.linkedTeacherId || teacher.userId === updated.id
          ? { ...teacher, avatarUrl: updated.avatarUrl, bannerUrl: updated.bannerUrl }
          : teacher
      )),
    }))
  }

  async function handleLogin(credentials: { email: string; password: string }) {
    setIsSubmitting(true)
    setAuthError(null)

    try {
      const result = await login(credentials)
      setScreenData({})
      setScreenErrors({})
      setToken(result.token)
      setTokenExpiresAt(result.expiresAt)
      navigateToPath('/', 'replace')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Nao foi possivel entrar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    void logoutSession().catch(() => undefined)
    clearAuthState()
    navigateToPath('/login', 'replace')
  }

  function showToast(toast: AppToast) {
    setToast(toast)
    window.setTimeout(() => setToast(null), 4200)
  }

  async function runAction(action: (currentToken: string) => Promise<void>, successMessage: string) {
    if (!token) {
      showToast({ tone: 'error', message: 'Sessao expirada. Entre novamente para continuar.' })
      return
    }

    setAppError(null)
    try {
      await action(token)
      showToast({ tone: 'success', message: successMessage })
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        const refreshedToken = await renewAccessToken()
        if (refreshedToken) {
          try {
            await action(refreshedToken)
            showToast({ tone: 'success', message: successMessage })
            return
          } catch (retryError) {
            showToast({ tone: 'error', message: retryError instanceof Error ? retryError.message : 'Nao foi possivel salvar a alteracao.' })
            throw retryError
          }
        }
      }
      showToast({ tone: 'error', message: error instanceof Error ? error.message : 'Nao foi possivel salvar a alteracao.' })
      throw error
    }
  }

  function saveDownloadedFile(file: { blob: Blob; filename: string }) {
    const url = URL.createObjectURL(file.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.filename
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const userInitials = useMemo(() => {
    if (!session) return ''
    return session.currentUser.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('')
  }, [session])

  function handleSectionChange(section: AppSection) {
    const nextSection = getSectionAliasForProfile(section, roleProfile)
    navigateToSection(allowedSections.includes(nextSection) ? nextSection : fallbackSection)
    setMobileOpen(false)
  }

  function renderMissingScreen(section: AppSection) {
    const message = screenErrors[section]
    if (message) {
      return (
        <ScreenErrorState
          title="Tela indisponivel"
          description={message}
          onRetry={() => {
            setScreenErrors((current) => ({ ...current, [section]: undefined }))
            void loadScreen(section, token)
          }}
        />
      )
    }

    return (
      <ScreenLoadingState
        title="Carregando tela"
        description="Buscando dados..."
      />
    )
  }

  function renderActiveScreen(): ReactNode {
    if (!token || !session) return null
    if (!roleProfile) {
      return (
        <ScreenErrorState
          title="Acesso negado"
          description="Nao foi possivel validar um perfil de acesso para esta sessao."
          onRetry={() => void refreshSession(token)}
        />
      )
    }
    if (!allowedSections.length || !allowedSections.includes(activeSection)) {
      return (
        <ScreenErrorState
          title="Acesso negado"
          description="Seu perfil nao possui permissoes explicitas para acessar esta area. Entre novamente ou solicite revisao de permissoes."
          onRetry={() => void refreshSession(token)}
        />
      )
    }

    switch (activeSection) {
      case 'dashboard': {
        const data = screenData.dashboard
        if (!data) return renderMissingScreen('dashboard')
        const cachedSchoolScope = screenData.schools ? getScopedSchoolsData(screenData.schools) : null
        const dashboardSchools = mergeById(cachedSchoolScope?.schools ?? [], data.schools ?? [])
        const dashboardClasses = mergeById(cachedSchoolScope?.classes ?? [], data.classes ?? [])

        return (
          <DashboardView
            dashboard={data.dashboard}
            auditEvents={data.auditEvents}
            evaluations={data.evaluations}
            profile={roleProfile}
            currentUser={session.currentUser}
            schools={dashboardSchools}
            classes={dashboardClasses}
            loading={Boolean(screenLoading.dashboard)}
            onApplyFilters={applyDashboardFilters}
            onLoadAlertsPage={loadDashboardAlertsPage}
          />
        )
      }

      case 'schools': {
        const data = screenData.schools
        if (!data) return renderMissingScreen('schools')
        const scopedData = getScopedSchoolsData(data)

        return (
          <SchoolsView
            currentUser={session.currentUser}
            currentRole={userRole}
            schools={scopedData.schools}
            schoolsPagination={scopedData.schoolsPagination}
            classes={scopedData.classes}
            classesPagination={scopedData.classesPagination}
            students={scopedData.students}
            teachers={scopedData.teachers}
            guardians={scopedData.guardians}
            lessonRecords={scopedData.lessonRecords}
            assetVersion={profileAssetVersion}
            readOnly={!isAdminProfile(roleProfile)}
            onLoadSchoolsPage={(params: SchoolsPageQuery) => listSchoolsPage(token, params, { networkScope: isNetworkAdminProfile(roleProfile) })}
            onLoadClassesPage={(params: ClassesPageQuery) => listClassesPage(token, params, { networkScope: isNetworkAdminProfile(roleProfile) })}
            onSearchStudents={(params) => searchStudentsForGuardian(token, {
              ...params,
              schoolId: roleProfile === 'DIRETOR' ? session.currentUser.schoolId ?? params.schoolId : params.schoolId,
            }, { networkScope: isNetworkAdminProfile(roleProfile) })}
            onCreate={(draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const created = await createSchool(token, draft)
              updateScreenData('schools', (current) => ({ ...current, schools: [created, ...current.schools] }))
              invalidateScreens(['dashboard', 'teachers', 'students', 'access', 'calendar', 'pedagogy'])
            }, 'Escola criada com sucesso.') : blockUnauthorizedAction()}
            onUpdate={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateSchool(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, schools: replaceById(current.schools, updated) }))
              invalidateScreens(['dashboard', 'teachers', 'students', 'access', 'calendar', 'pedagogy'])
            }, 'Escola atualizada.') : blockUnauthorizedAction()}
            onCreateClass={(draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const created = await createClassRoom(token, draft)
              updateScreenData('schools', (current) => ({ ...current, classes: [created, ...current.classes] }))
              invalidateScreens(['dashboard', 'teachers', 'students', 'evaluations', 'calendar', 'pedagogy'])
            }, 'Turma criada com sucesso.') : blockUnauthorizedAction()}
            onUpdateClass={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateClassRoom(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, classes: replaceById(current.classes, updated) }))
              invalidateScreens(['dashboard', 'teachers', 'students', 'evaluations', 'calendar', 'pedagogy'])
            }, 'Turma atualizada.') : blockUnauthorizedAction()}
            onCreateTeacher={(draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const created = await createTeacher(token, draft)
              updateScreenData('schools', (current) => ({
                ...current,
                teachers: [created, ...current.teachers],
                classes: draft.classId
                  ? current.classes.map((classRoom) => classRoom.id === draft.classId
                    ? {
                        ...classRoom,
                        teacherId: classRoom.teacherId || created.id,
                        teacherIds: Array.from(new Set([...(classRoom.teacherIds ?? [classRoom.teacherId]).filter(Boolean), created.id])),
                      }
                    : classRoom)
                  : current.classes,
              }))
              invalidateScreens(['teachers', 'access', 'calendar', 'pedagogy'])
            }, 'Professor criado e vinculado.') : blockUnauthorizedAction()}
            onUpdateTeacher={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateTeacher(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, teachers: replaceById(current.teachers, updated) }))
              invalidateScreens(['teachers', 'access', 'calendar', 'pedagogy'])
            }, 'Professor atualizado.') : blockUnauthorizedAction()}
            onCreateStudent={(draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const created = await createStudent(token, draft)
              updateScreenData('schools', (current) => ({
                ...current,
                students: [created, ...current.students],
                guardians: current.guardians.map((guardian) => created.guardianIds.includes(guardian.id)
                  ? { ...guardian, studentIds: Array.from(new Set([...guardian.studentIds, created.id])) }
                  : guardian),
              }))
              invalidateScreens(['dashboard', 'students', 'access', 'pedagogy'])
            }, 'Aluno criado e vinculado.') : blockUnauthorizedAction()}
            onUpdateStudent={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateStudent(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, students: replaceById(current.students, updated) }))
              invalidateScreens(['dashboard', 'students', 'access', 'pedagogy'])
            }, 'Aluno atualizado.') : blockUnauthorizedAction()}
            onCreateGuardian={(draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const created = await createGuardian(token, draft)
              updateScreenData('schools', (current) => ({
                ...current,
                guardians: [created, ...current.guardians],
                students: current.students.map((student) => created.studentIds.includes(student.id)
                  ? { ...student, guardianIds: Array.from(new Set([...student.guardianIds, created.id])) }
                  : student),
              }))
              invalidateScreens(['students', 'access'])
            }, 'Responsavel criado e vinculado.') : blockUnauthorizedAction()}
            onUpdateGuardian={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateGuardian(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, guardians: replaceById(current.guardians, updated) }))
              invalidateScreens(['students', 'access'])
            }, 'Responsavel atualizado.') : blockUnauthorizedAction()}
          />
        )
      }

      case 'classes': {
        const data = screenData.classes
        if (!data) return renderMissingScreen('classes')
        const scopedData = getScopedSchoolsData(data)

        return (
          <ClassesView
            classes={scopedData.classes}
            schools={scopedData.schools}
            teachers={scopedData.teachers}
            students={scopedData.students}
            readOnly={!isAdminProfile(roleProfile)}
            onCreate={(draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const created = await createClassRoom(token, draft)
              updateScreenData('schools', (current) => ({ ...current, classes: [created, ...current.classes] }))
              invalidateScreens(['dashboard', 'teachers', 'students', 'evaluations', 'calendar', 'pedagogy'])
            }, 'Turma criada com sucesso.') : blockUnauthorizedAction()}
            onUpdate={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateClassRoom(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, classes: replaceById(current.classes, updated) }))
              invalidateScreens(['dashboard', 'teachers', 'students', 'evaluations', 'calendar', 'pedagogy'])
            }, 'Turma atualizada.') : blockUnauthorizedAction()}
          />
        )
      }

      case 'teachers': {
        const data = screenData.teachers
        if (!data) return renderMissingScreen('teachers')
        const scopedData = getScopedSchoolsData(data)

        return (
          <TeachersView
            schoolsData={scopedData}
            currentUser={session.currentUser}
            currentRole={userRole}
            assetVersion={profileAssetVersion}
            onLoadTeachersPage={(params) => listTeachersPage(token, params, { networkScope: isNetworkAdminProfile(roleProfile) })}
          />
        )
      }

      case 'students': {
        const data = screenData.students
        if (!data) return renderMissingScreen('students')
        const scopedData = getScopedSchoolsData(data)

        return (
          <StudentsView
            schoolsData={scopedData}
            currentUser={session.currentUser}
            currentRole={userRole}
            assetVersion={profileAssetVersion}
            onLoadStudentsPage={(params) => listStudentsPage(token, params, { networkScope: isNetworkAdminProfile(roleProfile) })}
          />
        )
      }

      case 'pedagogy':
      case 'teacher-subjects':
      case 'room-reservations':
      case 'lesson-records':
      case 'attendance-list':
      case 'student-performance':
      case 'student-grades':
      case 'student-attendance':
      case 'child-attendance':
      case 'child-performance': {
        const data = screenData[activeSection]
        if (!data) return renderMissingScreen(activeSection)
        const scopedData = activeSection === 'room-reservations'
          ? data
          : getScopedSchoolsData(data)
        const evaluationsData = 'evaluations' in data
          ? getScopedEvaluationsData({
              ...(data as EvaluationsScreenPayload),
              schools: scopedData.schools,
              classes: scopedData.classes,
              teachers: scopedData.teachers,
              students: scopedData.students,
            })
          : screenData.evaluations
          ? getScopedEvaluationsData(screenData.evaluations)
          : undefined

        return (
          <RolePortalView
            section={activeSection}
            profile={roleProfile}
            currentUser={session.currentUser}
            currentRole={userRole}
            schoolsData={scopedData}
            evaluationsData={evaluationsData}
            onLoadEvaluationsData={activeSection === 'teacher-subjects' ? async () => {
              const payload = await loadTeacherSubjectEvaluationsScreen(token, { networkScope: isNetworkAdminProfile(roleProfile) })
              const mergedPayload: EvaluationsScreenPayload = {
                ...payload,
                schools: scopedData.schools,
                teachers: scopedData.teachers,
                students: scopedData.students,
                classes: payload.classes.length ? payload.classes : scopedData.classes,
              }
              return getScopedEvaluationsData(mergedPayload)
            } : undefined}
            onCreateRoomReservation={async (draft) => {
              let createdReservation: RoomReservation | null = null

              await runAction(async () => {
                createdReservation = await createRoomReservation(token, draft)
                updateScreenData('room-reservations', (current) => ({
                  ...current,
                  roomReservations: [
                    createdReservation as RoomReservation,
                    ...(current.roomReservations ?? []).filter((reservation) => reservation.id !== createdReservation?.id),
                  ],
                }))
              }, 'Reserva salva no banco.')

              if (!createdReservation) throw new Error('Nao foi possivel salvar a reserva.')
              return createdReservation
            }}
            onCreateLessonRecord={async (draft) => {
              let createdLesson: LessonRecord | null = null

              await runAction(async () => {
                createdLesson = await createLessonRecord(token, draft)
                upsertLessonRecordInCachedScreens(createdLesson)
              }, 'Registro de aula salvo no banco.')

              if (!createdLesson) throw new Error('Nao foi possivel salvar o registro de aula.')
              return createdLesson
            }}
            onUpdateLessonRecord={async (id, draft) => {
              let updatedLesson: LessonRecord | null = null

              await runAction(async () => {
                updatedLesson = await updateLessonRecord(token, id, draft)
                upsertLessonRecordInCachedScreens(updatedLesson)
              }, 'Frequencia atualizada no banco.')

              if (!updatedLesson) throw new Error('Nao foi possivel atualizar a frequencia.')
              return updatedLesson
            }}
            onLoadTeacherSubjectCardsPage={(params) => listTeacherSubjectCardsPage(token, params, { networkScope: isNetworkAdminProfile(roleProfile) })}
            onLoadStudentSubjectCardsPage={(params) => listStudentSubjectCardsPage(token, params)}
            onDownloadEvaluation={(id) => runAction(async () => {
              const file = activeSection === 'student-grades'
                ? await downloadStudentEvaluationFile(token, id)
                : await downloadEvaluationFile(token, id)
              saveDownloadedFile(file)
            }, 'Download da prova iniciado.')}
            onDownloadAnswerKey={(id) => runAction(async () => {
              const file = activeSection === 'student-grades'
                ? await downloadStudentEvaluationFile(token, id, 'answer_key')
                : await downloadEvaluationFile(token, id, 'answer_key')
              saveDownloadedFile(file)
            }, 'Download do gabarito iniciado.')}
            onLoadEvaluationFile={(id, kind) => activeSection === 'student-grades'
              ? downloadStudentEvaluationFile(token, id, kind)
              : downloadEvaluationFile(token, id, kind)}
            onLoadCorrectionDetail={(correctionId) => activeSection === 'student-grades'
              ? getStudentGradeCorrectionDetail(token, correctionId)
              : getEvaluationCorrection(token, correctionId)}
            onLoadCorrectionCardPreview={(correctionId) => activeSection === 'student-grades'
              ? getStudentEvaluationCorrectionCardFile(token, correctionId)
              : getEvaluationCorrectionCardFile(token, correctionId)}
          />
        )
      }

      case 'evaluations': {
        const data = screenData.evaluations
        if (!data) return renderMissingScreen('evaluations')
        const scopedData = getScopedEvaluationsData(data)
        const canManageEvaluations = isAdminProfile(roleProfile) || roleProfile === 'PROFESSOR'

        return (
          <EvaluationsView
            currentUser={session.currentUser}
            currentRole={userRole}
            evaluations={scopedData.evaluations}
            classes={scopedData.classes}
            teachers={scopedData.teachers ?? []}
            answerCards={scopedData.answerCards ?? []}
            curriculumSkills={scopedData.curriculumSkills ?? []}
            assessmentDescriptors={scopedData.assessmentDescriptors ?? []}
            questionBank={scopedData.questionBank ?? []}
            questionImportPlans={scopedData.questionImportPlans ?? []}
            onCreate={(draft) => canManageEvaluations ? runAction(async () => {
              const createdPayload = await createEvaluation(token, draft)
              const created = getCreatedEvaluation(createdPayload)
              const answerCards = getCreatedAnswerCards(createdPayload)
              const createdWithBlueprint = {
                ...created,
                createdById: created.createdById ?? draft.createdById ?? session.currentUser.id,
                createdByName: created.createdByName ?? draft.createdByName ?? session.currentUser.name,
                buildMode: created.buildMode ?? draft.buildMode,
                omrCardVersion: created.omrCardVersion ?? draft.omrCardVersion,
                questionIds: created.questionIds ?? draft.questionIds,
                questionSnapshots: created.questionSnapshots ?? draft.questionSnapshots,
                skillCodes: created.skillCodes ?? draft.skillCodes,
                descriptorCodes: created.descriptorCodes ?? draft.descriptorCodes,
                sourceSummary: created.sourceSummary ?? draft.sourceSummary,
                answerCardsCount: created.answerCardsCount ?? answerCards.length,
              }
              updateScreenData('evaluations', (current) => ({
                ...current,
                evaluations: [createdWithBlueprint, ...current.evaluations],
                answerCards: answerCards.length ? mergeById(answerCards, current.answerCards ?? []) : current.answerCards,
              }))
              updateScreenData('evaluation-corrections', (current) => ({
                ...current,
                evaluations: [
                  createdWithBlueprint,
                  ...current.evaluations.filter((evaluation) => evaluation.id !== createdWithBlueprint.id),
                ],
                answerCards: answerCards.length ? mergeById(answerCards, current.answerCards ?? []) : current.answerCards,
              }))
              invalidateScreens(['dashboard', 'calendar', 'pedagogy'])
            }, 'Prova criada com cartoes individualizados.') : blockUnauthorizedAction('Seu perfil pode acompanhar provas, mas nao criar novas avaliacoes.')}
            onDelete={isAdminProfile(roleProfile) ? (id) => runAction(async () => {
              await deleteEvaluation(token, id)
              updateScreenData('evaluations', (current) => ({
                ...current,
                evaluations: removeById(current.evaluations, id),
                answerCards: current.answerCards?.filter((card) => getAnswerCardEvaluationId(card) !== id),
              }))
              updateScreenData('evaluation-corrections', (current) => ({
                ...current,
                evaluations: removeById(current.evaluations, id),
                evaluationCorrections: current.evaluationCorrections?.filter((correction) => correction.evaluationId !== id),
                answerCards: current.answerCards?.filter((card) => getAnswerCardEvaluationId(card) !== id),
              }))
              invalidateScreens(['dashboard', 'calendar', 'pedagogy'])
            }, 'Prova excluida.') : undefined}
            onDownload={(id) => runAction(async () => {
              const file = await downloadEvaluationFile(token, id)
              saveDownloadedFile(file)
            }, 'Download da prova iniciado.')}
            onDownloadAnswerCards={(id) => runAction(async () => {
              const file = await downloadEvaluationFile(token, id, 'answer_cards')
              saveDownloadedFile(file)
            }, 'Download dos cartoes iniciado.')}
            onCreateQuestion={async (draft) => {
              if (!canManageEvaluations) {
                await blockUnauthorizedAction('Seu perfil pode acompanhar questoes, mas nao criar novas.')
                throw new Error('Acao nao permitida para este perfil.')
              }

              let createdQuestion: Question | undefined
              await runAction(async () => {
                createdQuestion = await createQuestion(token, draft)
                updateScreenData('evaluations', (current) => ({
                  ...current,
                  questionBank: [createdQuestion as Question, ...(current.questionBank ?? [])],
                }))
                invalidateScreens(['pedagogy'])
              }, 'Questao salva no banco.')

              if (!createdQuestion) throw new Error('A API nao retornou a questao criada.')
              return createdQuestion
            }}
            onGenerateQuestions={async (draft) => {
              if (!canManageEvaluations) {
                await blockUnauthorizedAction('Seu perfil pode acompanhar questoes, mas nao gerar selecoes.')
                throw new Error('Acao nao permitida para este perfil.')
              }

              const generated = await generateQuestionSelection(token, draft)
              if (generated.questions?.length) {
                updateScreenData('evaluations', (current) => ({
                  ...current,
                  questionBank: mergeById(current.questionBank ?? [], generated.questions),
                }))
              }
              return generated
            }}
            onLoadQuestionsPage={loadQuestionsPageForEvaluations}
            onDeleteQuestion={async (id) => {
              if (!canManageEvaluations) {
                await blockUnauthorizedAction('Seu perfil pode acompanhar questoes, mas nao excluir.')
                throw new Error('Acao nao permitida para este perfil.')
              }

              await runAction(async () => {
                await deleteQuestion(token, id)
                updateScreenData('evaluations', (current) => ({
                  ...current,
                  questionBank: (current.questionBank ?? []).filter((question) => question.id !== id),
                  evaluations: current.evaluations.map((evaluation) => (
                    evaluation.questionIds?.includes(id) && !evaluation.questionSnapshots?.some((question) => question.id === id)
                      ? {
                          ...evaluation,
                          questionIds: evaluation.questionIds.filter((questionId) => questionId !== id),
                          questions: Math.max(0, evaluation.questionIds.filter((questionId) => questionId !== id).length || evaluation.questions - 1),
                        }
                      : evaluation
                  )),
                }))
                invalidateScreens(['dashboard', 'pedagogy'])
              }, 'Questao excluida.')
            }}
          />
        )
      }

      case 'evaluation-corrections': {
        const data = screenData['evaluation-corrections']
        if (!data) return renderMissingScreen('evaluation-corrections')
        const scopedData = getScopedEvaluationsData(data)
        const upsertCorrection = (current: EvaluationsScreenPayload, correction: EvaluationCorrection): EvaluationsScreenPayload => ({
          ...current,
          evaluationCorrections: [
            correction,
            ...(current.evaluationCorrections ?? []).filter((item) => item.id !== correction.id && !(item.evaluationId === correction.evaluationId && item.studentId === correction.studentId)),
          ],
        })
        const upsertCorrections = (current: EvaluationsScreenPayload, nextCorrections: EvaluationCorrection[]): EvaluationsScreenPayload => ({
          ...current,
          evaluationCorrections: [
            ...nextCorrections,
            ...(current.evaluationCorrections ?? []).filter((item) => !nextCorrections.some((correction) => (
              item.id === correction.id || (item.evaluationId === correction.evaluationId && item.studentId === correction.studentId)
            ))),
          ],
        })

        return (
          <EvaluationCorrectionsView
            evaluations={scopedData.evaluations}
            classes={scopedData.classes}
            schools={scopedData.schools ?? []}
            students={scopedData.students ?? []}
            corrections={scopedData.evaluationCorrections ?? []}
            answerCards={scopedData.answerCards ?? []}
            canFilterBySchool={isNetworkAdminProfile(roleProfile)}
            onLoadSchoolScope={isNetworkAdminProfile(roleProfile) ? async (schoolId) => {
              const schoolFilter = schoolId && schoolId !== 'all' ? { schoolId } : {}
              const [evaluationsPayload, scopePayload] = await Promise.all([
                loadEvaluationCorrectionsScreen(token, { networkScope: true, ...schoolFilter }),
                loadAcademicScopeScreen(token, { networkScope: true, ...schoolFilter }),
              ])
              return {
                ...evaluationsPayload,
                schools: scopePayload.schools,
                classes: scopePayload.classes,
                teachers: scopePayload.teachers,
                students: scopePayload.students,
              }
            } : undefined}
            onLoadStudentsPage={(params) => listStudentsPage(token, params, { networkScope: isNetworkAdminProfile(roleProfile) })}
            onDownloadEvaluation={(id) => runAction(async () => {
              const file = await downloadEvaluationFile(token, id)
              saveDownloadedFile(file)
            }, 'Download da prova iniciado.')}
            onDownloadAnswerCards={(id) => runAction(async () => {
              const file = await downloadEvaluationFile(token, id, 'answer_cards')
              saveDownloadedFile(file)
            }, 'Download dos cartoes iniciado.')}
            onLoadCorrectionDetail={(correctionId) => getEvaluationCorrection(token, correctionId)}
            onLoadCorrectionCardPreview={(correctionId) => getEvaluationCorrectionCardFile(token, correctionId)}
            onProcess={async (evaluationId, studentId, image) => {
              let processed: EvaluationCorrection | null = null
              await runAction(async () => {
                processed = await processEvaluationOmr(token, evaluationId, studentId, image)
                updateScreenData('evaluation-corrections', (current) => upsertCorrection(current, processed as EvaluationCorrection))
                updateScreenData('evaluations', (current) => upsertCorrection(current, processed as EvaluationCorrection))
                invalidateScreens(['dashboard', 'pedagogy', 'teacher-subjects', 'student-grades'])
              }, 'Sugestao de correcao gerada.')
              if (!processed) throw new Error('A API nao retornou a sugestao de correcao.')
              return processed
            }}
            onBatchProcess={async (evaluationId, files) => {
              let processed: EvaluationOmrBatchResponse | null = null
              await runAction(async () => {
                processed = await processEvaluationOmrBatch(token, evaluationId, files)
                const batchCorrections = getBatchCorrections(processed)
                if (batchCorrections.length) {
                  updateScreenData('evaluation-corrections', (current) => upsertCorrections(current, batchCorrections))
                  updateScreenData('evaluations', (current) => upsertCorrections(current, batchCorrections))
                }
                invalidateScreens(['dashboard', 'pedagogy', 'teacher-subjects', 'evaluations', 'student-grades'])
              }, 'Lote OMR processado.')
              if (!processed) throw new Error('A API nao retornou o resumo do lote.')
              return processed
            }}
            onReview={async (correctionId, payload) => {
              let reviewed: EvaluationCorrection | null = null
              await runAction(async () => {
                reviewed = await reviewEvaluationCorrection(token, correctionId, payload)
                updateScreenData('evaluation-corrections', (current) => upsertCorrection(current, reviewed as EvaluationCorrection))
                updateScreenData('evaluations', (current) => upsertCorrection(current, reviewed as EvaluationCorrection))
                invalidateScreens(['dashboard', 'pedagogy', 'evaluations', 'teacher-subjects', 'student-grades'])
              }, 'Revisao da correcao salva.')
              if (!reviewed) throw new Error('A API nao retornou a correcao revisada.')
              return reviewed
            }}
            onReviewMany={async (evaluationId, payload) => {
              let reviewed: Awaited<ReturnType<typeof confirmEvaluationCorrections>> | null = null
              await runAction(async () => {
                reviewed = await confirmEvaluationCorrections(token, evaluationId, payload)
                const confirmedCorrections = reviewed.corrections ?? []
                if (confirmedCorrections.length) {
                  updateScreenData('evaluation-corrections', (current) => upsertCorrections(current, confirmedCorrections))
                  updateScreenData('evaluations', (current) => upsertCorrections(current, confirmedCorrections))
                }
                invalidateScreens(['dashboard', 'pedagogy', 'evaluations', 'teacher-subjects', 'student-grades'])
              }, 'Notas confirmadas em lote.')
              if (!reviewed) throw new Error('A API nao retornou as correcoes confirmadas.')
              return reviewed
            }}
          />
        )
      }

      case 'calendar': {
        const data = screenData.calendar
        if (!data) return renderMissingScreen('calendar')
        const scopedData = getScopedCalendarData(data)
        const canCreateCalendar = isAdminProfile(roleProfile) || roleProfile === 'PROFESSOR'
        const currentCalendarCreatorIds = new Set([
          session.currentUser.id,
          session.currentUser.linkedTeacherId,
          session.currentUser.linkedStudentId,
          session.currentUser.linkedGuardianId,
        ].filter((id): id is string => Boolean(id)))
        const canManageCalendarEvent = (id: string) => {
          if (isAdminProfile(roleProfile)) return true
          const event = data.calendarEvents.find((item) => item.id === id)
          return Boolean(event?.createdById && currentCalendarCreatorIds.has(event.createdById))
        }

        return (
          <CalendarView
            currentUser={session.currentUser}
            currentRole={userRole}
            calendarEvents={scopedData.calendarEvents}
            schools={scopedData.schools}
            classes={scopedData.classes}
            evaluations={scopedData.evaluations}
            onCreate={(draft) => canCreateCalendar ? runAction(async () => {
              await createCalendarEvent(token, draft)
              await loadScreen('calendar', token)
            }, 'Evento adicionado ao calendario.') : blockUnauthorizedAction('Seu perfil visualiza calendario, mas nao edita eventos.')}
            onUpdate={(id, draft) => canManageCalendarEvent(id) ? runAction(async () => {
              await updateCalendarEvent(token, id, draft)
              await loadScreen('calendar', token)
            }, 'Evento atualizado no calendario.') : blockUnauthorizedAction('Apenas o criador do evento ou um Admin pode editar este evento.')}
            onDelete={(id) => canManageCalendarEvent(id) ? runAction(async () => {
              await deleteCalendarEvent(token, id)
              await loadScreen('calendar', token)
            }, 'Evento removido do calendario.') : blockUnauthorizedAction('Apenas o criador do evento ou um Admin pode excluir este evento.')}
          />
        )
      }

      case 'meals': {
        const data = screenData.meals
        if (!data) return renderMissingScreen('meals')
        const scopedData = getScopedMealsData(data)
        const canManageMeals = isAdminProfile(roleProfile)
        const canCreateFoodRequest = roleProfile === 'DIRETOR'
        const canAddRequestToStock = isAdminProfile(roleProfile)

        return (
          <MealsView
            currentUser={session.currentUser}
            currentRole={userRole}
            schools={scopedData.schools}
            mealManagements={scopedData.mealManagements}
            foodRequests={scopedData.foodRequests ?? []}
            mealRequestHistory={scopedData.mealRequestHistory ?? []}
            onLoadSchoolPage={async (page: number, limit: number, search = ''): Promise<MealManagementsPagePayload> => {
              if (!isAdminProfile(roleProfile) && roleProfile !== 'NUTRITIONIST') {
                return buildMealManagementsPagePayload(scopedData, page, limit, search)
              }

              try {
                const payload = await listMealManagementSchoolPage(token, page, limit, search, { networkScope: isNetworkAdminProfile(roleProfile) || roleProfile === 'NUTRITIONIST' })
                return payload
              } catch (error) {
                if (scopedData.mealManagements.length > 0) return buildMealManagementsPagePayload(scopedData, page, limit, search)

                throw error
              }
            }}
            onSearchFoods={(query, limit) => searchMealFoods(token, query, limit)}
            onCreateFoodRequest={(draft) => canCreateFoodRequest ? runAction(async () => {
              await createMealFoodRequest(token, draft)
              await loadScreen('meals', token)
            }, 'Solicitacao enviada ao nutricionista.') : blockUnauthorizedAction('Seu perfil nao pode criar solicitacoes de merenda.')}
            onUpdateFoodRequest={(id, draft) => canCreateFoodRequest ? runAction(async () => {
              await updateMealFoodRequest(token, id, draft)
              await loadScreen('meals', token)
            }, 'Solicitacao atualizada e reenviada ao nutricionista.') : blockUnauthorizedAction('Seu perfil nao pode editar solicitacoes de merenda.')}
            onDeleteFoodRequest={(id) => canCreateFoodRequest ? runAction(async () => {
              await deleteMealFoodRequest(token, id)
              await loadScreen('meals', token)
            }, 'Solicitacao excluida.') : blockUnauthorizedAction('Seu perfil nao pode excluir solicitacoes de merenda.')}
            onAddFoodRequestToStock={(id, draft) => canAddRequestToStock ? runAction(async () => {
              await addMealFoodRequestToStock(token, id, draft)
              await loadScreen('meals', token)
            }, 'Solicitacao adicionada ao estoque oficial.') : blockUnauthorizedAction('Apenas Admin pode adicionar solicitacoes ao estoque.')}
            onCreateManagement={async (draft) => {
              if (!canManageMeals) {
                await blockUnauthorizedAction('Apenas Admin pode criar gestao alimentar.')
                throw new Error('Acao nao permitida para este perfil.')
              }

              try {
                const created = await createMealManagement(token, draft)
                updateScreenData('meals', (current) => ({
                  ...current,
                  mealManagements: upsertById(current.mealManagements, created),
                }))
                return created
              } catch (error) {
                showToast({ tone: 'error', message: error instanceof Error ? error.message : 'Nao foi possivel criar a gestao alimentar.' })
                throw error
              }
            }}
            onCreateItem={(managementId, draft) => canManageMeals ? runAction(async () => {
              const updated = await createMealItem(token, managementId, draft)
              updateScreenData('meals', (current) => ({
                ...current,
                mealManagements: upsertById(current.mealManagements, updated),
              }))
            }, 'Item adicionado ao estoque da merenda.') : blockUnauthorizedAction('Seu perfil pode acompanhar merenda, mas nao alterar estoque.')}
            onUpdateBudget={(managementId, draft) => canManageMeals ? runAction(async () => {
              const updated = await updateMealBudget(token, managementId, draft)
              updateScreenData('meals', (current) => ({
                ...current,
                mealManagements: upsertById(current.mealManagements, updated),
              }))
            }, 'Orcamento atualizado.') : blockUnauthorizedAction('Seu perfil pode acompanhar merenda, mas nao alterar orcamento.')}
          />
        )
      }

      case 'food-requests': {
        const data = screenData['food-requests']
        if (!data) return renderMissingScreen('food-requests')
        const scopedData = getScopedMealsData(data)

        return (
          <NutritionRequestsView
            schools={scopedData.schools}
            mealManagements={scopedData.mealManagements}
            foodRequests={scopedData.foodRequests ?? []}
            onReview={(id, draft) => runAction(async () => {
              await reviewMealFoodRequest(token, id, draft)
              await loadScreen('food-requests', token)
            }, 'Solicitacao avaliada.')}
          />
        )
      }

      case 'access': {
        const data = screenData.access
        if (!data) return renderMissingScreen('access')
        if (!isNetworkAdminProfile(roleProfile)) return <ScreenErrorState title="Acesso restrito" description="Apenas administradores globais podem gerenciar cargos e permissoes globais." onRetry={() => navigateToSection(fallbackSection, 'replace')} />

        return (
          <AccessView
            roles={data.roles}
            users={data.users}
            schools={data.schools}
            onSearchUsers={(params) => searchAccessUsers(token, params)}
            onUpdateRole={(id, draft) => runAction(async () => {
              const updated = await updateRole(token, id, draft)
              updateScreenData('access', (current) => ({ ...current, roles: replaceById(current.roles, updated) }))
              setSession((current) => current?.currentRole?.id === updated.id ? { ...current, currentRole: updated } : current)
            }, 'Cargo atualizado.')}
            onUpdateUserRole={(id, roleId) => runAction(async () => {
              const updated = await updateUserRole(token, id, { roleId })
              updateScreenData('access', (current) => ({ ...current, users: replaceById(current.users, updated) }))
              if (session.currentUser.id === updated.id) {
                setSession((current) => current ? {
                  ...current,
                  currentUser: updated,
                  currentRole: data.roles.find((role) => role.id === updated.roleId) ?? current.currentRole,
                } : current)
              }
            }, 'Cargo do usuario atualizado.')}
            onUpdateUserSchool={(id, schoolId) => runAction(async () => {
              const updated = await updateUserSchool(token, id, { schoolId })
              updateScreenData('access', (current) => ({ ...current, users: replaceById(current.users, updated) }))
              updateScreenData('settings', (current) => session.currentUser.id === updated.id ? { ...current, currentUser: updated } : current)
              if (session.currentUser.id === updated.id) {
                setSession((current) => current ? { ...current, currentUser: updated } : current)
              }
            }, 'Escola vinculada ao usuario atualizada.')}
          />
        )
      }

      case 'notifications': {
        const data = screenData.notifications
        if (!data) return renderMissingScreen('notifications')
        const scopedData = getScopedNotificationsData(data)

        return (
          <NotificationsView
            notifications={scopedData.notifications}
            unreadCount={scopedData.unreadCount}
            totalCount={scopedData.totalCount}
            onMarkRead={handleMarkNotificationRead}
            onMarkUnread={handleMarkNotificationUnread}
            onMarkAllRead={handleMarkAllNotificationsRead}
          />
        )
      }

      case 'settings': {
        const data = screenData.settings
        if (!data) return renderMissingScreen('settings')

        return (
          <SettingsView
            currentUser={data.currentUser}
            profile={roleProfile}
            schools={data.schools ?? []}
            assetVersion={profileAssetVersion}
            onSave={(draft, avatarFile, bannerFile, visualAction) => runAction(async (currentToken) => {
              let updated = { ...data.currentUser, ...(await updateProfile(currentToken, draft)) }
              const nextAssetVersion = { avatar: 0, banner: 0 }

              if (visualAction?.removeAvatar) {
                updated = { ...updated, ...(await removeProfileAvatar(currentToken)) }
                nextAssetVersion.avatar = Date.now()
              } else if (avatarFile) {
                const uploadedAvatar = await uploadProfileAvatar(currentToken, avatarFile)
                if (!uploadedAvatar.avatarUrl) throw new Error('A API nao retornou a URL da foto enviada.')
                updated = { ...updated, ...uploadedAvatar }
                nextAssetVersion.avatar = Date.now()
              }
              if (visualAction?.removeBanner) {
                updated = { ...updated, ...(await removeProfileBanner(currentToken)) }
                nextAssetVersion.banner = Date.now()
              } else if (bannerFile) {
                const uploadedBanner = await uploadProfileBanner(currentToken, bannerFile)
                if (!uploadedBanner.bannerUrl) throw new Error('A API nao retornou a URL da capa enviada.')
                updated = { ...updated, ...uploadedBanner }
                nextAssetVersion.banner = Date.now()
              }

              if (nextAssetVersion.avatar || nextAssetVersion.banner) {
                setProfileAssetVersion((current) => ({
                  avatar: nextAssetVersion.avatar || current.avatar,
                  banner: nextAssetVersion.banner || current.banner,
                }))
              }
              syncCurrentUser(updated)
            }, avatarFile || bannerFile || visualAction?.removeAvatar || visualAction?.removeBanner ? 'Perfil visual atualizado.' : 'Perfil atualizado.')}
          />
        )
      }
    }
  }

  if (isAuthRestoring) {
    return (
      <FullScreenState
        title="Preparando o MeuEnsino"
        description="Verificando se sua sessao ainda esta ativa."
      />
    )
  }

  if (isLandingPath(route)) return <LandingPage />

  if (!token && !isLoginPath(route)) return <LandingPage />

  if (!token) {
    return (
      <LoginView
        errorMessage={authError}
        isSubmitting={isSubmitting}
        onBackToLanding={() => navigateToPath('/landing')}
        onSubmit={handleLogin}
      />
    )
  }

  if (isSessionLoading || !session) {
    return (
      <FullScreenState
        title="Preparando o MeuEnsino"
        description="Validando sessao e carregando seu perfil."
      />
    )
  }

  const scopedNotificationsData = screenData.notifications ? getScopedNotificationsData(screenData.notifications) : null

  return (
    <div className="relative flex min-h-screen font-['DM_Sans'] text-slate-900">
      <Sidebar
        appName={appName}
        items={visibleNavItems}
        activeSection={activeSection}
        mobileOpen={mobileOpen}
        collapsed={sidebarCollapsed}
        onSectionChange={handleSectionChange}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          activeLabel={activeLabel}
          mobileOpen={mobileOpen}
          userName={session.currentUser.name}
          userEmail={session.currentUser.email}
          userRole={userRole?.name ?? 'Usuario'}
          avatarUrl={resolveApiAssetUrl(session.currentUser.avatarUrl, profileAssetVersion.avatar)}
          bannerUrl={resolveApiAssetUrl(session.currentUser.bannerUrl, profileAssetVersion.banner)}
          initials={userInitials}
          alertCount={scopedNotificationsData?.unreadCount ?? session.alertCount}
          notifications={(scopedNotificationsData?.notifications ?? []).filter((notification) => !notification.readAt).slice(0, 5)}
          notificationsLoading={Boolean(screenLoading.notifications)}
          onOpenMenu={() => setMobileOpen((current) => !current)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
          onOpenNotifications={() => {
            if (!screenData.notifications && !screenLoading.notifications) void loadScreen('notifications')
          }}
          onViewAllNotifications={() => handleSectionChange('notifications')}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onOpenProfile={() => handleSectionChange('settings')}
          onLogout={handleLogout}
        />

        <main className="w-full min-w-0 bg-slate-50">
          {appError ? (
            <div className="grid gap-3 px-4 pt-4 sm:px-6 lg:px-9">
              {appError ? <InlineNotice tone="danger" message={appError} /> : null}
            </div>
          ) : null}
          <Suspense
            fallback={
              <ScreenLoadingState
                title="Carregando tela"
                description="Preparando os componentes desta area."
              />
            }
          >
            {renderActiveScreen()}
          </Suspense>
        </main>
      </div>

      {toast && <ToastNotice tone={toast.tone} message={toast.message} />}
    </div>
  )
}

const particles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1.5,
  duration: Math.random() * 6 + 5,
  delay: Math.random() * 4,
}))

const shimmerWords = ["Carregando", "Preparando", "Quase lá"]

const WORDS = ["Preparando tudo", "Carregando dados", "Quase pronto"]

const PARTICLES = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * 5,
  opacity: Math.random() * 0.4 + 0.1,
}))

const ORBS = [
  { cx: "15%", cy: "20%", r: 280, color: "#7c3aed", opacity: 0.07 },
  { cx: "85%", cy: "75%", r: 320, color: "#6d28d9", opacity: 0.06 },
  { cx: "50%", cy: "50%", r: 200, color: "#8b5cf6", opacity: 0.05 },
]

function ParticleField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-violet-400"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.sin(p.id) * 12, 0],
            opacity: [p.opacity, p.opacity * 2.5, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

function HexagonRing({ delay = 0, size = 100, strokeWidth = 1, color = "#7c3aed", opacity = 0.2 }) {
  const r = size / 2
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    return `${r + r * Math.cos(angle)},${r + r * Math.sin(angle)}`
  }).join(" ")

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="absolute"
      style={{ opacity }}
      animate={{ rotate: 360, opacity: [opacity, opacity * 2, opacity] }}
      transition={{ rotate: { duration: 20 + delay * 3, repeat: Infinity, ease: "linear" }, opacity: { duration: 3, repeat: Infinity, ease: "easeInOut", delay } }}
    >
      <polygon points={points} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </motion.svg>
  )
}

function CenterOrb() {
  const rings = [
    { size: 220, delay: 0, opacity: 0.06, strokeWidth: 1 },
    { size: 170, delay: 0.4, opacity: 0.1, strokeWidth: 0.8 },
    { size: 130, delay: 0.8, opacity: 0.14, strokeWidth: 1 },
    { size: 100, delay: 1.2, opacity: 0.2, strokeWidth: 1 },
  ]

  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {rings.map((r, i) => (
        <div key={i} className="absolute flex items-center justify-center" style={{ width: r.size, height: r.size }}>
          <HexagonRing size={r.size} delay={r.delay} opacity={r.opacity} strokeWidth={r.strokeWidth} />
        </div>
      ))}

      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-violet-400/20"
          style={{ inset: -i * 16 - 8 }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.08, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.9, ease: "easeInOut" }}
        />
      ))}

      <motion.div
        className="absolute rounded-full"
        style={{
          width: 88,
          height: 88,
          background: "radial-gradient(circle at 35% 35%, #a78bfa, #7c3aed 60%, #4c1d95)",
        }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25) 0%, transparent 60%)" }}
        />
      </motion.div>

      <motion.div
        className="absolute rounded-full bg-violet-300/20"
        style={{ width: 64, height: 64 }}
        animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
      />

      <motion.svg
        className="absolute"
        width={72}
        height={72}
        viewBox="0 0 72 72"
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="36" cy="36" r="30"
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="40 150"
        />
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="1" />
          </linearGradient>
        </defs>
      </motion.svg>

      <motion.svg
        className="absolute"
        width={52}
        height={52}
        viewBox="0 0 52 52"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="26" cy="26" r="22"
          fill="none"
          stroke="#c4b5fd"
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="12 80"
          strokeOpacity="0.5"
        />
      </motion.svg>
    </div>
  )
}

function AnimatedProgressBar() {
  const progress = useMotionValue(0)
  const width = useTransform(progress, [0, 1], ["0%", "100%"])

  useEffect(() => {
    const controls = animate(progress, 0.7, {
      duration: 2.2,
      ease: [0.22, 1, 0.36, 1],
    })
    return controls.stop
  }, [])

  return (
    <div className="relative h-[2px] w-56 overflow-hidden rounded-full bg-violet-100/60">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-violet-500"
        style={{ width }}
      />
      <motion.div
        className="absolute inset-y-0 w-16 rounded-full bg-white/60"
        style={{ left: width }}
        animate={{ opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
      />
    </div>
  )
}

function FloatingChip({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <motion.div
      className="absolute flex items-center gap-1.5 rounded-full border border-violet-200/50 bg-white/70 px-3 py-1 backdrop-blur-sm"
      style={style}
      animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
      <span className="text-[10px] font-medium tracking-wide text-violet-600">{label}</span>
    </motion.div>
  )
}

export function FullScreenState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setWordIndex((i) => (i + 1) % WORDS.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden font-['DM_Sans']"
      style={{ background: "#faf9ff" }}
    >
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: o.cx,
            top: o.cy,
            width: o.r * 2,
            height: o.r * 2,
            background: o.color,
            opacity: o.opacity,
            transform: "translate(-50%, -50%)",
            filter: "blur(80px)",
          }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 1.5 }}
        />
      ))}

      <ParticleField />

      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #7c3aed 0.8px, transparent 0.8px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(ellipse 60% 55% at 50% 50%, black 0%, transparent 100%)",
        }}
      />

      <FloatingChip label="Sincronizando" style={{ top: "22%", left: "12%" }} />
      <FloatingChip label="Verificando" style={{ top: "30%", right: "10%" }} />
      <FloatingChip label="Processando" style={{ bottom: "28%", left: "8%" }} />
      <FloatingChip label="Conectando" style={{ bottom: "22%", right: "12%" }} />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <CenterOrb />
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1
            className="m-0 font-['Sora',system-ui,sans-serif] font-black leading-tight tracking-tight text-slate-900"
            style={{ fontSize: "clamp(1.7rem,4.5vw,2.8rem)" }}
          >
            {title}
          </h1>
          <p className="m-0 max-w-xs text-[15px] leading-relaxed text-slate-400">
            {description}
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
        >
          <AnimatedProgressBar />

          <div className="flex h-5 items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={wordIndex}
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-400"
                initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -5, filter: "blur(4px)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>

            <div className="flex gap-[5px]">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block h-[5px] w-[5px] rounded-full bg-violet-300"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-40"
        style={{ background: "linear-gradient(to top, #ede9fe18, transparent)" }}
      />
    </div>
  )
}

const LOADING_STEPS = [
  { label: "Autenticando sessão", icon: "lock" },
  { label: "Buscando permissões", icon: "shield" },
  { label: "Carregando dados", icon: "database" },
  { label: "Renderizando tela", icon: "layout" },
]

const SCAN_LINES = Array.from({ length: 6 }, (_, i) => i)

function PulsingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="block h-[5px] w-[5px] rounded-full bg-indigo-400"
      animate={{ scale: [1, 1.9, 1], opacity: [0.35, 1, 0.35] }}
      transition={{ duration: 1.1, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  )
}

function SegmentedRing() {
  const segments = 8
  return (
    <svg width={96} height={96} viewBox="0 0 96 96" className="absolute">
      {Array.from({ length: segments }, (_, i) => {
        const angle = (360 / segments) * i
        const rad = (angle * Math.PI) / 180
        const r = 44
        const cx = 48 + r * Math.cos(rad - Math.PI / 2)
        const cy = 48 + r * Math.sin(rad - Math.PI / 2)
        return (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={3}
            fill="#6366f1"
            initial={{ opacity: 0.15 }}
            animate={{ opacity: [0.15, 1, 0.15] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: (i / segments) * 1.4,
              ease: "easeInOut",
            }}
          />
        )
      })}
    </svg>
  )
}

function CoreSpinner() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      {/* Outer ring segmented */}
      <SegmentedRing />

      {/* Spinning arc */}
      <motion.svg
        width={80}
        height={80}
        viewBox="0 0 80 80"
        className="absolute"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="40" cy="40" r="36"
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="60 166"
          strokeOpacity="0.9"
        />
      </motion.svg>

      {/* Counter-spinning arc */}
      <motion.svg
        width={60}
        height={60}
        viewBox="0 0 60 60"
        className="absolute"
        animate={{ rotate: -360 }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="30" cy="30" r="26"
          fill="none"
          stroke="#a5b4fc"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="22 140"
          strokeOpacity="0.6"
        />
      </motion.svg>

      {/* Center core */}
      <motion.div
        className="absolute rounded-full bg-indigo-600"
        style={{ width: 28, height: 28 }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Gloss */}
        <div
          className="absolute rounded-full"
          style={{
            inset: 2,
            background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35) 0%, transparent 65%)",
          }}
        />
      </motion.div>

      {/* Pulse ring */}
      <motion.div
        className="absolute rounded-full border border-indigo-400/30"
        style={{ width: 42, height: 42 }}
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
    </div>
  )
}

function ScanLine({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute left-0 right-0 h-px"
      style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.15), transparent)" }}
      initial={{ top: "0%", opacity: 0 }}
      animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
      transition={{ duration: 3, repeat: Infinity, delay, ease: "linear" }}
    />
  )
}

const STEPS = [
  {
    id: 0,
    label: 'Conectando ao banco de dados',
    sub: 'Estabelecendo conexão segura…',
    stage: 'Conectando',
    icon: 'database',
  },
  {
    id: 1,
    label: 'Carregando alunos e turmas',
    sub: 'Sincronizando registros…',
    stage: 'Sincronizando',
    icon: 'users',
  },
  {
    id: 2,
    label: 'Verificando frequências',
    sub: 'Processando dados…',
    stage: 'Processando',
    icon: 'calendar-stats',
  },
  {
    id: 3,
    label: 'Finalizando ambiente',
    sub: 'Quase lá…',
    stage: 'Finalizando',
    icon: 'circle-check',
  },
] as const

const STEP_TIMINGS = [0, 900, 1900, 3000] // ms
const PROGRESS_DURATION = 3800 // ms
const PROGRESS_TARGET = 86 // %

// ─── Utilitário — easing quadrático ──────────────────────────────────────────

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function Spinner() {
  return (
    <div className="ls-spinner" aria-hidden>
      <div className="ls-ring ls-ring-outer" />
      <div className="ls-ring ls-ring-mid" />
      <div className="ls-ring ls-ring-inner" />
      <div className="ls-core">
        <i className="ti ti-school" />
      </div>
    </div>
  )
}

type StepState = 'pending' | 'active' | 'done'

function StepRow({
  step,
  state,
}: {
  step: (typeof STEPS)[number]
  state: StepState
}) {
  return (
    <div className="ls-step">
      <div className={cn('ls-step-icon', state)}>
        {state === 'done' ? (
          <i className="ti ti-check" />
        ) : (
          <i className={`ti ti-${step.icon}`} />
        )}
      </div>
      <div className="ls-step-text">
        <span className={cn('ls-step-label', state)}>{step.label}</span>
        <span className={cn('ls-step-sub', state)}>{step.sub}</span>
      </div>
    </div>
  )
}

function PulsingDots() {
  return (
    <div className="ls-dots" aria-hidden>
      <span className="ls-dot" />
      <span className="ls-dot" style={{ animationDelay: '.2s' }} />
      <span className="ls-dot" style={{ animationDelay: '.4s' }} />
    </div>
  )
}

export function ScreenLoadingState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [pct, setPct]               = useState(0)
  const rafRef                      = useRef<number>(0)

  // Avança steps nos timings definidos
  useEffect(() => {
    const timers = STEP_TIMINGS.map((t, i) =>
      window.setTimeout(() => setActiveStep(i), t),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  // Progresso via rAF — zero JS de animação CSS duplicado
  useEffect(() => {
    const start = performance.now()

    function tick(now: number) {
      const raw = Math.min((now - start) / PROGRESS_DURATION, 1)
      setPct(Math.round(easeInOut(raw) * PROGRESS_TARGET))
      if (raw < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const currentStage = STEPS[Math.min(activeStep, STEPS.length - 1)].stage

  return (
    <div className="ls-wrap">
      {/* Fundo pontilhado */}
      <div className="ls-dots-bg" aria-hidden />

      {/* Scan lines — CSS puro */}
      <div className="ls-scan" aria-hidden />
      <div className="ls-scan" style={{ animationDelay: '-1.8s' }} aria-hidden />
      <div className="ls-scan" style={{ animationDelay: '-.9s', opacity: 0.5 }} aria-hidden />

      <div className="ls-card">
        {/* Spinner */}
        <Spinner />

        {/* Texto */}
        <div className="ls-text">
          <h2 className="ls-title">{title}</h2>
          <p className="ls-desc">{description}</p>
        </div>

        {/* Steps */}
        <div className="ls-steps" role="list" aria-label="Etapas de carregamento">
          {STEPS.map((step, i) => {
            const state: StepState =
              i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending'
            return <StepRow key={step.id} step={step} state={state} />
          })}
        </div>

        {/* Barra de progresso */}
        <div className="ls-progress-wrap">
          <div className="ls-progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="ls-progress-fill" style={{ width: `${pct}%` }} />
            <div className="ls-shimmer" aria-hidden />
          </div>
          <div className="ls-progress-meta">
            <div className="ls-label-group">
              <span className="ls-label">{currentStage}</span>
              <PulsingDots />
            </div>
            <span className="ls-percent">{pct}%</span>
          </div>
        </div>
      </div>

      <style>{CSS}</style>
    </div>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

@keyframes lsSpinOuter  { to { transform: rotate(360deg); } }
@keyframes lsSpinMid    { to { transform: rotate(-360deg); } }
@keyframes lsCorePulse  {
  0%,100% { transform: scale(1); opacity: 1; }
  50%     { transform: scale(1.12); opacity: .7; }
}
@keyframes lsFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes lsStepIn {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes lsDotBlink {
  0%,80%,100% { opacity: .25; }
  40%         { opacity: 1; }
}
@keyframes lsScanMove {
  from { top: -2px; }
  to   { top: 100%; }
}
@keyframes lsShimmerSlide {
  0%   { left: -10%; opacity: 0; }
  20%  { opacity: 1; }
  100% { left: 110%; opacity: 0; }
}
@keyframes lsRingPop {
  0%   { transform: scale(.82); opacity: 0; }
  60%  { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* ── Layout ── */
.ls-wrap {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background: transparent;
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}

/* ── Fundo decorativo ── */
.ls-dots-bg {
  position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(circle, rgba(99,102,241,.18) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 0%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 0%, transparent 100%);
  opacity: .4;
}
.ls-scan {
  position: absolute; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(99,102,241,.25), transparent);
  animation: lsScanMove 3.6s linear infinite;
  pointer-events: none;
}

/* ── Card central ── */
.ls-card {
  position: relative; z-index: 10;
  width: 100%; max-width: 340px;
  display: flex; flex-direction: column; align-items: center; gap: 24px;
  animation: lsFadeUp .55s cubic-bezier(.22,1,.36,1) both;
}

/* ── Spinner ── */
.ls-spinner {
  position: relative; width: 72px; height: 72px;
  animation: lsRingPop .6s cubic-bezier(.22,1,.36,1) both;
}
.ls-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid transparent;
}
.ls-ring-outer {
  border-top-color: #6366f1;
  border-right-color: rgba(99,102,241,.25);
  animation: lsSpinOuter 1.1s linear infinite;
}
.ls-ring-mid {
  inset: 8px;
  border-right-color: #818cf8;
  border-bottom-color: #818cf8;
  animation: lsSpinMid .8s linear infinite;
}
.ls-ring-inner {
  inset: 17px; border-radius: 50%;
  background: rgba(99,102,241,.08);
  border: 1.5px solid rgba(99,102,241,.18);
}
.ls-core {
  position: absolute; inset: 21px; border-radius: 50%;
  background: linear-gradient(145deg, #4338ca, #6366f1);
  animation: lsCorePulse 1.8s ease-in-out infinite;
  display: grid; place-items: center;
}
.ls-core i { font-size: 14px; color: #fff; }

/* ── Texto ── */
.ls-text { text-align: center; display: flex; flex-direction: column; gap: 6px; }
.ls-title {
  font-size: 18px; font-weight: 800; letter-spacing: -.03em;
  color: #1e1b4b; margin: 0;
  animation: lsFadeUp .5s .1s cubic-bezier(.22,1,.36,1) both;
}
.ls-desc {
  font-size: 13px; color: #6b7280; margin: 0; line-height: 1.55;
  animation: lsFadeUp .5s .18s cubic-bezier(.22,1,.36,1) both;
}

/* ── Steps ── */
.ls-steps {
  width: 100%;
  background: rgba(255,255,255,.85);
  border: 1px solid rgba(99,102,241,.12);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex; flex-direction: column; gap: 8px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: lsFadeUp .5s .25s cubic-bezier(.22,1,.36,1) both;
}
.ls-step {
  display: flex; align-items: center; gap: 10px;
  animation: lsStepIn .4s cubic-bezier(.22,1,.36,1) both;
}
.ls-step:nth-child(1) { animation-delay: .32s; }
.ls-step:nth-child(2) { animation-delay: .46s; }
.ls-step:nth-child(3) { animation-delay: .60s; }
.ls-step:nth-child(4) { animation-delay: .74s; }

.ls-step-icon {
  width: 28px; height: 28px; border-radius: 8px;
  display: grid; place-items: center; flex-shrink: 0;
  font-size: 13px;
  transition: background .28s ease, border-color .28s ease, color .28s ease;
}
.ls-step-icon.pending {
  background: rgba(99,102,241,.07);
  border: 1px solid rgba(99,102,241,.14);
  color: rgba(99,102,241,.35);
}
.ls-step-icon.active {
  background: rgba(99,102,241,.12);
  border: 1px solid rgba(99,102,241,.28);
  color: #4f46e5;
}
.ls-step-icon.done {
  background: rgba(16,185,129,.10);
  border: 1px solid rgba(16,185,129,.25);
  color: #059669;
}

.ls-step-text { flex: 1; min-width: 0; }
.ls-step-label {
  font-size: 12.5px; font-weight: 600; color: #374151;
  display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color .28s ease;
}
.ls-step-label.active { color: #4338ca; }
.ls-step-label.done   { color: #9ca3af; }
.ls-step-sub {
  font-size: 11px; color: #9ca3af; display: block; margin-top: 1px;
  transition: color .28s ease;
}
.ls-step-sub.active { color: rgba(99,102,241,.7); }

/* ── Barra de progresso ── */
.ls-progress-wrap {
  width: 100%;
  animation: lsFadeUp .5s .35s cubic-bezier(.22,1,.36,1) both;
}
.ls-progress-bar {
  height: 4px; border-radius: 99px;
  background: rgba(99,102,241,.12);
  position: relative; overflow: hidden;
}
.ls-progress-fill {
  height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #4338ca, #6366f1, #818cf8);
  transition: width .12s linear;
}
.ls-shimmer {
  position: absolute; top: 0; bottom: 0; width: 40px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent);
  animation: lsShimmerSlide 2s ease-in-out infinite;
  animation-delay: .5s;
}
.ls-progress-meta {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 8px;
}
.ls-label-group { display: flex; align-items: center; gap: 6px; }
.ls-label {
  font-size: 11px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase; color: #6366f1;
}
.ls-dots { display: flex; gap: 3px; align-items: center; }
.ls-dot {
  width: 3px; height: 3px; border-radius: 50%; background: #6366f1;
  animation: lsDotBlink 1.2s ease-in-out infinite;
}
.ls-percent {
  font-size: 12px; font-weight: 700; color: #9ca3af;
  font-family: monospace; letter-spacing: .02em;
}
`

const GLITCH_CHARS = "!@#$%^&*<>[]{}|~"

function GlitchText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState(text)
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsGlitching(true)
      let frame = 0
      const totalFrames = 10

      const glitch = setInterval(() => {
        frame++
        setDisplayed(
          text
            .split("")
            .map((char, i) => {
              if (char === " ") return " "
              if (frame > totalFrames - 3) return text[i]
              return Math.random() > 0.75
                ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
                : char
            })
            .join("")
        )
        if (frame >= totalFrames) {
          clearInterval(glitch)
          setDisplayed(text)
          setIsGlitching(false)
        }
      }, 40)
    }, 4000)

    return () => clearInterval(interval)
  }, [text])

  return (
    <span
      style={{
        fontFamily: "'Sora', system-ui, sans-serif",
        letterSpacing: isGlitching ? "0.05em" : "normal",
        transition: "letter-spacing 0.1s ease",
      }}
    >
      {displayed}
    </span>
  )
}

const ERROR_CODE_CHARS = "0123456789ABCDEF"
function randomHex(len = 8) {
  return Array.from({ length: len }, () =>
    ERROR_CODE_CHARS[Math.floor(Math.random() * ERROR_CODE_CHARS.length)]
  ).join("")
}

function TerminalLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      style={{
        fontFamily: "'DM Mono', 'Fira Mono', monospace",
        fontSize: 11,
        color: "#64748b",
        lineHeight: "1.8",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      {children}
    </motion.div>
  )
}

export function ScreenErrorState({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry: () => void
}) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [errorCode] = useState(() => randomHex(8))
  const [timestamp] = useState(() => new Date().toISOString())
  const [retryCount, setRetryCount] = useState(0)

  async function handleRetry() {
    setIsRetrying(true)
    setRetryCount((c) => c + 1)
    await new Promise((r) => setTimeout(r, 1200))
    setIsRetrying(false)
    onRetry()
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        position: "relative",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {/* Subtle grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 50%, black 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2rem",
        }}
      >
        {/* Icon area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ position: "relative" }}
        >
          {/* Pulsing rings */}
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              style={{
                position: "absolute",
                inset: -12 - i * 14,
                borderRadius: "50%",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.7,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Icon container */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <motion.svg
              width={32}
              height={32}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(239,68,68,0.8)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ rotate: [0, -3, 3, -2, 2, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 4 }}
            >
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </motion.svg>

            {/* Corner dot */}
            <motion.div
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "rgb(239,68,68)",
              }}
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

        {/* Text block */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(1.25rem, 3vw, 1.6rem)",
              fontWeight: 700,
              fontFamily: "'Sora', system-ui, sans-serif",
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            <GlitchText text={title} />
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.7,
              color: "#64748b",
              maxWidth: 360,
            }}
          >
            {description}
          </p>
        </motion.div>

        {/* Terminal diagnostic card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: "100%",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Terminal header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
              paddingBottom: 10,
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", gap: 5 }}>
              {["#f87171", "#facc15", "#4ade80"].map((c) => (
                <div
                  key={c}
                  style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.7 }}
                />
              ))}
            </div>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "#94a3b8",
                marginLeft: 4,
              }}
            >
              error.log
            </span>
          </div>

          <TerminalLine delay={0.35}>
            <span style={{ color: "#94a3b8" }}>$</span>
            <span style={{ color: "#ef4444" }}>ERR</span>
            <span style={{ color: "#475569" }}>code=0x{errorCode}</span>
          </TerminalLine>
          <TerminalLine delay={0.45}>
            <span style={{ color: "#94a3b8" }}>$</span>
            <span style={{ color: "#6366f1" }}>TS</span>
            <span style={{ color: "#475569" }}>{timestamp.replace("T", " ").slice(0, 19)}</span>
          </TerminalLine>
          <TerminalLine delay={0.55}>
            <span style={{ color: "#94a3b8" }}>$</span>
            <span style={{ color: "#f59e0b" }}>RETRY</span>
            <span style={{ color: "#475569" }}>attempts={retryCount}</span>
          </TerminalLine>

          <motion.div
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#94a3b8",
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>$</span>
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 13,
                background: "#94a3b8",
                borderRadius: 1,
              }}
            />
          </motion.div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.5 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}
        >
          <motion.button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            whileHover={{ scale: isRetrying ? 1 : 1.03 }}
            whileTap={{ scale: isRetrying ? 1 : 0.97 }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 44,
              padding: "0 24px",
              borderRadius: 10,
              background: isRetrying
                ? "rgba(99,102,241,0.08)"
                : "rgba(99,102,241,1)",
              border: isRetrying
                ? "1px solid rgba(99,102,241,0.2)"
                : "1px solid transparent",
              color: isRetrying ? "rgba(99,102,241,0.8)" : "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: isRetrying ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.01em",
              minWidth: 180,
            }}
          >
            <AnimatePresence mode="wait">
              {isRetrying ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <motion.span
                    style={{
                      display: "inline-block",
                      width: 14,
                      height: 14,
                      border: "2px solid rgba(99,102,241,0.3)",
                      borderTopColor: "rgba(99,102,241,0.8)",
                      borderRadius: "50%",
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                  Reconectando…
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Tentar novamente
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
            Se o problema persistir, atualize a página.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function InlineNotice({ tone, message }: { tone: 'danger' | 'success'; message: string }) {
  const className =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${className}`}>{message}</div>
}

function ToastNotice({ tone, message }: AppToast) {
  const className =
    tone === 'error'
      ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-rose-950/10'
      : 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-emerald-950/10'

  return (
    <div className="fixed right-4 top-4 z-[2000] w-[min(420px,calc(100vw-32px))]">
      <div className={`rounded-xl border px-4 py-3 text-sm font-black shadow-xl ${className}`}>
        {message}
      </div>
    </div>
  )
}
