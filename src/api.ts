import type {
  AccessScreenPayload,
  AccessUserSearchQuery,
  AccessUserSearchPayload,
  AddMealFoodRequestToStockPayload,
  CalendarScreenPayload,
  ClassesPagePayload,
  ClassesPageQuery,
  ClassRoom,
  AssessmentDescriptor,
  CreateMealFoodRequestPayload,
  CreateLessonRecordPayload,
  CreateQuestionRequest,
  CurriculumSkill,
  CreateMealFoodPayload,
  CreateMealItemPayload,
  CreateMealManagementPayload,
  CreateRoomReservationPayload,
  DashboardAlertsPageQuery,
  DashboardFiltersQuery,
  DashboardScreenPayload,
  Evaluation,
  EvaluationAnswerCard,
  EvaluationCorrection,
  EvaluationCorrectionConfirmManyPayload,
  EvaluationCorrectionConfirmManyResponse,
  EvaluationCorrectionReviewPayload,
  CreateEvaluationApiResponse,
  EvaluationDownloadKind,
  EvaluationOmrBatchResponse,
  EvaluationsScreenPayload,
  GenerateQuestionSelectionRequest,
  GenerateQuestionSelectionResponse,
  Guardian,
  LessonRecord,
  MealFood,
  MealFoodRequest,
  MealManagement,
  MealManagementsPagePayload,
  MealsScreenPayload,
  MePermissionsPayload,
  NotificationsScreenPayload,
  Question,
  QuestionBankPagePayload,
  QuestionBankPageQuery,
  QuestionImportPlan,
  ReviewMealFoodRequestPayload,
  Role,
  RoomReservation,
  School,
  SchoolCalendarEvent,
  SchoolsPagePayload,
  SchoolsPageQuery,
  SchoolsScreenPayload,
  SessionPayload,
  SettingsScreenPayload,
  Student,
  StudentsPageQuery,
  StudentsPagePayload,
  TeacherSubjectCardsPagePayload,
  TeacherSubjectsPageQuery,
  Teacher,
  TeachersPageQuery,
  TeachersPagePayload,
  UpdateLessonRecordPayload,
  UpdateMealBudgetPayload,
  UpdateMealFoodRequestPayload,
  UpdateUserSchoolPayload,
  UpsertMealMenuPayload,
  UserAccount,
} from './types'
import { sanitizePublicErrorMessage } from './lib/safe-errors'
import { validateOmrBatchFiles, validateOmrFile, validateProfileImageFile } from './lib/file-security'
import { MAX_EVALUATION_QUESTIONS, evaluationQuestionLimitMessage } from './lib/evaluation-limits'

const configuredApiBaseUrl = import.meta.env.VITE_API_URL || '/api'

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

    if (url.hostname === 'localhost' && currentHost === 'localhost') {
      url.hostname = '127.0.0.1'
    } else if (isLoopbackHost(url.hostname) && isLocalBrowserHost(currentHost) && url.hostname !== currentHost) {
      url.hostname = currentHost
    }

    return url.toString().replace(/\/+$/, '')
  } catch {
    return normalizedValue
  }
}

const API_BASE_URL = resolveApiBaseUrl(configuredApiBaseUrl)
const configuredAssetOrigins = String(import.meta.env.VITE_ALLOWED_ASSET_ORIGINS ?? '')
  .split(',')
  .map((origin) => {
    const trimmed = origin.trim()
    if (!trimmed) return ''
    try {
      return new URL(trimmed).origin
    } catch {
      return trimmed.replace(/\/+$/, '')
    }
  })
  .filter(Boolean)

const MAX_API_DATA_IMAGE_BYTES = 512 * 1024
const safeDataImagePattern = /^data:image\/(png|jpe?g|webp);base64,/i
const previewImageContentTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const csrfHeader = { 'X-LiEnsina-CSRF': '1' }
const inFlightJsonRequests = new Map<string, Promise<unknown>>()
const jsonResponseCache = new Map<string, { expiresAt: number; payload: unknown }>()
const JSON_GET_CACHE_TTL_MS = 20_000

type ScopedResourceOptions = {
  networkScope?: boolean
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  token?: string | null
  body?: unknown
  headers?: HeadersInit
}

type AuthResponse = {
  token: string
  expiresIn: number
  expiresAt: string
  user: UserAccount
}

type PaginatedResponse<T, K extends string> = Record<K, T[]> & {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export const DEFAULT_API_PAGE_LIMIT = 25
export const MAX_API_PAGE_LIMIT = 100
const MAX_API_SEARCH_LENGTH = 120

export function clampApiPage(value?: number | string | boolean | null, fallback = 1) {
  const parsed = Math.trunc(Number(value ?? fallback))
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.max(1, parsed)
}

export function clampApiPageLimit(value?: number | string | boolean | null, fallback = DEFAULT_API_PAGE_LIMIT) {
  const parsed = Math.trunc(Number(value ?? fallback))
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(MAX_API_PAGE_LIMIT, Math.max(1, parsed))
}

export function sanitizeApiSearchParam(value?: string | null) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_API_SEARCH_LENGTH)
}

