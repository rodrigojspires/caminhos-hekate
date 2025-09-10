import { prisma } from '@hekate/database'
import { notificationService } from '../notifications/notification-service'
import { AchievementRarity, BadgeRarity } from '@prisma/client'

export interface UserActivity {
  userId: string
  type: ActivityType
  data?: Record<string, any>
  timestamp?: Date
}

export type ActivityType = 
  | 'LOGIN'
  | 'COURSE_COMPLETED'
  | 'LESSON_COMPLETED'
  | 'QUIZ_COMPLETED'
  | 'POINTS_EARNED'
  | 'STREAK_UPDATED'
  | 'GROUP_JOINED'
  | 'GROUP_MESSAGE_SENT'
  | 'PROFILE_UPDATED'
  | 'FIRST_PURCHASE'
  | 'SUBSCRIPTION_RENEWED'
  | 'REFERRAL_MADE'
  | 'FEEDBACK_GIVEN'
  | 'ACHIEVEMENT_UNLOCKED'

interface AchievementCriteria {
  type: string
  value?: number
  operator?: 'eq' | 'gte' | 'lte' | 'gt' | 'lt'
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time'
  conditions?: Record<string, any>
}

interface BadgeCriteria {
  type: string
  value?: number
  operator?: 'eq' | 'gte' | 'lte' | 'gt' | 'lt'
  conditions?: Record<string, any>
}

class AchievementEngine {
  private static instance: AchievementEngine

  static getInstance(): AchievementEngine {
    if (!AchievementEngine.instance) {
      AchievementEngine.instance = new AchievementEngine()
    }
    return AchievementEngine.instance
  }

  // Processar atividade do usuário
  async processActivity(activity: UserActivity) {
    try {
      console.log(`Processando atividade: ${activity.type} para usuário ${activity.userId}`)
      
      // Verificar conquistas
      await this.checkAchievements(activity)
      
      // Verificar badges
      await this.checkBadges(activity)
      
      // Atualizar estatísticas do usuário
      await this.updateUserStats(activity)
      
    } catch (error) {
      console.error('Erro ao processar atividade:', error)
    }
  }

