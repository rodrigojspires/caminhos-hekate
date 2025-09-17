"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

type Product = {
  id: string
  slug: string
  name: string
  image: string | null
  priceRange: { min: number; max: number }
  inStock?: boolean
  badge?: string | null
}

export default function ProductCard({ product }: { product: Product }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  const priceLabel = product.priceRange.min === product.priceRange.max
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.priceRange.min)
    : `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.priceRange.min)} – ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.priceRange.max)}`

  async function addToCart() {
    try {
      setAdding(true)
      setAdded(false)
      const res = await fetch(`/api/shop/products/${product.slug}`)
      const { product: full } = await res.json()
      const variants = (full?.variants || []).filter((v: any) => v.active)
      if (!variants.length) return
      const chosen = variants.find((v: any) => v.stock > 0) || variants[0]
      await fetch('/api/shop/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: full.id, variantId: chosen.id, quantity: 1 }),
      })
      setAdded(true)
    } finally {
      setAdding(false)
      setTimeout(() => setAdded(false), 2000)
    }
  }

  return (
    <div className="card-mystic-3d p-4 h-full flex flex-col">
      <div className="relative aspect-square bg-hekate-gray-900 rounded mb-3 overflow-hidden">
        {product.image && (
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" />
        )}
        {product.badge && (
          <span className="absolute top-2 left-2 text-[11px] uppercase tracking-wide bg-hekate-gold text-hekate-black px-2 py-1 rounded">
            {product.badge}
          </span>
        )}
      </div>
      <Link href={`/loja/${product.slug}`} className="font-medium text-hekate-pearl hover:text-hekate-gold transition-colors line-clamp-2">
        {product.name}
      </Link>
      <div className="mt-1 text-hekate-gold font-semibold">{priceLabel}</div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={addToCart}
          disabled={adding}
          className="btn-mystic-enhanced flex-1 text-center"
        >
          {adding ? 'Adicionando...' : added ? 'Adicionado!' : 'Adicionar ao Carrinho'}
        </button>
        <Link href={`/loja/${product.slug}`} className="border border-hekate-gold text-hekate-gold px-4 py-3 rounded-lg hover:bg-hekate-gold/10">
          Ver
        </Link>
      </div>
    </div>
  )
}

