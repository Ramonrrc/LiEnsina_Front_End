import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ApiError,
  createClassRoom,
  createGuardian,
  createCalendarEvent,
  createEvaluation,
  createQuestion,
  createMealItem,
  createSchool,
  createStudent,
  createTeacher,
  deleteCalendarEvent,
  deleteEvaluation,
  loadAccessScreen,
  loadCalendarScreen,
  loadDashboardScreen,
  loadEvaluationsScreen,
  loadMealsScreen,
  loadSchoolsScreen,
  loadSession,
  loadSettingsScreen,
  listMealManagementSchoolPage,
  login,
  logout as logoutSession,
  removeProfileAvatar,
  removeProfileBanner,
  resolveApiAssetUrl,
  refreshAccessToken,
  searchMealFoods,
  updateMealBudget,
  updateCalendarEvent,
  updateClassRoom,
  updateGuardian,
  updateProfile,
  updateRole,
  updateSchool,
  updateStudent,
  updateTeacher,
  updateUserRole,
  uploadProfileAvatar,
  uploadProfileBanner,
} from './api'
import { appName, navItems } from './data'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import LandingPage from './views/LandingPage'
import LoginView from './views/LoginView'
import type { AppSection, Question, ScreenPayloads, SessionPayload, UserAccount } from './types'

const ACCESS_TOKEN_REFRESH_INTERVAL_MS = 25 * 60 * 1000

let refreshAccessTokenRequest: ReturnType<typeof refreshAccessToken> | null = null

function refreshAccessTokenOnce() {
  refreshAccessTokenRequest ??= refreshAccessToken().finally(() => {
    refreshAccessTokenRequest = null
  })
  return refreshAccessTokenRequest
}

const DashboardView = lazy(() => import('./views/DashboardView'))
const SchoolsView = lazy(() => import('./views/SchoolsView'))
const EvaluationsView = lazy(() => import('./views/EvaluationsView'))
const CalendarView = lazy(() => import('./views/CalendarView'))
const MealsView = lazy(() => import('./views/MealsView'))
const AccessView = lazy(() => import('./views/AccessView'))
const SettingsView = lazy(() => import('./views/SettingsView'))

type ScreenCache = Partial<ScreenPayloads>
type ScreenFlags = Partial<Record<AppSection, boolean>>
type ScreenErrors = Partial<Record<AppSection, string>>
type AppToast = { tone: 'success' | 'error'; message: string }

function getSectionFromPath(pathname: string): AppSection | null {
  const route = pathname.replace(/^\/+/, '').replace(/\/+$/, '')
  const match = navItems.find((item) => item.id === route)
  return match?.id ?? null
}

function isLoginPath(pathname: string) {
  return pathname.replace(/\/+$/, '') === '/login'
}

function getCurrentPath() {
  return window.location.pathname || '/'
}

function replaceById<T extends { id: string }>(items: T[], updated: T) {
  return items.map((item) => (item.id === updated.id ? updated : item))
}

function removeById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id)
}

