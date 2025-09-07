"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type StatusResponse = {
  subscription?: {
    id: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    plan: { id: string; name: string; price: number; interval: 'MONTHLY' | 'YEARLY'; features: string[] }
  }
  nextPayment?: { amount: number; dueDate: string; description: string }
  history?: Array<{ id: string; amount: number; createdAt: string; status: string; provider: string }>
}

export default function SubscriptionSettings() {
  const [data, setData] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/payments/status', { cache: 'no-store' })
        const json = await res.json()
        setData(json)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const toggleAutoRenew = async () => {
    if (!data?.subscription) return
    setToggling(true)
    try {
      const res = await fetch(`/api/payments/subscriptions/${data.subscription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtPeriodEnd: !data.subscription.cancelAtPeriodEnd }),
      })
      if (res.ok) {
        const updated = await res.json()
        setData(prev => prev ? { ...prev, subscription: { ...prev.subscription!, cancelAtPeriodEnd: updated.data.cancelAtPeriodEnd } } : prev)
      }
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <div>Carregando assinatura...</div>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinatura</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.subscription ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{data.subscription.plan.name}</div>
                <div className="text-sm text-muted-foreground">
                  Status: {data.subscription.status} • Ciclo: {data.subscription.plan.interval === 'YEARLY' ? 'Anual' : 'Mensal'}
                </div>
                {data.nextPayment && (
                  <div className="text-sm text-muted-foreground">
                    Próxima cobrança: R$ {data.nextPayment.amount.toFixed(2)} em {new Date(data.nextPayment.dueDate).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">Auto‑renovar</span>
                <button
                  onClick={toggleAutoRenew}
                  disabled={toggling}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    !data.subscription.cancelAtPeriodEnd ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      !data.subscription.cancelAtPeriodEnd ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline">
                <a href="/api/payments/invoice/current">Baixar fatura atual</a>
              </Button>
              <Button asChild variant="ghost">
                <a href="/dashboard/subscription">Ver detalhes</a>
              </Button>
            </div>

            {data.history && data.history.length > 0 && (
              <div className="mt-4">
                <div className="font-medium mb-2">Histórico recente</div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {data.history.map(h => (
                    <li key={h.id}>
                      {new Date(h.createdAt).toLocaleDateString('pt-BR')} • {h.provider} • {h.status} • R$ {Number(h.amount || 0).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="mb-2">Você não possui assinatura ativa.</div>
            <Button asChild>
              <a href="/precos">Ver planos</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

