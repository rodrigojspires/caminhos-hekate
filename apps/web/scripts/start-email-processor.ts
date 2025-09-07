import { Worker } from 'bullmq'
import { queues } from '../src/lib/queues/bull'
import { emailService } from '@/lib/email'

async function runEmailWorkers() {
  console.log('Starting BullMQ email worker...')
  new Worker(
    'email',
    async job => {
      const data: any = job.data
      try {
        if (data.emailSendId) {
          // @ts-ignore internal private method used here by design
          await (emailService as any).processEmailSend(data.emailSendId)
        } else if (data.toEmail && data.subject && data.htmlContent) {
          await emailService.sendEmail(data)
        }
        return { ok: true }
      } catch (e) {
        console.error('Email job failed:', e)
        throw e
      }
    },
    { connection: (queues as any).email.client }
  )
}

runEmailWorkers().catch((err) => {
  console.error('Email worker error:', err)
  process.exit(1)
})
