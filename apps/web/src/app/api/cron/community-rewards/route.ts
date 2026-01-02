import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'
import { getActivityLeaderboard } from '@/lib/community-leaderboard'
import { GamificationEngine } from '@/lib/gamification-engine'

const TOP_LIMIT = 3
const POINTS_BY_RANK = [300, 200, 100]
const BADGE_COLOR = '#F59E0B'
const BADGE_ICON = 'trophy'
const BADGE_CATEGORY = 'community'
const BADGE_RARITY = 'RARE'

function getPeriodRange(reference = new Date()) {
  const currentMonthStart = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const prevMonthStart = new Date(reference.getFullYear(), reference.getMonth() - 1, 1)
  return { start: prevMonthStart, end: currentMonthStart }
}

function formatPeriodLabel(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

async function ensureBadge(name: string, description: string, metadata: Record<string, any>) {
  return prisma.badge.upsert({
    where: { name },
    update: { description, metadata },
    create: {
      name,
      description,
      icon: BADGE_ICON,
      color: BADGE_COLOR,
      rarity: BADGE_RARITY as any,
      category: BADGE_CATEGORY,
      criteria: { type: 'MONTHLY_ACTIVITY_LEADERBOARD' },
      metadata
    }
  })
}

async function awardTopEntries({
  leaderboard,
  badgeName,
  badgeDescription,
  metadata,
  periodStart,
  periodEnd
}: {
  leaderboard: { userId: string; score: number }[]
  badgeName: string
  badgeDescription: string
  metadata: Record<string, any>
  periodStart: Date
  periodEnd: Date
}) {
  if (leaderboard.length === 0) return []

  const badge = await ensureBadge(badgeName, badgeDescription, metadata)

  const awarded: { userId: string; rank: number }[] = []

  for (let index = 0; index < Math.min(TOP_LIMIT, leaderboard.length); index += 1) {
    const entry = leaderboard[index]
    const rank = index + 1
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: entry.userId, badgeId: badge.id } }
    })
    if (existing) continue

    await prisma.userBadge.create({
      data: {
        userId: entry.userId,
        badgeId: badge.id,
        metadata: {
          ...metadata,
          rank,
          score: entry.score
        }
      }
    })

    const points = POINTS_BY_RANK[index] || 0
    if (points > 0) {
      await GamificationEngine.awardPoints(entry.userId, points, 'COMMUNITY_LEADERBOARD_MONTHLY', {
        ...metadata,
        periodStart,
        periodEnd,
        rank,
        pointsAwarded: points
      })
    }

    awarded.push({ userId: entry.userId, rank })
  }

  return awarded
}

export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const now = new Date()
    const { start, end } = getPeriodRange(now)
    const periodLabel = formatPeriodLabel(start)

    const [communities, generalLeaderboard] = await Promise.all([
      prisma.community.findMany({ select: { id: true, name: true } }),
      getActivityLeaderboard({ startDate: start, endDate: end, limit: TOP_LIMIT })
    ])

    const results: Record<string, any> = {}

    results.general = await awardTopEntries({
      leaderboard: generalLeaderboard,
      badgeName: `Top 3 Geral - ${periodLabel}`,
      badgeDescription: `Top 3 contribuidores gerais de ${periodLabel}.`,
      metadata: { scope: 'general', period: periodLabel },
      periodStart: start,
      periodEnd: end
    })

    for (const community of communities) {
      const leaderboard = await getActivityLeaderboard({
        startDate: start,
        endDate: end,
        communityId: community.id,
        limit: TOP_LIMIT
      })

      results[community.id] = await awardTopEntries({
        leaderboard,
        badgeName: `Top 3 ${community.name} - ${periodLabel}`,
        badgeDescription: `Top 3 contribuidores de ${community.name} em ${periodLabel}.`,
        metadata: { scope: 'community', communityId: community.id, period: periodLabel },
        periodStart: start,
        periodEnd: end
      })
    }

    return NextResponse.json({
      ok: true,
      periodStart: start,
      periodEnd: end,
      results
    })
  } catch (error) {
    console.error('Erro ao premiar ranking mensal:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
