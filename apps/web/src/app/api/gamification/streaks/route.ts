import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { getGamificationPointSettings } from '@/lib/gamification/point-settings.server'

// GET /api/gamification/streaks - Get user streaks
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
    const type = searchParams.get('type')
    const active = searchParams.get('active')

    // Build where clause
    const whereClause: any = {
      userId: session.user.id
    }
    
    if (type) {
      whereClause.streakType = type
    }
    
    if (active === 'true') {
      whereClause.isActive = true
    } else if (active === 'false') {
      whereClause.isActive = false
    }

    const userStreaks = await prisma.userStreak.findMany({
      where: whereClause,
      orderBy: [
        { isActive: 'desc' },
        { currentStreak: 'desc' }
      ]
    })

    return NextResponse.json(userStreaks)
  } catch (error) {
    console.error('Erro ao buscar sequências:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/streaks - Update or create streak
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { type, activity } = await request.json()

    if (!type) {
      return NextResponse.json(
        { error: 'Tipo de sequência é obrigatório' },
        { status: 400 }
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Find existing streak
    let userStreak = await prisma.userStreak.findFirst({
      where: {
        userId: session.user.id,
        streakType: type
      }
    })

    if (!userStreak) {
      // Create new streak
      userStreak = await prisma.userStreak.create({
        data: {
          userId: session.user.id,
          streakType: type,
          currentStreak: 1,
          longestStreak: 1,
          lastActivity: today,
          isActive: true
        }
      })
    } else {
      const lastActivity = userStreak.lastActivity ? new Date(userStreak.lastActivity) : null
      if (lastActivity) lastActivity.setHours(0, 0, 0, 0)

      if (lastActivity && lastActivity.getTime() === today.getTime()) {
        // Already updated today
        return NextResponse.json({
          userStreak,
          message: 'Sequência já atualizada hoje'
        })
      } else if (lastActivity && lastActivity.getTime() === yesterday.getTime()) {
        // Continue streak
        const newStreak = userStreak.currentStreak + 1
        userStreak = await prisma.userStreak.update({
          where: { id: userStreak.id },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(userStreak.longestStreak, newStreak),
            lastActivity: today,
            isActive: true
          }
        })
      } else {
        // Streak broken, restart
        userStreak = await prisma.userStreak.update({
          where: { id: userStreak.id },
          data: {
            currentStreak: 1,
            lastActivity: today,
            isActive: true
          }
        })
      }
    }

    // Check for streak achievements
    await checkStreakAchievements(session.user.id, userStreak)

    return NextResponse.json({
      userStreak,
      message: 'Sequência atualizada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao atualizar sequência:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Helper function to check streak achievements
async function checkStreakAchievements(userId: string, streak: any) {
  const pointSettings = await getGamificationPointSettings()
  const streakMilestones = [
    { days: 3, points: pointSettings.streak3Points },
    { days: 7, points: pointSettings.streak7Points },
    { days: 14, points: pointSettings.streak14Points },
    { days: 30, points: pointSettings.streak30Points },
    { days: 60, points: pointSettings.streak60Points },
    { days: 100, points: pointSettings.streak100Points }
  ]
  
  for (const milestone of streakMilestones) {
    if (streak.currentStreak === milestone.days) {
      const achievementId = `streak_${streak.streakType}_${milestone.days}`
      
      // Check if achievement already exists
      const existingAchievement = await prisma.userAchievement.findFirst({
        where: {
          userId: userId,
          achievementId: achievementId
        }
      })

      if (!existingAchievement) {
        // Award achievement
        await prisma.userAchievement.create({
          data: {
            userId: userId,
            achievementId: achievementId,
            unlockedAt: new Date(),
            metadata: {
              source: 'STREAK_ACHIEVEMENT',
              milestone: milestone.days,
              streakType: streak.streakType
            }
          }
        })

        // Award bonus points
        await prisma.userPoints.upsert({
          where: { userId: userId },
          update: {
            totalPoints: {
              increment: milestone.points
            }
          },
          create: {
            userId: userId,
            totalPoints: milestone.points,
            currentLevel: 1,
            pointsToNext: 100
          }
        })

        // Create transaction record
        await prisma.pointTransaction.create({
          data: {
            userId: userId,
            type: 'EARNED',
            points: milestone.points,
            reason: 'STREAK_ACHIEVEMENT',
            description: `Conquista: Sequência de ${milestone.days} dias`,
            metadata: {
              achievementId: achievementId,
              streakType: streak.streakType,
              streakLength: milestone.days
            }
          }
        })
      }
    }
  }
}
