import type {
  AccessScreenPayload,
  CalendarScreenPayload,
  ClassRoom,
  CreateQuestionRequest,
  CreateMealFoodPayload,
  CreateMealItemPayload,
  CreateMealManagementPayload,
  DashboardScreenPayload,
  Evaluation,
  EvaluationsScreenPayload,
  Guardian,
  MealFood,
  MealManagement,
  MealManagementsPagePayload,
  MealsScreenPayload,
  Question,
  Role,
  School,
  SchoolCalendarEvent,
  SchoolsScreenPayload,
  SessionPayload,
  SettingsScreenPayload,
  Student,
  Teacher,
  UpdateMealBudgetPayload,
  UpsertMealMenuPayload,
  UserAccount,
} from './types'

const configuredApiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function isLoopbackHost(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}

function isPrivateIpv4Host(hostname: string) {
  const parts = hostname.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false

  const [first, second] = parts
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)
}

function isLocalBrowserHost(hostname: string) {
  return isLoopbackHost(hostname) || isPrivateIpv4Host(hostname)
}

function resolveApiBaseUrl(value: string) {
  const normalizedValue = value.replace(/\/+$/, '')
  if (typeof window === 'undefined' || normalizedValue.startsWith('/')) return normalizedValue

  try {
    const url = new URL(normalizedValue)
    const currentHost = window.location.hostname

    if (isLoopbackHost(url.hostname) && isLocalBrowserHost(currentHost) && url.hostname !== currentHost) {
      url.hostname = currentHost
    }

    return url.toString().replace(/\/+$/, '')
  } catch {
    return normalizedValue
  }
}

const API_BASE_URL = resolveApiBaseUrl(configuredApiBaseUrl)

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  token?: string | null
  body?: unknown
}

type AuthResponse = {
  token: string
  expiresIn: number
  expiresAt: string
  user: UserAccount
}

export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: HeadersInit = { Accept: 'application/json' }

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const payload = (await response.json().catch(() => null)) as { message?: string } | null

  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'Nao foi possivel conversar com a API.', response.status)
  }

  return payload as T
}

async function apiFormRequest<T>(path: string, options: { method?: 'POST' | 'PATCH'; token?: string | null; body: FormData }): Promise<T> {
  const headers: HeadersInit = { Accept: 'application/json' }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'POST',
    headers,
    credentials: 'include',
    body: options.body,
  })
  const payload = (await response.json().catch(() => null)) as { message?: string } | null

  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'Nao foi possivel enviar o arquivo para a API.', response.status)
  }

  return payload as T
}

export function resolveApiAssetUrl(value?: string | null, version?: string | number | null) {
  if (!value) return undefined
  if (/^(data:|blob:)/i.test(value)) return value

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/i, '')
  const resolved = /^https?:/i.test(value) ? value : `${apiOrigin}${value.startsWith('/') ? value : `/${value}`}`

  if (!version) return resolved

  return `${resolved}${resolved.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(version))}`
}

export async function login(credentials: { email: string; password: string }) {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: credentials })
}

export async function refreshAccessToken() {
  return apiRequest<AuthResponse>('/auth/refresh', { method: 'POST' })
}

export async function logout() {
  return apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST' })
}

export async function loadSession(token: string) {
  return apiRequest<SessionPayload>('/session', { token })
}

export async function loadDashboardScreen(token: string) {
  return apiRequest<DashboardScreenPayload>('/screens/dashboard', { token })
}

export async function loadSchoolsScreen(token: string) {
  return apiRequest<SchoolsScreenPayload>('/screens/schools', { token })
}

export async function loadEvaluationsScreen(token: string) {
  return apiRequest<EvaluationsScreenPayload>('/screens/evaluations', { token })
}

export async function loadCalendarScreen(token: string) {
  return apiRequest<CalendarScreenPayload>('/screens/calendar', { token })
}

export async function loadMealsScreen(token: string) {
  return apiRequest<MealsScreenPayload>('/screens/meals', { token })
}

export async function listMealManagements(token: string) {
  return apiRequest<MealsScreenPayload>('/meal-managements', { token })
}

export async function listMealManagementSchoolPage(token: string, page = 1, limit = 5) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  return apiRequest<MealManagementsPagePayload>(`/meal-managements/school-page?${params.toString()}`, { token })
}

export async function searchMealFoods(token: string, search: string, limit = 5) {
  const params = new URLSearchParams({
    search,
    limit: String(limit),
  })
  return apiRequest<MealFood[]>(`/meal-foods?${params.toString()}`, { token })
}

export async function loadAccessScreen(token: string) {
  return apiRequest<AccessScreenPayload>('/screens/access', { token })
}

export async function loadSettingsScreen(token: string) {
  return apiRequest<SettingsScreenPayload>('/screens/settings', { token })
}

export async function createSchool(token: string, payload: Partial<School>) {
  return apiRequest<School>('/schools', { method: 'POST', token, body: payload })
}

export async function updateSchool(token: string, id: string, payload: Partial<School>) {
  return apiRequest<School>(`/schools/${id}`, { method: 'PATCH', token, body: payload })
}

