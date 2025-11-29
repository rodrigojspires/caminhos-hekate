import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/stats - Get user gamification statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user points
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId }
    })

    // Get achievements stats
    const [totalAchievements, unlockedAchievements] = await Promise.all([
      prisma.achievement.count(),
      prisma.userAchievement.count({
        where: { userId }
      })
    ])

    // Get badges stats
    const [totalBadges, earnedBadges] = await Promise.all([
      prisma.badge.count(),
      prisma.userBadge.count({
        where: { userId }
      })
    ])

    // Get streaks stats
    const userStreaks = await prisma.userStreak.findMany({
      where: { userId }
    })

    const activeStreaks = userStreaks.filter(s => s.isActive).length
    const longestStreak = Math.max(...userStreaks.map(s => s.longestStreak), 0)

    // Get leaderboard rank
    const leaderboardRank = await prisma.$queryRaw<[{ rank: number }]>`
      SELECT 
        RANK() OVER (ORDER BY "totalPoints" DESC) as rank
      FROM "user_points" 
      WHERE "userId" = ${userId}
    `

    // Get recent activity stats (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentPointTransactions = await prisma.pointTransaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    const recentAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        unlockedAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        achievement: true
      },
      orderBy: {
        unlockedAt: 'desc'
      },
      take: 5
    })

    const recentBadges = await prisma.userBadge.findMany({
      where: {
        userId,
        earnedAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        badge: true
      },
      orderBy: {
        earnedAt: 'desc'
      },
      take: 5
    })

    // Calculate points earned in last 30 days
    const recentPointsEarned = recentPointTransactions
      .filter(t => t.type === 'EARNED')
      .reduce((sum, t) => sum + t.points, 0)

    // Get achievement progress by category
    const achievementsByCategory = await prisma.achievementCategory.findMany({
      include: {
        achievements: {
          include: {
            userAchievements: {
              where: { userId }
            }
          }
        }
      }
    })

    const categoryProgress = achievementsByCategory.map(category => {
      const totalInCategory = category.achievements.length
      const unlockedInCategory = category.achievements.filter(
        a => a.userAchievements.length > 0
      ).length
      
      return {
        id: category.id,
        name: category.name,
        color: category.color,
        total: totalInCategory,
        unlocked: unlockedInCategory,
        progress: totalInCategory > 0 ? (unlockedInCategory / totalInCategory) * 100 : 0
      }
    })

    // Get weekly activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const weeklyActivity = await prisma.pointTransaction.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo
        },
        type: 'EARNED'
      },
      _sum: {
        points: true
      }
    })

    // Format weekly activity for chart
    const weeklyData = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      
      const dayActivity = weeklyActivity.find(activity => {
        const activityDate = new Date(activity.createdAt)
        activityDate.setHours(0, 0, 0, 0)
        return activityDate.getTime() === date.getTime()
      })
      
      weeklyData.push({
        date: date.toISOString().split('T')[0],
        points: dayActivity?._sum.points || 0
      })
    }

    const stats = {
      // Basic stats
      totalAchievements,
      unlockedAchievements,
      totalBadges,
      earnedBadges,
      currentLevel: userPoints?.currentLevel || 1,
      totalPoints: userPoints?.totalPoints || 0,
      availablePoints: userPoints?.totalPoints || 0,
      experiencePoints: 0,
      nextLevelPoints: userPoints?.pointsToNext || 100,
      activeStreaks,
      longestStreak,
      leaderboardRank: leaderboardRank[0]?.rank || 0,
      
      // Progress percentages
      achievementProgress: totalAchievements > 0 ? (unlockedAchievements / totalAchievements) * 100 : 0,
      badgeProgress: totalBadges > 0 ? (earnedBadges / totalBadges) * 100 : 0,
      levelProgress: userPoints ? ((userPoints.totalPoints % userPoints.pointsToNext) / userPoints.pointsToNext) * 100 : 0,
      
      // Recent activity
      recentPointsEarned,
      recentAchievements: recentAchievements.map(ua => ({
        id: ua.achievement.id,
        title: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        rarity: ua.achievement.rarity,
        points: ua.achievement.points,
        unlockedAt: ua.unlockedAt
      })),
      recentBadges: recentBadges.map(ub => ({
        id: ub.badge.id,
        name: ub.badge.name,
        description: ub.badge.description,
        icon: ub.badge.icon,
        rarity: ub.badge.rarity,
        color: ub.badge.color,
        earnedAt: ub.earnedAt
      })),
      
      // Category progress
      categoryProgress,
      
      // Weekly activity
      weeklyActivity: weeklyData,
      
      // Streaks detail
      streaks: userStreaks.map(streak => ({
        streakType: streak.streakType,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        isActive: streak.isActive,
        lastActivity: streak.lastActivity
      }))
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
