import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/achievements - Get user achievements
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const unlocked = searchParams.get('unlocked')
    const rarity = searchParams.get('rarity')

    // Build where clause
    const whereClause: any = {}
    if (categoryId) {
      whereClause.categoryId = categoryId
    }
    if (rarity) {
      whereClause.rarity = rarity
    }

    // Get all achievements with user progress
    const achievements = await prisma.achievement.findMany({
      where: whereClause,
      include: {
        category: true,
        userAchievements: {
          where: {
            userId: session.user.id
          }
        },
        rewards: true
      },
      orderBy: [
        { rarity: 'asc' },
        { points: 'desc' },
        { name: 'asc' }
      ]
    })

    // Transform data to include unlock status and progress
    const transformedAchievements = achievements.map((achievement) => {
      const userAchievement = achievement.userAchievements[0]
      
      return {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        rarity: achievement.rarity,
        points: achievement.points,
        categoryId: achievement.categoryId,
        category: achievement.category,
        unlocked: !!userAchievement,
        unlockedAt: userAchievement?.unlockedAt,
        // progress is JSON in schema; exposing it directly maintains fidelity
        progress: userAchievement?.progress ?? null,
        rewards: achievement.rewards
      }
    })

    // Filter by unlocked status if specified
    let filteredAchievements = transformedAchievements
    if (unlocked === 'true') {
      filteredAchievements = transformedAchievements.filter((a) => a.unlocked)
    } else if (unlocked === 'false') {
      filteredAchievements = transformedAchievements.filter((a) => !a.unlocked)
    }

    return NextResponse.json(filteredAchievements)
  } catch (error) {
    console.error('Erro ao buscar conquistas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/achievements - Manually unlock achievement (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Check if user is admin (you might want to implement proper role checking)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { userId, achievementId, progress } = await request.json()

    if (!userId || !achievementId) {
      return NextResponse.json(
        { error: 'userId e achievementId são obrigatórios' },
        { status: 400 }
      )
    }

    // Get achievement details
    const achievement = await prisma.achievement.findUnique({
      where: { id: achievementId }
    })

    if (!achievement) {
      return NextResponse.json(
        { error: 'Conquista não encontrada' },
        { status: 404 }
      )
    }

    // Create user achievement
    const userAchievement = await prisma.userAchievement.create({
      data: {
        userId,
        achievementId,
        // progress is JSON; accept provided value or null
        progress: progress ?? null,
        unlockedAt: new Date()
      }
    })

    // Award points: update or create UserPoints with totalPoints only (schema fields)
    await prisma.userPoints.upsert({
      where: { userId },
      update: {
        totalPoints: { increment: achievement.points }
      },
      create: {
        userId,
        totalPoints: achievement.points
      }
    })

    // Create point transaction (requires reason)
    await prisma.pointTransaction.create({
      data: {
        userId,
        type: 'EARNED',
        points: achievement.points,
        reason: `Conquista desbloqueada: ${achievement.name}`,
        description: `Conquista desbloqueada: ${achievement.name}`,
        metadata: {
          achievementId,
          achievementTitle: achievement.name
        }
      }
    })

    return NextResponse.json({
      userAchievement,
      pointsAwarded: achievement.points
    })
  } catch (error) {
    console.error('Erro ao desbloquear conquista:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}