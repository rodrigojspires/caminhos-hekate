'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Event, EventReminder } from '@/types/events'
import { useGamification } from './useGamification'

interface RecurringEventNotification {
  id: string
  type: 'EVENT_REMINDER' | 'EVENT_CREATED' | 'EVENT_UPDATED' | 'EVENT_CONFLICT' | 'SERIES_COMPLETED'
  title: string
  message: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  read: boolean
  createdAt: string
  data: {
    eventId?: string
    eventTitle?: string
    eventDate?: string
    eventTime?: string
    eventLocation?: string
    seriesId?: string
    instanceDate?: string
    reminderType?: string
    timeUntilEvent?: string
    isException?: boolean
    isModified?: boolean
    originalDate?: string
    newDate?: string
    totalCompleted?: number
    pointsEarned?: number
    conflictingEventIds?: string[]
    conflictingEventTitles?: string[]
  }
}

interface ReminderSettings {
  enableEmailReminders: boolean
  enablePushReminders: boolean
  enableSMSReminders: boolean
  defaultReminderTimes: number[] // em minutos antes do evento
  smartReminders: boolean // lembretes baseados em localização/contexto
  quietHours: {
    enabled: boolean
    start: string // HH:mm
    end: string // HH:mm
  }
}

export const useRecurringEventNotifications = () => {
  const { data: session } = useSession()
  const { awardPoints } = useGamification()
  const [notifications, setNotifications] = useState<RecurringEventNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({
    enableEmailReminders: true,
    enablePushReminders: true,
    enableSMSReminders: false,
    defaultReminderTimes: [15, 60, 1440], // 15min, 1h, 1 dia
    smartReminders: true,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00'
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar notificações de eventos recorrentes
  const fetchNotifications = useCallback(async (options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    types?: string[]
  } = {}) => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const params = new URLSearchParams({
        limit: String(options.limit || 20),
        offset: String(options.offset || 0),
        ...(options.unreadOnly && { unreadOnly: 'true' }),
        ...(options.types && { types: options.types.join(',') })
      })

      const response = await fetch(`/api/notifications/recurring-events?${params}`)
      if (!response.ok) {
        throw new Error('Falha ao buscar notificações')
      }

      const data = await response.json()
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao buscar notificações:', err)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  // Marcar notificação como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }, [session?.user?.id])

  // Marcar todas as notificações como lidas
  const markAllAsRead = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH'
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error)
    }
  }, [session?.user?.id])

  // Criar lembrete para evento
  const createEventReminder = useCallback(async (
    eventId: string,
    reminderData: {
      type: 'EMAIL' | 'PUSH' | 'SMS'
      minutesBefore: number
      message?: string
    }
  ) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/events/${eventId}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reminderData)
      })

      if (response.ok) {
        const reminder = await response.json()
        toast.success('Lembrete criado com sucesso!')
        return reminder
      } else {
        throw new Error('Falha ao criar lembrete')
      }
    } catch (error) {
      toast.error('Erro ao criar lembrete')
      console.error('Erro ao criar lembrete:', error)
    }
  }, [session?.user?.id])

  // Atualizar configurações de lembretes
  const updateReminderSettings = useCallback(async (newSettings: Partial<ReminderSettings>) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch('/api/user/reminder-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setReminderSettings(updatedSettings)
        toast.success('Configurações atualizadas!')
      }
    } catch (error) {
      toast.error('Erro ao atualizar configurações')
      console.error('Erro ao atualizar configurações:', error)
    }
  }, [session?.user?.id])

  // Processar notificação de série completada (integração com gamificação)
  const handleSeriesCompleted = useCallback(async (notification: RecurringEventNotification) => {
    if (notification.type === 'SERIES_COMPLETED' && notification.data.pointsEarned) {
      // Mostrar toast especial para série completada
      toast.success(
        `🎉 Série completada! +${notification.data.pointsEarned} pontos`,
        {
          duration: 5000,
          action: {
            label: 'Ver Conquistas',
            onClick: () => {
              // Navegar para página de conquistas
              window.location.href = '/gamification/achievements'
            }
          }
        }
      )

      // Verificar se desbloqueou alguma conquista
      try {
        await awardPoints(
          notification.data.pointsEarned,
          `Série de eventos completada: ${notification.data.eventTitle}`,
          {
            eventId: notification.data.eventId,
            seriesId: notification.data.seriesId,
            totalCompleted: notification.data.totalCompleted
          }
        )
      } catch (error) {
        console.error('Erro ao processar pontos da série:', error)
      }
    }
  }, [awardPoints])

  // Mostrar notificação toast baseada no tipo
  const showNotificationToast = useCallback((notification: RecurringEventNotification) => {
    const { type, title, message, priority, data } = notification

    const toastOptions = {
      duration: priority === 'URGENT' ? 10000 : priority === 'HIGH' ? 7000 : 5000
    }

    switch (type) {
      case 'EVENT_REMINDER':
        toast.info(`⏰ ${title}`, {
          description: message,
          ...toastOptions,
          action: data.eventId ? {
            label: 'Ver Evento',
            onClick: () => window.location.href = `/events/${data.eventId}`
          } : undefined
        })
        break

      case 'EVENT_CONFLICT':
        toast.warning(`⚠️ ${title}`, {
          description: message,
          ...toastOptions,
          action: {
            label: 'Resolver',
            onClick: () => window.location.href = '/calendar'
          }
        })
        break

      case 'SERIES_COMPLETED':
        handleSeriesCompleted(notification)
        break

      case 'EVENT_UPDATED':
        if (data.isException) {
          toast.warning(`🔄 ${title}`, {
            description: message,
            ...toastOptions
          })
        } else {
          toast.info(`📅 ${title}`, {
            description: message,
            ...toastOptions
          })
        }
        break

      default:
        toast.info(title, {
          description: message,
          ...toastOptions
        })
    }
  }, [handleSeriesCompleted])

  // Verificar se está em horário silencioso
  const isQuietHours = useCallback(() => {
    if (!reminderSettings.quietHours.enabled) return false

    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const { start, end } = reminderSettings.quietHours

    if (start <= end) {
      return currentTime >= start && currentTime <= end
    } else {
      // Horário que cruza meia-noite
      return currentTime >= start || currentTime <= end
    }
  }, [reminderSettings.quietHours])

  // Processar notificações em tempo real
  useEffect(() => {
    if (!session?.user?.id) return

    const eventSource = new EventSource('/api/notifications/stream')
    
    eventSource.onmessage = (event) => {
      try {
        const notification: RecurringEventNotification = JSON.parse(event.data)
        
        // Adicionar à lista de notificações
        setNotifications(prev => [notification, ...prev])
        setUnreadCount(prev => prev + 1)
        
        // Mostrar toast se não estiver em horário silencioso
        if (!isQuietHours()) {
          showNotificationToast(notification)
        }
      } catch (error) {
        console.error('Erro ao processar notificação em tempo real:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Erro na conexão de notificações:', error)
    }

    return () => {
      eventSource.close()
    }
  }, [session?.user?.id, isQuietHours, showNotificationToast])

  // Carregar dados iniciais
  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
    }
  }, [session?.user?.id, fetchNotifications])

  return {
    notifications,
    unreadCount,
    reminderSettings,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createEventReminder,
    updateReminderSettings,
    showNotificationToast,
    isQuietHours
  }
}

export default useRecurringEventNotifications