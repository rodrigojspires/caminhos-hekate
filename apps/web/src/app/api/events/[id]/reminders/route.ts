import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { ReminderType, ReminderStatus } from '@prisma/client'

 // Schema para criar lembrete
 const createReminderSchema = z.object({
   type: z.nativeEnum(ReminderType),
   triggerTime: z.string().datetime(),
  metadata: z.object({
     // Para lembretes por email
     emailSubject: z.string().optional(),
     emailTemplate: z.string().optional(),
    
    // Para lembretes push
    pushTitle: z.string().optional(),
    pushBody: z.string().optional(),
    pushIcon: z.string().optional(),
    pushActions: z.array(z.object({
      action: z.string(),
      title: z.string(),
      icon: z.string().optional()
    })).optional(),
    
    // Para lembretes SMS
    smsTemplate: z.string().optional(),
    
    // Para lembretes inteligentes
    locationBased: z.object({
      enabled: z.boolean(),
      latitude: z.number(),
      longitude: z.number(),
      radius: z.number().positive(), // em metros
      triggerOnEnter: z.boolean().default(true),
      triggerOnExit: z.boolean().default(false)
    }).optional(),
    
    contextBased: z.object({
      enabled: z.boolean(),
      weatherCondition: z.enum(['any', 'sunny', 'rainy', 'cloudy', 'snowy']).optional(),
      trafficCondition: z.enum(['any', 'light', 'moderate', 'heavy']).optional(),
      timeOfDay: z.enum(['any', 'morning', 'afternoon', 'evening', 'night']).optional()
    }).optional(),
    
    // Configurações de repetição
    recurrence: z.object({
      interval: z.number().positive(), // em minutos
      maxOccurrences: z.number().positive().optional(),
      stopOnResponse: z.boolean().default(true)
    }).optional()
  }).optional()
})

// Schema para atualizar lembrete
const updateReminderSchema = createReminderSchema.partial().extend({
  status: z.nativeEnum(ReminderStatus).optional()
})

// Schema para filtros
const reminderFiltersSchema = z.object({
  type: z.nativeEnum(ReminderType).optional(),
  status: z.nativeEnum(ReminderStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().positive().max(100).default(50),
  offset: z.number().min(0).default(0)
})

// GET /api/events/[id]/reminders - Listar lembretes do evento
export async function GET(
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
    const { searchParams } = new URL(request.url)
    
    const filters = reminderFiltersSchema.parse({
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    })

    // Verificar se o evento existe e se o usuário tem permissão
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        createdBy: true,
        isPublic: true,
        registrations: {
          where: { userId: session.user.id },
          select: { id: true }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão (criador, registrado ou evento público)
    const hasPermission = event.createdBy === session.user.id || 
                         event.registrations.length > 0 || 
                         event.isPublic

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar lembretes deste evento' },
        { status: 403 }
      )
    }

    // Construir filtros de busca
    const whereClause: any = {
      eventId,
      userId: session.user.id // Usuário só vê seus próprios lembretes
    }

    if (filters.type) {
      whereClause.type = filters.type
    }

    if (filters.status) {
      whereClause.status = filters.status
    }

    if (filters.startDate) {
      whereClause.triggerTime = { gte: new Date(filters.startDate) }
    }

    if (filters.endDate) {
      whereClause.triggerTime = {
        ...whereClause.triggerTime,
        lte: new Date(filters.endDate)
      }
    }

    // Buscar lembretes
    const [reminders, total] = await Promise.all([
      prisma.eventReminder.findMany({
        where: whereClause,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { triggerTime: 'asc' },
        skip: filters.offset,
        take: filters.limit
      }),
      prisma.eventReminder.count({ where: whereClause })
    ])

    // Calcular estatísticas
    const stats = {
      total,
      pending: reminders.filter(r => r.status === ReminderStatus.PENDING).length,
      sent: reminders.filter(r => r.status === ReminderStatus.SENT).length,
      failed: reminders.filter(r => r.status === ReminderStatus.FAILED).length,
      cancelled: reminders.filter(r => r.status === ReminderStatus.CANCELED).length,
      byType: {
        email: reminders.filter(r => r.type === ReminderType.EMAIL).length,
        push: reminders.filter(r => r.type === ReminderType.PUSH).length,
        sms: reminders.filter(r => r.type === ReminderType.SMS).length
      }
    }

    return NextResponse.json({
      reminders,
      stats,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < total
      }
    })
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error)
    
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

// POST /api/events/[id]/reminders - Criar lembrete
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
    const body = await request.json()
    const validatedData = createReminderSchema.parse(body)

    // Verificar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        createdBy: true,
        isPublic: true,
        registrations: {
          where: { userId: session.user.id },
          select: { id: true }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Evento não encontrado' },
        { status: 404 }
      )
    }

    // Verificar permissão (criador, registrado ou evento público)
    const hasPermission = event.createdBy === session.user.id || 
                         event.registrations.length > 0 || 
                         event.isPublic

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para criar lembretes para este evento' },
        { status: 403 }
      )
    }

    // Verificar se a data do lembrete é válida
    const triggerTime = new Date(validatedData.triggerTime)
    const eventStart = new Date(event.startDate)

    if (triggerTime >= eventStart) {
      return NextResponse.json(
        { error: 'Lembrete deve ser agendado antes do início do evento' },
        { status: 400 }
      )
    }

    // Verificar limite de lembretes por usuário/evento
    const existingReminders = await prisma.eventReminder.count({
      where: {
        eventId,
        userId: session.user.id,
        status: { not: ReminderStatus.CANCELED }
      }
    })

    if (existingReminders >= 10) {
      return NextResponse.json(
        { error: 'Limite máximo de 10 lembretes por evento atingido' },
        { status: 400 }
      )
    }

    // Criar lembrete
    const reminder = await prisma.eventReminder.create({
      data: {
        eventId,
        userId: session.user.id,
        type: validatedData.type,
        triggerTime,
        status: ReminderStatus.PENDING,
        metadata: validatedData.metadata as any
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Lembrete criado com sucesso',
      reminder
    })
  } catch (error) {
    console.error('Erro ao criar lembrete:', error)
    
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