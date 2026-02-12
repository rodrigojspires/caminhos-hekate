import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

const PLAN_TYPES = ['SINGLE_SESSION', 'SUBSCRIPTION', 'SUBSCRIPTION_LIMITED'] as const

type PlanType = (typeof PLAN_TYPES)[number]

const PriceTierSchema = z.object({
  participantsFrom: z.coerce.number().int().min(1),
  participantsTo: z.coerce.number().int().min(1),
  pricingMode: z.enum(['UNIT_PER_PARTICIPANT', 'FIXED_TOTAL']),
  unitPrice: z.coerce.number().positive().nullable().optional(),
  fixedPrice: z.coerce.number().positive().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

const PlanSchema = z.object({
  planType: z.enum(PLAN_TYPES),
  name: z.string().min(2),
  description: z.string().min(2),
  maxParticipants: z.coerce.number().int().min(1).max(30),
  roomsPerMonth: z.coerce.number().int().min(1).nullable().optional(),
  tipsPerPlayer: z.coerce.number().int().min(0),
  summaryLimit: z.coerce.number().int().min(0),
  durationDays: z.coerce.number().int().min(1).max(3650),
  isActive: z.boolean(),
  subscriptionPlanId: z.string().nullable().optional(),
  singleSessionPriceTiers: z.array(PriceTierSchema).optional(),
})

const SaveCatalogSchema = z.object({
  plans: z.array(PlanSchema),
})

function ensureAdmin(session: any) {
  return Boolean(session?.user && session.user.role === 'ADMIN')
}

function validateSingleSessionTiers(tiers: z.infer<typeof PriceTierSchema>[], maxParticipants: number) {
  if (!tiers.length) {
    throw new Error('O plano avulso precisa de ao menos uma faixa de preço.')
  }

  const sorted = [...tiers].sort((a, b) => {
    if (a.participantsFrom === b.participantsFrom) {
      return a.participantsTo - b.participantsTo
    }
    return a.participantsFrom - b.participantsFrom
  })

  for (let i = 0; i < sorted.length; i += 1) {
    const tier = sorted[i]

    if (tier.participantsFrom > tier.participantsTo) {
      throw new Error(
        `Faixa inválida (${tier.participantsFrom}-${tier.participantsTo}): início maior que fim.`,
      )
    }

    if (tier.participantsTo > maxParticipants) {
      throw new Error(
        `Faixa ${tier.participantsFrom}-${tier.participantsTo} excede o limite máximo de participantes (${maxParticipants}).`,
      )
    }

    if (tier.pricingMode === 'UNIT_PER_PARTICIPANT') {
      if (!tier.unitPrice || tier.unitPrice <= 0) {
        throw new Error(
          `Faixa ${tier.participantsFrom}-${tier.participantsTo} precisa de valor unitário positivo.`,
        )
      }
    } else if (!tier.fixedPrice || tier.fixedPrice <= 0) {
      throw new Error(
        `Faixa ${tier.participantsFrom}-${tier.participantsTo} precisa de valor fixo positivo.`,
      )
    }

    const next = sorted[i + 1]
    if (next && next.participantsFrom <= tier.participantsTo) {
      throw new Error(
        `Faixas sobrepostas: ${tier.participantsFrom}-${tier.participantsTo} e ${next.participantsFrom}-${next.participantsTo}.`,
      )
    }
  }
}

async function fetchCatalog() {
  const [plans, subscriptionPlans] = await Promise.all([
    prisma.mahaLilahPlan.findMany({
      where: { planType: { in: [...PLAN_TYPES] as any } },
      include: {
        subscriptionPlan: true,
        singleSessionPriceTiers: {
          orderBy: [{ sortOrder: 'asc' }, { participantsFrom: 'asc' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.subscriptionPlan.findMany({
      where: { appScope: 'MAHALILAH' as any },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        tier: true,
        monthlyPrice: true,
        yearlyPrice: true,
        isActive: true,
        appScope: true,
      },
    }),
  ])

  return {
    plans: plans.map((plan) => ({
      id: plan.id,
      planType: plan.planType,
      name: plan.name,
      description: plan.description,
      billingType: plan.billingType,
      subscriptionPlanId: plan.subscriptionPlanId,
      maxParticipants: plan.maxParticipants,
      roomsPerMonth: plan.roomsPerMonth,
      tipsPerPlayer: plan.tipsPerPlayer,
      summaryLimit: plan.summaryLimit,
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      singleSessionPriceTiers: plan.singleSessionPriceTiers.map((tier) => ({
        id: tier.id,
        participantsFrom: tier.participantsFrom,
        participantsTo: tier.participantsTo,
        pricingMode: tier.pricingMode,
        unitPrice: tier.unitPrice == null ? null : Number(tier.unitPrice),
        fixedPrice: tier.fixedPrice == null ? null : Number(tier.fixedPrice),
        sortOrder: tier.sortOrder,
        isActive: tier.isActive,
      })),
      subscriptionPlan: plan.subscriptionPlan
        ? {
            id: plan.subscriptionPlan.id,
            name: plan.subscriptionPlan.name,
            tier: plan.subscriptionPlan.tier,
            monthlyPrice: Number(plan.subscriptionPlan.monthlyPrice),
            yearlyPrice: Number(plan.subscriptionPlan.yearlyPrice),
            isActive: plan.subscriptionPlan.isActive,
            appScope: (plan.subscriptionPlan as any).appScope || null,
          }
        : null,
    })),
    availableSubscriptionPlans: subscriptionPlans.map((plan) => ({
      ...plan,
      monthlyPrice: Number(plan.monthlyPrice),
      yearlyPrice: Number(plan.yearlyPrice),
    })),
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!ensureAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const data = await fetchCatalog()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao carregar catálogo Maha Lilah (admin):', error)
    return NextResponse.json(
      { error: 'Erro ao carregar catálogo.' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!ensureAdmin(session)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const payload = await request.json()
    const parsed = SaveCatalogSchema.parse(payload)

    const plansByType = new Map<PlanType, z.infer<typeof PlanSchema>>()
    parsed.plans.forEach((plan) => {
      plansByType.set(plan.planType, plan)
    })

    for (const required of PLAN_TYPES) {
      if (!plansByType.has(required)) {
        return NextResponse.json(
          { error: `Plano obrigatório ausente: ${required}` },
          { status: 400 },
        )
      }
    }

    const singleSession = plansByType.get('SINGLE_SESSION')!
    const subscription = plansByType.get('SUBSCRIPTION')!
    const subscriptionLimited = plansByType.get('SUBSCRIPTION_LIMITED')!

    validateSingleSessionTiers(
      singleSession.singleSessionPriceTiers || [],
      singleSession.maxParticipants,
    )

    if (!subscription.subscriptionPlanId || !subscriptionLimited.subscriptionPlanId) {
      return NextResponse.json(
        { error: 'Assinaturas Maha Lilah precisam de um plano de cobrança vinculado.' },
        { status: 400 },
      )
    }

    if (subscription.roomsPerMonth !== null && subscription.roomsPerMonth !== undefined) {
      return NextResponse.json(
        { error: 'Plano ilimitado não deve ter limite de salas por mês.' },
        { status: 400 },
      )
    }

    if (!subscriptionLimited.roomsPerMonth || subscriptionLimited.roomsPerMonth <= 0) {
      return NextResponse.json(
        { error: 'Plano limitado precisa de roomsPerMonth maior que zero.' },
        { status: 400 },
      )
    }

    const referencedPlanIds = [
      subscription.subscriptionPlanId,
      subscriptionLimited.subscriptionPlanId,
    ]

    const referencedPlans = await prisma.subscriptionPlan.findMany({
      where: {
        id: { in: referencedPlanIds },
        appScope: 'MAHALILAH' as any,
      },
      select: { id: true },
    })

    if (referencedPlans.length !== 2) {
      return NextResponse.json(
        { error: 'Plano de cobrança Maha Lilah inválido para assinatura.' },
        { status: 400 },
      )
    }

    await prisma.$transaction(async (tx) => {
      const entries = [...plansByType.entries()]

      for (const [planType, plan] of entries) {
        const billingType = planType === 'SINGLE_SESSION' ? 'ONE_TIME' : 'RECURRING'

        const savedPlan = await tx.mahaLilahPlan.upsert({
          where: { planType: planType as any },
          create: {
            planType: planType as any,
            billingType: billingType as any,
            name: plan.name,
            description: plan.description,
            subscriptionPlanId:
              planType === 'SINGLE_SESSION' ? null : plan.subscriptionPlanId,
            maxParticipants: plan.maxParticipants,
            roomsPerMonth:
              planType === 'SUBSCRIPTION'
                ? null
                : planType === 'SINGLE_SESSION'
                  ? 1
                  : plan.roomsPerMonth ?? null,
            tipsPerPlayer: plan.tipsPerPlayer,
            summaryLimit: plan.summaryLimit,
            durationDays: plan.durationDays,
            isActive: plan.isActive,
          },
          update: {
            billingType: billingType as any,
            name: plan.name,
            description: plan.description,
            subscriptionPlanId:
              planType === 'SINGLE_SESSION' ? null : plan.subscriptionPlanId,
            maxParticipants: plan.maxParticipants,
            roomsPerMonth:
              planType === 'SUBSCRIPTION'
                ? null
                : planType === 'SINGLE_SESSION'
                  ? 1
                  : plan.roomsPerMonth ?? null,
            tipsPerPlayer: plan.tipsPerPlayer,
            summaryLimit: plan.summaryLimit,
            durationDays: plan.durationDays,
            isActive: plan.isActive,
          },
        })

        if (planType === 'SINGLE_SESSION') {
          await tx.mahaLilahSingleSessionPriceTier.deleteMany({
            where: { planId: savedPlan.id },
          })

          const tiers = (plan.singleSessionPriceTiers || []).map((tier, index) => ({
            planId: savedPlan.id,
            participantsFrom: tier.participantsFrom,
            participantsTo: tier.participantsTo,
            pricingMode: tier.pricingMode as any,
            unitPrice:
              tier.pricingMode === 'UNIT_PER_PARTICIPANT'
                ? tier.unitPrice ?? null
                : null,
            fixedPrice:
              tier.pricingMode === 'FIXED_TOTAL' ? tier.fixedPrice ?? null : null,
            sortOrder: tier.sortOrder ?? index,
            isActive: tier.isActive ?? true,
          }))

          if (tiers.length > 0) {
            await tx.mahaLilahSingleSessionPriceTier.createMany({ data: tiers })
          }
        } else {
          await tx.mahaLilahSingleSessionPriceTier.deleteMany({
            where: { planId: savedPlan.id },
          })
        }
      }
    })

    const data = await fetchCatalog()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao salvar catálogo Maha Lilah (admin):', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 },
      )
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erro ao salvar catálogo.' }, { status: 500 })
  }
}