export function createIdempotencyKey(prefix = 'MeuEnsino') {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${randomPart}`
}

function scopedResourcePath(resource: string, options: ScopedResourceOptions = {}) {
  return options.networkScope ? `/${resource}` : `/me/${resource}`
}

function estimateBase64Bytes(value: string) {
  const base64 = value.split(',', 2)[1] ?? ''
  return Math.floor((base64.replace(/=+$/, '').length * 3) / 4)
}

function appendAssetVersion(value: string, version?: string | number | null) {
  if (!version) return value
  return `${value}${value.includes('?') ? '&' : '?'}v=${encodeURIComponent(String(version))}`
}

function allowedAbsoluteAssetOrigins() {
  const origins = new Set(configuredAssetOrigins)

  if (typeof window !== 'undefined') {
    origins.add(window.location.origin)
  }

  try {
    if (/^https?:/i.test(API_BASE_URL)) origins.add(new URL(API_BASE_URL).origin)
  } catch {
    // Invalid API base URLs are handled by resolveApiBaseUrl.
  }

  return origins
}

export function safeApiFilePreviewKind(contentType?: string | null): 'image' | 'pdf' | 'unknown' {
  const normalized = String(contentType ?? '').split(';')[0]?.trim().toLowerCase()
  if (normalized === 'application/pdf') return 'pdf'
  if (previewImageContentTypes.has(normalized)) return 'image'
  return 'unknown'
}

export function pickAllowedPayload<T extends object>(payload: T, allowedFields: readonly string[]) {
  const allowed = new Set(allowedFields)
  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).filter(([key, value]) => allowed.has(key) && value !== undefined),
  ) as Partial<T>
}

export class ApiError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

function clearJsonResponseCache(token?: string | null) {
  const prefix = `${token ?? 'anonymous'}:`
  for (const key of jsonResponseCache.keys()) {
    if (!token || key.startsWith(prefix)) jsonResponseCache.delete(key)
  }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...csrfHeader }
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => { headers[key] = value })
  } else if (Array.isArray(options.headers)) {
    for (const [key, value] of options.headers) headers[key] = value
  } else if (options.headers) {
    Object.assign(headers, options.headers)
  }

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const method = options.method ?? 'GET'
  const requestKey = method === 'GET' && options.body === undefined
    ? `${options.token ?? 'anonymous'}:${path}`
    : ''
  const cachedResponse = requestKey ? jsonResponseCache.get(requestKey) : null
  if (cachedResponse && cachedResponse.expiresAt > Date.now()) return cachedResponse.payload as T
  if (cachedResponse) jsonResponseCache.delete(requestKey)

  const pendingRequest = requestKey ? inFlightJsonRequests.get(requestKey) : null
  if (pendingRequest) return pendingRequest as Promise<T>

  const executeRequest = async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    const payload = (await response.json().catch(() => null)) as { message?: string } | null

    if (!response.ok) {
      throw new ApiError(
        sanitizePublicErrorMessage(payload?.message, response.status, 'Nao foi possivel conversar com a API.'),
        response.status,
      )
    }

    if (requestKey) {
      jsonResponseCache.set(requestKey, { expiresAt: Date.now() + JSON_GET_CACHE_TTL_MS, payload })
    } else if (method !== 'GET') {
      clearJsonResponseCache(options.token)
    }

    return payload as T
  }

  const request = executeRequest()
  if (requestKey) {
    inFlightJsonRequests.set(requestKey, request)
    request.then(
      () => inFlightJsonRequests.delete(requestKey),
      () => inFlightJsonRequests.delete(requestKey),
    )
  }
  return request
}

async function apiFormRequest<T>(
  path: string,
  options: { method?: 'POST' | 'PATCH'; token?: string | null; body: FormData; headers?: HeadersInit },
): Promise<T> {
  const headers: HeadersInit = { Accept: 'application/json', ...csrfHeader }
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => { (headers as Record<string, string>)[key] = value })
  } else if (Array.isArray(options.headers)) {
    for (const [key, value] of options.headers) (headers as Record<string, string>)[key] = value
  } else if (options.headers) {
    Object.assign(headers, options.headers)
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'POST',
    headers,
    credentials: 'include',
    cache: 'no-store',
    body: options.body,
  })
  const payload = (await response.json().catch(() => null)) as { message?: string } | null

  if (!response.ok) {
    throw new ApiError(
      sanitizePublicErrorMessage(payload?.message, response.status, 'Nao foi possivel enviar o arquivo para a API.'),
      response.status,
    )
  }

  clearJsonResponseCache(options.token)
  return payload as T
}

function sanitizeDownloadFilename(value?: string | null) {
  const filename = String(value ?? '').trim().split(/[\\/]/).pop()?.replace(/[\u0000-\u001F\u007F]/g, '') ?? ''
  return filename || null
}

function filenameFromContentDisposition(value: string | null) {
  if (!value) return null

  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try {
      return sanitizeDownloadFilename(decodeURIComponent(encoded))
    } catch {
      return sanitizeDownloadFilename(encoded)
    }
  }

  return sanitizeDownloadFilename(value.match(/filename="([^"]+)"/i)?.[1] ?? value.match(/filename=([^;]+)/i)?.[1])
}

export type ApiFileResponse = {
  blob: Blob
  filename: string
  contentType: string
}

async function apiFileRequest(path: string, options: { token?: string | null; filenameFallback: string; accept?: string }): Promise<ApiFileResponse> {
  const headers: HeadersInit = { Accept: options.accept ?? 'application/pdf', ...csrfHeader }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers,
    credentials: 'include',
    cache: 'no-store',
  })

  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    let message = 'Nao foi possivel baixar o arquivo.'
    try {
      message = JSON.parse(raw)?.message ?? message
    } catch {
      if (raw.trim()) message = raw.trim()
    }
    throw new ApiError(sanitizePublicErrorMessage(message, response.status, 'Nao foi possivel baixar o arquivo.'), response.status)
  }

  const blob = await response.blob()
  return {
    blob,
    filename: filenameFromContentDisposition(response.headers.get('Content-Disposition')) ?? options.filenameFallback,
    contentType: response.headers.get('Content-Type')?.split(';')[0]?.trim() || blob.type || 'application/octet-stream',
  }
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const serialized = query.toString()
  return serialized ? `?${serialized}` : ''
}

function normalizeResourceList<T, K extends string>(payload: PaginatedResponse<T, K> | T[], key: K): T[] {
  if (Array.isArray(payload)) return payload
  return Array.isArray(payload[key]) ? payload[key] : []
}

async function listResource<T, K extends string>(
  token: string,
  path: string,
  key: K,
  params: Record<string, string | number | boolean | null | undefined> = {},
) {
  const page = Math.max(1, Math.trunc(Number(params.page ?? 1)) || 1)
  const limit = clampApiPageLimit(params.limit)
  const payload = await apiRequest<PaginatedResponse<T, K> | T[]>(`${path}${buildQuery({ ...params, page, limit })}`, { token })
  return normalizeResourceList(payload, key)
}

async function listAllResource<T, K extends string>(
  token: string,
  path: string,
  key: K,
  params: Record<string, string | number | boolean | null | undefined> = {},
) {
  const limit = clampApiPageLimit(params.limit ?? MAX_API_PAGE_LIMIT, MAX_API_PAGE_LIMIT)
  let page = clampApiPage(params.page, 1)
  const items: T[] = []

  for (let guard = 0; guard < 1000; guard += 1) {
    const payload = await apiRequest<PaginatedResponse<T, K> | T[]>(`${path}${buildQuery({ ...params, page, limit })}`, { token })
    const pageItems = normalizeResourceList(payload, key)
    items.push(...pageItems)

    if (Array.isArray(payload)) break

    const pagination = payload.pagination
    if (!pagination) {
      if (pageItems.length < limit) break
      page += 1
      continue
    }

    const totalPages = Math.max(1, Math.trunc(Number(pagination.totalPages)) || 1)
    const currentPage = Math.max(1, Math.trunc(Number(pagination.page)) || page)
    if (currentPage >= totalPages || pageItems.length === 0) break
    page = currentPage + 1
  }

  return items
}

function normalizePagePayload<T, K extends string>(payload: PaginatedResponse<T, K> | T[], key: K) {
  if (!Array.isArray(payload)) return payload
  return {
    [key]: payload,
    pagination: {
      page: 1,
      limit: payload.length || DEFAULT_API_PAGE_LIMIT,
      total: payload.length,
      totalPages: 1,
    },
  } as PaginatedResponse<T, K>
}

export function resolveApiAssetUrl(value?: string | null, version?: string | number | null) {
  const raw = String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (!raw) return undefined

  if (safeDataImagePattern.test(raw)) {
    return estimateBase64Bytes(raw) <= MAX_API_DATA_IMAGE_BYTES ? raw : undefined
  }

  if (/^(blob:|data:|javascript:|vbscript:|file:)/i.test(raw)) return undefined

  if (/^https?:/i.test(raw)) {
    try {
      const url = new URL(raw)
      if (!allowedAbsoluteAssetOrigins().has(url.origin)) return undefined
      return appendAssetVersion(url.toString(), version)
    } catch {
      return undefined
    }
  }

  if (raw.startsWith('//')) return undefined

  const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`
  if (normalizedPath.startsWith('/uploads/') && /^https?:/i.test(API_BASE_URL)) {
    try {
      const url = new URL(API_BASE_URL)
      url.pathname = normalizedPath
      url.search = ''
      url.hash = ''
      return appendAssetVersion(url.toString(), version)
    } catch {
      return appendAssetVersion(normalizedPath, version)
    }
  }

  return appendAssetVersion(normalizedPath, version)
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
  return apiRequest<SessionPayload>('/me', { token })
}

