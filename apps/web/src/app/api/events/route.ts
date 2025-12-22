import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventType, EventStatus, EventAccessType, EventMode, SubscriptionTier, Role } from '@prisma/client'
import { notificationService } from '@/lib/notifications/notification-service'

// Schema de validação para criação de eventos
const createEventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().optional(),
  type: z.nativeEnum(EventType),
  status: z.nativeEnum(EventStatus).default(EventStatus.PUBLISHED),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  timezone: z.string().default('America/Sao_Paulo'),
  location: z.string().optional(),
  virtualLink: z.string().url().optional(),
  maxAttendees: z.number().positive().optional(),
  isPublic: z.boolean().default(true),
  requiresApproval: z.boolean().default(false),
  accessType: z.nativeEnum(EventAccessType).default(EventAccessType.FREE),
  price: z.number().nonnegative().optional(),
  freeTiers: z.array(z.nativeEnum(SubscriptionTier)).optional(),
  mode: z.nativeEnum(EventMode).default(EventMode.ONLINE),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  recurrence: z.object({
    freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'LUNAR']),
    interval: z.number().positive().default(1),
    byweekday: z.array(z.number().min(0).max(6)).optional(),
    bymonthday: z.array(z.number().min(1).max(31)).optional(),
    bymonth: z.array(z.number().min(1).max(12)).optional(),
    count: z.number().positive().optional(),
    until: z.string().datetime().optional(),
    lunarPhase: z.enum(['FULL', 'NEW']).optional()
  }).optional()
})

