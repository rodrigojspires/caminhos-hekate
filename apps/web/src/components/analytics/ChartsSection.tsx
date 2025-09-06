'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Scatter,
  ScatterChart,
  ZAxis
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  Users,
  ShoppingCart,
  Eye,
  MousePointer
} from 'lucide-react'

interface ChartData {
  timestamp: string
  value: number
  count: number
  category?: string
  metadata?: Record<string, any>
}

interface ChartsSectionProps {
  dateRange: string
  userId?: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

const CHART_TYPES = {
  line: { icon: LineChartIcon, label: 'Linha' },
  area: { icon: Activity, label: 'Área' },
  bar: { icon: BarChart3, label: 'Barras' },
  pie: { icon: PieChartIcon, label: 'Pizza' },
  radar: { icon: Zap, label: 'Radar' },
  scatter: { icon: MousePointer, label: 'Dispersão' }
}

export function ChartsSection({ dateRange, userId }: ChartsSectionProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartType, setChartType] = useState<keyof typeof CHART_TYPES>('line')
  const [showComparison, setShowComparison] = useState(false)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['pageviews', 'users'])
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'week' | 'month'>('day')
  const [smoothing, setSmoothing] = useState(false)

  // Carregar dados dos gráficos
  const loadChartData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: 'events',
        groupBy,
        ...(userId && { userId }),
      })

      // Calcular datas baseado no range
      const endDate = new Date()
      const startDate = new Date()
      
      switch (dateRange) {
        case '1d':
          startDate.setDate(endDate.getDate() - 1)
          break
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
      }

      params.append('startDate', startDate.toISOString())
      params.append('endDate', endDate.toISOString())

      const response = await fetch(`/api/analytics?${params}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar dados dos gráficos')
      }
      
      const chartData = await response.json()
      setData(chartData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [dateRange, userId, groupBy])

  useEffect(() => {
    loadChartData()
  }, [loadChartData])

  // Preparar dados para diferentes tipos de gráfico
  const prepareChartData = () => {
    if (!data.length) return []

    const processedData = data.map(item => ({
      ...item,
      date: new Date(item.timestamp).toLocaleDateString('pt-BR'),
      time: new Date(item.timestamp).toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      dayOfWeek: new Date(item.timestamp).toLocaleDateString('pt-BR', { weekday: 'short' }),
      hour: new Date(item.timestamp).getHours(),
      pageviews: item.value || 0,
      users: item.metadata?.users || 0,
      sessions: item.metadata?.sessions || 0,
      bounceRate: item.metadata?.bounceRate || 0,
      avgSessionDuration: item.metadata?.avgSessionDuration || 0
    }))

    return processedData
  }

  const chartData = prepareChartData()

  // Dados agregados por categoria
  const categoryData = chartData.reduce((acc, item) => {
    const category = item.category || 'Outros'
    const existing = acc.find(c => c.name === category)
    if (existing) {
      existing.value += item.value
      existing.count += item.count
    } else {
      acc.push({ 
        name: category, 
        value: item.value, 
        count: item.count,
        fill: COLORS[acc.length % COLORS.length]
      })
    }
    return acc
  }, [] as Array<{ name: string; value: number; count: number; fill: string }>)

  // Dados para radar chart (métricas por período)
  const radarData = [
    { metric: 'Pageviews', value: chartData.reduce((sum, item) => sum + item.pageviews, 0) / chartData.length },
    { metric: 'Users', value: chartData.reduce((sum, item) => sum + item.users, 0) / chartData.length },
    { metric: 'Sessions', value: chartData.reduce((sum, item) => sum + item.sessions, 0) / chartData.length },
    { metric: 'Bounce Rate', value: chartData.reduce((sum, item) => sum + item.bounceRate, 0) / chartData.length },
    { metric: 'Avg Duration', value: chartData.reduce((sum, item) => sum + item.avgSessionDuration, 0) / chartData.length }
  ]

  // Dados para scatter plot
  const scatterData = chartData.map(item => ({
    x: item.users,
    y: item.pageviews,
    z: item.sessions,
    name: groupBy === 'hour' ? item.time : item.date
  }))

  const renderChart = () => {
    if (loading) {
      return <Skeleton className="h-80 w-full" />
    }

    if (error || !chartData.length) {
      return (
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          {error || 'Nenhum dado disponível'}
        </div>
      )
    }

    const commonProps = {
      width: '100%',
      height: 320
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={groupBy === 'hour' ? 'time' : 'date'}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip 
                labelFormatter={(label) => `${groupBy === 'hour' ? 'Hora' : 'Data'}: ${label}`}
              />
              <Legend />
              {selectedMetrics.includes('pageviews') && (
                <Line 
                  type={smoothing ? 'monotone' : 'linear'}
                  dataKey="pageviews" 
                  stroke={COLORS[0]} 
                  strokeWidth={2}
                  name="Visualizações"
                />
              )}
              {selectedMetrics.includes('users') && (
                <Line 
                  type={smoothing ? 'monotone' : 'linear'}
                  dataKey="users" 
                  stroke={COLORS[1]} 
                  strokeWidth={2}
                  name="Usuários"
                />
              )}
              {selectedMetrics.includes('sessions') && (
                <Line 
                  type={smoothing ? 'monotone' : 'linear'}
                  dataKey="sessions" 
                  stroke={COLORS[2]} 
                  strokeWidth={2}
                  name="Sessões"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={groupBy === 'hour' ? 'time' : 'date'}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {selectedMetrics.includes('pageviews') && (
                <Area 
                  type={smoothing ? 'monotone' : 'linear'}
                  dataKey="pageviews" 
                  stackId="1"
                  stroke={COLORS[0]} 
                  fill={COLORS[0]}
                  fillOpacity={0.6}
                  name="Visualizações"
                />
              )}
              {selectedMetrics.includes('users') && (
                <Area 
                  type={smoothing ? 'monotone' : 'linear'}
                  dataKey="users" 
                  stackId="1"
                  stroke={COLORS[1]} 
                  fill={COLORS[1]}
                  fillOpacity={0.6}
                  name="Usuários"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={groupBy === 'hour' ? 'time' : 'date'}
                fontSize={12}
              />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {selectedMetrics.includes('pageviews') && (
                <Bar dataKey="pageviews" fill={COLORS[0]} name="Visualizações" />
              )}
              {selectedMetrics.includes('users') && (
                <Bar dataKey="users" fill={COLORS[1]} name="Usuários" />
              )}
              {selectedMetrics.includes('sessions') && (
                <Bar dataKey="sessions" fill={COLORS[2]} name="Sessões" />
              )}
            </BarChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [value.toLocaleString(), 'Valor']} />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'radar':
        return (
          <ResponsiveContainer {...commonProps}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" fontSize={12} />
              <PolarRadiusAxis fontSize={10} />
              <Radar
                name="Métricas"
                dataKey="value"
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.3}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        )

      case 'scatter':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart data={scatterData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Usuários"
                fontSize={12}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Visualizações"
                fontSize={12}
              />
              <ZAxis type="number" dataKey="z" range={[50, 400]} name="Sessões" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: any, name: string) => [
                  value.toLocaleString(),
                  name === 'x' ? 'Usuários' : name === 'y' ? 'Visualizações' : 'Sessões'
                ]}
              />
              <Scatter 
                name="Dados" 
                data={scatterData} 
                fill={COLORS[0]}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          {/* Seletor de tipo de gráfico */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Tipo:</Label>
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              {Object.entries(CHART_TYPES).map(([type, config]) => {
                const Icon = config.icon
                return (
                  <Button
                    key={type}
                    variant={chartType === type ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType(type as keyof typeof CHART_TYPES)}
                    className="h-8 px-2"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Agrupamento */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">Agrupar:</Label>
            <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Hora</SelectItem>
                <SelectItem value="day">Dia</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Suavização (apenas para linha/área) */}
          {(chartType === 'line' || chartType === 'area') && (
            <div className="flex items-center gap-2">
              <Switch
                id="smoothing"
                checked={smoothing}
                onCheckedChange={setSmoothing}
              />
              <Label htmlFor="smoothing" className="text-sm">Suavizar</Label>
            </div>
          )}

          {/* Comparação */}
          <div className="flex items-center gap-2">
            <Switch
              id="comparison"
              checked={showComparison}
              onCheckedChange={setShowComparison}
            />
            <Label htmlFor="comparison" className="text-sm">Comparar</Label>
          </div>
        </div>
      </div>

      {/* Seleção de métricas */}
      {(chartType === 'line' || chartType === 'area' || chartType === 'bar') && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-2">
            <Label className="text-sm font-medium mb-2 w-full">Métricas:</Label>
            {[
              { key: 'pageviews', label: 'Visualizações', icon: Eye },
              { key: 'users', label: 'Usuários', icon: Users },
              { key: 'sessions', label: 'Sessões', icon: Activity },
              { key: 'bounceRate', label: 'Taxa de Rejeição', icon: TrendingDown }
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={selectedMetrics.includes(key) ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedMetrics(prev => 
                    prev.includes(key) 
                      ? prev.filter(m => m !== key)
                      : [...prev, key]
                  )
                }}
                className="h-8"
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Gráfico principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(CHART_TYPES[chartType].icon, { className: 'h-5 w-5' })}
                Gráfico {CHART_TYPES[chartType].label}
              </CardTitle>
              <CardDescription>
                Análise detalhada das métricas no período selecionado
              </CardDescription>
            </div>
            <Badge variant="outline">
              {chartData.length} pontos de dados
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Gráficos de comparação */}
      {showComparison && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Categoria</CardTitle>
              <CardDescription>Valores agrupados por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Métricas Combinadas</CardTitle>
              <CardDescription>Visualização radar das principais métricas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" fontSize={11} />
                  <PolarRadiusAxis fontSize={9} />
                  <Radar
                    name="Métricas"
                    dataKey="value"
                    stroke={COLORS[0]}
                    fill={COLORS[0]}
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}