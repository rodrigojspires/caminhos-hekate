import Redis from 'ioredis'
import { randomUUID } from 'crypto'

const REDIS_URL = process.env.REDIS_URL
const REDIS_ENABLED = Boolean(REDIS_URL)

const globalRedis = globalThis as unknown as {
  __redisPub?: Redis | null
  __redisSub?: Redis | null
  __redisNotificationSubscribed?: boolean
  __redisNotificationListeners?: Set<(payload: any) => void>
  __redisInstanceId?: string
}

function createRedisClient(): Redis {
  if (!REDIS_URL) {
    throw new Error('REDIS_URL not configured')
  }

  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy: (attempt) => Math.min(attempt * 100, 2000),
    reconnectOnError: () => true,
  })
}

function getRedisPub(): Redis | null {
  if (!REDIS_ENABLED) return null
  if (!globalRedis.__redisPub) {
    globalRedis.__redisPub = createRedisClient()
  }
  return globalRedis.__redisPub!
}

function getRedisSub(): Redis | null {
  if (!REDIS_ENABLED) return null
  if (!globalRedis.__redisSub) {
    globalRedis.__redisSub = createRedisClient()
  }
  return globalRedis.__redisSub!
}

const listeners =
  globalRedis.__redisNotificationListeners ||
  (globalRedis.__redisNotificationListeners = new Set<(payload: any) => void>())

const CHANNEL_NOTIFICATIONS = 'hekate:notifications'

function ensureSubscription() {
  if (!REDIS_ENABLED) return
  const sub = getRedisSub()
  if (!sub) return
  if (globalRedis.__redisNotificationSubscribed) return

  sub.subscribe(CHANNEL_NOTIFICATIONS).catch((err) => {
    console.error('[redis] Failed to subscribe to notifications channel', err)
  })

  sub.on('message', (channel, message) => {
    if (channel !== CHANNEL_NOTIFICATIONS) return
    let payload: any
    try {
      payload = JSON.parse(message)
    } catch (error) {
      console.error('[redis] Failed to parse notification payload', error)
      return
    }
    for (const listener of listeners) {
      try {
        listener(payload)
      } catch (error) {
        console.error('[redis] Notification listener error', error)
      }
    }
  })

  globalRedis.__redisNotificationSubscribed = true
}

export const redisInstanceId =
  globalRedis.__redisInstanceId || (globalRedis.__redisInstanceId = randomUUID())

export const isRedisEnabled = REDIS_ENABLED

export async function publishNotificationMessage(payload: any) {
  if (!REDIS_ENABLED) return
  const pub = getRedisPub()
  if (!pub) return
  try {
    await pub.publish(CHANNEL_NOTIFICATIONS, JSON.stringify(payload))
  } catch (error) {
    console.error('[redis] Failed to publish notification message', error)
  }
}

export function addNotificationListener(listener: (payload: any) => void) {
  listeners.add(listener)
  ensureSubscription()

  return () => {
    listeners.delete(listener)
  }
}
