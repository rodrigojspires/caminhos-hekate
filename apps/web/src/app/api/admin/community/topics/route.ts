import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { 
  CreateTopicSchema, 
  UpdateTopicSchema, 
  CommunityFiltersSchema 
} from '@/lib/validations/community'
import { resolveCommunityId } from '@/lib/community'
import { z } from 'zod'
import { notificationService } from '@/lib/notifications/notification-service'
import { NotificationPriority } from '@prisma/client'

// GET /api/admin/community/topics - Listar tópicos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = CommunityFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      communityId: searchParams.get('communityId') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    })

    const skip = (filters.page - 1) * filters.limit
    
    const where = {
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } }
        ]
      }),
      ...(filters.communityId && { communityId: filters.communityId })
    }

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        include: {
          _count: {
            select: {
              posts: true
            }
          }
        }
      }),
      prisma.topic.count({ where })
    ])

    return NextResponse.json({
      topics,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar tópicos:', error)
    
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

// POST /api/admin/community/topics - Criar tópico
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = CreateTopicSchema.parse(body)

    const communityIds = Array.isArray(data.communityIds) && data.communityIds.length > 0
      ? data.communityIds
      : [await resolveCommunityId(data.communityId)]

    const communities = await prisma.community.findMany({
      where: { id: { in: communityIds } },
      select: { id: true, slug: true }
    })
    const communitySlugMap = new Map(communities.map((c) => [c.id, c.slug]))

    const createdTopics = []
    for (const communityId of communityIds) {
      const communitySlug = communitySlugMap.get(communityId)
      const baseSlug = data.slug
      let slug = baseSlug

      if (communityIds.length > 1 && communitySlug) {
        slug = `${baseSlug}-${communitySlug}`
      }

      let counter = 1
      while (await prisma.topic.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${communitySlug || 'comunidade'}-${counter}`
        counter += 1
      }

      const topic = await prisma.topic.create({
        data: {
          ...data,
          slug,
          communityId
        },
        include: {
          _count: {
            select: { posts: true }
          }
        }
      })
      createdTopics.push(topic)
    }

    const users = await prisma.user.findMany({
      where: { NOT: { email: { startsWith: 'deleted_' } } },
      select: { id: true }
    })

    for (const topic of createdTopics) {
      for (const user of users) {
        try {
          await notificationService.createNotification({
            userId: user.id,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Novo tópico disponível',
            message: `O tópico "${topic.name}" foi criado na comunidade.`,
            data: {
              topicId: topic.id,
              actionUrl: '/comunidade',
              actionLabel: 'Ver comunidade'
            },
            priority: NotificationPriority.LOW,
            isPush: false
          })
        } catch (notificationError) {
          console.error('Erro ao notificar usuário sobre novo tópico:', notificationError)
        }
      }
    }

    return NextResponse.json(
      communityIds.length > 1 ? { topics: createdTopics } : createdTopics[0],
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar tópico:', error)
    
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
