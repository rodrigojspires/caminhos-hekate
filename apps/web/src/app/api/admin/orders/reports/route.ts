import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, Prisma } from '@hekate/database'
import { z } from 'zod'

// Schema de validação para filtros de relatório
const reportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().default('30d'),
})

// Verificar se usuário tem permissão de admin
async function checkAdminPermission() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  
  if (!['ADMIN', 'MODERATOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  
  return null
}

// Função para calcular datas baseadas no período
function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date()
  let start: Date
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  
  if (startDate && endDate) {
    start = new Date(startDate)
    end = new Date(endDate)
  } else {
    switch (period) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        start = new Date('2020-01-01')
        break
    }
  }
  
  return { start, end }
}

// GET /api/admin/orders/reports - Relatórios de vendas
export async function GET(request: NextRequest) {
  const permissionError = await checkAdminPermission()
  if (permissionError) return permissionError
  
  try {
    const { searchParams } = new URL(request.url)
    const filters = reportFiltersSchema.parse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      status: searchParams.get('status'),
      period: searchParams.get('period') || '30d',
    })
    
    const { start, end } = getDateRange(filters.period, filters.startDate, filters.endDate)
    
    // Construir filtros para as consultas
    const whereClause: any = {
      createdAt: {
        gte: start,
        lte: end,
      }
    }
    
    if (filters.status) {
      whereClause.status = filters.status
    }
    
    // 1. Estatísticas gerais
    const [totalOrders, totalRevenue, avgOrderValue] = await Promise.all([
      // Total de pedidos
      prisma.order.count({ where: whereClause }),
      
      // Receita total
      prisma.order.aggregate({
        where: whereClause,
        _sum: { total: true }
      }),
      
      // Valor médio do pedido
      prisma.order.aggregate({
        where: whereClause,
        _avg: { total: true }
      })
    ])
    
    // 2. Pedidos por status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: start,
          lte: end,
        }
      },
      _count: { _all: true },
      _sum: { total: true }
    })
    
    // 3. Vendas por dia (últimos 30 dias ou período especificado)
    const statusCondition = filters.status ? Prisma.sql`AND "status" = ${filters.status}` : Prisma.empty
    const salesByDay = await prisma.$queryRaw(
      Prisma.sql`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::int as orders,
        SUM("total")::float as revenue
      FROM "Order"
      WHERE "createdAt" >= ${start}
        AND "createdAt" <= ${end}
        ${statusCondition}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `)
    
    // 4. Top produtos mais vendidos
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: {
            gte: start,
            lte: end,
          },
          ...(filters.status && { status: filters.status })
        }
      },
      _sum: {
        quantity: true,
        price: true
      },
      _count: {
        _all: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 10
    })
    
    // Buscar informações dos produtos
    const productIds = topProducts.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        images: true,
        category: {
          select: {
            name: true
          }
        }
      }
    })
    
    const topProductsWithDetails = topProducts.map(item => {
      const product = products.find(p => p.id === item.productId)
      return {
        ...item,
        product
      }
    })
    
    // 5. Clientes com mais pedidos
    const topCustomers = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        ...whereClause,
        userId: { not: null },
      },
      _count: { _all: true },
      _sum: { total: true },
      orderBy: {
        _count: { userId: 'desc' }
      },
      take: 10
    })
    
    // Buscar informações dos usuários
    const userIds = topCustomers.map(item => item.userId).filter((id): id is string => id !== null)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        subscriptionTier: true
      }
    })
    
    const topCustomersWithDetails = topCustomers.map(item => {
      const user = users.find(u => u.id === item.userId)
      return {
        ...item,
        user
      }
    })
    
    // 6. Comparação com período anterior
    const previousPeriod = {
      start: new Date(start.getTime() - (end.getTime() - start.getTime())),
      end: start
    }
    
    const [previousOrders, previousRevenue] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: {
            gte: previousPeriod.start,
            lte: previousPeriod.end,
          },
          ...(filters.status && { status: filters.status })
        }
      }),
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: previousPeriod.start,
            lte: previousPeriod.end,
          },
          ...(filters.status && { status: filters.status })
        },
        _sum: { total: true }
      })
    ])
    
    // Calcular variações percentuais
    const ordersGrowth = previousOrders > 0 
      ? ((totalOrders - previousOrders) / previousOrders) * 100 
      : 0
    
    const revenueGrowth = Number(previousRevenue._sum.total || 0) > 0 
      ? (((Number(totalRevenue._sum.total || 0)) - Number(previousRevenue._sum.total || 0)) / Number(previousRevenue._sum.total || 0)) * 100 
      : 0
    
    return NextResponse.json({
      summary: {
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        avgOrderValue: avgOrderValue._avg.total || 0,
        ordersGrowth: Math.round(ordersGrowth * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          label: filters.period
        }
      },
      ordersByStatus: ordersByStatus.map(item => ({
        status: item.status,
        count: item._count._all,
        revenue: item._sum.total || 0
      })),
      salesByDay,
      topProducts: topProductsWithDetails,
      topCustomers: topCustomersWithDetails
    })
    
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}