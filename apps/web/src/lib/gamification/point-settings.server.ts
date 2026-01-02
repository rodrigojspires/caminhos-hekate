import 'server-only'

import { prisma } from '@hekate/database'
import { cache, SettingsCache } from '@/lib/cache'
import {
  GAMIFICATION_POINT_DEFAULTS,
  GAMIFICATION_POINT_SETTINGS,
  GamificationPointField
} from './point-settings'

const GAMIFICATION_POINTS_CACHE_KEY = 'settings:gamification:points'

export type GamificationPointValues = Record<GamificationPointField, number>

function toNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export function invalidateGamificationPointSettingsCache() {
  cache.delete(GAMIFICATION_POINTS_CACHE_KEY)
}

export async function ensureGamificationPointSettings() {
  const settings = await prisma.systemSettings.findMany({
    where: { key: { in: GAMIFICATION_POINT_SETTINGS.map((item) => item.key) } },
    select: { key: true }
  })

  const existingKeys = new Set(settings.map((setting) => setting.key))
  const missing = GAMIFICATION_POINT_SETTINGS.filter((item) => !existingKeys.has(item.key))

  if (missing.length === 0) return

  await prisma.$transaction(
    missing.map((item, index) =>
      prisma.systemSettings.create({
        data: {
          key: item.key,
          value: item.defaultValue,
          type: 'NUMBER',
          category: 'GAMIFICATION',
          name: item.label,
          description: item.description,
          order: GAMIFICATION_POINT_SETTINGS.findIndex((entry) => entry.key === item.key)
        }
      })
    )
  )

  SettingsCache.invalidate()
  invalidateGamificationPointSettingsCache()
}

export async function getGamificationPointSettings(): Promise<GamificationPointValues> {
  const cached = cache.get<GamificationPointValues>(GAMIFICATION_POINTS_CACHE_KEY)
  if (cached) return cached

  const settings = await prisma.systemSettings.findMany({
    where: { key: { in: GAMIFICATION_POINT_SETTINGS.map((item) => item.key) } }
  })

  const map = new Map(settings.map((setting) => [setting.key, setting.value]))

  const values = GAMIFICATION_POINT_SETTINGS.reduce((acc, setting) => {
    const raw = map.get(setting.key)
    acc[setting.field] = toNumber(raw, setting.defaultValue)
    return acc
  }, { ...GAMIFICATION_POINT_DEFAULTS } as GamificationPointValues)

  cache.set(GAMIFICATION_POINTS_CACHE_KEY, values, SettingsCache.TTL)
  return values
}
