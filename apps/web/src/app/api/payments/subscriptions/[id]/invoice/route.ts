import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

const tierOrder: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

type InvoiceLineItem = {
  type: 'subscription' | 'community'
  id?: string
  label: string
  amount: number
}

async function buildCommunityLineItems(userId: string, userTier: string): Promise<InvoiceLineItem[]> {
  const memberships = await prisma.communityMembership.findMany({
    where: { userId, status: { in: ['active', 'pending'] } },
    include: {
      community: {
        select: { id: true, name: true, price: true, tier: true, accessModels: true }
      }
    }
  })

  const items: InvoiceLineItem[] = []

  for (const membership of memberships) {
    const community = membership.community
    if (!community) continue

    const accessModels = (community.accessModels as string[]) || []
    const isPaidCommunity = accessModels.includes('ONE_TIME')
    const isSubscriptionCommunity = accessModels.includes('SUBSCRIPTION')
    const allowedByTier = isSubscriptionCommunity && (tierOrder[userTier] >= tierOrder[community.tier || 'FREE'])

    if (!isPaidCommunity || allowedByTier) continue

    const amount = community.price != null ? Number(community.price) : 0
    if (amount <= 0) continue

    items.push({
      type: 'community',
      id: community.id,
      label: community.name,
      amount
    })
  }

  return items
}

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
    const subscriptionAmount = billingInterval === 'YEARLY'
      ? Number(sub.plan?.yearlyPrice ?? sub.plan?.monthlyPrice ?? 0)
      : Number(sub.plan?.monthlyPrice ?? 0)

    const user = await prisma.user.findUnique({
      where: { id: sub.userId },
      select: { subscriptionTier: true }
    })
    const userTier = user?.subscriptionTier || 'FREE'

    const lineItems: InvoiceLineItem[] = []
    if (subscriptionAmount > 0) {
      lineItems.push({
        type: 'subscription',
        id: sub.id,
        label: `Assinatura ${sub.plan?.name || ''}`.trim(),
        amount: subscriptionAmount
      })
    }

    const communityItems = await buildCommunityLineItems(sub.userId, userTier)
    lineItems.push(...communityItems)

    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0)
    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Nenhum valor pendente para cobrança' }, { status: 400 })
    }

    // Create provider payment (MercadoPago) for this subscription
    const { MercadoPagoService } = await import('@/lib/payments/mercadopago')
    const mp = new MercadoPagoService()
    const res = await mp.createSubscriptionPayment({
      amount: totalAmount,
      description: `Fatura mensal (${billingInterval === 'YEARLY' ? 'anual' : 'mensal'})`,
      userId: sub.userId,
      subscriptionPlanId: sub.planId,
      metadata: {
        subscription_id: sub.id,
        billing_interval: billingInterval,
        created_via: 'invoice-route',
        lineItems,
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
