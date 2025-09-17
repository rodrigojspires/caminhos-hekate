"use client"
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default function ProductPage({ params }: { params: { slug: string } }) {
  const [product, setProduct] = useState<any>(null)
  const [variantId, setVariantId] = useState<string>('')
  const [images, setImages] = useState<string[]>([])
  const [imageIdx, setImageIdx] = useState(0)
  const [qty, setQty] = useState<number>(1)
  const router = useRouter()

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
                <option key={v.id} value={v.id} disabled={!v.active || (v.stock ?? 0) <= 0}>
                  {v.name} — {Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v.price))}
                  {(v.stock ?? 0) <= 0 ? ' (sem estoque)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="text-sm block mb-1">Quantidade</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="border rounded px-3 py-2 w-24" />
          </div>
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
