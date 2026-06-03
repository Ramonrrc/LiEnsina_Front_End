export const MAX_PROFILE_AVATAR_BYTES = 10 * 1024 * 1024
export const MAX_PROFILE_BANNER_BYTES = 15 * 1024 * 1024
export const MAX_PROFILE_IMAGE_BYTES = MAX_PROFILE_AVATAR_BYTES
export const MAX_OMR_FILE_BYTES = 16 * 1024 * 1024
export const MAX_OMR_BATCH_FILES = 20
export const MAX_OMR_BATCH_TOTAL_BYTES = 48 * 1024 * 1024

export const PROFILE_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp'
export const OMR_PDF_UPLOADS_ENABLED = import.meta.env.VITE_OMR_ALLOW_PDF_UPLOADS === 'true'
export const OMR_UPLOAD_ACCEPT = OMR_PDF_UPLOADS_ENABLED
  ? 'image/png,image/jpeg,image/webp,application/pdf'
  : 'image/png,image/jpeg,image/webp'

const allowedProfileImageMimes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const allowedOmrMimes = new Set(OMR_PDF_UPLOADS_ENABLED ? [...allowedProfileImageMimes, 'application/pdf'] : [...allowedProfileImageMimes])
const allowedProfileImageExtensions = new Set(['png', 'jpg', 'jpeg', 'webp'])
const allowedOmrExtensions = new Set(OMR_PDF_UPLOADS_ENABLED ? [...allowedProfileImageExtensions, 'pdf'] : [...allowedProfileImageExtensions])
const dangerousExtensions = new Set([
  'svg', 'html', 'htm', 'js', 'mjs', 'ts', 'tsx', 'jsx', 'php', 'phtml', 'exe', 'dll', 'bat',
  'cmd', 'ps1', 'sh', 'bash', 'zsh', 'jar', 'war', 'zip', 'rar', '7z', 'tar', 'gz',
])

export type FileValidationResult = {
  ok: boolean
  message?: string
}

function fileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase()
  const extension = normalized.split('.').pop()
  return extension && extension !== normalized ? extension : ''
}

function hasDangerousDoubleExtension(fileName: string) {
  const parts = fileName.trim().toLowerCase().split('.').filter(Boolean)
  if (parts.length <= 2) return false
  return parts.slice(0, -1).some((part) => dangerousExtensions.has(part))
}

async function readFileHeader(file: File, maxBytes = 16) {
  const buffer = await file.slice(0, maxBytes).arrayBuffer()
  return new Uint8Array(buffer)
}

function asciiHeader(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => String.fromCharCode(byte)).join('')
}

function hasExpectedMagicBytes(file: File, bytes: Uint8Array) {
  const type = file.type.toLowerCase()
  const ext = fileExtension(file.name)
  if (type === 'image/jpeg' || ext === 'jpg' || ext === 'jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (type === 'image/png' || ext === 'png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  }
  if (type === 'image/webp' || ext === 'webp') {
    const header = asciiHeader(bytes)
    return header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP'
  }
  if (type === 'application/pdf' || ext === 'pdf') {
    return asciiHeader(bytes).startsWith('%PDF-')
  }
  return false
}

async function validateFileBasics(
  file: File,
  options: {
    maxBytes: number
    allowedMimes: Set<string>
    allowedExtensions: Set<string>
    label: string
  },
): Promise<FileValidationResult> {
  const extension = fileExtension(file.name)
  const mime = file.type.toLowerCase()

  if (file.size <= 0) return { ok: false, message: `${options.label} vazio nao pode ser enviado.` }
  if (file.size > options.maxBytes) return { ok: false, message: `${options.label} acima do limite permitido.` }
  if (!extension || !options.allowedExtensions.has(extension)) return { ok: false, message: `${options.label} com extensao nao permitida.` }
  if (dangerousExtensions.has(extension) || hasDangerousDoubleExtension(file.name)) {
    return { ok: false, message: `${options.label} com nome ou extensao perigosa.` }
  }
  if (!options.allowedMimes.has(mime)) return { ok: false, message: `${options.label} com tipo nao permitido.` }

  const header = await readFileHeader(file)
  if (!hasExpectedMagicBytes(file, header)) return { ok: false, message: `${options.label} nao parece ser um arquivo valido.` }

  return { ok: true }
}

export function formatSafeFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function isAllowedOmrFileName(fileName: string) {
  const extension = fileExtension(fileName)
  return Boolean(extension && allowedOmrExtensions.has(extension) && !dangerousExtensions.has(extension) && !hasDangerousDoubleExtension(fileName))
}

export function isAllowedProfileImageName(fileName: string) {
  const extension = fileExtension(fileName)
  return Boolean(extension && allowedProfileImageExtensions.has(extension) && !dangerousExtensions.has(extension) && !hasDangerousDoubleExtension(fileName))
}

export function validateProfileImageFile(file: File, maxBytes = MAX_PROFILE_AVATAR_BYTES, label = 'Imagem de perfil') {
  return validateFileBasics(file, {
    maxBytes,
    allowedMimes: allowedProfileImageMimes,
    allowedExtensions: allowedProfileImageExtensions,
    label,
  })
}

export function validateProfileAvatarFile(file: File) {
  return validateProfileImageFile(file, MAX_PROFILE_AVATAR_BYTES, 'Imagem de perfil')
}

export function validateProfileBannerFile(file: File) {
  return validateProfileImageFile(file, MAX_PROFILE_BANNER_BYTES, 'Imagem de capa')
}

export function validateOmrFile(file: File) {
  return validateFileBasics(file, {
    maxBytes: MAX_OMR_FILE_BYTES,
    allowedMimes: allowedOmrMimes,
    allowedExtensions: allowedOmrExtensions,
    label: 'Arquivo OMR',
  })
}

export async function validateOmrBatchFiles(files: File[]) {
  if (files.length > MAX_OMR_BATCH_FILES) {
    return { ok: false, message: `Envie no maximo ${MAX_OMR_BATCH_FILES} arquivos por lote.` }
  }
  const totalSize = files.reduce((total, file) => total + file.size, 0)
  if (totalSize > MAX_OMR_BATCH_TOTAL_BYTES) {
    return { ok: false, message: `Lote acima do limite de ${formatSafeFileSize(MAX_OMR_BATCH_TOTAL_BYTES)}.` }
  }
  for (const file of files) {
    const result = await validateOmrFile(file)
    if (!result.ok) return result
  }
  return { ok: true }
}
