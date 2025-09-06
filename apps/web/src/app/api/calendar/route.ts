import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { EventType, EventStatus, EventRegistrationStatus } from '@prisma/client'

// Schema de validação para parâmetros do calendário
const calendarParamsSchema = z.object({
  view: z.enum(['month', 'week', 'day', 'agenda']).default('month'),
  date: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  types: z.array(z.nativeEnum(EventType)).optional(),
  myEvents: z.boolean().default(false),
  myRegistrations: z.boolean().default(false)
})

// Função para calcular datas baseadas na visualização
function calculateDateRange(view: string, date?: string) {
  const baseDate = date ? new Date(date) : new Date()
  let startDate: Date
  let endDate: Date

  switch (view) {
    case 'day':
      startDate = new Date(baseDate)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(baseDate)
      endDate.setHours(23, 59, 59, 999)
      break

    case 'week':
      const dayOfWeek = baseDate.getDay()
      startDate = new Date(baseDate)
      startDate.setDate(baseDate.getDate() - dayOfWeek)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
      break

    case 'month':
    default:
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999)
      break

    case 'agenda':
      startDate = new Date(baseDate)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(baseDate)
      endDate.setDate(baseDate.getDate() + 30) // Próximos 30 dias
      endDate.setHours(23, 59, 59, 999)
      break
  }

  return { startDate, endDate }
}

// GET /api/calendar - Obter eventos para visualização de calendário
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
    
    const parsedParams = calendarParamsSchema.parse({
      ...params,
      types: params.types ? params.types.split(',') : undefined,
      myEvents: params.myEvents === 'true',
      myRegistrations: params.myRegistrations === 'true'
    })

    const { view, date, startDate: customStartDate, endDate: customEndDate, types, myEvents, myRegistrations } = parsedParams

    // Calcular intervalo de datas
    let startDate: Date
    let endDate: Date

    if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate)
      endDate = new Date(customEndDate)
    } else {
      const dateRange = calculateDateRange(view, date)
      startDate = dateRange.startDate
      endDate = dateRange.endDate
    }

    // Construir filtros
    const where: any = {
      startDate: {
        gte: startDate,
        lte: endDate
      },
      status: EventStatus.PUBLISHED
    }

    // Filtrar por tipos se especificado
    if (types && types.length > 0) {
      where.type = { in: types }
    }

    // Filtrar por eventos do usuário ou inscrições
    if (myEvents && myRegistrations) {
      where.OR = [
        { createdBy: session.user.id },
        {
          registrations: {
            some: {
              userId: session.user.id,
              status: { in: [EventRegistrationStatus.CONFIRMED, EventRegistrationStatus.REGISTERED] }
            }
          }
        }
      ]
    } else if (myEvents) {
      where.createdBy = session.user.id
    } else if (myRegistrations) {
      where.registrations = {
        some: {
          userId: session.user.id,
          status: { in: [EventRegistrationStatus.CONFIRMED, EventRegistrationStatus.REGISTERED] }
        }
      }
    } else {
      // Mostrar apenas eventos públicos ou do usuário
      where.OR = [
        { isPublic: true },
        { createdBy: session.user.id },
        {
          registrations: {
            some: {
              userId: session.user.id,
              status: { in: [EventRegistrationStatus.CONFIRMED, EventRegistrationStatus.REGISTERED] }
            }
          }
        }
      ]
    }

    // Buscar eventos
    const events = await prisma.event.findMany({
      where,
      include: {
        registrations: {
          where: {
            userId: session.user.id
          },
          select: {
            id: true,
            status: true,
            registeredAt: true
          }
        },
        _count: {
          select: {
            registrations: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: { startDate: 'asc' }
    })

    // Transformar eventos para formato de calendário
    const calendarEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      status: event.status,
      start: event.startDate.toISOString(),
      end: event.endDate.toISOString(),
      allDay: false,
      location: event.location,
      virtualLink: event.virtualLink,
      isPublic: event.isPublic,
      maxAttendees: event.maxAttendees,
      attendeeCount: event._count.registrations,
      tags: event.tags,
      creator: event.creator,
      isCreator: event.createdBy === session.user.id,
      userRegistration: event.registrations[0] || null,
      canRegister: !event.registrations[0] && 
                   event.startDate > new Date() && 
                   (!event.maxAttendees || event._count.registrations < event.maxAttendees),
      backgroundColor: getEventColor(event.type),
      borderColor: getEventColor(event.type, true)
    }))

    return NextResponse.json({
      events: calendarEvents,
      view,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      filters: {
        types,
        myEvents,
        myRegistrations
      }
    })
  } catch (error) {
    console.error('Erro ao buscar eventos do calendário:', error)
    
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

// Função auxiliar para definir cores dos eventos
function getEventColor(type: EventType, border = false): string {
  const colors = {
    [EventType.WEBINAR]: border ? '#3B82F6' : '#DBEAFE',
    [EventType.WORKSHOP]: border ? '#10B981' : '#D1FAE5',
    [EventType.COURSE]: border ? '#8B5CF6' : '#EDE9FE',
    [EventType.MEETING]: border ? '#F59E0B' : '#FEF3C7',
    [EventType.COMMUNITY]: border ? '#EF4444' : '#FEE2E2',
    [EventType.CONFERENCE]: border ? '#06B6D4' : '#CFFAFE',
    [EventType.NETWORKING]: border ? '#EC4899' : '#FCE7F3',
    [EventType.TRAINING]: border ? '#84CC16' : '#ECFCCB'
  }

  return colors[type] || (border ? '#6B7280' : '#F3F4F6')
}