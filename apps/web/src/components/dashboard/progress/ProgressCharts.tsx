"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from "recharts"
import { Calendar, TrendingUp, Clock, Target, Filter } from "lucide-react"

interface ProgressData {
  weeklyProgress: {
    week: string
    studyTime: number
    lessonsCompleted: number
    points: number
  }[]
  categoryProgress: {
    category: string
    completed: number
    total: number
    percentage: number
  }[]
  dailyActivity: {
    date: string
    minutes: number
    lessons: number
  }[]
  monthlyGoals: {
    month: string
    target: number
    achieved: number
  }[]
}

interface ProgressChartsProps {
  data: ProgressData
  loading?: boolean
}

export default function ProgressCharts({ data, loading = false }: ProgressChartsProps) {
  const [activeChart, setActiveChart] = useState<'weekly' | 'category' | 'daily' | 'goals'>('weekly')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const COLORS = {
    primary: '#7C3AED',
    secondary: '#EC4899',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
    purple: '#8B5CF6',
    pink: '#F472B6',
    indigo: '#6366F1'
  }

  const categoryColors = [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.info]

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded mb-2 w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="h-80 bg-gray-100 rounded-lg animate-pulse"></div>
        </div>
      </div>
    )
  }

  const chartTabs = [
    { id: 'weekly', label: 'Progresso Semanal', icon: TrendingUp },
    { id: 'category', label: 'Por Categoria', icon: Target },
    { id: 'daily', label: 'Atividade Diária', icon: Calendar },
    { id: 'goals', label: 'Metas Mensais', icon: Clock }
  ] as const

  const renderWeeklyChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.weeklyProgress}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="week" 
          stroke="#6b7280"
          fontSize={12}
        />
        <YAxis stroke="#6b7280" fontSize={12} />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Bar 
          dataKey="studyTime" 
          fill={COLORS.primary} 
          radius={[4, 4, 0, 0]}
          name="Tempo de Estudo (min)"
        />
        <Bar 
          dataKey="lessonsCompleted" 
          fill={COLORS.secondary} 
          radius={[4, 4, 0, 0]}
          name="Lições Concluídas"
        />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderCategoryChart = () => (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data.categoryProgress}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={5}
              dataKey="completed"
            >
              {data.categoryProgress.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="lg:w-64">
        <h4 className="font-medium text-gray-900 mb-4">Progresso por Categoria</h4>
        <div className="space-y-3">
          {data.categoryProgress.map((category, index) => (
            <div key={category.category} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                ></div>
                <span className="text-sm text-gray-700">{category.category}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {category.completed}/{category.total}
                </div>
                <div className="text-xs text-gray-500">
                  {category.percentage}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderDailyChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data.dailyActivity}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          }}
        />
        <YAxis stroke="#6b7280" fontSize={12} />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          labelFormatter={(value) => {
            const date = new Date(value)
            return date.toLocaleDateString('pt-BR')
          }}
        />
        <Area
          type="monotone"
          dataKey="minutes"
          stroke={COLORS.primary}
          fill={COLORS.primary}
          fillOpacity={0.3}
          name="Minutos de Estudo"
        />
      </AreaChart>
    </ResponsiveContainer>
  )

  const renderGoalsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.monthlyGoals}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="month" 
          stroke="#6b7280"
          fontSize={12}
        />
        <YAxis stroke="#6b7280" fontSize={12} />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Bar 
          dataKey="target" 
          fill="#e5e7eb" 
          radius={[4, 4, 0, 0]}
          name="Meta"
        />
        <Bar 
          dataKey="achieved" 
          fill={COLORS.success} 
          radius={[4, 4, 0, 0]}
          name="Alcançado"
        />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderChart = () => {
    switch (activeChart) {
      case 'weekly':
        return renderWeeklyChart()
      case 'category':
        return renderCategoryChart()
      case 'daily':
        return renderDailyChart()
      case 'goals':
        return renderGoalsChart()
      default:
        return renderWeeklyChart()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Análise de Progresso</h2>
            <p className="text-gray-600 mt-1">Visualize seu desempenho ao longo do tempo</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart Tabs */}
      <div className="px-6 pt-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {chartTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveChart(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeChart === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chart Content */}
      <div className="px-6 pb-6">
        {renderChart()}
      </div>

      {/* Summary Stats */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.weeklyProgress.reduce((acc, week) => acc + week.studyTime, 0)}
              </div>
              <div className="text-sm text-gray-600">Minutos Totais</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.weeklyProgress.reduce((acc, week) => acc + week.lessonsCompleted, 0)}
              </div>
              <div className="text-sm text-gray-600">Lições Concluídas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(data.categoryProgress.reduce((acc, cat) => acc + cat.percentage, 0) / data.categoryProgress.length)}%
              </div>
              <div className="text-sm text-gray-600">Progresso Médio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {data.weeklyProgress.reduce((acc, week) => acc + week.points, 0)}
              </div>
              <div className="text-sm text-gray-600">Pontos Ganhos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}