export async function loadMePermissions(token: string) {
  return apiRequest<MePermissionsPayload>('/me/permissions', { token })
}

const dashboardPeriodFilters = new Set(['all', 'week', 'month', 'year'])

function appendDashboardSelectionFilter(query: URLSearchParams, key: 'schoolId' | 'classId' | 'subject', value?: string) {
  const sanitized = sanitizeApiSearchParam(value)
  if (sanitized && sanitized !== 'all') query.set(key, sanitized)
}

export async function loadDashboardScreen(token: string, queryParams?: Partial<DashboardAlertsPageQuery & DashboardFiltersQuery>) {
  const params = new URLSearchParams()

  if (queryParams?.page) params.set('alertPage', String(clampApiPage(queryParams.page)))
  if (queryParams?.limit) params.set('alertLimit', String(clampApiPageLimit(queryParams.limit)))
  if (queryParams?.alertPage) params.set('alertPage', String(clampApiPage(queryParams.alertPage)))
  if (queryParams?.alertLimit) params.set('alertLimit', String(clampApiPageLimit(queryParams.alertLimit)))
  appendDashboardSelectionFilter(params, 'schoolId', queryParams?.schoolId)
  appendDashboardSelectionFilter(params, 'classId', queryParams?.classId)
  appendDashboardSelectionFilter(params, 'subject', queryParams?.subject)
  if (queryParams?.period && dashboardPeriodFilters.has(queryParams.period)) params.set('period', queryParams.period)

  const query = params.toString()
  return apiRequest<DashboardScreenPayload>(`/dashboard${query ? `?${query}` : ''}`, { token })
}

export async function loadNotificationsScreen(token: string) {
  return apiRequest<NotificationsScreenPayload>('/notifications', { token })
}

export async function loadSchoolsScreen(token: string, options: ScopedResourceOptions = {}) {
  const [schoolsPage, teachers, guardians, students, classesPage, lessonRecords] = await Promise.all([
    listSchoolsPage(token, { page: 1, limit: DEFAULT_API_PAGE_LIMIT }, options),
    listResource<Teacher, 'teachers'>(token, scopedResourcePath('teachers', options), 'teachers'),
    listResource<Guardian, 'guardians'>(token, scopedResourcePath('guardians', options), 'guardians'),
    listResource<Student, 'students'>(token, scopedResourcePath('students', options), 'students'),
    listClassesPage(token, { page: 1, limit: DEFAULT_API_PAGE_LIMIT }, options),
    listLessonRecords(token, options),
  ])

  return {
    schools: schoolsPage.schools,
    schoolsPagination: schoolsPage.pagination,
    teachers,
    guardians,
    students,
    classes: classesPage.classes,
    classesPagination: classesPage.pagination,
    lessonRecords,
  }
}

export async function loadTeachersScreen(token: string, options: ScopedResourceOptions = {}) {
  const [schools, teachers, students, guardians, classes, lessonRecords] = await Promise.all([
    listResource<School, 'schools'>(token, scopedResourcePath('schools', options), 'schools'),
    listResource<Teacher, 'teachers'>(token, scopedResourcePath('teachers', options), 'teachers'),
    listResource<Student, 'students'>(token, scopedResourcePath('students', options), 'students'),
    listResource<Guardian, 'guardians'>(token, scopedResourcePath('guardians', options), 'guardians'),
    listResource<ClassRoom, 'classes'>(token, scopedResourcePath('classes', options), 'classes'),
    listLessonRecords(token, options),
  ])

  return { schools, teachers, guardians, students, classes, lessonRecords }
}

export async function loadStudentsScreen(token: string, options: ScopedResourceOptions = {}) {
  const [schools, students, teachers, guardians, classes, lessonRecords] = await Promise.all([
    listResource<School, 'schools'>(token, scopedResourcePath('schools', options), 'schools'),
    listResource<Student, 'students'>(token, scopedResourcePath('students', options), 'students'),
    listResource<Teacher, 'teachers'>(token, scopedResourcePath('teachers', options), 'teachers'),
    listResource<Guardian, 'guardians'>(token, scopedResourcePath('guardians', options), 'guardians'),
    listResource<ClassRoom, 'classes'>(token, scopedResourcePath('classes', options), 'classes'),
    listLessonRecords(token, options),
  ])

  return { schools, teachers, guardians, students, classes, lessonRecords }
}

export async function loadClassesScreen(token: string, options: ScopedResourceOptions = {}) {
  const [schools, teachers, students, classes] = await Promise.all([
    listResource<School, 'schools'>(token, scopedResourcePath('schools', options), 'schools'),
    listResource<Teacher, 'teachers'>(token, scopedResourcePath('teachers', options), 'teachers'),
    listResource<Student, 'students'>(token, scopedResourcePath('students', options), 'students'),
    listResource<ClassRoom, 'classes'>(token, scopedResourcePath('classes', options), 'classes'),
  ])

  return { schools, teachers, guardians: [], students, classes }
}

type AcademicScopeLoadOptions = {
  includeTeachers?: boolean
  includeStudents?: boolean
  schoolsView?: string
  studentsView?: string
  classesView?: string
  networkScope?: boolean
}

export async function loadAcademicScopeScreen(token: string, options: AcademicScopeLoadOptions = {}) {
  const includeTeachers = options.includeTeachers ?? true
  const includeStudents = options.includeStudents ?? true
  const [schools, teachers, students, classes] = await Promise.all([
    listAllResource<School, 'schools'>(token, scopedResourcePath('schools', options), 'schools', { view: options.schoolsView }),
    includeTeachers
      ? listResource<Teacher, 'teachers'>(token, scopedResourcePath('teachers', options), 'teachers')
      : Promise.resolve([]),
    includeStudents
      ? listResource<Student, 'students'>(token, scopedResourcePath('students', options), 'students', { view: options.studentsView })
      : Promise.resolve([]),
    listAllResource<ClassRoom, 'classes'>(token, scopedResourcePath('classes', options), 'classes', { view: options.classesView }),
  ])

  return { schools, teachers, guardians: [], students, classes }
}

export async function loadRoomReservationsScreen(token: string, options: ScopedResourceOptions = {}) {
  const [schools, classes, roomReservations] = await Promise.all([
    listResource<School, 'schools'>(token, scopedResourcePath('schools', options), 'schools'),
    listResource<ClassRoom, 'classes'>(token, scopedResourcePath('classes', options), 'classes'),
    listRoomReservations(token, options),
  ])

  return { schools, teachers: [], guardians: [], students: [], classes, roomReservations }
}

type EvaluationScreenLoadOptions = {
  includeClasses?: boolean
  includeCorrections?: boolean
  includeAnswerCards?: boolean
  includeCurriculumSkills?: boolean
  includeAssessmentDescriptors?: boolean
  includeQuestionImportPlans?: boolean
  networkScope?: boolean
}

const defaultEvaluationScreenLoadOptions: Required<EvaluationScreenLoadOptions> = {
  includeClasses: true,
  includeCorrections: false,
  includeAnswerCards: false,
  includeCurriculumSkills: true,
  includeAssessmentDescriptors: true,
  includeQuestionImportPlans: true,
  networkScope: false,
}

