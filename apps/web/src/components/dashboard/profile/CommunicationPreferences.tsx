"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function CommunicationPreferences() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    email: true,
    whatsapp: false,
    whatsappNumber: '',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  })

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/user/notifications/preferences', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setForm(prev => ({ ...prev, ...data }))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/user/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Carregando preferências…</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferências de Comunicação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">E‑mail</div>
            <div className="text-sm text-muted-foreground">Receber notificações por e‑mail</div>
          </div>
          <button
            onClick={() => setForm(prev => ({ ...prev, email: !prev.email }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.email ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.email ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">WhatsApp</div>
              <div className="text-sm text-muted-foreground">Receber notificações via WhatsApp</div>
            </div>
            <button
              onClick={() => setForm(prev => ({ ...prev, whatsapp: !prev.whatsapp }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.whatsapp ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.whatsapp ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {form.whatsapp && (
            <input
              type="tel"
              placeholder="Número com DDD"
              value={form.whatsappNumber}
              onChange={(e) => setForm(prev => ({ ...prev, whatsappNumber: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Horário silencioso</div>
              <div className="text-sm text-muted-foreground">Silencia notificações em um período</div>
            </div>
            <button
              onClick={() => setForm(prev => ({ ...prev, quietHoursEnabled: !prev.quietHoursEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.quietHoursEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.quietHoursEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {form.quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Início</label>
                <input type="time" value={form.quietHoursStart} onChange={(e) => setForm(prev => ({ ...prev, quietHoursStart: e.target.value }))} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-sm">Fim</label>
                <input type="time" value={form.quietHoursEnd} onChange={(e) => setForm(prev => ({ ...prev, quietHoursEnd: e.target.value }))} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar preferências'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

