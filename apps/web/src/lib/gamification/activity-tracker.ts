import { achievementEngine } from '@/lib/gamification/achievement-engine'
import { prisma } from '@hekate/database'

/**
 * Activity Tracker - Automatically tracks user activities and triggers gamification
 */
export class ActivityTracker {
  constructor() {
    // Using singleton instances imported at module level
  }

  /**
   * Track user login activity
   */
  async trackLogin(userId: string, metadata: any = {}) {
    return this.processActivity(userId, 'LOGIN', {
      timestamp: new Date().toISOString(),
      ...metadata
    })
  }

  /**
   * Track profile completion
   */
  async trackProfileComplete(userId: string, completionPercentage: number) {
    return this.processActivity(userId, 'PROFILE_COMPLETE', {
      completionPercentage,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track course completion
   */
  async trackCourseComplete(userId: string, courseId: string, courseName: string) {
    return this.processActivity(userId, 'COURSE_COMPLETE', {
      courseId,
      courseName,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track lesson completion
   */
  async trackLessonComplete(userId: string, lessonId: string, courseId: string) {
    return this.processActivity(userId, 'LESSON_COMPLETE', {
      lessonId,
      courseId,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track quiz completion
   */
  async trackQuizComplete(userId: string, quizId: string, score: number, passed: boolean) {
    return this.processActivity(userId, 'QUIZ_COMPLETE', {
      quizId,
      score,
      passed,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track first purchase
   */
  async trackFirstPurchase(userId: string, amount: number, productId: string) {
    return this.processActivity(userId, 'FIRST_PURCHASE', {
      amount,
      productId,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track comment posting
   */
  async trackCommentPost(userId: string, contentId: string, contentType: string) {
    return this.processActivity(userId, 'COMMENT_POST', {
      contentId,
      contentType,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track content sharing
   */
  async trackContentShare(userId: string, contentId: string, platform: string) {
    return this.processActivity(userId, 'SHARE_CONTENT', {
      contentId,
      platform,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track friend invitation
   */
  async trackInviteFriend(userId: string, invitedEmail: string) {
    return this.processActivity(userId, 'INVITE_FRIEND', {
      invitedEmail,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track group joining
   */
  async trackGroupJoin(userId: string, groupId: string, groupName: string) {
    return this.processActivity(userId, 'GROUP_JOIN', {
      groupId,
      groupName,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track group post
   */
  async trackGroupPost(userId: string, groupId: string, postId: string) {
    return this.processActivity(userId, 'GROUP_POST', {
      groupId,
      postId,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track review submission
   */
  async trackReviewSubmit(userId: string, productId: string, rating: number) {
    return this.processActivity(userId, 'REVIEW_SUBMIT', {
      productId,
      rating,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Track streak milestone
   */
  async trackStreakMilestone(userId: string, streakType: string, days: number) {
    return this.processActivity(userId, 'STREAK_MILESTONE', {
      streakType,
      days,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Process any activity through the gamification system
   */
  private async processActivity(userId: string, activityType: string, metadata: any = {}) {
    try {
      // Process through achievement engine
      await achievementEngine.processActivity({
        userId,
        type: activityType as any,
        data: metadata,
        timestamp: new Date()
      })

      // Achievement engine handles notifications internally
      
      return {
        success: true,
        activityType,
        metadata
      }
    } catch (error) {
      console.error('Erro ao processar atividade:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  /**
   * Batch process multiple activities
   */
  async batchProcessActivities(activities: Array<{
    userId: string
    activityType: string
    metadata?: any
  }>) {
    const results = []
    
    for (const activity of activities) {
      const result = await this.processActivity(
        activity.userId,
        activity.activityType,
        activity.metadata || {}
      )
      results.push(result)
    }
    
    return results
  }

  /**
   * Get activity tracking statistics
   */
  async getTrackingStats(userId: string, days: number = 30) {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Aproximação com base em pointTransaction e analyticsEvent
      const [txs, evs] = await Promise.all([
        prisma.pointTransaction.findMany({
          where: { userId, createdAt: { gte: startDate } },
          select: { id: true, type: true as any, createdAt: true }
        }),
        prisma.analyticsEvent.findMany({
          where: { userId, timestamp: { gte: startDate } },
          select: { id: true, name: true, timestamp: true }
        })
      ])

      const daysMap: Record<string, number> = {}
      const typeMap: Record<string, number> = {}
      for (const t of txs) {
        const day = new Date(t.createdAt).toISOString().slice(0, 10)
        daysMap[day] = (daysMap[day] || 0) + 1
        typeMap[t.type || 'POINT'] = (typeMap[t.type || 'POINT'] || 0) + 1
      }
      for (const e of evs) {
        const day = new Date(e.timestamp).toISOString().slice(0, 10)
        daysMap[day] = (daysMap[day] || 0) + 1
        typeMap[e.name || 'EVENT'] = (typeMap[e.name || 'EVENT'] || 0) + 1
      }

      const activitiesByDay = Object.entries(daysMap).map(([date, count]) => ({ date, count }))
      const totalActivities = activitiesByDay.reduce((s, d) => s + d.count, 0)
      const averageActivitiesPerDay = Math.round(totalActivities / Math.max(days, 1))
      const mostActiveDay = activitiesByDay.sort((a, b) => b.count - a.count)[0]?.date || null

      return {
        totalActivities,
        activitiesByType: typeMap,
        activitiesByDay,
        mostActiveDay,
        averageActivitiesPerDay
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de tracking:', error)
      return null
    }
  }
}

// Singleton instance
export const activityTracker = new ActivityTracker()
