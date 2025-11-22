import { prisma } from '@hekate/database'

// Types for gamification events
export interface GamificationEvent {
  userId: string
  type: string
  metadata?: Record<string, any>
  points?: number
}

// Main gamification engine class
export class GamificationEngine {
  // Ensure a base category exists for auto achievements
  private static async ensureDefaultCategory() {
    return prisma.achievementCategory.upsert({
      where: { name: 'Sistema' },
      update: {},
      create: {
        name: 'Sistema',
        description: 'Conquistas automáticas geradas pelo sistema',
        icon: 'sparkles',
        color: '#6B46C1'
      }
    })
  }

  // Guarantee an Achievement row exists before linking to user
  private static async ensureAchievementExists(achievement: any) {
    const existing = await prisma.achievement.findUnique({
      where: { id: achievement.achievementId }
    })
    if (existing) return existing

    const category = await this.ensureDefaultCategory()
    return prisma.achievement.create({
      data: {
        id: achievement.achievementId,
        name: achievement.title || achievement.achievementId,
        description: achievement.description || 'Conquista automática',
        categoryId: category.id,
        rarity: achievement.rarity || 'COMMON',
        points: achievement.points || 0,
        criteria: achievement.criteria || { type: achievement.type || 'AUTO' },
        metadata: achievement.metadata || { source: 'auto' }
      }
    })
  }

  // Process a gamification event
  static async processEvent(event: GamificationEvent) {
    try {
      const { userId, type, metadata = {}, points = 0 } = event

      // Award points if specified
      if (points > 0) {
        await this.awardPoints(userId, points, type, metadata)
      }

      // Update streaks
      await this.updateStreaks(userId, type)

      // Check for achievements
      await this.checkAchievements(userId, type, metadata)

      // Update leaderboards
      await this.updateLeaderboards(userId, type, metadata)

      // Process automatic rewards
      await this.processAutomaticRewards(userId, type, metadata)

      return { success: true }
    } catch (error) {
      console.error('Error processing gamification event:', error)
      return { success: false, error }
    }
  }

  // Award points to user
  static async awardPoints(userId: string, points: number, reason: string, metadata: Record<string, any> = {}) {
    // Check for active point multipliers -> using AchievementReward of type BONUS linked via UserReward
    const activeMultipliers = await prisma.userReward.findMany({
      where: {
        userId: userId,
        claimed: false,
        reward: {
          rewardType: 'PREMIUM_DAYS' // placeholder: no multiplier in schema; skip applying
        }
      },
      include: { reward: true }
    })

    let finalPoints = points
    let multiplierUsed = 1

    // No explicit multiplier support in schema; keep finalPoints unchanged

    // Update user points
    const userPoints = await prisma.userPoints.upsert({
      where: { userId: userId },
      update: {
        totalPoints: {
          increment: finalPoints
        }
      },
      create: {
        userId: userId,
        totalPoints: finalPoints,
        currentLevel: 1,
        pointsToNext: 100
      }
    })

    // Calculate level progression
    const newLevel = this.calculateLevel(userPoints.totalPoints)
    if (newLevel > userPoints.currentLevel) {
      await prisma.userPoints.update({
        where: { userId: userId },
        data: {
          currentLevel: newLevel,
          pointsToNext: this.getPointsToNextLevel(newLevel)
        }
      })

      // Award level up achievement
      await this.awardLevelUpAchievement(userId, newLevel)
    }

    const reasonLabel = metadata?.reasonLabel ?? reason
    const eventType = metadata?.eventType ?? reason

    // Create transaction record
    await prisma.pointTransaction.create({
      data: {
        userId: userId,
        type: 'EARNED',
        points: finalPoints,
        reason: reasonLabel,
        description: `Pontos ganhos: ${reasonLabel}`,
        metadata: {
          ...metadata,
          eventType,
          originalReason: reason,
          originalPoints: points,
          multiplier: multiplierUsed
        }
      }
    })

    return { points: finalPoints, multiplier: multiplierUsed }
  }

