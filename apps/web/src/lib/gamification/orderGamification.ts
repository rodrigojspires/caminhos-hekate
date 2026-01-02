"use server"

import { prisma } from '@hekate/database'
import { GamificationEngine } from '@/lib/gamification-engine'
import { getGamificationPointSettings } from '@/lib/gamification/point-settings.server'

const ORDER_GAMIFICATION_CATEGORY_ID = 'orders_category'

function buildOrderAchievements(settings: {
  orderAchievement1Points: number
  orderAchievement5Points: number
  orderAchievement10Points: number
}) {
  return [
    {
      id: 'orders_1',
      name: 'Primeira Compra',
      description: 'Concluiu o primeiro pedido com sucesso.',
      threshold: 1,
      rarity: 'COMMON' as const,
      points: settings.orderAchievement1Points,
      icon: '🛒',
    },
    {
      id: 'orders_5',
      name: 'Cliente Fiel',
      description: 'Concluiu cinco pedidos.',
      threshold: 5,
      rarity: 'RARE' as const,
      points: settings.orderAchievement5Points,
      icon: '💎',
    },
    {
      id: 'orders_10',
      name: 'Membro Ouro',
      description: 'Concluiu dez pedidos.',
      threshold: 10,
      rarity: 'EPIC' as const,
      points: settings.orderAchievement10Points,
      icon: '🏆',
    },
  ]
}

const EVENT_REASON_LABELS: Record<string, string> = {
  ORDER_CREATED: 'Pedido criado',
  ORDER_PAID: 'Pagamento confirmado',
  ORDER_COMPLETED: 'Pedido concluído',
}

export interface OrderGamificationResult {
  pointsAwarded: number
  achievementsUnlocked: string[]
}

export async function handleOrderCreated(params: {
  orderId: string
  orderNumber: string
  userId?: string | null
  totalAmount: number
}) {
  if (!params.userId) return null
  const pointSettings = await getGamificationPointSettings()

  const metadata = {
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    totalAmount: params.totalAmount,
    eventType: 'ORDER_CREATED',
    reasonLabel: EVENT_REASON_LABELS.ORDER_CREATED,
  }

  if (pointSettings.orderCreatedPoints > 0) {
    await GamificationEngine.processEvent({
      userId: params.userId,
      type: 'ORDER_CREATED',
      points: pointSettings.orderCreatedPoints,
      metadata,
    })
  }

  return {
    pointsAwarded: pointSettings.orderCreatedPoints,
    achievementsUnlocked: [] as string[],
  }
}

export async function handleOrderStatusChange(options: {
  orderId: string
  orderNumber: string
  userId?: string | null
  totalAmount: number
  newStatus: string
  previousStatus?: string | null
}) {
  const result: OrderGamificationResult = {
    pointsAwarded: 0,
    achievementsUnlocked: [],
  }

  if (!options.userId) return result
  const pointSettings = await getGamificationPointSettings()

  const metadata = {
    orderId: options.orderId,
    orderNumber: options.orderNumber,
    totalAmount: options.totalAmount,
    status: options.newStatus,
  }

  const events: Array<{ type: string; points: number }> = []

  if (options.newStatus === 'PAID' && options.previousStatus !== 'PAID') {
    events.push({ type: 'ORDER_PAID', points: pointSettings.orderPaidPoints })
  }

  if (options.newStatus === 'DELIVERED' && options.previousStatus !== 'DELIVERED') {
    events.push({ type: 'ORDER_COMPLETED', points: pointSettings.orderCompletedPoints })
  }

  for (const event of events) {
    await GamificationEngine.processEvent({
      userId: options.userId,
      type: event.type,
      points: event.points,
      metadata: {
        ...metadata,
        eventType: event.type,
        reasonLabel: EVENT_REASON_LABELS[event.type] ?? event.type,
      },
    })
    result.pointsAwarded += event.points
  }

  if (options.newStatus === 'DELIVERED' && options.previousStatus !== 'DELIVERED') {
    await ensureOrderAchievements(pointSettings)
    const deliveredCount = await prisma.order.count({
      where: {
        userId: options.userId,
        status: 'DELIVERED',
      },
    })

    for (const achievement of buildOrderAchievements(pointSettings)) {
      if (deliveredCount >= achievement.threshold) {
        const alreadyUnlocked = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId: options.userId,
              achievementId: achievement.id,
            },
          },
        })

        if (!alreadyUnlocked) {
          await prisma.userAchievement.create({
            data: {
              userId: options.userId,
              achievementId: achievement.id,
              metadata: {
                orderId: options.orderId,
                orderNumber: options.orderNumber,
              },
            },
          })
          result.achievementsUnlocked.push(achievement.name)

          if (achievement.points > 0) {
            await GamificationEngine.awardPoints(options.userId, achievement.points, 'ACHIEVEMENT', {
              achievementId: achievement.id,
              orderId: options.orderId,
            })
          }
        }
      }
    }
  }

  return result
}

async function ensureOrderAchievements(settings: {
  orderAchievement1Points: number
  orderAchievement5Points: number
  orderAchievement10Points: number
}) {
  await prisma.achievementCategory.upsert({
    where: { id: ORDER_GAMIFICATION_CATEGORY_ID },
    update: {
      name: 'Pedidos',
      description: 'Conquistas relacionadas aos seus pedidos na loja.',
      icon: '🛍️',
      color: '#f59e0b',
    },
    create: {
      id: ORDER_GAMIFICATION_CATEGORY_ID,
      name: 'Pedidos',
      description: 'Conquistas relacionadas aos seus pedidos na loja.',
      icon: '🛍️',
      color: '#f59e0b',
    },
  })

  for (const achievement of buildOrderAchievements(settings)) {
    await prisma.achievement.upsert({
      where: { id: achievement.id },
      update: {
        name: achievement.name,
        description: achievement.description,
        rarity: achievement.rarity,
        points: achievement.points,
        metadata: {
          threshold: achievement.threshold,
          type: 'ORDER_COMPLETED',
          icon: achievement.icon,
        },
        isActive: true,
        categoryId: ORDER_GAMIFICATION_CATEGORY_ID,
        criteria: {
          type: 'ORDER_COMPLETED',
          threshold: achievement.threshold,
        },
      },
      create: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        points: achievement.points,
        metadata: {
          threshold: achievement.threshold,
          type: 'ORDER_COMPLETED',
        },
        isActive: true,
        categoryId: ORDER_GAMIFICATION_CATEGORY_ID,
        criteria: {
          type: 'ORDER_COMPLETED',
          threshold: achievement.threshold,
        },
      },
    })
  }
}
