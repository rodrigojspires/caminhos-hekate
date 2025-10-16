"use server"

import { prisma } from '@hekate/database'
import { GamificationEngine } from '@/lib/gamification-engine'

const ORDER_GAMIFICATION_CATEGORY_ID = 'orders_category'

const ORDER_ACHIEVEMENTS = [
  {
    id: 'orders_1',
    name: 'Primeira Compra',
    description: 'Concluiu o primeiro pedido com sucesso.',
    threshold: 1,
    rarity: 'COMMON' as const,
    points: 100,
    icon: '🛒',
  },
  {
    id: 'orders_5',
    name: 'Cliente Fiel',
    description: 'Concluiu cinco pedidos.',
    threshold: 5,
    rarity: 'RARE' as const,
    points: 250,
    icon: '💎',
  },
  {
    id: 'orders_10',
    name: 'Membro Ouro',
    description: 'Concluiu dez pedidos.',
    threshold: 10,
    rarity: 'EPIC' as const,
    points: 500,
    icon: '🏆',
  },
]

const ORDER_CREATED_POINTS = 20
const ORDER_PAID_POINTS = 30
const ORDER_COMPLETED_POINTS = 80

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

  const metadata = {
    orderId: params.orderId,
    orderNumber: params.orderNumber,
    totalAmount: params.totalAmount,
  }

  await GamificationEngine.processEvent({
    userId: params.userId,
    type: 'ORDER_CREATED',
    points: ORDER_CREATED_POINTS,
    metadata,
  })

  return {
    pointsAwarded: ORDER_CREATED_POINTS,
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

  const metadata = {
    orderId: options.orderId,
    orderNumber: options.orderNumber,
    totalAmount: options.totalAmount,
    status: options.newStatus,
  }

  const events: Array<{ type: string; points: number }> = []

  if (options.newStatus === 'PAID' && options.previousStatus !== 'PAID') {
    events.push({ type: 'ORDER_PAID', points: ORDER_PAID_POINTS })
  }

  if (options.newStatus === 'DELIVERED' && options.previousStatus !== 'DELIVERED') {
    events.push({ type: 'ORDER_COMPLETED', points: ORDER_COMPLETED_POINTS })
  }

  for (const event of events) {
    await GamificationEngine.processEvent({
      userId: options.userId,
      type: event.type,
      points: event.points,
      metadata,
    })
    result.pointsAwarded += event.points
  }

  if (options.newStatus === 'DELIVERED' && options.previousStatus !== 'DELIVERED') {
    await ensureOrderAchievements()
    const deliveredCount = await prisma.order.count({
      where: {
        userId: options.userId,
        status: 'DELIVERED',
      },
    })

    for (const achievement of ORDER_ACHIEVEMENTS) {
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

async function ensureOrderAchievements() {
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

  for (const achievement of ORDER_ACHIEVEMENTS) {
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
