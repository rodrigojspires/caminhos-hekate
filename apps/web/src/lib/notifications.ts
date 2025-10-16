import { notificationService } from '@/lib/notifications/notification-service'
import { NotificationPriority, NotificationType } from '@prisma/client'
import { prisma } from '@hekate/database'

// Função para notificar usuários (para uso interno)
export async function notifyUsers(notification: {
  userId?: string
  type: string
  title: string
  content: string
  metadata?: any
}) {
  // Esta função pode ser chamada de outras partes da aplicação
  // para enviar notificações em tempo real
  // Por enquanto, apenas salva no banco - o polling pegará automaticamente
  
  if (notification.userId) {
    try {
      await notificationService.createNotification({
        userId: notification.userId,
        type: (notification.type as NotificationType) ?? 'SYSTEM_ANNOUNCEMENT',
        title: notification.title,
        message: notification.content,
        data: notification.metadata || {},
        priority: NotificationPriority.MEDIUM,
        isPush: false,
      })
    } catch (error) {
      console.error('notifyUsers: failed to create notification', error)
    }
  }
}

// Função para marcar notificações como lidas
export async function markNotificationsAsRead(userId: string, notificationIds?: string[]) {
  const where = notificationIds 
    ? { userId, id: { in: notificationIds } }
    : { userId }

  await prisma.notification.updateMany({
    where,
    data: {
      status: 'read'
    }
  })
}

// Função para buscar notificações do usuário
export async function getUserNotifications(userId: string, options?: {
  unreadOnly?: boolean
  limit?: number
  offset?: number
}) {
  const { unreadOnly = false, limit = 10, offset = 0 } = options || {}

  return await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { status: { not: 'read' } } : {})
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    skip: offset
  })
}
