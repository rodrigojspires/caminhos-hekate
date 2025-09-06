import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  maxMembers: z.number().int().min(2).max(500).default(50),
  isInviteOnly: z.boolean().default(true),
  settings: z.record(z.any()).default({})
})

const GroupFiltersSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  memberRole: z.enum(['owner', 'admin', 'moderator', 'member']).optional()
})

// GET /api/groups - Listar grupos do usuário
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
    const filters = GroupFiltersSchema.parse(Object.fromEntries(searchParams))

    const whereClause: any = {
      members: {
        some: {
          userId: session.user.id,
          isActive: true
        }
      }
    }

    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ]
    }

    if (filters.memberRole) {
      whereClause.members.some.role = filters.memberRole
    }

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where: whereClause,
        include: {
          members: {
            where: {
              status: 'ACTIVE'
            },
            select: {
              id: true,
              userId: true,
              role: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          },
          _count: {
            select: {
              members: {
                where: {
                  status: 'ACTIVE'
                }
              },
              messages: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: filters.offset,
        take: filters.limit
      }),
      prisma.group.count({ where: whereClause })
    ])

    return NextResponse.json({
      success: true,
      data: {
        groups: groups.map((group: any) => ({
          ...group,
          memberCount: group._count.members,
          messageCount: group._count.messages,
          userRole: group.members.find((m: any) => m.userId === session.user.id)?.role || 'member'
        })),
        pagination: {
          total,
          offset: filters.offset,
          limit: filters.limit,
          hasMore: filters.offset + filters.limit < total
        }
      }
    })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/groups - Criar novo grupo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = CreateGroupSchema.parse(body)

    const group = await prisma.group.create({
      data: {
        ...data,
        creator: {
          connect: { id: session.user.id }
        },
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
            status: 'ACTIVE'
          }
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...group,
        memberCount: group._count.members,
        messageCount: group._count.messages,
        userRole: 'owner'
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating group:', error)
    
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