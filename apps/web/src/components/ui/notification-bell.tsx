'use client'

import { Bell, Check, X, Trash2, BookOpen, MessageSquare, Heart, Users, Settings, AlertTriangle, Gift, Calendar, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications'

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

interface NotificationResponse {
  notifications: Notification[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface NotificationBellProps {
  className?: string
  onNotificationClick?: (notification: Notification) => void
}

// Mapear tipos de notificação para cores
const getNotificationTypeColor = (type: Notification['type']) => {
  switch (type) {
    case 'NEW_LESSON':
    case 'NEW_POST':
    case 'COMMENT_REPLY':
      return 'info'
    case 'COURSE_COMPLETED':
    case 'ORDER_STATUS':
      return 'success'
    case 'SUBSCRIPTION_EXPIRING':
      return 'warning'
    case 'SYSTEM_ANNOUNCEMENT':
    case 'SECURITY_ALERT':
      return 'error'
    default:
      return 'info'
  }
}

// Mapear tipos para títulos legíveis
const getNotificationTypeLabel = (type: Notification['type']) => {
  switch (type) {
    case 'NEW_LESSON':
      return 'Nova Aula'
    case 'NEW_POST':
      return 'Nova Publicação'
    case 'COMMENT_REPLY':
      return 'Novo Comentário'
    case 'COURSE_COMPLETED':
      return 'Curso Concluído'
    case 'SUBSCRIPTION_EXPIRING':
      return 'Assinatura Expirando'
    case 'ORDER_STATUS':
      return 'Status do Pedido'
    case 'SYSTEM_ANNOUNCEMENT':
      return 'Anúncio do Sistema'
    case 'SECURITY_ALERT':
      return 'Alerta de Segurança'
    default:
      return 'Notificação'
  }
}

function getNotificationTypeIcon(type: string) {
  const icons: Record<string, JSX.Element> = {
    NEW_LESSON: <BookOpen className="h-4 w-4 text-blue-500" />,
    NEW_POST: <MessageSquare className="h-4 w-4 text-green-500" />,
    NEW_COMMENT: <MessageSquare className="h-4 w-4 text-orange-500" />,
    LIKE_RECEIVED: <Heart className="h-4 w-4 text-red-500" />,
    FOLLOW_RECEIVED: <Users className="h-4 w-4 text-purple-500" />,
    SYSTEM_UPDATE: <Settings className="h-4 w-4 text-gray-500" />,
    SECURITY_ALERT: <AlertTriangle className="h-4 w-4 text-red-600" />,
    PROMOTION: <Gift className="h-4 w-4 text-yellow-500" />,
    EVENT_REMINDER: <Calendar className="h-4 w-4 text-indigo-500" />
  }
  return icons[type] || <Bell className="h-4 w-4 text-gray-500" />
}



const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'Agora mesmo'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes}m atrás`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours}h atrás`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days}d atrás`
  }
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'COURSE_COMPLETED':
    case 'ORDER_STATUS':
      return '✅'
    case 'SUBSCRIPTION_EXPIRING':
      return '⚠️'
    case 'SYSTEM_ANNOUNCEMENT':
      return '❌'
    case 'SECURITY_ALERT':
      return '🚨'
    case 'NEW_LESSON':
      return '📚'
    case 'NEW_POST':
      return '📝'
    case 'COMMENT_REPLY':
      return '💬'
    default:
      return '📢'
  }
}

export function NotificationBell({ className, onNotificationClick }: NotificationBellProps) {
  const {
    notifications,
    unreadCount,
    isConnected,
    error,
    reconnect,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  } = useRealTimeNotifications()

  const hasNotifications = notifications.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 rounded-full",
            className
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          {/* Indicador de conexão */}
          <div className="absolute -bottom-1 -right-1">
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notificações</h3>
            {!isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reconnect}
                className="text-xs text-orange-600 hover:text-orange-700"
              >
                <WifiOff className="h-3 w-3 mr-1" />
                Reconectar
              </Button>
            )}
          </div>
          {hasNotifications && (
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar todas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          )}
        </div>
        {error && (
          <div className="px-4 pb-2">
            <div className="bg-red-50 border border-red-200 rounded-md p-2 text-sm text-red-700">
              Erro de conexão: {error}
            </div>
          </div>
        )}

        {!hasNotifications ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação no momento
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                    !notification.read && 'bg-accent/50'
                  )}
                  onClick={() => onNotificationClick?.(notification)}
                >
                  <div className="flex-shrink-0">
                        <div className="text-lg">
                          {getNotificationTypeIcon(notification.type)}
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                        )}
                      </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            'text-sm font-medium leading-none',
                            !notification.read && 'font-semibold'
                          )}>
                            {notification.title}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-1.5 py-0.5"
                          >
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                          {notification.channel && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {notification.channel === 'EMAIL' ? '📧' : 
                               notification.channel === 'WHATSAPP' ? '📱' : '📧📱'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            className="h-6 w-6 p-0"
                            title="Marcar como lida"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          title="Excluir notificação"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {notification.metadata?.actionUrl && notification.metadata?.actionLabel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(notification.metadata.actionUrl, '_blank')
                        }}
                      >
                        {notification.metadata.actionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {hasNotifications && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button variant="ghost" className="w-full justify-center text-sm" asChild>
                <a href="/dashboard/notifications">
                  Ver todas as notificações
                </a>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}