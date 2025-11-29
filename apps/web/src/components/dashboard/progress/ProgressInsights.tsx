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
        return 'text-yellow-300 bg-yellow-900/40 border-yellow-500'
      case 'improvement':
        return 'text-green-300 bg-green-900/40 border-green-500'
      case 'warning':
        return 'text-red-300 bg-red-900/40 border-red-500'
      case 'milestone':
        return 'text-indigo-300 bg-indigo-900/40 border-indigo-500'
      case 'streak':
        return 'text-orange-300 bg-orange-900/40 border-orange-500'
      case 'recommendation':
        return 'text-blue-300 bg-blue-900/40 border-blue-500'
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700'
    }
  }

  const getPriorityBadge = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-900/40 text-red-200 border-red-500'
      case 'medium':
        return 'bg-yellow-900/40 text-yellow-200 border-yellow-500'
      case 'low':
        return 'bg-green-900/40 text-green-200 border-green-500'
      default:
        return 'bg-slate-800 text-slate-200 border-slate-700'
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
      <div className="bg-slate-900 text-slate-100 rounded-lg shadow-sm border border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <div className="h-6 bg-slate-700 rounded mb-2 w-1/3 animate-pulse"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="grid gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="p-4 border border-slate-800 rounded-lg animate-pulse bg-slate-800/60">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded mb-2 w-3/4"></div>
                    <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
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
    <div className="bg-slate-900 text-slate-100 rounded-lg shadow-sm border border-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Insights de Progresso</h2>
            <p className="text-slate-300 mt-1">
              Análises personalizadas do seu desempenho e recomendações
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">
              {insights.length} insights disponíveis
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 border-b border-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Object.entries(insightTypeLabels).map(([type, label]) => {
            const count = groupedInsights[type]?.length || 0
            const Icon = getInsightIcon(type as Insight['type'])
            const colorClass = getInsightColor(type as Insight['type'])
            
            return (
              <div key={type} className={`p-3 rounded-lg border ${colorClass}`}>
                <div className="flex items-center gap-2 mb-1 text-slate-100">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="text-2xl font-bold text-white">{count}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Insights List */}
      <div className="p-6">
        {insights.length === 0 ? (
          <div className="text-center py-12 text-slate-300">
            <TrendingUp className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum insight disponível</h3>
            <p className="text-slate-400">
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
                          <h3 className="font-semibold">{insight.title}</h3>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${priorityClass}`}>
                              {insight.priority === 'high' ? 'Alta' :
                               insight.priority === 'medium' ? 'Média' : 'Baixa'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatTimeAgo(insight.createdAt)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-slate-200 mb-3">{insight.description}</p>
                        
                        {/* Metrics */}
                        <div className="flex items-center gap-4 text-sm text-slate-200">
                          {insight.value && (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">Valor:</span>
                              <span className="font-medium">{insight.value}</span>
                            </div>
                          )}
                          
                          {insight.change !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">Mudança:</span>
                              <span className={`font-medium flex items-center gap-1 ${
                                insight.change > 0 ? 'text-green-400' : 
                                insight.change < 0 ? 'text-red-400' : 'text-slate-200'
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
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-400">{insight.period}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Button */}
                        {insight.actionable && (
                          <div className="mt-3">
                            <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
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
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-2 text-slate-100">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h3 className="font-medium">Ações Recomendadas</h3>
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Você tem {insights.filter(i => i.actionable).length} insights que podem ser transformados em ações.
            </p>
            <button className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors">
              Ver Todas as Ações
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
