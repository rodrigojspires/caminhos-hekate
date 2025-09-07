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
import { z } from 'zod'

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

    const postData = {
      ...data,
      authorId: session.user.id,
      publishedAt: data.status === 'PUBLISHED' ? new Date() : null
    }

    const post = await prisma.post.create({
      data: postData,
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

    return NextResponse.json(post, { status: 201 })
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
