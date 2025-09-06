'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface UserPoints {
  id: string
  userId: string
  totalPoints: number
  currentLevel: number
  pointsToNext: number
  updatedAt: string
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  points: number
  categoryId: string
  category?: {
    id: string
    name: string
    color: string
  }
  unlocked?: boolean
  unlockedAt?: string
  progress?: number
  maxProgress?: number
}

interface UserStreak {
  id: string
  userId: string
  type: string
  currentStreak: number
  longestStreak: number
  lastActivityDate: string
  isActive: boolean
}

interface Badge {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  color: string
  earned?: boolean
  earnedAt?: string
}

interface GamificationNotification {
  id: string
  type: 'ACHIEVEMENT_UNLOCKED' | 'LEVEL_UP' | 'STREAK_MILESTONE' | 'BADGE_EARNED' | 'POINTS_AWARDED'
  title: string
  message: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  read: boolean
  createdAt: string
  metadata?: Record<string, any>
}

interface LeaderboardEntry {
  id: string
  userId: string
  user: {
    id: string
    name: string
    image?: string
  }
  points: number
  level: number
  rank: number
}

interface GamificationStats {
  totalAchievements: number
  unlockedAchievements: number
  totalBadges: number
  earnedBadges: number
  currentLevel: number
  totalPoints: number
  activeStreaks: number
  longestStreak: number
  leaderboardRank: number
}

