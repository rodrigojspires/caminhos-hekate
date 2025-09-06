import { addMinutes, isAfter } from 'date-fns'
import { ReminderType, ReminderStatus } from '@prisma/client'
import { prisma, Prisma } from '@hekate/database'
import { notificationService } from '@/lib/notifications/notification-service'

export interface CreateReminderData {
  eventId: string
  seriesId?: string
  instanceId?: string
  type: ReminderType
  triggerTime: Date
  userId: string
  title: string
  metadata?: Record<string, any>
}

export interface ReminderFilters {
  userId?: string
  eventId?: string
  seriesId?: string
  status?: ReminderStatus
  type?: ReminderType
  triggerBefore?: Date
  triggerAfter?: Date
}

export class ReminderService {
  /**
   * Cria um novo lembrete
   */
  async createReminder(data: CreateReminderData) {
    return await prisma.eventReminder.create({
      data: {
        eventId: data.eventId,
        type: data.type,
        triggerTime: data.triggerTime,
        userId: data.userId,
        status: ReminderStatus.PENDING,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue
      }
    })
  }

  /**
   * Cria lembretes para um evento
   */
  async createEventReminders(
    eventId: string,
    userId: string,
    eventStartDate: Date,
    reminderTypes: ReminderType[],
    seriesId?: string,
    instanceId?: string
  ) {
    const reminders = []

    // Buscar o título do evento uma única vez
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true }
    })

    const eventTitle = event?.title ?? 'Event reminder'

    for (const type of reminderTypes) {
      const triggerTime = this.calculateTriggerTime(eventStartDate, type)
      
      if (isAfter(triggerTime, new Date())) {
        const reminder = await this.createReminder({
          eventId,
          instanceId,
          type,
          triggerTime,
          userId,
          title: eventTitle
        })
        reminders.push(reminder)
      }
    }

    return reminders
  }

  /**
   * Busca lembretes com filtros
   */
  async getReminders(filters: ReminderFilters = {}) {
    const where: any = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.eventId) where.eventId = filters.eventId
    if (filters.seriesId) where.seriesId = filters.seriesId
    if (filters.status) where.status = filters.status
    if (filters.type) where.type = filters.type
    
    if (filters.triggerBefore || filters.triggerAfter) {
      where.triggerTime = {}
      if (filters.triggerBefore) where.triggerTime.lte = filters.triggerBefore
      if (filters.triggerAfter) where.triggerTime.gte = filters.triggerAfter
    }

    return await prisma.eventReminder.findMany({
      where,
      include: {
        event: true,
        user: true
      },
      orderBy: { triggerTime: 'asc' }
    })
  }

  /**
   * Busca lembretes pendentes que devem ser enviados
   */
  async getPendingReminders(beforeDate: Date = new Date()) {
    return await prisma.eventReminder.findMany({
      where: {
        status: ReminderStatus.PENDING,
        triggerTime: {
          lte: beforeDate
        }
      },
      include: {
        event: true,
        user: true
      },
      orderBy: { triggerTime: 'asc' }
    })
  }

  /**
   * Processa um lembrete (envia notificação)
   */
  async processReminder(reminderId: string) {
    const reminder = await prisma.eventReminder.findUnique({
      where: { id: reminderId },
      include: {
        event: true,
        user: true
      }
    })

    if (!reminder || reminder.status !== ReminderStatus.PENDING) {
      return false
    }

    if (!reminder.event) {
      // Não é possível enviar lembrete sem evento associado
      return false
    }

    if (!reminder.userId) {
      // Lembrete sem usuário associado (pode ser convidado) - não enviar via sistema de usuário
      return false
    }

    try {
      // Envia notificação usando o serviço central de notificações
      await notificationService.createEventReminderNotification(
        reminder.userId,
        {
          id: reminder.event.id,
          title: reminder.event.title,
          startDate: reminder.event.startDate
        },
        reminder.type,
        reminder.triggerTime
      )

      // Marca como enviado
      await prisma.eventReminder.update({
        where: { id: reminderId },
        data: {
          status: ReminderStatus.SENT,
          sentAt: new Date()
        }
      })

      return true
    } catch (error) {
      // Marca como falha
      await prisma.eventReminder.update({
        where: { id: reminderId },
        data: {
          status: ReminderStatus.FAILED,
          // Optionally log error in metadata
          metadata: {
            ...(reminder.metadata as any),
            failureReason: error instanceof Error ? error.message : 'Unknown error'
          } as Prisma.InputJsonValue
        }
      })

      throw error
    }
  }

  /**
   * Cancela lembretes de um evento
   */
  async cancelEventReminders(eventId: string, instanceId?: string) {
    const where: any = {
      eventId,
      status: ReminderStatus.PENDING
    }

    if (instanceId) {
      where.instanceId = instanceId
    }

    return await prisma.eventReminder.updateMany({
      where,
      data: {
        status: ReminderStatus.CANCELED
      }
    })
  }

  /**
   * Remove lembretes expirados
   */
  async cleanupExpiredReminders(olderThan: Date) {
    return await prisma.eventReminder.deleteMany({
      where: {
        OR: [
          {
            status: ReminderStatus.SENT,
            sentAt: {
              lt: olderThan
            }
          },
          {
            status: ReminderStatus.FAILED,
            updatedAt: {
              lt: olderThan
            }
          },
          {
            status: ReminderStatus.CANCELED,
            updatedAt: {
              lt: olderThan
            }
          }
        ]
      }
    })
  }

  /**
   * Calcula o horário de disparo do lembrete
   * Observação: ReminderType representa o canal (EMAIL, SMS, PUSH, IN_APP).
   * Aqui aplicamos uma regra simples de 15 minutos antes do evento para todos os tipos.
   */
  private calculateTriggerTime(eventStartDate: Date, _type: ReminderType): Date {
    return addMinutes(eventStartDate, -15)
  }

  /**
   * Obtém estatísticas de lembretes
   */
  async getReminderStats(userId?: string) {
    const where = userId ? { userId } : {}

    const [total, pending, sent, failed, canceled] = await Promise.all([
      prisma.eventReminder.count({ where }),
      prisma.eventReminder.count({ where: { ...where, status: ReminderStatus.PENDING } }),
      prisma.eventReminder.count({ where: { ...where, status: ReminderStatus.SENT } }),
      prisma.eventReminder.count({ where: { ...where, status: ReminderStatus.FAILED } }),
      prisma.eventReminder.count({ where: { ...where, status: ReminderStatus.CANCELED } })
    ])

    return {
      total,
      pending,
      sent,
      failed,
      canceled
    }
  }
}

export const reminderService = new ReminderService()