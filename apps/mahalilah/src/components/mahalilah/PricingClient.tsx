'use client'

import { useEffect, useMemo, useState } from 'react'

type PlanConfig = {
  singleSession: { pricesByParticipants: Record<string, number>; tipsPerPlayer: number; summaryLimit: number; isActive: boolean }
  subscriptionUnlimited: { monthlyPrice: number; maxParticipants: number; tipsPerPlayer: number; summaryLimit: number; isActive: boolean }
  subscriptionLimited: { monthlyPrice: number; maxParticipants: number; roomsPerMonth: number; tipsPerPlayer: number; summaryLimit: number; isActive: boolean }
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const formatCurrency = (value: number) => currencyFormatter.format(value)

export function PricingClient() {
  const [config, setConfig] = useState<PlanConfig | null>(null)
  const [maxParticipants, setMaxParticipants] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const participantOptions = useMemo(() => {
    if (!config) return []
    return Object.entries(config.singleSession.pricesByParticipants)
      .map(([participants, price]) => ({ participants: Number(participants), price }))
      .filter((option) => Number.isFinite(option.participants) && Number.isFinite(option.price))
      .sort((a, b) => a.participants - b.participants)
  }, [config])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/mahalilah/plans')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error || 'Não foi possível carregar os planos.')
          return
        }
        setConfig(data.plans)
      } catch {
        setError('Não foi possível carregar os planos.')
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!participantOptions.length) return
    if (!participantOptions.some((option) => option.participants === maxParticipants)) {
      setMaxParticipants(participantOptions[0].participants)
    }
  }, [participantOptions, maxParticipants])

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
    return <div className="card">{error || 'Carregando planos...'}</div>
  }

  const selectedOption = participantOptions.find((option) => option.participants === maxParticipants) ?? participantOptions[0]
  const singlePrice = selectedOption?.price

  return (
    <div className="grid" style={{ gap: 20 }}>
      {error && <div className="notice">{error}</div>}
      <div className="grid two">
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Sessão avulsa</h3>
          <div className="small-muted">Escolha o número de participantes antes de pagar.</div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Participantes</span>
            <select
              className="rounded-full border border-border bg-[#0f141f] px-4 py-2 text-sm text-ink"
              value={selectedOption?.participants ?? ''}
              onChange={(event) => setMaxParticipants(Number(event.target.value))}
            >
              {participantOptions.map((option) => (
                <option key={option.participants} value={option.participants}>
                  {option.participants} participante{option.participants === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </label>
          <div><strong>{singlePrice ? formatCurrency(singlePrice) : '--'}</strong></div>
          <div className="small-muted">Dicas por jogador: {config.singleSession.tipsPerPlayer} • Resumo: {config.singleSession.summaryLimit}</div>
          <button onClick={() => startCheckout('SINGLE_SESSION')} disabled={loading || !singlePrice || !config.singleSession.isActive}>
            Comprar sessão
          </button>
        </div>

        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Assinatura ilimitada</h3>
          <div><strong>{formatCurrency(config.subscriptionUnlimited.monthlyPrice)} / mês</strong></div>
          <div className="small-muted">Participantes por sala: {config.subscriptionUnlimited.maxParticipants}</div>
          <div className="small-muted">Dicas por jogador: {config.subscriptionUnlimited.tipsPerPlayer} • Resumo: {config.subscriptionUnlimited.summaryLimit}</div>
          <button onClick={() => startCheckout('SUBSCRIPTION')} disabled={loading || !config.subscriptionUnlimited.isActive}>
            Assinar agora
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Assinatura limitada</h3>
        <div><strong>{formatCurrency(config.subscriptionLimited.monthlyPrice)} / mês</strong></div>
        <div className="small-muted">Salas por mês: {config.subscriptionLimited.roomsPerMonth}</div>
        <div className="small-muted">Participantes por sala: {config.subscriptionLimited.maxParticipants}</div>
        <div className="small-muted">Dicas por jogador: {config.subscriptionLimited.tipsPerPlayer} • Resumo: {config.subscriptionLimited.summaryLimit}</div>
        <button onClick={() => startCheckout('SUBSCRIPTION_LIMITED')} disabled={loading || !config.subscriptionLimited.isActive}>
          Assinar plano limitado
        </button>
      </div>
    </div>
  )
}
