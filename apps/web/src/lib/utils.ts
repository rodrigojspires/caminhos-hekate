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

export function resolveMediaUrl(value?: string | null): string | null {
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
    // Value is not an absolute URL; continue normalizing as a path
  }

  const sanitizedPath = `/${trimmed.replace(/^\/+/, '')}`

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
