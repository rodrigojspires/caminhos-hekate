import { z } from 'zod'

export type PlanType = 'SINGLE_SESSION' | 'SUBSCRIPTION' | 'SUBSCRIPTION_LIMITED'

const PlanConfigSchema = z.object({
  singleSession: z.object({
    pricesByParticipants: z.record(z.string(), z.number()),
    tipsPerPlayer: z.number(),
    summaryLimit: z.number()
  }),
  subscriptionUnlimited: z.object({
    monthlyPrice: z.number(),
    maxParticipants: z.number(),
    tipsPerPlayer: z.number(),
    summaryLimit: z.number()
  }),
  subscriptionLimited: z.object({
    monthlyPrice: z.number(),
    maxParticipants: z.number(),
    roomsPerMonth: z.number(),
    tipsPerPlayer: z.number(),
    summaryLimit: z.number()
  })
})

const DEFAULT_CONFIG = {
  singleSession: {
    pricesByParticipants: {
      '1': 180,
      '2': 180,
      '4': 260,
      '6': 320,
      '8': 380
    },
    tipsPerPlayer: 3,
    summaryLimit: 1
  },
  subscriptionUnlimited: {
    monthlyPrice: 490,
    maxParticipants: 8,
    tipsPerPlayer: 5,
    summaryLimit: 2
  },
  subscriptionLimited: {
    monthlyPrice: 290,
    maxParticipants: 6,
    roomsPerMonth: 4,
    tipsPerPlayer: 3,
    summaryLimit: 1
  }
}

export function getPlanConfig() {
  const raw = process.env.MAHALILAH_PLAN_CONFIG
  if (!raw) {
    return DEFAULT_CONFIG
  }

  try {
    const parsed = JSON.parse(raw)
    return PlanConfigSchema.parse(parsed)
  } catch (error) {
    console.warn('MAHALILAH_PLAN_CONFIG inválido, usando default.', error)
    return DEFAULT_CONFIG
  }
}

export function resolvePlan(planType: PlanType, maxParticipants?: number) {
  const config = getPlanConfig()

  if (planType === 'SINGLE_SESSION') {
    if (!maxParticipants) {
      throw new Error('maxParticipants é obrigatório para sessão avulsa')
    }
    const price = config.singleSession.pricesByParticipants[String(maxParticipants)]
    if (!price) {
      throw new Error('Quantidade de participantes inválida para sessão avulsa')
    }
    return {
      price,
      maxParticipants,
      roomsLimit: 1,
      tipsPerPlayer: config.singleSession.tipsPerPlayer,
      summaryLimit: config.singleSession.summaryLimit,
      durationDays: 30,
      label: `Sessão avulsa (${maxParticipants} participantes)`
    }
  }

  if (planType === 'SUBSCRIPTION') {
    return {
      price: config.subscriptionUnlimited.monthlyPrice,
      maxParticipants: config.subscriptionUnlimited.maxParticipants,
      roomsLimit: null,
      tipsPerPlayer: config.subscriptionUnlimited.tipsPerPlayer,
      summaryLimit: config.subscriptionUnlimited.summaryLimit,
      durationDays: 30,
      label: 'Assinatura ilimitada'
    }
  }

  return {
    price: config.subscriptionLimited.monthlyPrice,
    maxParticipants: config.subscriptionLimited.maxParticipants,
    roomsLimit: config.subscriptionLimited.roomsPerMonth,
    tipsPerPlayer: config.subscriptionLimited.tipsPerPlayer,
    summaryLimit: config.subscriptionLimited.summaryLimit,
    durationDays: 30,
    label: `Assinatura ${config.subscriptionLimited.roomsPerMonth} salas/mês`
  }
}
