import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma, SubscriptionStatus } from '@hekate/database'

const GrantSchema = z.object({
  planType: z.enum(['SUBSCRIPTION', 'SUBSCRIPTION_LIMITED']),
  billingInterval: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  durationDays: z.number().int().min(1).max(3650).optional()
})

type JsonObject = Record<string, unknown>

function ensureAdmin(session: any) {
  return Boolean(session?.user && session.user.role === 'ADMIN')
}

function getMetadata(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as JsonObject
}

function isMahaSubscription(metadata: unknown) {
  const parsed = getMetadata(metadata)
  return parsed.app === 'mahalilah'
}

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!ensureAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const [user, plans, subscriptions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, email: true }
      }),
      prisma.mahaLilahPlan.findMany({
        where: {
          planType: { in: ['SUBSCRIPTION', 'SUBSCRIPTION_LIMITED'] as any },
          isActive: true
        },
        orderBy: { createdAt: 'asc' },
        include: {
          subscriptionPlan: {
            select: {
              id: true,
              name: true,
              monthlyPrice: true,
              yearlyPrice: true,
              appScope: true
            }
          }
        }
      }),
      prisma.userSubscription.findMany({
        where: { userId: params.id },
        orderBy: { createdAt: 'desc' },
        include: { plan: { select: { id: true, name: true } } },
        take: 50
      })
    ])

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const mahaSubscriptions = subscriptions.filter((item) =>
      isMahaSubscription(item.metadata)
    )
    const activeSubscription = mahaSubscriptions.find((item) =>
      ['ACTIVE', 'TRIALING', 'PAST_DUE', 'PENDING', 'PAUSED'].includes(item.status)
    ) || null

    return NextResponse.json({
      user,
      plans: plans
        .filter((plan) => plan.subscriptionPlanId && plan.subscriptionPlan)
        .map((plan) => ({
          id: plan.id,
          planType: plan.planType,
          name: plan.name,
          durationDays: Number(plan.durationDays),
          maxParticipants: Number(plan.maxParticipants),
          roomsPerMonth:
            plan.roomsPerMonth == null ? null : Number(plan.roomsPerMonth),
          subscriptionPlan: {
            id: plan.subscriptionPlan!.id,
            name: plan.subscriptionPlan!.name,
            monthlyPrice: Number(plan.subscriptionPlan!.monthlyPrice),
            yearlyPrice: Number(plan.subscriptionPlan!.yearlyPrice),
            appScope: plan.subscriptionPlan!.appScope
          }
        })),
      activeSubscription,
      subscriptions: mahaSubscriptions
    })
  } catch (error) {
    console.error('Erro ao buscar assinatura Maha Lilah do usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!ensureAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    const adminUserId = session?.user?.id
    if (!adminUserId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const payload = await request.json()
    const data = GrantSchema.parse(payload)

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const mahaPlan = await prisma.mahaLilahPlan.findFirst({
      where: {
        planType: data.planType as any,
        isActive: true
      },
      include: {
        subscriptionPlan: {
          select: {
            id: true,
            appScope: true,
            monthlyPrice: true,
            yearlyPrice: true
          }
        }
      }
    })

    if (!mahaPlan?.subscriptionPlanId || !mahaPlan.subscriptionPlan) {
      return NextResponse.json(
        { error: 'Plano Maha Lilah sem vínculo de assinatura.' },
        { status: 400 }
      )
    }

    if (mahaPlan.subscriptionPlan.appScope !== 'MAHALILAH') {
      return NextResponse.json(
        { error: 'Plano de assinatura inválido para Maha Lilah.' },
        { status: 400 }
      )
    }

    const now = new Date()
    const durationDays = data.durationDays || Number(mahaPlan.durationDays)
    const periodEnd = addDays(now, durationDays)

    const existing = await prisma.userSubscription.findMany({
      where: {
        userId: user.id,
        status: {
          in: [
            SubscriptionStatus.PENDING,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.PAUSED
          ]
        }
      },
      select: { id: true, metadata: true }
    })

    const mahaExistingIds = existing
      .filter((item) => isMahaSubscription(item.metadata))
      .map((item) => item.id)

    if (mahaExistingIds.length > 0) {
      await prisma.userSubscription.updateMany({
        where: { id: { in: mahaExistingIds } },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelAtPeriodEnd: false,
          canceledAt: now
        }
      })
    }

    const subscription = await prisma.userSubscription.create({
      data: {
        userId: user.id,
        planId: mahaPlan.subscriptionPlanId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        metadata: {
          app: 'mahalilah',
          billingInterval: data.billingInterval,
          recurringEnabled: false,
          source: 'admin_grant',
          grantedByUserId: adminUserId,
          grantedAt: now.toISOString(),
          mahalilah: {
            planType: mahaPlan.planType,
            planId: mahaPlan.id,
            maxParticipants: Number(mahaPlan.maxParticipants),
            roomsLimit:
              mahaPlan.roomsPerMonth == null ? null : Number(mahaPlan.roomsPerMonth),
            roomsUsed: 0,
            tipsPerPlayer: Number(mahaPlan.tipsPerPlayer),
            summaryLimit: Number(mahaPlan.summaryLimit),
            progressSummaryEveryMoves: Number(mahaPlan.progressSummaryEveryMoves),
            durationDays,
            price: 0,
            label: `${mahaPlan.name} (cortesia admin)`,
            billingInterval: data.billingInterval
          }
        }
      },
      include: {
        plan: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      subscription
    })
  } catch (error) {
    console.error('Erro ao conceder assinatura Maha Lilah:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!ensureAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const active = await prisma.userSubscription.findMany({
      where: {
        userId: params.id,
        status: {
          in: [
            SubscriptionStatus.PENDING,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.PAUSED
          ]
        }
      },
      select: { id: true, metadata: true }
    })

    const ids = active
      .filter((item) => isMahaSubscription(item.metadata))
      .map((item) => item.id)

    if (ids.length === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0
      })
    }

    const result = await prisma.userSubscription.updateMany({
      where: { id: { in: ids } },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelAtPeriodEnd: false,
        canceledAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      updatedCount: result.count
    })
  } catch (error) {
    console.error('Erro ao revogar assinatura Maha Lilah:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