  // Verificar conquistas baseadas na atividade
  private async checkAchievements(activity: UserActivity) {
    // Buscar conquistas ativas que o usuário ainda não possui
    const availableAchievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        userAchievements: {
          none: {
            userId: activity.userId
          }
        }
      },
      include: {
        rewards: {
          where: { isActive: true }
        }
      }
    })

    for (const achievement of availableAchievements) {
      const criteria = achievement.criteria as unknown as AchievementCriteria
      
      if (await this.evaluateAchievementCriteria(activity, criteria)) {
        await this.unlockAchievement(activity.userId, achievement)
      }
    }
  }

  // Verificar badges baseados na atividade
  private async checkBadges(activity: UserActivity) {
    // Buscar badges ativos que o usuário ainda não possui
    const availableBadges = await prisma.badge.findMany({
      where: {
        isActive: true,
        userBadges: {
          none: {
            userId: activity.userId
          }
        }
      }
    })

    for (const badge of availableBadges) {
      const criteria = badge.criteria as unknown as BadgeCriteria
      
      if (await this.evaluateBadgeCriteria(activity, criteria)) {
        await this.awardBadge(activity.userId, badge)
      }
    }
  }

  // Avaliar critérios de conquista
  private async evaluateAchievementCriteria(activity: UserActivity, criteria: AchievementCriteria): Promise<boolean> {
    const { userId } = activity
    
    switch (criteria.type) {
      case 'first_login':
        return activity.type === 'LOGIN' && await this.isFirstLogin(userId)
      
      case 'login_streak':
        return activity.type === 'STREAK_UPDATED' && 
               await this.checkStreakValue(userId, 'daily_login', criteria.value!, criteria.operator || 'gte')
      
      case 'course_completion_count':
        return activity.type === 'COURSE_COMPLETED' && 
               await this.checkCompletionCount(userId, 'course', criteria.value!, criteria.operator || 'gte')
      
      case 'total_points':
        return await this.checkTotalPoints(userId, criteria.value!, criteria.operator || 'gte')
      
      case 'achievement_count':
        return activity.type === 'ACHIEVEMENT_UNLOCKED' && 
               await this.checkAchievementCount(userId, criteria.value!, criteria.operator || 'gte')
      
      case 'group_participation':
        return (activity.type === 'GROUP_JOINED' || activity.type === 'GROUP_MESSAGE_SENT') && 
               await this.checkGroupParticipation(userId, criteria.conditions || {})
      
      case 'quiz_perfect_score':
        return activity.type === 'QUIZ_COMPLETED' && 
               activity.data?.score === 100
      
      case 'early_adopter':
        return await this.checkEarlyAdopter(userId, criteria.conditions?.before)
      
      default:
        return false
    }
  }

  // Avaliar critérios de badge
  private async evaluateBadgeCriteria(activity: UserActivity, criteria: BadgeCriteria): Promise<boolean> {
    const { userId } = activity
    
    switch (criteria.type) {
      case 'achievement_count':
        return await this.checkAchievementCount(userId, criteria.value!, criteria.operator || 'gte')
      
      case 'streak_days':
        return activity.type === 'STREAK_UPDATED' && 
               await this.checkStreakValue(userId, 'daily_login', criteria.value!, criteria.operator || 'gte')
      
      case 'total_points':
        return await this.checkTotalPoints(userId, criteria.value!, criteria.operator || 'gte')
      
      case 'registration_date':
        return await this.checkRegistrationDate(userId, criteria.conditions?.before)
      
      case 'course_category_master':
        return activity.type === 'COURSE_COMPLETED' && 
               await this.checkCategoryMastery(userId, criteria.conditions?.category, criteria.value || 5)
      
      default:
        return false
    }
  }

  // Desbloquear conquista
  private async unlockAchievement(userId: string, achievement: any) {
    try {
      // Criar registro de conquista do usuário
      const userAchievement = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          progress: {},
          metadata: {
            unlockedAt: new Date(),
            autoUnlocked: true
          }
        }
      })

      // Adicionar pontos da conquista
      if (achievement.points > 0) {
        await this.addPoints(userId, achievement.points, `Conquista: ${achievement.name}`)
      }

      // Processar recompensas
      for (const reward of achievement.rewards) {
        await this.processReward(userId, reward)
      }

      // Criar notificação
      await notificationService.createAchievementNotification(userId, achievement)

      // Processar atividade de conquista desbloqueada
      await this.processActivity({
        userId,
        type: 'ACHIEVEMENT_UNLOCKED',
        data: { achievementId: achievement.id }
      })

      console.log(`Conquista desbloqueada: ${achievement.name} para usuário ${userId}`)
      
    } catch (error) {
      console.error('Erro ao desbloquear conquista:', error)
    }
  }

  // Conceder badge
  private async awardBadge(userId: string, badge: any) {
    try {
      // Criar registro de badge do usuário
      const userBadge = await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
          metadata: {
            earnedAt: new Date(),
            autoAwarded: true
          }
        }
      })

      // Criar notificação
      await notificationService.createBadgeNotification(userId, badge)

      console.log(`Badge conquistado: ${badge.name} para usuário ${userId}`)
      
    } catch (error) {
      console.error('Erro ao conceder badge:', error)
    }
  }

  // Processar recompensa
  private async processReward(userId: string, reward: any) {
    switch (reward.rewardType) {
      case 'EXTRA_POINTS':
        await this.addPoints(userId, reward.rewardValue, `Recompensa: ${reward.description}`)
        break
      
      case 'PREMIUM_DAYS':
        await this.addPremiumDays(userId, reward.rewardValue)
        break
      
      case 'SPECIAL_BADGE':
        // Lógica para conceder badge especial
        break
      
      default:
        // Log para tipos de recompensa personalizados ou futuros
        console.log(`Processando recompensa personalizada: ${reward.rewardType}`, reward)
    }
  }

  // Adicionar pontos ao usuário
  private async addPoints(userId: string, points: number, reason: string) {
    // Criar transação de pontos
    await prisma.pointTransaction.create({
      data: {
        userId,
        points,
        type: 'EARNED',
        reason,
        description: reason
      }
    })

    // Atualizar pontos totais do usuário
    await prisma.userPoints.upsert({
      where: { userId },
      update: {
        totalPoints: {
          increment: points
        },
        updatedAt: new Date()
      },
      create: {
        userId,
        totalPoints: points
      }
    })
  }

  // Verificar se é o primeiro login
  private async isFirstLogin(userId: string): Promise<boolean> {
    const loginCount = await prisma.pointTransaction.count({
      where: {
        userId,
        reason: { contains: 'login' }
      }
    })
    return loginCount === 1
  }

  // Verificar valor de sequência
  private async checkStreakValue(userId: string, streakType: string, targetValue: number, operator: string): Promise<boolean> {
    const streak = await prisma.userStreak.findUnique({
      where: {
        userId_streakType: {
          userId,
          streakType
        }
      }
    })

    if (!streak) return false

    return this.compareValues(streak.currentStreak, targetValue, operator)
  }

  // Verificar contagem de conclusões
  private async checkCompletionCount(userId: string, type: string, targetValue: number, operator: string): Promise<boolean> {
    try {
      const completionCount = await prisma.progress.count({
        where: {
          userId,
          completedAt: { not: null }
        }
      })
      return this.compareValues(completionCount, targetValue, operator)
    } catch (error) {
      console.error('Error checking completion count:', error)
      return false
    }
  }

  // Verificar pontos totais
  private async checkTotalPoints(userId: string, targetValue: number, operator: string): Promise<boolean> {
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId }
    })

    if (!userPoints) return false

    return this.compareValues(userPoints.totalPoints, targetValue, operator)
  }

  // Verificar contagem de conquistas
  private async checkAchievementCount(userId: string, targetValue: number, operator: string): Promise<boolean> {
    const count = await prisma.userAchievement.count({
      where: { userId }
    })

    return this.compareValues(count, targetValue, operator)
  }

  // Verificar participação em grupos
  private async checkGroupParticipation(userId: string, conditions: Record<string, any>): Promise<boolean> {
    try {
      const groupCount = await prisma.groupMember.count({
        where: {
          userId,
          status: 'ACTIVE'
        }
      })
      return groupCount > 0
    } catch (error) {
      console.error('Error checking group participation:', error)
      return false
    }
  }

  // Verificar se é early adopter
  private async checkEarlyAdopter(userId: string, beforeDate: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    })

    if (!user) return false

    return user.createdAt < new Date(beforeDate)
  }

  // Verificar data de registro
  private async checkRegistrationDate(userId: string, beforeDate: string): Promise<boolean> {
    return this.checkEarlyAdopter(userId, beforeDate)
  }

  // Verificar maestria em categoria
  private async checkCategoryMastery(userId: string, category: string, requiredCount: number): Promise<boolean> {
    try {
      // Count all completed lessons for the user (Course has no category field in current schema)
      const completedCourses = await prisma.progress.count({
        where: {
          userId,
          completedAt: { not: null }
        }
      })
      
      return completedCourses >= requiredCount
    } catch (error) {
      console.error('Error checking category mastery:', error)
      return false
    }
  }

  // Adicionar dias premium
  private async addPremiumDays(userId: string, days: number) {
    // Implementar lógica para adicionar dias premium
    console.log(`Adicionando ${days} dias premium para usuário ${userId}`)
  }

  // Comparar valores com operador
  private compareValues(actual: number, target: number, operator: string): boolean {
    switch (operator) {
      case 'eq': return actual === target
      case 'gte': return actual >= target
      case 'lte': return actual <= target
      case 'gt': return actual > target
      case 'lt': return actual < target
      default: return false
    }
  }

  // Atualizar estatísticas do usuário
  private async updateUserStats(activity: UserActivity) {
    // Implementar lógica para atualizar estatísticas baseadas na atividade
    // Por exemplo, atualizar streaks, contadores, etc.
  }

  // Método público para trigger manual de verificação
  async triggerAchievementCheck(userId: string) {
    const activities: UserActivity[] = [
      { userId, type: 'LOGIN' },
      { userId, type: 'POINTS_EARNED' },
      { userId, type: 'ACHIEVEMENT_UNLOCKED' }
    ]

    for (const activity of activities) {
      await this.processActivity(activity)
    }
  }
}

export const achievementEngine = AchievementEngine.getInstance()
export default achievementEngine