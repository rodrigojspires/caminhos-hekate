import { startWhatsAppWorker } from './whatsapp/worker'
import { Worker } from 'bullmq'
import { queues } from '@/lib/queues/bull'
import { prisma } from '@hekate/database'
import { emailService } from '@/lib/email'

export function startAllWorkers() {
  // Email
  new Worker('email', async job => {
    const data: any = job.data
    if (data.emailSendId) {
      // @ts-ignore private
      await (emailService as any).processEmailSend(data.emailSendId)
    } else if (data.toEmail && data.subject && data.htmlContent) {
      await emailService.sendEmail(data)
    }
    return { ok: true }
  }, { connection: (queues as any).email.client })

  // WhatsApp
  startWhatsAppWorker()

  // Reminders
  new Worker('reminders', async job => {
    const data: any = job.data
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type || 'SYSTEM_ANNOUNCEMENT',
        title: data.title || 'Lembrete',
        content: data.message || 'Você tem um lembrete.',
        channel: data.channel || 'EMAIL',
        status: 'queued',
        metadata: data,
      },
    })
    return { ok: true }
  }, { connection: (queues as any).reminders.client })
}

