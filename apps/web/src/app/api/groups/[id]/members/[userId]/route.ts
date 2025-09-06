import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, GroupMemberRole, GroupMemberStatus } from '@hekate/database'
import { z } from 'zod'

const UpdateMemberSchema = z.object({
  role: z.enum(['member', 'moderator', 'admin'])
})

interface RouteParams {
  params: { id: string; userId: string }
}

function toRoleEnum(role: string): GroupMemberRole {
  const r = role.toUpperCase()
  if (r === 'OWNER') return GroupMemberRole.OWNER
  if (r === 'ADMIN') return GroupMemberRole.ADMIN
  if (r === 'MODERATOR') return GroupMemberRole.MODERATOR
  return GroupMemberRole.MEMBER
}

function getRoleLevel(role: GroupMemberRole) {
  switch (role) {
    case GroupMemberRole.OWNER: return 4
    case GroupMemberRole.ADMIN: return 3
    case GroupMemberRole.MODERATOR: return 2
    default: return 1
  }
}

async function checkGroupPermission(groupId: string, userId: string) {
  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId, status: GroupMemberStatus.ACTIVE }
  })
  return member
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const acting = await checkGroupPermission(params.id, session.user.id)
    if (!acting) return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })

    const body = await request.json()
    const parsed = UpdateMemberSchema.parse(body)

    const target = await prisma.groupMember.findFirst({
      where: { groupId: params.id, userId: params.userId }
    })
    if (!target) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

    // only admin/owner can change roles; cannot escalate above your own level
    const actorLevel = getRoleLevel(acting.role)
    if (actorLevel < 3) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })

    const newRole = toRoleEnum(parsed.role)
    if (getRoleLevel(newRole) >= actorLevel && acting.userId !== params.userId) {
      return NextResponse.json({ error: 'Não é possível promover ao mesmo nível ou superior ao seu' }, { status: 403 })
    }

    const updated = await prisma.groupMember.update({
      where: { id: target.id },
      data: { role: newRole },
      include: { user: { select: { id: true, name: true, email: true, image: true } } }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating group member:', error)
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const acting = await checkGroupPermission(params.id, session.user.id)
    if (!acting) return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })

    const target = await prisma.groupMember.findFirst({ where: { groupId: params.id, userId: params.userId } })
    if (!target) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

    const actorLevel = getRoleLevel(acting.role)
    const targetLevel = getRoleLevel(target.role)
    const isSelf = acting.userId === target.userId

    // Only moderator+ can remove; cannot remove same or higher level unless self
    if (actorLevel < 2 || (!isSelf && targetLevel >= actorLevel)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const updated = await prisma.groupMember.update({
      where: { id: target.id },
      data: { status: GroupMemberStatus.LEFT, leftAt: new Date() }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error removing group member:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}