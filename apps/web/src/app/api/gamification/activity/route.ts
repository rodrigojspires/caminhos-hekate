import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { achievementEngine } from '@/lib/gamification/achievement-engine'
import { notificationService } from '@/lib/notifications/notification-service'

// POST /api/gamification/activity - Process user activity
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { activityType, metadata } = await request.json()

    if (!activityType) {
      return NextResponse.json(
        { error: 'Tipo de atividade é obrigatório' },
        { status: 400 }
      )
    }

    // Use singleton instances
    // achievementEngine and notificationService are already imported as singletons

    // Process the activity through the achievement engine
    await achievementEngine.processActivity({
      userId: session.user.id,
      type: activityType,
      data: metadata || {},
      timestamp: new Date()
    })

    const results: any = {}

    // Award points based on activity type
    let pointsAwarded = 0
    const pointsMap: Record<string, number> = {
      'LOGIN': 5,
      'PROFILE_COMPLETE': 50,
      'FIRST_PURCHASE': 100,
      'COURSE_COMPLETE': 200,
      'LESSON_COMPLETE': 25,
      'QUIZ_COMPLETE': 30,
      'COMMENT_POST': 10,
      'SHARE_CONTENT': 15,
      'INVITE_FRIEND': 75,
      'STREAK_MILESTONE': 50,
      'GROUP_JOIN': 25,
      'GROUP_POST': 20,
      'REVIEW_SUBMIT': 40
    }

    if (pointsMap[activityType]) {
      pointsAwarded = pointsMap[activityType]
      
      // Award points through the points API
      const pointsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/gamification/points/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          points: pointsAwarded,
          reason: `Atividade: ${activityType}`,
          metadata: {
            activityType,
            ...metadata
          }
        })
      })

      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json()
        results.pointsAwarded = pointsAwarded
        results.levelUp = pointsData.levelUp
        results.userPoints = pointsData.userPoints
      }
    }

    // Update streaks for certain activities
    const streakActivities = {
      'LOGIN': 'daily_login',
      'LESSON_COMPLETE': 'daily_study',
      'QUIZ_COMPLETE': 'daily_quiz',
      'GROUP_POST': 'daily_engagement'
    }

    if (streakActivities[activityType as keyof typeof streakActivities]) {
      const streakType = streakActivities[activityType as keyof typeof streakActivities]
      
      const streakResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/gamification/streaks/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          type: streakType,
          metadata: {
            activityType,
            ...metadata
          }
        })
      })

      if (streakResponse.ok) {
        const streakData = await streakResponse.json()
        results.streakUpdated = true
        results.streakData = streakData
      }
    }

    return NextResponse.json({
      success: true,
      activityType,
      pointsAwarded,
      levelUp: results.levelUp || false,
      streakUpdated: results.streakUpdated || false,
      streakData: results.streakData,
      userPoints: results.userPoints,
      metadata
    })
  } catch (error) {
    console.error('Erro ao processar atividade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}