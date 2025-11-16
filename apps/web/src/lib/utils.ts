import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency to Brazilian Real
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Format date to Brazilian format
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(dateObj)
}

// Format date and time to Brazilian format
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(dateObj)
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function normalizeMediaPath(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('data:')) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    return url.toString()
  } catch {
    // not an absolute URL, normalize as relative path
  }

  const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+\//i, '/')
  const cleaned = withoutOrigin
    .replace(/[\r\n\t]+/g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/(\.\.\/)+/g, '')
    .replace(/\/\.\//g, '/')

  const withLeadingSlash = cleaned.startsWith('/') ? cleaned : `/${cleaned.replace(/^\/+/, '')}`
  return withLeadingSlash
}

const COURSE_VIDEO_PREFIX = '/course-videos/'
const PRIVATE_COURSE_VIDEO_PREFIX = '/private/course-videos/'
const PUBLIC_UPLOAD_PREFIX = '/uploads/'
const API_UPLOAD_PREFIX = '/api/media/public/uploads/'

export function isProtectedCourseVideoPath(value?: string | null): boolean {
  const normalized = normalizeMediaPath(value)
  if (!normalized) return false
  try {
    const url = new URL(normalized)
    return url.pathname.startsWith(PRIVATE_COURSE_VIDEO_PREFIX)
  } catch {
    return normalized.startsWith(PRIVATE_COURSE_VIDEO_PREFIX)
  }
}

export function getCourseVideoRelativePath(value?: string | null): string | null {
  const normalized = normalizeMediaPath(value)
  if (!normalized) return null

  let candidate = normalized
  try {
    const url = new URL(normalized)
    candidate = url.pathname
  } catch {
    // keep candidate as-is for relative paths
  }

  const stripped = candidate
    .replace(/^\/+/, '/')
    .replace(new RegExp(`^${API_UPLOAD_PREFIX.replace(/\//g, '\\/')}`, 'i'), '/')
    .replace(new RegExp(`^${PUBLIC_UPLOAD_PREFIX.replace(/\//g, '\\/')}`, 'i'), '/')
    .replace(new RegExp(`^${PRIVATE_COURSE_VIDEO_PREFIX.replace(/\//g, '\\/')}`, 'i'), COURSE_VIDEO_PREFIX)

  const relativeRaw = stripped.startsWith(COURSE_VIDEO_PREFIX)
    ? stripped.slice(COURSE_VIDEO_PREFIX.length)
    : stripped.startsWith('/course-videos/')
      ? stripped.replace(/^\/course-videos\//, '')
      : stripped.startsWith('course-videos/')
        ? stripped.replace(/^course-videos\//, '')
        : null

  if (!relativeRaw) return null

  const safeSegments = relativeRaw
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0 && segment !== '.' && segment !== '..' && !segment.includes('..'))

  if (safeSegments.length === 0) return null

  return `course-videos/${safeSegments.join('/')}`
}

export function resolveMediaUrl(value?: string | null): string | null {
  const normalized = normalizeMediaPath(value)
  if (!normalized) return null

  if (normalized.startsWith('data:')) {
    return normalized
  }

  try {
    const url = new URL(normalized)
    return url.toString()
  } catch {
    // Value is not an absolute URL; continue normalizing as a path
  }

  const sanitizedPath = normalized.startsWith('/') ? normalized : `/${normalized.replace(/^\/+/, '')}`

  // Para arquivos em /uploads, preferir a origem atual no navegador (dev/local)
  if (sanitizedPath.startsWith('/uploads/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${sanitizedPath}`
    }

    const base =
      process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      ''

    if (base) {
      const normalizedBase = base.replace(/\/$/, '')
      return `${normalizedBase}${sanitizedPath}`
    }

    return sanitizedPath
  }

  // Para outros paths relativos, seguir a mesma lógica
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${sanitizedPath}`
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    ''

  if (base) {
    const normalizedBase = base.replace(/\/$/, '')
    return `${normalizedBase}${sanitizedPath}`
  }

  return sanitizedPath
}
