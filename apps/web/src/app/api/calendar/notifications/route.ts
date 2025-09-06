import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';
import { z } from 'zod';

const notificationQuerySchema = z.object({
  integrationId: z.string().optional(),
  type: z.enum(['NEW_LESSON', 'NEW_POST', 'COMMENT_REPLY', 'COURSE_COMPLETED', 'SUBSCRIPTION_EXPIRING', 'ORDER_STATUS', 'SYSTEM_ANNOUNCEMENT', 'SECURITY_ALERT']).optional(),
  isRead: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const createNotificationSchema = z.object({
  integrationId: z.string(),
  type: z.enum(['NEW_LESSON', 'NEW_POST', 'COMMENT_REPLY', 'COURSE_COMPLETED', 'SUBSCRIPTION_EXPIRING', 'ORDER_STATUS', 'SYSTEM_ANNOUNCEMENT', 'SECURITY_ALERT']),
  title: z.string(),
  message: z.string(),
  severity: z.enum(['info', 'success', 'warning', 'error']),
  data: z.object({
    syncId: z.string().optional(),
    conflictId: z.string().optional(),
    eventsProcessed: z.number().optional(),
    errorCode: z.string().optional(),
    retryAfter: z.string().optional(),
  }).optional(),
});

// GET /api/calendar/notifications - Get user's calendar sync notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = notificationQuerySchema.parse(Object.fromEntries(searchParams));

    // Build where clause
    const where: any = {
      integration: {
        userId: session.user.id,
      },
    };

    if (query.integrationId) {
      where.integrationId = query.integrationId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      prisma.calendarSyncNotification.findMany({
        where,
        include: {
          integration: {
            select: {
              id: true,
              provider: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.calendarSyncNotification.count({ where }),
    ]);

    // Transform notifications for response
    const transformedNotifications = notifications.map(notification => ({
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
    }));

    return NextResponse.json({
      notifications: transformedNotifications,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/calendar/notifications - Create a new notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createNotificationSchema.parse(body);

    // Verify the integration belongs to the user
    const integration = await prisma.calendarIntegration.findFirst({
      where: {
        id: data.integrationId,
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Create notification
    const notification = await prisma.calendarSyncNotification.create({
      data: {
        integrationId: data.integrationId,
        type: data.type,
        title: data.title,
        message: data.message,
        severity: data.severity,
        data: data.data || {},
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

    // Transform notification for response
    const transformedNotification = {
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

    return NextResponse.json({ notification: transformedNotification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}