import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'
import { ReminderType, ReminderStatus } from '@prisma/client'

// Schema para atualizar lembrete
const updateReminderSchema = z.object({
  type: z.nativeEnum(ReminderType).optional(),
  triggerTime: z.string().datetime().optional(),
  status: z.nativeEnum(ReminderStatus).optional(),
  isRecurring: z.boolean().optional(),
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
      radius: z.number().positive(),
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
      interval: z.number().positive(),
      maxOccurrences: z.number().positive().optional(),
      stopOnResponse: z.boolean().default(true)
    }).optional(),
    
    // Dados de execução
    executionHistory: z.array(z.object({
      timestamp: z.string().datetime(),
      status: z.enum(['sent', 'failed', 'delivered', 'read']),
      error: z.string().optional(),
      metadata: z.record(z.any()).optional()
    })).optional()
  }).optional()
})

// GET /api/events/[id]/reminders/[reminderId] - Obter lembrete específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; reminderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: eventId, reminderId } = params

    if (!eventId || !reminderId) {
      return NextResponse.json(
        { error: 'ID do evento e do lembrete são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar lembrete
    const reminder = await prisma.eventReminder.findUnique({
      where: { id: reminderId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            createdBy: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    if (!reminder) {
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se pertence ao evento correto
    if (reminder.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Lembrete não pertence a este evento' },
        { status: 400 }
      )
    }

    // Verificar permissão (apenas o dono do lembrete ou criador do evento)
    if (reminder.userId !== session.user.id && reminder.event.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar este lembrete' },
        { status: 403 }
      )
    }

    // Calcular estatísticas de execução
    const executionHistory = (reminder.metadata as any)?.executionHistory || []
    const stats = {
      totalExecutions: executionHistory.length,
      successfulExecutions: executionHistory.filter((h: any) => h.status === 'sent' || h.status === 'delivered').length,
      failedExecutions: executionHistory.filter((h: any) => h.status === 'failed').length,
      lastExecution: executionHistory.length > 0 ? executionHistory[executionHistory.length - 1] : null,
      nextExecution: reminder.status === ReminderStatus.PENDING ? reminder.triggerTime : null
    }

    return NextResponse.json({
      ...reminder,
      stats
    })
  } catch (error) {
    console.error('Erro ao buscar lembrete:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/events/[id]/reminders/[reminderId] - Atualizar lembrete
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; reminderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: eventId, reminderId } = params
    const body = await request.json()
    const validatedData = updateReminderSchema.parse(body)

    if (!eventId || !reminderId) {
      return NextResponse.json(
        { error: 'ID do evento e do lembrete são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar lembrete existente
    const existingReminder = await prisma.eventReminder.findUnique({
      where: { id: reminderId },
      include: {
        event: {
          select: {
            id: true,
            startDate: true,
            createdBy: true
          }
        }
      }
    })

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se pertence ao evento correto
    if (existingReminder.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Lembrete não pertence a este evento' },
        { status: 400 }
      )
    }

    // Verificar permissão (apenas o dono do lembrete)
    if (existingReminder.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para editar este lembrete' },
        { status: 403 }
      )
    }

    // Verificar se pode ser editado (não pode editar lembretes já enviados)
    if (existingReminder.status === ReminderStatus.SENT && 
        (validatedData.triggerTime || validatedData.type)) {
      return NextResponse.json(
        { error: 'Não é possível editar lembretes já enviados' },
        { status: 400 }
      )
    }

    // Validar nova data se fornecida
    if (validatedData.triggerTime) {
      const newTriggerTime = new Date(validatedData.triggerTime)
      const eventStart = new Date(existingReminder.event.startDate)

      if (newTriggerTime >= eventStart) {
        return NextResponse.json(
          { error: 'Lembrete deve ser agendado antes do início do evento' },
          { status: 400 }
        )
      }
    }

    // Preparar dados para atualização
    const updateData: any = {}

    if (validatedData.type !== undefined) updateData.type = validatedData.type
    if (validatedData.triggerTime !== undefined) updateData.triggerTime = new Date(validatedData.triggerTime)
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.isRecurring !== undefined) updateData.isRecurring = validatedData.isRecurring

    if (validatedData.metadata !== undefined) {
      updateData.metadata = Object.assign(
        {},
        existingReminder.metadata || {},
        validatedData.metadata
      )
    }

    // Atualizar lembrete
    const updatedReminder = await prisma.eventReminder.update({
      where: { id: reminderId },
      data: updateData,
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
      message: 'Lembrete atualizado com sucesso',
      reminder: updatedReminder
    })
  } catch (error) {
    console.error('Erro ao atualizar lembrete:', error)
    
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

// DELETE /api/events/[id]/reminders/[reminderId] - Deletar lembrete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; reminderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: eventId, reminderId } = params

    if (!eventId || !reminderId) {
      return NextResponse.json(
        { error: 'ID do evento e do lembrete são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar lembrete existente
    const existingReminder = await prisma.eventReminder.findUnique({
      where: { id: reminderId },
      select: {
        id: true,
        eventId: true,
        userId: true,
        status: true
      }
    })

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se pertence ao evento correto
    if (existingReminder.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Lembrete não pertence a este evento' },
        { status: 400 }
      )
    }

    // Verificar permissão (apenas o dono do lembrete)
    if (existingReminder.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para deletar este lembrete' },
        { status: 403 }
      )
    }

    // Deletar lembrete
    await prisma.eventReminder.delete({
      where: { id: reminderId }
    })

    return NextResponse.json({
      message: 'Lembrete deletado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar lembrete:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/events/[id]/reminders/[reminderId] - Marcar status do lembrete
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; reminderId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: eventId, reminderId } = params
    const body = await request.json()
    
    const { status, executionData } = z.object({
      status: z.nativeEnum(ReminderStatus),
      executionData: z.object({
        timestamp: z.string().datetime().optional(),
        error: z.string().optional(),
        metadata: z.record(z.any()).optional()
      }).optional()
    }).parse(body)

    if (!eventId || !reminderId) {
      return NextResponse.json(
        { error: 'ID do evento e do lembrete são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar lembrete existente
    const existingReminder = await prisma.eventReminder.findUnique({
      where: { id: reminderId },
      select: {
        id: true,
        eventId: true,
        userId: true,
        status: true,
        metadata: true
      }
    })

    if (!existingReminder) {
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se pertence ao evento correto
    if (existingReminder.eventId !== eventId) {
      return NextResponse.json(
        { error: 'Lembrete não pertence a este evento' },
        { status: 400 }
      )
    }

    // Para marcar status, pode ser o dono ou sistema (sem verificação de usuário para webhooks)
    const isSystemUpdate = !session.user.id || session.user.id === 'system'
    if (!isSystemUpdate && existingReminder.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Sem permissão para atualizar status deste lembrete' },
        { status: 403 }
      )
    }

    // Atualizar histórico de execução
    const currentMetadata = existingReminder.metadata as any || {}
    const executionHistory = currentMetadata.executionHistory || []
    
    if (executionData) {
      executionHistory.push({
        timestamp: executionData.timestamp || new Date().toISOString(),
        status: status.toLowerCase(),
        error: executionData.error,
        metadata: executionData.metadata
      })
    }

    // Atualizar lembrete
    const updatedReminder = await prisma.eventReminder.update({
      where: { id: reminderId },
      data: {
        status,
        metadata: {
          ...currentMetadata,
          executionHistory,
          lastStatusUpdate: new Date().toISOString()
        }
      },
      include: {
        event: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Status do lembrete atualizado com sucesso',
      reminder: updatedReminder
    })
  } catch (error) {
    console.error('Erro ao atualizar status do lembrete:', error)
    
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