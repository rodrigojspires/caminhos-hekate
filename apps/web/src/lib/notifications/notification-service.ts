import { prisma } from '@hekate/database'
import { NotificationType, NotificationPriority, BadgeRarity } from '@prisma/client'
import { EventEmitter } from 'events'
import {
  addNotificationListener,
  isRedisEnabled,
  publishNotificationMessage,
  redisInstanceId,
} from '@/lib/redis'

export interface NotificationData {
  achievementId?: string
  achievementName?: string
  achievementDescription?: string
  badgeId?: string
  badgeName?: string
  badgeDescription?: string
  points?: number
  level?: number
  previousLevel?: number
  totalPoints?: number
  days?: number
  streakType?: string
  longestStreak?: number
  rarity?: BadgeRarity
  reason?: string
  [key: string]: any
}

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: NotificationData
  priority?: NotificationPriority
  isPush?: boolean
  expiresAt?: Date
}

// Tipos específicos para eventos recorrentes
export interface RecurringEventNotificationData {
  eventId?: string
  seriesId?: string
  instanceId?: string
  reminderId?: string
  eventTitle?: string
  eventStartDate?: Date
  recurrencePattern?: string
}

class NotificationService extends EventEmitter {
  private static instance: NotificationService
  private pushSubscriptions = new Map<string, any>()

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  // Criar notificação
  async createNotification(params: CreateNotificationParams) {
    try {
      const notification = await prisma.gamificationNotification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          data: params.data || {},
          priority: params.priority || 'MEDIUM',
          isPush: params.isPush || false,
          expiresAt: params.expiresAt
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      // Emitir evento para notificação em tempo real
      this.emit('notification:created', notification)

      if (isRedisEnabled) {
        const broadcastPayload = serializeNotification(notification)
        publishNotificationMessage({
          sourceId: redisInstanceId,
          notification: broadcastPayload,
        }).catch((error) => {
          console.error('[notifications] Falha ao publicar notificação no Redis', error)
        })
      }

      // Enviar push notification se solicitado
      if (params.isPush) {
        await this.sendPushNotification(notification)
      }

      // Enviar email para notificações de alta prioridade
      if (params.priority === 'HIGH' || params.priority === 'URGENT') {
        await this.sendEmailNotification(notification)
      }

      return notification
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      throw error
    }
  }

  // Criar notificação de conquista desbloqueada
  async createAchievementNotification(userId: string, achievement: any) {
    const template = await this.getNotificationTemplate('SPECIAL_EVENT')
    
    const title = this.replaceVariables(template.title, {
      achievementName: achievement.name
    })
    
    const message = this.replaceVariables(template.message, {
      achievementName: achievement.name,
      achievementDescription: achievement.description,
      points: achievement.points
    })

    return this.createNotification({
      userId,
      type: 'SPECIAL_EVENT',
      title,
      message,
      data: {
        achievementId: achievement.id,
        achievementName: achievement.name,
        achievementDescription: achievement.description,
        points: achievement.points,
        rarity: achievement.rarity
      },
      priority: this.getPriorityByRarity(achievement.rarity),
      isPush: true
    })
  }

  // Criar notificação de badge conquistado
  async createBadgeNotification(userId: string, badge: any) {
    const template = await this.getNotificationTemplate('SPECIAL_EVENT')
    
    const title = this.replaceVariables(template.title, {
      badgeName: badge.name
    })
    
    const message = this.replaceVariables(template.message, {
      badgeName: badge.name,
      badgeDescription: badge.description,
      rarity: badge.rarity
    })

    return this.createNotification({
      userId,
      type: 'SPECIAL_EVENT',
      title,
      message,
      data: {
        badgeId: badge.id,
        badgeName: badge.name,
        badgeDescription: badge.description,
        rarity: badge.rarity
      },
      priority: this.getPriorityByRarity(badge.rarity),
      isPush: true
    })
  }

  // Criar notificação de subida de nível
  async createLevelUpNotification(userId: string, level: number, previousLevel: number, totalPoints: number) {
    const template = await this.getNotificationTemplate('SPECIAL_EVENT')
    
    const title = this.replaceVariables(template.title, { level })
    const message = this.replaceVariables(template.message, { level, previousLevel, totalPoints })

    return this.createNotification({
      userId,
      type: 'SPECIAL_EVENT',
      title,
      message,
      data: {
        level,
        previousLevel,
        totalPoints
      },
      priority: 'HIGH',
      isPush: true
    })
  }

