import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { searchService } from '@/lib/search'
import { resolveCommunityId } from '@/lib/community'
import { isMembershipActive } from '@/lib/community-membership'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    const dbUser = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } }) : null
    const userTier = dbUser?.subscriptionTier || 'FREE'
    const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

    const { searchParams } = new URL(req.url)
    const topicId = searchParams.get('topicId') || undefined
    const authorId = searchParams.get('authorId') || undefined
    const communityId = searchParams.get('communityId')
    const resolvedCommunityId = await resolveCommunityId(communityId)
    const communityFilter = communityId
      ? { communityId: resolvedCommunityId }
      : { OR: [{ communityId: resolvedCommunityId }, { communityId: null }] }
    const sort = searchParams.get('sort') || 'recent' // 'recent' | 'popular'
    const page = Number(searchParams.get('page') || '1')
    const limit = Math.min(50, Number(searchParams.get('limit') || '10'))
    const skip = (page - 1) * limit

    const where: any = {
      status: 'PUBLISHED',
      ...communityFilter,
      ...(topicId && { topicId }),
      ...(authorId && { authorId })
    }

    const [community, membership] = await Promise.all([
      prisma.community.findUnique({
        where: { id: resolvedCommunityId },
        select: { accessModels: true, tier: true }
      }),
      userId
        ? prisma.communityMembership.findUnique({
            where: { communityId_userId: { communityId: resolvedCommunityId, userId } },
            select: { status: true, paidUntil: true }
          })
        : null
    ])

    const accessModels = (community?.accessModels || []) as string[]
    const isFreeCommunity = accessModels.includes('FREE')
    const isSubscriptionCommunity = accessModels.includes('SUBSCRIPTION')
    const allowedByTier = isSubscriptionCommunity && order[userTier] >= order[community?.tier || 'FREE']
    const hasCommunityAccess = !community || isFreeCommunity || allowedByTier || isMembershipActive(membership)

    const orderBy = sort === 'popular'
      ? [{ viewCount: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }]

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, image: true } },
          topic: { select: { id: true, name: true, slug: true, color: true } },
          community: { select: { id: true, name: true } },
          _count: { select: { comments: true, reactions: true } }
        }
      }),
      prisma.post.count({ where })
    ])

    const data = posts.map(p => {
      const lockedByTier = order[userTier] < order[p.tier as keyof typeof order]
      const communityAccessForPost = p.communityId ? hasCommunityAccess : true
      const locked = lockedByTier || !communityAccessForPost
      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        content: locked ? null : p.content,
        excerpt: p.excerpt,
        author: { id: p.author.id, name: p.author.name, image: p.author.image || null },
        topic: p.topic ? { id: p.topic.id, name: p.topic.name, slug: p.topic.slug, color: p.topic.color } : null,
        community: p.community ? { id: p.community.id, name: p.community.name } : null,
        createdAt: p.createdAt,
        commentsCount: p._count.comments,
        reactionsCount: p._count.reactions,
        viewCount: p.viewCount,
        isPinned: p.isPinned,
        type: p.type,
        tier: p.tier,
        locked
      }
    })

    return NextResponse.json({
      posts: data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Erro ao listar posts:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const userId = session.user.id
    const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } })
    const userTier = dbUser?.subscriptionTier || 'FREE'
    const order: Record<string, number> = { FREE: 0, INICIADO: 1, ADEPTO: 2, SACERDOCIO: 3 }

    const body = await req.json()
    const { title, content, excerpt, topicId, tier, communityId, type } = body as {
      title: string
      content: string
      excerpt?: string
      topicId?: string
      tier?: string
      communityId?: string
      type?: 'CONTENT' | 'THREAD'
    }
    if (!title || !content) return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 })
    const postType = type === 'THREAD' ? 'THREAD' : 'CONTENT'
    const role = session.user.role as string | undefined
    if (postType === 'CONTENT' && role !== 'ADMIN' && role !== 'EDITOR') {
      return NextResponse.json({ error: 'Sem permissão para criar conteúdos' }, { status: 403 })
    }

    let resolvedCommunityId = await resolveCommunityId(communityId || null)

    if (topicId) {
      const topic = await prisma.topic.findUnique({ where: { id: topicId }, select: { id: true, communityId: true } })
      if (!topic) return NextResponse.json({ error: 'Tópico inválido' }, { status: 400 })
      if (topic.communityId) {
        resolvedCommunityId = topic.communityId
      }
    }

    if (resolvedCommunityId) {
      const [community, membership] = await Promise.all([
        prisma.community.findUnique({
          where: { id: resolvedCommunityId },
          select: { accessModels: true, tier: true }
        }),
        prisma.communityMembership.findUnique({
          where: { communityId_userId: { communityId: resolvedCommunityId, userId } },
          select: { status: true, paidUntil: true }
        })
      ])
      if (community) {
        const accessModels = (community.accessModels || []) as string[]
        const isFreeCommunity = accessModels.includes('FREE')
        const isSubscriptionCommunity = accessModels.includes('SUBSCRIPTION')
        const allowedByTier = isSubscriptionCommunity && order[userTier] >= order[community.tier || 'FREE']
        const hasCommunityAccess = isFreeCommunity || allowedByTier || isMembershipActive(membership)
        if (!hasCommunityAccess) {
          return NextResponse.json({ error: 'Acesso negado à comunidade' }, { status: 403 })
        }
      }
    }

    const slugBase = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    let slug = slugBase
    let i = 1
    while (await prisma.post.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${i++}`
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || content.substring(0, 180),
        authorId: userId,
        topicId: topicId || null,
        communityId: resolvedCommunityId,
        status: 'PUBLISHED',
        type: postType as any,
        tier: (tier as any) || 'FREE',
        publishedAt: new Date()
      },
      select: { id: true, slug: true }
    })

    // Indexar no SearchIndex
    try {
      await searchService.indexContent('post', post.id, {
        title,
        content,
        summary: excerpt || undefined,
        tags: [],
        categories: topicId ? [topicId] : [],
        metadata: { slug: post.slug, tier: tier || 'FREE' },
        popularity: 0
      })
    } catch (e) {
      console.error('Falha ao indexar post criado:', e)
    }

    return NextResponse.json({ id: post.id, slug: post.slug }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar post:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
