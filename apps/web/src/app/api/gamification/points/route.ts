import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'

// GET /api/gamification/points - Get user points and level info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeTransactions = searchParams.get('includeTransactions') === 'true'
    const transactionLimit = parseInt(searchParams.get('transactionLimit') || '10')

    // Get or create user points
    let userPoints = await prisma.userPoints.findUnique({
      where: { userId: session.user.id }
    })

    if (!userPoints) {
      userPoints = await prisma.userPoints.create({
        data: {
          userId: session.user.id,
          totalPoints: 0,
          currentLevel: 1,
          pointsToNext: 100
        }
      })
    }

    // Calculate level progress
    const levelProgress = {
      currentLevel: userPoints.currentLevel,
      totalPoints: userPoints.totalPoints,
      pointsToNext: userPoints.pointsToNext,
      progressPercentage: Math.max(0, Math.min(100, 
        ((userPoints.totalPoints % userPoints.pointsToNext) / userPoints.pointsToNext) * 100
      ))
    }

    const response: any = {
      userPoints,
      levelProgress
    }

    // Include recent transactions if requested
    if (includeTransactions) {
      const transactions = await prisma.pointTransaction.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: transactionLimit
      })

      response.recentTransactions = transactions
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching user points:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST /api/gamification/points - Deduct points (for purchases, etc.)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { points, reason, metadata } = await request.json()

    if (!points || points <= 0) {
      return NextResponse.json(
        { error: 'Pontos devem ser um número positivo' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Motivo é obrigatório' },
        { status: 400 }
      )
    }

    // Get user points
    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: session.user.id }
    })

    if (!userPoints) {
      return NextResponse.json(
        { error: 'Usuário não possui pontos' },
        { status: 400 }
      )
    }

    if (userPoints.totalPoints < points) {
      return NextResponse.json(
        { error: 'Pontos insuficientes' },
        { status: 400 }
      )
    }

    // Deduct points
    const updatedUserPoints = await prisma.userPoints.update({
      where: { userId: session.user.id },
      data: {
        totalPoints: {
          decrement: points
        }
      }
    })

    // Create transaction record
    await prisma.pointTransaction.create({
      data: {
        userId: session.user.id,
        type: 'SPENT',
        points: -points,
        reason: reason,
        description: reason,
        metadata: metadata || {}
      }
    })

    return NextResponse.json({
      userPoints: updatedUserPoints,
      pointsDeducted: points,
      reason,
      remainingPoints: updatedUserPoints.totalPoints
    })
  } catch (error) {
    console.error('Error deducting user points:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}