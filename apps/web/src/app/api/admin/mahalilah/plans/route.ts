import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

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

const PlanMarketingSchema = z.object({
  forWho: z.string().trim().min(2).max(280),
  includes: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
  limits: z.array(z.string().trim().min(1).max(180)).min(1).max(20),
  ctaLabel: z.string().trim().min(2).max(60),
  ctaHref: z.string().trim().min(1).max(255),
  aiSummaryLabel: z.string().trim().min(2).max(140),
  highlight: z.boolean(),
})

const PlanSchema = z.object({
  planType: z.enum(PLAN_TYPES),
  name: z.string().min(2),
  description: z.string().min(2),
  maxParticipants: z.coerce.number().int().min(1).max(30),
  allowTherapistSoloPlay: z.boolean(),
  roomsPerMonth: z.coerce.number().int().min(1).nullable().optional(),
  tipsPerPlayer: z.coerce.number().int().min(0),
  summaryLimit: z.coerce.number().int().min(0),
  progressSummaryEveryMoves: z.coerce.number().int().min(0).max(200),
  durationDays: z.coerce.number().int().min(1).max(3650),
  isActive: z.boolean(),
  subscriptionPlanId: z.string().nullable().optional(),
  marketing: PlanMarketingSchema,
  singleSessionPriceTiers: z.array(PriceTierSchema).optional(),
})

const SaveCatalogSchema = z.object({
  plans: z.array(PlanSchema),
})

function ensureAdmin(session: any) {
  return Boolean(session?.user && session.user.role === 'ADMIN')
}

