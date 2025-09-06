import { prisma } from '@hekate/database'
import { EventEmitter } from 'events'

export interface RewardData {
  id: string
  // Alinhado ao enum RewardType do Prisma
  type: 'EXTRA_POINTS' | 'PREMIUM_DAYS' | 'SPECIAL_BADGE' | 'COURSE_ACCESS' | 'DISCOUNT_COUPON' | 'EXCLUSIVE_CONTENT'
  value: number
  description: string
  metadata?: Record<string, any>
}

export interface UserReward {
  id: string
  userId: string
  rewardId: string
  achievementId?: string
  claimed: boolean
  claimedAt?: Date
  expiresAt?: Date
  reward: RewardData
}

export class RewardSystem extends EventEmitter {
  private static instance: RewardSystem

  public static getInstance(): RewardSystem {
    if (!RewardSystem.instance) {
      RewardSystem.instance = new RewardSystem()
    }
    return RewardSystem.instance
  }

  /**
   * Processa recompensas quando uma conquista é desbloqueada
   */
  async processAchievementRewards(userId: string, achievementId: string): Promise<UserReward[]> {
    try {
      // Buscar recompensas associadas à conquista
      const achievementRewards = await prisma.achievementReward.findMany({
        where: { achievementId },
        include: {
          achievement: true
        }
      })

      const userRewards: UserReward[] = []

      for (const reward of achievementRewards) {
        // Verificar se o usuário já recebeu esta recompensa
        const db: any = prisma
        const existingReward = await db.userReward.findFirst({
          where: {
            userId,
            rewardId: reward.id,
            achievementId
          }
        })

        if (!existingReward) {
          // Criar nova recompensa para o usuário
          const userReward = await this.grantReward(userId, {
            id: reward.id,
            type: (reward as any).rewardType as RewardData['type'],
            value: (reward as any).rewardValue ?? 0,
            description: (reward as any).description ?? 'Recompensa',
            metadata: ((reward as any).metadata as Record<string, any>) ?? {}
          }, achievementId)

          if (userReward) {
            userRewards.push(userReward)
          }
        }
      }

      return userRewards
    } catch (error) {
      console.error('Erro ao processar recompensas da conquista:', error)
      return []
    }
  }

  /**
   * Concede uma recompensa específica ao usuário
   */
  async grantReward(
    userId: string, 
    reward: RewardData, 
    achievementId?: string
  ): Promise<UserReward | null> {
    try {
      // Calcular data de expiração (se aplicável)
      const expiresAt = this.calculateExpirationDate(reward)

      // Criar registro da recompensa do usuário
      const db: any = prisma
      const userReward = await db.userReward.create({
        data: {
          userId,
          rewardId: reward.id,
          achievementId,
          claimed: false,
          expiresAt
        }
      })

      const result: UserReward = {
        id: userReward.id,
        userId: userReward.userId,
        rewardId: userReward.rewardId,
        achievementId: userReward.achievementId || undefined,
        claimed: userReward.claimed,
        claimedAt: userReward.claimedAt || undefined,
        expiresAt: userReward.expiresAt || undefined,
        reward
      }

      // Aplicar recompensa automaticamente se for do tipo pontos
      if (reward.type === 'EXTRA_POINTS') {
        await this.applyPointsReward(userId, reward.value, `Recompensa: ${reward.description}`)
        await this.claimReward(userReward.id)
      }

      // Emitir evento de recompensa concedida
      this.emit('rewardGranted', {
        userId,
        reward: result,
        achievementId
      })

      return result
    } catch (error) {
      console.error('Erro ao conceder recompensa:', error)
      return null
    }
  }

  /**
   * Reivindica uma recompensa pendente
   */
  async claimReward(userRewardId: string): Promise<boolean> {
    try {
      const db: any = prisma
      const userReward = await db.userReward.findUnique({
        where: { id: userRewardId }
      })

      if (!userReward || userReward.claimed) {
        return false
      }

      // Verificar se a recompensa não expirou
      if (userReward.expiresAt && userReward.expiresAt < new Date()) {
        return false
      }

      // Marcar como reivindicada
      await db.userReward.update({
        where: { id: userRewardId },
        data: {
          claimed: true,
          claimedAt: new Date()
        }
      })

      // Aplicar efeitos da recompensa
      await this.applyRewardEffects(userReward)

      this.emit('rewardClaimed', {
        userId: userReward.userId,
        rewardId: userReward.rewardId
      })

      return true
    } catch (error) {
      console.error('Erro ao reivindicar recompensa:', error)
      return false
    }
  }

  /**
   * Busca recompensas pendentes do usuário
   */
  async getPendingRewards(userId: string): Promise<UserReward[]> {
    try {
      const db: any = prisma
      const userRewards = await db.userReward.findMany({
        where: {
          userId,
          claimed: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          reward: true,
          achievement: true,
        }
      })

      return userRewards.map((ur: any) => ({
        id: ur.id,
        userId: ur.userId,
        rewardId: ur.rewardId,
        achievementId: ur.achievementId || undefined,
        claimed: ur.claimed,
        claimedAt: ur.claimedAt || undefined,
        expiresAt: ur.expiresAt || undefined,
        reward: {
          id: ur.rewardId,
          type: (ur.reward?.rewardType || 'EXTRA_POINTS') as RewardData['type'],
          value: ur.reward?.rewardValue ?? 0,
          description: ur.reward?.description ?? 'Recompensa',
          metadata: ur.reward?.metadata ?? {}
        }
      }))
    } catch (error) {
      console.error('Erro ao buscar recompensas pendentes:', error)
      return []
    }
  }

