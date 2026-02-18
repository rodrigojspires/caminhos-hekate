import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma, EventType, EventStatus, EventAccessType, EventMode, SubscriptionTier, Role, EventRegistrationStatus } from '@hekate/database'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { notificationService } from '@/lib/notifications/notification-service'

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
  recordingLink: z.string().url().optional(),
  maxAttendees: z.number().positive().optional(),
  isPublic: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  accessType: z.nativeEnum(EventAccessType).optional(),
  price: z.number().nonnegative().optional(),
  freeTiers: z.array(z.nativeEnum(SubscriptionTier)).optional(),
  mode: z.nativeEnum(EventMode).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  recurrenceInstanceId: z.string().optional(),
  recurrenceInstanceStart: z.string().datetime().optional(),
  recurrenceInstanceEnd: z.string().datetime().optional()
})

async function notifyEventPublication(event: { id: string; title: string; slug?: string; isPublic: boolean }) {
  try {
    if (!event.isPublic) return
    const recipients = await prisma.user.findMany({
      where: { role: Role.MEMBER },
      select: { id: true }
    })

    if (!recipients.length) return

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''
    const normalizedBase = baseUrl ? baseUrl.replace(/\/$/, '') : ''
    const eventUrl = event.slug
      ? `${normalizedBase}/eventos/${event.slug}`
      : `${normalizedBase}/eventos/${event.id}`

    const title = `Novo evento disponível: ${event.title}`
    const message = `O evento "${event.title}" foi publicado. Confira os detalhes.`

    await Promise.all(
      recipients.map(({ id: userId }) =>
        notificationService.createNotification({
          userId,
          type: 'SYSTEM_ANNOUNCEMENT' as any,
          title,
          message,
          data: {
            actionUrl: eventUrl,
            actionLabel: 'Ver evento',
            eventId: event.id
          },
          priority: 'MEDIUM',
          isPush: false
        })
      )
    )
  } catch (error) {
    console.error('Erro ao enviar broadcast de evento:', error)
  }
}

async function notifyRecordingLinkAvailable(params: {
  eventId: string
  eventTitle: string
  recordingLink: string
  recurrenceInstanceId: string
  recurrenceInstanceStart?: string
  recurrenceInstanceEnd?: string
}) {
  try {
    const {
      eventId,
      eventTitle,
      recordingLink,
      recurrenceInstanceId,
      recurrenceInstanceStart,
      recurrenceInstanceEnd
    } = params
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        eventId,
        recurrenceInstanceId,
        status: { in: [EventRegistrationStatus.CONFIRMED, EventRegistrationStatus.REGISTERED] },
        userId: { not: null }
      },
      select: { userId: true }
    })

    const userIds = Array.from(new Set(registrations.map((reg) => reg.userId).filter(Boolean))) as string[]
    if (!userIds.length) return

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''
    const normalizedBase = baseUrl ? baseUrl.replace(/\/$/, '') : ''
    const paramsUrl = new URLSearchParams({ occurrenceId: recurrenceInstanceId })
    if (recurrenceInstanceStart) {
      paramsUrl.set('occurrenceStart', recurrenceInstanceStart)
    }
    if (recurrenceInstanceEnd) {
      paramsUrl.set('occurrenceEnd', recurrenceInstanceEnd)
    }
    const eventUrl = normalizedBase
      ? `${normalizedBase}/eventos/${eventId}?${paramsUrl.toString()}`
      : `/eventos/${eventId}?${paramsUrl.toString()}`

    const title = `Gravação disponível: ${eventTitle}`
    const message = `A gravação do evento "${eventTitle}" já está disponível.`

    await Promise.all(
      userIds.map((userId) =>
        notificationService.createNotification({
          userId,
          type: 'EVENT_UPDATED' as any,
          title,
          message,
          data: {
            eventId,
            eventTitle,
            recordingLink,
            occurrenceId: recurrenceInstanceId,
            actionUrl: eventUrl,
            actionLabel: 'Ver gravação'
          },
          priority: 'MEDIUM',
          isPush: false
        })
      )
    )
  } catch (error) {
    console.error('Erro ao notificar gravação disponível:', error)
  }
}

