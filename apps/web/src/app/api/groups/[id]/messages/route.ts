import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, GroupMemberStatus } from '@hekate/database'
import { z } from 'zod'

const CreateMessageSchema = z.object({
  content: z.string().min(1),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM']).default('TEXT'),
  attachments: z.any().optional(),
  replyToId: z.string().uuid().optional(),
  mentions: z.array(z.string()).optional()
})

interface RouteParams {
  params: { id: string }
}

async function checkGroupMembership(groupId: string, userId: string) {
  const member = await prisma.groupMember.findFirst({
    where: { groupId, userId, status: GroupMemberStatus.ACTIVE }
  })
  return !!member
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const isMember = await checkGroupMembership(params.id, session.user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Grupo não encontrado ou acesso negado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before')
    const search = searchParams.get('search')

    const where: any = { groupId: params.id, deletedAt: null }
    if (before) {
      where.createdAt = { lt: new Date(before) }
    }
    if (search) {
      where.content = { contains: search, mode: 'insensitive' }
    }

    const messages = await prisma.groupMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, name: true, email: true, image: true } }
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: messages })
  } catch (error) {
    console.error('Error fetching group messages:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const isMember = await checkGroupMembership(params.id, session.user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = CreateMessageSchema.parse(body)

    // Validate replyTo message exists
    if (parsed.replyToId) {
      const replyTo = await prisma.groupMessage.findUnique({ where: { id: parsed.replyToId } })
      if (!replyTo || replyTo.groupId !== params.id || replyTo.deletedAt) {
        return NextResponse.json({ error: 'Mensagem de resposta inválida' }, { status: 400 })
      }
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId: params.id,
        authorId: session.user.id,
        content: parsed.content,
        type: parsed.type as any,
        attachments: parsed.attachments ?? null,
        replyToId: parsed.replyToId ?? null,
        mentions: parsed.mentions ?? []
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        replyTo: {
          select: {
            id: true,
            content: true,
            author: { select: { id: true, name: true, email: true, image: true } }
          }
        }
      }
    })

    // Remove non-existent group updates (lastActivityAt, messageCount)

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (error) {
    console.error('Error creating group message:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}