async function loadSectionPayload(section: AppSection, token: string) {
  switch (section) {
    case 'dashboard':
      return loadDashboardScreen(token)
    case 'schools':
      return loadSchoolsScreen(token)
    case 'evaluations':
      return loadEvaluationsScreen(token)
    case 'calendar':
      return loadCalendarScreen(token)
    case 'meals':
      return loadMealsScreen(token)
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

  const activeSection = getSectionFromPath(route) ?? 'dashboard'
  const activeLabel = navItems.find((item) => item.id === activeSection)?.label ?? appName

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
    if (screenData[activeSection] || screenLoading[activeSection] || screenErrors[activeSection]) return

    void loadScreen(activeSection, token)
  }, [activeSection, route, screenData, screenErrors, screenLoading, session, token])

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
      if (!getSectionFromPath(window.location.pathname) || isLoginPath(window.location.pathname)) {
        navigateToSection('dashboard', 'replace')
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
      const nextData = await loadSectionPayload(section, currentToken)
      setScreenData((current) => ({ ...current, [section]: nextData }))

      if (section === 'dashboard') {
        const dashboardData = nextData as ScreenPayloads['dashboard']
        setSession((current) => current ? { ...current, alertCount: dashboardData.dashboard.alerts.length } : current)
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

  function syncCurrentUser(updated: UserAccount) {
    setSession((current) => current ? { ...current, currentUser: updated } : current)
    updateScreenData('settings', (current) => ({ ...current, currentUser: updated }))
    updateScreenData('access', (current) => ({ ...current, users: replaceById(current.users, updated) }))
  }

  async function handleLogin(credentials: { email: string; password: string }) {
    setIsSubmitting(true)
    setAuthError(null)

    try {
      const result = await login(credentials)
      setScreenData({})
      setScreenErrors({})
      setToken(result.token)
      navigateToSection('dashboard', 'replace')
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

  const userRole = session?.currentRole ?? null

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
    navigateToSection(section)
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

        return <DashboardView dashboard={data.dashboard} auditEvents={data.auditEvents} evaluations={data.evaluations} />
      }

      case 'schools': {
        const data = screenData.schools
        if (!data) return renderMissingScreen('schools')

        return (
          <SchoolsView
            currentUser={session.currentUser}
            currentRole={userRole}
            schools={data.schools}
            classes={data.classes}
            students={data.students}
            teachers={data.teachers}
            guardians={data.guardians}
            onCreate={(draft) => runAction(async () => {
              const created = await createSchool(token, draft)
              updateScreenData('schools', (current) => ({ ...current, schools: [created, ...current.schools] }))
              invalidateScreens(['dashboard', 'access', 'calendar'])
            }, 'Escola criada com sucesso.')}
            onUpdate={(id, draft) => runAction(async () => {
              const updated = await updateSchool(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, schools: replaceById(current.schools, updated) }))
              invalidateScreens(['dashboard', 'access', 'calendar'])
            }, 'Escola atualizada.')}
            onCreateClass={(draft) => runAction(async () => {
              const created = await createClassRoom(token, draft)
              updateScreenData('schools', (current) => ({ ...current, classes: [created, ...current.classes] }))
              invalidateScreens(['dashboard', 'evaluations', 'calendar'])
            }, 'Turma criada com sucesso.')}
            onUpdateClass={(id, draft) => runAction(async () => {
              const updated = await updateClassRoom(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, classes: replaceById(current.classes, updated) }))
              invalidateScreens(['dashboard', 'evaluations', 'calendar'])
            }, 'Turma atualizada.')}
            onCreateTeacher={(draft) => runAction(async () => {
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
              invalidateScreens(['access', 'calendar'])
            }, 'Professor criado e vinculado.')}
            onUpdateTeacher={(id, draft) => runAction(async () => {
              const updated = await updateTeacher(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, teachers: replaceById(current.teachers, updated) }))
              invalidateScreens(['access', 'calendar'])
            }, 'Professor atualizado.')}
            onCreateStudent={(draft) => runAction(async () => {
              const created = await createStudent(token, draft)
              updateScreenData('schools', (current) => ({
                ...current,
                students: [created, ...current.students],
                guardians: current.guardians.map((guardian) => created.guardianIds.includes(guardian.id)
                  ? { ...guardian, studentIds: Array.from(new Set([...guardian.studentIds, created.id])) }
                  : guardian),
              }))
              invalidateScreens(['dashboard', 'access'])
            }, 'Aluno criado e vinculado.')}
            onUpdateStudent={(id, draft) => runAction(async () => {
              const updated = await updateStudent(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, students: replaceById(current.students, updated) }))
              invalidateScreens(['dashboard', 'access'])
            }, 'Aluno atualizado.')}
            onCreateGuardian={(draft) => runAction(async () => {
              const created = await createGuardian(token, draft)
              updateScreenData('schools', (current) => ({
                ...current,
                guardians: [created, ...current.guardians],
                students: current.students.map((student) => created.studentIds.includes(student.id)
                  ? { ...student, guardianIds: Array.from(new Set([...student.guardianIds, created.id])) }
                  : student),
              }))
              invalidateScreens(['access'])
            }, 'Responsavel criado e vinculado.')}
            onUpdateGuardian={(id, draft) => runAction(async () => {
              const updated = await updateGuardian(token, id, draft)
              updateScreenData('schools', (current) => ({ ...current, guardians: replaceById(current.guardians, updated) }))
              invalidateScreens(['access'])
            }, 'Responsavel atualizado.')}
          />
        )
      }

      case 'evaluations': {
        const data = screenData.evaluations
        if (!data) return renderMissingScreen('evaluations')

        return (
          <EvaluationsView
            evaluations={data.evaluations}
            classes={data.classes}
            curriculumSkills={data.curriculumSkills ?? []}
            assessmentDescriptors={data.assessmentDescriptors ?? []}
            questionBank={data.questionBank ?? []}
            questionImportPlans={data.questionImportPlans ?? []}
            onCreate={(draft) => runAction(async () => {
              const created = await createEvaluation(token, draft)
              const createdWithBlueprint = {
                ...created,
                buildMode: created.buildMode ?? draft.buildMode,
                questionIds: created.questionIds ?? draft.questionIds,
                skillCodes: created.skillCodes ?? draft.skillCodes,
                descriptorCodes: created.descriptorCodes ?? draft.descriptorCodes,
                sourceSummary: created.sourceSummary ?? draft.sourceSummary,
              }
              updateScreenData('evaluations', (current) => ({ ...current, evaluations: [createdWithBlueprint, ...current.evaluations] }))
              invalidateScreens(['dashboard', 'calendar'])
            }, 'Prova criada.')}
            onDelete={(id) => runAction(async () => {
              await deleteEvaluation(token, id)
              updateScreenData('evaluations', (current) => ({ ...current, evaluations: removeById(current.evaluations, id) }))
              invalidateScreens(['dashboard', 'calendar'])
            }, 'Prova excluida.')}
            onCreateQuestion={async (draft) => {
              let createdQuestion: Question | undefined
              await runAction(async () => {
                createdQuestion = await createQuestion(token, draft)
                updateScreenData('evaluations', (current) => ({
                  ...current,
                  questionBank: [createdQuestion as Question, ...(current.questionBank ?? [])],
                }))
              }, 'Questao salva no banco.')

              if (!createdQuestion) throw new Error('A API nao retornou a questao criada.')
              return createdQuestion
            }}
          />
        )
      }

      case 'calendar': {
        const data = screenData.calendar
        if (!data) return renderMissingScreen('calendar')

        return (
          <CalendarView
            currentUser={session.currentUser}
            currentRole={userRole}
            calendarEvents={data.calendarEvents}
            schools={data.schools}
            classes={data.classes}
            evaluations={data.evaluations}
            onCreate={(draft) => runAction(async () => {
              const created = await createCalendarEvent(token, draft)
              updateScreenData('calendar', (current) => ({ ...current, calendarEvents: [created, ...current.calendarEvents] }))
              void loadScreen('calendar', token)
            }, 'Evento adicionado ao calendario.')}
            onUpdate={(id, draft) => runAction(async () => {
              const updated = await updateCalendarEvent(token, id, draft)
              updateScreenData('calendar', (current) => ({ ...current, calendarEvents: replaceById(current.calendarEvents, updated) }))
              void loadScreen('calendar', token)
            }, 'Evento atualizado no calendario.')}
            onDelete={(id) => runAction(async () => {
              await deleteCalendarEvent(token, id)
              updateScreenData('calendar', (current) => ({ ...current, calendarEvents: removeById(current.calendarEvents, id) }))
              void loadScreen('calendar', token)
            }, 'Evento removido do calendario.')}
          />
        )
      }

      case 'meals': {
        const data = screenData.meals
        if (!data) return renderMissingScreen('meals')

        return (
          <MealsView
            currentRole={userRole}
            schools={data.schools}
            mealManagements={data.mealManagements}
            onLoadSchoolPage={(page, limit) => listMealManagementSchoolPage(token, page, limit)}
            onSearchFoods={(query, limit) => searchMealFoods(token, query, limit)}
            onCreateItem={(managementId, draft) => runAction(async () => {
              const updated = await createMealItem(token, managementId, draft)
              updateScreenData('meals', (current) => ({
                ...current,
                mealManagements: replaceById(current.mealManagements, updated),
              }))
            }, 'Item adicionado ao estoque da merenda.')}
            onUpdateBudget={(managementId, draft) => runAction(async () => {
              const updated = await updateMealBudget(token, managementId, draft)
              updateScreenData('meals', (current) => ({
                ...current,
                mealManagements: replaceById(current.mealManagements, updated),
              }))
            }, 'Orcamento atualizado.')}
          />
        )
      }

      case 'access': {
        const data = screenData.access
        if (!data) return renderMissingScreen('access')

        return (
          <AccessView
            roles={data.roles}
            users={data.users}
            schools={data.schools}
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
          />
        )
      }

      case 'settings': {
        const data = screenData.settings
        if (!data) return renderMissingScreen('settings')

        return (
          <SettingsView
            currentUser={data.currentUser}
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

  if (!token && !isLoginPath(route)) return <LandingPage />

  if (!token) {
    return <LoginView errorMessage={authError} isSubmitting={isSubmitting} onSubmit={handleLogin} />
  }

  if (isSessionLoading || !session) {
    return (
      <FullScreenState
        title="Preparando o LiEnsina"
        description="Validando sessao e carregando seu perfil."
      />
    )
  }

  return (
    <div className="relative flex min-h-screen font-['DM_Sans'] text-slate-900">
      <Sidebar
        appName={appName}
        items={navItems}
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
          alertCount={screenData.dashboard?.dashboard.alerts.length ?? session.alertCount}
          onOpenMenu={() => setMobileOpen((current) => !current)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
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
