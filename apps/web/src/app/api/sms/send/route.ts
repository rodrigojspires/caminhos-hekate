import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { to, message } = await request.json()

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, message' },
        { status: 400 }
      )
    }

    // Verificar se o usuário tem permissão para enviar SMS
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

    // Verificar se as configurações do Twilio estão disponíveis
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn('Configurações do Twilio não encontradas')
      return NextResponse.json(
        { error: 'SMS não configurado' },
        { status: 503 }
      )
    }

    // Enviar SMS usando Twilio API
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
      
      const formData = new URLSearchParams()
      formData.append('From', process.env.TWILIO_PHONE_NUMBER!)
      formData.append('To', to)
      formData.append('Body', message)

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Erro do Twilio:', result)
        
        // Log do erro
        await prisma.smsLog.create({
          data: {
            to,
            message,
            status: 'FAILED',
            sentBy: session.user.id,
            error: result.message || 'Erro desconhecido',
            twilioSid: null
          }
        })

        return NextResponse.json(
          { error: result.message || 'Falha ao enviar SMS' },
          { status: response.status }
        )
      }

      // Log do envio bem-sucedido
      await prisma.smsLog.create({
        data: {
          to,
          message,
          status: 'SENT',
          sentBy: session.user.id,
          twilioSid: result.sid
        }
      })

      return NextResponse.json({
        success: true,
        messageId: result.sid,
        status: result.status
      })
    } catch (twilioError: any) {
      console.error('Erro ao enviar SMS:', twilioError)
      
      // Log do erro
      await prisma.smsLog.create({
        data: {
          to,
          message,
          status: 'FAILED',
          sentBy: session.user.id,
          error: twilioError.message,
          twilioSid: null
        }
      })

      return NextResponse.json(
        { error: 'Falha ao enviar SMS' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erro ao processar SMS:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}