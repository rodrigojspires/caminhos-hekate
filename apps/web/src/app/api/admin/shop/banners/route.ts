import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { withAdminAuth } from '@/lib/auth-middleware'

export const GET = withAdminAuth(async (_user, _req: NextRequest) => {
  const banners = await prisma.shopBanner.findMany({ orderBy: [{ order: 'desc' }, { createdAt: 'desc' }] })
  return NextResponse.json({ banners })
})

export const POST = withAdminAuth(async (_user, req: NextRequest) => {
  try {
    const body = await req.json()
    const { title, subtitle, imageUrl, linkUrl, active = true, order = 0 } = body || {}
    if (!title || !imageUrl) return NextResponse.json({ error: 'title e imageUrl são obrigatórios' }, { status: 400 })
    const banner = await prisma.shopBanner.create({ data: { title, subtitle, imageUrl, linkUrl, active, order } })
    return NextResponse.json({ banner }, { status: 201 })
  } catch (e) {
    console.error('POST /api/admin/shop/banners error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

