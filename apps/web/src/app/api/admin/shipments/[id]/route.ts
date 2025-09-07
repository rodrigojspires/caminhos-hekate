import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session?.user?.id || !['ADMIN','EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const body = await req.json()
    const data: any = {}
    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber
    if (body.trackingUrl !== undefined) data.trackingUrl = body.trackingUrl
    if (body.carrier !== undefined) data.carrier = body.carrier
    if (body.shippedAt !== undefined) data.shippedAt = body.shippedAt ? new Date(body.shippedAt) : null
    if (body.deliveredAt !== undefined) data.deliveredAt = body.deliveredAt ? new Date(body.deliveredAt) : null
    const shipment = await prisma.shipment.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, shipment })
  } catch (e) {
    console.error('PATCH /api/admin/shipments/[id] error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
