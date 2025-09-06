import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { notificationService } from '@/lib/notifications/notification-service'

const prisma = new PrismaClient()

// GET /api/gamification/notifications - Buscar notificações do usuário
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type')

    const notifications = await notificationService.getUserNotifications(
      session.user.id,
      {
        limit,
        unreadOnly,
        types: type ? [type as any] : undefined
      }
    )

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/notifications - Criar notificação manual
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, message, data, priority } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: type, title, message' },
        { status: 400 }
      )
    }

    const notification = await notificationService.createNotification({
      userId: session.user.id,
      type,
      title,
      message,
      data: data || {},
      priority: priority || 'MEDIUM'
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}