  // Criar notificação de marco de sequência
  async createStreakMilestoneNotification(userId: string, days: number, streakType: string, longestStreak: number) {
    const template = await this.getNotificationTemplate('SPECIAL_EVENT')
    
    const title = this.replaceVariables(template.title, { days })
    const message = this.replaceVariables(template.message, { days, streakType, longestStreak })

    return this.createNotification({
      userId,
      type: 'SPECIAL_EVENT',
      title,
      message,
      data: {
        days,
        streakType,
        longestStreak
      },
      priority: days >= 30 ? 'HIGH' : 'MEDIUM',
      isPush: true
    })
  }

  // Buscar notificações do usuário
  async getUserNotifications(userId: string, options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    types?: NotificationType[]
  } = {}) {
    const { limit = 20, offset = 0, unreadOnly = false, types } = options

    const where: any = { userId }
    
    if (unreadOnly) {
      where.isRead = false
    }
    
    if (types && types.length > 0) {
      where.type = { in: types }
    }

    // Filtrar notificações não expiradas
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ]

    return prisma.gamificationNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })
  }

  // Marcar notificação como lida
  async markAsRead(notificationId: string, userId: string) {
    return prisma.gamificationNotification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        isRead: true
      }
    })
  }

  // Marcar todas as notificações como lidas
  async markAllAsRead(userId: string) {
    return prisma.gamificationNotification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    })
  }

  // Contar notificações não lidas
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.gamificationNotification.count({
      where: {
        userId,
        isRead: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })
  }

  // Buscar template de notificação
  private async getNotificationTemplate(type: NotificationType) {
    const template = await prisma.notificationTemplate.findUnique({
      where: { type }
    })

    if (!template) {
      throw new Error(`Template de notificação não encontrado para o tipo: ${type}`)
    }

    return template
  }

  // Substituir variáveis no template
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      result = result.replace(regex, String(value))
    })
    
    return result
  }

  // Obter prioridade baseada na raridade
  private getPriorityByRarity(rarity: BadgeRarity): NotificationPriority {
    switch (rarity) {
      case 'MYTHIC':
      case 'LEGENDARY':
        return 'URGENT'
      case 'EPIC':
        return 'HIGH'
      case 'RARE':
        return 'MEDIUM'
      default:
        return 'LOW'
    }
  }

  // Enviar push notification
  private async sendPushNotification(notification: any) {
    try {
      const template = await this.getNotificationTemplate(notification.type)
      
      const pushTitle = this.replaceVariables(
        template.pushTitle || notification.title,
        notification.data
      )
      
      const pushBody = this.replaceVariables(
        template.pushBody || notification.message,
        notification.data
      )

      // Aqui você integraria com um serviço de push notifications
      // como Firebase Cloud Messaging, OneSignal, etc.
      console.log('Push notification enviada:', {
        userId: notification.userId,
        title: pushTitle,
        body: pushBody
      })

      // Atualizar registro de envio
      await prisma.gamificationNotification.update({
        where: { id: notification.id },
        data: { pushSentAt: new Date() }
      })
    } catch (error) {
      console.error('Erro ao enviar push notification:', error)
    }
  }

  // Enviar notificação por email
  private async sendEmailNotification(notification: any) {
    try {
      const template = await this.getNotificationTemplate(notification.type)
      
      if (!template.emailSubject || !template.emailBody) {
        return // Template não tem configuração de email
      }

      const emailSubject = this.replaceVariables(template.emailSubject, notification.data)
      const emailBody = this.replaceVariables(template.emailBody, notification.data)

      // Aqui você integraria com um serviço de email
      // como SendGrid, Mailgun, etc.
      console.log('Email enviado:', {
        to: notification.user.email,
        subject: emailSubject,
        body: emailBody
      })

      // Atualizar registro de envio
      await prisma.gamificationNotification.update({
        where: { id: notification.id },
        data: { emailSentAt: new Date() }
      })
    } catch (error) {
      console.error('Erro ao enviar email:', error)
    }
  }

  /**
   * Limpa notificações expiradas
   */
  async cleanupExpiredNotifications(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const result = await prisma.gamificationNotification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          isRead: true
        }
      })

      return result.count
    } catch (error) {
      console.error('Erro ao limpar notificações expiradas:', error)
      throw error
    }
  }

  /**
   * Cria notificação para lembrete de evento
   */
  async createEventReminderNotification(
    userId: string,
    eventData: any,
    reminderType: string,
    triggerTime: Date,
    options?: {
      message?: string
      data?: RecurringEventNotificationData & Record<string, any>
    }
  ) {
    const timeUntilEvent = this.getTimeUntilEvent(eventData.startDate)
    
    return this.createNotification({
      userId,
      type: 'EVENT_REMINDER',
      title: `Lembrete: ${eventData.title}`,
      message: options?.message || `Seu evento "${eventData.title}" ${timeUntilEvent}`,
      priority: this.getEventReminderPriority(reminderType, eventData.startDate),
      data: {
        eventId: eventData.id,
        eventTitle: eventData.title,
        eventStartDate: eventData.startDate,
        reminderType,
        triggerTime,
        ...(options?.data || {})
      } as RecurringEventNotificationData
    })
  }

  /**
   * Cria notificação para série de eventos recorrentes
   */
  async createRecurringSeriesNotification(
    userId: string,
    seriesData: any,
    type: 'created' | 'updated' | 'deleted'
  ) {
    const titles = {
      created: 'Nova série de eventos criada',
      updated: 'Série de eventos atualizada',
      deleted: 'Série de eventos removida'
    }

    const messages = {
      created: `A série "${seriesData.parentEvent.title}" foi criada com sucesso`,
      updated: `A série "${seriesData.parentEvent.title}" foi atualizada`,
      deleted: `A série "${seriesData.parentEvent.title}" foi removida`
    }

    return this.createNotification({
      userId,
      type: 'EVENT_CREATED',
      title: titles[type],
      message: messages[type],
      priority: 'MEDIUM',
      data: {
        seriesId: seriesData.id,
        eventTitle: seriesData.parentEvent.title,
        recurrencePattern: seriesData.recurrenceRule
      } as RecurringEventNotificationData
    })
  }

  /**
   * Cria notificação para exceção em evento recorrente
   */
  async createRecurringExceptionNotification(
    userId: string,
    instanceData: any,
    exceptionType: 'cancelled' | 'modified'
  ) {
    const titles = {
      cancelled: 'Evento cancelado',
      modified: 'Evento modificado'
    }

    const messages = {
      cancelled: `O evento "${instanceData.title}" foi cancelado`,
      modified: `O evento "${instanceData.title}" foi modificado`
    }

    return this.createNotification({
      userId,
      type: 'EVENT_UPDATED',
      title: titles[exceptionType],
      message: messages[exceptionType],
      priority: 'HIGH',
      data: {
        instanceId: instanceData.id,
        seriesId: instanceData.seriesId,
        eventTitle: instanceData.title,
        eventStartDate: instanceData.startDate,
        exceptionType
      } as RecurringEventNotificationData
    })
  }

  /**
   * Calcula tempo até o evento
   */
  private getTimeUntilEvent(eventDate: Date): string {
    const now = new Date()
    const diffMs = eventDate.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 0) {
      return 'já começou'
    } else if (diffMinutes < 60) {
      return `começa em ${diffMinutes} minutos`
    } else if (diffHours < 24) {
      return `começa em ${diffHours} horas`
    } else {
      return `começa em ${diffDays} dias`
    }
  }

  /**
   * Determina prioridade do lembrete baseado no tipo e proximidade
   */
  private getEventReminderPriority(reminderType: string, eventDate: Date): NotificationPriority {
    const now = new Date()
    const diffHours = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Lembretes muito próximos têm prioridade alta
    if (diffHours <= 1) return 'HIGH'
    if (diffHours <= 24) return 'MEDIUM'
    return 'LOW'
  }
}

export const notificationService = NotificationService.getInstance()

if (isRedisEnabled) {
  addNotificationListener((payload) => {
    if (!payload?.notification) return
    if (payload.sourceId && payload.sourceId === redisInstanceId) return
    const notification = deserializeNotification(payload.notification)
    notificationService.emit('notification:created', notification)
  })
}

export default notificationService

function serializeNotification(notification: any) {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data ?? null,
    isRead: notification.isRead ?? false,
    isPush: notification.isPush ?? false,
    priority: notification.priority ?? 'MEDIUM',
    expiresAt: notification.expiresAt
      ? notification.expiresAt instanceof Date
        ? notification.expiresAt.toISOString()
        : notification.expiresAt
      : null,
    createdAt:
      notification.createdAt instanceof Date
        ? notification.createdAt.toISOString()
        : notification.createdAt,
    updatedAt:
      notification.updatedAt instanceof Date
        ? notification.updatedAt.toISOString()
        : notification.updatedAt,
  }
}

function deserializeNotification(notification: any) {
  return {
    ...notification,
    createdAt: notification.createdAt ? new Date(notification.createdAt) : new Date(),
    updatedAt: notification.updatedAt ? new Date(notification.updatedAt) : new Date(),
  }
}
