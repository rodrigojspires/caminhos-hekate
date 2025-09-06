import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { NotificationType, NotificationChannel } from '@prisma/client'

// Schema para criar notificação
const CreateNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1, 'Título é obrigatório'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  channel: z.nativeEnum(NotificationChannel).default('EMAIL'),
  metadata: z.record(z.any()).optional()
})

// Schema para filtros
const NotificationFiltersSchema = z.object({
  type: z.nativeEnum(NotificationType).optional(),
  status: z.enum(['pending', 'sent', 'failed']).optional(),
  channel: z.nativeEnum(NotificationChannel).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'sentAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// GET /api/notifications - Listar notificações do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filters = NotificationFiltersSchema.parse({
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      channel: searchParams.get('channel'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    })

    const { page, limit, sortBy, sortOrder, ...whereFilters } = filters
    const skip = (page - 1) * limit

    // Construir filtros where
    const where: any = {
      userId: session.user.id,
      ...Object.fromEntries(
        Object.entries(whereFilters).filter(([_, value]) => value !== undefined)
      )
    }

    // Buscar notificações
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          channel: true,
          status: true,
          sentAt: true,
          failedAt: true,
          metadata: true,
          createdAt: true
        }
      }),
      prisma.notification.count({ where })
    ])

    // Calcular paginação
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      notifications: notifications.map(notification => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
        sentAt: notification.sentAt?.toISOString() || null,
        failedAt: notification.failedAt?.toISOString() || null
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    
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

// POST /api/notifications - Criar notificação (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const data = CreateNotificationSchema.parse(body)

    // Se não especificar userId, criar para todos os usuários
    const targetUserIds = body.userIds || [
      ...(await prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        select: { id: true }
      })).map(u => u.id)
    ]

    // Criar notificações em lote
    const notifications = await prisma.notification.createMany({
      data: targetUserIds.map((userId: string) => ({
        userId,
        type: data.type,
        title: data.title,
        content: data.content,
        channel: data.channel,
        metadata: data.metadata
      }))
    })

    return NextResponse.json({
      message: `${notifications.count} notificações criadas com sucesso`
    }, { status: 201 })
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