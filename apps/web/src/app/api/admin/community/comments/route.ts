import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@hekate/database'
import { requireAdminAuth } from '@/lib/auth'
import { CreateCommentSchema } from '@/lib/validations/community'

// Schema for filtering comments
const CommentsFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  postId: z.string().optional(),
  authorId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'content']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Schema for creating comments with admin fields
const AdminCreateCommentSchema = CreateCommentSchema.extend({
  authorId: z.string().cuid('ID do autor deve ser válido')
})

// GET /api/admin/community/comments - List comments with filters
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const user = await requireAdminAuth()
    if (!user) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const filters = CommentsFiltersSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      postId: searchParams.get('postId'),
      authorId: searchParams.get('authorId'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    })

    const skip = (filters.page - 1) * filters.limit

    // Build where clause
    const where: any = {}

    if (filters.search) {
      where.content = {
        contains: filters.search,
        mode: 'insensitive'
      }
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.postId) {
      where.postId = filters.postId
    }

    if (filters.authorId) {
      where.authorId = filters.authorId
    }

    // Get comments with relations
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: {
          [filters.sortBy]: filters.sortOrder
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
          post: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          },
          parent: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  name: true
                }
              }
            }
          },
          replies: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: {
                select: {
                  name: true,
                  image: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      }),
      prisma.comment.count({ where })
    ])

    const totalPages = Math.ceil(total / filters.limit)

    return NextResponse.json({
      comments,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrev: filters.page > 1
      }
    })
  } catch (error) {
    console.error('Erro ao buscar comentários:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/admin/community/comments - Create new comment
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const user = await requireAdminAuth()
    if (!user) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = AdminCreateCommentSchema.parse(body)

    // Verify that post exists
    const post = await prisma.post.findUnique({
      where: { id: data.postId },
      select: { id: true }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post não encontrado' },
        { status: 404 }
      )
    }

    // Verify that user exists
    const commentUser = await prisma.user.findUnique({
      where: { id: data.authorId },
      select: { id: true }
    })

    if (!commentUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // If parentId is provided, verify parent comment exists
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId },
        select: { id: true, postId: true }
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Comentário pai não encontrado' },
          { status: 404 }
        )
      }

      if (parentComment.postId !== data.postId) {
        return NextResponse.json(
          { error: 'Comentário pai deve pertencer ao mesmo post' },
          { status: 400 }
        )
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        postId: data.postId,
        authorId: data.authorId,
        parentId: data.parentId
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
        post: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar comentário:', error)
    
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