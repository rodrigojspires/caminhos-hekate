import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { GamificationEngine } from '@/lib/gamification-engine'

type GoalMetric = 'LESSONS_COMPLETED' | 'COMMUNITY_MESSAGES' | 'PRODUCT_PURCHASES'
type GoalRewardMode = 'POINTS' | 'BADGE' | 'BOTH'

async function awardGoalBadge(userId: string, achievementId?: string | null) {
  if (!achievementId) return
  const achievement = await prisma.achievement.findUnique({
    where: { id: achievementId },
    select: { id: true }
  })
  if (!achievement) return
  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId } }
  })
  if (existing) return
  await prisma.userAchievement.create({
    data: {
      userId,
      achievementId,
      unlockedAt: new Date()
    }
  })
}

async function computeMetricValue(userId: string, metric: GoalMetric, startDate: Date, endDate: Date) {
  const range = { gte: startDate, lte: endDate }
  switch (metric) {
    case 'LESSONS_COMPLETED':
      return prisma.progress.count({
        where: { userId, completed: true, updatedAt: range }
      })
    case 'COMMUNITY_MESSAGES':
      return prisma.communityMessage.count({
        where: { authorId: userId, createdAt: range }
      })
    case 'PRODUCT_PURCHASES':
      return prisma.order.count({
        where: {
          userId,
          status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] as any },
          createdAt: range
        }
      })
    default:
      return 0
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const now = new Date()

    const goals = await prisma.gamificationGoal.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: { endDate: 'asc' },
      include: {
        achievement: { select: { id: true, name: true, icon: true } }
      }
    })

    const enriched = []
    for (const goal of goals) {
      const currentValue = await computeMetricValue(userId, goal.metric as GoalMetric, goal.startDate, goal.endDate)
      const existing = await prisma.gamificationGoalProgress.findUnique({
        where: { goalId_userId: { goalId: goal.id, userId } }
      })

      const isComplete = currentValue >= goal.targetValue
      const shouldComplete = isComplete && !existing?.completedAt
      const completedAt = shouldComplete ? new Date() : existing?.completedAt ?? null

      if (existing) {
        await prisma.gamificationGoalProgress.update({
          where: { id: existing.id },
          data: {
            currentValue,
            completedAt,
            lastEvaluatedAt: now
          }
        })
      } else {
        await prisma.gamificationGoalProgress.create({
          data: {
            goalId: goal.id,
            userId,
            currentValue,
            completedAt,
            lastEvaluatedAt: now
          }
        })
      }

      if (shouldComplete) {
        const rewardMode = (goal as any).rewardMode as GoalRewardMode | undefined
        const allowPoints = rewardMode === 'POINTS' || rewardMode === 'BOTH' || !rewardMode
        const allowBadge = rewardMode === 'BADGE' || rewardMode === 'BOTH' || !rewardMode

        if (allowPoints && goal.points > 0) {
          await GamificationEngine.awardPoints(userId, goal.points, 'GOAL_COMPLETED', {
            goalId: goal.id,
            goalTitle: goal.title
          })
        }
        if (allowBadge) {
          await awardGoalBadge(userId, goal.achievementId)
        }
      }

      const percent = Math.min(100, Math.round((currentValue / goal.targetValue) * 100))
      enriched.push({
        goal,
        progress: {
          currentValue,
          targetValue: goal.targetValue,
          percent,
          completedAt
        }
      })
    }

    return NextResponse.json({ goals: enriched })
  } catch (error) {
    console.error('Erro ao carregar metas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