type PlanMarketing = z.infer<typeof PlanMarketingSchema>

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const CHECKOUT_METADATA_BY_PLAN: Record<PlanType, string> = {
  SINGLE_SESSION: 'single_session',
  SUBSCRIPTION: 'subscription_unlimited',
  SUBSCRIPTION_LIMITED: 'subscription_limited',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pluralize(label: string, value: number) {
  return value === 1 ? label : `${label}s`
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

function formatParticipantRange(participants: number[]) {
  const sorted = [...participants].sort((a, b) => a - b)
  if (sorted.length === 1) {
    return `${sorted[0]} participante`
  }
  if (sorted.length === 2 && sorted[1] === sorted[0] + 1) {
    return `${sorted[0]}-${sorted[1]} participantes`
  }
  return `${sorted.join(', ')} participantes`
}

function getSingleSessionPriceLabel(
  tiers: Array<{
    participantsFrom: number
    participantsTo: number
    pricingMode: 'UNIT_PER_PARTICIPANT' | 'FIXED_TOTAL'
    unitPrice: number | null
    fixedPrice: number | null
    isActive: boolean
  }>,
  maxParticipants: number,
) {
  const pricesByParticipants: Record<string, number> = {}
  const activeTiers = tiers.filter((tier) => tier.isActive)

  for (let participants = 1; participants <= maxParticipants; participants += 1) {
    const tier = activeTiers.find(
      (item) =>
        participants >= item.participantsFrom && participants <= item.participantsTo,
    )
    if (!tier) continue

    const price =
      tier.pricingMode === 'UNIT_PER_PARTICIPANT'
        ? (tier.unitPrice ?? 0) * participants
        : tier.fixedPrice ?? 0

    if (price > 0) {
      pricesByParticipants[String(participants)] = Number(price.toFixed(2))
    }
  }

  const grouped = Object.entries(pricesByParticipants).reduce<Record<string, number[]>>(
    (acc, [participants, price]) => {
      const key = String(price)
      if (!acc[key]) acc[key] = []
      acc[key].push(Number(participants))
      return acc
    },
    {},
  )

  const label = Object.entries(grouped)
    .map(
      ([price, participants]) =>
        `${formatParticipantRange(participants)}: ${currencyFormatter.format(Number(price))}`,
    )
    .join(' · ')

  return label || 'Faixas de preço definidas no catálogo'
}

function getDefaultMarketing(
  plan: {
    planType: PlanType
    name: string
    maxParticipants: number
    roomsPerMonth: number | null
    tipsPerPlayer: number
    summaryLimit: number
    progressSummaryEveryMoves: number
    singleSessionPriceTiers: Array<{
      participantsFrom: number
      participantsTo: number
      pricingMode: 'UNIT_PER_PARTICIPANT' | 'FIXED_TOTAL'
      unitPrice: number | null
      fixedPrice: number | null
      isActive: boolean
    }>
  },
): PlanMarketing {
  const aiSummaryLabel = `${plan.name}: ${plan.tipsPerPlayer} ${pluralize(
    'dica',
    plan.tipsPerPlayer,
  )}/jogador · ${plan.summaryLimit} ${pluralize('síntese', plan.summaryLimit)}.`
  const commonLimits = [
    `Dicas de IA: ${plan.tipsPerPlayer} por jogador/sessão`,
    `Síntese final por IA: ${plan.summaryLimit} por sessão`,
    plan.progressSummaryEveryMoves > 0
      ? `Síntese "O Caminho até agora": a cada ${plan.progressSummaryEveryMoves} jogadas`
      : 'Síntese "O Caminho até agora" desativada',
  ]

  if (plan.planType === 'SINGLE_SESSION') {
    const priceLabel = getSingleSessionPriceLabel(
      plan.singleSessionPriceTiers,
      plan.maxParticipants,
    )

    return {
      forWho: 'Autoguiado, terapeutas iniciando ou grupos eventuais.',
      includes: [
        '1 sala ao vivo',
        'Convites por e-mail',
        'Deck randômico e modo terapia',
        ...commonLimits,
      ],
      limits: [`Participantes por sessão: até ${plan.maxParticipants}`, priceLabel],
      ctaLabel: 'Comprar sessão',
      ctaHref: '/checkout',
      aiSummaryLabel,
      highlight: false,
    }
  }

  const roomsLabel =
    plan.roomsPerMonth == null
      ? 'Salas ilimitadas no mês'
      : `${plan.roomsPerMonth} salas por mês`

  if (plan.planType === 'SUBSCRIPTION') {
    return {
      forWho: 'Terapeutas e facilitadores com agenda ativa.',
      includes: [
        roomsLabel,
        `Até ${plan.maxParticipants} participantes por sala`,
        'Histórico completo e export',
        'Relatórios e síntese por IA',
        'Suporte prioritário',
      ],
      limits: [...commonLimits, 'Políticas de uso justo'],
      ctaLabel: 'Assinar plano',
      ctaHref: '/checkout',
      aiSummaryLabel,
      highlight: true,
    }
  }

  return {
    forWho: 'Profissionais com número fixo de grupos por mês.',
    includes: [
      roomsLabel,
      'Convites por e-mail',
      `Até ${plan.maxParticipants} participantes por sala`,
      'Deck randômico + modo terapia',
    ],
    limits: [...commonLimits, 'Salas extras cobradas à parte'],
    ctaLabel: 'Assinar plano',
    ctaHref: '/checkout',
    aiSummaryLabel,
    highlight: false,
  }
}

function getPlanMarketing(plan: {
  metadata: unknown
  planType: PlanType
  name: string
  maxParticipants: number
  roomsPerMonth: number | null
  tipsPerPlayer: number
  summaryLimit: number
  progressSummaryEveryMoves: number
  singleSessionPriceTiers: Array<{
    participantsFrom: number
    participantsTo: number
    pricingMode: 'UNIT_PER_PARTICIPANT' | 'FIXED_TOTAL'
    unitPrice: number | null
    fixedPrice: number | null
    isActive: boolean
  }>
}): PlanMarketing {
  const fallback = getDefaultMarketing(plan)
  if (!isRecord(plan.metadata)) return fallback
  if (!isRecord(plan.metadata.marketing)) return fallback

  const raw = plan.metadata.marketing
  const parsed = PlanMarketingSchema.safeParse({
    forWho: typeof raw.forWho === 'string' ? raw.forWho : fallback.forWho,
    includes: asStringList(raw.includes).length ? asStringList(raw.includes) : fallback.includes,
    limits: asStringList(raw.limits).length ? asStringList(raw.limits) : fallback.limits,
    ctaLabel: typeof raw.ctaLabel === 'string' ? raw.ctaLabel : fallback.ctaLabel,
    ctaHref: typeof raw.ctaHref === 'string' ? raw.ctaHref : fallback.ctaHref,
    aiSummaryLabel:
      typeof raw.aiSummaryLabel === 'string'
        ? raw.aiSummaryLabel
        : fallback.aiSummaryLabel,
    highlight: typeof raw.highlight === 'boolean' ? raw.highlight : fallback.highlight,
  })

  if (!parsed.success) return fallback
  return parsed.data
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
      allowTherapistSoloPlay: (plan as any).allowTherapistSoloPlay ?? true,
      roomsPerMonth: plan.roomsPerMonth,
      tipsPerPlayer: plan.tipsPerPlayer,
      summaryLimit: plan.summaryLimit,
      progressSummaryEveryMoves: plan.progressSummaryEveryMoves,
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      marketing: getPlanMarketing({
        metadata: plan.metadata,
        planType: plan.planType as PlanType,
        name: plan.name,
        maxParticipants: Number(plan.maxParticipants),
        roomsPerMonth:
          plan.roomsPerMonth == null ? null : Number(plan.roomsPerMonth),
        tipsPerPlayer: Number(plan.tipsPerPlayer),
        summaryLimit: Number(plan.summaryLimit),
        progressSummaryEveryMoves: Number(plan.progressSummaryEveryMoves),
        singleSessionPriceTiers: plan.singleSessionPriceTiers.map((tier) => ({
          participantsFrom: Number(tier.participantsFrom),
          participantsTo: Number(tier.participantsTo),
          pricingMode: tier.pricingMode as 'UNIT_PER_PARTICIPANT' | 'FIXED_TOTAL',
          unitPrice: tier.unitPrice == null ? null : Number(tier.unitPrice),
          fixedPrice: tier.fixedPrice == null ? null : Number(tier.fixedPrice),
          isActive: tier.isActive,
        })),
      }),
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

    const existingPlans = await prisma.mahaLilahPlan.findMany({
      where: { planType: { in: [...PLAN_TYPES] as any } },
      select: { planType: true, metadata: true },
    })
    const existingMetadataByPlanType = new Map(
      existingPlans.map((plan) => [
        plan.planType as PlanType,
        isRecord(plan.metadata) ? plan.metadata : {},
      ]),
    )

    await prisma.$transaction(async (tx) => {
      const entries = [...plansByType.entries()]

      for (const [planType, plan] of entries) {
        const billingType = planType === 'SINGLE_SESSION' ? 'ONE_TIME' : 'RECURRING'
        const existingMetadata = existingMetadataByPlanType.get(planType)
        const metadata = {
          ...(isRecord(existingMetadata) ? existingMetadata : {}),
          app: isRecord(existingMetadata) && typeof existingMetadata.app === 'string'
            ? existingMetadata.app
            : 'mahalilah',
          checkout:
            isRecord(existingMetadata) && typeof existingMetadata.checkout === 'string'
              ? existingMetadata.checkout
              : CHECKOUT_METADATA_BY_PLAN[planType],
          marketing: plan.marketing,
        }

        const savedPlan = await tx.mahaLilahPlan.upsert({
          where: { planType: planType as any },
          create: {
            planType: planType as any,
            billingType: billingType as any,
            name: plan.name,
            description: plan.description,
            metadata,
            subscriptionPlanId:
              planType === 'SINGLE_SESSION' ? null : plan.subscriptionPlanId,
            maxParticipants: plan.maxParticipants,
            allowTherapistSoloPlay: plan.allowTherapistSoloPlay,
            roomsPerMonth:
              planType === 'SUBSCRIPTION'
                ? null
                : planType === 'SINGLE_SESSION'
                  ? 1
                  : plan.roomsPerMonth ?? null,
            tipsPerPlayer: plan.tipsPerPlayer,
            summaryLimit: plan.summaryLimit,
            progressSummaryEveryMoves: plan.progressSummaryEveryMoves,
            durationDays: plan.durationDays,
            isActive: plan.isActive,
          },
          update: {
            billingType: billingType as any,
            name: plan.name,
            description: plan.description,
            metadata,
            subscriptionPlanId:
              planType === 'SINGLE_SESSION' ? null : plan.subscriptionPlanId,
            maxParticipants: plan.maxParticipants,
            allowTherapistSoloPlay: plan.allowTherapistSoloPlay,
            roomsPerMonth:
              planType === 'SUBSCRIPTION'
                ? null
                : planType === 'SINGLE_SESSION'
                  ? 1
                  : plan.roomsPerMonth ?? null,
            tipsPerPlayer: plan.tipsPerPlayer,
            summaryLimit: plan.summaryLimit,
            progressSummaryEveryMoves: plan.progressSummaryEveryMoves,
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
