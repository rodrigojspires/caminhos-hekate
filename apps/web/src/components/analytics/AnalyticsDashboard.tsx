'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, TrendingUp, Users, Activity, Eye } from 'lucide-react'
import { MetricsGrid } from './MetricsGrid'
import { ChartsSection } from './ChartsSection'
import { RealtimeUpdates } from './RealtimeUpdates'
import { EventsTable } from './EventsTable'
import { DashboardCustomizer } from './DashboardCustomizer'
import useAnalytics from '@/hooks/useAnalytics'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalEvents: number
  totalMetrics: number
  topPages: Array<{ page: string; views: number }>
  topEvents: Array<{ name: string; count: number }>
}

interface AnalyticsDashboardProps {
  userId?: string
  isAdmin?: boolean
}

export function AnalyticsDashboard({ userId, isAdmin = false }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const {
    stats,
    dateRange,
    setDateRange,
    loading,
    refreshing,
    error,
    refresh,
  } = useAnalytics(userId, isAdmin)

  const handleRefresh = () => {
    refresh()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Activity className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Erro ao carregar dashboard</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Acompanhe métricas e eventos em tempo real
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '1d' | '7d' | '30d' | '90d')}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="1d">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Métricas principais */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Usuários únicos registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Ativos nas últimas 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Eventos registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Métricas</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMetrics.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Métricas coletadas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="realtime">Tempo Real</TabsTrigger>
          {isAdmin && <TabsTrigger value="customize">Personalizar</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top páginas */}
            <Card>
              <CardHeader>
                <CardTitle>Páginas Mais Visitadas</CardTitle>
                <CardDescription>
                  Páginas com mais visualizações nos últimos {dateRange === '1d' ? '1 dia' : dateRange === '7d' ? '7 dias' : dateRange === '30d' ? '30 dias' : '90 dias'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topPages.slice(0, 5).map((page, index) => (
                    <div key={page.page} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm font-medium truncate">{page.page}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {page.views.toLocaleString()} views
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top eventos */}
            <Card>
              <CardHeader>
                <CardTitle>Eventos Mais Frequentes</CardTitle>
                <CardDescription>
                  Eventos mais registrados nos últimos {dateRange === '1d' ? '1 dia' : dateRange === '7d' ? '7 dias' : dateRange === '30d' ? '30 dias' : '90 dias'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.topEvents.slice(0, 5).map((event, index) => (
                    <div key={event.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm font-medium">{event.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {event.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsGrid dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="events">
          <EventsTable />
        </TabsContent>

        <TabsContent value="realtime">
          <RealtimeUpdates />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="customize">
            <DashboardCustomizer />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}