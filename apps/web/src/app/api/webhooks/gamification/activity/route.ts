import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@hekate/database'
import { achievementEngine } from '@/lib/gamification/achievement-engine'
import type { ActivityType } from '@/lib/gamification/achievement-engine'
import { getGamificationPointSettings } from '@/lib/gamification/point-settings.server'

const schema = z.object({
  userId: z.string().uuid(),
  activityType: z.string(),
  metadata: z.record(z.any()).optional(),
})

// POST /api/webhooks/gamification/activity - Alias to process activity without session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, activityType, metadata } = schema.parse(body)

    // Normalize and validate activity type
    const synonyms: Record<string, ActivityType> = {
      LOGIN: 'LOGIN',
      PROFILE_COMPLETE: 'PROFILE_UPDATED',
      PROFILE_UPDATED: 'PROFILE_UPDATED',
      FIRST_PURCHASE: 'FIRST_PURCHASE',
      SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
      REFERRAL_MADE: 'REFERRAL_MADE',
      FEEDBACK_GIVEN: 'FEEDBACK_GIVEN',
      POINTS_EARNED: 'POINTS_EARNED',
      STREAK_MILESTONE: 'STREAK_UPDATED',
      STREAK_UPDATED: 'STREAK_UPDATED',
      COURSE_COMPLETE: 'COURSE_COMPLETED',
      COURSE_COMPLETED: 'COURSE_COMPLETED',
      LESSON_COMPLETE: 'LESSON_COMPLETED',
      LESSON_COMPLETED: 'LESSON_COMPLETED',
      QUIZ_COMPLETE: 'QUIZ_COMPLETED',
      QUIZ_COMPLETED: 'QUIZ_COMPLETED',
      GROUP_JOIN: 'GROUP_JOINED',
      GROUP_JOINED: 'GROUP_JOINED',
      GROUP_POST: 'GROUP_MESSAGE_SENT',
      GROUP_MESSAGE_SENT: 'GROUP_MESSAGE_SENT',
      ACHIEVEMENT_UNLOCK: 'ACHIEVEMENT_UNLOCKED',
      ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
    }

    const normalized = synonyms[activityType] as ActivityType | undefined
    if (!normalized) {
      return NextResponse.json({ error: 'Tipo de atividade inválido' }, { status: 400 })
    }

    await achievementEngine.processActivity({
      userId,
      type: normalized,
      data: metadata || {},
      timestamp: new Date(),
    })

    // Simple points mapping (mirror of /api/gamification/activity)
    const pointSettings = await getGamificationPointSettings()
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
      REVIEW_SUBMIT: pointSettings.activityReviewSubmitPoints,
    }

    let points = 0
    if (pointsMap[activityType]) {
      const p = pointsMap[activityType]
      points = p

      // Upsert user points
      let userPoints = await prisma.userPoints.findUnique({ where: { userId } })
      if (!userPoints) {
        userPoints = await prisma.userPoints.create({
          data: { userId, totalPoints: 0, currentLevel: 1, pointsToNext: 100 },
        })
      }

      const previousLevel = userPoints.currentLevel
      const newTotal = userPoints.totalPoints + p
      let newLevel = userPoints.currentLevel
      let pointsToNext = userPoints.pointsToNext
      let carry = newTotal
      while (carry >= pointsToNext) {
        carry -= pointsToNext
        newLevel += 1
        pointsToNext = Math.floor(100 * Math.pow(1.5, newLevel - 1))
      }

      await prisma.userPoints.update({
        where: { userId },
        data: { totalPoints: newTotal, currentLevel: newLevel, pointsToNext },
      })

      await prisma.pointTransaction.create({
        data: {
          userId,
          type: 'EARNED',
          points: p,
          reason: `Atividade: ${activityType}`,
          description: `Atividade: ${activityType}`,
          metadata: metadata || {},
        },
      })
    }

    return NextResponse.json({ success: true, points })
  } catch (error) {
    if ((error as any)?.issues) {
      return NextResponse.json({ error: 'Dados inválidos', details: (error as any).issues }, { status: 400 })
    }
    console.error('Erro no webhook de gamificação (activity):', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
