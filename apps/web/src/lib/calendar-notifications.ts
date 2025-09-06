import { prisma } from '@hekate/database';

// Helper function to create notifications (for internal use)
export async function createSyncNotification({
  integrationId,
  type,
  title,
  message,
  severity,
  data = {},
}: {
  integrationId: string;
  type: 'NEW_LESSON' | 'NEW_POST' | 'COMMENT_REPLY' | 'COURSE_COMPLETED' | 'SUBSCRIPTION_EXPIRING' | 'ORDER_STATUS' | 'SYSTEM_ANNOUNCEMENT' | 'SECURITY_ALERT';
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, any>;
}) {
  try {
    const notification = await prisma.calendarSyncNotification.create({
      data: {
        integrationId,
        type,
        title,
        message,
        severity,
        data,
        isRead: false,
      },
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
          },
        },
      },
    });

    return {
      id: notification.id,
      integrationId: notification.integrationId,
      provider: notification.integration.provider,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
      data: notification.data as any,
    };
  } catch (error) {
    console.error('Error creating sync notification:', error);
    throw error;
  }
}