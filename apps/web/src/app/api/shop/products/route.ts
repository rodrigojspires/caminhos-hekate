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

    const where: any = { active: true }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = { slug: category }

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

    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      image: Array.isArray(p.images) && p.images.length ? (p.images as any)[0] : null,
      priceRange: {
        min: Number(p.variants.reduce((m, v) => (m === null ? v.price : m < v.price ? m : v.price), null as any) || 0),
        max: Number(p.variants.reduce((m, v) => (m === null ? v.price : m > v.price ? m : v.price), null as any) || 0),
      },
      category: p.category,
    }))

    return NextResponse.json({ products: data, page, total, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('GET /api/shop/products error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

