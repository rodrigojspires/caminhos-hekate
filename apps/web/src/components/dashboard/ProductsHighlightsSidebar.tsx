'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Package, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

interface ProductHighlight {
  id: string
  name: string
  slug: string
  badge: string | null
  priceRange: { min: number; max: number }
}

interface ProductsResponse {
  products: ProductHighlight[]
}

const formatPrice = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ProductsHighlightsSidebar() {
  const { apply } = useDashboardVocabulary()
  const [products, setProducts] = useState<ProductHighlight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const productsRes = await fetch('/api/shop/products?featured=true&limit=6')
        const productsJson: ProductsResponse = productsRes.ok ? await productsRes.json() : { products: [] }

        if (cancelled) return

        setProducts((productsJson.products || []).slice(0, 3))
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const bannerText = useMemo(() => {
    if (products.length) return apply('Produtos e rituais materiais em destaque.')
    return apply('Nenhum destaque novo no momento.')
  }, [apply, products.length])

  return (
    <Card className="temple-card">
      <CardHeader>
        <CardTitle className="text-lg temple-section-title">{apply('Produtos em Destaque')}</CardTitle>
        <CardDescription className="text-[hsl(var(--temple-text-secondary))]">
          {bannerText}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-[hsl(var(--temple-border-subtle))] p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
            ))}
          </>
        ) : products.length ? (
          products.map((product) => {
            const min = product.priceRange?.min ?? 0
            const max = product.priceRange?.max ?? min
            const priceLabel = min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`
            return (
              <div
                key={product.id}
                className="flex items-start gap-3 rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-4"
              >
                <div className="h-10 w-10 rounded-lg bg-[hsl(var(--temple-surface-3))] flex items-center justify-center">
                  <Package className="h-5 w-5 text-[hsl(var(--temple-accent-gold))]" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[hsl(var(--temple-text-primary))]">{product.name}</p>
                    {product.badge && (
                      <Badge variant="secondary" className="temple-chip text-[10px]">
                        {apply(product.badge)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-[hsl(var(--temple-text-secondary))]">
                    <span>{priceLabel}</span>
                    <Badge variant="outline" className="temple-chip text-[10px]">
                      {apply('Loja')}
                    </Badge>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-lg border border-dashed border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--temple-accent-gold))]" />
            <p className="text-sm text-[hsl(var(--temple-text-secondary))]">
              {apply('Sem produtos disponíveis agora.')}
            </p>
          </div>
        )}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/loja">{apply('Ver loja')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
