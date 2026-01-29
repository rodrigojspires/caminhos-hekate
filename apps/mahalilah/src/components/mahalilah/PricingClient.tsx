'use client'

import { useEffect, useState } from 'react'

type PlanConfig = {
  singleSession: { pricesByParticipants: Record<string, number>; tipsPerPlayer: number; summaryLimit: number }
  subscriptionUnlimited: { monthlyPrice: number; maxParticipants: number; tipsPerPlayer: number; summaryLimit: number }
  subscriptionLimited: { monthlyPrice: number; maxParticipants: number; roomsPerMonth: number; tipsPerPlayer: number; summaryLimit: number }
}

export function PricingClient() {
  const [config, setConfig] = useState<PlanConfig | null>(null)
  const [maxParticipants, setMaxParticipants] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/mahalilah/plans')
      if (!res.ok) return
      const data = await res.json()
      setConfig(data.plans)
    }
    load()
  }, [])

  const startCheckout = async (planType: string) => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/mahalilah/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType, maxParticipants })
    })

    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Erro ao iniciar pagamento.')
      setLoading(false)
      return
    }

    if (payload.paymentUrl) {
      window.location.href = payload.paymentUrl
    } else {
      setError('Link de pagamento não retornado.')
    }
    setLoading(false)
  }

  if (!config) {
    return <div className="card">Carregando planos...</div>
  }

  const singlePrice = config.singleSession.pricesByParticipants[String(maxParticipants)]

  return (
    <div className="grid" style={{ gap: 20 }}>
      {error && <div className="notice">{error}</div>}
      <div className="grid two">
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Sessão avulsa</h3>
          <div className="small-muted">Escolha o número de participantes antes de pagar.</div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Participantes (2–8)</span>
            <input
              type="number"
              min={2}
              max={8}
              value={maxParticipants}
              onChange={(event) => setMaxParticipants(Number(event.target.value))}
            />
          </label>
          <div><strong>R$ {singlePrice?.toFixed(2) ?? '--'}</strong></div>
          <div className="small-muted">Dicas por jogador: {config.singleSession.tipsPerPlayer} • Resumo: {config.singleSession.summaryLimit}</div>
          <button onClick={() => startCheckout('SINGLE_SESSION')} disabled={loading || !singlePrice}>
            Comprar sessão
          </button>
        </div>

        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Assinatura ilimitada</h3>
          <div><strong>R$ {config.subscriptionUnlimited.monthlyPrice.toFixed(2)} / mês</strong></div>
          <div className="small-muted">Participantes por sala: {config.subscriptionUnlimited.maxParticipants}</div>
          <div className="small-muted">Dicas por jogador: {config.subscriptionUnlimited.tipsPerPlayer} • Resumo: {config.subscriptionUnlimited.summaryLimit}</div>
          <button onClick={() => startCheckout('SUBSCRIPTION')} disabled={loading}>
            Assinar agora
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Assinatura limitada</h3>
        <div><strong>R$ {config.subscriptionLimited.monthlyPrice.toFixed(2)} / mês</strong></div>
        <div className="small-muted">Salas por mês: {config.subscriptionLimited.roomsPerMonth}</div>
        <div className="small-muted">Participantes por sala: {config.subscriptionLimited.maxParticipants}</div>
        <div className="small-muted">Dicas por jogador: {config.subscriptionLimited.tipsPerPlayer} • Resumo: {config.subscriptionLimited.summaryLimit}</div>
        <button onClick={() => startCheckout('SUBSCRIPTION_LIMITED')} disabled={loading}>
          Assinar plano limitado
        </button>
      </div>
    </div>
  )
}
