import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { NotificationSystem, NotificationType } from '@/lib/notification-system'

// GET /api/gamification/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') as NotificationType | null

    const result = await NotificationSystem.getUserNotifications(session.user.id, {
      unreadOnly,
      limit,
      offset,
      type: type || undefined
    })

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/notifications - Create notification (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (you might want to implement proper role checking)
    const isAdmin = session.user.email === 'admin@example.com' // Replace with proper admin check
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, type, title, message, metadata, priority, expiresAt } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, title, message' },
        { status: 400 }
      )
    }

    const notification = await NotificationSystem.createNotification({
      userId,
      type,
      title,
      message,
      metadata,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    })

    return NextResponse.json({
      success: true,
      data: notification
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/gamification/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      await NotificationSystem.markAllAsRead(session.user.id)
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      })
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notificationId' },
        { status: 400 }
      )
    }

    await NotificationSystem.markAsRead(notificationId, session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/gamification/notifications - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notification ID' },
        { status: 400 }
      )
    }

    await NotificationSystem.deleteNotification(notificationId, session.user.id)

    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}