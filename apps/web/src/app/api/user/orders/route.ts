import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            price: true,
            total: true,
          },
        },
        payments: {
          select: {
            id: true,
            status: true,
            method: true,
            paidAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        paymentTransactions: {
          select: {
            id: true,
            status: true,
            provider: true,
            paymentMethod: true,
            providerStatus: true,
            createdAt: true,
            paidAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted = orders.map((order) => {
      const [payment] = order.payments
      const [transaction] = order.paymentTransactions

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        discount: Number(order.discount),
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
          total: Number(item.total),
        })),
        payment: payment
          ? {
              id: payment.id,
              status: payment.status,
              method: payment.method,
              paidAt: payment.paidAt?.toISOString() ?? null,
              createdAt: payment.createdAt.toISOString(),
            }
          : null,
        transaction: transaction
          ? {
              id: transaction.id,
              status: transaction.status,
              provider: transaction.provider,
              providerStatus: transaction.providerStatus,
              paymentMethod: transaction.paymentMethod,
              createdAt: transaction.createdAt.toISOString(),
              paidAt: transaction.paidAt?.toISOString() ?? null,
            }
          : null,
      }
    })

    const stats = {
      totalOrders: formatted.length,
      pendingOrders: formatted.filter((o) => o.status === 'PENDING').length,
      awaitingPayment: formatted.filter((o) => o.status === 'PENDING').length,
      completedOrders: formatted.filter((o) => o.status === 'DELIVERED').length,
      lastOrderAt: formatted[0]?.createdAt ?? null,
    }

    return NextResponse.json({ orders: formatted, stats })
  } catch (error) {
    console.error('GET /api/user/orders error', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
