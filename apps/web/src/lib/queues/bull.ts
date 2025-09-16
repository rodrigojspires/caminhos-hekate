import { Queue, Worker, QueueEvents, JobsOptions } from 'bullmq'
import IORedis from 'ioredis'

// Lazy Redis connection to avoid connecting during build
let _connection: IORedis | null = null
export function getRedisConnection(): IORedis {
  if (process.env.SKIP_REDIS === '1') {
    throw new Error('Redis connection disabled during build (SKIP_REDIS=1)')
  }
  if (!_connection) {
    const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'
    _connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })
  }
  return _connection
}

let _queues: { email: Queue; whatsapp: Queue; reminders: Queue } | null = null
function getQueues() {
  if (!_queues) {
    const conn = getRedisConnection()
    _queues = {
      email: new Queue('email', { connection: conn }),
      whatsapp: new Queue('whatsapp', { connection: conn }),
      reminders: new Queue('reminders', { connection: conn }),
    }
  }
  return _queues
}

export type EnqueueOptions = JobsOptions & { delayUntil?: Date }

export async function enqueue<T>(q: keyof ReturnType<typeof getQueues>, name: string, data: T, opts?: EnqueueOptions) {
  const queue = getQueues()[q]
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

export function createQueueEvents(q: keyof ReturnType<typeof getQueues>) {
  return new QueueEvents(q, { connection: getRedisConnection() })
}

export { Worker }
