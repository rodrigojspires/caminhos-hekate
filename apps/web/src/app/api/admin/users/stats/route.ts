import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET - Estatísticas de usuários
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // dias
    const periodDays = parseInt(period)
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Estatísticas gerais
    const [totalUsers, newUsers, premiumUsers] = await Promise.all([
      // Total de usuários
      prisma.user.count(),
      
      // Novos usuários no período
      prisma.user.count({
        where: {
          createdAt: {
            gte: startDate
          }
        }
      }),
      
      // Usuários premium
      prisma.user.count({
        where: {
          subscriptionTier: {
            in: ['INICIADO', 'ADEPTO', 'SACERDOCIO']
          }
        }
      })
    ])

    // Distribuição por tipo de assinatura
    const subscriptionStats = await prisma.user.groupBy({
      by: ['subscriptionTier'],
      _count: {
        subscriptionTier: true
      }
    })

    // Usuários por mês (últimos 12 meses)
    const monthlyStats = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*)::int as count
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
    ` as Array<{ month: Date; count: number }>

    // Top usuários por pedidos
    const topUsersByOrders = await prisma.user.findMany({
      take: 10,
      orderBy: {
        orders: {
          _count: 'desc'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    // Usuários recentes
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        createdAt: true
      }
    })

    // Taxa de conversão (usuários que fizeram pelo menos um pedido)
    const usersWithOrders = await prisma.user.count({
      where: {
        orders: {
          some: {}
        }
      }
    })

    const conversionRate = totalUsers > 0 ? (usersWithOrders / totalUsers) * 100 : 0

    return NextResponse.json({
      overview: {
        totalUsers,
        newUsers,
        premiumUsers,
        conversionRate: Math.round(conversionRate * 100) / 100
      },
      distribution: {
        subscription: subscriptionStats.map(stat => ({
          type: stat.subscriptionTier,
          count: stat._count.subscriptionTier
        }))
      },
      trends: {
        monthly: monthlyStats.map(stat => ({
          month: stat.month.toISOString().slice(0, 7), // YYYY-MM format
          count: stat.count
        }))
      },
      topUsers: topUsersByOrders,
      recentUsers
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de usuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}