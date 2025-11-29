import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventType, EventStatus, EventAccessType, EventMode, SubscriptionTier } from '@prisma/client'

// Schema para criar série recorrente
const createRecurringSeriesSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().optional(),
  type: z.nativeEnum(EventType),
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
  })
})

// Schema para filtros de séries recorrentes
const filtersSchema = z.object({
  type: z.array(z.nativeEnum(EventType)).optional(),
  status: z.array(z.nativeEnum(EventStatus)).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
  isPublic: z.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20)
})

// GET /api/events/recurring - Listar séries recorrentes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
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

    // Construir filtros para o evento pai
    const eventWhere: any = {}

    if (type && type.length > 0) {
      eventWhere.type = { in: type }
    }

    if (status && status.length > 0) {
      eventWhere.status = { in: status }
    }

    if (startDate) {
      eventWhere.startDate = { gte: new Date(startDate) }
    }

    if (endDate) {
      eventWhere.endDate = { lte: new Date(endDate) }
    }

    if (tags && tags.length > 0) {
      eventWhere.tags = { hasSome: tags }
    }

    if (createdBy) {
      eventWhere.createdBy = createdBy
    } else {
      // Mostrar apenas eventos do usuário logado
      eventWhere.createdBy = session.user.id
    }

    if (typeof isPublic === 'boolean') {
      eventWhere.isPublic = isPublic
    }

    if (search) {
      eventWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } }
      ]
    }

    const offset = (page - 1) * limit

    // Buscar séries recorrentes
    const [recurringSeries, total] = await Promise.all([
      prisma.recurringEvent.findMany({
        where: {
          isActive: true,
          parentEvent: eventWhere
        },
        include: {
          parentEvent: {
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
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.recurringEvent.count({
        where: {
          isActive: true,
          parentEvent: eventWhere
        }
      })
    ])

    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return NextResponse.json({
      series: recurringSeries,
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
    console.error('Erro ao buscar séries recorrentes:', error)
    
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

// POST /api/events/recurring - Criar série recorrente
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
    const validatedData = createRecurringSeriesSchema.parse(body)

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

    if (validatedData.accessType === EventAccessType.PAID && (!validatedData.price || validatedData.price <= 0)) {
      return NextResponse.json(
        { error: 'Defina um preço para eventos pagos' },
        { status: 400 }
      )
    }

    if (validatedData.accessType === EventAccessType.TIER && (!validatedData.freeTiers || validatedData.freeTiers.length === 0)) {
      return NextResponse.json(
        { error: 'Selecione ao menos um tier com acesso incluído' },
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

    if (validatedData.recurrence.freq === 'LUNAR' && !validatedData.recurrence.lunarPhase) {
      validatedData.recurrence.lunarPhase = 'FULL'
    }

    // Usar transação para criar evento pai e série recorrente
    const result = await prisma.$transaction(async (tx) => {
      // Criar evento pai (template)
      const parentEvent = await tx.event.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          type: validatedData.type,
          status: EventStatus.PUBLISHED,
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
        }
      })

      // Criar série recorrente
      const recurringSeries = await tx.recurringEvent.create({
        data: {
          parentEventId: parentEvent.id,
          recurrenceRule: validatedData.recurrence as any,
          exceptions: [],
          endDate: validatedData.recurrence.until ? new Date(validatedData.recurrence.until) : undefined,
          maxOccurrences: validatedData.recurrence.count,
          isActive: true
        }
      })

      return { parentEvent, recurringSeries }
    })

    return NextResponse.json({
      message: 'Série recorrente criada com sucesso',
      parentEvent: result.parentEvent,
      recurringSeries: result.recurringSeries
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar série recorrente:', error)
    
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
