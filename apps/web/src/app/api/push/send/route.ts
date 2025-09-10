import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Configurar VAPID keys para Web Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@caminhosdehecate.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { subscription, payload } = await request.json()

    if (!subscription || !payload) {
      return NextResponse.json(
        { error: 'Subscription e payload são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se as VAPID keys estão configuradas
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.warn('VAPID keys não configuradas, push notification não será enviada')
      return NextResponse.json(
        { error: 'Push notifications não configuradas' },
        { status: 503 }
      )
    }

    // Verificar se o usuário tem permissão para enviar push notifications
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    const role = (user?.role as unknown as string) || ''
    if (!user || !['ADMIN', 'MODERATOR'].includes(role)) {
       return NextResponse.json(
         { error: 'Permissão insuficiente' },
         { status: 403 }
       )
     }

    // Enviar push notification
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        {
          TTL: 24 * 60 * 60, // 24 horas
          urgency: 'normal'
        }
      )

      // Log do envio
      await prisma.pushNotificationLog.create({
        data: {
          endpoint: subscription.endpoint,
          title: payload.title,
          body: payload.body,
          status: 'SENT',
          sentBy: session.user.id,
          data: payload.data ? JSON.stringify(payload.data) : null
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Push notification enviada com sucesso'
      })
    } catch (pushError: any) {
      console.error('Erro ao enviar push notification:', pushError)
      
      // Se a subscription é inválida (410), retornar status específico
      if (pushError.statusCode === 410) {
        return NextResponse.json(
          { error: 'Subscription inválida ou expirada' },
          { status: 410 }
        )
      }

      // Log do erro
      await prisma.pushNotificationLog.create({
        data: {
          endpoint: subscription.endpoint,
          title: payload.title,
          body: payload.body,
          status: 'FAILED',
          sentBy: session.user.id,
          error: pushError.message,
          data: payload.data ? JSON.stringify(payload.data) : null
        }
      })

      return NextResponse.json(
        { error: 'Falha ao enviar push notification' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erro ao processar push notification:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}