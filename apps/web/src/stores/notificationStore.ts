'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  avatar?: string
  role: 'student' | 'instructor' | 'admin' | 'moderator'
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'course' | 'community' | 'system' | 'achievement'
  title: string
  message: string
  description?: string
  
  // Metadata
  userId: string
  createdAt: Date
  readAt?: Date
  isRead: boolean
  isPinned: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Actions
  actions?: {
    id: string
    label: string
    type: 'primary' | 'secondary' | 'danger'
    url?: string
    action?: string
  }[]
  
  // Rich content
  icon?: string
  image?: string
  avatar?: string
  
  // Related entities
  relatedId?: string // course, post, comment, etc.
  relatedType?: 'course' | 'lesson' | 'post' | 'comment' | 'user' | 'achievement' | 'system'
  
  // Delivery
  channels: ('in-app' | 'email' | 'push' | 'sms')[]
  deliveredAt?: Date
  
  // Expiration
  expiresAt?: Date
  
  // Grouping
  groupId?: string
  category?: string
  tags?: string[]
}

interface NotificationTemplate {
  id: string
  name: string
  type: Notification['type']
  title: string
  message: string
  description?: string
  icon?: string
  priority: Notification['priority']
  channels: Notification['channels']
  variables: string[] // Template variables like {userName}, {courseName}
  isActive: boolean
}

interface NotificationPreferences {
  userId: string
  
  // Channel preferences
  inApp: boolean
  email: boolean
  push: boolean
  sms: boolean
  
  // Type preferences
  course: boolean
  community: boolean
  system: boolean
  achievement: boolean
  
  // Timing preferences
  quietHours: {
    enabled: boolean
    start: string // HH:mm format
    end: string // HH:mm format
    timezone: string
  }
  
  // Frequency preferences
  digest: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string // HH:mm format
    days?: number[] // 0-6, Sunday-Saturday for weekly
  }
  
  // Advanced preferences
  groupSimilar: boolean
  autoMarkRead: boolean
  showPreviews: boolean
}

interface NotificationStats {
  total: number
  unread: number
  byType: Record<Notification['type'], number>
  byPriority: Record<Notification['priority'], number>
  recentActivity: {
    today: number
    thisWeek: number
    thisMonth: number
  }
}

interface NotificationFilters {
  type?: Notification['type']
  priority?: Notification['priority']
  isRead?: boolean
  isPinned?: boolean
  category?: string
  relatedType?: Notification['relatedType']
  dateRange?: {
    start: Date
    end: Date
  }
  tags?: string[]
}

interface NotificationStore {
  // State
  notifications: Notification[]
  templates: NotificationTemplate[]
  preferences: Record<string, NotificationPreferences>
  isLoading: boolean
  error: string | null
  filters: NotificationFilters
  
  // Notification Management
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => string
  updateNotification: (id: string, updates: Partial<Notification>) => void
  deleteNotification: (id: string) => void
  getNotification: (id: string) => Notification | null
  
  // Bulk operations
  markAllAsRead: (userId: string) => void
  markAsRead: (id: string) => void
  markAsUnread: (id: string) => void
  deleteAll: (userId: string) => void
  deleteRead: (userId: string) => void
  deleteOld: (userId: string, days: number) => void
  
  // Pin/Unpin
  pinNotification: (id: string) => void
  unpinNotification: (id: string) => void
  
  // Filtering and Search
  setFilters: (filters: Partial<NotificationFilters>) => void
  clearFilters: () => void
  getFilteredNotifications: (userId: string) => Notification[]
  searchNotifications: (userId: string, query: string) => Notification[]
  
  // User-specific queries
  getUserNotifications: (userId: string) => Notification[]
  getUnreadNotifications: (userId: string) => Notification[]
  getPinnedNotifications: (userId: string) => Notification[]
  getNotificationsByType: (userId: string, type: Notification['type']) => Notification[]
  getNotificationsByPriority: (userId: string, priority: Notification['priority']) => Notification[]
  
  // Statistics
  getStats: (userId: string) => NotificationStats
  getUnreadCount: (userId: string) => number
  
