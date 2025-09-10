import { prisma } from '@/lib/prisma'

export type NotificationType = 
  | 'achievement_unlocked'
  | 'level_up'
  | 'event_reminder'
  | 'group_invitation'
  | 'system_announcement'
  | 'payment_success'
  | 'payment_failed'

export interface NotificationData {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: any
  priority: 'low' | 'medium' | 'high' | 'urgent'
  read: boolean
  createdAt: Date
  expiresAt: Date | null
}

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: any
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  expiresAt?: Date | null
}

export interface GetNotificationsOptions {
  unreadOnly?: boolean
  limit?: number
  offset?: number
  type?: NotificationType
}

export class NotificationSystem {
  static async createNotification(input: CreateNotificationInput): Promise<NotificationData> {
    const notification = await prisma.gamificationNotification.create({
      data: {
        userId: input.userId,
        type: input.type as any,
        title: input.title,
        message: input.message,
        data: input.metadata,
        priority: ((input.priority || 'medium').toUpperCase()) as any,
        expiresAt: input.expiresAt ?? null
      }
    })

    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      metadata: notification.data,
      priority: (notification.priority as unknown as string).toLowerCase() as 'low' | 'medium' | 'high' | 'urgent',
      read: notification.isRead,
      createdAt: notification.createdAt,
      expiresAt: notification.expiresAt
    }
  }

  static async getUserNotifications(
    userId: string, 
    options: GetNotificationsOptions = {}
  ): Promise<{ notifications: NotificationData[], total: number }> {
    const where: any = {
      userId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    }

    if (options.unreadOnly) {
      where.isRead = false
    }

    if (options.type) {
      where.type = options.type as any
    }

    const [notifications, total] = await Promise.all([
      prisma.gamificationNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0
      }),
      prisma.gamificationNotification.count({ where })
    ])

    return {
      notifications: notifications.map(n => ({
        id: n.id,
        userId: n.userId,
        type: n.type as NotificationType,
        title: n.title,
        message: n.message,
        metadata: n.data,
        priority: (n.priority as unknown as string).toLowerCase() as 'low' | 'medium' | 'high' | 'urgent',
        read: n.isRead,
        createdAt: n.createdAt,
        expiresAt: n.expiresAt
      })),
      total
    }
  }

  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.gamificationNotification.updateMany({
      where: {
        id: notificationId,
        userId
      },
      data: {
        isRead: true
      }
    })
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await prisma.gamificationNotification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    })
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    await prisma.gamificationNotification.deleteMany({
      where: {
        id: notificationId,
        userId
      }
    })
  }

  static async cleanupExpiredNotifications(): Promise<void> {
    await prisma.gamificationNotification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
  }
}