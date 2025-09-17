import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const category = searchParams.get('category')
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '12')))
    const skip = (page - 1) * limit
    const featuredOnly = searchParams.get('featured') === 'true'
    const priceMin = searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined
    const priceMax = searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined
    const types = searchParams.get('type')?.split(',').filter(Boolean) as any[] | undefined
    const availability = searchParams.get('availability') // 'in_stock' | 'on_demand'

    const where: any = { active: true }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = { slug: category }
    if (featuredOnly) where.featured = true
    if (types && types.length) where.type = { in: types }
    if (priceMin != null || priceMax != null) {
      where.variants = where.variants || {}
      where.variants.some = { ...(where.variants.some || {}), price: {} }
      if (priceMin != null) where.variants.some.price.gte = priceMin
      if (priceMax != null) where.variants.some.price.lte = priceMax
    }
    if (availability === 'in_stock') {
      // Digital products are always available; Physical require stock > 0 in any variant
      where.OR = [
        ...(where.OR || []),
        { type: 'DIGITAL' as any },
        { type: 'PHYSICAL' as any, variants: { some: { stock: { gt: 0 } } } },
      ]
    } else if (availability === 'on_demand') {
      // Physical with no stock in any variant
      where.AND = [
        ...(where.AND || []),
        { type: 'PHYSICAL' as any, NOT: { variants: { some: { stock: { gt: 0 } } } } },
      ]
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true, slug: true } }, variants: true },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    const data = products.map((p) => {
      const minPrice = Number(p.variants.reduce((m, v) => (m === null ? v.price : m < v.price ? m : v.price), null as any) || 0)
      const maxPrice = Number(p.variants.reduce((m, v) => (m === null ? v.price : m > v.price ? m : v.price), null as any) || 0)
      const inStock = p.type === 'DIGITAL' || p.variants.some((v) => v.stock > 0)
      // Simple badge logic
      let badge: string | null = null
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      if (p.featured) badge = 'Destaque'
      else if (p.createdAt > thirtyDaysAgo) badge = 'Novidade'
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        image: Array.isArray(p.images) && (p.images as any[]).length ? (p.images as any)[0] : null,
        priceRange: { min: minPrice, max: maxPrice },
        category: p.category,
        inStock,
        badge,
      }
    })

    return NextResponse.json({ products: data, page, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/shop/products error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
