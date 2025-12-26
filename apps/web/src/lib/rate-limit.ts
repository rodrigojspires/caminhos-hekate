import IORedis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL
let redis: IORedis | null = null

const getRedis = () => {
  if (!REDIS_URL) return null
  if (!redis) {
    redis = new IORedis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: null })
  }
  return redis
}

export async function rateLimit({ key, max, windowSec }: { key: string; max: number; windowSec: number }) {
  const client = getRedis()
  if (!client) {
    return { allowed: true, current: 0 }
  }

  try {
    if (client.status === 'wait' || client.status === 'end') {
      await client.connect()
    }

    const bucket = `ratelimit:${key}`
    const tx = client.multi()
    tx.incr(bucket)
    tx.expire(bucket, windowSec, 'NX')
    const [count] = (await tx.exec()) as any[]
    const current = Number(count?.[1] || 0)
    const allowed = current <= max
    return { allowed, current }
  } catch (error) {
    console.error('[rate-limit] Failed to access Redis', error)
    return { allowed: true, current: 0 }
  }
}
