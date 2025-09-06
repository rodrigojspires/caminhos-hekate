import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@hekate/database'
import { notificationService } from '@/lib/notifications/notification-service'
import { achievementEngine } from '@/lib/gamification/achievement-engine'

// POST /api/gamification/points/award - Award points to user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
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

    const previousLevel = userPoints.currentLevel
    const newTotalPoints = userPoints.totalPoints + points

    // Calculate new level
    let newLevel = userPoints.currentLevel
    let pointsToNext = userPoints.pointsToNext
    let currentPoints = newTotalPoints

    // Level up calculation (exponential growth)
    while (currentPoints >= pointsToNext) {
      currentPoints -= pointsToNext
      newLevel++
      pointsToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1))
    }

    // Update user points
    const updatedUserPoints = await prisma.userPoints.update({
      where: { userId: session.user.id },
      data: {
        totalPoints: newTotalPoints,
        currentLevel: newLevel,
        pointsToNext: pointsToNext
      }
    })

    // Create point transaction
    await prisma.pointTransaction.create({
      data: {
        userId: session.user.id,
        type: 'EARNED',
        points: points,
        reason: reason,
        description: reason,
        metadata: metadata || {}
      }
    })

    // Check for level up
    const levelUp = newLevel > previousLevel
    
    if (levelUp) {
      // Create level up notification
      await notificationService.createLevelUpNotification(
        session.user.id,
        newLevel,
        previousLevel,
        newTotalPoints
      )
    }

    // Create points notification (generic special event)
    await notificationService.createNotification({
      userId: session.user.id,
      type: 'SPECIAL_EVENT',
      title: 'Pontos ganhos',
      message: `Você ganhou ${points} pontos: ${reason}`,
      data: {
        points,
        reason,
        totalPoints: newTotalPoints
      },
      isPush: true
    })

    // Process achievements (no return value)
    await achievementEngine.processActivity({
      userId: session.user.id,
      type: 'POINTS_EARNED',
      data: {
        points,
        reason,
        totalPoints: newTotalPoints,
        currentLevel: newLevel,
        ...metadata
      },
      timestamp: new Date()
    })

    return NextResponse.json({
      userPoints: updatedUserPoints,
      levelUp,
      previousLevel,
      pointsAwarded: points,
      reason,
      newAchievements: [],
      newBadges: []
    })
  } catch (error) {
    console.error('Erro ao conceder pontos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}