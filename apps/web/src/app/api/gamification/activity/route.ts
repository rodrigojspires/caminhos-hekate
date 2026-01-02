import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { achievementEngine } from '@/lib/gamification/achievement-engine'
import { notificationService } from '@/lib/notifications/notification-service'
import { getGamificationPointSettings } from '@/lib/gamification/point-settings.server'

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
    const pointSettings = await getGamificationPointSettings()
    let points = 0
    const pointsMap: Record<string, number> = {
      LOGIN: pointSettings.activityLoginPoints,
      PROFILE_UPDATE: pointSettings.activityProfileUpdatePoints,
      AVATAR_UPDATE: pointSettings.activityAvatarUpdatePoints,
      PROFILE_COMPLETE: pointSettings.activityProfileCompletePoints,
      FIRST_PURCHASE: pointSettings.activityFirstPurchasePoints,
      COURSE_COMPLETE: pointSettings.activityCourseCompletePoints,
      LESSON_COMPLETE: pointSettings.activityLessonCompletePoints,
      QUIZ_COMPLETE: pointSettings.activityQuizCompletePoints,
      PURCHASE_COMPLETE: pointSettings.activityPurchaseCompletePoints,
      COMMENT_POST: pointSettings.activityCommentPostPoints,
      SHARE_CONTENT: pointSettings.activityShareContentPoints,
      INVITE_FRIEND: pointSettings.activityInviteFriendPoints,
      STREAK_MILESTONE: pointSettings.activityStreakMilestonePoints,
      GROUP_JOIN: pointSettings.activityGroupJoinPoints,
      GROUP_POST: pointSettings.activityGroupPostPoints,
      REVIEW_SUBMIT: pointSettings.activityReviewSubmitPoints
    }

    if (pointsMap[activityType]) {
      points = pointsMap[activityType]
      
      // Award points through the points API
      const pointsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/gamification/points/award`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          points,
          reason: `Atividade: ${activityType}`,
          metadata: {
            activityType,
            ...metadata
          }
        })
      })

      if (pointsResponse.ok) {
        const pointsData = await pointsResponse.json()
        results.points = points
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
      points,
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
