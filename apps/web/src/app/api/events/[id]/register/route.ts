import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventRegistrationStatus } from '@hekate/shared'
import { ReminderType, ReminderStatus } from '@prisma/client'

// Schema de validação para registro
const registerSchema = z.object({
  metadata: z.record(z.any()).optional()
})

// POST /api/events/[id]/register - Registrar-se em um evento
export async function POST(
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

    const { id: eventId } = params
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o evento existe e está disponível
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            registrations: {
              where: {
                status: {
                  in: [EventRegistrationStatus.CONFIRMED, EventRegistrationStatus.REGISTERED]
                }
              }
            }
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

    // Verificar se o evento está aberto para inscrições
    if (event.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Evento não está disponível para inscrições' },
        { status: 400 }
      )
    }

    // Verificar se o evento já passou
    if (event.startDate < new Date()) {
      return NextResponse.json(
        { error: 'Não é possível se inscrever em eventos que já começaram' },
        { status: 400 }
      )
    }

    // Verificar se já está inscrito
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id
        }
      }
    })

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'Você já está inscrito neste evento' },
        { status: 400 }
      )
    }

    // Verificar limite de participantes
    if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
      return NextResponse.json(
        { error: 'Evento lotado' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const validatedData = registerSchema.parse(body)

    // Determinar status inicial
    const initialStatus = event.requiresApproval 
      ? EventRegistrationStatus.REGISTERED 
      : EventRegistrationStatus.CONFIRMED

    // Criar registro
    const registration = await prisma.eventRegistration.create({
      data: {
        eventId,
        userId: session.user.id,
        status: initialStatus,
        metadata: validatedData.metadata,
        registeredAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            location: true,
            virtualLink: true
          }
        }
      }
    })

    // Criar lembrete automático (24h antes do evento)
    const reminderTime = new Date(event.startDate.getTime() - 24 * 60 * 60 * 1000)
    
    if (reminderTime > new Date()) {
      await prisma.eventReminder.create({
        data: {
          eventId,
          userId: session.user.id,
          type: ReminderType.EMAIL,
          triggerTime: reminderTime,
          status: ReminderStatus.PENDING,
          metadata: {
            message: `Lembrete: O evento "${event.title}" começará em 24 horas.`
          }
        }
      })
    }

    return NextResponse.json(registration, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar no evento:', error)
    
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

// DELETE /api/events/[id]/register - Cancelar inscrição
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

    const { id: eventId } = params
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a inscrição existe
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: session.user.id
        }
      },
      include: {
        event: {
          select: {
            startDate: true,
            title: true
          }
        }
      }
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Inscrição não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se ainda é possível cancelar (até 2 horas antes do evento)
    const cancelDeadline = new Date(registration.event.startDate.getTime() - 2 * 60 * 60 * 1000)
    
    if (new Date() > cancelDeadline) {
      return NextResponse.json(
        { error: 'Não é possível cancelar a inscrição. O prazo limite foi ultrapassado.' },
        { status: 400 }
      )
    }

    // Cancelar inscrição e remover lembretes
    await prisma.$transaction(async (tx) => {
      // Atualizar status da inscrição
      await tx.eventRegistration.update({
        where: {
          eventId_userId: {
            eventId,
            userId: session.user.id
          }
        },
        data: {
          status: EventRegistrationStatus.CANCELED
        }
      })

      // Remover lembretes pendentes
      await tx.eventReminder.deleteMany({
        where: {
          eventId,
          userId: session.user.id,
          status: ReminderStatus.PENDING
        }
      })
    })

    return NextResponse.json(
      { message: 'Inscrição cancelada com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao cancelar inscrição:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}