import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RewardSystem } from '@/lib/reward-system'
import { prisma } from '@hekate/database'

const rewardSystem = RewardSystem.getInstance()

// POST /api/gamification/rewards/[id]/claim - Reivindicar recompensa
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const rewardId = params.id
    if (!rewardId) {
      return NextResponse.json(
        { error: 'ID da recompensa é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a recompensa pertence ao usuário
    const db: any = prisma
    const userReward = await db.userReward.findFirst({
      where: {
        id: rewardId,
        userId: session.user.id
      }
    })

    if (!userReward) {
      return NextResponse.json(
        { error: 'Recompensa não encontrada ou não pertence ao usuário' },
        { status: 404 }
      )
    }

    const success = await rewardSystem.claimReward(rewardId)

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao reivindicar recompensa' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Recompensa reivindicada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao reivindicar recompensa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
