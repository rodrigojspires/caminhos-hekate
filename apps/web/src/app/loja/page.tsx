import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'

// Avoid prerendering: this page fetches live data
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function fetchProducts(searchParams: { q?: string; category?: string; page?: string }) {
  const qs = new URLSearchParams(searchParams as any)
  const base = process.env.NEXT_PUBLIC_APP_URL
  const url = base
    ? `${base}/api/shop/products?${qs.toString()}`
    : `/api/shop/products?${qs.toString()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return { products: [], total: 0, page: 1, totalPages: 1 }
  return res.json()
}

export default async function ShopPage({ searchParams }: { searchParams: { q?: string; category?: string; page?: string } }) {
  const { products } = await fetchProducts(searchParams)
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Loja</h1>
      <Suspense fallback={<div>Carregando...</div>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p: any) => (
            <Link key={p.id} href={`/loja/${p.slug}`} className="border rounded-lg p-4 hover:shadow">
              <div className="relative aspect-square bg-muted rounded mb-3 overflow-hidden">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-muted-foreground">{p.category?.name}</div>
              <div className="mt-1 text-primary font-semibold">
                {p.priceRange.min === p.priceRange.max
                  ? Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.priceRange.min)
                  : `${Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.priceRange.min)} – ${Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.priceRange.max)}`}
              </div>
            </Link>
          ))}
        </div>
      </Suspense>
    </div>
  )
}