  // Templates
  setTemplates: (templates: NotificationTemplate[]) => void
  addTemplate: (template: Omit<NotificationTemplate, 'id'>) => string
  updateTemplate: (id: string, updates: Partial<NotificationTemplate>) => void
  deleteTemplate: (id: string) => void
  getTemplate: (id: string) => NotificationTemplate | null
  createFromTemplate: (templateId: string, variables: Record<string, string>, userId: string) => string | null
  
  // Preferences
  setPreferences: (userId: string, preferences: NotificationPreferences) => void
  getPreferences: (userId: string) => NotificationPreferences
  updatePreferences: (userId: string, updates: Partial<NotificationPreferences>) => void
  
  // Delivery
  shouldDeliverNotification: (notification: Notification, userId: string) => boolean
  getDeliveryChannels: (notification: Notification, userId: string) => Notification['channels']
  
  // Grouping
  groupNotifications: (notifications: Notification[]) => Record<string, Notification[]>
  
  // Quick actions
  createCourseNotification: (userId: string, courseId: string, type: 'enrolled' | 'completed' | 'new_lesson' | 'reminder', data?: any) => string
  createCommunityNotification: (userId: string, postId: string, type: 'new_post' | 'new_comment' | 'post_liked' | 'mentioned', data?: any) => string
  createSystemNotification: (userId: string, type: 'maintenance' | 'update' | 'security' | 'announcement', data?: any) => string
  createAchievementNotification: (userId: string, achievementId: string, data?: any) => string
  
  // Utility
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const defaultPreferences: NotificationPreferences = {
  userId: '',
  inApp: true,
  email: true,
  push: true,
  sms: false,
  course: true,
  community: true,
  system: true,
  achievement: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'UTC'
  },
  digest: {
    enabled: false,
    frequency: 'daily',
    time: '09:00'
  },
  groupSimilar: true,
  autoMarkRead: false,
  showPreviews: true
}

