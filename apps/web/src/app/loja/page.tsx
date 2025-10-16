import { Suspense } from 'react'
import ShopBanner from '@/components/shop/ShopBanner'
import ShopCategoryNav from '@/components/shop/ShopCategoryNav'
import ShopFilters from '@/components/shop/ShopFilters'
import ProductCard from '@/components/shop/ProductCard'

// Avoid prerendering: this page fetches live data
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function fetchProducts(queryString: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL
  const url = base
    ? `${base}/api/shop/products${queryString ? `?${queryString}` : ''}`
    : `/api/shop/products${queryString ? `?${queryString}` : ''}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return { products: [], total: 0, page: 1, totalPages: 1 }
  return res.json()
}

async function fetchCategories() {
  const base = process.env.NEXT_PUBLIC_APP_URL
  const url = base ? `${base}/api/shop/categories` : `/api/shop/categories`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return { categories: [] as any[] }
  return res.json()
}

async function fetchBanners() {
  const base = process.env.NEXT_PUBLIC_APP_URL
  const url = base ? `${base}/api/shop/banners` : `/api/shop/banners`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return { banners: [] as any[] }
  return res.json()
}

function sanitizeSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const qs = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === 'from' || value === undefined) return
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v !== undefined) qs.append(key, v)
      })
    } else {
      qs.set(key, value)
    }
  })
  return qs
}

export default async function ShopPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const sanitizedParams = sanitizeSearchParams(searchParams)
  const queryString = sanitizedParams.toString()
  const [{ products }, { categories }, { banners }] = await Promise.all([
    fetchProducts(queryString),
    fetchCategories(),
    fetchBanners(),
  ])
  const fromPath = queryString ? `/loja?${queryString}` : '/loja'

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-6 lg:py-8 space-y-6">
        <h1 className="text-3xl font-serif font-bold text-hekate-pearl mb-2">Loja</h1>
        {categories?.length ? (
          <ShopCategoryNav
            categories={categories}
            activeSlug={searchParams.category as string | undefined}
            sticky={false}
            className="border border-hekate-gold/20 rounded-xl bg-hekate-gray-900/40 backdrop-blur-sm"
            innerClassName="px-0"
          />
        ) : null}
        {/* Banner com destaques (cadastro próprio) */}
        <ShopBanner items={banners} />
      </div>

      <div className="container mx-auto py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Filtros laterais */}
          <aside className="lg:col-span-3">
            <div className="card-mystic p-4 sticky top-24">
              <ShopFilters category={searchParams.category as string | undefined} />
            </div>
          </aside>
          {/* Produtos */}
          <section className="lg:col-span-9">
            <Suspense fallback={<div>Carregando...</div>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((p: any) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    href={`/loja/${p.slug}?from=${encodeURIComponent(fromPath)}`}
                  />
                ))}
              </div>
            </Suspense>
            {/* Ritual footer */}
            <div className="mt-12 text-center">
    <p className="font-serif text-hekate-pearl/80">“Cada produto é feito com toda energia e consagração”</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
