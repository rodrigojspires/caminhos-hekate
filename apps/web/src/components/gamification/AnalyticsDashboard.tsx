'use client'

import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, Trophy, Calendar,
  Target, Zap, Award, Gift, Activity
} from 'lucide-react'

interface AnalyticsData {
  userEngagement: {
    daily: Array<{ date: string; activeUsers: number; newUsers: number }>
    weekly: Array<{ week: string; retention: number; engagement: number }>
    monthly: Array<{ month: string; totalUsers: number; activeUsers: number }>
  }
  pointsDistribution: {
    bySource: Array<{ source: string; points: number; color: string }>
    byUser: Array<{ userId: string; username: string; totalPoints: number }>
    trends: Array<{ date: string; earned: number; spent: number }>
  }
  achievements: {
    unlockRates: Array<{ achievement: string; unlocks: number; rarity: string }>
    categories: Array<{ category: string; count: number; percentage: number }>
    timeline: Array<{ date: string; unlocks: number }>
  }
  events: {
    participation: Array<{ event: string; participants: number; completion: number }>
    performance: Array<{ event: string; avgScore: number; topScore: number }>
    trends: Array<{ date: string; events: number; participants: number }>
  }
  streaks: {
    distribution: Array<{ range: string; users: number }>
    averages: Array<{ type: string; avgStreak: number; maxStreak: number }>
    activity: Array<{ date: string; activeStreaks: number; newStreaks: number }>
  }
}

interface MetricCardProps {
  title: string
  value: string | number
  change: number
  icon: React.ComponentType<any>
  color: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color }) => {
  const isPositive = change >= 0
  
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className="flex items-center mt-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? '+' : ''}{change}%
            </span>
            <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
          </div>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/gamification/analytics?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Não foi possível carregar os dados de analytics</p>
      </div>
    )
  }

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Usuários Ativos"
          value={analyticsData.userEngagement.monthly[0]?.activeUsers || 0}
          change={12.5}
          icon={Users}
          color="bg-blue-500"
        />
        <MetricCard
          title="Taxa de Engajamento"
          value="78%"
          change={5.2}
          icon={Activity}
          color="bg-green-500"
        />
        <MetricCard
          title="Conquistas Desbloqueadas"
          value={analyticsData.achievements.timeline.reduce((sum, item) => sum + item.unlocks, 0)}
          change={18.7}
          icon={Trophy}
          color="bg-yellow-500"
        />
        <MetricCard
          title="Pontos Distribuídos"
          value={analyticsData.pointsDistribution.trends.reduce((sum, item) => sum + item.earned, 0).toLocaleString()}
          change={25.3}
          icon={Award}
          color="bg-purple-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Engagement Trend */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engajamento de Usuários</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analyticsData.userEngagement.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="activeUsers"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
                name="Usuários Ativos"
              />
              <Area
                type="monotone"
                dataKey="newUsers"
                stackId="1"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.6}
                name="Novos Usuários"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Points Distribution */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Pontos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.pointsDistribution.bySource}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ source, percentage }) => `${source} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="points"
              >
                {analyticsData.pointsDistribution.bySource.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievement Unlocks */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conquistas Mais Populares</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.achievements.unlockRates.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="achievement" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="unlocks" fill="#F59E0B" name="Desbloqueios" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Event Participation */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Participação em Eventos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.events.participation}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="event" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="participants" fill="#10B981" name="Participantes" />
              <Bar dataKey="completion" fill="#3B82F6" name="Conclusões" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  const EngagementTab = () => (
    <div className="space-y-6">
      {/* Retention Analysis */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Análise de Retenção</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={analyticsData.userEngagement.weekly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="retention"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Taxa de Retenção (%)"
            />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#10B981"
              strokeWidth={2}
              name="Índice de Engajamento"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Streak Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Streaks</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.streaks.distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" fill="#8B5CF6" name="Usuários" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade de Streaks</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analyticsData.streaks.activity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="activeStreaks"
                stroke="#F59E0B"
                name="Streaks Ativos"
              />
              <Line
                type="monotone"
                dataKey="newStreaks"
                stroke="#EF4444"
                name="Novos Streaks"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  const PerformanceTab = () => (
    <div className="space-y-6">
      {/* Points Trends */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendências de Pontos</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={analyticsData.pointsDistribution.trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="earned"
              stackId="1"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.6}
              name="Pontos Ganhos"
            />
            <Area
              type="monotone"
              dataKey="spent"
              stackId="2"
              stroke="#EF4444"
              fill="#EF4444"
              fillOpacity={0.6}
              name="Pontos Gastos"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Usuários por Pontos</h3>
          <div className="space-y-3">
            {analyticsData.pointsDistribution.byUser.slice(0, 10).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-600' :
                    'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{user.username}</span>
                </div>
                <span className="font-bold text-gray-900">
                  {user.totalPoints.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance de Eventos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.events.performance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="event" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="avgScore" fill="#3B82F6" name="Score Médio" />
              <Bar dataKey="topScore" fill="#F59E0B" name="Melhor Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics de Gamificação</h2>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="1y">Último ano</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            Atualizar
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Visão Geral', icon: BarChart },
            { id: 'engagement', label: 'Engajamento', icon: Activity },
            { id: 'performance', label: 'Performance', icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'engagement' && <EngagementTab />}
      {activeTab === 'performance' && <PerformanceTab />}
    </div>
  )
}