'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CookiePreferencesControls } from '@/components/marketing/CookiePreferencesControls'
import {
  CONSENT_KEY,
  parseConsentValue
} from '@/lib/marketing/cookieConsent'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const parsed = parseConsentValue(window.localStorage.getItem(CONSENT_KEY))
    setVisible(!parsed)
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
          <p>O nosso site utiliza cookies para melhorar a navegação.</p>
          <p className="mt-2">
            Veja nossa <Link href="/cookies" className="text-gold">Política de Cookies</Link>.
          </p>
        </div>
        <CookiePreferencesControls onDecision={() => setVisible(false)} />
      </div>
    </div>
  )
}
