import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      include: {
        variants: true,
        category: { select: { id: true, name: true, slug: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
    if (!product || !product.active) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ product })
  } catch (error) {
    console.error('GET /api/shop/products/[slug] error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

