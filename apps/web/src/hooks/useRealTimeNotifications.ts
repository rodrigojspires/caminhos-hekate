'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  content: string
  type: 'NEW_LESSON' | 'NEW_POST' | 'COMMENT_REPLY' | 'COURSE_COMPLETED' | 'SUBSCRIPTION_EXPIRING' | 'ORDER_STATUS' | 'SYSTEM_ANNOUNCEMENT' | 'SECURITY_ALERT'
  read: boolean
  createdAt: string
  status: 'pending' | 'sent' | 'failed'
  channel: 'EMAIL' | 'WHATSAPP' | 'BOTH'
  metadata?: any
}

interface SSEMessage {
  type: 'connected' | 'notifications' | 'error'
  data?: Notification[]
  count?: number
  message?: string
  timestamp: string
}

interface UseRealTimeNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isConnected: boolean
  error: string | null
  reconnect: () => void
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

export function useRealTimeNotifications(): UseRealTimeNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const response = await fetch('/api/gamification/notifications?limit=50')
        if (!response.ok) return
        const payload = await response.json()
        const list = payload?.data?.notifications || []
        if (!isMounted) return
        setNotifications(list.map((notification: any) => ({
          id: notification.id,
          title: notification.title,
          content: notification.message,
          type: notification.type || 'SYSTEM_ANNOUNCEMENT',
          read: notification.read,
          createdAt: new Date(notification.createdAt).toISOString(),
          status: notification.read ? 'sent' : 'pending',
          channel: 'EMAIL',
          metadata: notification.metadata || notification.data,
        })))
      } catch (err) {
        console.error('Erro ao carregar notificações iniciais:', err)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const eventSource = new EventSource('/api/notifications/stream')
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
        setReconnectAttempts(0)
        console.log('Conexão SSE estabelecida')
      }

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data)
          
          switch (message.type) {
            case 'connected':
              console.log('Conectado ao stream de notificações')
              break
              
            case 'notifications':
              if (message.data) {
                setNotifications(prev => {
                  // Merge com notificações existentes, evitando duplicatas
                  const existingIds = new Set(prev.map(n => n.id))
                  const newNotifications = message.data!.filter(n => !existingIds.has(n.id))
                  
                  // Mostrar toast para novas notificações
                  newNotifications.forEach(notification => {
                    if (!notification.read) {
                      toast.info(notification.title, {
                        description: notification.content,
                        duration: 5000
                      })
                    }
                  })
                  
                  return [...newNotifications, ...prev]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 50) // Manter apenas as 50 mais recentes
                })
              }
              break
              
            case 'error':
              setError(message.message || 'Erro desconhecido')
              console.error('Erro no stream:', message.message)
              break
          }
        } catch (err) {
          console.error('Erro ao processar mensagem SSE:', err)
        }
      }

      eventSource.onerror = (event) => {
        console.error('Erro na conexão SSE:', event)
        setIsConnected(false)
        setError('Erro na conexão')
        
        // Tentar reconectar com backoff exponencial
        if (reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connect()
          }, delay)
        }
      }
    } catch (err) {
      console.error('Erro ao criar EventSource:', err)
      setError('Erro ao conectar')
    }
  }, [reconnectAttempts])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsConnected(false)
  }, [])

  const reconnect = useCallback(() => {
    disconnect()
    setReconnectAttempts(0)
    connect()
  }, [connect, disconnect])

  // API calls para gerenciar notificações
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        )
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
      toast.error('Erro ao marcar notificação como lida')
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      // Prefer gamification endpoint for bulk read-all
      let ok = false
      try {
        const resGam = await fetch('/api/gamification/notifications/read-all', { method: 'PATCH' })
        ok = resGam.ok
      } catch {}

      if (!ok) {
        // Fallback to generic notifications bulk API
        const response = await fetch('/api/notifications/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_all_read' })
        })
        ok = response.ok
      }

      if (ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        toast.success('Todas as notificações foram marcadas como lidas')
      } else {
        toast.error('Falha ao marcar todas as notificações como lidas')
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error)
      toast.error('Erro ao marcar todas as notificações como lidas')
    }
  }, [])

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        toast.success('Notificação excluída')
      }
    } catch (error) {
      console.error('Erro ao excluir notificação:', error)
      toast.error('Erro ao excluir notificação')
    }
  }, [])

  const clearAll = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_all' })
      })

      if (response.ok) {
        setNotifications([])
        toast.success('Todas as notificações foram excluídas')
      }
    } catch (error) {
      console.error('Erro ao limpar todas as notificações:', error)
      toast.error('Erro ao limpar todas as notificações')
    }
  }, [])

  // Conectar ao montar e desconectar ao desmontar
  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    reconnect,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  }
}
