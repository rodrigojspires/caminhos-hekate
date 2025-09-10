import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resendEmailService } from '@/lib/resend-email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { to, subject, html, eventId, type } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, subject, html' },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem permissão para enviar emails
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

    // Preparar destinatários e enviar usando o serviço central (com fallback se RESEND_API_KEY ausente)
    const recipients: string[] = Array.isArray(to) ? to : [to]

    const results = await Promise.all(
      recipients.map((recipient) =>
        resendEmailService.sendEmail({
          to: recipient,
          subject,
          html
        })
      )
    )

    const firstId = results[0]?.id

    // Log do envio
    await prisma.emailLog.create({
      data: {
        to: recipients.join(','),
        subject,
        type: type || 'notification',
        status: 'SENT',
        sentBy: session.user.id,
        eventId: eventId || null,
        resendId: firstId || null
      }
    })

    return NextResponse.json({
      success: true,
      messageId: firstId
    })
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}