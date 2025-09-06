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
    await prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type as any,
        title: notification.title,
        content: notification.content,
        status: 'sent',
        channel: 'EMAIL',
        metadata: notification.metadata || {}
      }
    })
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