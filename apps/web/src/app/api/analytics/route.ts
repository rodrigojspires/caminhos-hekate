import { NextRequest, NextResponse } from 'next/server'
import { checkAnalyticsPermission } from '@/lib/auth'
import { prisma, Prisma } from '@hekate/database'
import { z } from 'zod'

// Função auxiliar para converter período em milissegundos
function getPeriodMs(period: string): number {
  switch (period) {
    case '1d': return 24 * 60 * 60 * 1000
    case '7d': return 7 * 24 * 60 * 60 * 1000
    case '30d': return 30 * 24 * 60 * 60 * 1000
    case '90d': return 90 * 24 * 60 * 60 * 1000
    default: return 7 * 24 * 60 * 60 * 1000
  }
}

// Schema para validação de métricas
const metricSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
  dimensions: z.record(z.any()).optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// Schema para validação de eventos
const eventSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  action: z.string().min(1),
  label: z.string().optional(),
  value: z.number().optional(),
  sessionId: z.string().optional(),
  page: z.string().optional(),
  properties: z.record(z.any()).optional(),
})

// GET /api/analytics - Obter estatísticas do dashboard
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões de analytics
    const permissionCheck = await checkAnalyticsPermission()

    // Guard contra valor nulo
    if (!permissionCheck) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      )
    }

    const { user, isAdmin } = permissionCheck
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || undefined
    const period = searchParams.get('period') || '7d'

    // Parâmetros opcionais usados para métricas temporais
    const groupBy = searchParams.get('groupBy') || undefined
    const startDateParam = searchParams.get('startDate') || undefined
    const endDateParam = searchParams.get('endDate') || undefined
    const category = searchParams.get('category') || undefined

    // Validar tipo de consulta (inclui "metrics")
    const querySchema = z.object({
      type: z.enum(['stats', 'events', 'users', 'metrics']).optional(),
      period: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
      groupBy: z.enum(['hour', 'day', 'week', 'month']).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      category: z.string().optional()
    })

    const query = querySchema.parse({ type, period, groupBy, startDate: startDateParam, endDate: endDateParam, category })

    // Definir filtro de usuário baseado nas permissões
    const userId = isAdmin ? undefined : user.id

    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - getPeriodMs(query.period))
    const endDate = query.endDate ? new Date(query.endDate) : new Date()
    
    switch (query.type) {
      case 'stats':
        const stats = await prisma.analyticsEvent.groupBy({
          by: ['category'],
          _count: {
            id: true
          },
          where: {
            ...(userId && { userId }),
            createdAt: { gte: startDate }
          }
        })
        
        const totalEvents = await prisma.analyticsEvent.count({
          where: {
            ...(userId && { userId }),
            createdAt: { gte: startDate }
          }
        })
        
        return NextResponse.json({
          totalEvents,
          categories: stats.map(stat => ({
            category: stat.category,
            count: stat._count.id
          })),
          period: query.period,
          isAdmin
        })
        
      case 'events':
        const events = await prisma.analyticsEvent.findMany({
          where: {
            ...(userId && { userId }),
            createdAt: { gte: startDate }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 100,
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        })
        
        return NextResponse.json({
          events,
          period: query.period,
          isAdmin
        })
        
      case 'users':
        // Apenas admins podem ver dados de usuários
        if (!isAdmin) {
          return NextResponse.json(
            { error: 'Acesso negado. Apenas administradores podem visualizar dados de usuários.' }, 
            { status: 403 }
          )
        }
        
        const users = await prisma.user.findMany({
          where: { NOT: { email: { startsWith: 'deleted_' } } },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: {
              select: {
                analyticsEvents: {
                  where: {
                    createdAt: { gte: startDate }
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 50
        })
        
        return NextResponse.json({
          users,
          period: query.period,
          isAdmin
        })

      case 'metrics': {
        // Agregar métricas por período usando AnalyticsMetric
        const periodUnit = query.groupBy || 'day'
        // Construir SQL seguro (groupBy validado pelo Zod)
        const truncExpr =
          periodUnit === 'hour' ? Prisma.sql`date_trunc('hour', "timestamp")` :
          periodUnit === 'day' ? Prisma.sql`date_trunc('day', "timestamp")` :
          periodUnit === 'week' ? Prisma.sql`date_trunc('week', "timestamp")` :
          Prisma.sql`date_trunc('month', "timestamp")`
        const whereCategory = query.category ? Prisma.sql`AND "category" = ${query.category}` : Prisma.empty
        const whereUser = userId ? Prisma.sql`AND "userId" = ${userId}` : Prisma.empty
        const rows = await prisma.$queryRaw<{ period: Date; count: number; value: number }[]>(
          Prisma.sql`
            SELECT 
              ${truncExpr} AS period,
              COUNT(*)::int AS count,
              COALESCE(SUM("value"), 0)::float AS value
            FROM "analytics_metrics"
            WHERE "timestamp" >= ${startDate}
              AND "timestamp" <= ${endDate}
              ${whereCategory}
              ${whereUser}
            GROUP BY 1
            ORDER BY 1 ASC
          `
        )
        const data = rows.map(r => ({
          timestamp: r.period.toISOString(),
          count: Number(r.count || 0),
          value: Number(r.value || 0)
        }))
        return NextResponse.json(data)
      }
      
      default:
        // Retornar estatísticas gerais por padrão
        const defaultStats = await prisma.analyticsEvent.groupBy({
          by: ['category'],
          _count: {
            id: true
          },
          where: {
            ...(userId && { userId }),
            createdAt: { gte: startDate }
          }
        })
        
        const defaultTotal = await prisma.analyticsEvent.count({
          where: {
            ...(userId && { userId }),
            createdAt: { gte: startDate }
          }
        })
        
        return NextResponse.json({
          totalEvents: defaultTotal,
          categories: defaultStats.map(stat => ({
            category: stat.category,
            count: stat._count.id
          })),
          period: query.period,
          isAdmin
        })
    }
  } catch (error) {
    console.error('Erro ao obter analytics:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST /api/analytics - Registrar métrica ou evento
export async function POST(request: NextRequest) {
  try {
    // Verificar permissões de analytics
    const permissionCheck = await checkAnalyticsPermission()

    // Guard contra valor nulo
    if (!permissionCheck) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    if ('error' in permissionCheck) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status }
      )
    }

    const { user } = permissionCheck
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    if (type === 'metric') {
      // Validar dados da métrica
      const metricData = metricSchema.parse(body)
      
      // Registrar métrica no banco
      await prisma.analyticsEvent.create({
        data: {
          name: metricData.name,
          category: metricData.category,
          action: metricData.name,
          properties: {
            value: metricData.value,
            unit: metricData.unit,
            userAgent: request.headers.get('user-agent') || undefined,
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
          },
          userId: user.id
        }
      })
      
      return NextResponse.json({ success: true })
    } else {
      // Validar dados do evento
      const eventData = eventSchema.parse(body)
      
      // Registrar evento no banco
      await prisma.analyticsEvent.create({
        data: {
          name: eventData.name,
          category: eventData.category,
          action: eventData.action,
          properties: {
            ...eventData.properties,
            userAgent: request.headers.get('user-agent') || undefined,
            ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
          },
          userId: user.id
        }
      })
      
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Erro na API de analytics:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
