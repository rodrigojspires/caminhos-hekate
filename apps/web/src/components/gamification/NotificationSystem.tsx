'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import AchievementNotification, { AchievementNotificationData } from './AchievementNotification'
import { useGamificationStore } from '@/stores/gamificationStore'

interface NotificationSystemProps {
  maxNotifications?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  autoClose?: boolean
  duration?: number
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  maxNotifications = 3,
  position = 'top-right',
  autoClose = true,
  duration = 5000
}) => {
  const [notifications, setNotifications] = useState<AchievementNotificationData[]>([])
  const { notifications: storeNotifications } = useGamificationStore()

  // Converter notificações do store para o formato do componente
  useEffect(() => {
    const convertedNotifications = storeNotifications.map(notification => ({
      id: notification.id,
      // Map store lowercase type to UI enum (uppercase)
      type: (notification.type.toUpperCase()) as AchievementNotificationData['type'],
      title: getNotificationTitle(notification.type, notification.data),
      message: getNotificationMessage(notification.type, notification.data),
      data: notification.data,
      priority: getPriority(notification.type),
      createdAt: new Date().toISOString()
    }))

    setNotifications(convertedNotifications.slice(0, maxNotifications))
  }, [storeNotifications, maxNotifications])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    useGamificationStore.getState().removeNotification(id)
  }, [])

  const getNotificationTitle = (type: string, data: any): string => {
    switch (type) {
      case 'achievement_unlocked':
        return '🏆 Conquista Desbloqueada!'
      case 'badge_earned':
        return '🎖️ Badge Conquistado!'
      case 'level_up':
        return '⚡ Subiu de Nível!'
      case 'streak_milestone':
        return '🔥 Marco de Sequência!'
      case 'points_earned':
        return '⭐ Pontos Ganhos!'
      default:
        return '🎉 Notificação'
    }
  }

  const getNotificationMessage = (type: string, data: any): string => {
    switch (type) {
      case 'achievement_unlocked':
        return data?.achievementName 
          ? `Você desbloqueou: ${data.achievementName}`
          : 'Parabéns por desbloquear uma nova conquista!'
      case 'badge_earned':
        return data?.badgeName
          ? `Você ganhou o badge: ${data.badgeName}`
          : 'Parabéns por conquistar um novo badge!'
      case 'level_up':
        return data?.level
          ? `Você alcançou o nível ${data.level}!`
          : 'Parabéns por subir de nível!'
      case 'streak_milestone':
        return data?.days
          ? `${data.days} dias consecutivos de atividade!`
          : 'Você manteve uma sequência impressionante!'
      case 'points_earned':
        return data?.points
          ? `Você ganhou ${data.points} pontos!`
          : 'Pontos adicionados à sua conta!'
      default:
        return 'Você tem uma nova notificação!'
    }
  }

  const getPriority = (type: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' => {
    switch (type) {
      case 'achievement_unlocked':
        return 'HIGH'
      case 'badge_earned':
        return 'HIGH'
      case 'level_up':
        return 'URGENT'
      case 'streak_milestone':
        return 'MEDIUM'
      case 'points_earned':
        return 'LOW'
      default:
        return 'LOW'
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      default:
        return 'top-4 right-4'
    }
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-50 space-y-2 pointer-events-none`}>
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto"
            style={{
              zIndex: 1000 - index
            }}
          >
            <AchievementNotification
              notification={notification}
              onClose={() => removeNotification(notification.id)}
              autoClose={autoClose}
              duration={duration}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Hook para facilitar o uso do sistema de notificações
export const useNotificationSystem = () => {
  const { addNotification } = useGamificationStore()

  const showAchievementNotification = useCallback((data: {
    achievementName: string
    achievementDescription?: string
    rarity?: string
    points?: number
  }) => {
    addNotification({
      type: 'achievement_unlocked',
      title: '🏆 Conquista Desbloqueada!',
      message: data?.achievementName ? `Você desbloqueou: ${data.achievementName}` : 'Parabéns por desbloquear uma nova conquista!',
      isRead: false,
      data
    })
  }, [addNotification])

  const showBadgeNotification = useCallback((data: {
    badgeName: string
    badgeDescription?: string
    rarity?: string
  }) => {
    addNotification({
      type: 'badge_earned',
      title: '🎖️ Badge Conquistado!',
      message: data?.badgeName ? `Você ganhou o badge: ${data.badgeName}` : 'Parabéns por conquistar um novo badge!',
      isRead: false,
      data
    })
  }, [addNotification])

  const showLevelUpNotification = useCallback((data: {
    level: number
    points?: number
  }) => {
    addNotification({
      type: 'level_up',
      title: '⚡ Subiu de Nível!',
      message: data?.level ? `Você alcançou o nível ${data.level}!` : 'Parabéns por subir de nível!',
      isRead: false,
      data
    })
  }, [addNotification])

  const showStreakNotification = useCallback((data: {
    days: number
    points?: number
  }) => {
    addNotification({
      type: 'streak_milestone',
      title: '🔥 Marco de Sequência!',
      message: data?.days ? `${data.days} dias consecutivos de atividade!` : 'Você manteve uma sequência impressionante!',
      isRead: false,
      data
    })
  }, [addNotification])

  const showPointsNotification = useCallback((data: {
    points: number
    reason?: string
  }) => {
    addNotification({
      type: 'points_earned',
      title: '⭐ Pontos Ganhos!',
      message: data?.points ? `Você ganhou ${data.points} pontos!` : 'Pontos adicionados à sua conta!',
      isRead: false,
      data
    })
  }, [addNotification])

  return {
    showAchievementNotification,
    showBadgeNotification,
    showLevelUpNotification,
    showStreakNotification,
    showPointsNotification
  }
}

export default NotificationSystem