export async function loadEvaluationsScreen(token: string, options: EvaluationScreenLoadOptions = {}) {
  const loadOptions = { ...defaultEvaluationScreenLoadOptions, ...options }
  const [
    exams,
    classes,
    corrections,
    answerCards,
    curriculumSkills,
    assessmentDescriptors,
    questionImportPlans,
  ] = await Promise.all([
    listResource<Evaluation, 'exams'>(token, scopedResourcePath('exams', loadOptions), 'exams'),
    loadOptions.includeClasses
      ? listResource<ClassRoom, 'classes'>(token, scopedResourcePath('classes', loadOptions), 'classes')
      : Promise.resolve([]),
    loadOptions.includeCorrections
      ? listResource<EvaluationCorrection, 'examCorrections'>(token, scopedResourcePath('exam-corrections', loadOptions), 'examCorrections')
      : Promise.resolve([]),
    loadOptions.includeAnswerCards
      ? listResource<EvaluationAnswerCard, 'answerCards'>(token, scopedResourcePath('answer-cards', loadOptions), 'answerCards')
      : Promise.resolve([]),
    loadOptions.includeCurriculumSkills
      ? listResource<CurriculumSkill, 'curriculumSkills'>(token, '/curriculum-skills', 'curriculumSkills')
      : Promise.resolve([]),
    loadOptions.includeAssessmentDescriptors
      ? listResource<AssessmentDescriptor, 'assessmentDescriptors'>(token, '/assessment-descriptors', 'assessmentDescriptors')
      : Promise.resolve([]),
    loadOptions.includeQuestionImportPlans
      ? listResource<QuestionImportPlan, 'questionImportPlans'>(token, '/question-import-plans', 'questionImportPlans')
      : Promise.resolve([]),
  ])

  return {
    evaluations: exams,
    classes,
    evaluationCorrections: corrections,
    answerCards,
    curriculumSkills,
    assessmentDescriptors,
    questionBank: [],
    questionImportPlans,
  }
}

export function loadEvaluationCorrectionsScreen(token: string, options: ScopedResourceOptions = {}) {
  return loadEvaluationsScreen(token, {
    ...options,
    includeClasses: false,
    includeCorrections: true,
    includeAnswerCards: true,
    includeCurriculumSkills: false,
    includeAssessmentDescriptors: false,
    includeQuestionImportPlans: false,
  })
}

export function loadTeacherSubjectEvaluationsScreen(token: string, options: ScopedResourceOptions = {}) {
  return loadEvaluationsScreen(token, {
    ...options,
    includeClasses: false,
    includeCorrections: true,
    includeAnswerCards: false,
    includeCurriculumSkills: true,
    includeAssessmentDescriptors: false,
    includeQuestionImportPlans: false,
  })
}

type StudentGradeApiItem = {
  id: string
  studentId: string
  studentName?: string
  schoolId?: string
  classId: string
  evaluationId: string
  evaluationTitle?: string
  subject?: string
  score: number | null
  status: EvaluationCorrection['status']
  scheduledAt?: string | null
  correctCount?: number
  totalQuestions?: number
  reviewedAt?: string | null
}

export async function loadStudentGradesEvaluationsScreen(token: string) {
  const grades = await listResource<StudentGradeApiItem, 'grades'>(token, '/me/grades', 'grades', { status: 'CONFIRMED', view: 'summary' })
  const evaluations = grades.map<Evaluation>((grade) => ({
    id: grade.evaluationId,
    title: grade.evaluationTitle || 'Prova corrigida',
    classId: grade.classId,
    schoolId: grade.schoolId,
    subject: grade.subject || '',
    questions: grade.totalQuestions ?? 0,
    scheduledAt: grade.scheduledAt || grade.reviewedAt || '',
    status: 'concluido',
    corrected: 0,
    participants: 0,
    averageScore: 0,
    triLevel: '',
  }))
  const corrections = grades.map<EvaluationCorrection>((grade) => {
    const totalQuestions = Math.max(0, Number(grade.totalQuestions ?? 0) || 0)
    const correctCount = Math.max(0, Number(grade.correctCount ?? 0) || 0)
    const score = grade.score == null ? null : Number(grade.score)

    return {
      id: grade.id,
      evaluationId: grade.evaluationId,
      schoolId: grade.schoolId,
      classId: grade.classId,
      subject: grade.subject,
      cardId: null,
      studentId: grade.studentId,
      studentName: grade.studentName,
      status: grade.status,
      imageUrl: null,
      suggestedScore: score ?? 0,
      finalScore: score,
      correctCount,
      wrongCount: Math.max(0, totalQuestions - correctCount),
      blankCount: 0,
      multipleCount: 0,
      totalQuestions,
      confidence: 0,
      requiresReview: false,
      shouldRetakeImage: false,
      failures: [],
      detectedAnswers: [],
      answerKey: [],
      rawOmrResponse: {},
      teacherNotes: null,
      reviewedById: null,
      reviewedAt: grade.reviewedAt ?? null,
      createdById: '',
      createdAt: grade.reviewedAt ?? '',
      updatedAt: grade.reviewedAt ?? '',
    }
  })

  return {
    evaluations,
    classes: [],
    evaluationCorrections: corrections,
    answerCards: [],
    curriculumSkills: [],
    assessmentDescriptors: [],
    questionBank: [],
    questionImportPlans: [],
  }
}

export async function loadCalendarScreen(token: string, options: ScopedResourceOptions = {}) {
  const [calendarEvents, schools, classes, evaluations] = await Promise.all([
    listResource<SchoolCalendarEvent, 'calendarEvents'>(token, scopedResourcePath('calendar-events', options), 'calendarEvents'),
    listResource<School, 'schools'>(token, scopedResourcePath('schools', options), 'schools'),
    listResource<ClassRoom, 'classes'>(token, scopedResourcePath('classes', options), 'classes'),
    listResource<Evaluation, 'exams'>(token, scopedResourcePath('exams', options), 'exams'),
  ])

  return { calendarEvents, schools, classes, evaluations }
}

export async function loadMealsScreen(token: string, options: ScopedResourceOptions = {}) {
  return apiRequest<MealsScreenPayload>(scopedResourcePath('meal-managements', options), { token })
}

export async function listRoomReservations(token: string, options: ScopedResourceOptions = {}) {
  const payload = await apiRequest<PaginatedResponse<RoomReservation, 'roomReservations'> | RoomReservation[]>(
    `${scopedResourcePath('room-reservations', options)}${buildQuery({ page: 1, limit: DEFAULT_API_PAGE_LIMIT })}`,
    { token },
  )
  return normalizeResourceList(payload, 'roomReservations')
}

export async function listMealManagements(token: string, options: ScopedResourceOptions = {}) {
  return apiRequest<MealsScreenPayload>(scopedResourcePath('meal-managements', options), { token })
}

export async function listMealManagementSchoolPage(token: string, page = 1, limit = DEFAULT_API_PAGE_LIMIT, search = '', options: ScopedResourceOptions = {}) {
  const params = new URLSearchParams({
    page: String(clampApiPage(page)),
    limit: String(clampApiPageLimit(limit)),
  })
  const sanitizedSearch = sanitizeApiSearchParam(search)
  if (sanitizedSearch) params.set('search', sanitizedSearch)
  return apiRequest<MealManagementsPagePayload>(`${scopedResourcePath('meal-managements', options)}/school-page?${params.toString()}`, { token })
}

