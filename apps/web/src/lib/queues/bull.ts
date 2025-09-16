import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379')

export const queues = {
  email: new Queue('email', { connection }),
  whatsapp: new Queue('whatsapp', { connection }),
  reminders: new Queue('reminders', { connection }),
}

export type EnqueueOptions = JobsOptions & { delayUntil?: Date }

export async function enqueue<T>(q: keyof typeof queues, name: string, data: T, opts?: EnqueueOptions) {
  const queue = queues[q]
  const options: JobsOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
    ...(opts || {}),
  }
  if (opts?.delayUntil) options.delay = Math.max(0, opts.delayUntil.getTime() - Date.now())
  return queue.add(name, data as any, options)
}

export function createQueueEvents(q: keyof typeof queues) {
  return new QueueEvents(q, { connection })
}

export { Worker }

