'use client'

import { useMemo } from 'react'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

type Option = {
  participants: number
  price: number
}

function formatParticipants(count: number) {
  return `${count} participante${count === 1 ? '' : 's'}`
}

export function SingleSessionPrice({
  pricesByParticipants
}: {
  pricesByParticipants: Record<string, number>
}) {
  const options = useMemo(() => (
    Object.entries(pricesByParticipants)
      .map(([participants, price]) => ({ participants: Number(participants), price }))
      .filter((option) => Number.isFinite(option.participants) && Number.isFinite(option.price))
      .sort((a, b) => a.participants - b.participants)
  ), [pricesByParticipants])

  const lowestPrice = options.reduce((lowest, current) => (
    current.price < lowest ? current.price : lowest
  ), options[0]?.price ?? 0)

  if (!options.length) {
    return <span className="text-sm text-ink-muted">Valores indisponiveis</span>
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="font-serif text-3xl text-ink">
        a partir de {currencyFormatter.format(lowestPrice)}
      </span>
      <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Faixas por participantes</p>
      <ul className="space-y-1 text-sm text-ink-muted">
        {options.map((option) => (
          <li key={option.participants} className="flex items-center justify-between gap-3">
            <span>{formatParticipants(option.participants)}</span>
            <strong className="text-ink">{currencyFormatter.format(option.price)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