const initialState = {
  notifications: [],
  templates: [],
  preferences: {},
  isLoading: false,
  error: null,
  filters: {}
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Notification Management
      setNotifications: (notifications) => set({ notifications }),
      
      addNotification: (notificationData) => {
        const newNotification: Notification = {
          ...notificationData,
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          isRead: false
        }
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications]
        }))
        
        return newNotification.id
      },
      
      updateNotification: (id, updates) => set((state) => ({
        notifications: state.notifications.map(notification => 
          notification.id === id 
            ? { ...notification, ...updates }
            : notification
        )
      })),
      
      deleteNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(notification => notification.id !== id)
      })),
      
      getNotification: (id) => {
        const { notifications } = get()
        return notifications.find(notification => notification.id === id) || null
      },
      
      // Bulk operations
      markAllAsRead: (userId) => {
        const now = new Date()
        set((state) => ({
          notifications: state.notifications.map(notification => 
            notification.userId === userId && !notification.isRead
              ? { ...notification, isRead: true, readAt: now }
              : notification
          )
        }))
      },
      
      markAsRead: (id) => {
        get().updateNotification(id, {
          isRead: true,
          readAt: new Date()
        })
      },
      
      markAsUnread: (id) => {
        get().updateNotification(id, {
          isRead: false,
          readAt: undefined
        })
      },
      
      deleteAll: (userId) => set((state) => ({
        notifications: state.notifications.filter(notification => notification.userId !== userId)
      })),
      
      deleteRead: (userId) => set((state) => ({
        notifications: state.notifications.filter(notification => 
          !(notification.userId === userId && notification.isRead)
        )
      })),
      
      deleteOld: (userId, days) => {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        
        set((state) => ({
          notifications: state.notifications.filter(notification => 
            !(notification.userId === userId && notification.createdAt < cutoffDate)
          )
        }))
      },
      
      // Pin/Unpin
      pinNotification: (id) => {
        get().updateNotification(id, { isPinned: true })
      },
      
      unpinNotification: (id) => {
        get().updateNotification(id, { isPinned: false })
      },
      
      // Filtering and Search
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      
      clearFilters: () => set({ filters: {} }),
      
      getFilteredNotifications: (userId) => {
        const { notifications, filters } = get()
        
        let filtered = notifications.filter(notification => notification.userId === userId)
        
        if (filters.type) {
          filtered = filtered.filter(notification => notification.type === filters.type)
        }
        
        if (filters.priority) {
          filtered = filtered.filter(notification => notification.priority === filters.priority)
        }
        
        if (filters.isRead !== undefined) {
          filtered = filtered.filter(notification => notification.isRead === filters.isRead)
        }
        
        if (filters.isPinned !== undefined) {
          filtered = filtered.filter(notification => notification.isPinned === filters.isPinned)
        }
        
        if (filters.category) {
          filtered = filtered.filter(notification => notification.category === filters.category)
        }
        
        if (filters.relatedType) {
          filtered = filtered.filter(notification => notification.relatedType === filters.relatedType)
        }
        
        if (filters.dateRange) {
          filtered = filtered.filter(notification => 
            notification.createdAt >= filters.dateRange!.start &&
            notification.createdAt <= filters.dateRange!.end
          )
        }
        
        if (filters.tags && filters.tags.length > 0) {
          filtered = filtered.filter(notification => 
            notification.tags && filters.tags!.some(tag => notification.tags!.includes(tag))
          )
        }
        
        // Sort: pinned first, then by priority, then by date
        return filtered.sort((a, b) => {
          // Pinned notifications first
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          
          // Then by priority
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          const aPriority = priorityOrder[a.priority]
          const bPriority = priorityOrder[b.priority]
          if (aPriority !== bPriority) return bPriority - aPriority
          
          // Finally by date (newest first)
          return b.createdAt.getTime() - a.createdAt.getTime()
        })
      },
      
      searchNotifications: (userId, query) => {
        const { notifications } = get()
        
        if (!query.trim()) return get().getUserNotifications(userId)
        
        const lowercaseQuery = query.toLowerCase()
        return notifications
          .filter(notification => notification.userId === userId)
          .filter(notification => 
            notification.title.toLowerCase().includes(lowercaseQuery) ||
            notification.message.toLowerCase().includes(lowercaseQuery) ||
            (notification.description && notification.description.toLowerCase().includes(lowercaseQuery)) ||
            (notification.category && notification.category.toLowerCase().includes(lowercaseQuery)) ||
            (notification.tags && notification.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
          )
      },
      
      // User-specific queries
      getUserNotifications: (userId) => {
        const { notifications } = get()
        return notifications
          .filter(notification => notification.userId === userId)
          .sort((a, b) => {
            // Pinned first
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            // Then by date
            return b.createdAt.getTime() - a.createdAt.getTime()
          })
      },
      
      getUnreadNotifications: (userId) => {
        return get().getUserNotifications(userId).filter(notification => !notification.isRead)
      },
      
      getPinnedNotifications: (userId) => {
        return get().getUserNotifications(userId).filter(notification => notification.isPinned)
      },
      
      getNotificationsByType: (userId, type) => {
        return get().getUserNotifications(userId).filter(notification => notification.type === type)
      },
      
      getNotificationsByPriority: (userId, priority) => {
        return get().getUserNotifications(userId).filter(notification => notification.priority === priority)
      },
      
      // Statistics
      getStats: (userId) => {
        const notifications = get().getUserNotifications(userId)
        
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        const byType: Record<Notification['type'], number> = {
          info: 0,
          success: 0,
          warning: 0,
          error: 0,
          course: 0,
          community: 0,
          system: 0,
          achievement: 0
        }
        
        const byPriority: Record<Notification['priority'], number> = {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0
        }
        
        let todayCount = 0
        let thisWeekCount = 0
        let thisMonthCount = 0
        
        notifications.forEach(notification => {
          byType[notification.type]++
          byPriority[notification.priority]++
          
          if (notification.createdAt >= today) todayCount++
          if (notification.createdAt >= thisWeek) thisWeekCount++
          if (notification.createdAt >= thisMonth) thisMonthCount++
        })
        
        return {
          total: notifications.length,
          unread: notifications.filter(n => !n.isRead).length,
          byType,
          byPriority,
          recentActivity: {
            today: todayCount,
            thisWeek: thisWeekCount,
            thisMonth: thisMonthCount
          }
        }
      },
      
      getUnreadCount: (userId) => {
        return get().getUnreadNotifications(userId).length
      },
      
      // Templates
      setTemplates: (templates) => set({ templates }),
      
      addTemplate: (templateData) => {
        const newTemplate: NotificationTemplate = {
          ...templateData,
          id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
        
        set((state) => ({
          templates: [...state.templates, newTemplate]
        }))
        
        return newTemplate.id
      },
      
      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map(template => 
          template.id === id ? { ...template, ...updates } : template
        )
      })),
      
      deleteTemplate: (id) => set((state) => ({
        templates: state.templates.filter(template => template.id !== id)
      })),
      
      getTemplate: (id) => {
        const { templates } = get()
        return templates.find(template => template.id === id) || null
      },
      
      createFromTemplate: (templateId, variables, userId) => {
        const template = get().getTemplate(templateId)
        if (!template || !template.isActive) return null
        
        let title = template.title
        let message = template.message
        let description = template.description
        
        // Replace variables
        Object.entries(variables).forEach(([key, value]) => {
          const placeholder = `{${key}}`
          title = title.replace(new RegExp(placeholder, 'g'), value)
          message = message.replace(new RegExp(placeholder, 'g'), value)
          if (description) {
            description = description.replace(new RegExp(placeholder, 'g'), value)
          }
        })
        
        return get().addNotification({
          type: template.type,
          title,
          message,
          description,
          userId,
          priority: template.priority,
          channels: template.channels,
          icon: template.icon,
          isPinned: false
        })
      },
      
      // Preferences
      setPreferences: (userId, preferences) => set((state) => ({
        preferences: {
          ...state.preferences,
          [userId]: { ...preferences, userId }
        }
      })),
      
      getPreferences: (userId) => {
        const { preferences } = get()
        return preferences[userId] || { ...defaultPreferences, userId }
      },
      
      updatePreferences: (userId, updates) => {
        const currentPreferences = get().getPreferences(userId)
        get().setPreferences(userId, { ...currentPreferences, ...updates })
      },
      
      // Delivery
      shouldDeliverNotification: (notification, userId) => {
        const preferences = get().getPreferences(userId)
        
        // Check if notification type is enabled
        if (!preferences[notification.type as keyof NotificationPreferences]) {
          return false
        }
        
        // Check quiet hours
        if (preferences.quietHours.enabled) {
          const now = new Date()
          const currentTime = now.toTimeString().slice(0, 5) // HH:mm format
          
          if (currentTime >= preferences.quietHours.start || currentTime <= preferences.quietHours.end) {
            // Only allow urgent notifications during quiet hours
            return notification.priority === 'urgent'
          }
        }
        
        return true
      },
      
      getDeliveryChannels: (notification, userId) => {
        const preferences = get().getPreferences(userId)
        
        return notification.channels.filter(channel => {
          switch (channel) {
            case 'in-app':
              return preferences.inApp
            case 'email':
              return preferences.email
            case 'push':
              return preferences.push
            case 'sms':
              return preferences.sms
            default:
              return false
          }
        })
      },
      
      // Grouping
      groupNotifications: (notifications) => {
        const groups: Record<string, Notification[]> = {}
        
        notifications.forEach(notification => {
          const groupKey = notification.groupId || notification.type
          if (!groups[groupKey]) {
            groups[groupKey] = []
          }
          groups[groupKey].push(notification)
        })
        
        return groups
      },
      
      // Quick actions
      createCourseNotification: (userId, courseId, type, data = {}) => {
        const notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'> = {
          type: 'course',
          userId,
          priority: 'medium',
          channels: ['in-app', 'email'],
          isPinned: false,
          relatedId: courseId,
          relatedType: 'course',
          title: '',
          message: ''
        }
        
        switch (type) {
          case 'enrolled':
            notificationData.title = 'Inscrição Confirmada'
            notificationData.message = `Você foi inscrito no curso ${data.courseName || 'curso'}`
            notificationData.icon = 'BookOpen'
            break
          case 'completed':
            notificationData.title = 'Curso Concluído!'
            notificationData.message = `Parabéns! Você concluiu o curso ${data.courseName || 'curso'}`
            notificationData.type = 'success'
            notificationData.icon = 'Trophy'
            break
          case 'new_lesson':
            notificationData.title = 'Nova Aula Disponível'
            notificationData.message = `Uma nova aula foi adicionada ao curso ${data.courseName || 'curso'}`
            notificationData.icon = 'Play'
            break
          case 'reminder':
            notificationData.title = 'Lembrete de Estudo'
            notificationData.message = `Continue seus estudos no curso ${data.courseName || 'curso'}`
            notificationData.priority = 'low'
            notificationData.icon = 'Clock'
            break
        }
        
        return get().addNotification(notificationData)
      },
      
      createCommunityNotification: (userId, postId, type, data = {}) => {
        const notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'> = {
          type: 'community',
          userId,
          priority: 'low',
          channels: ['in-app'],
          isPinned: false,
          relatedId: postId,
          relatedType: 'post',
          title: '',
          message: ''
        }
        
        switch (type) {
          case 'new_post':
            notificationData.title = 'Novo Post na Comunidade'
            notificationData.message = `${data.authorName || 'Alguém'} publicou um novo post`
            notificationData.icon = 'MessageSquare'
            break
          case 'new_comment':
            notificationData.title = 'Novo Comentário'
            notificationData.message = `${data.authorName || 'Alguém'} comentou no seu post`
            notificationData.priority = 'medium'
            notificationData.icon = 'MessageCircle'
            break
          case 'post_liked':
            notificationData.title = 'Post Curtido'
            notificationData.message = `${data.authorName || 'Alguém'} curtiu seu post`
            notificationData.icon = 'Heart'
            break
          case 'mentioned':
            notificationData.title = 'Você foi Mencionado'
            notificationData.message = `${data.authorName || 'Alguém'} mencionou você em um post`
            notificationData.priority = 'medium'
            notificationData.icon = 'AtSign'
            break
        }
        
        return get().addNotification(notificationData)
      },
      
      createSystemNotification: (userId, type, data = {}) => {
        const notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'> = {
          type: 'system',
          userId,
          priority: 'medium',
          channels: ['in-app', 'email'],
          isPinned: false,
          relatedType: 'system',
          title: '',
          message: ''
        }
        
        switch (type) {
          case 'maintenance':
            notificationData.title = 'Manutenção Programada'
            notificationData.message = 'O sistema passará por manutenção programada'
            notificationData.type = 'warning'
            notificationData.priority = 'high'
            notificationData.icon = 'Settings'
            break
          case 'update':
            notificationData.title = 'Atualização Disponível'
            notificationData.message = 'Uma nova versão da plataforma está disponível'
            notificationData.type = 'info'
            notificationData.icon = 'Download'
            break
          case 'security':
            notificationData.title = 'Alerta de Segurança'
            notificationData.message = 'Detectamos atividade suspeita em sua conta'
            notificationData.type = 'warning'
            notificationData.priority = 'high'
            notificationData.icon = 'Shield'
            break
          case 'announcement':
            notificationData.title = 'Anúncio Importante'
            notificationData.message = data.message || 'Temos novidades importantes para você'
            notificationData.type = 'info'
            notificationData.isPinned = true
            notificationData.icon = 'Megaphone'
            break
        }
        
        return get().addNotification(notificationData)
      },
      
      createAchievementNotification: (userId, achievementId, data = {}) => {
        return get().addNotification({
          type: 'achievement',
          title: 'Conquista Desbloqueada!',
          message: `Você desbloqueou a conquista: ${data.achievementName || 'Nova Conquista'}`,
          userId,
          priority: 'medium',
          channels: ['in-app', 'push'],
          isPinned: false,
          relatedId: achievementId,
          relatedType: 'achievement',
          icon: 'Award'
        })
      },
      
      // Utility
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState)
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        notifications: state.notifications,
        templates: state.templates,
        preferences: state.preferences
      })
    }
  )
)

export default useNotificationStore