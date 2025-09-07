"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function ProductPage({ params }: { params: { slug: string } }) {
  const [product, setProduct] = useState<any>(null)
  const [variantId, setVariantId] = useState<string>('')
  const [qty, setQty] = useState<number>(1)
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/shop/products/${params.slug}`)
      const data = await res.json()
      setProduct(data.product)
      setVariantId(data.product?.variants?.[0]?.id || '')
    })()
  }, [params.slug])

  const addToCart = async () => {
    if (!variantId) return
    await fetch('/api/shop/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, variantId, quantity: qty }),
    })
    router.push('/carrinho')
  }

  if (!product) return <div className="container mx-auto py-8">Carregando...</div>

  return (
    <div className="container mx-auto py-8">
      {/* JSON-LD Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org/',
          '@type': 'Product',
          name: product.name,
          description: product.shortDescription || product.description,
          image: Array.isArray(product.images) ? product.images : [],
          sku: product.variants?.[0]?.sku,
          offers: product.variants?.map((v: any) => ({
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: Number(v.price || 0),
            availability: (v.stock || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          })) || [],
        }) }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="relative aspect-square bg-muted rounded overflow-hidden">
            {Array.isArray(product.images) && product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            ) : null}
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
          <p className="text-muted-foreground mb-4">{product.shortDescription || product.description}</p>
          <div className="mb-4">
            <label className="text-sm block mb-1">Variação</label>
            <select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              className="border rounded px-3 py-2 w-full"
            >
              {product.variants.map((v: any) => (
                <option key={v.id} value={v.id} disabled={!v.active || v.stock <= 0}>
                  {v.name} — {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v.price))}
                  {v.stock <= 0 ? ' (sem estoque)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="text-sm block mb-1">Quantidade</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="border rounded px-3 py-2 w-24" />
          </div>
          <button onClick={addToCart} className="bg-primary text-white rounded px-4 py-2">Adicionar ao carrinho</button>
        </div>
      </div>
    </div>
  )
}
