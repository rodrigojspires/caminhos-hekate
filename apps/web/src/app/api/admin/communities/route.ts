import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { checkAdminPermission } from '@/lib/auth'
import { CreateCommunitySchema } from '@/lib/validations/community'
import { notificationService } from '@/lib/notifications/notification-service'
import { NotificationPriority } from '@prisma/client'
import { z } from 'zod'

const querySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
})

const serializeCommunity = (community: any) => ({
  ...community,
  price: community.price != null ? Number(community.price) : null,
  membersCount: community._count?.memberships ?? 0
})

// GET /api/admin/communities - Listar comunidades
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse({
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') || 'all') as 'active' | 'inactive' | 'all',
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined
    })

    const where = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { slug: { contains: query.search, mode: 'insensitive' as const } }
        ]
      }),
      ...(query.status === 'active' ? { isActive: true } : {}),
      ...(query.status === 'inactive' ? { isActive: false } : {})
    }

    const skip = (query.page - 1) * query.limit

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
        include: { _count: { select: { memberships: true } } }
      }),
      prisma.community.count({ where })
    ])

    return NextResponse.json({
      communities: communities.map(serializeCommunity),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit)
      }
    })
  } catch (error) {
    console.error('Erro ao listar comunidades:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST /api/admin/communities - Criar comunidade
export async function POST(request: NextRequest) {
  try {
    const authCheck = await checkAdminPermission()
    if (authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const data = CreateCommunitySchema.parse(body)

    const existing = await prisma.community.findUnique({ where: { slug: data.slug } })
    if (existing) {
      return NextResponse.json({ error: 'Já existe uma comunidade com este slug' }, { status: 409 })
    }

    const community = await prisma.community.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        accessModels: data.accessModels as any,
        tier: data.tier as any,
        price: data.price ?? null,
        isActive: data.isActive ?? true
      },
      include: { _count: { select: { memberships: true } } }
    })

    const users = await prisma.user.findMany({
      where: { NOT: { email: { startsWith: 'deleted_' } } },
      select: { id: true }
    })

    for (const user of users) {
      try {
        await notificationService.createNotification({
          userId: user.id,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: 'Nova comunidade disponível',
          message: `A comunidade "${community.name}" foi criada e já está disponível.`,
          data: {
            communityId: community.id,
            actionUrl: '/dashboard/comunidades',
            actionLabel: 'Ver comunidades'
          },
          priority: NotificationPriority.LOW,
          isPush: false
        })
      } catch (notificationError) {
        console.error('Erro ao notificar usuário sobre nova comunidade:', notificationError)
      }
    }

    return NextResponse.json(serializeCommunity(community), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar comunidade:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
