import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ApiError,
  addMealFoodRequestToStock,
  createClassRoom,
  createGuardian,
  createCalendarEvent,
  createEvaluation,
  createLessonRecord,
  createQuestion,
  generateQuestionSelection,
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
  loadAccessScreen,
  loadCalendarScreen,
  loadDashboardScreen,
  loadEvaluationsScreen,
  loadMealsScreen,
  loadNotificationsScreen,
  loadSchoolsScreen,
  loadSession,
  loadSettingsScreen,
  listMealManagements,
  listRoomReservations,
  searchAccessUsers,
  listStudentsPage,
  listTeachersPage,
  listMealManagementSchoolPage,
  login,
  logout as logoutSession,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  processEvaluationOmr,
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
import type {
  AppSection,
  CalendarScreenPayload,
  DashboardAlertsPagePayload,
  EvaluationCorrection,
  EvaluationsScreenPayload,
  GenerateQuestionSelectionRequest,
  GenerateQuestionSelectionResponse,
  MealManagement,
  MealManagementsPagePayload,
  MealsScreenPayload,
  NotificationsScreenPayload,
  PedagogyScreenPayload,
  Question,
  LessonRecord,
  Role,
  RoleCode,
  RoomReservation,
  ClassRoom,
  School,
  SchoolsScreenPayload,
  ScreenPayloads,
  SessionPayload,
  Teacher,
  UserAccount,
} from './types'

const ACCESS_TOKEN_REFRESH_INTERVAL_MS = 25 * 60 * 1000

let refreshAccessTokenRequest: ReturnType<typeof refreshAccessToken> | null = null

function refreshAccessTokenOnce() {
  refreshAccessTokenRequest ??= refreshAccessToken().finally(() => {
    refreshAccessTokenRequest = null
  })
  return refreshAccessTokenRequest
}

