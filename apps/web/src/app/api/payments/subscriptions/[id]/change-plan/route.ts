import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { newPlanId } = await req.json()
    if (!newPlanId) return NextResponse.json({ error: 'newPlanId é obrigatório' }, { status: 400 })

    const sub = await prisma.userSubscription.findUnique({ where: { id: params.id }, include: { plan: true } })
    if (!sub) return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
    if (sub.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Proibido' }, { status: 403 })
    }

    const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } })
    if (!newPlan || !newPlan.isActive) return NextResponse.json({ error: 'Plano alvo inválido' }, { status: 400 })

    // Calcula crédito proporcional do período restante do plano atual
    const now = new Date()
    const start = sub.currentPeriodStart || now
    const end = sub.currentPeriodEnd || now
    const msTotal = Math.max(1, end.getTime() - start.getTime())
    const msLeft = Math.max(0, end.getTime() - now.getTime())

    const billingInterval = (sub.metadata as any)?.billingInterval === 'YEARLY' ? 'YEARLY' : 'MONTHLY'
    const currentAmount = billingInterval === 'YEARLY'
      ? Number(sub.plan?.yearlyPrice || sub.plan?.monthlyPrice || 0)
      : Number(sub.plan?.monthlyPrice || 0)
    const credit = Number((currentAmount * (msLeft / msTotal)).toFixed(2))

    // Define novo período conforme plano alvo (aproximação)
    const periodMs = billingInterval === 'YEARLY'
      ? (newPlan.intervalCount || 1) * 365 * 24 * 60 * 60 * 1000
      : (newPlan.intervalCount || 1) * 30 * 24 * 60 * 60 * 1000

    const updated = await prisma.userSubscription.update({
      where: { id: sub.id },
      data: {
        planId: newPlan.id,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + periodMs),
        metadata: {
          ...(sub.metadata as any || {}),
          billingInterval,
          prorationCredit: credit,
          lastPlanChangeAt: now.toISOString(),
          previousPlanId: sub.planId,
        },
      },
      include: { plan: true },
    })

    // Opcional: aqui poderíamos iniciar cobrança do delta (novo valor - crédito)

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error('Erro no change-plan:', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

