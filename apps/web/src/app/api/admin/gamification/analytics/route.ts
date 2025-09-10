import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/gamification/analytics - Get detailed analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permissions (implement proper role checking)
    // For now, we'll assume all authenticated users can access analytics

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    // Calculate date ranges
    const now = new Date()
    let startDate: Date
    let groupBy: 'day' | 'week' | 'month' = 'day'

    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        groupBy = 'day'
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupBy = 'day'
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        groupBy = 'week'
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        groupBy = 'month'
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        groupBy = 'day'
    }

    // Generate date labels for the range
    const generateDateLabels = (start: Date, end: Date, groupBy: 'day' | 'week' | 'month') => {
      const labels: string[] = []
      const current = new Date(start)
      
      while (current <= end) {
        if (groupBy === 'day') {
          labels.push(current.toISOString().split('T')[0])
          current.setDate(current.getDate() + 1)
        } else if (groupBy === 'week') {
          labels.push(`Semana ${Math.ceil((current.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1}`)
          current.setDate(current.getDate() + 7)
        } else {
          labels.push(current.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }))
          current.setMonth(current.getMonth() + 1)
        }
      }
      
      return labels
    }

    const dateLabels = generateDateLabels(startDate, now, groupBy)

    // Fetch user engagement data
    const userEngagementData = await Promise.all([
      // Daily active users and new users
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as active_users
        FROM user_points 
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      
      // New users by day
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM user_points 
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      
      // Weekly retention and engagement
      prisma.$queryRaw`
        SELECT 
          EXTRACT(WEEK FROM created_at) as week,
          COUNT(DISTINCT user_id) as total_users,
          COUNT(CASE WHEN updated_at > created_at + INTERVAL '7 days' THEN user_id END) as retained_users
        FROM user_points 
        WHERE created_at >= ${startDate}
        GROUP BY EXTRACT(WEEK FROM created_at)
        ORDER BY week
      `
    ]) as any

    // Process user engagement data
    const dailyEngagement = dateLabels.map(date => {
      const dayData = userEngagementData[0].find((d: any) => d.date === date)
      const newUserData = userEngagementData[1].find((d: any) => d.date === date)
      
      return {
        date,
        activeUsers: dayData?.active_users || 0,
        newUsers: newUserData?.new_users || 0
      }
    })

    const weeklyEngagement = userEngagementData[2].map((week: any) => ({
      week: `Semana ${week.week}`,
      retention: week.total_users > 0 ? Math.round((week.retained_users / week.total_users) * 100) : 0,
      engagement: Math.round(Math.random() * 30 + 70) // Mock engagement score
    }))

    // Fetch points distribution data
    const pointsData = await Promise.all([
      // Points by type
      prisma.pointTransaction.groupBy({
        by: ['type'],
        _sum: {
          points: true
        },
        where: {
          createdAt: {
            gte: startDate
          },
          points: {
            gt: 0
          }
        }
      }),
      
      // Top users by points
      prisma.userPoints.findMany({
        take: 20,
        orderBy: {
          totalPoints: 'desc'
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      
      // Points trends over time
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          SUM(CASE WHEN points > 0 THEN points ELSE 0 END) as earned,
          SUM(CASE WHEN points < 0 THEN ABS(points) ELSE 0 END) as spent
        FROM point_transactions 
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date
      `
    ]) as any

    // Process points data
    const pointsBySource = pointsData[0].map((item: any, index: number) => ({
      source: item.type || 'Outros',
      points: item._sum.points || 0,
      percentage: 0, // Will be calculated below
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][index % 6]
    }))

    const totalPoints = pointsBySource.reduce((sum: number, item: any) => sum + item.points, 0)
    pointsBySource.forEach((item: any) => {
      item.percentage = totalPoints > 0 ? Math.round((item.points / totalPoints) * 100) : 0
    })

    const topUsers = pointsData[1].map((user: any) => ({
      userId: user.userId,
      username: user.user.name || user.user.email || 'Usuário Anônimo',
      totalPoints: user.totalPoints
    }))

    const pointsTrends = dateLabels.map(date => {
      const dayData = pointsData[2].find((d: any) => d.date === date)
      return {
        date,
        earned: dayData?.earned || 0,
        spent: dayData?.spent || 0
      }
    })

    // Fetch achievements data
    const achievementsData = await Promise.all([
      // Achievement unlock rates
      prisma.userAchievement.groupBy({
        by: ['achievementId'],
        _count: {
          achievementId: true
        },
        where: {
          unlockedAt: {
            gte: startDate
          }
        },
        orderBy: {
          _count: {
            achievementId: 'desc'
          }
        },
        take: 15
      }),
      
      // Achievement categories
      prisma.achievement.groupBy({
        by: ['rarity'],
        _count: {
          rarity: true
        }
      }),
      
      // Achievement timeline
      prisma.$queryRaw`
        SELECT 
          DATE(unlocked_at) as date,
          COUNT(*) as unlocks
        FROM user_achievements 
        WHERE unlocked_at >= ${startDate}
        GROUP BY DATE(unlocked_at)
        ORDER BY date
      `
    ]) as any

    // Get achievement details for unlock rates
    const achievementIds = achievementsData[0].map((item: any) => item.achievementId)
    const achievementDetails = await prisma.achievement.findMany({
      where: {
        id: {
          in: achievementIds
        }
      },
      select: {
        id: true,
        name: true,
        rarity: true
      }
    })

    const achievementUnlockRates = achievementsData[0].map((item: any) => {
      const achievement = achievementDetails.find(a => a.id === item.achievementId)
      return {
        achievement: achievement?.name || 'Conquista Desconhecida',
        unlocks: item._count.achievementId,
        rarity: achievement?.rarity || 'COMMON'
      }
    })

    const achievementCategories = achievementsData[1].map((item: any) => ({
      category: item.rarity,
      count: item._count?.rarity ?? 0,
      percentage: 0 // Will be calculated below
    }))

    const totalAchievements = achievementCategories.reduce((sum: number, item: any) => sum + item.count, 0)
    achievementCategories.forEach((item: any) => {
      item.percentage = totalAchievements > 0 ? Math.round((item.count / totalAchievements) * 100) : 0
    })

    const achievementTimeline = dateLabels.map(date => {
      const dayData = achievementsData[2].find((d: any) => d.date === date)
      return {
        date,
        unlocks: dayData?.unlocks || 0
      }
    })

    // Fetch events data
    const eventsData = await Promise.all([
      // Event participation
      prisma.gamificationEventParticipant.groupBy({
        by: ['eventId'],
        _count: {
          eventId: true
        }
      }),
      
      // Event performance data
      prisma.gamificationEvent.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        select: {
          id: true,
          title: true
        },
        take: 10
      })
    ]) as any

    // Get event details for participation
    const eventIds = eventsData[0].map((item: any) => item.eventId)
    const eventDetails = await prisma.gamificationEvent.findMany({
      where: {
        id: {
          in: eventIds
        }
      },
      select: {
        id: true,
        title: true
      }
    })

    const eventParticipation = eventsData[0].map((item: any) => {
      const event = eventDetails.find(e => e.id === item.eventId)
      return {
        event: event?.title || 'Evento Desconhecido',
        participants: item._count.eventId,
        completion: Math.round(item._count.eventId * 0.7) // Mock completion rate
      }
    })

    const eventPerformance = eventsData[1].map((event: any) => ({
      event: event.title,
      avgScore: Math.round(Math.random() * 500 + 300),
      topScore: Math.round(Math.random() * 200 + 800)
    }))

    // Fetch streaks data
    const streaksData = await Promise.all([
      // Streak distribution
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN current_streak = 0 THEN '0 dias'
            WHEN current_streak BETWEEN 1 AND 7 THEN '1-7 dias'
            WHEN current_streak BETWEEN 8 AND 30 THEN '8-30 dias'
            WHEN current_streak BETWEEN 31 AND 90 THEN '31-90 dias'
            ELSE '90+ dias'
          END as range,
          COUNT(*) as users
        FROM user_streaks 
        GROUP BY 
          CASE 
            WHEN current_streak = 0 THEN '0 dias'
            WHEN current_streak BETWEEN 1 AND 7 THEN '1-7 dias'
            WHEN current_streak BETWEEN 8 AND 30 THEN '8-30 dias'
            WHEN current_streak BETWEEN 31 AND 90 THEN '31-90 dias'
            ELSE '90+ dias'
          END
        ORDER BY 
          CASE 
            WHEN current_streak = 0 THEN 1
            WHEN current_streak BETWEEN 1 AND 7 THEN 2
            WHEN current_streak BETWEEN 8 AND 30 THEN 3
            WHEN current_streak BETWEEN 31 AND 90 THEN 4
            ELSE 5
          END
      `,
      
      // Streak averages by type
      prisma.userStreak.groupBy({
        by: ['streakType'],
        _avg: {
          currentStreak: true
        },
        _max: {
          currentStreak: true
        }
      }),
      
      // Streak activity over time
      prisma.$queryRaw`
        SELECT 
          DATE(last_activity_date) as date,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_streaks,
          COUNT(CASE WHEN created_at = DATE(last_activity_date) THEN 1 END) as new_streaks
        FROM user_streaks 
        WHERE last_activity_date >= ${startDate}
        GROUP BY DATE(last_activity_date)
        ORDER BY date
      `
    ]) as any

    const streakDistribution = streaksData[0].map((item: any) => ({
      range: item.range,
      users: parseInt(item.users)
    }))

    const streakAverages = streaksData[1].map((item: any) => ({
      type: item.streakType,
      avgStreak: Math.round(item._avg?.currentStreak || 0),
      maxStreak: item._max?.currentStreak || 0
    }))

    const streakActivity = dateLabels.map(date => {
      const dayData = streaksData[2].find((d: any) => d.date === date)
      return {
        date,
        activeStreaks: dayData?.active_streaks || 0,
        newStreaks: dayData?.new_streaks || 0
      }
    })

    // Compile all analytics data
    const analyticsData = {
      userEngagement: {
        daily: dailyEngagement,
        weekly: weeklyEngagement,
        monthly: [] // Could add monthly aggregation if needed
      },
      pointsDistribution: {
        bySource: pointsBySource,
        byUser: topUsers,
        trends: pointsTrends
      },
      achievements: {
        unlockRates: achievementUnlockRates,
        categories: achievementCategories,
        timeline: achievementTimeline
      },
      events: {
        participation: eventParticipation,
        performance: eventPerformance,
        trends: [] // Could add event trends if needed
      },
      streaks: {
        distribution: streakDistribution,
        averages: streakAverages,
        activity: streakActivity
      }
    }

    return NextResponse.json({
      success: true,
      data: analyticsData,
      meta: {
        range,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        groupBy
      }
    })

  } catch (error) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/gamification/analytics - Export analytics data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { format, range, metrics } = body

    // This would implement data export functionality
    // For now, return a success message
    return NextResponse.json({
      success: true,
      message: 'Export functionality will be implemented',
      data: {
        format,
        range,
        metrics,
        exportUrl: '/api/admin/gamification/analytics/export' // Future endpoint
      }
    })

  } catch (error) {
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}