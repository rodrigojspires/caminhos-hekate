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

    // Gerar instâncias baseadas na configuração de recorrência
    const now = new Date()
    const startDate = filters.startDate ? new Date(filters.startDate) : now
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 ano
    
    const instances = await generateRecurringInstances(
      recurringSeries,
      startDate,
      endDate,
      filters.limit,
      filters.offset
    )
    
    // Filtrar por status se especificado
    const filteredInstances = filters.status 
      ? instances.filter(instance => instance.status === filters.status)
      : instances
    
    // Calcular estatísticas
    const total = filteredInstances.length
    const upcoming = filteredInstances.filter(i => new Date(i.startDate) > now).length
    const past = filteredInstances.filter(i => new Date(i.endDate) < now).length
    
    // Buscar exceções para estatísticas (campo exceptions do RecurringEvent)
    const exceptions = (recurringSeries.exceptions || []).length
    const cancelled = exceptions
    
    const stats = {
      total,
      upcoming,
      past,
      exceptions,
      cancelled
    }

    return NextResponse.json({
      instances: filteredInstances.slice(filters.offset, filters.offset + filters.limit),
      stats,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < total
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

// Função auxiliar para gerar instâncias recorrentes
async function generateRecurringInstances(
  recurringSeries: any,
  startDate: Date,
  endDate: Date,
  limit: number,
  offset: number
) {
  const instances: Array<{
    id: string
    title: string
    description: string | null
    startDate: string
    endDate: string
    type: any
    location: string | null
    virtualLink: string | null
    status: EventStatus
    isException: boolean
    recurringEventId: string
  }> = []

  const parentEvent = recurringSeries.parentEvent
  const pattern = recurringSeries.pattern

  // Datas canceladas (exceções) armazenadas no RecurringEvent
  const exceptionDates = new Set(
    (recurringSeries.exceptions || []).map((d: Date | string) =>
      new Date(d).toISOString().split('T')[0]
    )
  )

  let currentDate = new Date(parentEvent.startDate)
  const eventDuration =
    new Date(parentEvent.endDate).getTime() - new Date(parentEvent.startDate).getTime()

  const now = new Date()

  while (currentDate <= endDate && instances.length < limit + offset) {
    if (currentDate >= startDate) {
      const instanceStartDate = new Date(currentDate)
      const instanceEndDate = new Date(currentDate.getTime() + eventDuration)
      const dateKey = instanceStartDate.toISOString().split('T')[0]

      // Pula se a data está marcada como exceção (cancelada ou substituída)
      if (!exceptionDates.has(dateKey)) {
        instances.push({
          id: `${recurringSeries.id}-${dateKey}`,
          title: parentEvent.title,
          description: parentEvent.description ?? null,
          startDate: instanceStartDate.toISOString(),
          endDate: instanceEndDate.toISOString(),
          type: parentEvent.type,
          location: parentEvent.location ?? null,
          virtualLink: parentEvent.virtualLink ?? null,
          status: instanceEndDate < now ? EventStatus.COMPLETED : EventStatus.PUBLISHED,
          isException: false,
          recurringEventId: recurringSeries.id
        })
      }
    }

    // Avançar para próxima ocorrência baseado no padrão
    switch (pattern.frequency) {
      case 'DAILY':
        currentDate.setDate(currentDate.getDate() + (pattern.interval || 1))
        break
      case 'WEEKLY':
        currentDate.setDate(currentDate.getDate() + 7 * (pattern.interval || 1))
        break
      case 'MONTHLY':
        currentDate.setMonth(currentDate.getMonth() + (pattern.interval || 1))
        break
      case 'YEARLY':
        currentDate.setFullYear(currentDate.getFullYear() + (pattern.interval || 1))
        break
      default:
        // Se não há padrão válido, parar
        break
    }

    // Verificar término por data
    if (pattern.endDate && currentDate > new Date(pattern.endDate)) {
      break
    }

    // Verificar término por número de ocorrências
    if (pattern.occurrences && instances.length >= pattern.occurrences) {
      break
    }
  }

  return instances
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
    createExceptionSchema.parse(body)

    if (!seriesId) {
      return NextResponse.json(
        { error: 'ID da série é obrigatório' },
        { status: 400 }
      )
    }

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

    const { action, ...exceptionData } = body

    if (action === 'cancel') {
      const updated = await prisma.recurringEvent.update({
        where: { id: seriesId },
        data: {
          exceptions: {
            push: new Date(exceptionData.startDate)
          }
        }
      })

      return NextResponse.json({
        success: true,
        action: 'cancelled',
        exceptionDate: new Date(exceptionData.startDate).toISOString(),
        exceptionsCount: updated.exceptions.length
      })
    }

    // Criar evento modificado
    const modifiedEvent = await prisma.event.create({
      data: {
        title: exceptionData.title || recurringSeries.parentEvent.title,
        description: exceptionData.description || recurringSeries.parentEvent.description,
        startDate: new Date(exceptionData.startDate),
        endDate: new Date(exceptionData.endDate),
        type: exceptionData.type || recurringSeries.parentEvent.type,
        location: exceptionData.location || recurringSeries.parentEvent.location,
        virtualLink: exceptionData.virtualLink || recurringSeries.parentEvent.virtualLink,
        maxAttendees: exceptionData.maxAttendees ?? recurringSeries.parentEvent.maxAttendees ?? null,
        isPublic: exceptionData.isPublic ?? recurringSeries.parentEvent.isPublic,
        requiresApproval: exceptionData.requiresApproval ?? recurringSeries.parentEvent.requiresApproval,
        tags: exceptionData.tags || recurringSeries.parentEvent.tags,
        metadata: exceptionData.metadata || recurringSeries.parentEvent.metadata,
        createdBy: session.user.id,
        status: EventStatus.PUBLISHED
      }
    })

    // Marcar a data como exceção na série
    await prisma.recurringEvent.update({
      where: { id: seriesId },
      data: {
        exceptions: {
          push: new Date(exceptionData.startDate)
        }
      }
    })

    return NextResponse.json({
      success: true,
      action: 'modified',
      modifiedEvent: {
        id: modifiedEvent.id,
        title: modifiedEvent.title,
        startDate: modifiedEvent.startDate.toISOString(),
        endDate: modifiedEvent.endDate.toISOString()
      }
    })
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