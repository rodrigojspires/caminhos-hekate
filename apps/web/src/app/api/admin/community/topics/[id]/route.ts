import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { UpdateTopicSchema } from '@/lib/validations/community'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/admin/community/topics/[id] - Buscar tópico por ID
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

    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        community: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            posts: true
          }
        },
        posts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!topic) {
      return NextResponse.json(
        { error: 'Tópico não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(topic)
  } catch (error) {
    console.error('Erro ao buscar tópico:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/community/topics/[id] - Atualizar tópico
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
    const data = UpdateTopicSchema.parse(body)

    // Verificar se o tópico existe
    const existingTopic = await prisma.topic.findUnique({
      where: { id: params.id }
    })

    if (!existingTopic) {
      return NextResponse.json(
        { error: 'Tópico não encontrado' },
        { status: 404 }
      )
    }

    // Se está atualizando o slug, verificar se não existe outro com o mesmo slug
    if (data.slug && data.slug !== existingTopic.slug) {
      const topicWithSlug = await prisma.topic.findUnique({
        where: { slug: data.slug }
      })

      if (topicWithSlug) {
        return NextResponse.json(
          { error: 'Já existe um tópico com este slug' },
          { status: 409 }
        )
      }
    }

    const topic = await prisma.topic.update({
      where: { id: params.id },
      data,
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      }
    })

    return NextResponse.json(topic)
  } catch (error) {
    console.error('Erro ao atualizar tópico:', error)
    
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

// DELETE /api/admin/community/topics/[id] - Deletar tópico
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

    // Verificar se o tópico existe
    const existingTopic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      }
    })

    if (!existingTopic) {
      return NextResponse.json(
        { error: 'Tópico não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se há posts associados
    if (existingTopic._count.posts > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível deletar um tópico que possui posts associados',
          details: `Este tópico possui ${existingTopic._count.posts} post(s) associado(s)`
        },
        { status: 409 }
      )
    }

    await prisma.topic.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      { message: 'Tópico deletado com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao deletar tópico:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
