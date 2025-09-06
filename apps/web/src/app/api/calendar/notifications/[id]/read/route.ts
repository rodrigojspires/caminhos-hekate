import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@hekate/database';

// PATCH /api/calendar/notifications/[id]/read - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationId = params.id;

    // Verify the notification belongs to the user
    const notification = await prisma.calendarSyncNotification.findFirst({
      where: {
        id: notificationId,
        integration: {
          userId: session.user.id,
        },
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Mark as read
    const updatedNotification = await prisma.calendarSyncNotification.update({
      where: { id: notificationId },
      data: { isRead: true },
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            name: true,
          },
        },
      },
    });

    // Transform notification for response
    const transformedNotification = {
      id: updatedNotification.id,
      integrationId: updatedNotification.integrationId,
      provider: updatedNotification.integration.provider,
      type: updatedNotification.type,
      title: updatedNotification.title,
      message: updatedNotification.message,
      severity: updatedNotification.severity,
      isRead: updatedNotification.isRead,
      createdAt: updatedNotification.createdAt.toISOString(),
      data: updatedNotification.data as any,
    };

    return NextResponse.json({ notification: transformedNotification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}