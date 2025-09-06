import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, GroupMemberRole, GroupMemberStatus } from '@hekate/database'
import { z } from 'zod'

const UpdateMessageSchema = z.object({
  content: z.string().min(1)
})

const ReactToMessageSchema = z.object({
  emoji: z.string().min(1),
  action: z.enum(['add', 'remove'])
})

interface RouteParams { params: { id: string, messageId: string } }

async function checkGroupMembership(groupId: string, userId: string) {
  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId, status: GroupMemberStatus.ACTIVE }
  })
  return member
}

function getRoleLevel(role: GroupMemberRole) {
  switch (role) {
    case GroupMemberRole.OWNER: return 4
    case GroupMemberRole.ADMIN: return 3
    case GroupMemberRole.MODERATOR: return 2
    default: return 1
  }
}

async function checkMessagePermission(messageId: string, userId: string) {
  const message = await prisma.groupMessage.findUnique({ where: { id: messageId } })
  if (!message || message.deletedAt) return { allowed: false, message: null }
  if (message.authorId === userId) return { allowed: true, message, level: 1 }
  // Non-author can act only if they are moderator or above; we'll check caller separately
  return { allowed: true, message, level: 2 }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const member = await checkGroupMembership(params.id, session.user.id)
    if (!member) return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })

    const body = await request.json()
    const parsed = UpdateMessageSchema.parse(body)

    const { allowed, message } = await checkMessagePermission(params.messageId, session.user.id)
    if (!allowed || !message) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })

    // Allow author to edit within 24h; mods/admins/owner always allowed
    const isAuthor = message.authorId === session.user.id
    const within24h = message.createdAt && (Date.now() - new Date(message.createdAt).getTime() < 24 * 60 * 60 * 1000)
    if (!isAuthor) {
      const level = getRoleLevel(member.role)
      if (level < 2) return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    } else {
      if (!within24h) return NextResponse.json({ error: 'Janela de edição expirada' }, { status: 403 })
    }

    const updated = await prisma.groupMessage.update({
      where: { id: params.messageId },
      data: { content: parsed.content, isEdited: true, editedAt: new Date() },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        replyTo: { select: { id: true, content: true, author: { select: { id: true, name: true, email: true, image: true } } } }
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating group message:', error)
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const member = await checkGroupMembership(params.id, session.user.id)
    if (!member) return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })

    const { allowed, message } = await checkMessagePermission(params.messageId, session.user.id)
    if (!allowed || !message) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })

    // Non-author needs moderator+ to delete
    const isAuthor = message.authorId === session.user.id
    if (!isAuthor && getRoleLevel(member.role) < 2) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    const deleted = await prisma.groupMessage.update({
      where: { id: params.messageId },
      data: { deletedAt: new Date() },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } }
      }
    })

    return NextResponse.json({ success: true, data: deleted })
  } catch (error) {
    console.error('Error deleting group message:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const member = await checkGroupMembership(params.id, session.user.id)
    if (!member) return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })

    const body = await request.json()
    const parsed = ReactToMessageSchema.parse(body)

    const message = await prisma.groupMessage.findUnique({ where: { id: params.messageId } })
    if (!message || message.groupId !== params.id || message.deletedAt) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
    }

    // reactions JSON format: [{ emoji: string, count: number, users: {id:string,name:string}[] }]
    const reactions = (message.reactions as any[] | null) ?? []

    const userInfo = { id: session.user.id, name: member.userId === session.user.id ? undefined : undefined }
    // We don't have the name here without extra join; frontend usually reconciles names. Keep only id.

    const idx = reactions.findIndex(r => r.emoji === parsed.emoji)
    if (parsed.action === 'add') {
      if (idx >= 0) {
        const users: string[] = reactions[idx].users || []
        if (!users.includes(session.user.id)) {
          users.push(session.user.id)
        }
        reactions[idx] = { emoji: parsed.emoji, count: users.length, users }
      } else {
        reactions.push({ emoji: parsed.emoji, count: 1, users: [session.user.id] })
      }
    } else {
      if (idx >= 0) {
        const users: string[] = reactions[idx].users || []
        const filtered = users.filter((u: string) => u !== session.user.id)
        if (filtered.length > 0) {
          reactions[idx] = { emoji: parsed.emoji, count: filtered.length, users: filtered }
        } else {
          reactions.splice(idx, 1)
        }
      }
    }

    const updated = await prisma.groupMessage.update({
      where: { id: params.messageId },
      data: { reactions },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        replyTo: { select: { id: true, content: true, author: { select: { id: true, name: true, email: true, image: true } } } }
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error reacting to group message:', error)
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}