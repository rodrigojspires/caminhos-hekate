import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { NotificationType, NotificationPriority } from '@prisma/client'

// Schema para filtros de notificações
const notificationFiltersSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  unreadOnly: z.coerce.boolean().default(false),
  types: z.string().optional().transform(val => 
    val ? val.split(',').filter(Boolean) : undefined
  ),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

// GET - Listar notificações de eventos recorrentes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = notificationFiltersSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      unreadOnly: searchParams.get('unreadOnly'),
      types: searchParams.get('types'),
      priority: searchParams.get('priority'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate')
    })

    // Construir filtros para a query
    const where: any = {
      userId: session.user.id,
      // Filtrar apenas notificações relacionadas a eventos
      type: {
        in: [
          'EVENT_REMINDER',
          'EVENT_CREATED',
          'EVENT_UPDATED',
          'EVENT_CONFLICT',
          'SERIES_COMPLETED'
        ] as NotificationType[]
      }
    }

    if (filters.unreadOnly) {
      where.isRead = false
    }

    if (filters.types && filters.types.length > 0) {
      where.type = { in: filters.types as NotificationType[] }
    }

    if (filters.priority) {
      where.priority = filters.priority as NotificationPriority
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate)
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate)
      }
    }

    // Filtrar notificações não expiradas
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ]

    // Buscar notificações
    const [notifications, unreadCount, totalCount] = await Promise.all([
      prisma.gamificationNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit,
        skip: filters.offset,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          priority: true,
          isRead: true,
          data: true,
          createdAt: true,
          expiresAt: true
        }
      }),
      prisma.gamificationNotification.count({
        where: {
          ...where,
          isRead: false
        }
      }),
      prisma.gamificationNotification.count({ where })
    ])

    return NextResponse.json({
      notifications,
      unreadCount,
      totalCount,
      hasMore: filters.offset + filters.limit < totalCount,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: totalCount
      }
    })
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar notificação manual (para testes ou casos especiais)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const createNotificationSchema = z.object({
      type: z.enum([
        'EVENT_REMINDER',
        'EVENT_CREATED',
        'EVENT_UPDATED',
        'EVENT_CONFLICT',
        'SERIES_COMPLETED'
      ]),
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(1000),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      data: z.record(z.any()).optional(),
      isPush: z.boolean().default(false),
      expiresAt: z.string().datetime().optional().transform(val => 
        val ? new Date(val) : undefined
      )
    })

    const body = await request.json()
    const validatedData = createNotificationSchema.parse(body)

    // Criar notificação
    const notification = await prisma.gamificationNotification.create({
      data: {
        userId: session.user.id,
        type: validatedData.type as NotificationType,
        title: validatedData.title,
        message: validatedData.message,
        priority: validatedData.priority as NotificationPriority,
        data: validatedData.data || {},
        isPush: validatedData.isPush,
        expiresAt: validatedData.expiresAt
      },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        priority: true,
        isRead: true,
        data: true,
        createdAt: true,
        expiresAt: true
      }
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar notificação:', error)
    
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

// DELETE - Limpar notificações antigas/lidas
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const olderThan = searchParams.get('olderThan') // em dias

    let deletedCount = 0

    if (action === 'read') {
      // Deletar notificações lidas
      const result = await prisma.gamificationNotification.deleteMany({
        where: {
          userId: session.user.id,
          isRead: true,
          type: {
            in: [
              'EVENT_REMINDER',
              'EVENT_CREATED',
              'EVENT_UPDATED',
              'EVENT_CONFLICT',
              'SERIES_COMPLETED'
            ] as NotificationType[]
          }
        }
      })
      deletedCount = result.count
    } else if (action === 'old' && olderThan) {
      // Deletar notificações antigas
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan))

      const result = await prisma.gamificationNotification.deleteMany({
        where: {
          userId: session.user.id,
          createdAt: { lt: cutoffDate },
          type: {
            in: [
              'EVENT_REMINDER',
              'EVENT_CREATED',
              'EVENT_UPDATED',
              'EVENT_CONFLICT',
              'SERIES_COMPLETED'
            ] as NotificationType[]
          }
        }
      })
      deletedCount = result.count
    } else if (action === 'expired') {
      // Deletar notificações expiradas
      const result = await prisma.gamificationNotification.deleteMany({
        where: {
          userId: session.user.id,
          expiresAt: { lt: new Date() },
          type: {
            in: [
              'EVENT_REMINDER',
              'EVENT_CREATED',
              'EVENT_UPDATED',
              'EVENT_CONFLICT',
              'SERIES_COMPLETED'
            ] as NotificationType[]
          }
        }
      })
      deletedCount = result.count
    } else {
      return NextResponse.json(
        { error: 'Ação inválida. Use: read, old, ou expired' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `${deletedCount} notificações removidas`,
      deletedCount
    })
  } catch (error) {
    console.error('Erro ao limpar notificações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}