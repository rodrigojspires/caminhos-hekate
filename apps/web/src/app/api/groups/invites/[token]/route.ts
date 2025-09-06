import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, GroupMemberStatus, GroupMemberRole, GroupInvitationStatus } from '@hekate/database'

interface RouteParams {
  params: {
    token: string
  }
}

// GET /api/groups/invites/[token] - Obter informações do convite
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Buscar convite pelo token
    const invite = await prisma.groupInvitation.findUnique({
      where: { token: params.token },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            avatar: true,
            maxMembers: true
          }
        },
        inviter: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o convite ainda é válido
    const now = new Date()
    const isExpired = !!invite.expiresAt && invite.expiresAt <= now

    if (isExpired || invite.status !== GroupInvitationStatus.PENDING) {
      let errorMessage = 'Convite inválido'
      if (isExpired) errorMessage = 'Convite expirado'
      else if (invite.status !== GroupInvitationStatus.PENDING) errorMessage = 'Convite não está mais pendente'

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    // Verificar se o grupo atingiu o limite de membros ativos
    let activeMembersCount = 0
    if (invite.groupId) {
      activeMembersCount = await prisma.groupMember.count({
        where: { groupId: invite.groupId, status: GroupMemberStatus.ACTIVE }
      })
    }

    if (invite.group?.maxMembers && activeMembersCount >= invite.group.maxMembers) {
      return NextResponse.json(
        { error: 'Grupo já atingiu o limite máximo de membros' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        invite: {
          id: invite.id,
          role: (invite as any).role, // depende do schema atual, pode ser undefined
          email: invite.email,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
          inviter: invite.inviter
        },
        group: invite.group,
        isValid: true
      }
    })
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/groups/invites/[token] - Aceitar convite
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

    // Buscar convite pelo token
    const invite = await prisma.groupInvitation.findUnique({
      where: { token: params.token },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            maxMembers: true
          }
        }
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o convite ainda é válido
    const now = new Date()
    const isExpired = !!invite.expiresAt && invite.expiresAt <= now

    if (isExpired || invite.status !== GroupInvitationStatus.PENDING) {
      let errorMessage = 'Convite inválido'
      if (isExpired) errorMessage = 'Convite expirado'
      else if (invite.status !== GroupInvitationStatus.PENDING) errorMessage = 'Convite não está mais pendente'

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    // Verificar se o usuário já é membro do grupo
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId: invite.groupId,
        userId: session.user.id,
        status: GroupMemberStatus.ACTIVE
      }
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'Você já é membro deste grupo' },
        { status: 400 }
      )
    }

    // Verificar se o grupo atingiu o limite de membros
    const activeMembersCount = await prisma.groupMember.count({
      where: { groupId: invite.groupId, status: GroupMemberStatus.ACTIVE }
    })

    if (invite.group?.maxMembers && activeMembersCount >= invite.group.maxMembers) {
      return NextResponse.json(
        { error: 'Grupo já atingiu o limite máximo de membros' },
        { status: 400 }
      )
    }

    // Verificar se o convite é específico para um email
    if (invite.email && invite.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Este convite é específico para outro email' },
        { status: 400 }
      )
    }

    // Usar transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // Verificar se existe um membro inativo que pode ser reativado
      const inactiveMember = await tx.groupMember.findFirst({
        where: {
          groupId: invite.groupId,
          userId: session.user.id,
          status: { in: [GroupMemberStatus.INACTIVE, GroupMemberStatus.LEFT] }
        }
      })

      let member
      const roleToAssign: GroupMemberRole = ((invite as any).role as GroupMemberRole) || GroupMemberRole.MEMBER

      if (inactiveMember) {
        // Reativar membro existente
        member = await tx.groupMember.update({
          where: { id: inactiveMember.id },
          data: {
            status: GroupMemberStatus.ACTIVE,
            role: roleToAssign,
            joinedAt: new Date()
          },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            group: { select: { id: true, name: true, description: true } }
          }
        })
      } else {
        // Criar novo membro
        member = await tx.groupMember.create({
          data: {
            userId: session.user.id,
            groupId: invite.groupId,
            role: roleToAssign,
            joinedAt: new Date(),
            status: GroupMemberStatus.ACTIVE
          },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
            group: { select: { id: true, name: true, description: true } }
          }
        })
      }

      // Marcar convite como aceito
      await tx.groupInvitation.update({
        where: { id: invite.id },
        data: { status: GroupInvitationStatus.ACCEPTED, acceptedAt: new Date(), inviteeId: session.user.id }
      })

      return member
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Você entrou no grupo "${result.group.name}" com sucesso!`
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}