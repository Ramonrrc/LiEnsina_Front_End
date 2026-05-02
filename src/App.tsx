import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createClassRoom,
  createCalendarEvent,
  createEvaluation,
  createSchool,
  deleteCalendarEvent,
  loadBootstrap,
  login,
  updateCalendarEvent,
  updateClassRoom,
  updateProfile,
  updateRole,
  updateSchool,
  updateUserRole,
} from './api'
import { appName, navItems } from './data'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import LandingPage from './views/LandingPage'
import LoginView from './views/LoginView'
import DashboardView from './views/DashboardView'
import SchoolsView from './views/SchoolsView'
import ClassesView from './views/ClassesView'
import EvaluationsView from './views/EvaluationsView'
import CalendarView from './views/CalendarView'
import AccessView from './views/AccessView'
import SettingsView from './views/SettingsView'
import type { AppSection, BootstrapPayload } from './types'

const TOKEN_STORAGE_KEY = 'liensina.auth.token'

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

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))
  const [route, setRoute] = useState(getCurrentPath)
  const [payload, setPayload] = useState<BootstrapPayload | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [appError, setAppError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(token))
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    if (!token) {
      setPayload(null)
      setIsLoading(false)
      return
    }

    void refreshBootstrap(token)
  }, [token])

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

  async function refreshBootstrap(currentToken = token) {
    if (!currentToken) return
    setIsLoading(true)
    setAppError(null)

    try {
      const nextPayload = await loadBootstrap(currentToken)
      setPayload(nextPayload)
      if (!getSectionFromPath(window.location.pathname) || isLoginPath(window.location.pathname)) {
        navigateToSection('dashboard', 'replace')
      }
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Falha ao carregar dados do LiEnsina.')
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogin(credentials: { email: string; password: string }) {
    setIsSubmitting(true)
    setAuthError(null)

    try {
      const result = await login(credentials)
      localStorage.setItem(TOKEN_STORAGE_KEY, result.token)
      setToken(result.token)
      navigateToSection('dashboard', 'replace')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Nao foi possivel entrar.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setPayload(null)
    navigateToPath('/login', 'replace')
  }

  async function runAction(action: () => Promise<void>, successMessage: string) {
    if (!token) {
      setAppError('Sessao expirada. Entre novamente para continuar.')
      return
    }

    setAppError(null)
    try {
      await action()
      setToast(successMessage)
      window.setTimeout(() => setToast(null), 3200)
    } catch (error) {
      setAppError(error instanceof Error ? error.message : 'Nao foi possivel salvar a alteracao.')
    }
  }

  const userRole = useMemo(() => {
    if (!payload) return null
    return payload.roles.find((role) => role.id === payload.currentUser.roleId) ?? null
  }, [payload])

  const userInitials = useMemo(() => {
    if (!payload) return ''
    return payload.currentUser.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('')
  }, [payload])

  const activeSection = getSectionFromPath(route) ?? 'dashboard'
  const activeLabel = navItems.find((item) => item.id === activeSection)?.label ?? appName

  function handleSectionChange(section: AppSection) {
    navigateToSection(section)
    setMobileOpen(false)
  }

  if (!token && !isLoginPath(route)) return <LandingPage />

  if (!token) {
    return <LoginView errorMessage={authError} isSubmitting={isSubmitting} onSubmit={handleLogin} />
  }

  if (isLoading || !payload) {
    return (
      <FullScreenState
        title="Preparando o LiEnsina"
        description="Sincronizando escolas, turmas, cargos e indicadores pedagogicos."
      />
    )
  }

  const content: Record<AppSection, ReactNode> = {
    dashboard: <DashboardView dashboard={payload.dashboard} auditEvents={payload.auditEvents} evaluations={payload.evaluations} />,
    schools: (
      <SchoolsView
        schools={payload.schools}
        classes={payload.classes}
        students={payload.students}
        onCreate={(draft) => runAction(async () => {
          const created = await createSchool(token, draft)
          setPayload((current) => current ? { ...current, schools: [created, ...current.schools] } : current)
        }, 'Escola criada com sucesso.')}
        onUpdate={(id, draft) => runAction(async () => {
          const updated = await updateSchool(token, id, draft)
          setPayload((current) => current ? { ...current, schools: replaceById(current.schools, updated) } : current)
        }, 'Escola atualizada.')}
      />
    ),
    classes: (
      <ClassesView
        classes={payload.classes}
        schools={payload.schools}
        teachers={payload.teachers}
        students={payload.students}
        onCreate={(draft) => runAction(async () => {
          const created = await createClassRoom(token, draft)
          setPayload((current) => current ? { ...current, classes: [created, ...current.classes] } : current)
        }, 'Turma criada com sucesso.')}
        onUpdate={(id, draft) => runAction(async () => {
          const updated = await updateClassRoom(token, id, draft)
          setPayload((current) => current ? { ...current, classes: replaceById(current.classes, updated) } : current)
        }, 'Turma atualizada.')}
      />
    ),
    evaluations: (
      <EvaluationsView
        evaluations={payload.evaluations}
        classes={payload.classes}
        onCreate={(draft) => runAction(async () => {
          const created = await createEvaluation(token, draft)
          setPayload((current) => current ? { ...current, evaluations: [created, ...current.evaluations] } : current)
        }, 'Simulado criado.')}
      />
    ),
    calendar: (
      <CalendarView
        calendarEvents={payload.calendarEvents ?? []}
        schools={payload.schools}
        classes={payload.classes}
        evaluations={payload.evaluations}
        onCreate={(draft) => runAction(async () => {
          const created = await createCalendarEvent(token, draft)
          setPayload((current) => current ? { ...current, calendarEvents: [created, ...(current.calendarEvents ?? [])] } : current)
        }, 'Evento adicionado ao calendario.')}
        onUpdate={(id, draft) => runAction(async () => {
          const updated = await updateCalendarEvent(token, id, draft)
          setPayload((current) => current ? { ...current, calendarEvents: replaceById(current.calendarEvents ?? [], updated) } : current)
        }, 'Evento atualizado no calendario.')}
        onDelete={(id) => runAction(async () => {
          await deleteCalendarEvent(token, id)
          setPayload((current) => current ? { ...current, calendarEvents: removeById(current.calendarEvents ?? [], id) } : current)
        }, 'Evento removido do calendario.')}
      />
    ),
    access: (
      <AccessView
        roles={payload.roles}
        users={payload.users}
        schools={payload.schools}
        onUpdateRole={(id, draft) => runAction(async () => {
          const updated = await updateRole(token, id, draft)
          setPayload((current) => current ? { ...current, roles: replaceById(current.roles, updated) } : current)
        }, 'Cargo atualizado.')}
        onUpdateUserRole={(id, roleId) => runAction(async () => {
          const updated = await updateUserRole(token, id, { roleId })
          setPayload((current) => current ? {
            ...current,
            users: replaceById(current.users, updated),
            currentUser: current.currentUser.id === updated.id ? updated : current.currentUser,
          } : current)
        }, 'Cargo do usuario atualizado.')}
      />
    ),
    settings: (
      <SettingsView
        currentUser={payload.currentUser}
        role={userRole}
        onSave={(draft) => runAction(async () => {
          const updated = await updateProfile(token, draft)
          setPayload((current) => current ? {
            ...current,
            currentUser: updated,
            users: replaceById(current.users, updated),
          } : current)
        }, 'Perfil atualizado.')}
      />
    ),
  }

  return (
    <div className="relative flex min-h-screen">
      <Sidebar
        appName={appName}
        items={navItems}
        activeSection={activeSection}
        mobileOpen={mobileOpen}
        onSectionChange={handleSectionChange}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          activeLabel={activeLabel}
          mobileOpen={mobileOpen}
          userName={payload.currentUser.name}
          userRole={userRole?.name ?? 'Usuario'}
          avatarUrl={payload.currentUser.avatarUrl}
          initials={userInitials}
          alertCount={payload.dashboard.alerts.length}
          onOpenMenu={() => setMobileOpen((current) => !current)}
          onRefresh={() => void refreshBootstrap()}
          onOpenProfile={() => handleSectionChange('settings')}
          onLogout={handleLogout}
        />

        <main className="w-full min-w-0 bg-stone-50">
          {appError || toast ? (
            <div className="grid gap-3 px-4 pt-4 sm:px-6 lg:px-9">
              {appError ? <InlineNotice tone="danger" message={appError} /> : null}
              {toast ? <InlineNotice tone="success" message={toast} /> : null}
            </div>
          ) : null}
          {content[activeSection]}
        </main>
      </div>
    </div>
  )
}

function FullScreenState({ title, description }: { title: string; description: string }) {
  return (
    <div className="fullscreen-state">
      <img src="/liensina-logo.png" alt="LiEnsina" />
      <h1>{title}</h1>
      <p>{description}</p>
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
