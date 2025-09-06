import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventType, EventStatus } from '@prisma/client'

// Schema para filtrar instâncias
const instanceFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  // isException removido pois não há campo persistido
  limit: z.number().positive().max(100).default(50),
  offset: z.number().min(0).default(0)
})

// Schema para criar exceção
const createExceptionSchema = z.object({
  originalInstanceId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  type: z.nativeEnum(EventType).optional(),
  location: z.string().optional(),
  virtualLink: z.string().url().optional(),
  maxAttendees: z.number().positive().optional(),
  isPublic: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  action: z.enum(['modify', 'cancel']).default('modify')
})

// GET /api/events/recurring/[seriesId]/instances - Listar instâncias da série
export async function GET(
  request: NextRequest,
  { params }: { params: { seriesId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { seriesId } = params
    const { searchParams } = new URL(request.url)
    
    const filters = instanceFiltersSchema.parse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      status: searchParams.get('status'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    })

    if (!seriesId) {
      return NextResponse.json(
        { error: 'ID da série é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a série existe e se o usuário tem permissão
    const recurringSeries = await prisma.recurringEvent.findUnique({
      where: { id: seriesId },
      include: {
        parentEvent: {
          select: {
            createdBy: true,
            isPublic: true,
            status: true
          }
        }
      }
    })

    if (!recurringSeries) {
      return NextResponse.json(
        { error: 'Série recorrente não encontrada' },
        { status: 404 }
      )
    }

    // Permissão: criador ou evento pai público
    const isOwner = recurringSeries.parentEvent.createdBy === session.user.id
    const canView = isOwner || recurringSeries.parentEvent.isPublic

    if (!canView) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar esta série' },
        { status: 403 }
      )
    }

    // Ainda não há instâncias persistidas; resposta provisória
    const total = 0
    const instances: any[] = []

    const stats = {
      total,
      upcoming: 0,
      past: 0,
      exceptions: 0,
      cancelled: 0
    }

    return NextResponse.json({
      instances,
      stats,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: false
      }
    })
  } catch (error) {
    console.error('Erro ao buscar instâncias:', error)
    
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

// POST /api/events/recurring/[seriesId]/instances - Criar exceção ou modificar instância
export async function POST(
  request: NextRequest,
  { params }: { params: { seriesId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { seriesId } = params
    const body = await request.json()
    // Valida mas ainda não aplica, pois a funcionalidade será reimplementada
    createExceptionSchema.parse(body)

    if (!seriesId) {
      return NextResponse.json(
        { error: 'ID da série é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar série para checar permissão
    const recurringSeries = await prisma.recurringEvent.findUnique({
      where: { id: seriesId },
      include: { parentEvent: true }
    })

    if (!recurringSeries) {
      return NextResponse.json(
        { error: 'Série recorrente não encontrada' },
        { status: 404 }
      )
    }

    if (recurringSeries.parentEvent.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para modificar esta série' },
        { status: 403 }
      )
    }

    // Funcionalidade de exceções será reimplementada sem instâncias persistidas
    return NextResponse.json(
      { error: 'Operação não suportada neste momento' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Erro ao criar exceção:', error)
    
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