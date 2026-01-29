import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, PaymentStatus } from '@hekate/database'
import { z } from 'zod'
import { MercadoPagoService } from '@/lib/payments/mercadopago'
import { resolvePlan, type PlanType } from '@/lib/mahalilah/plans'

const CheckoutSchema = z.object({
  planType: z.enum(['SINGLE_SESSION', 'SUBSCRIPTION', 'SUBSCRIPTION_LIMITED']),
  maxParticipants: z.number().int().min(2).max(12).optional()
})

function generateOrderNumber() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `MLH-${ymd}-${rnd}`
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const payload = await request.json()
    const data = CheckoutSchema.parse(payload)
    const planType = data.planType as PlanType

    const plan = resolvePlan(planType, data.maxParticipants)
    const baseUrl = process.env.NEXT_PUBLIC_MAHALILAH_URL || process.env.NEXTAUTH_URL || 'https://mahalilahonline.com.br'

    const orderNumber = generateOrderNumber()

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        status: 'PENDING',
        subtotal: plan.price,
        shipping: 0,
        discount: 0,
        total: plan.price,
        customerEmail: session.user.email,
        customerName: session.user.name || session.user.email,
        metadata: {
          app: 'mahalilah',
          mahalilah: {
            planType,
            maxParticipants: plan.maxParticipants,
            roomsLimit: plan.roomsLimit,
            tipsPerPlayer: plan.tipsPerPlayer,
            summaryLimit: plan.summaryLimit,
            durationDays: plan.durationDays,
            roomsUsed: 0,
            active: false
          }
        }
      }
    })

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: plan.price,
        currency: 'BRL',
        status: PaymentStatus.PENDING,
        method: 'MERCADOPAGO',
        metadata: {
          app: 'mahalilah',
          planType
        }
      }
    })

    const transaction = await prisma.paymentTransaction.create({
      data: {
        userId: session.user.id,
        orderId: order.id,
        amount: plan.price,
        currency: 'BRL',
        provider: 'MERCADOPAGO',
        status: 'PENDING',
        metadata: {
          app: 'mahalilah',
          planType,
          maxParticipants: plan.maxParticipants,
          paymentId: payment.id
        }
      }
    })

    const mp = new MercadoPagoService()
    const preference = await mp.createPreference({
      title: plan.label,
      unitPrice: plan.price,
      externalReference: transaction.id,
      notificationUrl: `${baseUrl}/api/mahalilah/webhooks/mercadopago`,
      backUrls: {
        success: `${baseUrl}/checkout?status=success&order=${order.id}`,
        failure: `${baseUrl}/checkout?status=failure&order=${order.id}`,
        pending: `${baseUrl}/checkout?status=pending&order=${order.id}`
      },
      metadata: {
        transactionId: transaction.id,
        orderId: order.id,
        planType
      }
    })

    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { providerPaymentId: preference.id }
    })

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentUrl: preference.init_point
    })
  } catch (error) {
    console.error('Erro ao criar checkout Maha Lilah:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
