"use client"

import { useState, useEffect } from "react"
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  BookOpen, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import { cn } from "@/lib/utils"

// Metric Card Component
export interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon: React.ComponentType<{ className?: string }>
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  loading?: boolean
  onClick?: () => void
}

export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  color = 'blue',
  loading = false,
  onClick
}: MetricCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
      case 'orange':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
      case 'red':
        return 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
      default:
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
    }
  }

  return (
    <div 
      className={cn(
        "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <div className="mt-2">
            {loading ? (
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
              </p>
            )}
          </div>
          {change && !loading && (
            <div className="mt-2 flex items-center">
              {change.type === 'increase' ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span className={cn(
                "text-sm font-medium ml-1",
                change.type === 'increase' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {Math.abs(change.value)}% {change.period}
              </span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", getColorClasses())}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

// Stats Grid Component
export interface StatsGridProps {
  metrics: MetricCardProps[]
  loading?: boolean
  className?: string
}

export function StatsGrid({ metrics, loading = false, className }: StatsGridProps) {
  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
      className
    )}>
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          {...metric}
          loading={loading}
        />
      ))}
    </div>
  )
}

// Recent Activity Component
export interface Activity {
  id: string
  type: 'user' | 'order' | 'course' | 'system'
  title: string
  description: string
  timestamp: Date
  user?: {
    name: string
    avatar?: string
  }
  metadata?: Record<string, any>
}

export interface RecentActivityProps {
  activities: Activity[]
  loading?: boolean
  className?: string
  onViewAll?: () => void
}

export function RecentActivity({ 
  activities, 
  loading = false, 
  className,
  onViewAll 
}: RecentActivityProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'user':
        return <Users className="w-4 h-4 text-blue-500" />
      case 'order':
        return <ShoppingCart className="w-4 h-4 text-green-500" />
      case 'course':
        return <BookOpen className="w-4 h-4 text-purple-500" />
      case 'system':
        return <Eye className="w-4 h-4 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - timestamp.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}m atrás`
    if (hours < 24) return `${hours}h atrás`
    if (days < 7) return `${days}d atrás`
    return timestamp.toLocaleDateString('pt-BR')
  }

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
      className
    )}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Atividades Recentes
          </h3>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300"
            >
              Ver todas
            </button>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Nenhuma atividade recente
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {activity.description}
                  </p>
                  <div className="flex items-center mt-1 space-x-2">
                    {activity.user && (
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        por {activity.user.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Quick Stats Component
export interface QuickStatsProps {
  stats: {
    label: string
    value: string | number
    trend?: {
      value: number
      direction: 'up' | 'down'
    }
  }[]
  className?: string
}

export function QuickStats({ stats, className }: QuickStatsProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700",
      className
    )}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Estatísticas Rápidas
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {typeof stat.value === 'number' ? stat.value.toLocaleString('pt-BR') : stat.value}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </p>
            {stat.trend && (
              <div className="flex items-center justify-center mt-1">
                {stat.trend.direction === 'up' ? (
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                )}
                <span className={cn(
                  "text-xs",
                  stat.trend.direction === 'up' ? "text-green-600" : "text-red-600"
                )}>
                  {stat.trend.value}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}