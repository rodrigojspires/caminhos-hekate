'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Wifi, 
  WifiOff, 
  Play, 
  Pause, 
  RotateCcw,
  Activity,
  Users,
  Eye,
  MousePointer,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface RealtimeEvent {
  id: string
  type: 'metric' | 'event'
  name: string
  value: number
  timestamp: string
  userId?: string
  metadata?: Record<string, any>
}

interface ConnectionStatus {
  connected: boolean
  reconnecting: boolean
  lastPing?: number
  error?: string
}

interface RealtimeUpdatesProps {
  onDataUpdate?: (data: RealtimeEvent) => void
  autoConnect?: boolean
  showLiveEvents?: boolean
}

export function RealtimeUpdates({ 
  onDataUpdate, 
  autoConnect = true,
  showLiveEvents = true 
}: RealtimeUpdatesProps) {
  const [isEnabled, setIsEnabled] = useState(autoConnect)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false
  })
  const [liveEvents, setLiveEvents] = useState<RealtimeEvent[]>([])
  const [eventCount, setEventCount] = useState(0)
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000

  // Conectar ao WebSocket
  const connectRef = useRef<() => void>(() => {})

  const startPing = useCallback((): void => {
    stopPing()
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }, [])

  // Agendar reconexão (antes de connect para evitar ordem de declaração)
  const scheduleReconnect = useCallback((): void => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    reconnectAttempts.current++
    setConnectionStatus(prev => ({ ...prev, reconnecting: true }))
    
    const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current - 1) // Backoff exponencial
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (isEnabled) {
        connectRef.current?.()
      }
    }, delay)
  }, [isEnabled])

  const connect: () => void = useCallback(async (): Promise<void> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      setConnectionStatus(prev => ({ ...prev, reconnecting: true, error: undefined }))
      // Descobrir URL do servidor WS (a rota GET inicializa e retorna ws://host:port)
      let wsUrl: string | null = null
      try {
        const resp = await fetch('/api/analytics/ws')
        if (resp.ok) {
          const info = await resp.json()
          wsUrl = info?.url || null
        }
      } catch {}

      // Fallback para mesma origem, caso não disponível
      if (!wsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        wsUrl = `${protocol}//${window.location.host}/api/analytics/ws`
      }

      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('WebSocket conectado')
        setConnectionStatus({
          connected: true,
          reconnecting: false,
          lastPing: Date.now()
        })
        reconnectAttempts.current = 0
        
        // Enviar mensagem de inscrição
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          channels: ['analytics', 'metrics', 'events']
        }))

        // Iniciar ping/pong
        startPing()
        
        toast.success('Conectado ao sistema de atualizações em tempo real')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'pong') {
            setConnectionStatus(prev => ({ ...prev, lastPing: Date.now() }))
            return
          }

          if (data.type === 'analytics_update') {
            const realtimeEvent: RealtimeEvent = {
              id: data.id || `${Date.now()}-${Math.random()}`,
              type: data.eventType || 'event',
              name: data.name || 'Evento',
              value: data.value || 0,
              timestamp: data.timestamp || new Date().toISOString(),
              userId: data.userId,
              metadata: data.metadata
            }

            // Atualizar eventos ao vivo
            setLiveEvents(prev => {
              const newEvents = [realtimeEvent, ...prev.slice(0, 49)] // Manter apenas 50 eventos
              return newEvents
            })
            
            setEventCount(prev => prev + 1)
            setLastEventTime(new Date())

            // Callback para componente pai
            onDataUpdate?.(realtimeEvent)

            // Notificação para eventos importantes
            if (data.important) {
              toast.info(`${realtimeEvent.name}: ${realtimeEvent.value}`)
            }
          }
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('WebSocket desconectado:', event.code, event.reason)
        setConnectionStatus(prev => ({ 
          ...prev, 
          connected: false,
          error: event.reason || 'Conexão perdida'
        }))
        stopPing()
        
        // Tentar reconectar se não foi fechamento intencional
        if (event.code !== 1000 && isEnabled && reconnectAttempts.current < maxReconnectAttempts) {
          scheduleReconnect()
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('Erro no WebSocket:', error)
        setConnectionStatus(prev => ({ 
          ...prev, 
          error: 'Erro de conexão'
        }))
      }

    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error)
      setConnectionStatus(prev => ({ 
        ...prev, 
        reconnecting: false,
        error: 'Falha ao conectar'
      }))
    }
  }, [isEnabled, onDataUpdate, startPing, scheduleReconnect])

  // Desconectar WebSocket
  const disconnect = useCallback((): void => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    stopPing()
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Desconectado pelo usuário')
      wsRef.current = null
    }
    
    setConnectionStatus({
      connected: false,
      reconnecting: false
    })
  }, [])

  // Iniciar ping
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // Parar ping
  const stopPing = (): void => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
  }

  // Limpar eventos
  const clearEvents = (): void => {
    setLiveEvents([])
    setEventCount(0)
    setLastEventTime(null)
  }

  // Efeito para gerenciar conexão
  useEffect(() => {
    if (isEnabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isEnabled, connect, disconnect])

  // Cleanup na desmontagem
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const getStatusIcon = (): JSX.Element => {
    if (connectionStatus.reconnecting) {
      return <Activity className="h-4 w-4 animate-spin" />
    }
    if (connectionStatus.connected) {
      return <Wifi className="h-4 w-4 text-green-500" />
    }
    return <WifiOff className="h-4 w-4 text-red-500" />
  }

  const getStatusText = (): string => {
    if (connectionStatus.reconnecting) {
      return `Reconectando... (tentativa ${reconnectAttempts.current}/${maxReconnectAttempts})`
    }
    if (connectionStatus.connected) {
      return 'Conectado'
    }
    return connectionStatus.error || 'Desconectado'
  }

  const getStatusColor = (): 'yellow' | 'green' | 'red' => {
    if (connectionStatus.reconnecting) return 'yellow'
    if (connectionStatus.connected) return 'green'
    return 'red'
  }

  return (
    <div className="space-y-4">
      {/* Status da conexão */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Atualizações em Tempo Real</CardTitle>
              {getStatusIcon()}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={getStatusColor() as any}>
                {getStatusText()}
              </Badge>
              <div className="flex items-center gap-2">
                <Switch
                  id="realtime"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
                <Label htmlFor="realtime" className="text-sm">
                  {isEnabled ? 'Ativo' : 'Inativo'}
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{eventCount}</div>
              <div className="text-sm text-muted-foreground">Eventos recebidos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {connectionStatus.connected ? '●' : '○'}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {connectionStatus.lastPing 
                  ? Math.round((Date.now() - connectionStatus.lastPing) / 1000) + 's'
                  : '-'
                }
              </div>
              <div className="text-sm text-muted-foreground">Último ping</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {lastEventTime 
                  ? lastEventTime.toLocaleTimeString('pt-BR')
                  : '-'
                }
              </div>
              <div className="text-sm text-muted-foreground">Último evento</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => isEnabled ? disconnect() : connect()}
          disabled={connectionStatus.reconnecting}
        >
          {isEnabled ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Conectar
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={clearEvents}
          disabled={liveEvents.length === 0}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      </div>

      {/* Erro de conexão */}
      {connectionStatus.error && !connectionStatus.connected && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {connectionStatus.error}
            {reconnectAttempts.current < maxReconnectAttempts && (
              <Button
                variant="outline"
                size="sm"
                onClick={connect}
                className="ml-2"
              >
                Tentar novamente
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de eventos ao vivo */}
      {showLiveEvents && liveEvents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Eventos ao Vivo</CardTitle>
              <Badge variant="outline">{liveEvents.length} eventos</Badge>
            </div>
            <CardDescription>
              Últimos eventos recebidos em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {liveEvents.map((event) => {
                  const Icon = event.type === 'metric' ? Activity : 
                             event.name.includes('user') ? Users :
                             event.name.includes('view') ? Eye : MousePointer
                  
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{event.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleTimeString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-medium">
                          {event.value.toLocaleString()}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
