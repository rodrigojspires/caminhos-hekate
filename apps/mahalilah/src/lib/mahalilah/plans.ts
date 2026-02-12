import { prisma } from '@hekate/database'

export type PlanType = 'SINGLE_SESSION' | 'SUBSCRIPTION' | 'SUBSCRIPTION_LIMITED'

type PricingMode = 'UNIT_PER_PARTICIPANT' | 'FIXED_TOTAL'

type SingleSessionPricingTier = {
  id: string
  participantsFrom: number
  participantsTo: number
  pricingMode: PricingMode
  unitPrice: number | null
  fixedPrice: number | null
}

type SingleSessionConfig = {
  id: string
  name: string
  description: string
  isActive: boolean
  maxParticipants: number
  durationDays: number
  tipsPerPlayer: number
  summaryLimit: number
  pricingTiers: SingleSessionPricingTier[]
  pricesByParticipants: Record<string, number>
}

type SubscriptionConfig = {
  id: string
  name: string
  description: string
  isActive: boolean
  subscriptionPlanId: string
  monthlyPrice: number
  yearlyPrice: number
  maxParticipants: number
  roomsPerMonth: number | null
  durationDays: number
  tipsPerPlayer: number
  summaryLimit: number
}

export type PlanConfig = {
  singleSession: SingleSessionConfig
  subscriptionUnlimited: SubscriptionConfig
  subscriptionLimited: SubscriptionConfig
}

export type ResolvedPlan = {
  planId: string
  planType: PlanType
  label: string
  price: number
  maxParticipants: number
  roomsLimit: number | null
  tipsPerPlayer: number
  summaryLimit: number
  durationDays: number
  subscriptionPlanId?: string
  pricingTier?: SingleSessionPricingTier
}

function mapTier(raw: any): SingleSessionPricingTier {
  return {
    id: raw.id,
    participantsFrom: Number(raw.participantsFrom),
    participantsTo: Number(raw.participantsTo),
    pricingMode: raw.pricingMode,
    unitPrice: raw.unitPrice == null ? null : Number(raw.unitPrice),
    fixedPrice: raw.fixedPrice == null ? null : Number(raw.fixedPrice),
  }
}

function calculateTierPrice(participants: number, tier: SingleSessionPricingTier) {
  if (tier.pricingMode === 'UNIT_PER_PARTICIPANT') {
    if (tier.unitPrice == null || tier.unitPrice <= 0) {
      throw new Error('Faixa de preço avulso inválida: unitPrice ausente')
    }
    return Number((tier.unitPrice * participants).toFixed(2))
  }

  if (tier.fixedPrice == null || tier.fixedPrice <= 0) {
    throw new Error('Faixa de preço avulso inválida: fixedPrice ausente')
  }

  return Number(tier.fixedPrice.toFixed(2))
}

function findTierForParticipants(
  tiers: SingleSessionPricingTier[],
  participants: number,
) {
  return tiers.find(
    (tier) =>
      participants >= tier.participantsFrom && participants <= tier.participantsTo,
  )
}

function buildPricesByParticipants(
  tiers: SingleSessionPricingTier[],
  maxParticipants: number,
) {
  const pricesByParticipants: Record<string, number> = {}

  for (let participants = 1; participants <= maxParticipants; participants += 1) {
    const tier = findTierForParticipants(tiers, participants)
    if (!tier) continue
    pricesByParticipants[String(participants)] = calculateTierPrice(participants, tier)
  }

  return pricesByParticipants
}

async function loadMahaLilahPlans() {
  const plans = await prisma.mahaLilahPlan.findMany({
    where: {
      planType: { in: ['SINGLE_SESSION', 'SUBSCRIPTION', 'SUBSCRIPTION_LIMITED'] },
    },
    include: {
      subscriptionPlan: true,
      singleSessionPriceTiers: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { participantsFrom: 'asc' }],
      },
    },
  })

  const byPlanType = new Map(plans.map((plan) => [plan.planType, plan]))

  const singleSession = byPlanType.get('SINGLE_SESSION')
  const subscriptionUnlimited = byPlanType.get('SUBSCRIPTION')
  const subscriptionLimited = byPlanType.get('SUBSCRIPTION_LIMITED')

  if (!singleSession || !subscriptionUnlimited || !subscriptionLimited) {
    throw new Error('Catálogo Maha Lilah incompleto no banco')
  }

  return {
    singleSession,
    subscriptionUnlimited,
    subscriptionLimited,
  }
}

