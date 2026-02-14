'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CONSENT_KEY,
  buildAcceptedConsent,
  buildRejectedConsent,
  parseConsentValue,
  persistConsentPreferences
} from '@/lib/marketing/cookieConsent'

export function CookiePreferencesControls({
  onDecision
}: {
  onDecision?: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const [personalizationEnabled, setPersonalizationEnabled] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const openPreferences = () => {
    const current = parseConsentValue(window.localStorage.getItem(CONSENT_KEY))
    setAnalyticsEnabled(Boolean(current?.analytics))
    setPersonalizationEnabled(Boolean(current?.personalization))
    setPreferencesOpen(true)
  }

  const savePreferences = () => {
    persistConsentPreferences({
      essentials: true,
      analytics: analyticsEnabled,
      personalization: personalizationEnabled
    })
    setPreferencesOpen(false)
    onDecision?.()
  }

  const acceptAll = () => {
    persistConsentPreferences(buildAcceptedConsent())
    setPreferencesOpen(false)
    onDecision?.()
  }

  const rejectOptional = () => {
    const rejected = buildRejectedConsent()
    persistConsentPreferences(rejected)
    setAnalyticsEnabled(rejected.analytics)
    setPersonalizationEnabled(rejected.personalization)
    setPreferencesOpen(false)
    onDecision?.()
  }

  return (
    <>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={openPreferences}>
          Ajustar preferências
        </button>
        <button type="button" className="btn-primary" onClick={acceptAll}>
          Aceitar tudo
        </button>
      </div>

      {mounted && preferencesOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-[rgba(6,10,18,0.66)] px-4 py-6 sm:px-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Ajustar preferências de cookies"
              className="mx-auto max-w-2xl rounded-3xl border border-border/70 bg-[rgba(10,14,22,0.98)] p-5 shadow-soft sm:p-7"
            >
              <h3 className="font-serif text-2xl text-ink">Ajustar preferências</h3>
              <p className="mt-2 text-sm text-ink-muted">
                Escolha como os cookies serão usados no site. Cookies essenciais de login e segurança permanecem ativos.
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-border/70 bg-surface/70 p-4">
                  <p className="text-sm font-semibold text-ink">Login e essenciais</p>
                  <p className="mt-1 text-sm text-ink-muted">Necessários para autenticação, segurança e funcionamento.</p>
                  <span className="mt-2 inline-flex rounded-full border border-gold/35 px-2 py-1 text-xs uppercase tracking-[0.16em] text-gold-soft">
                    Sempre ativo
                  </span>
                </div>

                <label className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-surface/70 p-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">Analíticos</p>
                    <p className="mt-1 text-sm text-ink-muted">Medição de desempenho, estabilidade e melhoria contínua.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={analyticsEnabled}
                    onChange={(event) => setAnalyticsEnabled(event.target.checked)}
                    className="mt-1 h-5 w-5 accent-gold"
                  />
                </label>

                <label className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-surface/70 p-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">Personalização</p>
                    <p className="mt-1 text-sm text-ink-muted">Ajustes de experiência e preferência de idioma.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={personalizationEnabled}
                    onChange={(event) => setPersonalizationEnabled(event.target.checked)}
                    className="mt-1 h-5 w-5 accent-gold"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={savePreferences}>
                  Salvar preferências
                </button>
                <button type="button" className="btn-secondary" onClick={() => setPreferencesOpen(false)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
