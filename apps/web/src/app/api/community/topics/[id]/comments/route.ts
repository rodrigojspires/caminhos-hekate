import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { GamificationEngine } from '@/lib/gamification-engine'

const tierOrder: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

async function canAccessTopic(topicId: string, userId: string | null) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: {
      id: true,
      communityId: true,
      community: { select: { accessModels: true, tier: true } }
    }
  })
  if (!topic) return { ok: false, topic: null }
  if (!topic.communityId || !topic.community) return { ok: true, topic }
  if (!userId) return { ok: false, topic }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true }
  })
  const membership = await prisma.communityMembership.findUnique({
    where: { communityId_userId: { communityId: topic.communityId, userId } },
    select: { status: true }
  })
  const accessModels = (topic.community.accessModels || []) as string[]
  const isFree = accessModels.includes('FREE')
  const isSubscription = accessModels.includes('SUBSCRIPTION')
  const allowedByTier = isSubscription && tierOrder[user?.subscriptionTier || 'FREE'] >= tierOrder[topic.community.tier]
  const ok = isFree || allowedByTier || membership?.status === 'active'
  return { ok, topic }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const access = await canAccessTopic(params.id, session?.user?.id || null)
    if (!access.topic) return NextResponse.json({ error: 'Tópico inexistente' }, { status: 404 })
    if (!access.ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const comments = await prisma.topicComment.findMany({
      where: { topicId: params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, image: true } }
      }
    })
    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Erro ao listar comentários do tópico:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id

    const access = await canAccessTopic(params.id, userId)
    if (!access.topic) return NextResponse.json({ error: 'Tópico inexistente' }, { status: 404 })
    if (!access.ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await req.json()
    const { content, parentId } = body as { content: string; parentId?: string }
    if (!content || content.trim().length < 1) {
      return NextResponse.json({ error: 'Comentário vazio' }, { status: 400 })
    }

    if (parentId) {
      const parent = await prisma.topicComment.findUnique({
        where: { id: parentId },
        select: { id: true, topicId: true }
      })
      if (!parent || parent.topicId !== params.id) {
        return NextResponse.json({ error: 'Comentário pai inválido' }, { status: 400 })
      }
    }

    const comment = await prisma.topicComment.create({
      data: {
        content,
        topicId: params.id,
        authorId: userId,
        parentId: parentId || null
      }
    })

    try {
      await GamificationEngine.awardPoints(userId, 10, 'TOPIC_COMMENT', {
        topicId: params.id,
        communityId: access.topic.communityId,
        reasonLabel: 'Comentário em tópico da comunidade'
      })
    } catch (pointsError) {
      console.error('Erro ao conceder pontos por comentário em tópico:', pointsError)
    }

    return NextResponse.json({ id: comment.id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar comentário do tópico:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id
    const role = session.user.role as string | undefined

    const body = await req.json()
    const { commentId, content } = body as { commentId: string; content: string }
    if (!commentId || !content || !content.trim()) {
      return NextResponse.json({ error: 'Comentário inválido' }, { status: 400 })
    }

    const comment = await prisma.topicComment.findUnique({
      where: { id: commentId },
      include: { topic: { select: { id: true, communityId: true, community: { select: { accessModels: true, tier: true } } } } }
    })
    if (!comment || comment.topicId !== params.id) {
      return NextResponse.json({ error: 'Comentário inexistente' }, { status: 404 })
    }

    const access = await canAccessTopic(comment.topicId, userId)
    if (!access.ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const canEdit = comment.authorId === userId || role === 'ADMIN' || role === 'EDITOR'
    if (!canEdit) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    await prisma.topicComment.update({
      where: { id: commentId },
      data: { content }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao editar comentário do tópico:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id
    const role = session.user.role as string | undefined

    const { searchParams } = new URL(req.url)
    const commentId = searchParams.get('commentId')
    if (!commentId) return NextResponse.json({ error: 'Comentário inválido' }, { status: 400 })

    const comment = await prisma.topicComment.findUnique({
      where: { id: commentId },
      include: { topic: { select: { id: true } } }
    })
    if (!comment || comment.topicId !== params.id) {
      return NextResponse.json({ error: 'Comentário inexistente' }, { status: 404 })
    }

    const access = await canAccessTopic(comment.topicId, userId)
    if (!access.ok) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const canDelete = comment.authorId === userId || role === 'ADMIN' || role === 'EDITOR'
    if (!canDelete) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    await prisma.topicComment.delete({ where: { id: commentId } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao remover comentário do tópico:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