// GET /api/events/[id] - Obter evento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const accessTokenParam = searchParams.get('access')

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
        recurringEvents: {
          select: {
            id: true,
            recurrenceRule: true,
            endDate: true,
            maxOccurrences: true,
            isActive: true
          }
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
      const tokenMatches = accessTokenParam && (event.metadata as any)?.accessToken === accessTokenParam
      const isRegistered = !!session?.user?.id && event.registrations?.some(
        (registration) =>
          registration.userId === session.user.id &&
          (registration.status === 'CONFIRMED' || registration.status === 'REGISTERED')
      )
      if (!tokenMatches && !isRegistered) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }
    }

    if (!event.isPublic && event.accessType === EventAccessType.TIER) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }

      const isPrivileged = session.user.role === Role.ADMIN || session.user.role === Role.EDITOR
      if (!isPrivileged && session.user.id !== event.createdBy) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { subscriptionTier: true }
        })

        if (!user || !event.freeTiers.includes(user.subscriptionTier)) {
          return NextResponse.json(
            { error: 'Acesso negado' },
            { status: 403 }
          )
        }
      }
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
      select: {
        id: true,
        createdBy: true,
        status: true,
        startDate: true,
        endDate: true,
        location: true,
        virtualLink: true,
        recordingLink: true,
        accessType: true,
        freeTiers: true,
        mode: true,
        price: true,
        isPublic: true,
        metadata: true
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
        { error: 'Apenas o criador pode editar o evento' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = updateEventSchema.parse(body)

    // Validar datas se fornecidas
    if (validatedData.startDate || validatedData.endDate) {
      const startDate = validatedData.startDate ? new Date(validatedData.startDate) : existingEvent.startDate
      const endDate = validatedData.endDate ? new Date(validatedData.endDate) : existingEvent.endDate

      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'Data de início deve ser anterior à data de fim' },
          { status: 400 }
        )
      }
    }

    const modeToUse = validatedData.mode ?? existingEvent.mode
    const locationToUse = validatedData.location ?? existingEvent.location
    const virtualLinkToUse = validatedData.virtualLink ?? existingEvent.virtualLink
    const accessTypeToUse = validatedData.accessType ?? existingEvent.accessType
    const priceToUse = validatedData.price ?? existingEvent.price
    const freeTiersToUse = validatedData.freeTiers ?? existingEvent.freeTiers

    if (accessTypeToUse === EventAccessType.PAID && Number(priceToUse || 0) <= 0) {
      return NextResponse.json(
        { error: 'Defina um preço para eventos pagos' },
        { status: 400 }
      )
    }

    if (accessTypeToUse === EventAccessType.TIER && (!freeTiersToUse || freeTiersToUse.length === 0)) {
      return NextResponse.json(
        { error: 'Selecione ao menos um tier que terá acesso gratuito' },
        { status: 400 }
      )
    }

    if (modeToUse === EventMode.IN_PERSON && !locationToUse) {
      return NextResponse.json(
        { error: 'Informe o local para eventos presenciais' },
        { status: 400 }
      )
    }

    if (modeToUse === EventMode.ONLINE && !virtualLinkToUse) {
      return NextResponse.json(
        { error: 'Informe o link para eventos online' },
        { status: 400 }
      )
    }

    if (modeToUse === EventMode.IN_PERSON && validatedData.recordingLink) {
      return NextResponse.json(
        { error: 'Gravação só está disponível para eventos online ou híbridos' },
        { status: 400 }
      )
    }

    // Atualizar evento
    const {
      recordingLink,
      recurrenceInstanceId,
      recurrenceInstanceStart,
      recurrenceInstanceEnd,
      ...eventData
    } = validatedData
    const baseMetadata: Record<string, any> = eventData.metadata && typeof eventData.metadata === 'object'
      ? (eventData.metadata as Record<string, any>)
      : ((existingEvent.metadata as Record<string, any> | null) || {})
    const existingMetadata: Record<string, any> = existingEvent.metadata && typeof existingEvent.metadata === 'object'
      ? (existingEvent.metadata as Record<string, any>)
      : {}

    let metadata = baseMetadata
    let shouldNotifyRecording = false
    const notifyOccurrenceId = recurrenceInstanceId || id
    const recordingLinkForEvent = (!recurrenceInstanceId || recurrenceInstanceId === id) ? recordingLink : undefined

    if (recordingLink && recurrenceInstanceId && recurrenceInstanceId !== id) {
      const existingRecordingLinks = (existingMetadata as any).recordingLinks
      const baseRecordingLinks = (baseMetadata as any).recordingLinks
      const mergedRecordingLinks = {
        ...(existingRecordingLinks && typeof existingRecordingLinks === 'object' ? existingRecordingLinks : {}),
        ...(baseRecordingLinks && typeof baseRecordingLinks === 'object' ? baseRecordingLinks : {})
      }
      const previousLink = mergedRecordingLinks[recurrenceInstanceId]
      if (previousLink !== recordingLink) {
        mergedRecordingLinks[recurrenceInstanceId] = recordingLink
        metadata = { ...(baseMetadata as any), recordingLinks: mergedRecordingLinks }
        shouldNotifyRecording = !previousLink
      }
    }

    if (recordingLinkForEvent && existingEvent.recordingLink !== recordingLinkForEvent) {
      shouldNotifyRecording = shouldNotifyRecording || !existingEvent.recordingLink
    }

    metadata = (eventData.isPublic ?? existingEvent.isPublic)
      ? metadata
      : {
          ...metadata,
          accessToken: (metadata as any).accessToken || randomUUID()
        }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...eventData,
        recordingLink: recordingLinkForEvent,
        startDate: eventData.startDate ? new Date(eventData.startDate) : undefined,
        endDate: eventData.endDate ? new Date(eventData.endDate) : undefined,
        price: eventData.price,
        freeTiers: eventData.freeTiers,
        metadata,
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

    if (updatedEvent.status === EventStatus.PUBLISHED && existingEvent.status !== EventStatus.PUBLISHED) {
      await notifyEventPublication({
        id: updatedEvent.id,
        title: updatedEvent.title,
        slug: (updatedEvent as any).slug,
        isPublic: updatedEvent.isPublic
      })
    }

    if (recordingLink && shouldNotifyRecording) {
      await notifyRecordingLinkAvailable({
        eventId: updatedEvent.id,
        eventTitle: updatedEvent.title,
        recordingLink,
        recurrenceInstanceId: notifyOccurrenceId,
        recurrenceInstanceStart,
        recurrenceInstanceEnd
      })
    }

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
