import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventRegistrationStatus, ReminderType, ReminderStatus } from '@prisma/client'
import { GamificationEngine } from '@/lib/gamification-engine'
import notificationService from '@/lib/notifications/notification-service'

// Schema de validação para registro
const registerSchema = z.object({
  metadata: z.record(z.any()).optional(),
  recurrenceInstanceStart: z.string().datetime().optional(),
  recurrenceInstanceId: z.string().optional()
})

const PAID_EVENT_ENROLL_POINTS = 40
const FREE_EVENT_ENROLL_POINTS = 10

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
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        mode: true,
        location: true,
        virtualLink: true,
        maxAttendees: true,
        requiresApproval: true,
        accessType: true,
        freeTiers: true,
        price: true,
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

    const body = await request.json().catch(() => ({}))
    const validatedData = registerSchema.parse(body)

    const occurrenceStartDate = validatedData.recurrenceInstanceStart
      ? new Date(validatedData.recurrenceInstanceStart)
      : event.startDate

    // Verificar se o evento já passou
    if (occurrenceStartDate < new Date()) {
      return NextResponse.json(
        { error: 'Não é possível se inscrever em eventos que já começaram' },
        { status: 400 }
      )
    }

    const hasTierAccess = Array.isArray(event.freeTiers) && event.freeTiers.length > 0

    // Verificar acesso pago ou por tier
    if (event.accessType === 'PAID') {
      if (hasTierAccess) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { subscriptionTier: true }
        })

        if (user && event.freeTiers.includes(user.subscriptionTier)) {
          // Plano inclui acesso, permite inscrição direta
        } else {
          const checkoutUrl = `/checkout?eventId=${eventId}`
          return NextResponse.json(
            { error: 'Evento pago - finalize a inscrição pelo checkout', checkoutUrl },
            { status: 402 }
          )
        }
      } else {
        const checkoutUrl = `/checkout?eventId=${eventId}`
        return NextResponse.json(
          { error: 'Evento pago - finalize a inscrição pelo checkout', checkoutUrl },
          { status: 402 }
        )
      }
    }

    if (event.accessType === 'TIER') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { subscriptionTier: true }
      })

      if (!user || !event.freeTiers.includes(user.subscriptionTier)) {
        return NextResponse.json(
          { error: 'Seu plano não inclui acesso a este evento' },
          { status: 403 }
        )
      }
    }

    const recurrenceInstanceIdForRegistration = validatedData.recurrenceInstanceId || eventId

    // Verificar se já está inscrito na ocorrência
    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId: session.user.id,
        recurrenceInstanceId: recurrenceInstanceIdForRegistration,
        status: { in: [EventRegistrationStatus.CONFIRMED, EventRegistrationStatus.REGISTERED] }
      }
    })

    if (existingRegistration) {
      return NextResponse.json(
        { error: 'Você já está inscrito neste evento' },
        { status: 400 }
      )
    }

    // Verificar limite de participantes (por ocorrência)
    if (event.maxAttendees) {
      const occurrenceCount = await prisma.eventRegistration.count({
        where: {
          eventId,
          recurrenceInstanceId: recurrenceInstanceIdForRegistration,
          status: { in: [EventRegistrationStatus.CONFIRMED, EventRegistrationStatus.REGISTERED] }
        }
      })
      if (occurrenceCount >= event.maxAttendees) {
        return NextResponse.json(
          { error: 'Evento lotado' },
          { status: 400 }
        )
      }
    }

    // Determinar status inicial
    const initialStatus = event.requiresApproval 
      ? EventRegistrationStatus.REGISTERED 
      : EventRegistrationStatus.CONFIRMED

    // Criar registro
    const recurrenceMetadata = {
      ...(validatedData.metadata || {}),
      ...(validatedData.recurrenceInstanceStart
        ? { recurrenceInstanceStart: validatedData.recurrenceInstanceStart }
        : {}),
      ...(validatedData.recurrenceInstanceId
        ? { recurrenceInstanceId: validatedData.recurrenceInstanceId }
        : {})
    }

    const canceledRegistration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId: session.user.id,
        recurrenceInstanceId: recurrenceInstanceIdForRegistration,
        status: EventRegistrationStatus.CANCELED
      }
    })

    const registration = canceledRegistration
      ? await prisma.eventRegistration.update({
          where: { id: canceledRegistration.id },
          data: {
            status: initialStatus,
            metadata: Object.keys(recurrenceMetadata).length > 0 ? recurrenceMetadata : undefined,
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
      : await prisma.eventRegistration.create({
          data: {
            eventId,
            recurrenceInstanceId: recurrenceInstanceIdForRegistration,
            userId: session.user.id,
            status: initialStatus,
            metadata: Object.keys(recurrenceMetadata).length > 0 ? recurrenceMetadata : undefined,
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

    // Pontuação por inscrição
    try {
      const isPaidEvent = event.accessType === 'PAID'
      const pointsToAward = isPaidEvent ? PAID_EVENT_ENROLL_POINTS : 0

      const existingTx = await prisma.pointTransaction.findFirst({
        where: {
          userId: session.user.id,
          metadata: {
            path: ['eventId'],
            equals: eventId
          }
        }
      })

      if (!existingTx && pointsToAward > 0) {
        const reasonLabel = 'Inscrição em evento pago'
        const uniqueKey = `event_enrolled_${session.user.id}_${eventId}`

        await GamificationEngine.awardPoints(session.user.id, pointsToAward, 'EVENT_ENROLLED', {
          eventId,
          eventTitle: event.title,
          paid: isPaidEvent,
          reasonLabel,
          uniqueKey
        })

        const userPoints = await prisma.userPoints.findUnique({
          where: { userId: session.user.id },
          select: { totalPoints: true }
        })

        await notificationService.createNotification({
          userId: session.user.id,
          type: 'SPECIAL_EVENT' as any,
          title: 'Pontos ganhos no evento',
          message: `Você ganhou ${pointsToAward} pontos ao se inscrever em ${event.title}.`,
          data: {
            points: pointsToAward,
            eventId,
            eventTitle: event.title,
            paid: isPaidEvent,
            totalPoints: userPoints?.totalPoints ?? undefined
          },
          priority: 'MEDIUM'
        })
      }
    } catch (e) {
      console.error('Gamificação ao inscrever em evento falhou:', e)
    }

    // Criar lembretes automáticos baseados no modo do evento
    const reminderConfigs = []

    if (event.mode === 'ONLINE' || event.mode === 'HYBRID') {
      reminderConfigs.push({
        minutesBefore: 60,
        message: `Lembrete: O evento "${event.title}" começa em 1 hora. Link: ${event.virtualLink}.`,
        includeLink: true
      })
    }

    if (event.mode === 'IN_PERSON' || event.mode === 'HYBRID') {
      reminderConfigs.push({
        minutesBefore: 24 * 60,
        message: `Lembrete: O evento "${event.title}" acontece em 24 horas. Endereço: ${event.location}.`,
        includeLocation: true
      })
    }

    const now = new Date()
    for (const config of reminderConfigs) {
      const reminderTime = new Date(occurrenceStartDate.getTime() - config.minutesBefore * 60 * 1000)
      if (occurrenceStartDate <= now) {
        continue
      }
      const triggerTime = reminderTime <= now ? now : reminderTime

      await prisma.eventReminder.create({
        data: {
          eventId,
          userId: session.user.id,
          type: ReminderType.EMAIL,
          triggerTime,
          status: ReminderStatus.PENDING,
          metadata: {
            message: config.message,
            eventVirtualLink: config.includeLink ? event.virtualLink : undefined,
            eventLocation: config.includeLocation ? event.location : undefined,
            recurrenceInstanceId: validatedData.recurrenceInstanceId || eventId,
            eventStartDate: occurrenceStartDate.toISOString()
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

    const { searchParams } = new URL(request.url)
    const recurrenceInstanceId = searchParams.get('recurrenceInstanceId') || eventId

    // Verificar se a inscrição existe
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId: session.user.id,
        recurrenceInstanceId
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
    const registrationOccurrenceStart = (registration.metadata as any)?.recurrenceInstanceStart
      ? new Date((registration.metadata as any).recurrenceInstanceStart)
      : registration.event.startDate
    const cancelDeadline = new Date(registrationOccurrenceStart.getTime() - 2 * 60 * 60 * 1000)
    
    if (new Date() > cancelDeadline) {
      return NextResponse.json(
        { error: 'Não é possível cancelar a inscrição. O prazo limite foi ultrapassado.' },
        { status: 400 }
      )
    }

    // Cancelar inscrição e remover lembretes
    await prisma.$transaction(async (tx) => {
      // Atualizar status da inscrição
      await tx.eventRegistration.updateMany({
        where: {
          eventId,
          userId: session.user.id,
          recurrenceInstanceId
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
