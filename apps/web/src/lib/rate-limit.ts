import IORedis from 'ioredis'

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function rateLimit({ key, max, windowSec }: { key: string; max: number; windowSec: number }) {
  const bucket = `ratelimit:${key}`
  const tx = redis.multi()
  tx.incr(bucket)
  tx.expire(bucket, windowSec, 'NX')
  const [count] = (await tx.exec()) as any[]
  const current = Number(count?.[1] || 0)
  const allowed = current <= max
  return { allowed, current }
}

