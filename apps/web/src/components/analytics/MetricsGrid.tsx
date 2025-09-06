'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Filter, Download } from 'lucide-react'

interface Metric {
  timestamp: string
  value: number
  count: number
}

interface MetricsGridProps {
  dateRange: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function MetricsGrid({ dateRange }: MetricsGridProps) {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'week' | 'month'>('day')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Carregar métricas
  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        type: 'metrics',
        groupBy,
        ...(category !== 'all' && { category }),
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
        throw new Error('Erro ao carregar métricas')
      }
      
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [dateRange, category, groupBy])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  // Calcular estatísticas
  const totalValue = metrics.reduce((sum, metric) => sum + metric.value, 0)
  const averageValue = metrics.length > 0 ? totalValue / metrics.length : 0
  const maxValue = Math.max(...metrics.map(m => m.value), 0)
  const minValue = Math.min(...metrics.map(m => m.value), 0)

  // Calcular tendência (comparar primeira e última métrica)
  const trend = metrics.length >= 2 
    ? metrics[metrics.length - 1].value - metrics[0].value
    : 0

  const trendPercentage = metrics.length >= 2 && metrics[0].value !== 0
    ? ((trend / metrics[0].value) * 100)
    : 0

  // Preparar dados para gráficos
  const chartData = metrics.map(metric => ({
    ...metric,
    date: new Date(metric.timestamp).toLocaleDateString('pt-BR'),
    time: new Date(metric.timestamp).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }))

  // Dados para gráfico de pizza (distribuição por período)
  const pieData = chartData.reduce((acc, item) => {
    const period = groupBy === 'hour' ? item.time : item.date
    const existing = acc.find(p => p.name === period)
    if (existing) {
      existing.value += item.value
    } else {
      acc.push({ name: period, value: item.value })
    }
    return acc
  }, [] as Array<{ name: string; value: number }>).slice(0, 5)

  const exportData = () => {
    const csvContent = [
      ['Timestamp', 'Value', 'Count'].join(','),
      ...metrics.map(metric => [
        metric.timestamp,
        metric.value,
        metric.count
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metrics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-500">
          <p>Erro ao carregar métricas: {error}</p>
          <Button onClick={loadMetrics} variant="outline" className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controles e filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            disabled={metrics.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="groupBy" className="text-sm">Agrupar por:</Label>
          <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
            <SelectTrigger className="w-32">
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

      {/* Filtros expandidos */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="business">Negócio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="search">Buscar métrica</Label>
              <Input
                id="search"
                placeholder="Nome da métrica..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Soma de todas as métricas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Valor médio por período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Máximo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maxValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Maior valor registrado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendência</CardTitle>
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : trend < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <Minus className="h-4 w-4 text-gray-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trendPercentage > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Variação no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de linha */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução das Métricas</CardTitle>
            <CardDescription>
              Valores ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={groupBy === 'hour' ? 'time' : 'date'}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  labelFormatter={(label) => `${groupBy === 'hour' ? 'Hora' : 'Data'}: ${label}`}
                  formatter={(value: any) => [value.toLocaleString(), 'Valor']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de barras */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Período</CardTitle>
            <CardDescription>
              Top 5 períodos com maiores valores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [value.toLocaleString(), 'Valor']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de dados */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dados Detalhados</CardTitle>
            <CardDescription>
              Últimas {Math.min(metrics.length, 10)} métricas registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Timestamp</th>
                    <th className="text-right p-2">Valor</th>
                    <th className="text-right p-2">Contagem</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.slice(-10).reverse().map((metric, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">
                        {new Date(metric.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="text-right p-2 font-mono">
                        {metric.value.toLocaleString()}
                      </td>
                      <td className="text-right p-2 font-mono">
                        {metric.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}