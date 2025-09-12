import { NextRequest, NextResponse } from 'next/server'
import { checkAnalyticsPermission } from '@/lib/auth'
import { prisma } from '@hekate/database'
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
    const type = searchParams.get('type')
    const period = searchParams.get('period') || '7d'
    
    // Validar tipo de consulta
    const querySchema = z.object({
      type: z.enum(['stats', 'events', 'users']).optional(),
      period: z.enum(['1d', '7d', '30d', '90d']).default('7d')
    })
    
    const query = querySchema.parse({ type, period })
    
    // Definir filtro de usuário baseado nas permissões
    const userId = isAdmin ? undefined : user.id

    const startDate = new Date(Date.now() - getPeriodMs(query.period))
    
    switch (query.type) {
      case 'stats':
        const stats = await prisma.analyticsEvent.groupBy({
          by: ['category'],
          _count: {
            id: true
          },
          where: {
            ...(userId && { userId }),
            createdAt: {
              gte: startDate
            }
          }
        })
        
        const totalEvents = await prisma.analyticsEvent.count({
          where: {
            ...(userId && { userId }),
            createdAt: {
              gte: startDate
            }
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
            createdAt: {
              gte: startDate
            }
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
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            _count: {
              select: {
                analyticsEvents: {
                  where: {
                    createdAt: {
                      gte: startDate
                    }
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
        
      default:
        // Retornar estatísticas gerais por padrão
        const defaultStats = await prisma.analyticsEvent.groupBy({
          by: ['category'],
          _count: {
            id: true
          },
          where: {
            ...(userId && { userId }),
            createdAt: {
              gte: startDate
            }
          }
        })
        
        const defaultTotal = await prisma.analyticsEvent.count({
          where: {
            ...(userId && { userId }),
            createdAt: {
              gte: startDate
            }
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
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
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