import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notificationService } from '@/lib/notifications/notification-service'

// PATCH /api/gamification/notifications/read-all - Mark all user's notifications as read
export async function PATCH(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const result = await notificationService.markAllAsRead(session.user.id)
    const updated = typeof (result as any)?.count === 'number' ? (result as any).count : 0
    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