export async function listSchoolsPage(token: string, params: SchoolsPageQuery, options: ScopedResourceOptions = {}) {
  const query = new URLSearchParams({
    page: String(clampApiPage(params.page)),
    limit: String(clampApiPageLimit(params.limit)),
  })
  const sanitizedSearch = sanitizeApiSearchParam(params.search)
  if (sanitizedSearch) query.set('search', sanitizedSearch)

  const payload = await apiRequest<PaginatedResponse<School, 'schools'> | School[]>(
    `${scopedResourcePath('schools', options)}?${query.toString()}`,
    { token },
  )
  return normalizePagePayload(payload, 'schools') as SchoolsPagePayload
}

export async function listClassesPage(token: string, params: ClassesPageQuery, options: ScopedResourceOptions = {}) {
  const query = new URLSearchParams({
    page: String(clampApiPage(params.page)),
    limit: String(clampApiPageLimit(params.limit)),
  })
  const sanitizedSearch = sanitizeApiSearchParam(params.search)
  const sanitizedSchoolId = sanitizeApiSearchParam(params.schoolId)
  if (sanitizedSearch) query.set('search', sanitizedSearch)
  if (sanitizedSchoolId && sanitizedSchoolId !== 'all') query.set('schoolId', sanitizedSchoolId)

  const payload = await apiRequest<PaginatedResponse<ClassRoom, 'classes'> | ClassRoom[]>(
    `${scopedResourcePath('classes', options)}?${query.toString()}`,
    { token },
  )
  return normalizePagePayload(payload, 'classes') as ClassesPagePayload
}

export async function searchMealFoods(token: string, search: string, limit = DEFAULT_API_PAGE_LIMIT) {
  const params = new URLSearchParams({
    search: sanitizeApiSearchParam(search),
    limit: String(clampApiPageLimit(limit)),
  })
  return apiRequest<MealFood[]>(`/meal-foods?${params.toString()}`, { token })
}

export async function loadAccessScreen(token: string) {
  const [rolesPayload, usersPayload, schools] = await Promise.all([
    apiRequest<{ roles: Role[] }>('/roles', { token }),
    apiRequest<PaginatedResponse<UserAccount, 'users'>>(`/users${buildQuery({ page: 1, limit: DEFAULT_API_PAGE_LIMIT })}`, { token }),
    listResource<School, 'schools'>(token, '/schools', 'schools'),
  ])

  return {
    roles: rolesPayload.roles,
    users: normalizeResourceList(usersPayload, 'users'),
    schools,
  }
}

export async function searchAccessUsers(token: string, params: AccessUserSearchQuery) {
  const query = new URLSearchParams({
    search: sanitizeApiSearchParam(params.search),
    schoolId: params.schoolId ?? 'all',
    kind: params.kind ?? 'all',
    limit: String(clampApiPageLimit(params.limit)),
  })

  return apiRequest<AccessUserSearchPayload>(`/users/search?${query.toString()}`, { token })
}

function buildTeachersPageQuery(params: TeachersPageQuery) {
  const query = new URLSearchParams({
    page: String(clampApiPage(params.page)),
    limit: String(clampApiPageLimit(params.limit)),
  })

  const sanitizedSearch = sanitizeApiSearchParam(params.search)
  if (sanitizedSearch) query.set('search', sanitizedSearch)
  if (params.schoolId && params.schoolId !== 'all') query.set('schoolId', params.schoolId)
  if (params.discipline && params.discipline !== 'all') query.set('subject', params.discipline)

  return query.toString()
}

export async function listTeachersPage(token: string, params: TeachersPageQuery, options: ScopedResourceOptions = {}) {
  return apiRequest<TeachersPagePayload>(`${scopedResourcePath('teachers', options)}?${buildTeachersPageQuery(params)}`, { token })
}

export async function listTeacherSubjectCardsPage(token: string, params: TeacherSubjectsPageQuery, options: ScopedResourceOptions = {}) {
  const query = new URLSearchParams({
    page: String(clampApiPage(params.page)),
    limit: String(clampApiPageLimit(params.limit)),
  })

  const sanitizedSearch = sanitizeApiSearchParam(params.search)
  if (sanitizedSearch) query.set('search', sanitizedSearch)

  const search = query.toString()

  return apiRequest<TeacherSubjectCardsPagePayload>(`${scopedResourcePath('teacher-subjects', options)}?${search}`, { token })
}

function buildStudentsPageQuery(params: StudentsPageQuery) {
  const query = new URLSearchParams({
    page: String(clampApiPage(params.page)),
    limit: String(clampApiPageLimit(params.limit)),
  })

  const sanitizedSearch = sanitizeApiSearchParam(params.search)
  if (sanitizedSearch) query.set('search', sanitizedSearch)
  if (params.schoolId && params.schoolId !== 'all') query.set('schoolId', params.schoolId)
  if (params.discipline && params.discipline !== 'all') query.set('subject', params.discipline)
  if (params.classId && params.classId !== 'all') query.set('classId', params.classId)

  return query.toString()
}

export async function listStudentsPage(token: string, params: StudentsPageQuery, options: ScopedResourceOptions = {}) {
  return apiRequest<StudentsPagePayload>(`${scopedResourcePath('students', options)}?${buildStudentsPageQuery(params)}`, { token })
}

export async function loadSettingsScreen(token: string) {
  const [me, schoolsPayload] = await Promise.all([
    apiRequest<SessionPayload>('/me', { token }),
    apiRequest<{ schools: School[] }>('/me/schools', { token }),
  ])

  return {
    currentUser: me.currentUser,
    schools: schoolsPayload.schools,
  }
}

export async function markNotificationRead(token: string, id: string) {
  return apiRequest<NotificationsScreenPayload>(`/notifications/${id}/read`, { method: 'PATCH', token })
}

export async function markNotificationUnread(token: string, id: string) {
  return apiRequest<NotificationsScreenPayload>(`/notifications/${id}/unread`, { method: 'PATCH', token })
}

export async function markAllNotificationsRead(token: string) {
  return apiRequest<NotificationsScreenPayload>('/notifications/read-all', { method: 'PATCH', token })
}

