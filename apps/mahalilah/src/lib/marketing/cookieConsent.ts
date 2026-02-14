export const CONSENT_KEY = 'mahalilah:cookie-consent:v1'
export const CONSENT_EVENT = 'ml-cookie-consent-change'
export const CONSENT_COOKIE_NAME = 'ml_cookie_consent'
export const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

export type CookieConsentPreferences = {
  essentials: true
  analytics: boolean
  personalization: boolean
}

type StoredConsentPayload = {
  version: 1
  preferences: CookieConsentPreferences
}

export function buildAcceptedConsent(): CookieConsentPreferences {
  return {
    essentials: true,
    analytics: true,
    personalization: true
  }
}

export function buildRejectedConsent(): CookieConsentPreferences {
  return {
    essentials: true,
    analytics: false,
    personalization: false
  }
}

export function parseConsentValue(raw: string | null): CookieConsentPreferences | null {
  if (!raw) return null

  if (raw === 'accepted') return buildAcceptedConsent()
  if (raw === 'rejected') return buildRejectedConsent()

  try {
    const parsed = JSON.parse(raw) as StoredConsentPayload
    if (!parsed || parsed.version !== 1) return null

    const preferences = parsed.preferences
    if (!preferences || typeof preferences !== 'object') return null

    return {
      essentials: true,
      analytics: Boolean(preferences.analytics),
      personalization: Boolean(preferences.personalization)
    }
  } catch {
    return null
  }
}

export function serializeConsentValue(preferences: CookieConsentPreferences): string {
  const payload: StoredConsentPayload = {
    version: 1,
    preferences: {
      essentials: true,
      analytics: preferences.analytics,
      personalization: preferences.personalization
    }
  }

  return JSON.stringify(payload)
}

export function persistConsentPreferences(preferences: CookieConsentPreferences) {
  const serialized = serializeConsentValue(preferences)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CONSENT_KEY, serialized)
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: preferences }))
  }

  if (typeof document !== 'undefined') {
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE}; SameSite=Lax`
  }
}
