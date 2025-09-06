import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventType, EventStatus } from '@prisma/client'

// Schema de validação para atualização de eventos
const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(EventType).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  virtualLink: z.string().url().optional(),
  maxAttendees: z.number().positive().optional(),
  isPublic: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/events/[id] - Obter evento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        reminders: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            registrations: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem permissão para ver o evento
    const session = await getServerSession(authOptions)
    
    if (!event.isPublic && (!session?.user?.id || session.user.id !== event.createdBy)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Erro ao buscar evento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/events/[id] - Atualizar evento
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o evento existe e se o usuário é o criador
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      select: { id: true, createdBy: true, startDate: true }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    if (existingEvent.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Apenas o criador pode editar o evento' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateEventSchema.parse(body)

    // Validar datas se fornecidas
    if (validatedData.startDate || validatedData.endDate) {
      const startDate = validatedData.startDate ? new Date(validatedData.startDate) : existingEvent.startDate
      const endDate = validatedData.endDate ? new Date(validatedData.endDate) : new Date(existingEvent.startDate)

      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'Data de início deve ser anterior à data de fim' },
          { status: 400 }
        )
      }
    }

    // Atualizar evento
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...validatedData,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
        updatedAt: new Date()
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        _count: {
          select: {
            registrations: true
          }
        }
      }
    })

    return NextResponse.json(updatedEvent)
  } catch (error) {
    console.error('Erro ao atualizar evento:', error)
    
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

// DELETE /api/events/[id] - Excluir evento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = params
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o evento existe e se o usuário é o criador
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      select: { 
        id: true, 
        createdBy: true, 
        startDate: true,
        _count: {
          select: {
            registrations: true
          }
        }
      }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    if (existingEvent.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Apenas o criador pode excluir o evento' },
        { status: 403 }
      )
    }

    // Verificar se o evento já começou
    if (existingEvent.startDate < new Date()) {
      return NextResponse.json(
        { error: 'Não é possível excluir eventos que já começaram' },
        { status: 400 }
      )
    }

    // Verificar se há inscrições
    if (existingEvent._count.registrations > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir eventos com inscrições. Cancele o evento em vez disso.' },
        { status: 400 }
      )
    }

    // Excluir evento e dados relacionados
    await prisma.$transaction(async (tx) => {
      // Excluir lembretes
      await tx.eventReminder.deleteMany({
        where: { eventId: id }
      })

      // Excluir evento recorrente se existir
      await tx.recurringEvent.deleteMany({
        where: { parentEventId: id }
      })

      // Excluir evento
      await tx.event.delete({
        where: { id }
      })
    })

    return NextResponse.json(
      { message: 'Evento excluído com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao excluir evento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}