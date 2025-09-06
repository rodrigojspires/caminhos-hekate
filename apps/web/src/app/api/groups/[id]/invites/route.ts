import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, GroupMemberRole, GroupMemberStatus, GroupInvitationStatus } from '@hekate/database'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const CreateInviteSchema = z.object({
  email: z.string().email('Email inválido').optional(),
  expiresAt: z.string().datetime().optional(),
  // aceita valores amigáveis e mapeia para enum depois
  role: z.enum(['member', 'moderator']).default('member')
})

interface RouteParams {
  params: {
    id: string
  }
}

// Helper function to check group permissions
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
    },
    include: {
      group: true
    }
  })

  if (!member) {
    return { hasPermission: false, member: null, group: null }
  }

  const hasPermission = requiredRoles.includes(member.role)
  return { hasPermission, member, group: member.group }
}

// GET /api/groups/[id]/invites - Listar convites do grupo
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
      [GroupMemberRole.OWNER, GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR]
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const status = searchParams.get('status') // 'active', 'expired', 'used'

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {
      groupId: params.id
    }

    if (status === 'active' || status === 'pending') {
      where.status = GroupInvitationStatus.PENDING
      where.expiresAt = { gt: new Date() }
    } else if (status === 'expired') {
      where.OR = [
        { status: GroupInvitationStatus.EXPIRED },
        { expiresAt: { lte: new Date() } }
      ]
    } else if (status === 'accepted' || status === 'used') {
      where.status = GroupInvitationStatus.ACCEPTED
    } else if (status === 'canceled') {
      where.status = GroupInvitationStatus.CANCELED
    }

    // Buscar convites
    const invites = await prisma.groupInvitation.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        invitee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Contar total
    const total = await prisma.groupInvitation.count({ where })

    return NextResponse.json({
      success: true,
      data: {
        invites,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('Error fetching group invites:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/groups/[id]/invites - Criar convite
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

    const { hasPermission, group } = await checkGroupPermission(
      params.id,
      session.user.id,
      [GroupMemberRole.OWNER, GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR]
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Permissão negada ou grupo inativo' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = CreateInviteSchema.parse(body)

    // Verificar limite de membros do grupo
    const currentMemberCount = await prisma.groupMember.count({
      where: {
        groupId: params.id,
        status: GroupMemberStatus.ACTIVE
      }
    })

    if (group?.maxMembers && currentMemberCount >= group.maxMembers) {
      return NextResponse.json(
        { error: 'Grupo já atingiu o limite máximo de membros' },
        { status: 400 }
      )
    }

    // Se email foi fornecido, verificar se o usuário já é membro
    if (data.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      })

      if (existingUser) {
        const existingMember = await prisma.groupMember.findFirst({
          where: {
            groupId: params.id,
            userId: existingUser.id,
            status: GroupMemberStatus.ACTIVE
          }
        })

        if (existingMember) {
          return NextResponse.json(
            { error: 'Usuário já é membro do grupo' },
            { status: 400 }
          )
        }
      }

      // Verificar se já existe um convite ativo para este email
      const existingInvite = await prisma.groupInvitation.findFirst({
        where: {
          groupId: params.id,
          email: data.email,
          status: GroupInvitationStatus.PENDING,
          expiresAt: { gt: new Date() }
        }
      })

      if (existingInvite) {
        return NextResponse.json(
          { error: 'Já existe um convite ativo para este email' },
          { status: 400 }
        )
      }
    }

    // Gerar token único
    const token = randomBytes(32).toString('hex')

    // Definir data de expiração padrão (7 dias)
    const defaultExpiresAt = new Date()
    defaultExpiresAt.setDate(defaultExpiresAt.getDate() + 7)

    // Mapear role amigável para enum do Prisma
    const roleEnum: GroupMemberRole = (data.role.toUpperCase() === 'MODERATOR')
      ? GroupMemberRole.MODERATOR
      : GroupMemberRole.MEMBER

    // Criar convite
    const invite = await prisma.groupInvitation.create({
      data: {
        token,
        email: data.email,
        role: roleEnum,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : defaultExpiresAt,
        groupId: params.id,
        inviterId: session.user.id
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    })

    // TODO: Enviar email de convite se email foi fornecido
    // TODO: Criar notificação para o usuário convidado (se existir)

    return NextResponse.json({
      success: true,
      data: {
        ...invite,
        inviteUrl: `${process.env.NEXTAUTH_URL}/groups/invite/${token}`
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating group invite:', error)
    
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