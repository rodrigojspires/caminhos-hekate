import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventType } from '@prisma/client'

// Schema para atualizar série recorrente
const updateRecurringSeriesSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(EventType).optional(),
  location: z.string().optional(),
  virtualLink: z.string().url().optional(),
  maxAttendees: z.number().positive().optional(),
  isPublic: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  recurrence: z.object({
    freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    interval: z.number().positive().default(1),
    byweekday: z.array(z.number().min(0).max(6)).optional(),
    bymonthday: z.array(z.number().min(1).max(31)).optional(),
    bymonth: z.array(z.number().min(1).max(12)).optional(),
    count: z.number().positive().optional(),
    until: z.string().datetime().optional()
  }).optional(),
  updateFutureEvents: z.boolean().default(false)
})

// GET /api/events/recurring/[seriesId] - Obter detalhes da série recorrente
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

    if (!seriesId) {
      return NextResponse.json(
        { error: 'ID da série é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar série recorrente com evento pai
    const recurringSeries = await prisma.recurringEvent.findUnique({
      where: { id: seriesId },
      include: {
        parentEvent: {
          include: {
            creator: {
              select: { id: true, name: true, email: true, image: true }
            }
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

    // Verificar permissão
    if (recurringSeries.parentEvent.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar esta série' },
        { status: 403 }
      )
    }

    // Estatísticas básicas derivadas
    const stats = {
      isActive: recurringSeries.isActive,
      exceptionsCount: recurringSeries.exceptions.length
    }

    return NextResponse.json({
      ...recurringSeries,
      stats
    })
  } catch (error) {
    console.error('Erro ao buscar série recorrente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/events/recurring/[seriesId] - Atualizar série recorrente
export async function PUT(
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
    const validatedData = updateRecurringSeriesSchema.parse(body)

    if (!seriesId) {
      return NextResponse.json(
        { error: 'ID da série é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar série existente
    const existingSeries = await prisma.recurringEvent.findUnique({
      where: { id: seriesId },
      include: { parentEvent: true }
    })

    if (!existingSeries) {
      return NextResponse.json(
        { error: 'Série recorrente não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão
    if (existingSeries.parentEvent.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para editar esta série' },
        { status: 403 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Atualizar evento pai
      const updatedParentEvent = await tx.event.update({
        where: { id: existingSeries.parentEventId },
        data: {
          title: validatedData.title,
          description: validatedData.description,
          type: validatedData.type,
          location: validatedData.location,
          virtualLink: validatedData.virtualLink,
          maxAttendees: validatedData.maxAttendees,
          isPublic: validatedData.isPublic,
          requiresApproval: validatedData.requiresApproval,
          tags: validatedData.tags,
          metadata: validatedData.metadata
        }
      })

      // Atualizar série recorrente se a recorrência foi modificada
      let updatedSeries = existingSeries
      if (validatedData.recurrence) {
        updatedSeries = await tx.recurringEvent.update({
          where: { id: seriesId },
          data: {
            recurrenceRule: validatedData.recurrence as any,
            endDate: validatedData.recurrence.until ? new Date(validatedData.recurrence.until) : undefined,
            maxOccurrences: validatedData.recurrence.count
          },
          include: { parentEvent: true }
        })
      }

      return { updatedParentEvent, updatedSeries }
    })

    return NextResponse.json({
      message: 'Série recorrente atualizada com sucesso',
      parentEvent: result.updatedParentEvent,
      recurringSeries: result.updatedSeries
    })
  } catch (error) {
    console.error('Erro ao atualizar série recorrente:', error)
    
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

// DELETE /api/events/recurring/[seriesId] - Deletar série recorrente
export async function DELETE(
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
    const deleteFutureOnly = searchParams.get('futureOnly') === 'true'

    if (!seriesId) {
      return NextResponse.json(
        { error: 'ID da série é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar série existente
    const existingSeries = await prisma.recurringEvent.findUnique({
      where: { id: seriesId },
      include: { parentEvent: true }
    })

    if (!existingSeries) {
      return NextResponse.json(
        { error: 'Série recorrente não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão
    if (existingSeries.parentEvent.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para deletar esta série' },
        { status: 403 }
      )
    }

    await prisma.$transaction(async (tx) => {
      if (deleteFutureOnly) {
        // Marcar série como inativa
        await tx.recurringEvent.update({
          where: { id: seriesId },
          data: { isActive: false }
        })
      } else {
        // Deletar série recorrente (mantém o evento pai)
        await tx.recurringEvent.delete({ where: { id: seriesId } })
      }
    })

    return NextResponse.json({
      message: deleteFutureOnly 
        ? 'Série marcada como inativa com sucesso'
        : 'Série recorrente deletada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar série recorrente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}