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
      
      <DropdownMenuContent className="w-[22rem] p-0 overflow-hidden" align="end" forceMount>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4" />
            <span>Notificações</span>
            {!isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reconnect}
                className="h-7 px-2 text-xs text-orange-500 hover:text-orange-600"
              >
                <WifiOff className="mr-1 h-3 w-3" /> Reconectar
              </Button>
            )}
          </div>
          {hasNotifications && (
            <div className="flex items-center gap-3 text-xs font-medium">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 text-[#d1a438] hover:text-[#f3c860] transition"
                >
                  <Check className="h-3 w-3" /> Marcar todas
                </button>
              )}
              <span className="h-4 w-px bg-border" />
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-[#d1a438] hover:text-[#f3c860] transition"
              >
                <Trash2 className="h-3 w-3" /> Limpar
              </button>
            </div>
          )}
        </div>
        {error && (
          <div className="px-4 pb-2">
            <div className="bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-700">
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
          <ScrollArea className="max-h-[24rem] overflow-y-auto">
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'group relative rounded-lg border border-border/60 bg-background/50 p-3 transition hover:border-primary/40 hover:bg-accent/40',
                    !notification.read && 'border-primary/30 bg-primary/5'
                  )}
                  onClick={() => onNotificationClick?.(notification)}
                >
                  <div className="relative flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-base">
                      {getNotificationTypeIcon(notification.type)}
                    </div>
                    {!notification.read && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className={cn('text-sm leading-tight', !notification.read && 'font-semibold text-foreground')}>
                            {notification.title}
                          </p>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide px-2 py-0">
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                        </div>
                        {notification.content && (
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {notification.content}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground/80">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                        {!notification.read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition"
                            title="Marcar como lida"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-destructive hover:bg-destructive hover:text-destructive-foreground transition"
                          title="Excluir notificação"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
