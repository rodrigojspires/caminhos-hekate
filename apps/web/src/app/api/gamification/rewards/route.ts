import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RewardSystem } from '@/lib/reward-system'

const rewardSystem = RewardSystem.getInstance()

// GET /api/gamification/rewards - Buscar recompensas do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'pending' | 'history' | 'stats'
    const limit = parseInt(searchParams.get('limit') || '50')

    switch (type) {
      case 'pending':
        const pendingRewards = await rewardSystem.getPendingRewards(session.user.id)
        return NextResponse.json(pendingRewards)

      case 'history':
        const rewardHistory = await rewardSystem.getRewardHistory(session.user.id, limit)
        return NextResponse.json(rewardHistory)

      case 'stats':
        const rewardStats = await rewardSystem.getRewardStats(session.user.id)
        return NextResponse.json(rewardStats)

      default:
        // Retornar resumo geral
        const [pending, stats] = await Promise.all([
          rewardSystem.getPendingRewards(session.user.id),
          rewardSystem.getRewardStats(session.user.id)
        ])

        return NextResponse.json({
          pending,
          stats
        })
    }
  } catch (error) {
    console.error('Erro ao buscar recompensas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/rewards - Conceder recompensa manual (admin)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin (implementar lógica de autorização)
    // if (!session.user.isAdmin) {
    //   return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    // }

    const body = await request.json()
    const { userId, reward, achievementId } = body

    if (!userId || !reward) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: userId, reward' },
        { status: 400 }
      )
    }

    // Map legacy types if any
    const mappedReward = {
      ...reward,
      type: (
        reward.type === 'POINTS' ? 'EXTRA_POINTS' :
        reward.type === 'DISCOUNT' ? 'DISCOUNT_COUPON' :
        reward.type === 'PREMIUM_ACCESS' ? 'PREMIUM_DAYS' :
        reward.type
      )
    }

    const userReward = await rewardSystem.grantReward(userId, mappedReward, achievementId)

    if (!userReward) {
      return NextResponse.json(
        { error: 'Erro ao conceder recompensa' },
        { status: 500 }
      )
    }

    return NextResponse.json(userReward, { status: 201 })
  } catch (error) {
    console.error('Erro ao conceder recompensa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
