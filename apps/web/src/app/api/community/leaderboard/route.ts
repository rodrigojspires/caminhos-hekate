import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActivityLeaderboard } from '@/lib/community-leaderboard'

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const communityId = searchParams.get('communityId')
    const limit = Math.min(50, Number(searchParams.get('limit') || '5'))
    const period = searchParams.get('period') || 'monthly'

    const now = new Date()
    const startDate = period === 'monthly' ? startOfMonth(now) : startOfMonth(now)
    const endDate = now

    const leaderboard = await getActivityLeaderboard({
      startDate,
      endDate,
      communityId: communityId || null,
      limit
    })

    const ranked = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      user: { id: entry.userId, name: entry.name, image: entry.image },
      score: entry.score
    }))

    return NextResponse.json({
      leaderboard: ranked,
      metadata: {
        period,
        periodStart: startDate,
        periodEnd: endDate,
        communityId: communityId || null
      }
    })
  } catch (error) {
    console.error('Erro ao obter leaderboard de atividade:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
