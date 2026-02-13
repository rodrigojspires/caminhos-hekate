'use client'

import { useEffect, useMemo, useState } from 'react'

type BillingInterval = 'MONTHLY' | 'YEARLY'

type PlanConfig = {
  singleSession: { pricesByParticipants: Record<string, number>; tipsPerPlayer: number; summaryLimit: number; isActive: boolean }
  subscriptionUnlimited: { monthlyPrice: number; yearlyPrice: number; maxParticipants: number; tipsPerPlayer: number; summaryLimit: number; isActive: boolean }
  subscriptionLimited: { monthlyPrice: number; yearlyPrice: number; maxParticipants: number; roomsPerMonth: number; tipsPerPlayer: number; summaryLimit: number; isActive: boolean }
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const formatCurrency = (value: number) => currencyFormatter.format(value)

const getAnnualSavingsPercent = (monthlyPrice: number, yearlyPrice: number) => {
  if (!Number.isFinite(monthlyPrice) || !Number.isFinite(yearlyPrice)) return null
  if (monthlyPrice <= 0 || yearlyPrice <= 0) return null
  const annualizedMonthly = monthlyPrice * 12
  if (annualizedMonthly <= 0) return null
  const savings = ((annualizedMonthly - yearlyPrice) / annualizedMonthly) * 100
  if (savings <= 0) return null
  return Math.round(savings)
}

export function PricingClient() {
  const [config, setConfig] = useState<PlanConfig | null>(null)
  const [maxParticipants, setMaxParticipants] = useState(4)
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('MONTHLY')
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

  const startCheckout = async (planType: string, interval?: BillingInterval) => {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/mahalilah/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planType,
        maxParticipants,
        billingInterval: interval || 'MONTHLY'
      })
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
  const unlimitedPrice = billingInterval === 'YEARLY'
    ? config.subscriptionUnlimited.yearlyPrice
    : config.subscriptionUnlimited.monthlyPrice
  const limitedPrice = billingInterval === 'YEARLY'
    ? config.subscriptionLimited.yearlyPrice
    : config.subscriptionLimited.monthlyPrice
  const unlimitedSavingsPercent = getAnnualSavingsPercent(
    config.subscriptionUnlimited.monthlyPrice,
    config.subscriptionUnlimited.yearlyPrice
  )
  const limitedSavingsPercent = getAnnualSavingsPercent(
    config.subscriptionLimited.monthlyPrice,
    config.subscriptionLimited.yearlyPrice
  )
  const unlimitedMonthlyEquivalent = config.subscriptionUnlimited.yearlyPrice / 12
  const limitedMonthlyEquivalent = config.subscriptionLimited.yearlyPrice / 12
  const intervalLabel = billingInterval === 'YEARLY' ? 'ano' : 'mês'

  return (
    <div className="grid" style={{ gap: 20 }}>
      {error && <div className="notice">{error}</div>}
      <div className="card" style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={billingInterval === 'MONTHLY' ? '' : 'secondary'}
          onClick={() => setBillingInterval('MONTHLY')}
          disabled={loading}
        >
          Mensal
        </button>
        <button
          type="button"
          className={billingInterval === 'YEARLY' ? '' : 'secondary'}
          onClick={() => setBillingInterval('YEARLY')}
          disabled={loading}
        >
          Anual
          {unlimitedSavingsPercent !== null && (
            <span style={{ marginLeft: 6, fontSize: 12 }}>
              ({unlimitedSavingsPercent}% OFF)
            </span>
          )}
        </button>
      </div>
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
          <button onClick={() => startCheckout('SINGLE_SESSION', 'MONTHLY')} disabled={loading || !singlePrice || !config.singleSession.isActive}>
            Comprar sessão
          </button>
        </div>

        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>Assinatura ilimitada</h3>
          {unlimitedSavingsPercent !== null && (
            <span className="pill" style={{ width: 'fit-content' }}>
              Economize {unlimitedSavingsPercent}% no anual
            </span>
          )}
          <div><strong>{formatCurrency(unlimitedPrice)} / {intervalLabel}</strong></div>
          {billingInterval === 'YEARLY' && (
            <div className="small-muted">Equivalente a {formatCurrency(unlimitedMonthlyEquivalent)} / mês</div>
          )}
          <div className="small-muted">Participantes por sala: {config.subscriptionUnlimited.maxParticipants}</div>
          <div className="small-muted">Dicas por jogador: {config.subscriptionUnlimited.tipsPerPlayer} • Resumo: {config.subscriptionUnlimited.summaryLimit}</div>
          <button onClick={() => startCheckout('SUBSCRIPTION', billingInterval)} disabled={loading || !config.subscriptionUnlimited.isActive}>
            Assinar agora
          </button>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Assinatura limitada</h3>
        {limitedSavingsPercent !== null && (
          <span className="pill" style={{ width: 'fit-content' }}>
            Economize {limitedSavingsPercent}% no anual
          </span>
        )}
        <div><strong>{formatCurrency(limitedPrice)} / {intervalLabel}</strong></div>
        {billingInterval === 'YEARLY' && (
          <div className="small-muted">Equivalente a {formatCurrency(limitedMonthlyEquivalent)} / mês</div>
        )}
        <div className="small-muted">Salas por mês: {config.subscriptionLimited.roomsPerMonth}</div>
        <div className="small-muted">Participantes por sala: {config.subscriptionLimited.maxParticipants}</div>
        <div className="small-muted">Dicas por jogador: {config.subscriptionLimited.tipsPerPlayer} • Resumo: {config.subscriptionLimited.summaryLimit}</div>
        <button onClick={() => startCheckout('SUBSCRIPTION_LIMITED', billingInterval)} disabled={loading || !config.subscriptionLimited.isActive}>
          Assinar plano limitado
        </button>
      </div>
    </div>
  )
}
