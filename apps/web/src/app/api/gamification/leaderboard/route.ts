import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// Types
type LeaderboardItem = {
  rank: number
  userId: string
  name?: string | null
  email?: string | null
  image?: string | null
  score: number
  level: number
  achievements: number
  badges: number
}

// GET /api/gamification/leaderboard - Get leaderboard data
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
    const category = searchParams.get('category') || 'POINTS'
    const period = (searchParams.get('period') || 'ALL_TIME').toUpperCase()
    const format = (searchParams.get('format') || 'json').toLowerCase()
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const offset = (page - 1) * limit

    let dateFilter: Record<string, any> = {}
    const now = new Date()
    
    // Apply period filter
    switch (period) {
      case 'DAILY': {
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        dateFilter = { gte: startOfDay }
        break
      }
      case 'WEEKLY': {
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        startOfWeek.setHours(0, 0, 0, 0)
        dateFilter = { gte: startOfWeek }
        break
      }
      case 'MONTHLY': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        dateFilter = { gte: startOfMonth }
        break
      }
      case 'CUSTOM': {
        const start = startParam ? new Date(startParam) : null
        const end = endParam ? new Date(endParam) : null
        if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
          dateFilter = { gte: start, lte: end }
        } else if (start && !isNaN(start.getTime())) {
          dateFilter = { gte: start }
        } else if (end && !isNaN(end.getTime())) {
          dateFilter = { lte: end }
        } else {
          // Fallback to all time if invalid custom range
          dateFilter = {}
        }
        break
      }
      case 'ALL_TIME':
      default:
        dateFilter = {}
        break
    }

    let leaderboardData: LeaderboardItem[] = []
    let userRank: number | null = null
    let totalUsers = 0

    if (category === 'POINTS') {
      if (period === 'ALL_TIME') {
        // Points leaderboard - all time from UserPoints
        const userPoints = await prisma.userPoints.findMany({
          orderBy: { totalPoints: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          },
          skip: offset,
          take: limit
        })

        totalUsers = await prisma.userPoints.count()

        leaderboardData = userPoints.map((up, index) => ({
          rank: offset + index + 1,
          userId: up.userId,
          name: up.user?.name ?? null,
          email: up.user?.email ?? null,
          image: up.user?.image ?? null,
          score: up.totalPoints,
          level: up.currentLevel,
          achievements: 0,
          badges: 0
        }))

        // Get user's rank (raw SQL for window function)
        const userRankQuery = await prisma.$queryRaw<Array<{ rank: number }>>`
          SELECT 
            RANK() OVER (ORDER BY total_points DESC) as rank
          FROM user_points 
          WHERE user_id = ${session.user.id}
        `
        userRank = userRankQuery[0]?.rank ?? null
      } else {
        // Period points leaderboard - from point transactions (EARNED)
        const grouped = await prisma.pointTransaction.groupBy({
          by: ['userId'],
          where: {
            type: 'EARNED',
            createdAt: dateFilter
          },
          _sum: { points: true },
          orderBy: { _sum: { points: 'desc' } },
          skip: offset,
          take: limit
        })

        const allGrouped = await prisma.pointTransaction.groupBy({
          by: ['userId'],
          where: {
            type: 'EARNED',
            createdAt: dateFilter
          },
          _sum: { points: true },
          orderBy: { _sum: { points: 'desc' } }
        })
        totalUsers = allGrouped.length

        const userIds = grouped.map((g) => g.userId)
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, image: true }
        })
        const userMap = users.reduce((map, u) => {
          map[u.id] = u
          return map
        }, {} as Record<string, { id: string; name: string | null; email: string | null; image: string | null }>)

        leaderboardData = grouped
          .filter((g) => (g._sum.points ?? 0) > 0)
          .map((g, index) => ({
            rank: offset + index + 1,
            userId: g.userId,
            name: userMap[g.userId]?.name ?? null,
            email: userMap[g.userId]?.email ?? null,
            image: userMap[g.userId]?.image ?? null,
            score: g._sum.points ?? 0,
            level: 0, // will be populated below
            achievements: 0,
            badges: 0
          }))

        const userIndex = allGrouped.findIndex((g) => g.userId === session.user.id)
        userRank = userIndex >= 0 ? userIndex + 1 : null
      }

    } else if (category === 'ACHIEVEMENTS') {
      // Achievements leaderboard
      const achievementCounts = await prisma.userAchievement.groupBy({
        by: ['userId'],
        where: 'gte' in dateFilter ? { unlockedAt: dateFilter } : {},
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        skip: offset,
        take: limit
      })

      const userIds = achievementCounts.map((ac) => ac.userId)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, image: true }
      })
      const userMap = users.reduce((map, user) => {
        map[user.id] = user
        return map
      }, {} as Record<string, any>)

      leaderboardData = achievementCounts.map((ac, index) => {
        const user = userMap[ac.userId]
        return {
          rank: offset + index + 1,
          userId: ac.userId,
          name: user?.name ?? null,
          email: user?.email ?? null,
          image: user?.image ?? null,
          score: ac._count.userId,
          level: 0, // Will be populated below
          achievements: ac._count.userId,
          badges: 0
        }
      })

      totalUsers = await prisma.userAchievement
        .groupBy({ by: ['userId'], where: 'gte' in dateFilter ? { unlockedAt: dateFilter } : {} })
        .then((results) => results.length)

      // Get user's rank
      const allAchievementCounts = await prisma.userAchievement.groupBy({
        by: ['userId'],
        where: 'gte' in dateFilter ? { unlockedAt: dateFilter } : {},
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } }
      })
      const userIndex = allAchievementCounts.findIndex((ac) => ac.userId === session.user.id)
      userRank = userIndex >= 0 ? userIndex + 1 : null

    } else if (category === 'BADGES') {
      // Badges leaderboard
      const badgeCounts = await prisma.userBadge.groupBy({
        by: ['userId'],
        where: 'gte' in dateFilter ? { earnedAt: dateFilter } : {},
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        skip: offset,
        take: limit
      })

      const userIds = badgeCounts.map((bc) => bc.userId)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, image: true }
      })
      const userMap = users.reduce((map, user) => {
        map[user.id] = user
        return map
      }, {} as Record<string, any>)

      leaderboardData = badgeCounts.map((bc, index) => {
        const user = userMap[bc.userId]
        return {
          rank: offset + index + 1,
          userId: bc.userId,
          name: user?.name ?? null,
          email: user?.email ?? null,
          image: user?.image ?? null,
          score: bc._count.userId,
          level: 0,
          achievements: 0,
          badges: bc._count.userId
        }
      })

      totalUsers = await prisma.userBadge
        .groupBy({ by: ['userId'], where: 'gte' in dateFilter ? { earnedAt: dateFilter } : {} })
        .then((results) => results.length)

      // Get user's rank
      const allBadgeCounts = await prisma.userBadge.groupBy({
        by: ['userId'],
        where: 'gte' in dateFilter ? { earnedAt: dateFilter } : {},
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } }
      })
      const userIndex = allBadgeCounts.findIndex((bc) => bc.userId === session.user.id)
      userRank = userIndex >= 0 ? userIndex + 1 : null
    }

    // Populate additional data for all entries
    if (leaderboardData.length > 0) {
      const userIds = leaderboardData.map((item) => item.userId)
      
      // Get user points for level info
      const userPointsData = await prisma.userPoints.findMany({
        where: { userId: { in: userIds } }
      })

      // Get achievement counts
      const achievementCounts = await prisma.userAchievement.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { userId: true }
      })

      // Get badge counts
      const badgeCounts = await prisma.userBadge.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { userId: true }
      })

      // Create lookup maps
      const pointsMap = userPointsData.reduce((map, up) => {
        map[up.userId] = up
        return map
      }, {} as Record<string, { userId: string; totalPoints: number; currentLevel: number }>)

      const achievementsMap = achievementCounts.reduce((map, ac) => {
        map[ac.userId] = ac._count.userId
        return map
      }, {} as Record<string, number>)

      const badgesMap = badgeCounts.reduce((map, bc) => {
        map[bc.userId] = bc._count.userId
        return map
      }, {} as Record<string, number>)

      // Update leaderboard data
      leaderboardData = leaderboardData.map((item) => ({
        ...item,
        level: pointsMap[item.userId]?.currentLevel || 1,
        achievements: category === 'ACHIEVEMENTS' ? item.achievements : achievementsMap[item.userId] || 0,
        badges: category === 'BADGES' ? item.badges : badgesMap[item.userId] || 0
      }))
    }

    // CSV export support
    if (format === 'csv') {
      const headers = ['rank', 'userId', 'name', 'email', 'score', 'level', 'achievements', 'badges']
      const rows = leaderboardData.map((row) => [
        row.rank,
        row.userId,
        row.name ?? '',
        row.email ?? '',
        row.score,
        row.level,
        row.achievements,
        row.badges,
      ])
      const csv = [
        headers.join(','),
        ...rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')),
      ].join('\n')
      const filename = `leaderboard_${category.toLowerCase()}_${period.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json({
      leaderboard: leaderboardData,
      userRank,
      totalUsers,
      category,
      period,
      page,
      limit,
      totalPages: Math.ceil(totalUsers / limit)
    })
  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
