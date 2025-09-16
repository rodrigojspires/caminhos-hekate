#!/usr/bin/env tsx

import { Worker } from 'bullmq'
import { getRedisConnection } from '../src/lib/queues/bull'
import { prisma } from '@hekate/database'

async function runReminderWorker() {
  console.log('Starting BullMQ reminder worker...')
  new Worker(
    'reminders',
    async job => {
      const data: any = job.data
      try {
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
      } catch (e) {
        console.error('Reminder job failed:', e)
        throw e
      }
    },
    { connection: getRedisConnection() }
  )
}

runReminderWorker().catch((e) => {
  console.error('Reminder worker error:', e)
  process.exit(1)
})