export async function getPlanConfig(): Promise<PlanConfig> {
  const { singleSession, subscriptionUnlimited, subscriptionLimited } =
    await loadMahaLilahPlans()

  const tiers = singleSession.singleSessionPriceTiers.map(mapTier)

  const unlimitedSubscriptionPlan = subscriptionUnlimited.subscriptionPlan
  if (
    !unlimitedSubscriptionPlan?.isActive ||
    (unlimitedSubscriptionPlan as any).appScope !== 'MAHALILAH'
  ) {
    throw new Error('Plano de assinatura ilimitada Maha Lilah inválido')
  }

  const limitedSubscriptionPlan = subscriptionLimited.subscriptionPlan
  if (
    !limitedSubscriptionPlan?.isActive ||
    (limitedSubscriptionPlan as any).appScope !== 'MAHALILAH'
  ) {
    throw new Error('Plano de assinatura limitada Maha Lilah inválido')
  }

  return {
    singleSession: {
      id: singleSession.id,
      name: singleSession.name,
      description: singleSession.description,
      isActive: singleSession.isActive,
      maxParticipants: Number(singleSession.maxParticipants),
      durationDays: Number(singleSession.durationDays),
      tipsPerPlayer: Number(singleSession.tipsPerPlayer),
      summaryLimit: Number(singleSession.summaryLimit),
      pricingTiers: tiers,
      pricesByParticipants: buildPricesByParticipants(
        tiers,
        Number(singleSession.maxParticipants),
      ),
    },
    subscriptionUnlimited: {
      id: subscriptionUnlimited.id,
      name: subscriptionUnlimited.name,
      description: subscriptionUnlimited.description,
      isActive: subscriptionUnlimited.isActive,
      subscriptionPlanId: unlimitedSubscriptionPlan.id,
      monthlyPrice: Number(unlimitedSubscriptionPlan.monthlyPrice),
      yearlyPrice: Number(unlimitedSubscriptionPlan.yearlyPrice),
      maxParticipants: Number(subscriptionUnlimited.maxParticipants),
      roomsPerMonth:
        subscriptionUnlimited.roomsPerMonth == null
          ? null
          : Number(subscriptionUnlimited.roomsPerMonth),
      durationDays: Number(subscriptionUnlimited.durationDays),
      tipsPerPlayer: Number(subscriptionUnlimited.tipsPerPlayer),
      summaryLimit: Number(subscriptionUnlimited.summaryLimit),
    },
    subscriptionLimited: {
      id: subscriptionLimited.id,
      name: subscriptionLimited.name,
      description: subscriptionLimited.description,
      isActive: subscriptionLimited.isActive,
      subscriptionPlanId: limitedSubscriptionPlan.id,
      monthlyPrice: Number(limitedSubscriptionPlan.monthlyPrice),
      yearlyPrice: Number(limitedSubscriptionPlan.yearlyPrice),
      maxParticipants: Number(subscriptionLimited.maxParticipants),
      roomsPerMonth:
        subscriptionLimited.roomsPerMonth == null
          ? null
          : Number(subscriptionLimited.roomsPerMonth),
      durationDays: Number(subscriptionLimited.durationDays),
      tipsPerPlayer: Number(subscriptionLimited.tipsPerPlayer),
      summaryLimit: Number(subscriptionLimited.summaryLimit),
    },
  }
}

export async function resolvePlan(
  planType: PlanType,
  maxParticipants?: number,
): Promise<ResolvedPlan> {
  const config = await getPlanConfig()

  if (planType === 'SINGLE_SESSION') {
    if (!config.singleSession.isActive) {
      throw new Error('Plano de sessão avulsa indisponível no momento')
    }

    if (!maxParticipants) {
      throw new Error('maxParticipants é obrigatório para sessão avulsa')
    }

    const participants = Number(maxParticipants)
    const tier = findTierForParticipants(
      config.singleSession.pricingTiers,
      participants,
    )

    if (!tier) {
      throw new Error('Quantidade de participantes sem faixa de preço configurada')
    }

    const price = calculateTierPrice(participants, tier)

    return {
      planId: config.singleSession.id,
      planType,
      label: `${config.singleSession.name} (${participants} participantes)`,
      price,
      maxParticipants: participants,
      roomsLimit: 1,
      tipsPerPlayer: config.singleSession.tipsPerPlayer,
      summaryLimit: config.singleSession.summaryLimit,
      durationDays: config.singleSession.durationDays,
      pricingTier: tier,
    }
  }

  if (planType === 'SUBSCRIPTION') {
    if (!config.subscriptionUnlimited.isActive) {
      throw new Error('Plano de assinatura indisponível no momento')
    }

    return {
      planId: config.subscriptionUnlimited.id,
      planType,
      label: config.subscriptionUnlimited.name,
      price: config.subscriptionUnlimited.monthlyPrice,
      maxParticipants: config.subscriptionUnlimited.maxParticipants,
      roomsLimit: config.subscriptionUnlimited.roomsPerMonth,
      tipsPerPlayer: config.subscriptionUnlimited.tipsPerPlayer,
      summaryLimit: config.subscriptionUnlimited.summaryLimit,
      durationDays: config.subscriptionUnlimited.durationDays,
      subscriptionPlanId: config.subscriptionUnlimited.subscriptionPlanId,
    }
  }

  if (!config.subscriptionLimited.isActive) {
    throw new Error('Plano de assinatura limitada indisponível no momento')
  }

  return {
    planId: config.subscriptionLimited.id,
    planType,
    label: config.subscriptionLimited.name,
    price: config.subscriptionLimited.monthlyPrice,
    maxParticipants: config.subscriptionLimited.maxParticipants,
    roomsLimit: config.subscriptionLimited.roomsPerMonth,
    tipsPerPlayer: config.subscriptionLimited.tipsPerPlayer,
    summaryLimit: config.subscriptionLimited.summaryLimit,
    durationDays: config.subscriptionLimited.durationDays,
    subscriptionPlanId: config.subscriptionLimited.subscriptionPlanId,
  }
}
