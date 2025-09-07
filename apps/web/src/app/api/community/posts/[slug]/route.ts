import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    const dbUser = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } }) : null
    const userTier = dbUser?.subscriptionTier || 'FREE'
    const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

    const post = await prisma.post.findUnique({
      where: { slug: params.slug },
      include: {
        author: { select: { id: true, name: true, image: true } },
        topic: { select: { id: true, name: true, slug: true, color: true } },
        _count: { select: { comments: true, reactions: true } }
      }
    })
    if (!post || post.status !== 'PUBLISHED') return NextResponse.json({ error: 'Post não encontrado' }, { status: 404 })

    const locked = order[userTier] < order[post.tier as keyof typeof order]
    return NextResponse.json({
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: locked ? null : post.content,
      excerpt: post.excerpt,
      author: { id: post.author.id, name: post.author.name, image: post.author.image || null },
      topic: post.topic ? { id: post.topic.id, name: post.topic.name, slug: post.topic.slug, color: post.topic.color } : null,
      createdAt: post.createdAt,
      commentsCount: post._count.comments,
      reactionsCount: post._count.reactions,
      viewCount: post.viewCount,
      isPinned: post.isPinned,
      tier: post.tier,
      locked
    })
  } catch (error) {
    console.error('Erro ao obter post:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