function normalizeQuestionSelectionText(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function questionMatchesSelectionSubject(question: Question, subject: string) {
  const target = normalizeQuestionSelectionText(subject)
  if (!target) return true
  const source = normalizeQuestionSelectionText([
    question.subject,
    question.component,
    question.area,
    question.title,
    question.statement,
    question.context,
  ].join(' '))

  return source.includes(target) || target.includes(normalizeQuestionSelectionText(question.subject))
}

function shuffleSelectionQuestions(questions: Question[]) {
  const shuffled = [...questions]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function buildLocalQuestionSelection(
  questionBank: Question[],
  request: GenerateQuestionSelectionRequest,
): GenerateQuestionSelectionResponse {
  const eligible = questionBank.filter((question) => {
    if (request.sourceMode === 'enem' && question.sourceType !== 'INEP_ENEM') return false
    if (request.sourceMode === 'system' && question.sourceType === 'INEP_ENEM') return false
    if (question.status !== 'APPROVED') return false
    if (!questionMatchesSelectionSubject(question, request.subject)) return false
    if (request.gradeLevel && question.gradeLevel !== request.gradeLevel) return false
    if (request.difficulty && question.difficulty !== request.difficulty) return false
    if (request.skillCode && !question.skills.some((skill) => skill.code === request.skillCode)) return false
    if (request.descriptorCode && !question.descriptors.some((descriptor) => descriptor.code === request.descriptorCode)) return false
    return true
  })

  const quantity = Math.max(1, Number(request.quantity || 1))
  const questions = request.sourceMode === 'mixed'
    ? [
        ...shuffleSelectionQuestions(eligible.filter((question) => question.sourceType === 'INEP_ENEM')).slice(0, Math.ceil(quantity / 2)),
        ...shuffleSelectionQuestions(eligible.filter((question) => question.sourceType !== 'INEP_ENEM')).slice(0, Math.floor(quantity / 2)),
      ].slice(0, quantity)
    : shuffleSelectionQuestions(eligible).slice(0, quantity)

  const completedSelection = questions.length >= quantity
    ? questions
    : [
        ...questions,
        ...shuffleSelectionQuestions(eligible.filter((question) => !questions.some((selected) => selected.id === question.id))).slice(0, quantity - questions.length),
      ]

  return {
    questions: completedSelection,
    questionIds: completedSelection.map((question) => question.id),
    totalEligible: eligible.length,
  }
}

const DashboardView = lazy(() => import('./views/DashboardView'))
const SchoolsView = lazy(() => import('./views/SchoolsView'))
const ClassesView = lazy(() => import('./views/ClassesView'))
const PeopleView = lazy(() => import('./views/PeopleView'))
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

const adminSections: AppSection[] = ['dashboard', 'schools', 'people', 'evaluations', 'evaluation-corrections', 'meals', 'access', 'notifications', 'settings']
const directorSections: AppSection[] = ['dashboard', 'schools', 'people', 'evaluation-corrections', 'meals', 'notifications', 'settings']
const coordinatorSections: AppSection[] = ['pedagogy', 'evaluations', 'evaluation-corrections', 'calendar', 'notifications', 'settings']
const teacherSections: AppSection[] = ['teacher-subjects', 'room-reservations', 'evaluations', 'evaluation-corrections', 'calendar', 'notifications', 'settings']
const studentSections: AppSection[] = ['student-performance', 'calendar', 'notifications', 'settings']
const guardianSections: AppSection[] = ['child-performance', 'child-attendance', 'calendar', 'notifications', 'settings']
const nutritionistSections: AppSection[] = ['food-requests', 'meals', 'notifications', 'settings']
const hiddenSidebarSections: AppSection[] = ['notifications', 'child-attendance']
const schoolsPayloadSections: AppSection[] = [
  'schools',
  'classes',
  'people',
  'pedagogy',
  'teacher-subjects',
  'room-reservations',
  'lesson-records',
  'attendance-list',
  'student-performance',
  'student-attendance',
  'child-attendance',
  'child-performance',
]

const sectionLabels: Partial<Record<RoleProfile, Partial<Record<AppSection, Pick<NavigationItem, 'label' | 'description'>>>>> = {
  ADMIN: {
    dashboard: { label: 'Dashboard Geral', description: 'Rede, escolas e resultados' },
    meals: { label: 'Gestao Alimentar', description: 'Cardapios, estoque e orcamento da rede' },
    notifications: { label: 'Notificações', description: 'Alertas e comunicados' },
    settings: { label: 'Meu Perfil', description: 'Conta do administrador' },
  },
  DIRETOR: {
    dashboard: { label: 'Dashboard da Escola', description: 'Indicadores da unidade' },
    schools: { label: 'Escolas', description: 'Minha unidade escolar' },
    people: { label: 'Professores e Alunos', description: 'Equipe e estudantes' },
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
  ADMIN: ['ADMIN', 'ADMINISTRADOR', 'ADMINISTRADORA'],
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
  const tokens = normalizeRoleTokens(value)
  if (!tokens.length) return null

  for (const profile of ['ADMIN', 'DIRETOR', 'COORDENADOR', 'PROFESSOR', 'ALUNO', 'RESPONSAVEL', 'NUTRITIONIST'] as RoleProfile[]) {
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

function getRoleProfile(role: Role | null): RoleProfile {
  return getRoleProfileOrNull(role) ?? 'ADMIN'
}

function getSessionRoleProfile(session: SessionPayload | null): RoleProfile {
  if (!session) return 'ADMIN'
  const currentRoleMatchesUser = !session.currentRole?.id || !session.currentUser.roleId || session.currentRole.id === session.currentUser.roleId
  const currentRoleProfile = currentRoleMatchesUser ? getRoleProfileOrNull(session.currentRole) : null

  return matchRoleProfileFromText(session.currentUser.roleId)
    ?? currentRoleProfile
    ?? getLinkedUserProfile(session.currentUser)
    ?? getRoleProfileOrNull(session.currentRole)
    ?? 'ADMIN'
}

function getFallbackRole(profile: RoleProfile, role: Role | null): Role {
  return {
    id: role?.id ?? profile,
    code: profile,
    name: {
      ADMIN: 'Admin',
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

function resolveSessionRole(session: SessionPayload | null, profile: RoleProfile): Role | null {
  if (!session) return null
  const currentRoleMatchesUser = !session.currentRole?.id || !session.currentUser.roleId || session.currentRole.id === session.currentUser.roleId
  const currentProfile = getRoleProfileOrNull(session.currentRole)
  if (session.currentRole && currentRoleMatchesUser && currentProfile === profile) return session.currentRole

  return getFallbackRole(profile, session.currentRole)
}

function getSectionsForProfile(profile: RoleProfile) {
  if (profile === 'DIRETOR') return directorSections
  if (profile === 'COORDENADOR') return coordinatorSections
  if (profile === 'PROFESSOR') return teacherSections
  if (profile === 'ALUNO') return studentSections
  if (profile === 'RESPONSAVEL') return guardianSections
  if (profile === 'NUTRITIONIST') return nutritionistSections
  return adminSections
}

function getDefaultSectionForSession(session: SessionPayload | null) {
  return getSectionsForProfile(getSessionRoleProfile(session))[0] ?? 'dashboard'
}

function getSectionAliasForProfile(section: AppSection, profile: RoleProfile): AppSection {
  if (profile === 'COORDENADOR' && section === 'dashboard') return 'pedagogy'
  return section
}

function getNavItemsForProfile(profile: RoleProfile) {
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

function isAdminProfile(profile: RoleProfile) {
  return profile === 'ADMIN'
}

function isSchoolLeadership(profile: RoleProfile) {
  return profile === 'DIRETOR' || profile === 'COORDENADOR'
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
  const safeLimit = Math.max(1, limit)
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
  const safeLimit = [10, 25, 50, 100].includes(limit) ? limit : 10
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
    .split(/[,;|/]+|\s+-\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function teacherMatchesClassByDiscipline(teacher: Teacher, classRoom: ClassRoom) {
  const teacherTokens = splitAcademicTokens(teacher.specialty)
  const classTokens = (classRoom.bnccFocus ?? []).flatMap(splitAcademicTokens)
  if (!teacherTokens.length || !classTokens.length) return false

  return teacherTokens.some((teacherToken) => classTokens.some((classToken) => (
    teacherToken === classToken
    || teacherToken.includes(classToken)
    || classToken.includes(teacherToken)
  )))
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

async function loadSectionPayload(section: AppSection, token: string, profile: RoleProfile) {
  switch (section) {
    case 'dashboard':
      return loadDashboardScreen(token)
    case 'notifications':
      return loadNotificationsScreen(token)
    case 'pedagogy':
      return Promise.all([loadSchoolsScreen(token), loadEvaluationsScreen(token)]).then(([schoolsPayload, evaluationsPayload]) => ({
        ...schoolsPayload,
        evaluations: evaluationsPayload.evaluations,
        curriculumSkills: evaluationsPayload.curriculumSkills,
        assessmentDescriptors: evaluationsPayload.assessmentDescriptors,
        questionBank: evaluationsPayload.questionBank,
      }))
    case 'schools':
    case 'classes':
    case 'people':
    case 'teacher-subjects':
    case 'lesson-records':
    case 'attendance-list':
    case 'student-performance':
    case 'student-attendance':
    case 'child-attendance':
    case 'child-performance':
      return loadSchoolsScreen(token)
    case 'room-reservations':
      return Promise.all([loadSchoolsScreen(token), listRoomReservations(token)]).then(([schoolsPayload, roomReservations]) => ({
        ...schoolsPayload,
        roomReservations,
      }))
    case 'evaluations':
      return Promise.all([loadEvaluationsScreen(token), loadSchoolsScreen(token)]).then(([evaluationsPayload, schoolsPayload]) => ({
        ...evaluationsPayload,
        schools: schoolsPayload.schools,
        teachers: schoolsPayload.teachers,
        students: schoolsPayload.students,
      }))
    case 'evaluation-corrections':
      return Promise.all([loadEvaluationsScreen(token), loadSchoolsScreen(token)]).then(([evaluationsPayload, schoolsPayload]) => ({
        ...evaluationsPayload,
        schools: schoolsPayload.schools,
        teachers: schoolsPayload.teachers,
        students: schoolsPayload.students,
      }))
    case 'calendar':
      return Promise.all([loadCalendarScreen(token), loadSchoolsScreen(token)]).then(([calendarPayload, schoolsPayload]) => ({
        ...calendarPayload,
        scope: schoolsPayload,
      }))
    case 'meals':
    case 'food-requests': {
      const shouldLoadNetworkMeals = profile === 'ADMIN' || profile === 'NUTRITIONIST'
      const [mealsPayload, schoolsPayload, mealManagementsPayload] = await Promise.all([
        loadMealsScreen(token),
        loadSchoolsScreen(token),
        shouldLoadNetworkMeals ? listMealManagements(token).catch(() => null) : Promise.resolve(null),
      ])
      const mergedMeals = mergeMealsPayloads(mealsPayload, mealManagementsPayload)

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
  const [route, setRoute] = useState(getCurrentPath)
  const [session, setSession] = useState<SessionPayload | null>(null)
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
  const allowedSections = useMemo(() => getSectionsForProfile(roleProfile), [roleProfile])
  const visibleNavItems = useMemo(() => getNavItemsForProfile(roleProfile), [roleProfile])
  const fallbackSection = visibleNavItems[0]?.id ?? 'dashboard'
  const routeSection = getSectionFromPath(route)
  const requestedSection = routeSection ?? fallbackSection
  const requestedSectionAlias = getSectionAliasForProfile(requestedSection, roleProfile)
  const activeSection = allowedSections.includes(requestedSectionAlias) ? requestedSectionAlias : fallbackSection
  const activeLabel = visibleNavItems.find((item) => item.id === activeSection)?.label
    ?? navItems.find((item) => item.id === activeSection)?.label
    ?? appName

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
      } catch {
        if (cancelled) return
        setToken(null)
        setSession(null)
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

    const refreshTimer = window.setTimeout(() => {
      void renewAccessToken()
    }, ACCESS_TOKEN_REFRESH_INTERVAL_MS)

    return () => window.clearTimeout(refreshTimer)
  }, [token])

  useEffect(() => {
    if (!token || !session) return
    if (!getSectionFromPath(route) || isLoginPath(route)) return
    if (routeSection && requestedSection !== activeSection) {
      navigateToSection(fallbackSection, 'replace')
      return
    }
    if (screenData[activeSection] || screenLoading[activeSection] || screenErrors[activeSection]) return

    void loadScreen(activeSection, token)
  }, [activeSection, fallbackSection, requestedSection, route, routeSection, screenData, screenErrors, screenLoading, session, token])

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
    setSession(null)
    setScreenData({})
    setScreenErrors({})
    setScreenLoading({})
  }

  async function renewAccessToken() {
    try {
      const result = await refreshAccessTokenOnce()
      setToken(result.token)
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
      const nextSession = await loadSession(currentToken)
      setSession(nextSession)
      if ((!getSectionFromPath(window.location.pathname) || isLoginPath(window.location.pathname)) && !isLandingPath(window.location.pathname)) {
        navigateToSection(getDefaultSectionForSession(nextSession), 'replace')
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        const refreshedToken = await renewAccessToken()
        if (refreshedToken) return
      }

      setAppError(error instanceof Error ? error.message : 'Falha ao carregar sessao do LiEnsina.')
      clearAuthState()
    } finally {
      setIsSessionLoading(false)
    }
  }

  async function loadScreen(section: AppSection, currentToken = token) {
    if (!currentToken) return
    setScreenLoading((current) => ({ ...current, [section]: true }))
    setScreenErrors((current) => ({ ...current, [section]: undefined }))
    setAppError(null)

    try {
      const nextData = await loadSectionPayload(section, currentToken, roleProfile)
      setScreenData((current) => {
        if (section === 'calendar') {
          const calendarData = nextData as CalendarScreenPayload
          return calendarData.scope
            ? { ...current, schools: calendarData.scope, calendar: calendarData }
            : { ...current, calendar: calendarData }
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

      for (const section of schoolsPayloadSections) {
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
    if (!session || isAdminProfile(roleProfile)) return data

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
    const guardianIds = new Set(data.guardians
      .filter((guardian) => guardian.id === user.linkedGuardianId || guardian.userId === user.id)
      .map((guardian) => guardian.id))

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
        || linkedTeachers.some((teacher) => teacherMatchesClassByDiscipline(teacher, classRoom))
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
    if (!session || isAdminProfile(roleProfile)) return data

    const currentQuestionCreatorIds = new Set(
      [session.currentUser.id, session.currentUser.linkedTeacherId].filter((id): id is string => Boolean(id)),
    )
    const scopedSchools = screenData.schools ? getScopedSchoolsData(screenData.schools) : null
    const relatedSchoolIds = userRelatedSchoolIds(session.currentUser, data.schools ?? scopedSchools?.schools ?? [])
    const allowedSchoolIds = new Set(scopedSchools?.schools.map((school) => school.id) ?? Array.from(relatedSchoolIds))
    if (session.currentUser.schoolId) allowedSchoolIds.add(session.currentUser.schoolId)
    const allowedClassIdsFromSchools = new Set(scopedSchools?.classes.map((classRoom) => classRoom.id) ?? [])
    const allowedClasses = data.classes.filter((classRoom) => {
      if (roleProfile === 'PROFESSOR') {
        return classRoom.teacherId === session.currentUser.linkedTeacherId || (classRoom.teacherIds ?? []).includes(session.currentUser.linkedTeacherId ?? '')
      }

      if (allowedClassIdsFromSchools.size > 0) return allowedClassIdsFromSchools.has(classRoom.id)
      return allowedSchoolIds.has(classRoom.schoolId)
    })
    const allowedClassIds = new Set(allowedClasses.map((classRoom) => classRoom.id))

    const scopedEvaluations = data.evaluations.filter((evaluation) => allowedClassIds.has(evaluation.classId))
    const scopedEvaluationIds = new Set(scopedEvaluations.map((evaluation) => evaluation.id))
    const referencedQuestionIds = new Set(scopedEvaluations.flatMap((evaluation) => evaluation.questionIds ?? []))

    return {
      ...data,
      classes: allowedClasses,
      evaluations: scopedEvaluations,
      students: data.students?.filter((student) => allowedClassIds.has(student.classId)),
      evaluationCorrections: data.evaluationCorrections?.filter((correction) => scopedEvaluationIds.has(correction.evaluationId)),
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

  function getScopedPedagogyEvaluationData(data: PedagogyScreenPayload, scopedSchools: SchoolsScreenPayload) {
    if (!session || isAdminProfile(roleProfile)) {
      return {
        evaluations: data.evaluations,
        curriculumSkills: data.curriculumSkills ?? [],
        assessmentDescriptors: data.assessmentDescriptors ?? [],
        questionBank: data.questionBank ?? [],
      }
    }

    const allowedClassIds = new Set(scopedSchools.classes.map((classRoom) => classRoom.id))
    const allowedSchoolIds = new Set(scopedSchools.schools.map((school) => school.id))
    const currentQuestionCreatorIds = new Set(
      [session.currentUser.id, session.currentUser.linkedTeacherId].filter((id): id is string => Boolean(id)),
    )

    return {
      evaluations: data.evaluations.filter((evaluation) => allowedClassIds.has(evaluation.classId)),
      curriculumSkills: data.curriculumSkills ?? [],
      assessmentDescriptors: data.assessmentDescriptors ?? [],
      questionBank: (data.questionBank ?? []).filter((question) => {
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
    if (!session || isAdminProfile(roleProfile)) return data

    const scopeSource = data.scope ?? screenData.schools
    const scopedSchools = scopeSource ? getScopedSchoolsData(scopeSource) : null
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
    if (!session || isAdminProfile(roleProfile)) return data

    const notifications = data.notifications.filter((notification) => notification.userId === session.currentUser.id)
    return {
      notifications,
      unreadCount: notifications.filter((notification) => !notification.readAt).length,
      totalCount: notifications.length,
    }
  }

  function getScopedMealsData(data: MealsScreenPayload): MealsScreenPayload {
    if (!session || isAdminProfile(roleProfile) || roleProfile === 'NUTRITIONIST') return data

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

  async function runAction(action: () => Promise<void>, successMessage: string) {
    if (!token) {
      showToast({ tone: 'error', message: 'Sessao expirada. Entre novamente para continuar.' })
      return
    }

    setAppError(null)
    try {
      await action()
      showToast({ tone: 'success', message: successMessage })
    } catch (error) {
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
        description="Buscando apenas os dados necessarios para esta area."
      />
    )
  }

  function renderActiveScreen(): ReactNode {
    if (!token || !session) return null

    switch (activeSection) {
      case 'dashboard': {
        const data = screenData.dashboard
        if (!data) return renderMissingScreen('dashboard')

        return (
          <DashboardView
            dashboard={data.dashboard}
            auditEvents={data.auditEvents}
            evaluations={data.evaluations}
            profile={roleProfile}
            currentUser={session.currentUser}
            schools={screenData.schools ? getScopedSchoolsData(screenData.schools).schools : []}
            classes={screenData.schools ? getScopedSchoolsData(screenData.schools).classes : []}
            onLoadAlertsPage={async ({ page, limit }) => {
              const payload = await loadDashboardScreen(token, { page, limit })
              return payload.dashboard.alertsPagination
                ? { alerts: payload.dashboard.alerts, pagination: payload.dashboard.alertsPagination }
                : buildDashboardAlertsPagePayload(payload.dashboard.alerts, page, limit)
            }}
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
            classes={scopedData.classes}
            students={scopedData.students}
            teachers={scopedData.teachers}
            guardians={scopedData.guardians}
            assetVersion={profileAssetVersion}
            readOnly={!isAdminProfile(roleProfile)}
            onCreate={(draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const created = await createSchool(token, draft)
              updateScreenData('schools', (current) => ({ ...current, schools: [created, ...current.schools] }))
              invalidateScreens(['dashboard', 'access', 'calendar', 'pedagogy'])
            }, 'Escola criada com sucesso.') : blockUnauthorizedAction()}
            onUpdate={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateSchool(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, schools: replaceById(current.schools, updated) }))
              invalidateScreens(['dashboard', 'access', 'calendar', 'pedagogy'])
            }, 'Escola atualizada.') : blockUnauthorizedAction()}
            onCreateClass={(draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const created = await createClassRoom(token, draft)
              updateScreenData('schools', (current) => ({ ...current, classes: [created, ...current.classes] }))
              invalidateScreens(['dashboard', 'evaluations', 'calendar', 'pedagogy'])
            }, 'Turma criada com sucesso.') : blockUnauthorizedAction()}
            onUpdateClass={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateClassRoom(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, classes: replaceById(current.classes, updated) }))
              invalidateScreens(['dashboard', 'evaluations', 'calendar', 'pedagogy'])
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
              invalidateScreens(['access', 'calendar', 'pedagogy'])
            }, 'Professor criado e vinculado.') : blockUnauthorizedAction()}
            onUpdateTeacher={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateTeacher(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, teachers: replaceById(current.teachers, updated) }))
              invalidateScreens(['access', 'calendar', 'pedagogy'])
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
              invalidateScreens(['dashboard', 'access', 'pedagogy'])
            }, 'Aluno criado e vinculado.') : blockUnauthorizedAction()}
            onUpdateStudent={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateStudent(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, students: replaceById(current.students, updated) }))
              invalidateScreens(['dashboard', 'access', 'pedagogy'])
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
              invalidateScreens(['access'])
            }, 'Responsavel criado e vinculado.') : blockUnauthorizedAction()}
            onUpdateGuardian={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateGuardian(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, guardians: replaceById(current.guardians, updated) }))
              invalidateScreens(['access'])
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
              invalidateScreens(['dashboard', 'evaluations', 'calendar', 'pedagogy'])
            }, 'Turma criada com sucesso.') : blockUnauthorizedAction()}
            onUpdate={(id, draft) => isAdminProfile(roleProfile) ? runAction(async () => {
              const updated = await updateClassRoom(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, classes: replaceById(current.classes, updated) }))
              invalidateScreens(['dashboard', 'evaluations', 'calendar', 'pedagogy'])
            }, 'Turma atualizada.') : blockUnauthorizedAction()}
          />
        )
      }

      case 'people': {
        const data = screenData.people
        if (!data) return renderMissingScreen('people')
        const scopedData = getScopedSchoolsData(data)

        return (
          <PeopleView
            schoolsData={scopedData}
            currentUser={session.currentUser}
            currentRole={userRole}
            assetVersion={profileAssetVersion}
            onLoadTeachersPage={(params) => listTeachersPage(token, params)}
            onLoadStudentsPage={(params) => listStudentsPage(token, params)}
          />
        )
      }

      case 'pedagogy':
      case 'teacher-subjects':
      case 'room-reservations':
      case 'lesson-records':
      case 'attendance-list':
      case 'student-performance':
      case 'student-attendance':
      case 'child-attendance':
      case 'child-performance': {
        const data = screenData[activeSection]
        if (!data) return renderMissingScreen(activeSection)
        const scopedData = getScopedSchoolsData(data)
        const evaluationsData = activeSection === 'pedagogy'
          ? getScopedPedagogyEvaluationData(data as PedagogyScreenPayload, scopedData)
          : undefined

        return (
          <RolePortalView
            section={activeSection}
            profile={roleProfile}
            currentUser={session.currentUser}
            currentRole={userRole}
            schoolsData={scopedData}
            evaluationsData={evaluationsData}
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
          />
        )
      }

      case 'evaluations': {
        const data = screenData.evaluations
        if (!data) return renderMissingScreen('evaluations')
        const scopedData = getScopedEvaluationsData(data)
        const canManageEvaluations = roleProfile === 'ADMIN' || roleProfile === 'PROFESSOR'

        return (
          <EvaluationsView
            currentUser={session.currentUser}
            currentRole={userRole}
            evaluations={scopedData.evaluations}
            classes={scopedData.classes}
            teachers={scopedData.teachers ?? []}
            curriculumSkills={scopedData.curriculumSkills ?? []}
            assessmentDescriptors={scopedData.assessmentDescriptors ?? []}
            questionBank={scopedData.questionBank ?? []}
            questionImportPlans={scopedData.questionImportPlans ?? []}
            onCreate={(draft) => canManageEvaluations ? runAction(async () => {
              const created = await createEvaluation(token, draft)
              const createdWithBlueprint = {
                ...created,
                createdById: created.createdById ?? draft.createdById ?? session.currentUser.id,
                createdByName: created.createdByName ?? draft.createdByName ?? session.currentUser.name,
                buildMode: created.buildMode ?? draft.buildMode,
                questionIds: created.questionIds ?? draft.questionIds,
                questionSnapshots: created.questionSnapshots ?? draft.questionSnapshots,
                skillCodes: created.skillCodes ?? draft.skillCodes,
                descriptorCodes: created.descriptorCodes ?? draft.descriptorCodes,
                sourceSummary: created.sourceSummary ?? draft.sourceSummary,
              }
              updateScreenData('evaluations', (current) => ({ ...current, evaluations: [createdWithBlueprint, ...current.evaluations] }))
              invalidateScreens(['dashboard', 'calendar', 'pedagogy'])
            }, 'Prova criada.') : blockUnauthorizedAction('Seu perfil pode acompanhar provas, mas nao criar novas avaliacoes.')}
            onDelete={isAdminProfile(roleProfile) ? (id) => runAction(async () => {
              await deleteEvaluation(token, id)
              updateScreenData('evaluations', (current) => ({ ...current, evaluations: removeById(current.evaluations, id) }))
              invalidateScreens(['dashboard', 'calendar', 'pedagogy'])
            }, 'Prova excluida.') : undefined}
            onDownload={(id) => runAction(async () => {
              const file = await downloadEvaluationFile(token, id)
              saveDownloadedFile(file)
            }, 'Download da prova iniciado.')}
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

              try {
                return await generateQuestionSelection(token, draft)
              } catch (error) {
                if (error instanceof ApiError && error.statusCode === 404) {
                  return buildLocalQuestionSelection(scopedData.questionBank ?? [], draft)
                }

                throw error
              }
            }}
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

        return (
          <EvaluationCorrectionsView
            evaluations={scopedData.evaluations}
            classes={scopedData.classes}
            students={scopedData.students ?? []}
            corrections={scopedData.evaluationCorrections ?? []}
            onDownloadEvaluation={(id) => runAction(async () => {
              const file = await downloadEvaluationFile(token, id)
              saveDownloadedFile(file)
            }, 'Download da prova iniciado.')}
            onProcess={async (evaluationId, studentId, image) => {
              let processed: EvaluationCorrection | null = null
              await runAction(async () => {
                processed = await processEvaluationOmr(token, evaluationId, studentId, image)
                updateScreenData('evaluation-corrections', (current) => upsertCorrection(current, processed as EvaluationCorrection))
                updateScreenData('evaluations', (current) => upsertCorrection(current, processed as EvaluationCorrection))
                invalidateScreens(['dashboard', 'pedagogy'])
              }, 'Sugestao de correcao gerada.')
              if (!processed) throw new Error('A API nao retornou a sugestao de correcao.')
              return processed
            }}
            onReview={async (correctionId, payload) => {
              let reviewed: EvaluationCorrection | null = null
              await runAction(async () => {
                reviewed = await reviewEvaluationCorrection(token, correctionId, payload)
                updateScreenData('evaluation-corrections', (current) => upsertCorrection(current, reviewed as EvaluationCorrection))
                updateScreenData('evaluations', (current) => upsertCorrection(current, reviewed as EvaluationCorrection))
                invalidateScreens(['dashboard', 'pedagogy', 'evaluations'])
              }, 'Revisao da correcao salva.')
              if (!reviewed) throw new Error('A API nao retornou a correcao revisada.')
              return reviewed
            }}
          />
        )
      }

      case 'calendar': {
        const data = screenData.calendar
        if (!data) return renderMissingScreen('calendar')
        const scopedData = getScopedCalendarData(data)
        const canCreateCalendar = roleProfile === 'ADMIN' || roleProfile === 'PROFESSOR'
        const currentCalendarCreatorIds = new Set([
          session.currentUser.id,
          session.currentUser.linkedTeacherId,
          session.currentUser.linkedStudentId,
          session.currentUser.linkedGuardianId,
        ].filter((id): id is string => Boolean(id)))
        const canManageCalendarEvent = (id: string) => {
          if (roleProfile === 'ADMIN') return true
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
        const canManageMeals = roleProfile === 'ADMIN'
        const canCreateFoodRequest = roleProfile === 'DIRETOR'
        const canAddRequestToStock = roleProfile === 'ADMIN'

        return (
          <MealsView
            currentUser={session.currentUser}
            currentRole={userRole}
            schools={scopedData.schools}
            mealManagements={scopedData.mealManagements}
            foodRequests={scopedData.foodRequests ?? []}
            mealRequestHistory={scopedData.mealRequestHistory ?? []}
            onLoadSchoolPage={async (page: number, limit: number, search = ''): Promise<MealManagementsPagePayload> => {
              if (roleProfile !== 'ADMIN' && roleProfile !== 'NUTRITIONIST') {
                return buildMealManagementsPagePayload(scopedData, page, limit, search)
              }

              try {
                const payload = await listMealManagementSchoolPage(token, page, limit, search)
                if (payload.mealManagements.length > 0) return payload

                const fallbackData = scopedData.mealManagements.length > 0
                  ? scopedData
                  : normalizeMealsPayload(await listMealManagements(token).catch(() => null))

                if (fallbackData.mealManagements.length > 0) {
                  return buildMealManagementsPagePayload(fallbackData, page, limit, search)
                }

                return payload
              } catch (error) {
                const fallbackData = scopedData.mealManagements.length > 0
                  ? scopedData
                  : normalizeMealsPayload(await listMealManagements(token).catch(() => null))

                if (fallbackData.mealManagements.length > 0) {
                  return buildMealManagementsPagePayload(fallbackData, page, limit, search)
                }

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
        if (!isAdminProfile(roleProfile)) return <ScreenErrorState title="Acesso restrito" description="Apenas ADMIN pode gerenciar cargos e permissoes." onRetry={() => navigateToSection(fallbackSection, 'replace')} />

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
            onSave={(draft, avatarFile, bannerFile, visualAction) => runAction(async () => {
              let updated = { ...data.currentUser, ...(await updateProfile(token, draft)) }
              const nextAssetVersion = { avatar: 0, banner: 0 }

              if (visualAction?.removeAvatar) {
                updated = { ...updated, ...(await removeProfileAvatar(token)) }
                nextAssetVersion.avatar = Date.now()
              } else if (avatarFile) {
                updated = { ...updated, ...(await uploadProfileAvatar(token, avatarFile)) }
                nextAssetVersion.avatar = Date.now()
              }
              if (visualAction?.removeBanner) {
                updated = { ...updated, ...(await removeProfileBanner(token)) }
                nextAssetVersion.banner = Date.now()
              } else if (bannerFile) {
                updated = { ...updated, ...(await uploadProfileBanner(token, bannerFile)) }
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
        title="Preparando o LiEnsina"
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
        title="Preparando o LiEnsina"
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

function FullScreenState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-screen place-items-center content-center gap-3 p-6 text-center font-['DM_Sans']">
      <img className="w-[min(400px,82vw)]" src="/liensina-logo.png" alt="LiEnsina" />
      <h1 className="m-0 font-['Sora',system-ui,sans-serif] text-[clamp(1.8rem,5vw,3rem)] font-black text-slate-900">{title}</h1>
      <p className="m-0 text-slate-500">{description}</p>
    </div>
  )
}

function ScreenLoadingState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-[calc(100vh-80px)] place-items-center content-center gap-3 p-6 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
      <h2 className="m-0 font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">{title}</h2>
      <p className="m-0 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function ScreenErrorState({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-[calc(100vh-80px)] place-items-center content-center gap-3 p-6 text-center">
      <h2 className="m-0 font-['Sora',system-ui,sans-serif] text-xl font-black text-slate-900">{title}</h2>
      <p className="m-0 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex min-h-10 items-center justify-center rounded-sm bg-indigo-600 px-4 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
      >
        Tentar novamente
      </button>
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