const schoolPayloadFields = ['name', 'city', 'address', 'director', 'inepCode'] as const
const classRoomPayloadFields = ['name', 'grade', 'shift', 'schoolId', 'teacherId', 'teacherIds', 'academicYear', 'schedule', 'bnccFocus'] as const
const teacherCreatePayloadFields = ['name', 'email', 'schoolId', 'specialty', 'classId', 'phone', 'password'] as const
const teacherUpdatePayloadFields = ['name', 'email', 'specialty', 'classId', 'phone', 'password'] as const
const studentCreatePayloadFields = ['name', 'email', 'registration', 'registrationNumber', 'schoolId', 'classId', 'guardianIds', 'password'] as const
const studentUpdatePayloadFields = ['name', 'email', 'registration', 'registrationNumber', 'classId', 'guardianIds', 'password'] as const
const guardianCreatePayloadFields = ['name', 'email', 'phone', 'schoolId', 'studentIds', 'password'] as const
const guardianUpdatePayloadFields = ['name', 'email', 'phone', 'studentIds', 'password'] as const
const evaluationCreatePayloadFields = [
  'title', 'classId', 'subject', 'questions', 'scheduledAt', 'buildMode', 'omrCardVersion',
  'questionIds', 'skillCodes', 'descriptorCodes', 'sourceSummary', 'questionSnapshots',
] as const
const calendarPayloadFields = ['title', 'type', 'schoolId', 'classId', 'startsAt', 'endsAt', 'allDay', 'location', 'description'] as const
const profilePayloadFields = ['name', 'email', 'phone', 'birthDate', 'cpf'] as const
const roleUpdatePayloadFields = ['permissions'] as const
const mealFoodRequestUpdateFields = ['itemName', 'quantity', 'unit', 'unitPrice', 'reason', 'urgencyLevel', 'expirationDate', 'observation'] as const
const mealItemPayloadFields = ['alimentoId', 'quantidade', 'valorUnitario', 'dataValidade', 'possuiValidade', 'lote', 'fornecedorNome', 'quantidadeMinima'] as const
const mealFoodPayloadFields = ['nome', 'categoria', 'unidadeMedida', 'iconKey', 'ativo'] as const
const mealFoodRequestCreateFields = ['schoolId', 'itemName', 'quantity', 'unit', 'unitPrice', 'reason', 'urgencyLevel', 'expirationDate', 'observation'] as const
const mealRequestReviewFields = ['action', 'nutritionistObservation', 'rejectionReason', 'suggestedQuantity', 'suggestedUnit', 'suggestedUnitPrice'] as const
const mealRequestStockFields = ['fornecedorNome', 'valorUnitario', 'dataCompra', 'dataValidade', 'observacao', 'quantidadeMinima'] as const
const mealManagementPayloadFields = ['escolaId', 'mesReferencia', 'valorLimite', 'alertaAoAtingirPercentual', 'permitirUltrapassarLimite', 'responsaveisGestao', 'alimentosCadastrados'] as const
const mealBudgetPayloadFields = ['valorLimite', 'alertaAoAtingirPercentual', 'permitirUltrapassarLimite'] as const
const mealMenuPayloadFields = ['diaSemana', 'tipoRefeicao', 'turno', 'titulo', 'alimentoIds', 'observacao', 'status'] as const
const correctionReviewPayloadFields = ['status', 'finalScore', 'detectedAnswers', 'teacherNotes'] as const
const correctionConfirmPayloadFields = ['corrections'] as const
const lessonRecordPayloadFields = ['classId', 'subject', 'date', 'time', 'content', 'plan', 'resources', 'activity', 'notes', 'attendance'] as const
const roomReservationPayloadFields = ['room', 'date', 'startTime', 'endTime', 'classId', 'purpose'] as const
const questionSelectionPayloadFields = ['quantity', 'subject', 'gradeLevel', 'difficulty', 'sourceMode', 'skillCode', 'descriptorCode'] as const
const questionCreatePayloadFields = [
  'title', 'context', 'statement', 'explanation', 'type', 'stage', 'gradeLevel', 'area', 'component', 'subject', 'difficulty',
  'sourceType', 'sourceName', 'sourceYear', 'sourceExternalId', 'sourceUrl', 'licenseNotes', 'visibility', 'options',
  'skillIds', 'descriptorIds', 'attachments', 'metadata',
] as const

export async function createSchool(token: string, payload: Partial<School>) {
  return apiRequest<School>('/schools', { method: 'POST', token, body: pickAllowedPayload(payload, schoolPayloadFields) })
}

export async function updateSchool(token: string, id: string, payload: Partial<School>) {
  return apiRequest<School>(`/schools/${id}`, { method: 'PATCH', token, body: pickAllowedPayload(payload, schoolPayloadFields) })
}

export async function createClassRoom(token: string, payload: Partial<ClassRoom>) {
  return apiRequest<ClassRoom>('/classes', { method: 'POST', token, body: pickAllowedPayload(payload, classRoomPayloadFields) })
}

export async function updateClassRoom(token: string, id: string, payload: Partial<ClassRoom>) {
  return apiRequest<ClassRoom>(`/classes/${id}`, { method: 'PATCH', token, body: pickAllowedPayload(payload, classRoomPayloadFields) })
}

export async function createTeacher(token: string, payload: Partial<Teacher> & { classId?: string; password?: string; phone?: string }) {
  return apiRequest<Teacher>('/teachers', { method: 'POST', token, body: pickAllowedPayload(payload, teacherCreatePayloadFields) })
}

export async function updateTeacher(token: string, id: string, payload: Partial<Teacher> & { classId?: string }) {
  return apiRequest<Teacher>(`/teachers/${id}`, { method: 'PATCH', token, body: pickAllowedPayload(payload, teacherUpdatePayloadFields) })
}

export async function createStudent(token: string, payload: Partial<Student> & { password?: string }) {
  const safePayload = pickAllowedPayload(payload, studentCreatePayloadFields)
  return apiRequest<Student>('/students', { method: 'POST', token, body: safePayload })
}

export async function updateStudent(token: string, id: string, payload: Partial<Student>) {
  const safePayload = pickAllowedPayload(payload, studentUpdatePayloadFields)
  return apiRequest<Student>(`/students/${id}`, { method: 'PATCH', token, body: safePayload })
}

export async function createGuardian(token: string, payload: Partial<Guardian> & { password?: string }) {
  return apiRequest<Guardian>('/guardians', { method: 'POST', token, body: pickAllowedPayload(payload, guardianCreatePayloadFields) })
}

export async function updateGuardian(token: string, id: string, payload: Partial<Guardian>) {
  return apiRequest<Guardian>(`/guardians/${id}`, { method: 'PATCH', token, body: pickAllowedPayload(payload, guardianUpdatePayloadFields) })
}

export async function createEvaluation(token: string, payload: Partial<Evaluation>) {
  const safePayload = pickAllowedPayload(payload, evaluationCreatePayloadFields)
  const questionCount = Number((safePayload as Partial<Evaluation>).questions ?? 0)
  const questionIds = Array.isArray((safePayload as Partial<Evaluation>).questionIds)
    ? (safePayload as Partial<Evaluation>).questionIds ?? []
    : []
  if (Number.isFinite(questionCount) && questionCount > MAX_EVALUATION_QUESTIONS) throw new ApiError(evaluationQuestionLimitMessage(), 422)
  if (questionIds.length > MAX_EVALUATION_QUESTIONS) throw new ApiError(evaluationQuestionLimitMessage(), 422)
  return apiRequest<CreateEvaluationApiResponse>('/evaluations', {
    method: 'POST',
    token,
    body: safePayload,
    headers: { 'Idempotency-Key': createIdempotencyKey('exam-create') },
  })
}

export async function deleteEvaluation(token: string, id: string) {
  return apiRequest<{ success: boolean }>(`/evaluations/${id}`, { method: 'DELETE', token })
}

