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
      status: EventStatus.PUBLISHED,
      OR: [
        {
          startDate: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          recurringEvents: {
            some: {
              isActive: true
            }
          }
        }
      ]
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
        recurringEvents: true,
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
    const dayMs = 24 * 60 * 60 * 1000
    const weekMs = 7 * dayMs

    const getStartIndex = (freq: string, baseStart: Date, interval: number) => {
      const diffMs = startDate.getTime() - baseStart.getTime()
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
            (startDate.getFullYear() - baseStart.getFullYear()) * 12 +
            (startDate.getMonth() - baseStart.getMonth())
          return Math.floor(months / interval)
        }
        case 'YEARLY': {
          const years = startDate.getFullYear() - baseStart.getFullYear()
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

    const expandRecurring = (event: typeof events[number]) => {
      const occurrences: typeof events[number][] = []
      const baseStart = new Date(event.startDate)
      const baseEnd = new Date(event.endDate)

      if (baseStart >= startDate && baseStart <= endDate) {
        occurrences.push(event)
      }

      if (!event.recurringEvents || event.recurringEvents.length === 0) {
        return occurrences
      }

      for (const recurring of event.recurringEvents) {
        const rule = recurring.recurrenceRule as any
        const freq = rule?.freq
        if (!freq) continue

        const interval = Number(rule.interval || 1)
        const count = rule.count ? Number(rule.count) : null
        const until = rule.until ? new Date(rule.until) : null
        const startIndex = Math.max(1, getStartIndex(freq, baseStart, interval))
        const maxIndex = count ?? Number.POSITIVE_INFINITY

        for (let i = startIndex; i <= maxIndex; i++) {
          let occStart = new Date(baseStart)
          let occEnd = new Date(baseEnd)
          switch (freq) {
            case 'DAILY':
              occStart = new Date(baseStart.getTime() + i * interval * dayMs)
              occEnd = new Date(baseEnd.getTime() + i * interval * dayMs)
              break
            case 'WEEKLY':
              occStart = new Date(baseStart.getTime() + i * interval * weekMs)
              occEnd = new Date(baseEnd.getTime() + i * interval * weekMs)
              break
            case 'MONTHLY':
              occStart = new Date(baseStart)
              occStart.setMonth(occStart.getMonth() + i * interval)
              occEnd = new Date(baseEnd)
              occEnd.setMonth(occEnd.getMonth() + i * interval)
              break
            case 'YEARLY':
              occStart = new Date(baseStart)
              occStart.setFullYear(occStart.getFullYear() + i * interval)
              occEnd = new Date(baseEnd)
              occEnd.setFullYear(occEnd.getFullYear() + i * interval)
              break
            case 'LUNAR': {
              const lunarDays = 29.53
              const offset = Math.round(i * interval * lunarDays * dayMs)
              occStart = new Date(baseStart.getTime() + offset)
              occEnd = new Date(baseEnd.getTime() + offset)
              break
            }
            default:
              continue
          }

          if (until && occStart > until) break
          if (occStart > endDate) break
          if (occStart < startDate) continue

          occurrences.push({
            ...event,
            id: `${event.id}-r${i}`,
            startDate: occStart,
            endDate: occEnd
          })
        }
      }

      return occurrences
    }

    const expandedEvents = events.flatMap(expandRecurring).sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    })

    const calendarEvents = expandedEvents.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      status: event.status,
      start: new Date(event.startDate).toISOString(),
      end: new Date(event.endDate).toISOString(),
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
                   new Date(event.startDate) > new Date() && 
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
