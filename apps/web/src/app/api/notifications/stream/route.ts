import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notificationService } from '@/lib/notifications/notification-service'

// Configurar runtime para Node.js
export const runtime = 'nodejs'

// Mapa para armazenar conexões ativas
const activeConnections = new Map<string, ReadableStreamDefaultController>()

// GET - Stream de notificações em tempo real (Server-Sent Events)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Criar stream de Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        // Armazenar conexão ativa
        activeConnections.set(userId, controller)

        // Enviar evento inicial de conexão
        const initMessage = `data: ${JSON.stringify({
          type: 'connected',
          message: 'Conectado ao stream de notificações',
          timestamp: new Date().toISOString()
        })}\n\n`
        
        controller.enqueue(new TextEncoder().encode(initMessage))

        // Configurar listener para novas notificações
        const handleNotification = (notification: any) => {
          if (notification.userId !== userId) return

          const normalized = formatNotificationPayload(notification)
          const payload = {
            type: 'notifications' as const,
            data: [normalized],
          }
          const message = `data: ${JSON.stringify(payload)}\n\n`

          try {
            controller.enqueue(new TextEncoder().encode(message))
          } catch (error) {
            console.error('Erro ao enviar notificação via stream:', error)
          }
        }

        // Registrar listener
        notificationService.on('notification:created', handleNotification)

        // Cleanup quando a conexão for fechada
        const cleanup = () => {
          activeConnections.delete(userId)
          notificationService.off('notification:created', handleNotification)
        }

        // Detectar quando o cliente desconecta
        request.signal.addEventListener('abort', cleanup)
      },

      cancel() {
        // Limpar conexão quando o stream for cancelado
        activeConnections.delete(userId)
      }
    })

    // Configurar headers para Server-Sent Events
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error) {
    console.error('Erro ao configurar stream de notificações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Enviar notificação para usuários específicos (para testes)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { userIds, notification } = body

    if (!Array.isArray(userIds) || !notification) {
      return NextResponse.json(
        { error: 'userIds (array) e notification são obrigatórios' },
        { status: 400 }
      )
    }

    // Enviar notificação para usuários conectados
    let sentCount = 0
    for (const userId of userIds) {
      const controller = activeConnections.get(userId)
      if (controller) {
        try {
          const message = `data: ${JSON.stringify({
            ...notification,
            timestamp: new Date().toISOString()
          })}\n\n`
          
          controller.enqueue(new TextEncoder().encode(message))
          sentCount++
        } catch (error) {
          console.error(`Erro ao enviar notificação para usuário ${userId}:`, error)
          // Remover conexão inválida
          activeConnections.delete(userId)
        }
      }
    }

    return NextResponse.json({
      message: `Notificação enviada para ${sentCount} usuários conectados`,
      sentCount,
      totalRequested: userIds.length,
      activeConnections: activeConnections.size
    })
  } catch (error) {
    console.error('Erro ao enviar notificação via stream:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET status - Verificar status das conexões ativas
export async function HEAD(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response(null, { status: 401 })
    }

    const userId = session.user.id
    const isConnected = activeConnections.has(userId)

    return new Response(null, {
      status: 200,
      headers: {
        'X-Connection-Status': isConnected ? 'connected' : 'disconnected',
        'X-Active-Connections': activeConnections.size.toString()
      }
    })
  } catch (error) {
    console.error('Erro ao verificar status da conexão:', error)
    return new Response(null, { status: 500 })
  }
}

function formatNotificationPayload(notification: any) {
  const createdAt = notification.createdAt instanceof Date
    ? notification.createdAt.toISOString()
    : notification.createdAt ?? new Date().toISOString()

  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    content: notification.message ?? notification.content ?? '',
    priority: notification.priority,
    data: notification.data ?? notification.metadata ?? null,
    createdAt,
    read: Boolean(notification.isRead ?? notification.read ?? false),
  }
}
