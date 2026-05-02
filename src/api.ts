import type { BootstrapPayload, ClassRoom, Evaluation, Role, School, UserAccount } from './types'

import type { SchoolCalendarEvent } from './types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  token?: string | null
  body?: unknown
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
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const payload = (await response.json().catch(() => null)) as { message?: string } | null

  if (!response.ok) {
    throw new ApiError(payload?.message ?? 'Nao foi possivel conversar com a API.', response.status)
  }

  return payload as T
}

export async function login(credentials: { email: string; password: string }) {
  return apiRequest<{ token: string; user: UserAccount }>('/auth/login', { method: 'POST', body: credentials })
}

export async function loadBootstrap(token: string) {
  return apiRequest<BootstrapPayload>('/bootstrap', { token })
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

export async function createEvaluation(token: string, payload: Partial<Evaluation>) {
  return apiRequest<Evaluation>('/evaluations', { method: 'POST', token, body: payload })
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
