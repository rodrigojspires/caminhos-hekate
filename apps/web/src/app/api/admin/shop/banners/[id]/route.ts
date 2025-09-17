import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { withAdminAuth } from '@/lib/auth-middleware'

export const PUT = withAdminAuth(async (_user, req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const body = await req.json()
    const { title, subtitle, imageUrl, linkUrl, active, order } = body || {}
    const banner = await prisma.shopBanner.update({
      where: { id: params.id },
      data: { title, subtitle, imageUrl, linkUrl, active, order },
    })
    return NextResponse.json({ banner })
  } catch (e) {
    console.error('PUT /api/admin/shop/banners/[id] error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
})

export const DELETE = withAdminAuth(async (_user, _req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    await prisma.shopBanner.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/admin/shop/banners/[id] error', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
})

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

