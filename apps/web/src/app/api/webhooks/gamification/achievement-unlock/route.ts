import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@hekate/database'

const schema = z.object({
  userId: z.string().uuid(),
  achievementId: z.string().uuid(),
  progress: z.number().min(0).max(100).optional(),
})

// POST /api/webhooks/gamification/achievement-unlock - Unlock achievement on behalf of user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, achievementId, progress = 100 } = schema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      const achievement = await tx.achievement.findUnique({ where: { id: achievementId } })
      if (!achievement) throw new Error('Achievement not found')

      const existing = await tx.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
      })

      if (existing) {
        const updated = await tx.userAchievement.update({
          where: { id: existing.id },
          data: { progress },
        })
        return { userAchievement: updated, isNewUnlock: false, points: 0 }
      }

      const ua = await tx.userAchievement.create({
        data: { userId, achievementId, progress },
      })

      let points = 0
      if (progress >= 100) {
        let up = await tx.userPoints.findUnique({ where: { userId } })
        if (!up) {
          up = await tx.userPoints.create({ data: { userId, totalPoints: 0, currentLevel: 1, pointsToNext: 100 } })
        }
        points = achievement.points
        const newTotal = up.totalPoints + points
        const newLevel = Math.floor(newTotal / 100) + 1
        const pointsToNext = Math.max(0, newLevel * 100 - newTotal)

        await tx.userPoints.update({ where: { userId }, data: { totalPoints: newTotal, currentLevel: newLevel, pointsToNext } })
        await tx.pointTransaction.create({
          data: {
            userId,
            points: points,
            type: 'EARNED',
            reason: 'ACHIEVEMENT_UNLOCK',
            description: `Conquista desbloqueada via webhook`,
            metadata: { achievementId },
          },
        })
      }

      return { userAchievement: ua, isNewUnlock: true, points }
    })

    return NextResponse.json(result)
  } catch (error) {
    if ((error as any)?.issues) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as any).issues }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Achievement not found') {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 })
    }
    console.error('Erro no webhook de achievement-unlock:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

