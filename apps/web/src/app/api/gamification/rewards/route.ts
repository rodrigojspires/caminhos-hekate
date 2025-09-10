import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/rewards - Get available rewards
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const available = searchParams.get('available') === 'true'
    const userOnly = searchParams.get('userOnly') === 'true'

    if (userOnly) {
      // Recompensas que o usuário já resgatou (GamificationUserReward)
      const userRewards = await prisma.gamificationUserReward.findMany({
        where: { userId: session.user.id },
        include: { reward: true },
        orderBy: { claimedAt: 'desc' }
      })

      return NextResponse.json({
        userRewards: userRewards.map((ur) => ({
          ...ur.reward,
          claimedAt: ur.claimedAt,
          status: ur.status,
          claimedFrom: ur.claimedFrom ?? null,
        }))
      })
    }

    // Monta where clause para GamificationReward
    const whereClause: any = {}

    if (type) {
      // Aceita valores como "points", "badge", etc., normalizando para maiúsculas
      whereClause.rewardType = type.toUpperCase()
    }

    if (available) {
      const now = new Date()
      whereClause.isActive = true
      whereClause.AND = [
        { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
        { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      ]
      // Observação: o limite de claims (maxClaims/currentClaims) será avaliado após a busca
    }

    const rewards = await prisma.gamificationReward.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }]
    })

    const filtered = available
      ? rewards.filter((r) => r.maxClaims == null || r.currentClaims < (r.maxClaims ?? 0))
      : rewards

    return NextResponse.json({
      rewards: filtered
    })
  } catch (error) {
    console.error('Error fetching rewards:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/rewards - Claim a reward
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { rewardId } = await request.json()

    if (!rewardId) {
      return NextResponse.json(
        { error: 'ID da recompensa é obrigatório' },
        { status: 400 }
      )
    }

    // Detalhes da recompensa (GamificationReward)
    const reward = await prisma.gamificationReward.findUnique({
      where: { id: rewardId }
    })

    if (!reward) {
      return NextResponse.json(
        { error: 'Recompensa não encontrada' },
        { status: 404 }
      )
    }

    if (!reward.isActive) {
      return NextResponse.json(
        { error: 'Recompensa não está ativa' },
        { status: 400 }
      )
    }

    const now = new Date()
    if ((reward.validFrom && reward.validFrom > now) || (reward.validUntil && reward.validUntil < now)) {
      return NextResponse.json(
        { error: 'Recompensa fora do período de validade' },
        { status: 400 }
      )
    }

    if (reward.maxClaims != null && reward.currentClaims >= reward.maxClaims) {
      return NextResponse.json(
        { error: 'Recompensa esgotada' },
        { status: 400 }
      )
    }

    // Processa o resgate em transação
    const result = await prisma.$transaction(async (tx) => {
      // Cria registro de resgate do usuário (GamificationUserReward)
      const userReward = await tx.gamificationUserReward.create({
        data: {
          userId: session.user.id,
          rewardId: rewardId,
          status: 'CLAIMED',
          claimedAt: new Date(),
          claimedFrom: 'API'
        }
      })

      // Incrementa contador de claims
      await tx.gamificationReward.update({
        where: { id: rewardId },
        data: { currentClaims: { increment: 1 } }
      })

      // Se for recompensa de pontos, creditar imediatamente
      if (reward.rewardType === 'POINTS') {
        const value = reward.rewardValue as unknown as { amount?: number; points?: number } | null
        const amount = value?.amount ?? value?.points ?? 0

        if (amount > 0) {
          await tx.userPoints.upsert({
            where: { userId: session.user.id },
            update: { totalPoints: { increment: amount } },
            create: { userId: session.user.id, totalPoints: amount }
          })

          await tx.pointTransaction.create({
            data: {
              userId: session.user.id,
              type: 'BONUS',
              points: amount,
              reason: 'GAMIFICATION_REWARD',
              description: `Recompensa: ${reward.name}`,
              metadata: { rewardId, userRewardId: userReward.id }
            }
          })
        }
      }

      return { userReward }
    })

    return NextResponse.json({
      userReward: result.userReward,
      reward,
      message: 'Recompensa resgatada com sucesso'
    })
  } catch (error) {
    console.error('Error claiming reward:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}