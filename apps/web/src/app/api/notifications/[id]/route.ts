import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { z } from 'zod'

// Schema para atualizar notificação
const UpdateNotificationSchema = z.object({
  status: z.enum(['pending', 'sent', 'failed']).optional(),
  read: z.boolean().optional()
})

// GET /api/notifications/[id] - Buscar notificação específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const notification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        channel: true,
        status: true,
        sentAt: true,
        failedAt: true,
        metadata: true,
        createdAt: true
      }
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...notification,
      read: notification.status === 'sent' && notification.sentAt,
      createdAt: notification.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Erro ao buscar notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/[id] - Atualizar notificação (marcar como lida)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = UpdateNotificationSchema.parse(body)

    // Verificar se a notificação existe e pertence ao usuário
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    // Preparar dados para atualização
    const updateData: any = {}
    
    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === 'sent') {
        updateData.sentAt = new Date()
      } else if (data.status === 'failed') {
        updateData.failedAt = new Date()
      }
    }

    // Se marcar como lida, atualizar status para 'sent'
    if (data.read === true && existingNotification.status === 'pending') {
      updateData.status = 'sent'
      updateData.sentAt = new Date()
    }

    const notification = await prisma.notification.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        type: true,
        title: true,
        content: true,
        channel: true,
        status: true,
        sentAt: true,
        failedAt: true,
        metadata: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      ...notification,
      read: notification.status === 'sent' && notification.sentAt,
      createdAt: notification.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Erro ao atualizar notificação:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Excluir notificação
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se a notificação existe e pertence ao usuário
    const existingNotification = await prisma.notification.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      )
    }

    await prisma.notification.delete({
      where: { id: params.id }
    })

    return NextResponse.json(
      { message: 'Notificação excluída com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao excluir notificação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}