  /**
   * Busca histórico de recompensas do usuário
   */
  async getRewardHistory(userId: string, limit = 50): Promise<UserReward[]> {
    try {
      const db: any = prisma
      const userRewards = await db.userReward.findMany({
        where: {
          userId,
          claimed: true
        },
        orderBy: {
          claimedAt: 'desc'
        },
        take: limit,
        include: {
          reward: true,
          achievement: true,
        }
      })

      return userRewards.map((ur: any) => ({
        id: ur.id,
        userId: ur.userId,
        rewardId: ur.rewardId,
        achievementId: ur.achievementId || undefined,
        claimed: ur.claimed,
        claimedAt: ur.claimedAt || undefined,
        expiresAt: ur.expiresAt || undefined,
        reward: {
          id: ur.rewardId,
          type: (ur.reward?.rewardType || 'EXTRA_POINTS') as RewardData['type'],
          value: ur.reward?.rewardValue ?? 0,
          description: ur.reward?.description ?? 'Recompensa',
          metadata: ur.reward?.metadata ?? {}
        }
      }))
    } catch (error) {
      console.error('Erro ao buscar histórico de recompensas:', error)
      return []
    }
  }

  /**
   * Calcula estatísticas de recompensas do usuário
   */
  async getRewardStats(userId: string): Promise<{
    totalRewards: number
    claimedRewards: number
    pendingRewards: number
    expiredRewards: number
    totalPointsEarned: number
    totalBadgesEarned: number
  }> {
    try {
      const db: any = prisma
      const [total, claimed, pending, expired] = await Promise.all([
        db.userReward.count({ where: { userId } }),
        db.userReward.count({ where: { userId, claimed: true } }),
        db.userReward.count({ 
          where: { 
            userId, 
            claimed: false,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          } 
        }),
        db.userReward.count({ 
          where: { 
            userId, 
            claimed: false,
            expiresAt: { lt: new Date() }
          } 
        })
      ])

      // Calcular pontos e badges ganhos (simplificado)
      const pointsEarned = await prisma.pointTransaction.aggregate({
        where: {
          userId,
          type: 'BONUS'
        },
        _sum: {
          points: true
        }
      })

      const badgesEarned = await prisma.userBadge.count({
        where: { userId }
      })

      return {
        totalRewards: total,
        claimedRewards: claimed,
        pendingRewards: pending,
        expiredRewards: expired,
        totalPointsEarned: pointsEarned._sum.points || 0,
        totalBadgesEarned: badgesEarned
      }
    } catch (error) {
      console.error('Erro ao calcular estatísticas de recompensas:', error)
      return {
        totalRewards: 0,
        claimedRewards: 0,
        pendingRewards: 0,
        expiredRewards: 0,
        totalPointsEarned: 0,
        totalBadgesEarned: 0
      }
    }
  }

  /**
   * Aplica recompensa de pontos
   */
  private async applyPointsReward(userId: string, points: number, description: string): Promise<void> {
    try {
      // Adicionar pontos ao usuário
      await prisma.userPoints.upsert({
        where: { userId },
        update: {
          totalPoints: {
            increment: points
          }
        },
        create: {
          userId,
          totalPoints: points
        }
      })

      // Registrar transação de pontos
      await prisma.pointTransaction.create({
        data: {
          userId,
          points,
          type: 'BONUS',
          reason: 'REWARD_SYSTEM',
          description,
          metadata: {
            source: 'reward_system'
          }
        }
      })
    } catch (error) {
      console.error('Erro ao aplicar recompensa de pontos:', error)
    }
  }

  /**
   * Aplica efeitos específicos da recompensa
   */
  private async applyRewardEffects(userReward: any): Promise<void> {
    // Implementar lógica específica para cada tipo de recompensa
    // Por exemplo: conceder badge, ativar acesso premium, etc.
  }

  /**
   * Calcula data de expiração baseada no tipo de recompensa
   */
  private calculateExpirationDate(reward: RewardData): Date | null {
    switch (reward.type) {
      case 'DISCOUNT_COUPON':
        // Cupons expiram em 30 dias
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      case 'PREMIUM_DAYS':
        // Duração em dias no valor
        return new Date(Date.now() + (reward.value || 7) * 24 * 60 * 60 * 1000)
      case 'EXCLUSIVE_CONTENT':
        // Conteúdo exclusivo expira em 90 dias
        return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      default:
        // Pontos e badges não expiram
        return null
    }
  }

  /**
   * Limpa recompensas expiradas
   */
  async cleanupExpiredRewards(): Promise<number> {
    try {
      const db: any = prisma
      const result = await db.userReward.deleteMany({
        where: {
          claimed: false,
          expiresAt: {
            lt: new Date()
          }
        }
      })

      return result.count
    } catch (error) {
      console.error('Erro ao limpar recompensas expiradas:', error)
      return 0
    }
  }
}

export default RewardSystem
