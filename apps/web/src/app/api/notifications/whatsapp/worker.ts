import { Queue, Worker } from 'bullmq'
import { getRedisConnection } from '@/lib/queues/bull'
import { prisma } from '@hekate/database'
import { sendTemplateMessage } from '@/lib/whatsapp/evolution'

export function startWhatsAppWorker() {
  const conn = getRedisConnection()
  const whatsappQueue = new Queue('whatsapp', { connection: conn })
  return new Worker(
    'whatsapp',
    async job => {
      const data: any = job.data
      const pref = data.userId ? await prisma.notificationPreference.findUnique({ where: { userId: data.userId } }) : null
      // quiet hours check
      if (pref?.quietHoursEnabled) {
        const now = new Date()
        const hh = now.toTimeString().slice(0,5)
        const start = pref.quietHoursStart || '22:00'
        const end = pref.quietHoursEnd || '08:00'
        const inQuiet = hh >= start || hh <= end
        if (inQuiet) {
          // re-enqueue in 1h
          await whatsappQueue.add('send-whatsapp', data, { delay: 60 * 60 * 1000 })
          return { deferred: true }
        }
      }
      try {
        await sendTemplateMessage({ to: data.to, template: data.template, variables: data.variables })
        await prisma.notification.create({
          data: {
            userId: data.userId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: data.title || 'Mensagem WhatsApp',
            content: data.template,
            channel: 'WHATSAPP',
            status: 'sent',
            sentAt: new Date(),
            metadata: data,
          }
        })
        return { ok: true }
      } catch (e: any) {
        await prisma.notification.create({
          data: {
            userId: data.userId,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Falha WhatsApp',
            content: String(e?.message || e),
            channel: 'WHATSAPP',
            status: 'failed',
            failedAt: new Date(),
            metadata: data,
          }
        })
        throw e
      }
    },
    { connection: conn }
  )
}