export async function downloadEvaluationFile(token: string, id: string, kind: EvaluationDownloadKind = 'complete') {
  const encodedId = encodeURIComponent(id)
  if (kind === 'complete') {
    return apiFileRequest(`/evaluations/${encodedId}/download`, {
      token,
      filenameFallback: `prova-${id}.pdf`,
    })
  }

  if (kind === 'answer_key') {
    const answerKeyDownloadPaths = [
      `/evaluations/${encodedId}/download?kind=answer_key`,
      `/evaluations/${encodedId}/download?type=answer_key`,
      `/evaluations/${encodedId}/answer-key/download`,
      `/evaluations/${encodedId}/answer-key`,
      `/evaluations/${encodedId}/gabarito/download`,
      `/evaluations/${encodedId}/gabarito`,
    ]
    let lastRouteError: ApiError | null = null

    for (const path of answerKeyDownloadPaths) {
      try {
        return await apiFileRequest(path, {
          token,
          filenameFallback: `gabarito-${id}.pdf`,
        })
      } catch (error) {
        if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 405)) {
          lastRouteError = error
          continue
        }
        throw error
      }
    }

    throw new ApiError(
      'O backend ainda nao disponibilizou o download do gabarito da prova. Implemente GET /evaluations/:id/answer-key/download ou uma das rotas equivalentes configuradas no front.',
      lastRouteError?.statusCode ?? 404,
    )
  }

  const answerCardDownloadPaths = [
    `/evaluations/${encodedId}/download?kind=answer_cards`,
    `/evaluations/${encodedId}/download?type=answer_cards`,
    `/evaluations/${encodedId}/answer-cards/download`,
    `/evaluations/${encodedId}/answer-cards`,
    `/evaluations/${encodedId}/cartoes-resposta/download`,
    `/evaluations/${encodedId}/cartoes-resposta`,
  ]
  let lastRouteError: ApiError | null = null

  for (const path of answerCardDownloadPaths) {
    try {
      return await apiFileRequest(path, {
        token,
        filenameFallback: `cartoes-resposta-${id}.pdf`,
      })
    } catch (error) {
      if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 405)) {
        lastRouteError = error
        continue
      }
      throw error
    }
  }

  throw new ApiError(
    'O backend ainda nao disponibilizou o download do PDF de cartoes-resposta da turma. Implemente GET /evaluations/:id/answer-cards/download ou uma das rotas equivalentes configuradas no front.',
    lastRouteError?.statusCode ?? 404,
  )
}

export async function processEvaluationOmr(token: string, evaluationId: string, studentId: string, image: File) {
  const validation = await validateOmrFile(image)
  if (!validation.ok) throw new ApiError(validation.message ?? 'Arquivo OMR invalido.', 415)
  const formData = new FormData()
  formData.append('image', image)
  return apiFormRequest<EvaluationCorrection>(
    `/evaluations/${encodeURIComponent(evaluationId)}/students/${encodeURIComponent(studentId)}/omr`,
    { method: 'POST', token, body: formData, headers: { 'Idempotency-Key': createIdempotencyKey('omr-single') } },
  )
}

export async function processEvaluationOmrBatch(token: string, evaluationId: string, files: File[]) {
  const validation = await validateOmrBatchFiles(files)
  if (!validation.ok) throw new ApiError(validation.message ?? 'Lote OMR invalido.', 415)
  const formData = new FormData()
  for (const file of files) formData.append('images', file)

  return apiFormRequest<EvaluationOmrBatchResponse>(
    `/evaluations/${encodeURIComponent(evaluationId)}/omr/batch`,
    { method: 'POST', token, body: formData, headers: { 'Idempotency-Key': createIdempotencyKey('omr-batch') } },
  )
}

export async function getEvaluationCorrectionCardFile(token: string, correctionId: string) {
  return apiFileRequest(`/evaluation-corrections/${encodeURIComponent(correctionId)}/image`, {
    token,
    filenameFallback: `cartao-resposta-${correctionId}`,
    accept: 'image/*,application/pdf',
  })
}

export async function getEvaluationCorrection(token: string, id: string) {
  return apiRequest<EvaluationCorrection>(`/evaluation-corrections/${encodeURIComponent(id)}`, { token })
}

export async function reviewEvaluationCorrection(token: string, id: string, payload: EvaluationCorrectionReviewPayload) {
  return apiRequest<EvaluationCorrection>(`/evaluation-corrections/${encodeURIComponent(id)}/review`, {
    method: 'PATCH',
    token,
    body: pickAllowedPayload(payload, correctionReviewPayloadFields),
    headers: { 'Idempotency-Key': createIdempotencyKey('correction-review') },
  })
}

export async function confirmEvaluationCorrections(token: string, evaluationId: string, payload: EvaluationCorrectionConfirmManyPayload) {
  return apiRequest<EvaluationCorrectionConfirmManyResponse>(
    `/evaluations/${encodeURIComponent(evaluationId)}/corrections/confirm`,
    {
      method: 'POST',
      token,
      body: pickAllowedPayload(payload, correctionConfirmPayloadFields),
      headers: { 'Idempotency-Key': createIdempotencyKey('correction-confirm') },
    },
  )
}

function normalizeQuestionSelectionResponse(payload: unknown): GenerateQuestionSelectionResponse {
  const record = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {}
  const nested = (record.data && typeof record.data === 'object')
    ? record.data as Record<string, unknown>
    : (record.selection && typeof record.selection === 'object')
      ? record.selection as Record<string, unknown>
      : record
  const questions = Array.isArray(nested.questions) ? nested.questions as Question[] : []
  const questionIds = Array.isArray(nested.questionIds)
    ? nested.questionIds.map((id) => String(id)).filter(Boolean)
    : questions.map((question) => question.id)
  const totalEligible = typeof nested.totalEligible === 'number'
    ? nested.totalEligible
    : typeof nested.total === 'number'
      ? nested.total
      : questions.length

  return { questions, questionIds, totalEligible }
}

export async function generateQuestionSelection(token: string, payload: GenerateQuestionSelectionRequest) {
  if (Number(payload.quantity) > MAX_EVALUATION_QUESTIONS) throw new ApiError(evaluationQuestionLimitMessage(), 422)
  const response = await apiRequest<unknown>('/questions/generate-selection', {
    method: 'POST',
    token,
    body: pickAllowedPayload(payload, questionSelectionPayloadFields),
    headers: { 'Idempotency-Key': createIdempotencyKey('question-generation') },
  })
  return normalizeQuestionSelectionResponse(response)
}

const inFlightQuestionPageRequests = new Map<string, Promise<QuestionBankPagePayload>>()

export async function listQuestionsPage(token: string, params: QuestionBankPageQuery) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (key === 'page') query.set(key, String(clampApiPage(value as number | string)))
    else if (key === 'limit') query.set(key, String(clampApiPageLimit(value as number | string)))
    else if (key === 'search') {
      const sanitizedSearch = sanitizeApiSearchParam(String(value))
      if (sanitizedSearch) query.set(key, sanitizedSearch)
    } else {
      query.set(key, String(value))
    }
  })
  const path = `/questions?${query.toString()}`
  const requestKey = `${token}:${path}`
  const inFlightRequest = inFlightQuestionPageRequests.get(requestKey)
  if (inFlightRequest) return inFlightRequest

  const request = apiRequest<QuestionBankPagePayload>(path, { token })
    .finally(() => {
      if (inFlightQuestionPageRequests.get(requestKey) === request) {
        inFlightQuestionPageRequests.delete(requestKey)
      }
    })
  inFlightQuestionPageRequests.set(requestKey, request)
  return request
}

