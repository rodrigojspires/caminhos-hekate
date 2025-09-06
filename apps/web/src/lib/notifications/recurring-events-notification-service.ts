import { notificationService, NotificationData } from './notification-service'
import { NotificationType, NotificationPriority, ReminderType, ReminderStatus } from '@prisma/client'
import { prisma } from '@hekate/database'
import { Event, EventReminder } from '@/types/events'

export interface RecurringEventNotificationData extends NotificationData {
  eventId?: string
  eventTitle?: string
  eventDate?: string
  eventTime?: string
  eventLocation?: string
  seriesId?: string
  instanceDate?: string
  reminderType?: ReminderType
  timeUntilEvent?: string
  isException?: boolean
  isModified?: boolean
  originalDate?: string
  newDate?: string
}

class RecurringEventsNotificationService {
  private static instance: RecurringEventsNotificationService

  static getInstance(): RecurringEventsNotificationService {
    if (!RecurringEventsNotificationService.instance) {
      RecurringEventsNotificationService.instance = new RecurringEventsNotificationService()
    }
    return RecurringEventsNotificationService.instance
  }

  // Criar notificação de lembrete de evento
  async createEventReminderNotification(
    userId: string,
    event: any,
    reminder: any,
    timeUntilEvent: string
  ) {
    const priority = this.getReminderPriority(reminder.type, timeUntilEvent)
    const title = this.getReminderTitle(reminder.type, event.title)
    const message = this.getReminderMessage(reminder.type, event, timeUntilEvent)

    return notificationService.createNotification({
      userId,
      type: 'EVENT_REMINDER' as NotificationType,
      title,
      message,
      data: {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.startDate.toISOString(),
        eventTime: event.startDate?.toISOString?.() ?? undefined,
        eventLocation: event.location,
        reminderType: reminder.type,
        timeUntilEvent
      },
      priority,
      isPush: true
    })
  }

  // Criar notificação de evento recorrente criado
  async createRecurringEventCreatedNotification(
    userId: string,
    event: Event,
    totalInstances: number
  ) {
    return notificationService.createNotification({
      userId,
      type: 'EVENT_CREATED' as NotificationType,
      title: 'Série de Eventos Criada',
      message: `Sua série "${event.title}" foi criada com ${totalInstances} instâncias.`,
      data: {
        eventId: event.id,
        eventTitle: event.title,
        seriesId: event.id, // Using event id as series identifier
        totalInstances
      },
      priority: 'MEDIUM',
      isPush: false
    })
  }

  // Criar notificação de exceção em evento recorrente
  async createRecurringEventExceptionNotification(
    userId: string,
    originalEvent: Event,
    exceptionDate: Date,
    action: 'CANCELLED' | 'MODIFIED' | 'RESCHEDULED'
  ) {
    const title = this.getExceptionTitle(action)
    const message = this.getExceptionMessage(action, originalEvent.title, exceptionDate)

    return notificationService.createNotification({
      userId,
      type: 'EVENT_UPDATED' as NotificationType,
      title,
      message,
      data: {
        eventId: originalEvent.id,
        eventTitle: originalEvent.title,
        seriesId: originalEvent.id, // Using event id as series identifier
        instanceDate: exceptionDate.toISOString(),
        isException: true,
        action
      },
      priority: 'HIGH',
      isPush: true
    })
  }

  // Criar notificação de evento recorrente modificado
  async createRecurringEventModifiedNotification(
    userId: string,
    event: Event,
    originalDate: Date,
    newDate: Date
  ) {
    return notificationService.createNotification({
      userId,
      type: 'EVENT_UPDATED' as NotificationType,
      title: 'Evento Reagendado',
      message: `O evento "${event.title}" foi reagendado de ${this.formatDate(originalDate)} para ${this.formatDate(newDate)}.`,
      data: {
        eventId: event.id,
        eventTitle: event.title,
        seriesId: event.id, // Using event id as series identifier
        isModified: true,
        originalDate: originalDate.toISOString(),
        newDate: newDate.toISOString()
      },
      priority: 'HIGH',
      isPush: true
    })
  }

  // Criar notificação de conflito de eventos
  async createEventConflictNotification(
    userId: string,
    conflictingEvents: Event[]
  ) {
    const eventTitles = conflictingEvents.map(e => e.title).join(', ')
    
    return notificationService.createNotification({
      userId,
      type: 'EVENT_CONFLICT' as NotificationType,
      title: 'Conflito de Eventos Detectado',
      message: `Você tem eventos conflitantes: ${eventTitles}. Verifique sua agenda.`,
      data: {
        conflictingEventIds: conflictingEvents.map(e => e.id),
        conflictingEventTitles: conflictingEvents.map(e => e.title)
      },
      priority: 'HIGH',
      isPush: true
    })
  }