export async function createClassRoom(token: string, payload: Partial<ClassRoom>) {
  return apiRequest<ClassRoom>('/classes', { method: 'POST', token, body: payload })
}

export async function updateClassRoom(token: string, id: string, payload: Partial<ClassRoom>) {
  return apiRequest<ClassRoom>(`/classes/${id}`, { method: 'PATCH', token, body: payload })
}

export async function createTeacher(token: string, payload: Partial<Teacher> & { classId?: string; password?: string; phone?: string }) {
  return apiRequest<Teacher>('/teachers', { method: 'POST', token, body: payload })
}

export async function updateTeacher(token: string, id: string, payload: Partial<Teacher> & { classId?: string }) {
  return apiRequest<Teacher>(`/teachers/${id}`, { method: 'PATCH', token, body: payload })
}

export async function createStudent(token: string, payload: Partial<Student> & { password?: string }) {
  return apiRequest<Student>('/students', { method: 'POST', token, body: payload })
}

export async function updateStudent(token: string, id: string, payload: Partial<Student>) {
  return apiRequest<Student>(`/students/${id}`, { method: 'PATCH', token, body: payload })
}

export async function createGuardian(token: string, payload: Partial<Guardian> & { password?: string }) {
  return apiRequest<Guardian>('/guardians', { method: 'POST', token, body: payload })
}

export async function updateGuardian(token: string, id: string, payload: Partial<Guardian>) {
  return apiRequest<Guardian>(`/guardians/${id}`, { method: 'PATCH', token, body: payload })
}

export async function createEvaluation(token: string, payload: Partial<Evaluation>) {
  return apiRequest<Evaluation>('/evaluations', { method: 'POST', token, body: payload })
}

export async function deleteEvaluation(token: string, id: string) {
  return apiRequest<{ success: boolean }>(`/evaluations/${id}`, { method: 'DELETE', token })
}

export async function createQuestion(token: string, payload: CreateQuestionRequest) {
  return apiRequest<Question>('/questions', { method: 'POST', token, body: payload })
}

export async function createMealItem(token: string, managementId: string, payload: CreateMealItemPayload) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/items`, { method: 'POST', token, body: payload })
}

export async function createMealManagement(token: string, payload: CreateMealManagementPayload) {
  return apiRequest<MealManagement>('/meal-managements', { method: 'POST', token, body: payload })
}

export async function updateMealBudget(token: string, managementId: string, payload: UpdateMealBudgetPayload) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/budget`, { method: 'PATCH', token, body: payload })
}

export async function createMealFood(token: string, managementId: string, payload: CreateMealFoodPayload) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/foods`, { method: 'POST', token, body: payload })
}

export async function createMealMenu(token: string, managementId: string, payload: UpsertMealMenuPayload) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/menus`, { method: 'POST', token, body: payload })
}

export async function updateMealMenu(token: string, managementId: string, menuId: string, payload: Partial<UpsertMealMenuPayload>) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/menus/${menuId}`, { method: 'PATCH', token, body: payload })
}

export async function deleteMealMenu(token: string, managementId: string, menuId: string) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/menus/${menuId}`, { method: 'DELETE', token })
}

export async function createCalendarEvent(token: string, payload: Partial<SchoolCalendarEvent>) {
  return apiRequest<SchoolCalendarEvent>('/calendar-events', { method: 'POST', token, body: payload })
}

export async function updateCalendarEvent(token: string, id: string, payload: Partial<SchoolCalendarEvent>) {
  return apiRequest<SchoolCalendarEvent>(`/calendar-events/${id}`, { method: 'PATCH', token, body: payload })
}

export async function deleteCalendarEvent(token: string, id: string) {
  return apiRequest<{ success: boolean }>(`/calendar-events/${id}`, { method: 'DELETE', token })
}

export async function updateRole(token: string, id: string, payload: Partial<Role>) {
  return apiRequest<Role>(`/roles/${id}`, { method: 'PATCH', token, body: payload })
}

export async function updateUserRole(token: string, id: string, payload: { roleId: string }) {
  return apiRequest<UserAccount>(`/users/${id}/role`, { method: 'PATCH', token, body: payload })
}

export async function updateProfile(token: string, payload: Partial<UserAccount>) {
  return apiRequest<UserAccount>('/profile', { method: 'PATCH', token, body: payload })
}

export async function removeProfileAvatar(token: string) {
  return apiRequest<UserAccount>('/profile/avatar', { method: 'DELETE', token })
}

export async function removeProfileBanner(token: string) {
  return apiRequest<UserAccount>('/profile/banner', { method: 'DELETE', token })
}

export async function uploadProfileAvatar(token: string, file: File) {
  const formData = new FormData()
  formData.append('avatar', file)
  return apiFormRequest<UserAccount>('/profile/avatar', { method: 'PATCH', token, body: formData })
}

export async function uploadProfileBanner(token: string, file: File) {
  const formData = new FormData()
  formData.append('banner', file)
  return apiFormRequest<UserAccount>('/profile/banner', { method: 'PATCH', token, body: formData })
}