export async function createQuestion(token: string, payload: CreateQuestionRequest) {
  return apiRequest<Question>('/questions', {
    method: 'POST',
    token,
    body: pickAllowedPayload(payload, questionCreatePayloadFields),
    headers: { 'Idempotency-Key': createIdempotencyKey('question-create') },
  })
}

export async function deleteQuestion(token: string, id: string) {
  return apiRequest<{ success: boolean }>(`/questions/${id}`, { method: 'DELETE', token })
}

export async function createMealItem(token: string, managementId: string, payload: CreateMealItemPayload) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/items`, { method: 'POST', token, body: pickAllowedPayload(payload, mealItemPayloadFields) })
}

export async function createMealManagement(token: string, payload: CreateMealManagementPayload) {
  return apiRequest<MealManagement>('/meal-managements', { method: 'POST', token, body: pickAllowedPayload(payload, mealManagementPayloadFields) })
}

export async function updateMealBudget(token: string, managementId: string, payload: UpdateMealBudgetPayload) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/budget`, { method: 'PATCH', token, body: pickAllowedPayload(payload, mealBudgetPayloadFields) })
}

export async function createMealFood(token: string, managementId: string, payload: CreateMealFoodPayload) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/foods`, { method: 'POST', token, body: pickAllowedPayload(payload, mealFoodPayloadFields) })
}

export async function createMealFoodRequest(token: string, payload: CreateMealFoodRequestPayload) {
  return apiRequest<MealFoodRequest>('/meal-food-requests', { method: 'POST', token, body: pickAllowedPayload(payload, mealFoodRequestCreateFields) })
}

export async function updateMealFoodRequest(token: string, id: string, payload: UpdateMealFoodRequestPayload) {
  return apiRequest<MealFoodRequest>(`/meal-food-requests/${id}`, { method: 'PATCH', token, body: pickAllowedPayload(payload, mealFoodRequestUpdateFields) })
}

export async function deleteMealFoodRequest(token: string, id: string) {
  return apiRequest<MealFoodRequest>(`/meal-food-requests/${id}`, { method: 'DELETE', token })
}

export async function reviewMealFoodRequest(token: string, id: string, payload: ReviewMealFoodRequestPayload) {
  return apiRequest<MealFoodRequest>(`/meal-food-requests/${id}/review`, { method: 'POST', token, body: pickAllowedPayload(payload, mealRequestReviewFields) })
}

export async function addMealFoodRequestToStock(token: string, id: string, payload: AddMealFoodRequestToStockPayload) {
  return apiRequest<{ request: MealFoodRequest; management: MealManagement }>(`/meal-food-requests/${id}/add-to-stock`, { method: 'POST', token, body: pickAllowedPayload(payload, mealRequestStockFields) })
}

export async function createMealMenu(token: string, managementId: string, payload: UpsertMealMenuPayload) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/menus`, { method: 'POST', token, body: pickAllowedPayload(payload, mealMenuPayloadFields) })
}

export async function updateMealMenu(token: string, managementId: string, menuId: string, payload: Partial<UpsertMealMenuPayload>) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/menus/${menuId}`, { method: 'PATCH', token, body: pickAllowedPayload(payload, mealMenuPayloadFields) })
}

export async function deleteMealMenu(token: string, managementId: string, menuId: string) {
  return apiRequest<MealManagement>(`/meal-managements/${managementId}/menus/${menuId}`, { method: 'DELETE', token })
}

export async function createCalendarEvent(token: string, payload: Partial<SchoolCalendarEvent>) {
  return apiRequest<SchoolCalendarEvent>('/calendar-events', { method: 'POST', token, body: pickAllowedPayload(payload, calendarPayloadFields) })
}

export async function createRoomReservation(token: string, payload: CreateRoomReservationPayload) {
  return apiRequest<RoomReservation>('/room-reservations', { method: 'POST', token, body: pickAllowedPayload(payload, roomReservationPayloadFields) })
}

export async function createLessonRecord(token: string, payload: CreateLessonRecordPayload) {
  return apiRequest<LessonRecord>('/lesson-records', { method: 'POST', token, body: pickAllowedPayload(payload, lessonRecordPayloadFields) })
}

export async function listLessonRecords(token: string, options: ScopedResourceOptions = {}) {
  const payload = await apiRequest<PaginatedResponse<LessonRecord, 'lessonRecords'> | LessonRecord[]>(
    `${scopedResourcePath('lesson-records', options)}${buildQuery({ page: 1, limit: DEFAULT_API_PAGE_LIMIT })}`,
    { token },
  )
  return normalizeResourceList(payload, 'lessonRecords')
}

export async function updateLessonRecord(token: string, id: string, payload: UpdateLessonRecordPayload) {
  return apiRequest<LessonRecord>(`/lesson-records/${id}`, { method: 'PATCH', token, body: pickAllowedPayload(payload, lessonRecordPayloadFields) })
}

export async function updateCalendarEvent(token: string, id: string, payload: Partial<SchoolCalendarEvent>) {
  return apiRequest<SchoolCalendarEvent>(`/calendar-events/${id}`, { method: 'PATCH', token, body: pickAllowedPayload(payload, calendarPayloadFields) })
}

export async function deleteCalendarEvent(token: string, id: string) {
  return apiRequest<{ success: boolean }>(`/calendar-events/${id}`, { method: 'DELETE', token })
}

export async function updateRole(token: string, id: string, payload: Partial<Role>) {
  return apiRequest<Role>(`/roles/${id}`, { method: 'PATCH', token, body: pickAllowedPayload(payload, roleUpdatePayloadFields) })
}

export async function updateUserRole(token: string, id: string, payload: { roleId: string }) {
  return apiRequest<UserAccount>(`/users/${id}/role`, { method: 'PATCH', token, body: payload })
}

export async function updateUserSchool(token: string, id: string, payload: UpdateUserSchoolPayload) {
  return apiRequest<UserAccount>(`/users/${id}/school`, { method: 'PATCH', token, body: payload })
}

export async function updateProfile(token: string, payload: Partial<UserAccount>) {
  return apiRequest<UserAccount>('/profile', { method: 'PATCH', token, body: pickAllowedPayload(payload, profilePayloadFields) })
}

export async function removeProfileAvatar(token: string) {
  return apiRequest<UserAccount>('/profile/avatar', { method: 'DELETE', token })
}

export async function removeProfileBanner(token: string) {
  return apiRequest<UserAccount>('/profile/banner', { method: 'DELETE', token })
}

export async function uploadProfileAvatar(token: string, file: File) {
  const validation = await validateProfileImageFile(file)
  if (!validation.ok) throw new ApiError(validation.message ?? 'Imagem de perfil invalida.', 415)
  const formData = new FormData()
  formData.append('avatar', file)
  return apiFormRequest<UserAccount>('/profile/avatar', { method: 'PATCH', token, body: formData })
}

export async function uploadProfileBanner(token: string, file: File) {
  const validation = await validateProfileImageFile(file)
  if (!validation.ok) throw new ApiError(validation.message ?? 'Imagem de capa invalida.', 415)
  const formData = new FormData()
  formData.append('banner', file)
  return apiFormRequest<UserAccount>('/profile/banner', { method: 'PATCH', token, body: formData })
}
