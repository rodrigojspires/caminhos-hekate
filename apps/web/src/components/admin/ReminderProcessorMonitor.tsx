'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Play,
  Square,
  RotateCcw,
  Zap,
  Activity,
  Clock,
  Settings,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface ProcessorStats {
  isRunning: boolean
  config: {
    batchSize: number
    intervalMs: number
    maxRetries: number
    lookAheadDays: number
  }
  processingQueueSize: number
  uptime: number
  memoryUsage: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  nodeVersion: string
  environment: string
}

interface ProcessorConfig {
  batchSize: number
  intervalMs: number
  maxRetries: number
  lookAheadDays: number
}

export default function ReminderProcessorMonitor() {
  const [stats, setStats] = useState<ProcessorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState<ProcessorConfig>({
    batchSize: 50,
    intervalMs: 60000,
    maxRetries: 3,
    lookAheadDays: 30
  })

  // Buscar estatísticas do processador
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/background/reminder-processor')
      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
        setConfig(data.data.config)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao carregar estatísticas')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  // Controlar processador
  const controlProcessor = async (action: string) => {
    setActionLoading(action)
    try {
      const response = await fetch('/api/background/reminder-processor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success(data.data.message)
        setStats(prev => prev ? { ...prev, ...data.data.stats } : null)
      } else {
        toast.error(data.error || 'Erro ao executar ação')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setActionLoading(null)
    }
  }

  // Atualizar configuração
  const updateConfig = async () => {
    setActionLoading('config')
    try {
      const response = await fetch('/api/background/reminder-processor', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Configuração atualizada')
        setStats(prev => prev ? { ...prev, ...data.data.stats } : null)
        setShowConfig(false)
      } else {
        toast.error(data.error || 'Erro ao atualizar configuração')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setActionLoading(null)
    }
  }

  // Formatar bytes
  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Formatar tempo
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}h ${minutes}m ${secs}s`
  }

  useEffect(() => {
    fetchStats()
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando...</span>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <span className="ml-2">Erro ao carregar dados do processador</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Monitor do Processador de Lembretes
              </CardTitle>
              <CardDescription>
                Monitore e controle o processamento em background de lembretes
              </CardDescription>
            </div>
            <Badge 
              variant={stats.isRunning ? 'default' : 'secondary'}
              className={stats.isRunning ? 'bg-green-500' : 'bg-gray-500'}
            >
              {stats.isRunning ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Parado
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => controlProcessor('start')}
              disabled={stats.isRunning || actionLoading === 'start'}
              size="sm"
            >
              {actionLoading === 'start' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="ml-1">Iniciar</span>
            </Button>
            
            <Button
              onClick={() => controlProcessor('stop')}
              disabled={!stats.isRunning || actionLoading === 'stop'}
              variant="outline"
              size="sm"
            >
              {actionLoading === 'stop' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span className="ml-1">Parar</span>
            </Button>
            
            <Button
              onClick={() => controlProcessor('restart')}
              disabled={actionLoading === 'restart'}
              variant="outline"
              size="sm"
            >
              {actionLoading === 'restart' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              <span className="ml-1">Reiniciar</span>
            </Button>
            
            <Button
              onClick={() => controlProcessor('process_now')}
              disabled={!stats.isRunning || actionLoading === 'process_now'}
              variant="outline"
              size="sm"
            >
              {actionLoading === 'process_now' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              <span className="ml-1">Processar Agora</span>
            </Button>
            
            <Button
              onClick={() => setShowConfig(!showConfig)}
              variant="ghost"
              size="sm"
            >
              <Settings className="h-4 w-4" />
              <span className="ml-1">Configurar</span>
            </Button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats.processingQueueSize}
              </div>
              <div className="text-sm text-gray-600">Fila de Processamento</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.floor(stats.config.intervalMs / 1000)}s
              </div>
              <div className="text-sm text-gray-600">Intervalo</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.config.batchSize}
              </div>
              <div className="text-sm text-gray-600">Tamanho do Lote</div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formatUptime(stats.uptime)}
              </div>
              <div className="text-sm text-gray-600">Tempo Ativo</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração */}
      {showConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Processador</CardTitle>
            <CardDescription>
              Ajuste os parâmetros de funcionamento do processador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batchSize">Tamanho do Lote</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min="1"
                  max="200"
                  value={config.batchSize}
                  onChange={(e) => setConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                />
              </div>
              
              <div>
                <Label htmlFor="intervalMs">Intervalo (ms)</Label>
                <Input
                  id="intervalMs"
                  type="number"
                  min="10000"
                  max="300000"
                  value={config.intervalMs}
                  onChange={(e) => setConfig(prev => ({ ...prev, intervalMs: parseInt(e.target.value) }))}
                />
              </div>
              
              <div>
                <Label htmlFor="maxRetries">Máximo de Tentativas</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  min="1"
                  max="10"
                  value={config.maxRetries}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                />
              </div>
              
              <div>
                <Label htmlFor="lookAheadDays">Dias de Antecedência</Label>
                <Input
                  id="lookAheadDays"
                  type="number"
                  min="1"
                  max="90"
                  value={config.lookAheadDays}
                  onChange={(e) => setConfig(prev => ({ ...prev, lookAheadDays: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button
                onClick={updateConfig}
                disabled={actionLoading === 'config'}
              >
                {actionLoading === 'config' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                <span className={actionLoading === 'config' ? 'ml-1' : ''}>
                  Salvar Configuração
                </span>
              </Button>
              
              <Button
                onClick={() => setShowConfig(false)}
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Ambiente:</strong> {stats.environment}
            </div>
            <div>
              <strong>Node.js:</strong> {stats.nodeVersion}
            </div>
            <div>
              <strong>Memória RSS:</strong> {formatBytes(stats.memoryUsage.rss)}
            </div>
            <div>
              <strong>Heap Usado:</strong> {formatBytes(stats.memoryUsage.heapUsed)}
            </div>
            <div>
              <strong>Heap Total:</strong> {formatBytes(stats.memoryUsage.heapTotal)}
            </div>
            <div>
              <strong>Memória Externa:</strong> {formatBytes(stats.memoryUsage.external)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}