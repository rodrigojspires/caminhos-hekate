import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@hekate/database'
import { requireAdminAuth } from '@/lib/auth'

// Schema for updating comments
const UpdateCommentSchema = z.object({
  content: z.string().min(1, 'Conteúdo é obrigatório').max(1000, 'Conteúdo muito longo').optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  moderatorNote: z.string().max(500, 'Nota muito longa').optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/community/comments/[id] - Get comment by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check admin authentication
    const user = await requireAdminAuth()
    if (!user) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do comentário é obrigatório' },
        { status: 400 }
      )
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
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
            slug: true,
            content: true
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            author: {
               select: {
                 name: true,
                 image: true
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
                 id: true,
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
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comentário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Erro ao buscar comentário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/community/comments/[id] - Update comment
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check admin authentication
    const user = await requireAdminAuth()
    if (!user) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do comentário é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = UpdateCommentSchema.parse(body)

    // Check if comment exists
    const existingComment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!existingComment) {
      return NextResponse.json(
        { error: 'Comentário não encontrado' },
        { status: 404 }
      )
    }

    // Update comment
    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
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
    })

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error)
    
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

// DELETE /api/admin/community/comments/[id] - Delete comment
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Check admin authentication
    const user = await requireAdminAuth()
    if (!user) {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar.' },
        { status: 403 }
      )
    }

    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do comentário é obrigatório' },
        { status: 400 }
      )
    }

    // Check if comment exists
    const existingComment = await prisma.comment.findUnique({
      where: { id },
      include: {
        replies: {
          select: { id: true }
        }
      }
    })

    if (!existingComment) {
      return NextResponse.json(
        { error: 'Comentário não encontrado' },
        { status: 404 }
      )
    }

    // If comment has replies, we might want to handle them differently
    // For now, we'll delete the comment and its replies (cascade)
    if (existingComment.replies.length > 0) {
      // First delete all replies
      await prisma.comment.deleteMany({
        where: {
          parentId: id
        }
      })
    }

    // Delete the comment
    await prisma.comment.delete({
      where: { id }
    })

    return NextResponse.json(
      { message: 'Comentário excluído com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao excluir comentário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}