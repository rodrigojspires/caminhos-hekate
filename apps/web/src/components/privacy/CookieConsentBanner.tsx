"use client"

import { useEffect, useState } from 'react'

type Categories = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const defaultCats: Categories = { necessary: true, analytics: false, marketing: false }

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [cats, setCats] = useState<Categories>(defaultCats)

  useEffect(() => {
    try {
      const c = document.cookie.split('; ').find(x => x.startsWith('cookie_consent='))
      if (!c) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const save = async () => {
    try {
      await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentType: 'cookies', consent: cats }),
      })
    } catch {}
    setVisible(false)
  }

  const acceptAll = () => {
    setCats({ necessary: true, analytics: true, marketing: true })
    save()
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t shadow p-4 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm text-gray-700 dark:text-gray-300 flex-1">
          Usamos cookies para melhorar sua experiência. Leia nossa {" "}
          <a className="underline hover:opacity-80" href="/cookies" target="_blank" rel="noopener noreferrer">política de cookies</a>.
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <input type="checkbox" checked disabled aria-label="Cookies necessários" /> Necessários
          </label>
          <label className="text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <input type="checkbox" checked={cats.analytics} onChange={e => setCats(p => ({ ...p, analytics: e.target.checked }))} aria-label="Cookies de analytics" /> Analytics
          </label>
          <label className="text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <input type="checkbox" checked={cats.marketing} onChange={e => setCats(p => ({ ...p, marketing: e.target.checked }))} aria-label="Cookies de marketing" /> Marketing
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} className="px-3 py-2 border rounded bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">Salvar</button>
          <button onClick={acceptAll} className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700">Aceitar tudo</button>
        </div>
      </div>
    </div>
  )
}
