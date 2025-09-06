import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventType, EventStatus } from '@prisma/client'

// Schema de validação para criação de eventos
const createEventSchema = z.object({
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
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  recurrence: z.object({
    freq: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    interval: z.number().positive().default(1),
    byweekday: z.array(z.number().min(0).max(6)).optional(),
    bymonthday: z.array(z.number().min(1).max(31)).optional(),
    bymonth: z.array(z.number().min(1).max(12)).optional(),
    count: z.number().positive().optional(),
    until: z.string().datetime().optional()
  }).optional()
})

// Schema de validação para filtros
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

// GET /api/events - Listar eventos
export async function GET(request: NextRequest) {
  try {
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
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
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
        },
        orderBy: { startDate: 'asc' },
        skip: offset,
        take: limit
      }),
      prisma.event.count({ where })
    ])

    // Calcular paginação
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    return NextResponse.json({
      events,
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

    // Criar evento
    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        status: EventStatus.DRAFT,
        startDate,
        endDate,
        timezone: validatedData.timezone,
        location: validatedData.location,
        virtualLink: validatedData.virtualLink,
        maxAttendees: validatedData.maxAttendees,
        isPublic: validatedData.isPublic,
        requiresApproval: validatedData.requiresApproval,
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