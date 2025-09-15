import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'

// GET /api/admin/users/stats - Estatísticas de usuários
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const periodDays = Number(searchParams.get('period') || 30)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (isFinite(periodDays) ? periodDays : 30))

    // Totais básicos
    const [totalUsers, newUsers, premiumUsersByTier, activeUsersGroup] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startDate } } }),
      prisma.user.groupBy({
        by: ['subscriptionTier'],
        _count: { _all: true },
      }),
      // Usuários ativos: com histórico de login nos últimos N dias
      prisma.loginHistory.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startDate } },
        _count: { userId: true },
      })
    ])

    // Premium = qualquer tier diferente de FREE
    const premiumUsers = premiumUsersByTier
      .filter((t) => t.subscriptionTier !== 'FREE')
      .reduce((sum, t) => sum + (t._count?._all || 0), 0)

    const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsers,
        premiumUsers,
        conversionRate,
        activeUsers: activeUsersGroup.filter(g => g.userId !== null).length,
      },
      distribution: {
        subscription: premiumUsersByTier.map((t) => ({
          type: t.subscriptionTier,
          count: t._count?._all || 0,
        })),
      },
      period: periodDays,
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
