import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/payments/status[?userId=]
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    // Assinatura mais recente do usuário
    const subscription = await prisma.userSubscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true }
    })

    // Problemas de pagamento recentes (FAILED)
    const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const failed = await prisma.paymentTransaction.findMany({
      where: { userId, status: 'FAILED' as any, createdAt: { gte: last30 } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, amount: true, createdAt: true, status: true }
    })

    const paymentIssues = failed.map(f => ({
      id: f.id,
      type: 'FAILED_PAYMENT',
      description: 'Pagamento falhou',
      amount: Number(f.amount || 0),
      attemptedAt: f.createdAt.toISOString(),
      nextRetryAt: undefined,
      canRetry: true
    }))

    let nextPayment: any = undefined
    if (subscription?.plan && subscription.currentPeriodEnd) {
      nextPayment = {
        amount: Number(subscription.plan.monthlyPrice || subscription.plan.yearlyPrice || 0),
        dueDate: (subscription.currentPeriodEnd as any as Date).toISOString?.() || new Date(subscription.currentPeriodEnd as any).toISOString(),
        description: `Renovação do plano ${subscription.plan.name}`
      }
    }

    const payload = {
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status as any,
        currentPeriodStart: subscription.currentPeriodStart?.toISOString?.() || new Date(subscription.currentPeriodStart as any).toISOString(),
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString?.() || new Date(subscription.currentPeriodEnd as any).toISOString(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
        plan: {
          id: subscription.planId,
          name: subscription.plan?.name || '',
          price: Number(subscription.plan?.monthlyPrice || subscription.plan?.yearlyPrice || 0),
          interval: (subscription.plan?.interval as any) || 'MONTHLY',
          features: Array.isArray(subscription.plan?.features) ? (subscription.plan?.features as any) : []
        }
      } : undefined,
      paymentIssues,
      nextPayment,
      usage: undefined,
      credits: { balance: 0 }
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro ao obter status de pagamentos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

