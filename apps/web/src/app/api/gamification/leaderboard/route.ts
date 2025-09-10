import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// GET /api/gamification/leaderboard - Get leaderboard rankings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const querySchema = z.object({
      type: z.enum(['points', 'level', 'achievements', 'streaks']).default('points'),
      period: z.enum(['all', 'monthly', 'weekly', 'daily']).default('all'),
      limit: z.coerce.number().min(1).max(100).default(50),
      includeUser: z.coerce.boolean().default(false)
    })

    const query = querySchema.parse({
      type: searchParams.get('type') ?? undefined,
      period: searchParams.get('period') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      includeUser: searchParams.get('includeUser') ?? undefined
    })

    let leaderboard: any[] = []
    let userRank: any = null

    // Calculate date range for period filtering
    const now = new Date()
    let startDate: Date | null = null
    
    if (query.period !== 'all') {
      startDate = new Date()
      switch (query.period) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'weekly':
          startDate.setDate(startDate.getDate() - startDate.getDay())
          startDate.setHours(0, 0, 0, 0)
          break
        case 'monthly':
          startDate.setDate(1)
          startDate.setHours(0, 0, 0, 0)
          break
      }
    }

    switch (query.type) {
      case 'points':
        // Get top users by total points
        const pointsLeaderboard = await prisma.userPoints.findMany({
          where: query.period === 'all' ? {} : {
            // For period filtering, we need to sum points from transactions
            user: {
              pointTransactions: {
                some: {
                  createdAt: { gte: startDate! }
                }
              }
            }
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: {
            totalPoints: 'asc' // will be replaced below
          },
          take: query.limit
        })

        // Ensure ordering by totalPoints desc (workaround for mixed filters)
        pointsLeaderboard.sort((a, b) => b.totalPoints - a.totalPoints)

        leaderboard = pointsLeaderboard.map((entry, index) => ({
          rank: index + 1,
          userId: entry.userId,
          user: entry.user,
          score: entry.totalPoints,
          level: entry.currentLevel,
          type: 'points'
        }))
        break

      case 'level':
        // Get top users by level
        const levelLeaderboard = await prisma.userPoints.findMany({
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: [
            { currentLevel: 'desc' },
            { totalPoints: 'desc' }
          ],
          take: query.limit
        })

        leaderboard = levelLeaderboard.map((entry, index) => ({
          rank: index + 1,
          userId: entry.userId,
          user: entry.user,
          score: entry.currentLevel,
          totalPoints: entry.totalPoints,
          type: 'level'
        }))
        break

      case 'achievements':
        // Get top users by achievement count
        const achievementCounts = await prisma.userAchievement.groupBy({
          by: ['userId'],
          where: {
            ...(startDate ? { unlockedAt: { gte: startDate } } : {})
          },
          _count: {
            _all: true,
            userId: true
          },
          orderBy: {
            _count: {
              userId: 'desc'
            }
          },
          take: query.limit
        })

        // Get user details for achievement leaderboard
        const userIds = achievementCounts.map(entry => entry.userId)
        const users = await prisma.user.findMany({
          where: {
            id: { in: userIds }
          },
          select: {
            id: true,
            name: true,
            image: true
          }
        })

        const userMap = users.reduce((acc, user) => {
          acc[user.id] = user
          return acc
        }, {} as Record<string, any>)

        leaderboard = achievementCounts.map((entry, index) => {
          const score = typeof entry._count === 'object' && entry._count
            ? (entry._count._all ?? entry._count.userId ?? 0)
            : 0

          return {
            rank: index + 1,
            userId: entry.userId,
            user: userMap[entry.userId],
            score,
            type: 'achievements'
          }
        })
        break

      case 'streaks':
        // Get top users by longest active streaks
        const streakLeaderboard = await prisma.userStreak.findMany({
          where: {
            isActive: true,
            ...(startDate ? { createdAt: { gte: startDate } } : {})
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: [
            { currentStreak: 'desc' },
            { longestStreak: 'desc' }
          ],
          take: query.limit
        })

        leaderboard = streakLeaderboard.map((entry, index) => ({
          rank: index + 1,
          userId: entry.userId,
          user: entry.user,
          score: entry.currentStreak,
          longestStreak: entry.longestStreak,
          streakType: entry.streakType,
          type: 'streaks'
        }))
        break

      default:
        return NextResponse.json(
          { error: 'Tipo de leaderboard inválido' },
          { status: 400 }
        )
    }

    // Find current user's rank if requested
    if (query.includeUser) {
      const userIndex = leaderboard.findIndex(entry => entry.userId === session.user.id)
      if (userIndex !== -1) {
        userRank = leaderboard[userIndex]
      } else {
        // User not in top results, find their actual rank
        switch (query.type) {
          case 'points':
            const userPoints = await prisma.userPoints.findUnique({
              where: { userId: session.user.id },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true
                  }
                }
              }
            })
            
            if (userPoints) {
              const betterCount = await prisma.userPoints.count({
                where: {
                  totalPoints: { gt: userPoints.totalPoints }
                }
              })
              
              userRank = {
                rank: betterCount + 1,
                userId: userPoints.userId,
                user: userPoints.user,
                score: userPoints.totalPoints,
                level: userPoints.currentLevel,
                type: 'points'
              }
            }
            break
            
          // Add similar logic for other types if needed
        }
      }
    }

    return NextResponse.json({
      leaderboard,
      userRank,
      metadata: {
        type: query.type,
        period: query.period,
        limit: query.limit,
        total: leaderboard.length
      }
    })
  } catch (error) {
    console.error('Erro ao obter leaderboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/leaderboard - Update leaderboard entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const inputType: string | undefined = body.type ?? body.category
    const score: number | undefined = body.score
    const metadata = body.metadata ?? {}
    const inputPeriod: string | undefined = body.period

    if (!inputType || score === undefined) {
      return NextResponse.json(
        { error: 'Categoria (type/category) e pontuação são obrigatórios' },
        { status: 400 }
      )
    }

    // Map category string to Prisma enum
    const toCategory = (val: string) => {
      switch (val.toLowerCase()) {
        case 'points':
          return 'POINTS'
        case 'achievements':
          return 'ACHIEVEMENTS'
        case 'streaks':
          return 'STREAKS'
        case 'course_completions':
          return 'COURSE_COMPLETIONS'
        case 'community_participation':
          return 'COMMUNITY_PARTICIPATION'
        // Fallback: map unknown/legacy values like 'level' to POINTS
        default:
          return 'POINTS'
      }
    }

    const toPeriod = (val?: string) => {
      switch ((val ?? 'all').toLowerCase()) {
        case 'daily':
          return 'DAILY'
        case 'weekly':
          return 'WEEKLY'
        case 'monthly':
          return 'MONTHLY'
        case 'yearly':
          return 'YEARLY'
        case 'all':
        default:
          return 'ALL_TIME'
      }
    }

    const category = toCategory(inputType) as any
    const period = toPeriod(inputPeriod) as any

    // Compute periodStart/periodEnd for non ALL_TIME periods
    let periodStart: Date | null = null
    let periodEnd: Date | null = null
    if (period !== 'ALL_TIME') {
      const now = new Date()
      const start = new Date(now)
      switch (period) {
        case 'DAILY':
          start.setHours(0, 0, 0, 0)
          break
        case 'WEEKLY':
          start.setDate(start.getDate() - start.getDay())
          start.setHours(0, 0, 0, 0)
          break
        case 'MONTHLY':
          start.setDate(1)
          start.setHours(0, 0, 0, 0)
          break
        case 'YEARLY':
          start.setMonth(0, 1)
          start.setHours(0, 0, 0, 0)
          break
      }
      periodStart = start
      periodEnd = null
    }

    const bucketWhere = {
      category,
      period,
      ...(periodStart ? { periodStart: periodStart as any } : { periodStart: null as any }),
    }

    // Pre-calculate rank for create
    const betterCountBefore = await prisma.leaderboardEntry.count({
      where: {
        ...bucketWhere,
        score: { gt: score },
      },
    })
    const initialRank = betterCountBefore + 1

    // Create or update leaderboard entry using composite unique
    const leaderboardEntry = await prisma.leaderboardEntry.upsert({
      where: {
        userId_category_period_periodStart: {
          userId: session.user.id,
          category,
          period,
          periodStart: periodStart as any, // null for ALL_TIME
        },
      },
      update: {
        score,
        metadata,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        category,
        period,
        periodStart: periodStart ?? null,
        periodEnd: periodEnd ?? null,
        score,
        rank: initialRank,
        metadata,
      },
    })

    // Calculate new rank within same bucket after upsert
    const betterCount = await prisma.leaderboardEntry.count({
      where: {
        ...bucketWhere,
        score: { gt: score },
      },
    })

    const rank = betterCount + 1

    // Persist updated rank if changed
    if (leaderboardEntry.rank !== rank) {
      await prisma.leaderboardEntry.update({
        where: { id: leaderboardEntry.id },
        data: { rank },
      })
    }

    return NextResponse.json({
      leaderboardEntry: { ...leaderboardEntry, rank },
      rank,
      message: 'Entrada do leaderboard atualizada com sucesso',
    })
  } catch (error) {
    console.error('Error updating leaderboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}