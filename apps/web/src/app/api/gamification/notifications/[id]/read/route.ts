import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notificationService } from '@/lib/notifications/notification-service'

// PUT /api/gamification/notifications/[id]/read - Marcar notificação como lida
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const notificationId = params.id
    if (!notificationId) {
      return NextResponse.json(
        { error: 'ID da notificação é obrigatório' },
        { status: 400 }
      )
    }

    const result = await notificationService.markAsRead(
      notificationId,
      session.user.id
    )

    // markAsRead uses updateMany; treat success if any rows were updated
    const updatedCount = typeof (result as any)?.count === 'number' ? (result as any).count : (result ? 1 : 0)
    if (updatedCount < 1) {
      return NextResponse.json(
        { error: 'Notificação não encontrada ou não pertence ao usuário' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, updated: updatedCount })
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