  // Criar notificação de série de eventos finalizada
  async createRecurringSeriesCompletedNotification(
    userId: string,
    event: Event,
    totalCompleted: number
  ) {
    // Integração com gamificação - pontos por completar série
    const points = this.calculateSeriesCompletionPoints(totalCompleted)
    
    return notificationService.createNotification({
      userId,
      type: 'SERIES_COMPLETED' as NotificationType,
      title: 'Série de Eventos Concluída! 🎉',
      message: `Parabéns! Você completou a série "${event.title}" com ${totalCompleted} eventos. Ganhou ${points} pontos!`,
      data: {
        eventId: event.id,
        eventTitle: event.title,
        seriesId: event.id, // Using event id as series identifier
        totalCompleted,
        pointsEarned: points
      },
      priority: 'HIGH',
      isPush: true
    })
  }

  // Processar lembretes pendentes
  async processPendingReminders() {
    try {
      const now = new Date()
      const reminderWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000) // Próximas 24 horas

      const pendingReminders = await prisma.eventReminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          triggerTime: {
            gte: now,
            lte: reminderWindow
          }
        },
        include: {
          event: {
            include: {
              creator: true,
              registrations: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      })

      for (const reminder of pendingReminders) {
        const timeUntilEvent = this.calculateTimeUntilEvent(reminder.event.startDate)
        
        // Enviar para o criador do evento
        await this.createEventReminderNotification(
          reminder.event.creator.id,
          reminder.event,
          reminder,
          timeUntilEvent
        )

        // Enviar para todos os participantes registrados
        for (const registration of reminder.event.registrations) {
          if (registration.userId && registration.userId !== reminder.event.creator.id) {
            await this.createEventReminderNotification(
              registration.userId,
              reminder.event,
              reminder,
              timeUntilEvent
            )
          }
        }

        // Marcar lembrete como enviado
        await prisma.eventReminder.update({
          where: { id: reminder.id },
          data: {
            status: ReminderStatus.SENT,
            sentAt: now
          }
        })
      }

      console.log(`Processados ${pendingReminders.length} lembretes pendentes`)
    } catch (error) {
      console.error('Erro ao processar lembretes pendentes:', error)
    }
  }

  // Métodos auxiliares privados
  private getReminderPriority(type: ReminderType, timeUntilEvent: string): NotificationPriority {
    if (timeUntilEvent.includes('minuto') || timeUntilEvent.includes('hora')) {
      return 'URGENT'
    }
    if (type === ReminderType.PUSH || type === ReminderType.SMS) {
      return 'HIGH'
    }
    return 'MEDIUM'
  }

  private getReminderTitle(type: ReminderType, eventTitle: string): string {
    switch (type) {
      case ReminderType.EMAIL:
        return `📧 Lembrete: ${eventTitle}`
      case ReminderType.PUSH:
        return `🔔 ${eventTitle} em breve`
      case ReminderType.SMS:
        return `📱 Lembrete: ${eventTitle}`
      default:
        return `⏰ Lembrete: ${eventTitle}`
    }
  }

  private getReminderMessage(type: ReminderType, event: Event, timeUntilEvent: string): string {
    const location = event.location ? ` em ${event.location}` : ''
    return `Seu evento "${event.title}" acontece em ${timeUntilEvent}${location}.`
  }

  private getExceptionTitle(action: 'CANCELLED' | 'MODIFIED' | 'RESCHEDULED'): string {
    switch (action) {
      case 'CANCELLED':
        return '❌ Evento Cancelado'
      case 'MODIFIED':
        return '✏️ Evento Modificado'
      case 'RESCHEDULED':
        return '📅 Evento Reagendado'
      default:
        return '🔄 Evento Atualizado'
    }
  }

  private getExceptionMessage(action: 'CANCELLED' | 'MODIFIED' | 'RESCHEDULED', eventTitle: string, date: Date): string {
    const formattedDate = this.formatDate(date)
    
    switch (action) {
      case 'CANCELLED':
        return `O evento "${eventTitle}" de ${formattedDate} foi cancelado.`
      case 'MODIFIED':
        return `O evento "${eventTitle}" de ${formattedDate} foi modificado.`
      case 'RESCHEDULED':
        return `O evento "${eventTitle}" de ${formattedDate} foi reagendado.`
      default:
        return `O evento "${eventTitle}" de ${formattedDate} foi atualizado.`
    }
  }

  private calculateTimeUntilEvent(eventDate: Date): string {
    const now = new Date()
    const eventDateTime = new Date(eventDate)

    const diffMs = eventDateTime.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} dia${diffDays > 1 ? 's' : ''}`
    } else if (diffHours > 0) {
      return `${diffHours} hora${diffHours > 1 ? 's' : ''}`
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
    } else {
      return 'agora'
    }
  }

  private calculateSeriesCompletionPoints(totalCompleted: number): number {
    // Pontos baseados no número de eventos completados
    const basePoints = 50
    const bonusPoints = Math.floor(totalCompleted / 5) * 25 // Bônus a cada 5 eventos
    return basePoints + bonusPoints
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

export const recurringEventsNotificationService = RecurringEventsNotificationService.getInstance()
export { RecurringEventsNotificationService }
export default recurringEventsNotificationService
