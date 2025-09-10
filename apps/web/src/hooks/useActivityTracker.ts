'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface ActivityResult {
  success: boolean
  activityType?: string
  newAchievements?: any[]
  newBadges?: any[]
  points?: number
  levelUp?: boolean
  error?: string
}

/**
 * Hook for tracking user activities and triggering gamification
 */
export function useActivityTracker() {
  const [isTracking, setIsTracking] = useState(false)

  const trackActivity = useCallback(async (
    activityType: string,
    metadata: any = {},
    showNotifications: boolean = true
  ): Promise<ActivityResult> => {
    try {
      setIsTracking(true)
      
      const response = await fetch('/api/gamification/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityType,
          metadata
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao processar atividade')
      }

      const result = await response.json()

      // Show notifications for achievements and level ups
      if (showNotifications) {
        if (result.levelUp) {
          toast.success(`🎉 Parabéns! Você subiu para o nível ${result.userPoints?.level}!`, {
            duration: 5000
          })
        }

        if (result.newAchievements?.length > 0) {
          result.newAchievements.forEach((achievement: any) => {
            toast.success(`🏆 Nova conquista desbloqueada: ${achievement.title}!`, {
              duration: 5000
            })
          })
        }

        if (result.newBadges?.length > 0) {
          result.newBadges.forEach((badge: any) => {
            toast.success(`🏅 Nova medalha conquistada: ${badge.name}!`, {
              duration: 5000
            })
          })
        }

        if (result.points > 0) {
          toast.success(`⭐ +${result.points} pontos conquistados!`, {
            duration: 3000
          })
        }
      }

      return result
    } catch (error) {
      console.error('Erro ao rastrear atividade:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    } finally {
      setIsTracking(false)
    }
  }, [])

  // Specific activity tracking methods
  const trackLogin = useCallback((metadata: any = {}) => {
    return trackActivity('LOGIN', metadata, false) // Don't show notifications for login
  }, [trackActivity])

  const trackProfileComplete = useCallback((completionPercentage: number) => {
    return trackActivity('PROFILE_COMPLETE', { completionPercentage })
  }, [trackActivity])

  const trackCourseComplete = useCallback((courseId: string, courseName: string) => {
    return trackActivity('COURSE_COMPLETE', { courseId, courseName })
  }, [trackActivity])

  const trackLessonComplete = useCallback((lessonId: string, courseId: string) => {
    return trackActivity('LESSON_COMPLETE', { lessonId, courseId })
  }, [trackActivity])

  const trackQuizComplete = useCallback((quizId: string, score: number, passed: boolean) => {
    return trackActivity('QUIZ_COMPLETE', { quizId, score, passed })
  }, [trackActivity])

  const trackFirstPurchase = useCallback((amount: number, productId: string) => {
    return trackActivity('FIRST_PURCHASE', { amount, productId })
  }, [trackActivity])

  const trackCommentPost = useCallback((contentId: string, contentType: string) => {
    return trackActivity('COMMENT_POST', { contentId, contentType })
  }, [trackActivity])

  const trackContentShare = useCallback((contentId: string, platform: string) => {
    return trackActivity('SHARE_CONTENT', { contentId, platform })
  }, [trackActivity])

  const trackInviteFriend = useCallback((invitedEmail: string) => {
    return trackActivity('INVITE_FRIEND', { invitedEmail })
  }, [trackActivity])

  const trackGroupJoin = useCallback((groupId: string, groupName: string) => {
    return trackActivity('GROUP_JOIN', { groupId, groupName })
  }, [trackActivity])

  const trackGroupPost = useCallback((groupId: string, postId: string) => {
    return trackActivity('GROUP_POST', { groupId, postId })
  }, [trackActivity])

  const trackReviewSubmit = useCallback((productId: string, rating: number) => {
    return trackActivity('REVIEW_SUBMIT', { productId, rating })
  }, [trackActivity])

  const trackStreakMilestone = useCallback((streakType: string, days: number) => {
    return trackActivity('STREAK_MILESTONE', { streakType, days })
  }, [trackActivity])

  // Batch tracking for multiple activities
  const trackMultipleActivities = useCallback(async (
    activities: Array<{
      activityType: string
      metadata?: any
    }>,
    showNotifications: boolean = true
  ) => {
    const results = []
    
    for (const activity of activities) {
      const result = await trackActivity(
        activity.activityType,
        activity.metadata || {},
        showNotifications && activities.length === 1 // Only show notifications for single activity
      )
      results.push(result)
    }
    
    // Show summary notification for batch operations
    if (showNotifications && activities.length > 1) {
      const totalPoints = results.reduce((sum, r) => sum + (r.points || 0), 0)
      const totalAchievements = results.reduce((sum, r) => sum + (r.newAchievements?.length || 0), 0)
      const totalBadges = results.reduce((sum, r) => sum + (r.newBadges?.length || 0), 0)
      
      if (totalPoints > 0 || totalAchievements > 0 || totalBadges > 0) {
        let message = '🎉 Atividades processadas!'
        if (totalPoints > 0) message += ` +${totalPoints} pontos`
        if (totalAchievements > 0) message += ` ${totalAchievements} conquistas`
        if (totalBadges > 0) message += ` ${totalBadges} medalhas`
        
        toast.success(message, { duration: 5000 })
      }
    }
    
    return results
  }, [trackActivity])

  return {
    // Core tracking
    trackActivity,
    trackMultipleActivities,
    isTracking,
    
    // Specific activities
    trackLogin,
    trackProfileComplete,
    trackCourseComplete,
    trackLessonComplete,
    trackQuizComplete,
    trackFirstPurchase,
    trackCommentPost,
    trackContentShare,
    trackInviteFriend,
    trackGroupJoin,
    trackGroupPost,
    trackReviewSubmit,
    trackStreakMilestone
  }
}