"use client"

import { useState, useEffect } from "react"
import { Bell, X, Check, Trash2, Settings, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
  priority?: 'low' | 'medium' | 'high'
  category?: string
}

export interface NotificationCenterProps {
  notifications: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onDelete?: (id: string) => void
  onClearAll?: () => void
  className?: string
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  className
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')
  const [showSettings, setShowSettings] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length
  
  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || notification.type === filter
  )

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      case 'system':
        return '⚙️'
      default:
        return 'ℹ️'
    }
  }

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20'
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'error':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      case 'system':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}m atrás`
    if (hours < 24) return `${hours}h atrás`
    if (days < 7) return `${days}d atrás`
    return timestamp.toLocaleDateString('pt-BR')
  }

  return (
    <div className={cn("relative", className)}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notificações
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-2">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as NotificationType | 'all')}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">Todas</option>
                  <option value="info">Info</option>
                  <option value="success">Sucesso</option>
                  <option value="warning">Aviso</option>
                  <option value="error">Erro</option>
                  <option value="system">Sistema</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                  >
                    Limpar todas
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 border-l-4 transition-colors",
                      getNotificationColor(notification.type),
                      !notification.read && "bg-opacity-100",
                      notification.read && "bg-opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <h4 className={cn(
                            "text-sm font-medium",
                            notification.read 
                              ? "text-gray-600 dark:text-gray-400" 
                              : "text-gray-900 dark:text-white"
                          )}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          {notification.actionUrl && notification.actionLabel && (
                            <a
                              href={notification.actionUrl}
                              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
                            >
                              {notification.actionLabel}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {!notification.read && (
                          <button
                            onClick={() => onMarkAsRead?.(notification.id)}
                            className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                            title="Marcar como lida"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete?.(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Excluir notificação"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Configurações de Notificação
              </h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    defaultChecked
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Notificações de sistema
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    defaultChecked
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Notificações de usuários
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    defaultChecked
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Notificações de pedidos
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Hook para gerenciar notificações
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    }
    setNotifications(prev => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  }
}