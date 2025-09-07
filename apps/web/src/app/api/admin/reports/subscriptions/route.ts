import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@hekate/database'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const startParam = searchParams.get('start')
    const endParam = searchParams.get('end')
    const start = startParam ? new Date(startParam) : new Date(new Date().getFullYear(), 0, 1)
    const end = endParam ? new Date(endParam) : new Date()

    const subs = await prisma.userSubscription.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { plan: true },
    })
    const active = await prisma.userSubscription.count({ where: { status: 'ACTIVE' as any } })
    const byPlan: Record<string, number> = {}
    subs.forEach(s => { const key = (s.plan?.name as string) || (s.planId as string); byPlan[key] = (byPlan[key] || 0) + 1 })
    const created = subs.length
    const canceled = await prisma.userSubscription.count({ where: { canceledAt: { not: null }, updatedAt: { gte: start, lte: end } } })

    return NextResponse.json({ range: { start, end }, totals: { active, created, canceled }, byPlan })
  } catch (e) {
    console.error('GET /api/admin/reports/subscriptions error', e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
