'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { toast } from 'sonner'
import { 
  Mail, 
  Send, 
  Eye, 
  MousePointer, 
  UserX, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts'
import type { DateRange } from 'react-day-picker'

interface EmailStats {
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  totalUnsubscribed: number
  deliveryRate: number
  openRate: number
  clickRate: number
  bounceRate: number
  unsubscribeRate: number
  clickToOpenRate: number
}

interface EmailStatsData {
  date: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
}

interface EmailStatsViewerProps {
  stats: EmailStats
  chartData: EmailStatsData[]
  isLoading?: boolean
  onRefresh?: () => void
  onExport?: (filters: StatsFilters) => void
  onFilterChange?: (filters: StatsFilters) => void
}

interface StatsFilters {
  dateRange?: DateRange
  templateId?: string
  campaignId?: string
  status?: string
  groupBy?: 'day' | 'week' | 'month'
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function EmailStatsViewer({
  stats,
  chartData,
  isLoading = false,
  onRefresh,
  onExport,
  onFilterChange
}: EmailStatsViewerProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters] = useState<StatsFilters>({
    groupBy: 'day'
  })
  const [showFilters, setShowFilters] = useState(false)

  const handleFilterChange = (key: keyof StatsFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  const getMetricColor = (current: number, previous?: number) => {
    if (!previous) return 'text-muted-foreground'
    return current > previous ? 'text-green-600' : 'text-red-600'
  }

  const getMetricIcon = (current: number, previous?: number) => {
    if (!previous) return null
    return current > previous ? 
      <TrendingUp className="h-3 w-3" /> : 
      <TrendingDown className="h-3 w-3" />
  }

  // Dados para gráfico de pizza
  const pieData = [
    { name: 'Entregues', value: stats.totalDelivered, color: '#00C49F' },
    { name: 'Abertos', value: stats.totalOpened, color: '#0088FE' },
    { name: 'Clicados', value: stats.totalClicked, color: '#FFBB28' },
    { name: 'Rejeitados', value: stats.totalBounced, color: '#FF8042' },
    { name: 'Descadastrados', value: stats.totalUnsubscribed, color: '#8884D8' }
  ]

  // Dados para gráfico de funil
  const funnelData = [
    { stage: 'Enviados', value: stats.totalSent, percentage: 100 },
    { stage: 'Entregues', value: stats.totalDelivered, percentage: stats.deliveryRate * 100 },
    { stage: 'Abertos', value: stats.totalOpened, percentage: stats.openRate * 100 },
    { stage: 'Clicados', value: stats.totalClicked, percentage: stats.clickRate * 100 }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Estatísticas de Email</h2>
          <p className="text-muted-foreground">
            Acompanhe o desempenho das suas campanhas de email
          </p>
        </div>
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
            onClick={() => onExport?.(filters)}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Período</Label>
                <DatePickerWithRange
                  date={filters.dateRange}
                  onDateChange={(range) => handleFilterChange('dateRange', range)}
                />
              </div>
              
              <div>
                <Label>Template</Label>
                <Select
                  value={filters.templateId || ''}
                  onValueChange={(value) => handleFilterChange('templateId', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os templates</SelectItem>
                    {/* Adicionar templates dinamicamente */}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Campanha</Label>
                <Select
                  value={filters.campaignId || ''}
                  onValueChange={(value) => handleFilterChange('campaignId', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as campanhas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as campanhas</SelectItem>
                    {/* Adicionar campanhas dinamicamente */}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Agrupar por</Label>
                <Select
                  value={filters.groupBy}
                  onValueChange={(value) => handleFilterChange('groupBy', value as 'day' | 'week' | 'month')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="engagement">Engajamento</TabsTrigger>
          <TabsTrigger value="funnel">Funil de Conversão</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enviados</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.totalSent)}</div>
                <p className="text-xs text-muted-foreground">
                  Emails enviados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(stats.deliveryRate)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats.totalDelivered)} entregues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Abertura</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(stats.openRate)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats.totalOpened)} abertos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Clique</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(stats.clickRate)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(stats.totalClicked)} cliques
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Linha - Tendência */}
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Envios</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#8884d8" name="Enviados" />
                  <Line type="monotone" dataKey="delivered" stroke="#82ca9d" name="Entregues" />
                  <Line type="monotone" dataKey="opened" stroke="#ffc658" name="Abertos" />
                  <Line type="monotone" dataKey="clicked" stroke="#ff7300" name="Clicados" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Métricas de Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa de Entrega</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatPercentage(stats.deliveryRate)}</span>
                    <Progress value={stats.deliveryRate * 100} className="w-20" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa de Abertura</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatPercentage(stats.openRate)}</span>
                    <Progress value={stats.openRate * 100} className="w-20" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa de Clique</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatPercentage(stats.clickRate)}</span>
                    <Progress value={stats.clickRate * 100} className="w-20" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa de Rejeição</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatPercentage(stats.bounceRate)}</span>
                    <Progress value={stats.bounceRate * 100} className="w-20" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Taxa de Descadastro</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatPercentage(stats.unsubscribeRate)}</span>
                    <Progress value={stats.unsubscribeRate * 100} className="w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Pizza - Distribuição */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Resultados</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Barras - Comparativo */}
          <Card>
            <CardHeader>
              <CardTitle>Performance por Período</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="delivered" fill="#82ca9d" name="Entregues" />
                  <Bar dataKey="opened" fill="#8884d8" name="Abertos" />
                  <Bar dataKey="clicked" fill="#ffc658" name="Clicados" />
                  <Bar dataKey="bounced" fill="#ff7300" name="Rejeitados" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engajamento */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Click-to-Open Rate</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(stats.clickToOpenRate)}</div>
                <p className="text-xs text-muted-foreground">
                  Taxa de conversão de abertura para clique
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engajamento Total</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage((stats.totalOpened + stats.totalClicked) / stats.totalSent)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Usuários que interagiram
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retenção</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(1 - stats.unsubscribeRate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Usuários que permaneceram
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Área - Engajamento ao longo do tempo */}
          <Card>
            <CardHeader>
              <CardTitle>Engajamento ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="opened" stackId="1" stroke="#8884d8" fill="#8884d8" name="Abertos" />
                  <Area type="monotone" dataKey="clicked" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Clicados" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funil de Conversão */}
        <TabsContent value="funnel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Funil de Conversão</CardTitle>
              <p className="text-sm text-muted-foreground">
                Acompanhe a jornada dos usuários desde o envio até o clique
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {funnelData.map((stage, index) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{formatNumber(stage.value)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({stage.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={stage.percentage} className="h-3" />
                    {index < funnelData.length - 1 && (
                      <div className="text-xs text-muted-foreground text-center">
                        ↓ {((funnelData[index + 1].percentage / stage.percentage) * 100).toFixed(1)}% conversão
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Insights e Recomendações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.deliveryRate < 0.95 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Atenção:</strong> Sua taxa de entrega está abaixo de 95%. 
                      Verifique a qualidade da sua lista de emails.
                    </p>
                  </div>
                )}
                
                {stats.openRate < 0.2 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      <strong>Melhoria:</strong> Sua taxa de abertura está baixa. 
                      Considere melhorar os assuntos dos emails.
                    </p>
                  </div>
                )}
                
                {stats.clickRate > 0.05 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Parabéns!</strong> Sua taxa de clique está acima da média. 
                      Continue com o bom trabalho!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
