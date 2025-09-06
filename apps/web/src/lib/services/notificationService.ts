import { prisma } from '@hekate/database'
import { ReminderType, ReminderStatus } from '@hekate/shared/types/events'

interface NotificationPayload {
  userId: string
  title: string
  message: string
  type: ReminderType
  eventId: string
  triggerTime: Date
}

interface EmailNotificationData {
  to: string
  subject: string
  html: string
  eventId: string
  eventTitle: string
  eventDate: Date
  eventLocation?: string
  eventVirtualLink?: string
}

interface PushNotificationData {
  userId: string
  title: string
  body: string
  data: {
    eventId: string
    type: 'event_reminder'
  }
}

class NotificationService {
  /**
   * Processar lembretes pendentes
   */
  async processScheduledReminders(): Promise<void> {
    try {
      const now = new Date()
      
      // Buscar lembretes que devem ser enviados agora
      const pendingReminders = await prisma.eventReminder.findMany({
        where: {
          status: ReminderStatus.PENDING,
          triggerTime: {
            lte: now
          }
        },
        include: {
          event: {
            include: {
              creator: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      console.log(`Processando ${pendingReminders.length} lembretes pendentes`)

      for (const reminder of pendingReminders) {
        try {
          await this.sendNotification({
            userId: reminder.userId ?? '',
            title: `Lembrete: ${reminder.event.title}`,
            message: `Lembrete para o evento: ${reminder.event.title}`,
            type: reminder.type as ReminderType,
            eventId: reminder.eventId,
            triggerTime: reminder.triggerTime
          })

          // Marcar lembrete como enviado
          await prisma.eventReminder.update({
            where: { id: reminder.id },
            data: {
              status: ReminderStatus.SENT,
              sentAt: new Date()
            }
          })

          console.log(`Lembrete ${reminder.id} enviado com sucesso`)
        } catch (error) {
          console.error(`Erro ao enviar lembrete ${reminder.id}:`, error)
          
          // Marcar lembrete como falhou
          await prisma.eventReminder.update({
            where: { id: reminder.id },
            data: {
              status: ReminderStatus.FAILED
            }
          })
        }
      }
    } catch (error) {
      console.error('Erro ao processar lembretes:', error)
    }
  }

  /**
   * Enviar notificação baseada no tipo
   */
  private async sendNotification(payload: NotificationPayload): Promise<void> {
    switch (payload.type) {
      case ReminderType.EMAIL:
        await this.sendEmailNotification(payload)
        break
      case ReminderType.PUSH:
        await this.sendPushNotification(payload)
        break
      case ReminderType.SMS:
        await this.sendSMSNotification(payload)
        break
      default:
        throw new Error(`Tipo de notificação não suportado: ${payload.type}`)
    }
  }

  /**
   * Enviar notificação por email
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Buscar dados do evento e usuário
      const event = await prisma.event.findUnique({
        where: { id: payload.eventId },
        include: {
          creator: {
            select: { name: true, email: true }
          }
        }
      })

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, name: true }
      })

      if (!event || !user?.email) {
        throw new Error('Dados do evento ou usuário não encontrados')
      }

      const emailData: EmailNotificationData = {
        to: user.email,
        subject: `Lembrete: ${event.title}`,
        html: this.generateEmailTemplate({
          userName: user.name || 'Usuário',
          eventTitle: event.title,
          eventDescription: event.description || '',
          eventDate: event.startDate,
          eventEndDate: event.endDate,
          eventLocation: event.location,
          eventVirtualLink: event.virtualLink,
          organizerName: event.creator.name || 'Organizador',
          reminderMessage: payload.message
        }),
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventLocation: event.location || undefined,
        eventVirtualLink: event.virtualLink || undefined
      }

      // Aqui você integraria com seu provedor de email (SendGrid, AWS SES, etc.)
      await this.sendEmail(emailData)
      
      console.log(`Email de lembrete enviado para ${user.email}`)
    } catch (error) {
      console.error('Erro ao enviar email:', error)
      throw error
    }
  }

  /**
   * Enviar notificação push
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<void> {
    try {
      const pushData: PushNotificationData = {
        userId: payload.userId,
        title: payload.title,
        body: payload.message,
        data: {
          eventId: payload.eventId,
          type: 'event_reminder'
        }
      }

      // Aqui você integraria com seu provedor de push notifications (Firebase, OneSignal, etc.)
      await this.sendPush(pushData)
      
      console.log(`Notificação push enviada para usuário ${payload.userId}`)
    } catch (error) {
      console.error('Erro ao enviar push notification:', error)
      throw error
    }
  }

  /**
   * Enviar notificação por SMS
   */
  private async sendSMSNotification(payload: NotificationPayload): Promise<void> {
    try {
      // SMS functionality would require phone number field in User model
      // For now, we'll just log that SMS would be sent
      console.log('SMS notification would be sent if phone number was available')
    } catch (error) {
      console.error('Erro ao enviar SMS:', error)
      throw error
    }
  }

  /**
   * Gerar template de email
   */
  private generateEmailTemplate(data: {
    userName: string
    eventTitle: string
    eventDescription: string
    eventDate: Date
    eventEndDate: Date | null
    eventLocation: string | null
    eventVirtualLink: string | null
    organizerName: string
    reminderMessage: string
  }): string {
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'full',
        timeStyle: 'short'
      }).format(date)
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Lembrete de Evento</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .event-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Lembrete de Evento</h1>
          </div>
          
          <div class="content">
            <p>Olá, <strong>${data.userName}</strong>!</p>
            
            <p>${data.reminderMessage}</p>
            
            <div class="event-details">
              <h2>📅 ${data.eventTitle}</h2>
              
              <p><strong>📍 Data e Hora:</strong><br>
              ${formatDate(data.eventDate)}
              ${data.eventEndDate ? ` até ${formatDate(data.eventEndDate)}` : ''}</p>
              
              ${data.eventLocation ? `<p><strong>🏢 Local:</strong><br>${data.eventLocation}</p>` : ''}
              
              ${data.eventVirtualLink ? `<p><strong>💻 Link Virtual:</strong><br><a href="${data.eventVirtualLink}" class="button">Participar Online</a></p>` : ''}
              
              ${data.eventDescription ? `<p><strong>📝 Descrição:</strong><br>${data.eventDescription}</p>` : ''}
              
              <p><strong>👤 Organizador:</strong> ${data.organizerName}</p>
            </div>
            
            <p>Não perca este evento importante!</p>
          </div>
          
          <div class="footer">
            <p>Este é um lembrete automático do sistema Caminhos de Hekate.</p>
            <p>Se você não deseja mais receber esses lembretes, acesse suas configurações de conta.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Método placeholder para envio de email
   * Integre com seu provedor de email preferido
   */
  private async sendEmail(data: EmailNotificationData): Promise<void> {
    // Implementar integração com provedor de email
    console.log('Enviando email:', {
      to: data.to,
      subject: data.subject,
      eventId: data.eventId
    })
    
    // Exemplo com fetch para API externa:
    // await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // })
  }

  /**
   * Método placeholder para envio de push notification
   * Integre com seu provedor de push preferido
   */
  private async sendPush(data: PushNotificationData): Promise<void> {
    // Implementar integração com provedor de push notifications
    console.log('Enviando push notification:', data)
    
    // Exemplo com Firebase:
    // await admin.messaging().send({
    //   token: userToken,
    //   notification: {
    //     title: data.title,
    //     body: data.body
    //   },
    //   data: data.data
    // })
  }

  /**
   * Método placeholder para envio de SMS
   * Integre com seu provedor de SMS preferido
   */
  private async sendSMS(data: { to: string; message: string }): Promise<void> {
    // Implementar integração com provedor de SMS
    console.log('Enviando SMS:', data)
    
    // Exemplo com Twilio:
    // await twilioClient.messages.create({
    //   body: data.message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: data.to
    // })
  }

  /**
   * Criar lembretes automáticos para novos eventos
   */
  async createDefaultReminders(eventId: string, userId: string): Promise<void> {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { startDate: true, title: true }
      })

      if (!event) {
        throw new Error('Evento não encontrado')
      }

      // Lembretes padrão: 1 dia, 1 hora e 15 minutos antes
      const defaultReminders = [
        { minutesBefore: 1440, type: ReminderType.EMAIL }, // 1 dia
        { minutesBefore: 60, type: ReminderType.PUSH },    // 1 hora
        { minutesBefore: 15, type: ReminderType.PUSH }     // 15 minutos
      ]

      for (const reminder of defaultReminders) {
        const triggerTime = new Date(event.startDate.getTime() - (reminder.minutesBefore * 60 * 1000))
        
        // Só criar se a data do lembrete for no futuro
        if (triggerTime > new Date()) {
          await prisma.eventReminder.create({
            data: {
              eventId,
              userId,
              type: reminder.type,
              triggerTime,
              status: ReminderStatus.PENDING
            }
          })
        }
      }
    } catch (error) {
      console.error('Erro ao criar lembretes padrão:', error)
    }
  }
}

export const notificationService = new NotificationService()