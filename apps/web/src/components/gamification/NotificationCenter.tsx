'use client'

import React, { useState, useEffect } from 'react'
import { Bell, X, Check, CheckCheck, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  metadata?: Record<string, any>
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  isRead: boolean
  createdAt: string
  readAt?: string
}

interface NotificationCenterProps {
  className?: string
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      })
      
      if (filter === 'unread') {
        params.append('unreadOnly', 'true')
      }
      
      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      const response = await fetch(`/api/gamification/notifications?${params}`)
      const data = await response.json()

      if (data.success) {
        setNotifications(data.data.notifications)
        setUnreadCount(data.data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Erro ao carregar notificações')
    } finally {
      setLoading(false)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/gamification/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/gamification/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ markAllAsRead: true })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        )
        setUnreadCount(0)
        toast.success('Todas as notificações foram marcadas como lidas')
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Erro ao marcar notificações como lidas')
    }
  }

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/gamification/notifications?id=${notificationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        toast.success('Notificação removida')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Erro ao remover notificação')
    }
  }

  // Get notification icon
  const getNotificationIcon = (type: string, metadata?: Record<string, any>) => {
    const icon = metadata?.icon
    if (icon) return icon

    switch (type) {
      case 'ACHIEVEMENT_UNLOCKED': return '🏆'
      case 'LEVEL_UP': return '⬆️'
      case 'POINTS_EARNED': return '💰'
      case 'EVENT_REMINDER': return '📅'
      case 'STREAK_MILESTONE': return '🔥'
      case 'REWARD_AVAILABLE': return '🎁'
      case 'LEADERBOARD_POSITION': return '🏅'
      case 'SYSTEM_ANNOUNCEMENT': return '📢'
      default: return '🔔'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'border-l-red-500 bg-red-50'
      case 'HIGH': return 'border-l-orange-500 bg-orange-50'
      case 'MEDIUM': return 'border-l-blue-500 bg-blue-50'
      case 'LOW': return 'border-l-gray-500 bg-gray-50'
      default: return 'border-l-gray-500 bg-gray-50'
    }
  }

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h atrás`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d atrás`
    
    return date.toLocaleDateString('pt-BR')
  }

  useEffect(() => {
    fetchNotifications()
  }, [filter, typeFilter])

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notificações</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2 mt-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">Todas</option>
                <option value="unread">Não lidas</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">Todos os tipos</option>
                <option value="ACHIEVEMENT_UNLOCKED">Conquistas</option>
                <option value="LEVEL_UP">Nível</option>
                <option value="POINTS_EARNED">Pontos</option>
                <option value="EVENT_REMINDER">Eventos</option>
                <option value="STREAK_MILESTONE">Sequências</option>
                <option value="REWARD_AVAILABLE">Recompensas</option>
              </select>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar todas
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 border-l-4 ${
                    notification.isRead ? 'bg-white' : getPriorityColor(notification.priority)
                  } hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type, notification.metadata)}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-medium ${
                          notification.isRead ? 'text-gray-700' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h4>
                        
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Marcar como lida"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Remover notificação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <p className={`text-sm mt-1 ${
                        notification.isRead ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {notification.message}
                      </p>
                      
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={fetchNotifications}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Atualizar notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}