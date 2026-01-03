import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { searchService } from '@/lib/search'
import { UpdatePostSchema } from '@/lib/validations/community'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/community/posts/[id] - Buscar post por ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
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
        community: {
          select: {
            id: true,
            name: true
          }
        },
        comments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            },
            _count: {
              select: {
                reactions: true,
                reports: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        attachments: true,
        _count: {
          select: {
            comments: true,
            reactions: true,
            reports: true
          }
        }
      }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Erro ao buscar post:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/community/posts/[id] - Atualizar post
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = UpdatePostSchema.parse(body)

    // Verificar se o post existe
    const existingPost = await prisma.post.findUnique({
      where: { id: params.id }
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post não encontrado' },
        { status: 404 }
      )
    }

    // Se está atualizando o slug, verificar se não existe outro com o mesmo slug
    if (data.slug && data.slug !== existingPost.slug) {
      const postWithSlug = await prisma.post.findUnique({
        where: { slug: data.slug }
      })

      if (postWithSlug) {
        return NextResponse.json(
          { error: 'Já existe um post com este slug' },
          { status: 409 }
        )
      }
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

    // Atualizar publishedAt se o status mudou para PUBLISHED
    const updateData = {
      ...data,
      publishedAt: 
        data.status === 'PUBLISHED' && existingPost.status !== 'PUBLISHED'
          ? new Date()
          : data.status === 'PUBLISHED'
          ? existingPost.publishedAt
          : null
    }

    const post = await prisma.post.update({
      where: { id: params.id },
      data: updateData,
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

    // Atualizar índice de busca
    try {
      await searchService.indexContent('post', post.id, {
        title: post.title,
        content: post.content,
        summary: post.excerpt || undefined,
        tags: [],
        categories: post.topic ? [post.topic.id] : [],
        metadata: { slug: post.slug, tier: post.tier },
        popularity: post.viewCount || 0
      })
    } catch (e) {
      console.error('Falha ao indexar post (admin update):', e)
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Erro ao atualizar post:', error)
    
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

// DELETE /api/admin/community/posts/[id] - Deletar post
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Verificar se o post existe
    const existingPost = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            comments: true,
            reactions: true,
            reports: true
          }
        }
      }
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post não encontrado' },
        { status: 404 }
      )
    }

    // Deletar em cascata: reactions, reports, attachments e comments
    await prisma.$transaction(async (tx) => {
      // Deletar reações dos comentários
      await tx.reaction.deleteMany({
        where: {
          comment: {
            postId: params.id
          }
        }
      })

      // Deletar reports dos comentários
      await tx.report.deleteMany({
        where: {
          comment: {
            postId: params.id
          }
        }
      })

      // Deletar comentários
      await tx.comment.deleteMany({
        where: { postId: params.id }
      })

      // Deletar reações do post
      await tx.reaction.deleteMany({
        where: { postId: params.id }
      })

      // Deletar reports do post
      await tx.report.deleteMany({
        where: { postId: params.id }
      })

      // Deletar anexos
      await tx.attachment.deleteMany({
        where: { postId: params.id }
      })

      // Deletar o post
      await tx.post.delete({
        where: { id: params.id }
      })
    })
    
    // Remover do índice de busca
    try {
      await searchService.removeFromIndex('post', params.id)
    } catch (e) {
      console.error('Falha ao remover do índice (admin delete):', e)
    }

    return NextResponse.json(
      { message: 'Post deletado com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao deletar post:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
