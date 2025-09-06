import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, GroupMemberRole, GroupMemberStatus } from '@hekate/database'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const AddMemberSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  role: z.enum(['member', 'moderator', 'admin']).default('member')
}).refine(data => data.userId || data.email, {
  message: 'userId ou email deve ser fornecido'
})

const UpdateMemberSchema = z.object({
  role: z.enum(['member', 'moderator', 'admin'])
})

interface RouteParams {
  params: {
    id: string
  }
}

// Helper to map input role strings to Prisma enum
function toRoleEnum(role: string): GroupMemberRole {
  const r = role.toUpperCase()
  if (r === 'OWNER') return GroupMemberRole.OWNER
  if (r === 'ADMIN') return GroupMemberRole.ADMIN
  if (r === 'MODERATOR') return GroupMemberRole.MODERATOR
  return GroupMemberRole.MEMBER
}

// Helper function to check user permissions
async function checkGroupPermission(
  groupId: string, 
  userId: string, 
  requiredRoles: GroupMemberRole[] = [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]
) {
  const member = await prisma.groupMember.findFirst({
    where: {
      groupId,
      userId,
      status: GroupMemberStatus.ACTIVE
    }
  })

  if (!member) {
    return { hasPermission: false, member: null }
  }

  const hasPermission = requiredRoles.includes(member.role)
  return { hasPermission, member }
}

// GET /api/groups/[id]/members - Listar membros
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { hasPermission } = await checkGroupPermission(
      params.id,
      session.user.id,
      [GroupMemberRole.OWNER, GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR, GroupMemberRole.MEMBER] // Qualquer membro pode ver a lista
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Grupo não encontrado ou acesso negado' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    const whereClause: any = {
      groupId: params.id,
      status: GroupMemberStatus.ACTIVE
    }

    if (role) {
      whereClause.role = toRoleEnum(role)
    }

    if (search) {
      whereClause.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      }
    }

    const [members, total] = await Promise.all([
      prisma.groupMember.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              createdAt: true
            }
          }
        },
        orderBy: [
          { role: 'asc' }, // owner, admin, moderator, member
          { joinedAt: 'asc' }
        ],
        skip: offset,
        take: limit
      }),
      prisma.groupMember.count({ where: whereClause })
    ])

    return NextResponse.json({
      success: true,
      data: {
        members,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + limit < total
        }
      }
    })
  } catch (error) {
    console.error('Error fetching group members:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/groups/[id]/members - Adicionar membro
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { hasPermission } = await checkGroupPermission(
      params.id,
      session.user.id,
      [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = AddMemberSchema.parse(body)

    // Buscar configuração do grupo para limite de membros
    const group = await prisma.group.findUnique({
      where: { id: params.id },
      select: { maxMembers: true }
    })

    // Verificar se o grupo não excedeu o limite de membros
    const currentMemberCount = await prisma.groupMember.count({
      where: {
        groupId: params.id,
        status: GroupMemberStatus.ACTIVE
      }
    })

    if (currentMemberCount >= (group?.maxMembers || 50)) {
      return NextResponse.json(
        { error: 'Limite de membros do grupo excedido' },
        { status: 400 }
      )
    }

    let targetUserId = data.userId

    // Se foi fornecido email, buscar o usuário
    if (data.email && !targetUserId) {
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true }
      })

      if (!user) {
        // Criar convite se usuário não existe
        const invitation = await prisma.groupInvitation.create({
          data: {
            groupId: params.id,
            inviterId: session.user.id,
            email: data.email,
            token: randomUUID(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
          }
        })

        // TODO: Enviar email de convite
        
        return NextResponse.json({
          success: true,
          message: 'Convite enviado por email',
          data: { invitation }
        })
      }

      targetUserId = user.id
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário já é membro
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId: params.id,
        userId: targetUserId
      }
    })

    if (existingMember) {
      if (existingMember.status === GroupMemberStatus.ACTIVE) {
        return NextResponse.json(
          { error: 'Usuário já é membro do grupo' },
          { status: 400 }
        )
      } else {
        // Reativar membro
        const reactivatedMember = await prisma.groupMember.update({
          where: { id: existingMember.id },
          data: {
            status: GroupMemberStatus.ACTIVE,
            role: toRoleEnum(data.role),
            joinedAt: new Date()
          },
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
        })

        return NextResponse.json({
          success: true,
          data: reactivatedMember
        })
      }
    }

    // Adicionar novo membro
    const newMember = await prisma.groupMember.create({
      data: {
        groupId: params.id,
        userId: targetUserId,
        role: toRoleEnum(data.role),
        status: GroupMemberStatus.ACTIVE
      },
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
    })

    return NextResponse.json({
      success: true,
      data: newMember
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding group member:', error)
    
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