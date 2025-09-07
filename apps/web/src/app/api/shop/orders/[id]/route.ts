import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt,
      items: order.items.map((i) => ({ name: i.name, price: Number(i.price), quantity: i.quantity })),
    })
  } catch (error) {
    console.error('GET /api/shop/orders/[id] error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

