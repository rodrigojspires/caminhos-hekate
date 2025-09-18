import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            price: true,
            productId: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    if (['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      return NextResponse.json({ error: 'Este pedido não pode ser pago neste momento' }, { status: 400 })
    }

    if (!order.items.length) {
      return NextResponse.json({ error: 'Pedido sem itens' }, { status: 400 })
    }

    const { MercadoPagoService } = await import('@/lib/payments/mercadopago')

    const mp = new MercadoPagoService()
    const payment = await mp.createOrderPayment({
      orderId: order.id,
      userId: order.userId,
      totalAmount: Number(order.total),
      description: `Pedido ${order.orderNumber}`,
      items: order.items.map((item) => ({
        id: item.productId,
        title: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price),
      })),
    })

    if (!payment?.paymentUrl) {
      return NextResponse.json({ error: 'Não foi possível gerar um link de pagamento' }, { status: 500 })
    }

    return NextResponse.json({ success: true, paymentUrl: payment.paymentUrl })
  } catch (error) {
    console.error('POST /api/user/orders/[id]/pay error', error)
    return NextResponse.json({ error: 'Erro ao iniciar pagamento' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
