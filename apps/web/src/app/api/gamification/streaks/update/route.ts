import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { notificationService } from '@/lib/notifications/notification-service'
import { achievementEngine } from '@/lib/gamification/achievement-engine'

// POST /api/gamification/streaks/update - Update user streak
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { type, metadata } = await request.json()

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

    // Get or create user streak
    let userStreak = await prisma.userStreak.findUnique({
      where: {
        userId_streakType: {
          userId: session.user.id,
          streakType: type
        }
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
        // Already updated today, no change needed
        return NextResponse.json({
          streak: userStreak,
          milestone: false,
          alreadyUpdated: true
        })
      } else if (lastActivity && lastActivity.getTime() === yesterday.getTime()) {
        // Continue streak
        const newCurrentStreak = userStreak.currentStreak + 1
        const newLongestStreak = Math.max(userStreak.longestStreak, newCurrentStreak)
        
        userStreak = await prisma.userStreak.update({
          where: { id: userStreak.id },
          data: {
            currentStreak: newCurrentStreak,
            longestStreak: newLongestStreak,
            lastActivity: today,
            isActive: true
          }
        })
      } else {
        // Streak broken or no previous activity, restart
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

    // Check for streak milestones (every 5, 10, 25, 50, 100 days)
    const milestones = [5, 10, 25, 50, 100, 200, 365]
    const isMilestone = milestones.includes(userStreak.currentStreak)

    if (isMilestone) {
      // Create streak milestone notification
      await notificationService.createStreakMilestoneNotification(
        session.user.id,
        userStreak.currentStreak,
        type,
        userStreak.longestStreak
      )

      // Award bonus points for milestone
      const bonusPoints = Math.floor(userStreak.currentStreak / 5) * 10
      
      await prisma.userPoints.upsert({
        where: { userId: session.user.id },
        update: {
          totalPoints: { increment: bonusPoints }
        },
        create: {
          userId: session.user.id,
          totalPoints: bonusPoints,
          currentLevel: 1,
          pointsToNext: 100
        }
      })

      // Create point transaction
      await prisma.pointTransaction.create({
        data: {
          userId: session.user.id,
          type: 'EARNED',
          points: bonusPoints,
          reason: `Milestone de ${userStreak.currentStreak} dias em ${type}`,
          description: `Milestone de ${userStreak.currentStreak} dias em ${type}`,
          metadata: {
            streakType: type,
            streakDays: userStreak.currentStreak,
            milestone: true,
            ...metadata
          }
        }
      })
    }

    // Process achievements (no return value)
    await achievementEngine.processActivity({
      userId: session.user.id,
      type: 'STREAK_UPDATED',
      data: {
        streakType: type,
        currentStreak: userStreak.currentStreak,
        longestStreak: userStreak.longestStreak,
        milestone: isMilestone,
        ...metadata
      },
      timestamp: new Date()
    })

    return NextResponse.json({
      streak: userStreak,
      milestone: isMilestone,
      bonusPoints: isMilestone ? Math.floor(userStreak.currentStreak / 5) * 10 : 0,
      newAchievements: [],
      newBadges: []
    })
  } catch (error) {
    console.error('Erro ao atualizar sequência:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}