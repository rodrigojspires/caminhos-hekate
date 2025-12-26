import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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
    const baseUserFilter = { NOT: { email: { startsWith: 'deleted_' } } } as const

    const [totalUsers, newUsers, premiumUsersByTier, activeUsersGroup] = await Promise.all([
      prisma.user.count({ where: baseUserFilter }),
      prisma.user.count({ where: { ...baseUserFilter, createdAt: { gte: startDate } } }),
      prisma.user.groupBy({
        by: ['subscriptionTier'],
        _count: { _all: true },
        where: baseUserFilter,
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

    // Contar usuários ativos (apenas não deletados)
    const activeUserIds = activeUsersGroup.map(g => g.userId).filter((id): id is string => !!id)
    const activeUsers = activeUserIds.length
      ? await prisma.user.count({ where: { ...baseUserFilter, id: { in: activeUserIds } } })
      : 0

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsers,
        premiumUsers,
        conversionRate,
        activeUsers,
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
