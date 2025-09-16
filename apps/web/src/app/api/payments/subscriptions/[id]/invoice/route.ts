import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const sub = await prisma.userSubscription.findUnique({
      where: { id: params.id },
      include: { plan: true },
    })
    if (!sub) return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    if (sub.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    const billingInterval = (sub.metadata as any)?.billingInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY'
    const amount = billingInterval === 'YEARLY'
      ? Number(sub.plan?.yearlyPrice ?? sub.plan?.monthlyPrice ?? 0)
      : Number(sub.plan?.monthlyPrice ?? 0)

    // Create provider payment (MercadoPago) for this subscription
    const { MercadoPagoService } = await import('@/lib/payments/mercadopago')
    const mp = new MercadoPagoService()
    const res = await mp.createSubscriptionPayment({
      amount,
      description: `Assinatura ${sub.plan?.name} (${billingInterval === 'YEARLY' ? 'anual' : 'mensal'})`,
      userId: sub.userId,
      subscriptionPlanId: sub.planId,
      metadata: {
        subscription_id: sub.id,
        billing_interval: billingInterval,
        created_via: 'invoice-route',
      },
    })

    // Connect transaction to existing subscription
    await prisma.userSubscription.update({
      where: { id: sub.id },
      data: { payments: { connect: { id: res.transaction.id } } },
    })

    return NextResponse.json({ success: true, paymentUrl: res.paymentUrl, transaction: res.transaction })
  } catch (e) {
    console.error('invoice route error:', e)
    return NextResponse.json({ error: 'Erro ao gerar cobrança' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

