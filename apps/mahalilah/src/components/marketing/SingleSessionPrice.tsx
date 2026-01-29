'use client'

import { useMemo, useState } from 'react'

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

  const [participants, setParticipants] = useState(options[0]?.participants ?? 1)
  const selected = options.find((option) => option.participants === participants) ?? options[0]

  if (!options.length) {
    return <span className="text-sm text-ink-muted">Valores indisponiveis</span>
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="font-serif text-3xl text-ink">
        {currencyFormatter.format(selected?.price ?? 0)}
      </span>
      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-ink-muted">
        Participantes
        <select
          className="rounded-full border border-border bg-[#0f141f] px-4 py-2 text-sm font-semibold text-ink"
          value={participants}
          onChange={(event) => setParticipants(Number(event.target.value))}
        >
          {options.map((option) => (
            <option key={option.participants} value={option.participants}>
              {formatParticipants(option.participants)}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
