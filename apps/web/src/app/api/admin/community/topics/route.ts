import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { 
  CreateTopicSchema, 
  UpdateTopicSchema, 
  CommunityFiltersSchema 
} from '@/lib/validations/community'
import { z } from 'zod'

// GET /api/admin/community/topics - Listar tópicos
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
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc'
    })

    const skip = (filters.page - 1) * filters.limit
    
    const where = {
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } }
        ]
      })
    }

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        skip,
        take: filters.limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        include: {
          _count: {
            select: {
              posts: true
            }
          }
        }
      }),
      prisma.topic.count({ where })
    ])

    return NextResponse.json({
      topics,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        pages: Math.ceil(total / filters.limit)
      }
    })
  } catch (error) {
    console.error('Erro ao buscar tópicos:', error)
    
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

// POST /api/admin/community/topics - Criar tópico
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
    const data = CreateTopicSchema.parse(body)

    // Verificar se já existe um tópico com o mesmo slug
    const existingTopic = await prisma.topic.findUnique({
      where: { slug: data.slug }
    })

    if (existingTopic) {
      return NextResponse.json(
        { error: 'Já existe um tópico com este slug' },
        { status: 409 }
      )
    }

    const topic = await prisma.topic.create({
      data,
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      }
    })

    return NextResponse.json(topic, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar tópico:', error)
    
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