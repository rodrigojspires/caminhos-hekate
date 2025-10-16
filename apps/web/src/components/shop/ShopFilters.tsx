"use client"

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ShopFilters({ category }: { category?: string }) {
  const sp = useSearchParams()
  const priceMin = sp?.get('priceMin') ?? ''
  const priceMax = sp?.get('priceMax') ?? ''
  const initialTypes = (sp?.get('type') ?? '').split(',').filter(Boolean)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes)
  const availability = sp?.get('availability') ?? ''

  function toggleType(t: string, checked: boolean) {
    setSelectedTypes((prev) => {
      const set = new Set(prev)
      if (checked) set.add(t)
      else set.delete(t)
      return Array.from(set)
    })
  }

  const typeValue = useMemo(() => selectedTypes.join(','), [selectedTypes])

  return (
    <form method="get" className="space-y-6">
      {category ? <input type="hidden" name="category" value={category} /> : null}
      <input type="hidden" name="type" value={typeValue} />

      <div>
        <div className="font-semibold mb-2">Faixa de preço</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="priceMin"
            min={0}
            placeholder="Mín. (R$)"
            defaultValue={priceMin}
            className="w-1/2 rounded-md border bg-background px-3 py-2"
          />
          <input
            type="number"
            name="priceMax"
            min={0}
            placeholder="Máx. (R$)"
            defaultValue={priceMax}
            className="w-1/2 rounded-md border bg-background px-3 py-2"
          />
        </div>
      </div>

      <div>
        <div className="font-semibold mb-2">Tipo de produto</div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={initialTypes.includes('PHYSICAL')}
            onChange={(e) => toggleType('PHYSICAL', e.currentTarget.checked)}
          />
          Físico
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            defaultChecked={initialTypes.includes('DIGITAL')}
            onChange={(e) => toggleType('DIGITAL', e.currentTarget.checked)}
          />
          Digital
        </label>
      </div>

      <div>
        <div className="font-semibold mb-2">Disponibilidade</div>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="availability" value="in_stock" defaultChecked={availability === 'in_stock'} />
          Em estoque
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="availability" value="on_demand" defaultChecked={availability === 'on_demand'} />
          Sob encomenda
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="availability" value="" defaultChecked={!availability} />
          Qualquer
        </label>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-mystic-enhanced">Aplicar</button>
        <a href={category ? `/loja?category=${category}` : '/loja'} className="border border-hekate-gold/40 text-hekate-gold px-4 py-2 rounded-md hover:bg-hekate-gold/10">Limpar</a>
      </div>
    </form>
  )
}
