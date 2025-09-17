import { NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET() {
  try {
    const banners = await prisma.shopBanner.findMany({
      where: { active: true },
      orderBy: [{ order: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, subtitle: true, imageUrl: true, linkUrl: true }
    })
    return NextResponse.json({ banners })
  } catch (e) {
    console.error('GET /api/shop/banners error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

