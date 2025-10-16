"use client"
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { broadcastCartUpdate } from '@/lib/shop/client/cartEvents'

export default function ProductPage({ params }: { params: { slug: string } }) {
  const [product, setProduct] = useState<any>(null)
  const [variantId, setVariantId] = useState<string>('')
  const [images, setImages] = useState<string[]>([])
  const [imageIdx, setImageIdx] = useState(0)
  const [qty, setQty] = useState<number>(1)
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams?.get('from')
  const backTarget = fromParam && fromParam.startsWith('/') ? fromParam : '/loja'

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/shop/products/${params.slug}`)
      const data = await res.json()
      const p = data.product
      setProduct(p)

      // Escolhe variação inicial habilitada (ativa e com estoque)
      const list: any[] = p?.variants || []
      const preferred = list.find((v: any) => (v.attributes as any)?.primary && v.active && (v.stock ?? 0) > 0)
      const enabled = preferred || list.find((v: any) => v.active && (v.stock ?? 0) > 0)
      const initialVariantId = enabled?.id || p?.variants?.[0]?.id || ''
      setVariantId(initialVariantId)

      // Lista de imagens: prioriza imagens da variação (se houver em attributes.images)
      const v0 = (p?.variants || []).find((v: any) => v.id === initialVariantId)
      const varImgs0 = Array.isArray((v0?.attributes as any)?.images) ? (v0!.attributes as any).images : []
      const prodImgs0 = Array.isArray(p?.images) ? p.images : []
      const seen0 = new Set<string>()
      const imgs = [...varImgs0, ...prodImgs0].filter((src) => (src && !seen0.has(src) ? (seen0.add(src), true) : false))
      setImages(imgs)
      setImageIdx(0)
    })()
  }, [params.slug])

  // Variedade selecionada
  const selectedVariant = useMemo(() => (product?.variants || []).find((v: any) => v.id === variantId), [product, variantId])

  // Atualiza galeria quando muda a variação
  useEffect(() => {
    if (!product) return
    const v = (product?.variants || []).find((x: any) => x.id === variantId)
    const varImgs = Array.isArray((v?.attributes as any)?.images) ? (v!.attributes as any).images : []
    const prodImgs = Array.isArray(product?.images) ? product.images : []
    // combinar variação + produto, removendo duplicados
    const seen = new Set<string>()
    const imgs = [...varImgs, ...prodImgs].filter((src) => (src && !seen.has(src) ? (seen.add(src), true) : false))
    setImages(imgs)
    setImageIdx(0)
  }, [variantId, product])

  const addToCart = async () => {
    if (!variantId) return
    const cartRes = await fetch('/api/shop/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, variantId, quantity: qty }),
    })
    if (cartRes.ok) {
      const payload = await cartRes.json().catch(() => null)
      if (payload?.cart) broadcastCartUpdate(payload.cart)
    }
    router.push('/carrinho')
  }

  if (!product) return <div className="container mx-auto py-8">Carregando...</div>

  const typeMeta =
    product?.type === 'DIGITAL'
      ? {
          label: 'Produto Digital',
          className: 'border-indigo-400/40 bg-indigo-500/10 text-indigo-200',
        }
      : {
          label: 'Produto Físico',
          className: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
        }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          type="button"
          variant="ghost"
          className="inline-flex items-center gap-2 px-0 text-hekate-gold hover:text-hekate-pearl"
          onClick={() => router.push(backTarget)}
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para a loja
        </Button>
      </div>
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
            {images[imageIdx] ? (
              <Image
                src={images[imageIdx]}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            ) : null}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {images.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  className={`relative aspect-square rounded overflow-hidden border ${i === imageIdx ? 'border-primary' : 'border-muted'}`}
                  onClick={() => setImageIdx(i)}
                >
                  <Image src={src} alt={`thumb-${i}`} fill sizes="100px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <Badge variant="outline" className={`uppercase tracking-wide ${typeMeta.className}`}>
              {typeMeta.label}
            </Badge>
          </div>
          <p className="text-muted-foreground mb-4">{product.shortDescription || product.description}</p>

          {/* Linha com seleção/quantidade à esquerda e preço à direita */}
          {(() => {
            const price = Number(selectedVariant?.price || 0)
            const compare = selectedVariant?.comparePrice != null ? Number(selectedVariant.comparePrice) : null
            const hasDiscount = compare != null && compare > price
            const discountPct = hasDiscount ? Math.round(((compare - price) / compare) * 100) : 0
            const stock = selectedVariant?.stock ?? 0
            const formatBRL = (v: number) => Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

            const dec = () => setQty((q) => Math.max(1, q - 1))
            const inc = () => setQty((q) => Math.max(1, Math.min(stock || 9999, q + 1)))

            return (
              <div className="flex items-start justify-between gap-6 mb-4">
                {/* Esquerda: variação + stepper + estoque */}
                <div className="flex-1 min-w-0">
                  {Array.isArray(product.variants) && product.variants.length > 1 ? (
                    <div className="mb-3">
                      <label className="text-sm block mb-1">Variação</label>
                      <select
                        value={variantId}
                        onChange={(e) => setVariantId(e.target.value)}
                        className="border rounded px-3 py-2 w-full"
                      >
                        {product.variants.map((v: any) => (
                          <option key={v.id} value={v.id} disabled={!v.active || (v.stock ?? 0) <= 0}>
                            {v.name} — {formatBRL(Number(v.price))}{(v.stock ?? 0) <= 0 ? ' (sem estoque)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center border rounded-lg px-3 py-1.5 gap-6">
                      <button className="text-xl" onClick={dec} aria-label="Diminuir">−</button>
                      <div className="w-6 text-center select-none">{qty}</div>
                      <button className="text-xl text-primary" onClick={inc} aria-label="Aumentar">+</button>
                    </div>
                    {typeof stock === 'number' && (
                      <div className="text-sm text-muted-foreground">+{stock} disponíveis</div>
                    )}
                  </div>
                </div>

                {/* Direita: preço destacado */}
                <div className="text-right w-44">
                  {hasDiscount && (
                    <div className="text-sm text-green-600">-{discountPct}% <span className="text-muted-foreground line-through">{formatBRL(compare!)}</span></div>
                  )}
                  <div className="text-3xl font-semibold">{formatBRL(price)}</div>
                </div>
              </div>
            )
          })()}

          <Button
            onClick={() => {
              // atualiza imagens quando troca variação (se tiver imagens da variação)
              const v = (product?.variants || []).find((x: any) => x.id === variantId)
              const varImgs = Array.isArray((v?.attributes as any)?.images) ? (v!.attributes as any).images : undefined
              if (Array.isArray(varImgs) && varImgs.length) {
                setImages(varImgs)
                setImageIdx(0)
              } else if (Array.isArray(product?.images)) {
                setImages(product.images)
                setImageIdx(0)
              }
              addToCart()
            }}
            disabled={!variantId || !selectedVariant || !selectedVariant.active || (selectedVariant.stock ?? 0) <= 0}
          >
            Adicionar ao carrinho
          </Button>
        </div>
      </div>
    </div>
  )
}
