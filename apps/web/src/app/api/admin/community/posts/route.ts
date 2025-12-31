import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { searchService } from '@/lib/search'
import { 
  CreatePostSchema, 
  UpdatePostSchema, 
  CommunityFiltersSchema 
} from '@/lib/validations/community'
import { resolveCommunityId } from '@/lib/community'
import { z } from 'zod'
import { notificationService } from '@/lib/notifications/notification-service'
import { NotificationPriority } from '@prisma/client'

// GET /api/admin/community/posts - Listar posts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = CommunityFiltersSchema.parse({
      search: searchParams.get('search') || undefined,
      topicId: searchParams.get('topicId') || undefined,
      communityId: searchParams.get('communityId') || undefined,
      status: searchParams.get('status') || undefined,
      tier: searchParams.get('tier') || undefined,
      authorId: searchParams.get('authorId') || undefined,
      featured: searchParams.get('featured') ? searchParams.get('featured') === 'true' : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    })

    const skip = (filters.page - 1) * filters.limit
    
    const where = {
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' as const } },
          { content: { contains: filters.search, mode: 'insensitive' as const } },
          { excerpt: { contains: filters.search, mode: 'insensitive' as const } }
        ]
      }),
      ...(filters.topicId && { topicId: filters.topicId }),
      ...(filters.communityId && { communityId: filters.communityId }),
      ...(filters.status && { status: filters.status }),
      ...(filters.tier && { tier: filters.tier }),
      ...(filters.authorId && { authorId: filters.authorId }),
      ...(filters.featured !== undefined && { isPinned: filters.featured })
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          topic: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true
            }
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              reports: true
            }
          }
        }
      }),
      prisma.post.count({ where })
    ])

    return NextResponse.json({
      posts,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar posts:', error)
    
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

// POST /api/admin/community/posts - Criar post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = CreatePostSchema.parse(body)

    // Verificar se já existe um post com o mesmo slug
    const existingPost = await prisma.post.findUnique({
      where: { slug: data.slug }
    })

    if (existingPost) {
      return NextResponse.json(
        { error: 'Já existe um post com este slug' },
        { status: 409 }
      )
    }

    // Verificar se o tópico existe (se fornecido)
    if (data.topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: data.topicId }
      })

      if (!topic) {
        return NextResponse.json(
          { error: 'Tópico não encontrado' },
          { status: 404 }
        )
      }
    }

    const { communityIds: rawCommunityIds, ...postData } = data
    if ('communityIds' in postData) {
      delete (postData as any).communityIds
    }
    const communityIds = Array.isArray(rawCommunityIds) && rawCommunityIds.length > 0
      ? rawCommunityIds
      : [await resolveCommunityId(data.communityId)]

    const communities = await prisma.community.findMany({
      where: { id: { in: communityIds } },
      select: { id: true, slug: true }
    })
    const communitySlugMap = new Map(communities.map((c) => [c.id, c.slug]))

    const topic = data.topicId
      ? await prisma.topic.findUnique({ where: { id: data.topicId }, select: { id: true, communityId: true } })
      : null

    const createdPosts = []
    for (const communityId of communityIds) {
      const communitySlug = communitySlugMap.get(communityId)
      const baseSlug = data.slug
      let slug = baseSlug

      if (communityIds.length > 1 && communitySlug) {
        slug = `${baseSlug}-${communitySlug}`
      }

      let counter = 1
      while (await prisma.post.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${communitySlug || 'comunidade'}-${counter}`
        counter += 1
      }

      const post = await prisma.post.create({
        data: {
          ...postData,
          slug,
          communityId,
          topicId: topic && topic.communityId === communityId ? topic.id : null,
          authorId: session.user.id,
          publishedAt: data.status === 'PUBLISHED' ? new Date() : null
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          topic: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true
            }
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              reports: true
            }
          }
        }
      })

      createdPosts.push(post)

      // Indexar no SearchIndex
      try {
        await searchService.indexContent('post', post.id, {
          title: post.title,
          content: post.content,
          summary: post.excerpt || undefined,
          tags: [],
          categories: post.topic ? [post.topic.id] : [],
          metadata: { slug: post.slug, tier: post.tier },
          popularity: 0
        })
      } catch (e) {
        console.error('Falha ao indexar post (admin create):', e)
      }
    }

    const memberships = await prisma.communityMembership.findMany({
      where: {
        communityId: { in: communityIds },
        status: 'active'
      },
      select: { communityId: true, userId: true }
    })
    const membersByCommunity = new Map<string, string[]>()
    for (const membership of memberships) {
      const list = membersByCommunity.get(membership.communityId) || []
      list.push(membership.userId)
      membersByCommunity.set(membership.communityId, list)
    }

    for (const post of createdPosts) {
      const memberIds = membersByCommunity.get(post.communityId) || []
      for (const userId of memberIds) {
        try {
          await notificationService.createNotification({
            userId,
            type: 'NEW_POST',
            title: 'Novo post na comunidade',
            message: `Um novo post foi publicado: "${post.title}".`,
            data: {
              postId: post.id,
              actionUrl: `/comunidade/post/${post.slug}`,
              actionLabel: 'Abrir post'
            },
            priority: NotificationPriority.LOW,
            isPush: false
          })
        } catch (notificationError) {
          console.error('Erro ao notificar usuário sobre novo post:', notificationError)
        }
      }
    }

    return NextResponse.json(
      communityIds.length > 1 ? { posts: createdPosts } : createdPosts[0],
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar post:', error)
    
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