async function notifyEventPublication(event: { id: string; title: string; slug?: string }) {
  try {
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

// Schema de validação para filtros
const filtersSchema = z.object({
  type: z.array(z.nativeEnum(EventType)).optional(),
  status: z.array(z.nativeEnum(EventStatus)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
  isPublic: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20)
})

// GET /api/events - Listar eventos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    // Parse dos parâmetros de query
    const parsedParams = filtersSchema.parse({
      ...params,
      type: params.type ? params.type.split(',') : undefined,
      status: params.status ? params.status.split(',') : undefined,
      tags: params.tags ? params.tags.split(',') : undefined
    })

    const {
      type,
      status,
      startDate,
      endDate,
      tags,
      createdBy,
      isPublic,
      search,
      page,
      limit
    } = parsedParams

    // Construir filtros do Prisma
    const where: any = {}

    if (type && type.length > 0) {
      where.type = { in: type }
    }

    if (status && status.length > 0) {
      where.status = { in: status }
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate) }
    }

    if (endDate) {
      where.endDate = { lte: new Date(endDate) }
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags }
    }

    if (createdBy) {
      where.createdBy = createdBy
    }

    if (typeof isPublic === 'boolean') {
      where.isPublic = isPublic
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ]
    }

    // Calcular offset
    const offset = (page - 1) * limit

    // Buscar eventos
    const sessionUserId = session?.user?.id
    const includeRegistrations = sessionUserId
      ? {
          registrations: {
            where: { userId: sessionUserId },
            select: { id: true, status: true, registeredAt: true }
          }
        }
      : {}

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          recurringEvents: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          ...includeRegistrations,
          _count: {
            select: {
              registrations: true
            }
          }
        },
        orderBy: { startDate: 'asc' },
        skip: offset,
        take: limit
      }),
      prisma.event.count({ where })
    ])

    // Expandir recorrência (gera instâncias futuras leves)
    const now = new Date()
    const windowStart = startDate ? new Date(startDate) : now
    const windowEnd = endDate ? new Date(endDate) : new Date(now.getTime())
    if (!endDate) {
      windowEnd.setMonth(windowEnd.getMonth() + 6)
    }

    const dayMs = 24 * 60 * 60 * 1000
    const weekMs = 7 * dayMs

    const getStartIndex = (freq: string, baseStart: Date, interval: number) => {
      const diffMs = windowStart.getTime() - baseStart.getTime()
      if (diffMs <= 0) return 1

      switch (freq) {
        case 'DAILY': {
          const days = Math.floor(diffMs / dayMs)
          return Math.floor(days / interval)
        }
        case 'WEEKLY': {
          const weeks = Math.floor(diffMs / weekMs)
          return Math.floor(weeks / interval)
        }
        case 'MONTHLY': {
          const months =
            (windowStart.getFullYear() - baseStart.getFullYear()) * 12 +
            (windowStart.getMonth() - baseStart.getMonth())
          return Math.floor(months / interval)
        }
        case 'YEARLY': {
          const years = windowStart.getFullYear() - baseStart.getFullYear()
          return Math.floor(years / interval)
        }
        case 'LUNAR': {
          const lunarDays = 29.53
          const cycles = Math.floor(diffMs / (lunarDays * dayMs))
          return Math.floor(cycles / interval)
        }
        default:
          return 1
      }
    }

    const expandRecurring = (event: any) => {
      if (!event.recurringEvents || event.recurringEvents.length === 0) return [event]
      const occurrences: any[] = [event]

      for (const recurring of event.recurringEvents) {
        const rule = recurring.recurrenceRule as any
        const freq = rule?.freq
        if (!freq) continue

        const baseStart = new Date(event.startDate)
        const baseEnd = new Date(event.endDate)
        const interval = Number(rule.interval || 1)
        const count = rule.count ? Number(rule.count) : null
        const until = rule.until ? new Date(rule.until) : null
        const startIndex = Math.max(1, getStartIndex(freq, baseStart, interval))
        const maxIndex = count ?? Number.POSITIVE_INFINITY

        const addOccurrence = (index: number, start: Date, end: Date) => {
          if (until && start > until) return
          if (start > windowEnd) return
          if (start < windowStart) return
          occurrences.push({
            ...event,
            id: `${event.id}-r${index}`,
            startDate: start,
            endDate: end
          })
        }

        for (let i = startIndex; i <= maxIndex; i++) {
          let start = new Date(baseStart)
          let end = new Date(baseEnd)
          switch (freq) {
            case 'DAILY':
              start = new Date(baseStart.getTime() + i * interval * dayMs)
              end = new Date(baseEnd.getTime() + i * interval * dayMs)
              break
            case 'WEEKLY':
              start = new Date(baseStart.getTime() + i * interval * weekMs)
              end = new Date(baseEnd.getTime() + i * interval * weekMs)
              break
            case 'MONTHLY': {
              start = new Date(baseStart)
              start.setMonth(start.getMonth() + i * interval)
              end = new Date(baseEnd)
              end.setMonth(end.getMonth() + i * interval)
              break
            }
            case 'YEARLY': {
              start = new Date(baseStart)
              start.setFullYear(start.getFullYear() + i * interval)
              end = new Date(baseEnd)
              end.setFullYear(end.getFullYear() + i * interval)
              break
            }
            case 'LUNAR': {
              const lunarDays = 29.53
              const offset = Math.round(i * interval * lunarDays * dayMs)
              start = new Date(baseStart.getTime() + offset)
              start.setHours(
                baseStart.getHours(),
                baseStart.getMinutes(),
                baseStart.getSeconds(),
                baseStart.getMilliseconds()
              )
              end = new Date(baseEnd.getTime() + offset)
              end.setHours(
                baseEnd.getHours(),
                baseEnd.getMinutes(),
                baseEnd.getSeconds(),
                baseEnd.getMilliseconds()
              )
              break
            }
            default:
              continue
          }
          if (until && start > until) break
          if (start > windowEnd) break
          addOccurrence(i, start, end)
        }
      }

      return occurrences
    }

    const expandedEvents = events.flatMap(expandRecurring).sort((a: any, b: any) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    })

    // Calcular paginação (mantém total base)
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return NextResponse.json({
      events: expandedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    })
  } catch (error) {
    console.error('Erro ao buscar eventos:', error)
    
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

// POST /api/events - Criar evento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createEventSchema.parse(body)

    // Validar datas
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Data de início deve ser anterior à data de fim' },
        { status: 400 }
      )
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { error: 'Data de início deve ser no futuro' },
        { status: 400 }
      )
    }

    // Validar acesso e preço
    if (validatedData.accessType === EventAccessType.PAID && (!validatedData.price || validatedData.price <= 0)) {
      return NextResponse.json(
        { error: 'Defina um preço para eventos pagos' },
        { status: 400 }
      )
    }

    if (validatedData.accessType === EventAccessType.TIER && (!validatedData.freeTiers || validatedData.freeTiers.length === 0)) {
      return NextResponse.json(
        { error: 'Selecione ao menos um tier que terá acesso gratuito' },
        { status: 400 }
      )
    }

    if (validatedData.mode === EventMode.IN_PERSON && !validatedData.location) {
      return NextResponse.json(
        { error: 'Informe o local para eventos presenciais' },
        { status: 400 }
      )
    }

    if (validatedData.mode === EventMode.ONLINE && !validatedData.virtualLink) {
      return NextResponse.json(
        { error: 'Informe o link para eventos online' },
        { status: 400 }
      )
    }

    if (validatedData.recurrence?.freq === 'LUNAR' && !validatedData.recurrence.lunarPhase) {
      validatedData.recurrence.lunarPhase = 'FULL'
    }

    // Criar evento
    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        status: validatedData.status || EventStatus.PUBLISHED,
        startDate,
        endDate,
        timezone: validatedData.timezone,
        location: validatedData.location,
        virtualLink: validatedData.virtualLink,
        maxAttendees: validatedData.maxAttendees,
        isPublic: validatedData.isPublic,
        requiresApproval: validatedData.requiresApproval,
        accessType: validatedData.accessType,
        price: validatedData.price ?? null,
        freeTiers: validatedData.freeTiers ?? [],
        mode: validatedData.mode,
        tags: validatedData.tags,
        metadata: validatedData.metadata,
        createdBy: session.user.id
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

    // Criar evento recorrente se especificado
    if (validatedData.recurrence) {
      await prisma.recurringEvent.create({
        data: {
          parentEventId: event.id,
          recurrenceRule: validatedData.recurrence,
          exceptions: [],
          endDate: validatedData.recurrence.until ? new Date(validatedData.recurrence.until) : undefined,
          maxOccurrences: validatedData.recurrence.count,
          isActive: true
        }
      })
    }

    if (event.status === EventStatus.PUBLISHED) {
      await notifyEventPublication({ id: event.id, title: event.title, slug: (event as any).slug })
    }

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar evento:', error)
    
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
