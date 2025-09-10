import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/gamification/stats - Get gamification statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (you might want to implement proper role checking)
    // For now, we'll assume all authenticated users can access admin stats
    // In production, add proper admin role validation

    // Get current date for time-based queries
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch all statistics in parallel
    const [
      totalUsers,
      activeEvents,
      totalAchievements,
      totalRewards,
      pointsDistributed,
      recentActivity,
      monthlyStats
    ] = await Promise.all([
      // Total users with points (active users)
      prisma.userPoints.count(),
      
      // Active events
      prisma.gamificationEvent.count({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: now
          }
        }
      }),
      
      // Total unique achievements
      prisma.achievement.count(),
      
      // Total active rewards
      prisma.achievementReward.count({
        where: {
          isActive: true
        }
      }),
      
      // Total points distributed
      prisma.pointTransaction.aggregate({
        _sum: {
          points: true
        },
        where: {
          points: {
            gt: 0
          }
        }
      }),
      
      // Recent activity (last 30 days)
      prisma.pointTransaction.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      
      // Monthly comparison stats
      Promise.all([
        // Current month users
        prisma.userPoints.count({
          where: {
            createdAt: {
              gte: currentMonth
            }
          }
        }),
        // Last month users
        prisma.userPoints.count({
          where: {
            createdAt: {
              gte: lastMonth,
              lt: currentMonth
            }
          }
        }),
        // Current month points
        prisma.pointTransaction.aggregate({
          _sum: {
            points: true
          },
          where: {
            createdAt: {
              gte: currentMonth
            },
            points: {
              gt: 0
            }
          }
        }),
        // Last month points
        prisma.pointTransaction.aggregate({
          _sum: {
            points: true
          },
          where: {
            createdAt: {
              gte: lastMonth,
              lt: currentMonth
            },
            points: {
              gt: 0
            }
          }
        })
      ])
    ])

    // Calculate engagement rate (users with activity in last 30 days / total users)
    const engagementRate = totalUsers > 0 ? Math.round((recentActivity / totalUsers) * 100) : 0

    // Calculate monthly growth rates
    const [currentMonthUsers, lastMonthUsers, currentMonthPoints, lastMonthPoints] = monthlyStats
    
    const userGrowthRate = lastMonthUsers > 0 
      ? Math.round(((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100)
      : 0
    
    const pointsGrowthRate = (lastMonthPoints._sum.points || 0) > 0
      ? Math.round((((currentMonthPoints._sum.points || 0) - (lastMonthPoints._sum.points || 0)) / (lastMonthPoints._sum.points || 0)) * 100)
      : 0

    // Get additional insights
    const [
      topAchievements,
      topRewards,
      eventParticipation,
      streakStats
    ] = await Promise.all([
      // Most unlocked achievements
      prisma.userAchievement.groupBy({
        by: ['achievementId'],
        _count: {
          achievementId: true
        },
        orderBy: {
          _count: {
            achievementId: 'desc'
          }
        },
        take: 5
      }),
      
      // Most claimed rewards
      prisma.userReward.groupBy({
        by: ['rewardId'],
        _count: {
          rewardId: true
        },
        orderBy: {
          _count: {
            rewardId: 'desc'
          }
        },
        take: 5
      }),
      
      // Event participation stats
      prisma.gamificationEventParticipant.groupBy({
        by: ['eventId'],
        _count: {
          eventId: true
        },
        orderBy: {
          _count: {
            eventId: 'desc'
          }
        },
        take: 5
      }),
      
      // Streak statistics
      prisma.userStreak.aggregate({
        _avg: {
          currentStreak: true
        },
        _max: {
          currentStreak: true
        },
        _count: {
          id: true
        },
        where: {
          isActive: true
        }
      })
    ])

    const stats = {
      totalUsers,
      activeEvents,
      totalAchievements,
      totalRewards,
      pointsDistributed: pointsDistributed._sum.points || 0,
      engagementRate,
      growth: {
        users: userGrowthRate,
        points: pointsGrowthRate
      },
      insights: {
        topAchievements: topAchievements.length,
        topRewards: topRewards.length,
        eventParticipation: eventParticipation.length,
        averageStreak: Math.round(streakStats._avg.currentStreak || 0),
        maxStreak: streakStats._max.currentStreak || 0,
        activeStreaks: streakStats._count.id || 0
      },
      activity: {
        recentTransactions: recentActivity,
        monthlyUsers: currentMonthUsers,
        monthlyPoints: currentMonthPoints._sum.points || 0
      }
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error fetching gamification stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/gamification/stats - Refresh/recalculate statistics
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check admin permissions (implement proper role checking)
    // For now, we'll assume all authenticated users can refresh stats

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'recalculate_points':
        // Recalculate user points from transactions
        const users = await prisma.userPoints.findMany()
        
        for (const user of users) {
          const totalPoints = await prisma.pointTransaction.aggregate({
            _sum: {
              points: true
            },
            where: {
              userId: user.userId
            }
          })
          
          await prisma.userPoints.update({
            where: {
              userId: user.userId
            },
            data: {
              totalPoints: totalPoints._sum.points || 0
            }
          })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Points recalculated successfully'
        })

      case 'update_leaderboards':
        // Update all leaderboard entries
        const leaderboardEntries = await prisma.leaderboardEntry.findMany({
          include: {
            user: {
              include: {
                userPoints: true
              }
            }
          }
        })
        
        // Group by type and recalculate ranks
        const leaderboardsByType = leaderboardEntries.reduce((acc, entry) => {
          const key = String(entry.category)
          if (!acc[key]) acc[key] = []
          acc[key].push(entry)
          return acc
        }, {} as Record<string, typeof leaderboardEntries>)
        
        for (const [type, entries] of Object.entries(leaderboardsByType)) {
          const sortedEntries = entries.sort((a, b) => b.score - a.score)
          
          for (let i = 0; i < sortedEntries.length; i++) {
            await prisma.leaderboardEntry.update({
              where: {
                id: sortedEntries[i].id
              },
              data: {
                rank: i + 1
              }
            })
          }
        }
        
        return NextResponse.json({
          success: true,
          message: 'Leaderboards updated successfully'
        })

      case 'cleanup_expired':
        // Clean up expired events and inactive streaks
        const now = new Date()
        
        await Promise.all([
          // Update expired events
          prisma.gamificationEvent.updateMany({
            where: {
              endDate: {
                lt: now
              },
              status: 'ACTIVE'
            },
            data: {
              status: 'COMPLETED'
            }
          }),
          
          // Deactivate old streaks
          prisma.userStreak.updateMany({
            where: {
              lastActivity: {
                lt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
              },
              isActive: true
            },
            data: {
              isActive: false
            }
          })
        ])
        
        return NextResponse.json({
          success: true,
          message: 'Expired data cleaned up successfully'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error processing admin action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}