export const useGamification = () => {
  const { data: session } = useSession()
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userStreaks, setUserStreaks] = useState<UserStreak[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [notifications, setNotifications] = useState<GamificationNotification[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<GamificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user points
  const fetchUserPoints = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/gamification/points')
      if (response.ok) {
        const data = await response.json()
        setUserPoints(data)
      }
    } catch (error) {
      console.error('Erro ao buscar pontos do usuário:', error)
    }
  }, [session?.user?.id])

  // Fetch achievements
  const fetchAchievements = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/gamification/achievements')
      if (response.ok) {
        const data = await response.json()
        setAchievements(data)
      }
    } catch (error) {
      console.error('Erro ao buscar conquistas:', error)
    }
  }, [session?.user?.id])

  // Fetch user streaks
  const fetchUserStreaks = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/gamification/streaks')
      if (response.ok) {
        const data = await response.json()
        setUserStreaks(data)
      }
    } catch (error) {
      console.error('Erro ao buscar sequências:', error)
    }
  }, [session?.user?.id])

  // Fetch badges
  const fetchBadges = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/gamification/badges')
      if (response.ok) {
        const data = await response.json()
        setBadges(data)
      }
    } catch (error) {
      console.error('Erro ao buscar badges:', error)
    }
  }, [session?.user?.id])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/gamification/notifications?limit=20')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
    }
  }, [session?.user?.id])

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async (category = 'OVERALL', period = 'ALL_TIME') => {
    try {
      const response = await fetch(`/api/gamification/leaderboard?category=${category}&period=${period}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setLeaderboard(data)
      }
    } catch (error) {
      console.error('Erro ao buscar leaderboard:', error)
    }
  }, [])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/gamification/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }, [session?.user?.id])

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/gamification/notifications/${notificationId}/read`, {
        method: 'PUT'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        )
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }, [])

  // Mark all notifications as read (optimize via API endpoint)
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/notifications/read-all', { method: 'PATCH' })
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      }
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error)
    }
  }, [])

  // Award points
  const awardPoints = useCallback(async (points: number, reason: string, metadata?: Record<string, any>) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/gamification/points/award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          points,
          reason,
          metadata
        })
      })

      if (response.ok) {
        const data = await response.json()
        setUserPoints(data.userPoints)
        
        // Check for level up
        if (data.levelUp) {
          toast.success(`Parabéns! Você subiu para o nível ${data.userPoints.level}!`, {
            duration: 5000
          })
        }
        
        // Refresh achievements and notifications
        await Promise.all([
          fetchAchievements(),
          fetchNotifications()
        ])
        
        return data
      }
    } catch (error) {
      console.error('Erro ao conceder pontos:', error)
      throw error
    }
  }, [session?.user?.id, fetchAchievements, fetchNotifications])

  // Update streak
  const updateStreak = useCallback(async (type: string, metadata?: Record<string, any>) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/gamification/streaks/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          metadata
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update streaks
        await fetchUserStreaks()
        
        // Check for streak milestones
        if (data.milestone) {
          toast.success(`Sequência de ${data.streak.currentStreak} dias em ${type}!`, {
            duration: 5000
          })
        }
        
        // Refresh notifications
        await fetchNotifications()
        
        return data
      }
    } catch (error) {
      console.error('Erro ao atualizar sequência:', error)
      throw error
    }
  }, [session?.user?.id, fetchUserStreaks, fetchNotifications])

  // Process activity (awards points, updates streaks, checks achievements)
  const processActivity = useCallback(async (activityType: string, metadata?: Record<string, any>) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/gamification/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          activityType,
          metadata
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Refresh all gamification data
        await Promise.all([
          fetchUserPoints(),
          fetchAchievements(),
          fetchUserStreaks(),
          fetchBadges(),
          fetchNotifications(),
          fetchStats()
        ])
        
        // Show notifications for new achievements
        if (data.newAchievements?.length > 0) {
          data.newAchievements.forEach((achievement: Achievement) => {
            toast.success(`Nova conquista desbloqueada: ${achievement.name}!`, {
              duration: 5000
            })
          })
        }
        
        // Show notifications for new badges
        if (data.newBadges?.length > 0) {
          data.newBadges.forEach((badge: Badge) => {
            toast.success(`Novo badge conquistado: ${badge.name}!`, {
              duration: 5000
            })
          })
        }
        
        return data
      }
    } catch (error) {
      console.error('Erro ao processar atividade:', error)
      throw error
    }
  }, [session?.user?.id, fetchUserPoints, fetchAchievements, fetchUserStreaks, fetchBadges, fetchNotifications, fetchStats])

  // Initialize data
  useEffect(() => {
    if (session?.user?.id) {
      const initializeData = async () => {
        try {
          setLoading(true)
          setError(null)
          
          await Promise.all([
            fetchUserPoints(),
            fetchAchievements(),
            fetchUserStreaks(),
            fetchBadges(),
            fetchNotifications(),
            fetchLeaderboard(),
            fetchStats()
          ])
        } catch (error) {
          console.error('Erro ao inicializar dados de gamificação:', error)
          setError('Erro ao carregar dados de gamificação')
        } finally {
          setLoading(false)
        }
      }

      initializeData()
    } else {
      setLoading(false)
    }
  }, [session?.user?.id, fetchUserPoints, fetchAchievements, fetchUserStreaks, fetchBadges, fetchNotifications, fetchLeaderboard, fetchStats])

  // Computed values
  const unreadNotificationsCount = notifications.filter(n => !n.read).length
  const progressToNextLevel = userPoints ? 
    ((userPoints.totalPoints / (userPoints.currentLevel * 1000)) * 100) : 0
  const unlockedAchievements = achievements.filter(a => a.unlocked)
  const earnedBadges = badges.filter(b => b.earned)
  const activeStreaks = userStreaks.filter(s => s.isActive)

  return {
    // Data
    userPoints,
    achievements,
    userStreaks,
    badges,
    notifications,
    leaderboard,
    stats,
    
    // Computed values
    unreadNotificationsCount,
    progressToNextLevel,
    unlockedAchievements,
    earnedBadges,
    activeStreaks,
    
    // State
    loading,
    error,
    
    // Actions
    awardPoints,
    updateStreak,
    processActivity,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    
    // Refresh functions
    refreshUserPoints: fetchUserPoints,
    refreshAchievements: fetchAchievements,
    refreshUserStreaks: fetchUserStreaks,
    refreshBadges: fetchBadges,
    refreshNotifications: fetchNotifications,
    refreshLeaderboard: fetchLeaderboard,
    refreshStats: fetchStats
  }
}

export default useGamification
