import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, GroupMemberStatus, GroupMemberRole } from '@hekate/database'
import { z } from 'zod'

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  avatar: z.string().url().optional(),
  maxMembers: z.number().int().min(2).max(500).optional(),
  requiresApproval: z.boolean().optional(),
  metadata: z.record(z.any()).optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

// Helper function to check user permissions
async function checkGroupPermission(
  groupId: string, 
  userId: string, 
  requiredRoles: GroupMemberRole[] = [GroupMemberRole.OWNER, GroupMemberRole.ADMIN]
) {
  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId, status: GroupMemberStatus.ACTIVE },
    include: { group: true }
  })

  if (!member) {
    return { hasPermission: false, member: null as any, group: null as any }
  }

  const hasPermission = requiredRoles.includes(member.role)
  return { hasPermission, member, group: member.group }
}

// GET /api/groups/[id] - Detalhes do grupo
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

    const { hasPermission, member } = await checkGroupPermission(
      params.id,
      session.user.id,
      [GroupMemberRole.OWNER, GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR, GroupMemberRole.MEMBER]
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Grupo não encontrado ou acesso negado' },
        { status: 404 }
      )
    }

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        creator: { select: { id: true, name: true, email: true, image: true } },
        members: {
          where: { status: GroupMemberStatus.ACTIVE },
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }]
        },
        _count: {
          select: {
            members: { where: { status: GroupMemberStatus.ACTIVE } },
            messages: true,
            resources: true
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...group,
        memberCount: group._count.members,
        messageCount: group._count.messages,
        resourceCount: group._count.resources,
        userRole: member?.role || GroupMemberRole.MEMBER
      }
    })
  } catch (error) {
    console.error('Error fetching group:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/groups/[id] - Atualizar grupo
export async function PUT(
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
    const data = UpdateGroupSchema.parse(body)

    const updatedGroup = await prisma.group.update({
      where: { id: params.id },
      data,
      include: {
        creator: { select: { id: true, name: true, email: true, image: true } },
        members: {
          where: { status: GroupMemberStatus.ACTIVE },
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        },
        _count: { select: { members: true, messages: true, resources: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updatedGroup,
        memberCount: updatedGroup._count.members,
        messageCount: updatedGroup._count.messages,
        resourceCount: updatedGroup._count.resources
      }
    })
  } catch (error) {
    console.error('Error updating group:', error)
    
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

// DELETE /api/groups/[id] - Deletar grupo
export async function DELETE(
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
      [GroupMemberRole.OWNER] // Apenas o dono pode deletar
    )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Apenas o dono do grupo pode deletá-lo' },
        { status: 403 }
      )
    }

    // Soft delete - desativar membros e arquivar grupo
    await prisma.$transaction([
      prisma.groupMember.updateMany({ where: { groupId: params.id }, data: { status: GroupMemberStatus.INACTIVE } }),
      prisma.group.update({ where: { id: params.id }, data: { archivedAt: new Date() } })
    ])

    return NextResponse.json({ success: true, message: 'Grupo deletado com sucesso' })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}