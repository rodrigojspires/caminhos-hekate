import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/points - Get current user's points summary
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: session.user.id },
      select: {
        userId: true,
        totalPoints: true,
        currentLevel: true,
        pointsToNext: true,
        updatedAt: true,
        createdAt: true,
      }
    })

    const { searchParams } = new URL(request.url)
    const includeTransactions = searchParams.get('includeTransactions') === 'true'

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const todayAgg = await prisma.pointTransaction.aggregate({
      where: {
        userId: session.user.id,
        createdAt: { gte: startOfDay },
        type: 'EARNED'
      },
      _sum: { points: true }
    })

    const summary = userPoints || {
      userId: session.user.id,
      totalPoints: 0,
      currentLevel: 1,
      pointsToNext: 100,
      createdAt: null,
      updatedAt: null,
    }

    const payload: any = {
      userPoints: {
        ...summary,
        todayPoints: Number(todayAgg._sum.points || 0),
      }
    }

    if (includeTransactions) {
      const txs = await prisma.pointTransaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      payload.transactions = txs
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Erro ao obter pontos do usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/points - Award points (alias for /points/award)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { points, reason, description, metadata } = await request.json()

    if (!points || points <= 0) {
      return NextResponse.json({ error: 'Pontos devem ser positivos' }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: 'Motivo é obrigatório' }, { status: 400 })
    }

    // Ensure record exists
    let userPoints = await prisma.userPoints.findUnique({ where: { userId: session.user.id } })
    if (!userPoints) {
      userPoints = await prisma.userPoints.create({
        data: { userId: session.user.id, totalPoints: 0, currentLevel: 1, pointsToNext: 100 }
      })
    }

    const previousLevel = userPoints.currentLevel
    const newTotal = userPoints.totalPoints + Number(points)

    // Compute new level (simple exponential growth)
    let newLevel = userPoints.currentLevel
    let pointsToNext = userPoints.pointsToNext
    let carry = newTotal
    while (carry >= pointsToNext) {
      carry -= pointsToNext
      newLevel += 1
      pointsToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1))
    }

    const updated = await prisma.userPoints.update({
      where: { userId: session.user.id },
      data: { totalPoints: newTotal, currentLevel: newLevel, pointsToNext }
    })

    const transaction = await prisma.pointTransaction.create({
      data: {
        userId: session.user.id,
        type: 'EARNED',
        points: Number(points),
        reason,
        description: description || reason,
        metadata: metadata || {},
      }
    })

    return NextResponse.json({
      userPoints: updated,
      transaction,
      pointsAwarded: Number(points),
      levelUp: newLevel > previousLevel,
      previousLevel,
    })
  } catch (error) {
    console.error('Erro ao conceder pontos (alias):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
