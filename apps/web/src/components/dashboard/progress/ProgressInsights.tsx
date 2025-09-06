"use client"

import { TrendingUp, TrendingDown, Target, Clock, Award, BookOpen, Calendar, Zap, AlertCircle, CheckCircle } from "lucide-react"

interface Insight {
  id: string
  type: 'achievement' | 'improvement' | 'warning' | 'milestone' | 'streak' | 'recommendation'
  title: string
  description: string
  value?: string | number
  change?: number
  period?: string
  actionable?: boolean
  priority: 'high' | 'medium' | 'low'
  createdAt: string
}

interface ProgressInsightsProps {
  insights: Insight[]
  loading?: boolean
}

export default function ProgressInsights({ insights, loading = false }: ProgressInsightsProps) {
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'achievement':
        return Award
      case 'improvement':
        return TrendingUp
      case 'warning':
        return AlertCircle
      case 'milestone':
        return Target
      case 'streak':
        return Zap
      case 'recommendation':
        return BookOpen
      default:
        return CheckCircle
    }
  }

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'achievement':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'improvement':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'milestone':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'streak':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'recommendation':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityBadge = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Agora mesmo'
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d atrás`
    }
  }

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change}%`
  }

  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.type]) {
      acc[insight.type] = []
    }
    acc[insight.type].push(insight)
    return acc
  }, {} as Record<string, Insight[]>)

  const insightTypeLabels = {
    achievement: 'Conquistas',
    improvement: 'Melhorias',
    warning: 'Atenção',
    milestone: 'Marcos',
    streak: 'Sequências',
    recommendation: 'Recomendações'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded mb-2 w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="grid gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Insights de Progresso</h2>
            <p className="text-gray-600 mt-1">
              Análises personalizadas do seu desempenho e recomendações
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {insights.length} insights disponíveis
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Object.entries(insightTypeLabels).map(([type, label]) => {
            const count = groupedInsights[type]?.length || 0
            const Icon = getInsightIcon(type as Insight['type'])
            const colorClass = getInsightColor(type as Insight['type'])
            
            return (
              <div key={type} className={`p-3 rounded-lg border ${colorClass}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Insights List */}
      <div className="p-6">
        {insights.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum insight disponível</h3>
            <p className="text-gray-600">
              Continue estudando para gerar insights personalizados sobre seu progresso.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights
              .sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 }
                return priorityOrder[b.priority] - priorityOrder[a.priority]
              })
              .map((insight) => {
                const Icon = getInsightIcon(insight.type)
                const colorClass = getInsightColor(insight.type)
                const priorityClass = getPriorityBadge(insight.priority)
                
                return (
                  <div
                    key={insight.id}
                    className={`p-4 rounded-lg border ${colorClass} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityClass}`}>
                              {insight.priority === 'high' ? 'Alta' :
                               insight.priority === 'medium' ? 'Média' : 'Baixa'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(insight.createdAt)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{insight.description}</p>
                        
                        {/* Metrics */}
                        <div className="flex items-center gap-4 text-sm">
                          {insight.value && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Valor:</span>
                              <span className="font-medium text-gray-900">{insight.value}</span>
                            </div>
                          )}
                          
                          {insight.change !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">Mudança:</span>
                              <span className={`font-medium flex items-center gap-1 ${
                                insight.change > 0 ? 'text-green-600' : 
                                insight.change < 0 ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {insight.change > 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : insight.change < 0 ? (
                                  <TrendingDown className="w-3 h-3" />
                                ) : null}
                                {formatChange(insight.change)}
                              </span>
                            </div>
                          )}
                          
                          {insight.period && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-500">{insight.period}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Button */}
                        {insight.actionable && (
                          <div className="mt-3">
                            <button className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors">
                              Ver detalhes →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {insights.some(i => i.actionable) && (
        <div className="px-6 pb-6">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <h3 className="font-medium text-purple-900">Ações Recomendadas</h3>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              Você tem {insights.filter(i => i.actionable).length} insights que podem ser transformados em ações.
            </p>
            <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
              Ver Todas as Ações
            </button>
          </div>
        </div>
      )}
    </div>
  )
}