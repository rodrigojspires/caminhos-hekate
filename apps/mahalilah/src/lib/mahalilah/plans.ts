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

type PlanMarketingContent = {
  forWho: string
  includes: string[]
  limits: string[]
  ctaLabel: string
  ctaHref: string
  aiSummaryLabel: string
  highlight: boolean
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
  marketing: PlanMarketingContent
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
  marketing: PlanMarketingContent
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

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStringList(value: unknown) {
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

function buildSingleSessionPriceLabel(pricesByParticipants: Record<string, number>) {
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

function pluralize(base: string, value: number) {
  return value === 1 ? base : `${base}s`
}

function withFallbackString(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function withFallbackList(value: unknown, fallback: string[]) {
  const parsed = toStringList(value)
  return parsed.length > 0 ? parsed : fallback
}

function buildMarketingContent({
  planType,
  name,
  metadata,
  maxParticipants,
  roomsPerMonth,
  tipsPerPlayer,
  summaryLimit,
  pricesByParticipants,
}: {
  planType: PlanType
  name: string
  metadata: unknown
  maxParticipants: number
  roomsPerMonth: number | null
  tipsPerPlayer: number
  summaryLimit: number
  pricesByParticipants: Record<string, number>
}): PlanMarketingContent {
  const aiSummaryLabel = `${name}: ${tipsPerPlayer} ${pluralize(
    'dica',
    tipsPerPlayer,
  )}/jogador · ${summaryLimit} ${pluralize('síntese', summaryLimit)}.`
  const commonLimits = [
    `Dicas de IA: ${tipsPerPlayer} por jogador/sessão`,
    `Síntese final por IA: ${summaryLimit} por sessão`,
  ]

  const fallbackByType: Record<PlanType, PlanMarketingContent> = {
    SINGLE_SESSION: {
      forWho: 'Autoguiado, terapeutas iniciando ou grupos eventuais.',
      includes: [
        '1 sala ao vivo',
        'Convites por e-mail',
        'Deck randômico e modo terapia',
        ...commonLimits,
      ],
      limits: [
        `Participantes por sessão: até ${maxParticipants}`,
        buildSingleSessionPriceLabel(pricesByParticipants),
      ],
      ctaLabel: 'Comprar sessão',
      ctaHref: '/checkout',
      aiSummaryLabel,
      highlight: false,
    },
    SUBSCRIPTION: {
      forWho: 'Terapeutas e facilitadores com agenda ativa.',
      includes: [
        roomsPerMonth == null ? 'Salas ilimitadas no mês' : `${roomsPerMonth} salas por mês`,
        `Até ${maxParticipants} participantes por sala`,
        'Histórico completo e export',
        'Relatórios e síntese por IA',
        'Suporte prioritário',
      ],
      limits: [...commonLimits, 'Políticas de uso justo'],
      ctaLabel: 'Assinar plano',
      ctaHref: '/checkout',
      aiSummaryLabel,
      highlight: true,
    },
    SUBSCRIPTION_LIMITED: {
      forWho: 'Profissionais com número fixo de grupos por mês.',
      includes: [
        roomsPerMonth == null ? 'Salas ilimitadas no mês' : `${roomsPerMonth} salas por mês`,
        'Convites por e-mail',
        `Até ${maxParticipants} participantes por sala`,
        'Deck randômico + modo terapia',
      ],
      limits: [...commonLimits, 'Salas extras cobradas à parte'],
      ctaLabel: 'Assinar plano',
      ctaHref: '/checkout',
      aiSummaryLabel,
      highlight: false,
    },
  }

  const fallback = fallbackByType[planType]
  if (!isRecord(metadata)) return fallback
  if (!isRecord(metadata.marketing)) return fallback

  const rawMarketing = metadata.marketing
  return {
    forWho: withFallbackString(rawMarketing.forWho, fallback.forWho),
    includes: withFallbackList(rawMarketing.includes, fallback.includes),
    limits: withFallbackList(rawMarketing.limits, fallback.limits),
    ctaLabel: withFallbackString(rawMarketing.ctaLabel, fallback.ctaLabel),
    ctaHref: withFallbackString(rawMarketing.ctaHref, fallback.ctaHref),
    aiSummaryLabel: withFallbackString(rawMarketing.aiSummaryLabel, fallback.aiSummaryLabel),
    highlight:
      typeof rawMarketing.highlight === 'boolean'
        ? rawMarketing.highlight
        : fallback.highlight,
  }
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
  const singleSessionMaxParticipants = Number(singleSession.maxParticipants)
  const singleSessionTipsPerPlayer = Number(singleSession.tipsPerPlayer)
  const singleSessionSummaryLimit = Number(singleSession.summaryLimit)
  const singleSessionPricesByParticipants = buildPricesByParticipants(
    tiers,
    singleSessionMaxParticipants,
  )

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

  const subscriptionUnlimitedMaxParticipants = Number(
    subscriptionUnlimited.maxParticipants,
  )
  const subscriptionUnlimitedTipsPerPlayer = Number(
    subscriptionUnlimited.tipsPerPlayer,
  )
  const subscriptionUnlimitedSummaryLimit = Number(subscriptionUnlimited.summaryLimit)
  const subscriptionUnlimitedRoomsPerMonth =
    subscriptionUnlimited.roomsPerMonth == null
      ? null
      : Number(subscriptionUnlimited.roomsPerMonth)

  const subscriptionLimitedMaxParticipants = Number(subscriptionLimited.maxParticipants)
  const subscriptionLimitedTipsPerPlayer = Number(subscriptionLimited.tipsPerPlayer)
  const subscriptionLimitedSummaryLimit = Number(subscriptionLimited.summaryLimit)
  const subscriptionLimitedRoomsPerMonth =
    subscriptionLimited.roomsPerMonth == null
      ? null
      : Number(subscriptionLimited.roomsPerMonth)

  return {
    singleSession: {
      id: singleSession.id,
      name: singleSession.name,
      description: singleSession.description,
      isActive: singleSession.isActive,
      maxParticipants: singleSessionMaxParticipants,
      durationDays: Number(singleSession.durationDays),
      tipsPerPlayer: singleSessionTipsPerPlayer,
      summaryLimit: singleSessionSummaryLimit,
      marketing: buildMarketingContent({
        planType: 'SINGLE_SESSION',
        name: singleSession.name,
        metadata: singleSession.metadata,
        maxParticipants: singleSessionMaxParticipants,
        roomsPerMonth: 1,
        tipsPerPlayer: singleSessionTipsPerPlayer,
        summaryLimit: singleSessionSummaryLimit,
        pricesByParticipants: singleSessionPricesByParticipants,
      }),
      pricingTiers: tiers,
      pricesByParticipants: singleSessionPricesByParticipants,
    },
    subscriptionUnlimited: {
      id: subscriptionUnlimited.id,
      name: subscriptionUnlimited.name,
      description: subscriptionUnlimited.description,
      isActive: subscriptionUnlimited.isActive,
      subscriptionPlanId: unlimitedSubscriptionPlan.id,
      monthlyPrice: Number(unlimitedSubscriptionPlan.monthlyPrice),
      yearlyPrice: Number(unlimitedSubscriptionPlan.yearlyPrice),
      maxParticipants: subscriptionUnlimitedMaxParticipants,
      roomsPerMonth: subscriptionUnlimitedRoomsPerMonth,
      durationDays: Number(subscriptionUnlimited.durationDays),
      tipsPerPlayer: subscriptionUnlimitedTipsPerPlayer,
      summaryLimit: subscriptionUnlimitedSummaryLimit,
      marketing: buildMarketingContent({
        planType: 'SUBSCRIPTION',
        name: subscriptionUnlimited.name,
        metadata: subscriptionUnlimited.metadata,
        maxParticipants: subscriptionUnlimitedMaxParticipants,
        roomsPerMonth: subscriptionUnlimitedRoomsPerMonth,
        tipsPerPlayer: subscriptionUnlimitedTipsPerPlayer,
        summaryLimit: subscriptionUnlimitedSummaryLimit,
        pricesByParticipants: {},
      }),
    },
    subscriptionLimited: {
      id: subscriptionLimited.id,
      name: subscriptionLimited.name,
      description: subscriptionLimited.description,
      isActive: subscriptionLimited.isActive,
      subscriptionPlanId: limitedSubscriptionPlan.id,
      monthlyPrice: Number(limitedSubscriptionPlan.monthlyPrice),
      yearlyPrice: Number(limitedSubscriptionPlan.yearlyPrice),
      maxParticipants: subscriptionLimitedMaxParticipants,
      roomsPerMonth: subscriptionLimitedRoomsPerMonth,
      durationDays: Number(subscriptionLimited.durationDays),
      tipsPerPlayer: subscriptionLimitedTipsPerPlayer,
      summaryLimit: subscriptionLimitedSummaryLimit,
      marketing: buildMarketingContent({
        planType: 'SUBSCRIPTION_LIMITED',
        name: subscriptionLimited.name,
        metadata: subscriptionLimited.metadata,
        maxParticipants: subscriptionLimitedMaxParticipants,
        roomsPerMonth: subscriptionLimitedRoomsPerMonth,
        tipsPerPlayer: subscriptionLimitedTipsPerPlayer,
        summaryLimit: subscriptionLimitedSummaryLimit,
        pricesByParticipants: {},
      }),
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
