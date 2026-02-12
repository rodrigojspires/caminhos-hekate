'use client'

const ANALYTICS_ENDPOINT = '/api/analytics/events'
const SESSION_STORAGE_KEY = 'ml_marketing_session_id'

export type MarketingTrackInput = {
  name: 'ml_page_view' | 'ml_cta_click' | 'ml_scroll_depth' | 'ml_page_exit'
  action: string
  label?: string
  value?: number
  page?: string
  properties?: Record<string, unknown>
  useBeacon?: boolean
}

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ml-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function getMarketingSessionId() {
  if (typeof window === 'undefined') return 'server'

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing

  const created = generateSessionId()
  window.localStorage.setItem(SESSION_STORAGE_KEY, created)
  return created
}

function buildPayload(input: MarketingTrackInput) {
  return {
    name: input.name,
    action: input.action,
    label: input.label,
    value: input.value,
    page: input.page || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    sessionId: getMarketingSessionId(),
    properties: input.properties || {}
  }
}

export function trackMarketingEvent(input: MarketingTrackInput) {
  if (typeof window === 'undefined') return

  const payload = buildPayload(input)
  const payloadText = JSON.stringify(payload)
  const shouldUseBeacon = Boolean(input.useBeacon && navigator.sendBeacon)

  if (shouldUseBeacon) {
    const blob = new Blob([payloadText], { type: 'application/json' })
    navigator.sendBeacon(ANALYTICS_ENDPOINT, blob)
    return
  }

  void fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: payloadText,
    keepalive: true
  }).catch(() => null)
}
