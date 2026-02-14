'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const CONSENT_KEY = 'mahalilah:cookie-consent:v1'
const CONSENT_EVENT = 'ml-cookie-consent-change'
const CONSENT_COOKIE_NAME = 'ml_cookie_consent'
const CONSENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 180

type ConsentValue = 'accepted' | 'rejected'

function persistConsent(value: ConsentValue) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CONSENT_KEY, value)
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }))
  }
  if (typeof document !== 'undefined') {
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE}; SameSite=Lax`
  }
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const current = window.localStorage.getItem(CONSENT_KEY)
    setVisible(!current)
  }, [])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl border border-border/70 bg-[rgba(10,14,22,0.96)] p-4 shadow-soft sm:bottom-6 sm:left-6 sm:right-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl text-sm text-ink-muted">
          Usamos cookies essenciais para login e segurança. Cookies analíticos só são ativados com seu consentimento.
          <span className="ml-1">
            Veja nossa <Link href="/cookies" className="text-gold">Política de Cookies</Link>.
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              persistConsent('rejected')
              setVisible(false)
            }}
          >
            Rejeitar analíticos
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              persistConsent('accepted')
              setVisible(false)
            }}
          >
            Aceitar analíticos
          </button>
        </div>
      </div>
    </div>
  )
}
