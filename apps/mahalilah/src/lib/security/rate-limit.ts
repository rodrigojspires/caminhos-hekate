import { NextResponse } from 'next/server'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

function nowMs() {
  return Date.now()
}

function cleanupExpired() {
  const now = nowMs()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export function applyRateLimit(params: {
  request: Request
  scope: string
  limit: number
  windowMs: number
}) {
  cleanupExpired()

  const ip = getClientIp(params.request)
  const key = `${params.scope}:${ip}`
  const now = nowMs()

  const current = store.get(key)
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + params.windowMs })
    return null
  }

  current.count += 1
  if (current.count <= params.limit) {
    store.set(key, current)
    return null
  }

  const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  return NextResponse.json(
    { message: 'Muitas tentativas. Tente novamente em instantes.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec)
      }
    }
  )
}
