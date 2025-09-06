import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { 
  CreateReportSchema, 
  UpdateReportSchema,
  ReportFiltersSchema 
} from '@/lib/validations/community'
import { z } from 'zod'
import { Prisma } from '@hekate/database'

// GET /api/admin/community/reports - Listar relatórios
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
    const filters = ReportFiltersSchema.parse({
      type: searchParams.get('type') || undefined,
      status: searchParams.get('status') || undefined,
      reporterId: searchParams.get('reporterId') || undefined,
      reviewerId: searchParams.get('reviewerId') || undefined,
      postId: searchParams.get('postId') || undefined,
      commentId: searchParams.get('commentId') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    })

    const skip = (filters.page - 1) * filters.limit
    
    const where = {
      ...(filters.search && {
        OR: [
          { reason: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: filters.search, mode: Prisma.QueryMode.insensitive } }
        ]
      }),
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.reporterId && { reporterId: filters.reporterId }),
      ...(filters.reviewerId && { reviewerId: filters.reviewerId })
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              author: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          comment: {
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  name: true
                }
              },
              post: {
                select: {
                  id: true,
                  title: true,
                  slug: true
                }
              }
            }
          }
        }
      }),
      prisma.report.count({ where })
    ])

    return NextResponse.json({
      reports,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error)
    
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

// POST /api/admin/community/reports - Criar relatório
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = CreateReportSchema.parse(body)

    // Verificar se o post ou comentário existe
    if (data.postId) {
      const post = await prisma.post.findUnique({
        where: { id: data.postId }
      })

      if (!post) {
        return NextResponse.json(
          { error: 'Post não encontrado' },
          { status: 404 }
        )
      }
    }

    if (data.commentId) {
      const comment = await prisma.comment.findUnique({
        where: { id: data.commentId }
      })

      if (!comment) {
        return NextResponse.json(
          { error: 'Comentário não encontrado' },
          { status: 404 }
        )
      }
    }

    // Verificar se já existe um relatório do mesmo usuário para o mesmo conteúdo
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: session.user.id,
        ...(data.postId && { postId: data.postId }),
        ...(data.commentId && { commentId: data.commentId })
      }
    })

    if (existingReport) {
      return NextResponse.json(
        { error: 'Você já reportou este conteúdo' },
        { status: 400 }
      )
    }

    const report = await prisma.report.create({
      data: {
        ...data,
        reporterId: session.user.id,
        status: 'PENDING'
      },
      include: {
        reporter: {
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
            slug: true,
            status: true,
            author: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        comment: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                name: true
              }
            },
            post: {
              select: {
                id: true,
                title: true,
                slug: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar relatório:', error)
    
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