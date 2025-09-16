import { startWhatsAppWorker } from './whatsapp/worker'
import { Queue, Worker } from 'bullmq'
import { getRedisConnection } from '@/lib/queues/bull'
import { prisma } from '@hekate/database'
import { emailService } from '@/lib/email'

export function startAllWorkers() {
  const conn = getRedisConnection()
  const emailQueue = new Queue('email', { connection: conn })
  const remindersQueue = new Queue('reminders', { connection: conn })
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
  }, { connection: conn })

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
  }, { connection: conn })
}
