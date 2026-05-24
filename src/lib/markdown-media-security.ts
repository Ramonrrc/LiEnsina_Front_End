export const MAX_MARKDOWN_DATA_IMAGE_BYTES = 512 * 1024

const dataImagePattern = /^data:image\/(png|jpe?g|webp);base64,/i

export type SafePrintableImage = {
  url: string
  alt: string
}

function estimateBase64Bytes(value: string) {
  const base64 = value.split(',', 2)[1] ?? ''
  return Math.floor((base64.replace(/=+$/, '').length * 3) / 4)
}

function isRelativeAssetUrl(value: string) {
  return value.startsWith('/') && !value.startsWith('//')
}

function cleanAlt(value: unknown) {
  return String(value ?? 'Imagem')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160) || 'Imagem'
}

export function safeMarkdownImageUrl(
  value: unknown,
  options: { resolveRelativeUrl?: (url: string) => string | undefined; allowBlob?: boolean } = {},
) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  if (dataImagePattern.test(raw)) {
    return estimateBase64Bytes(raw) <= MAX_MARKDOWN_DATA_IMAGE_BYTES ? raw : null
  }

  if (options.allowBlob && /^blob:/i.test(raw)) return raw

  if (isRelativeAssetUrl(raw)) {
    return options.resolveRelativeUrl?.(raw) ?? raw
  }

  return null
}

export function uniqueSafePrintableImages<T extends { url?: string | null; alt?: string | null }>(
  images: T[],
  options: { resolveRelativeUrl?: (url: string) => string | undefined; allowBlob?: boolean } = {},
) {
  const seen = new Set<string>()
  const safeImages: SafePrintableImage[] = []

  for (const image of images) {
    const url = safeMarkdownImageUrl(image.url, options)
    if (!url || seen.has(url)) continue
    seen.add(url)
    safeImages.push({ url, alt: cleanAlt(image.alt) })
  }

  return safeImages
}
