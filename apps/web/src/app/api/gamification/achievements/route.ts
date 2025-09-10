import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { withGamificationAuth } from '@/lib/auth-middleware'

// GET /api/gamification/achievements - Get user achievements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // maps to AchievementCategory.name
    const rarity = searchParams.get('rarity') // maps to Achievement.rarity
    const unlocked = searchParams.get('unlocked')

    // Build where clause using related Achievement fields
    const whereClause: any = {
      userId: session.user.id,
    }

    if (unlocked === 'true') {
      whereClause.unlockedAt = { not: null }
    } else if (unlocked === 'false') {
      whereClause.unlockedAt = null
    }

    // Relation-based filters
    if (type || rarity) {
      whereClause.achievement = {}
      if (type) {
        // filter by category name
        whereClause.achievement.category = { is: { name: type } }
      }
      if (rarity) {
        whereClause.achievement.rarity = rarity
      }
    }

    const achievements = await prisma.userAchievement.findMany({
      where: whereClause,
      include: {
        achievement: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            rarity: true,
            points: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { unlockedAt: 'desc' },
        { achievement: { rarity: 'desc' } },
      ],
    })

    // Get achievement statistics for unlocked only
    const unlockedAchievements = achievements.filter(a => a.unlockedAt !== null)

    const totalUnlocked = unlockedAchievements.length

    const totalPointsEarned = unlockedAchievements.reduce((sum, ua) => sum + (ua.achievement?.points || 0), 0)

    const byType = unlockedAchievements.reduce((acc, ua) => {
      const key = ua.achievement?.category?.name || 'UNKNOWN'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const byRarity = unlockedAchievements.reduce((acc, ua) => {
      const key = ua.achievement?.rarity || 'COMMON'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      achievements,
      statistics: {
        totalUnlocked,
        totalPointsEarned,
        byType,
        byRarity,
      },
    })
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/achievements - Manually award achievement (admin only)
export const POST = withGamificationAuth(async (_user, request: NextRequest) => {
  try {
    const { 
      userId, 
      achievementId, 
      metadata 
    } = await request.json()

    if (!userId || !achievementId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: userId, achievementId' },
        { status: 400 }
      )
    }

    // Ensure achievement exists
    const baseAchievement = await prisma.achievement.findUnique({
      where: { id: achievementId },
      select: { id: true, name: true, points: true, rarity: true, category: { select: { name: true } } },
    })

    if (!baseAchievement) {
      return NextResponse.json(
        { error: 'Conquista (Achievement) não encontrada' },
        { status: 404 }
      )
    }

    // Check if already awarded
    const existingAchievement = await prisma.userAchievement.findFirst({
      where: {
        userId,
        achievementId,
      },
    })

    if (existingAchievement) {
      return NextResponse.json(
        { error: 'Conquista já foi concedida a este usuário' },
        { status: 400 }
      )
    }

    // Create userAchievement entry
    const achievement = await prisma.userAchievement.create({
      data: {
        userId,
        achievementId,
        metadata: metadata || {},
        unlockedAt: new Date(),
      },
      include: {
        achievement: {
          select: { id: true, name: true, points: true, rarity: true, category: { select: { name: true } } },
        },
      },
    })

    const pointsToAward = baseAchievement.points || 0

    if (pointsToAward > 0) {
      await prisma.userPoints.upsert({
        where: { userId },
        update: {
          totalPoints: {
            increment: pointsToAward,
          },
        },
        create: {
          userId,
          totalPoints: pointsToAward,
          currentLevel: 1,
          pointsToNext: 100,
        },
      })

      // Create transaction record
      await prisma.pointTransaction.create({
        data: {
          userId,
          type: 'EARNED',
          points: pointsToAward,
          reason: 'ACHIEVEMENT',
          description: `Conquista: ${baseAchievement.name}`,
          metadata: {
            achievementId,
            category: baseAchievement.category?.name,
            rarity: baseAchievement.rarity,
          },
        },
      })
    }

    return NextResponse.json({
      achievement,
      message: 'Conquista concedida com sucesso',
    })
  } catch (error) {
    console.error('Error awarding achievement:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// DELETE /api/gamification/achievements - Remove achievement (admin only)
export const DELETE = withGamificationAuth(async (_user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const achievementId = searchParams.get('achievementId')
    const userId = searchParams.get('userId')

    if (!achievementId || !userId) {
      return NextResponse.json(
        { error: 'achievementId e userId são obrigatórios' },
        { status: 400 }
      )
    }

    // Find achievement link
    const userAchievement = await prisma.userAchievement.findFirst({
      where: {
        userId,
        achievementId,
      },
      include: { achievement: { select: { points: true, name: true, rarity: true, category: { select: { name: true } } } } },
    })

    if (!userAchievement) {
      return NextResponse.json(
        { error: 'Conquista não encontrada' },
        { status: 404 }
      )
    }

    // Remove achievement
    await prisma.userAchievement.delete({
      where: { id: userAchievement.id },
    })

    const pointsFromAchievement = userAchievement.achievement?.points || 0

    // Deduct points if they were awarded
    if (pointsFromAchievement > 0) {
      await prisma.userPoints.update({
        where: { userId },
        data: {
          totalPoints: {
            decrement: pointsFromAchievement,
          },
        },
      })

      // Create transaction record
      await prisma.pointTransaction.create({
        data: {
          userId,
          type: 'SPENT',
          points: -pointsFromAchievement,
          reason: 'ACHIEVEMENT_REMOVED',
          description: `Conquista removida: ${userAchievement.achievement?.name}`,
          metadata: {
            achievementId,
            category: userAchievement.achievement?.category?.name,
            rarity: userAchievement.achievement?.rarity,
          },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing achievement:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})