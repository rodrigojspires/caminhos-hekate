import { NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET() {
  try {
    const cats = await prisma.category.findMany({
      where: { products: { some: { active: true } } },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ categories: cats })
  } catch (e) {
    console.error('GET /api/shop/categories error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