  // Update user streaks
  static async updateStreaks(userId: string, activityType: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Find or create streak
    let streak = await prisma.userStreak.findFirst({
      where: {
        userId: userId,
        streakType: activityType
      }
    })

    if (!streak) {
      streak = await prisma.userStreak.create({
        data: {
          userId: userId,
          streakType: activityType,
          currentStreak: 1,
          longestStreak: 1,
          lastActivity: today,
          isActive: true
        }
      })
    } else {
      const lastActivity = new Date(streak.lastActivity ?? today)
      lastActivity.setHours(0, 0, 0, 0)

      if (lastActivity.getTime() === today.getTime()) {
        return streak
      } else if (lastActivity.getTime() === yesterday.getTime()) {
        const newStreak = streak.currentStreak + 1
        streak = await prisma.userStreak.update({
          where: { id: streak.id },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(streak.longestStreak, newStreak),
            lastActivity: today,
            isActive: true
          }
        })
      } else {
        streak = await prisma.userStreak.update({
          where: { id: streak.id },
          data: {
            currentStreak: 1,
            lastActivity: today,
            isActive: true
          }
        })
      }
    }

    return streak
  }

  // Check and award achievements
  static async checkAchievements(userId: string, eventType: string, metadata: Record<string, any>) {
    const achievements = await this.getAvailableAchievements(userId, eventType, metadata)
    
    for (const achievement of achievements) {
      await this.awardAchievement(userId, achievement)
    }
  }

  // Get available achievements based on user activity
  static async getAvailableAchievements(userId: string, eventType: string, metadata: Record<string, any>) {
    const achievements = []
    
    // Get user stats
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: userId }
    })

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: userId }
    })

    const existingAchievementIds = userAchievements.map(a => a.achievementId)

    // Points-based achievements
    if (userPoints) {
      const pointMilestones = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000]
      for (const milestone of pointMilestones) {
        const achievementId = `points_${milestone}`
        if (userPoints.totalPoints >= milestone && !existingAchievementIds.includes(achievementId)) {
          achievements.push({
            achievementId,
            title: `${milestone.toLocaleString()} Pontos`,
            description: `Acumulou ${milestone.toLocaleString()} pontos`,
            type: 'POINTS',
            rarity: milestone >= 50000 ? 'LEGENDARY' : milestone >= 10000 ? 'EPIC' : milestone >= 1000 ? 'RARE' : 'COMMON',
            points: Math.floor(milestone / 10)
          })
        }
      }
    }

    // Event-specific achievements
    switch (eventType) {
      case 'LESSON_COMPLETED':
        const lessonCount = await prisma.pointTransaction.count({
          where: {
            userId: userId,
            reason: 'LESSON_COMPLETED'
          }
        })

        const lessonMilestones = [1, 5, 10, 25, 50, 100]
        for (const milestone of lessonMilestones) {
          const achievementId = `lessons_${milestone}`
          if (lessonCount >= milestone && !existingAchievementIds.includes(achievementId)) {
            achievements.push({
              achievementId,
              title: `${milestone} Lições Concluídas`,
              description: `Completou ${milestone} lições`,
              type: 'LESSON',
              rarity: milestone >= 50 ? 'EPIC' : milestone >= 25 ? 'RARE' : 'COMMON',
              points: milestone * 5
            })
          }
        }
        break

      case 'EVENT_PARTICIPATED':
        const eventCount = await prisma.eventRegistration.count({
          where: { userId: userId, status: 'ATTENDED' }
        })

        const eventMilestones = [1, 3, 5, 10, 20]
        for (const milestone of eventMilestones) {
          const achievementId = `events_${milestone}`
          if (eventCount >= milestone && !existingAchievementIds.includes(achievementId)) {
            achievements.push({
              achievementId,
              title: `${milestone} Eventos`,
              description: `Participou de ${milestone} eventos`,
              type: 'EVENT',
              rarity: milestone >= 10 ? 'RARE' : 'COMMON',
              points: milestone * 10
            })
          }
        }
        break
    }

    return achievements
  }

  // Award achievement to user
  static async awardAchievement(userId: string, achievement: any) {
    const existingAchievement = await prisma.userAchievement.findFirst({
      where: {
        userId: userId,
        achievementId: achievement.achievementId
      }
    })

    if (existingAchievement) {
      return existingAchievement
    }

    await this.ensureAchievementExists(achievement)

    const userAchievement = await prisma.userAchievement.create({
      data: {
        userId: userId,
        achievementId: achievement.achievementId
      }
    })

    if (achievement.points > 0) {
      await this.awardPoints(userId, achievement.points, 'ACHIEVEMENT', {
        achievementId: achievement.achievementId
      })
    }

    return userAchievement
  }

  // Award level up achievement
  static async awardLevelUpAchievement(userId: string, level: number) {
    const achievementId = `level_${level}`
    
    const existingAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId: userId,
          achievementId: achievementId
        }
      }
    })

    if (!existingAchievement) {
      await this.ensureAchievementExists({
        achievementId,
        title: `Nível ${level}`,
        description: `Alcançou o nível ${level}`,
        type: 'LEVEL',
        rarity: level >= 50 ? 'LEGENDARY' : level >= 25 ? 'EPIC' : level >= 10 ? 'RARE' : 'COMMON',
        points: Math.max(10, level * 2),
        metadata: { level }
      })

      await prisma.userAchievement.create({
        data: {
          userId: userId,
          achievementId: achievementId
        }
      })
    }
  }

  // Update leaderboards
  static async updateLeaderboards(userId: string, eventType: string, metadata: Record<string, any>) {
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: userId }
    })

    if (userPoints) {
      // Update points leaderboard (ALL_TIME)
      await prisma.leaderboardEntry.upsert({
        where: {
          userId_category_period_periodStart: {
            userId: userId,
            category: 'POINTS',
            period: 'ALL_TIME',
            // If periodStart is non-nullable, use epoch start
            periodStart: new Date(0)
          }
        },
        update: {
          score: userPoints.totalPoints,
          updatedAt: new Date()
        },
        create: {
          userId: userId,
          category: 'POINTS',
          period: 'ALL_TIME',
          score: userPoints.totalPoints,
          rank: 0,
          periodStart: new Date(0)
        }
      })
    }
  }

  // Process automatic rewards
  static async processAutomaticRewards(userId: string, eventType: string, metadata: Record<string, any>) {
    // Check for milestone rewards
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: userId }
    })

    if (userPoints) {
      // Award automatic rewards for point milestones
      const milestones = [1000, 5000, 10000, 25000, 50000]
      
      for (const milestone of milestones) {
        if (userPoints.totalPoints >= milestone) {
          const rewardId = `auto_reward_${milestone}`
          
          // Check if already claimed
          const existingReward = await prisma.userReward.findFirst({
            where: {
              userId: userId,
              reward: {
                metadata: {
                  path: ['autoRewardId'],
                  equals: rewardId
                }
              }
            }
          })

          if (!existingReward) {
            // Create and claim automatic reward
            const bonusPoints = Math.floor(milestone * 0.1)
            
            await prisma.userPoints.update({
              where: { userId: userId },
              data: {
                totalPoints: {
                  increment: bonusPoints
                }
              }
            })

            await prisma.pointTransaction.create({
              data: {
                userId: userId,
                type: 'EARNED',
                points: bonusPoints,
                reason: 'AUTO_REWARD',
                description: `Recompensa automática: ${milestone} pontos`,
                metadata: {
                  milestone: milestone,
                  autoRewardId: rewardId
                }
              }
            })
          }
        }
      }
    }
  }

  // Calculate user level based on points
  static calculateLevel(points: number): number {
    // Level formula: level = floor(sqrt(points / 100)) + 1
    return Math.floor(Math.sqrt(points / 100)) + 1
  }

  // Get points needed for next level
  static getPointsToNextLevel(currentLevel: number): number {
    const nextLevel = currentLevel + 1
    const pointsForNextLevel = Math.pow(nextLevel - 1, 2) * 100
    const pointsForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100
    return pointsForNextLevel - pointsForCurrentLevel
  }
}

// Convenience functions for common events
export const gamificationEvents = {
  lessonCompleted: (userId: string, lessonId: string, points: number = 10) => 
    GamificationEngine.processEvent({
      userId,
      type: 'LESSON_COMPLETED',
      points,
      metadata: { lessonId }
    }),

  eventParticipated: (userId: string, eventId: string, points: number = 25) => 
    GamificationEngine.processEvent({
      userId,
      type: 'EVENT_PARTICIPATED',
      points,
      metadata: { eventId }
    }),

  dailyLogin: (userId: string, points: number = 5) => 
    GamificationEngine.processEvent({
      userId,
      type: 'DAILY_LOGIN',
      points,
      metadata: { date: new Date().toISOString().split('T')[0] }
    }),

  profileCompleted: (userId: string, points: number = 50) => 
    GamificationEngine.processEvent({
      userId,
      type: 'PROFILE_COMPLETED',
      points,
      metadata: {}
    }),

  socialShare: (userId: string, platform: string, points: number = 15) => 
    GamificationEngine.processEvent({
      userId,
      type: 'SOCIAL_SHARE',
      points,
      metadata: { platform }
    })
}
