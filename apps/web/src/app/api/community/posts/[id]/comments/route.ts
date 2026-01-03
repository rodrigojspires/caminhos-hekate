import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { GamificationEngine } from '@/lib/gamification-engine'
import { getGamificationPointSettings } from '@/lib/gamification/point-settings.server'
import notificationService from '@/lib/notifications/notification-service'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: params.id },
      orderBy: { createdAt: 'asc' },
      include: { 
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { reactions: true, replies: true } },
        reactions: { select: { type: true } }
      }
    })
    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Erro ao listar comentários:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id
    const post = await prisma.post.findUnique({ where: { id: params.id }, select: { id: true, status: true } })
    if (!post || post.status !== 'PUBLISHED') return NextResponse.json({ error: 'Post inexistente' }, { status: 404 })

    const body = await req.json()
    const { content, parentId } = body as { content: string; parentId?: string }
    if (!content || content.trim().length < 1) return NextResponse.json({ error: 'Comentário vazio' }, { status: 400 })

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { id: true, postId: true } })
      if (!parent || parent.postId !== params.id) return NextResponse.json({ error: 'Comentário pai inválido' }, { status: 400 })
    }

    const comment = await prisma.comment.create({ data: { content, postId: params.id, authorId: userId, parentId: parentId || null } })

    try {
      const pointSettings = await getGamificationPointSettings()
      await GamificationEngine.awardPoints(userId, pointSettings.communityCommentPoints, 'COMMUNITY_COMMENT', {
        postId: params.id,
        commentId: comment.id,
        reasonLabel: 'Resposta em post da comunidade'
      })
    } catch (pointsError) {
      console.error('Erro ao conceder pontos por comentário:', pointsError)
    }

    try {
      const followers = await prisma.userPreferences.findMany({
        where: {
          layout: {
            path: ['community', 'followedPosts'],
            array_contains: [params.id]
          }
        },
        select: { userId: true }
      })

      const followerIds = followers
        .map((f) => f.userId)
        .filter((id) => id && id !== userId)

      if (followerIds.length > 0) {
        const postInfo = await prisma.post.findUnique({
          where: { id: params.id },
          select: { id: true, title: true, slug: true }
        })

        const postTitle = postInfo?.title || 'um post'
        const postUrl = postInfo?.slug ? `/comunidade/post/${postInfo.slug}` : `/comunidade/post/${params.id}`

        await Promise.all(
          followerIds.map((followerId) =>
            notificationService.createNotification({
              userId: followerId,
              type: 'COMMENT_REPLY',
              title: 'Novo comentario em post seguido',
              message: `Novo comentario em ${postTitle}.`,
              data: {
                postId: params.id,
                commentId: comment.id,
                url: postUrl
              },
              priority: 'LOW'
            })
          )
        )
      }
    } catch (notifyError) {
      console.error('Erro ao notificar seguidores do post:', notifyError)
    }

    // Indexar comentário (opcional)
    try {
      const { searchService } = await import('@/lib/search')
      await searchService.indexContent('comment', comment.id, {
        title: `Comentário em ${params.id}`,
        content,
        summary: content.slice(0, 120),
        tags: [],
        categories: [],
        metadata: { postId: params.id },
        popularity: 0
      })
    } catch (e) {
      console.error('Falha ao indexar comentário:', e)
    }

    return NextResponse.json({ id: comment.id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar comentário:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
