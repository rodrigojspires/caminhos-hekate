import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { notificationService } from '@/lib/notifications/notification-service'

function ensureAdmin(user: any) {
  return user && (user.role === 'ADMIN' || user.role === 'EDITOR')
}

// POST /api/admin/gamification/notifications/cleanup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (!ensureAdmin(me)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const days = Number(body?.days ?? 30)
    const cleaned = await notificationService.cleanupExpiredNotifications(Number.isFinite(days) && days > 0 ? days : 30)
    return NextResponse.json({ success: true, removed: cleaned })
  } catch (error) {
    console.error('Erro ao limpar notificações:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

