import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const shipments = await prisma.shipment.findMany({ where: { orderId: params.id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ shipments })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session: any = await getServerSession(authOptions as any)
    if (!session?.user?.id || !['ADMIN','EDITOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const body = await req.json()
    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    const addressId = (order as any).shippingAddressId || (order as any).billingAddressId
    const shipment = await prisma.shipment.create({
      data: {
        orderId: order.id,
        addressId: addressId!,
        carrier: body.carrier || 'Correios',
        trackingNumber: body.trackingNumber || null,
        trackingUrl: body.trackingUrl || null,
        estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : null,
        shippedAt: body.shippedAt ? new Date(body.shippedAt) : new Date(),
        metadata: body.metadata || {},
      },
    })
    return NextResponse.json({ success: true, shipment })
  } catch (e) {
    console.error('POST /api/admin/orders/[id]/shipments error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
