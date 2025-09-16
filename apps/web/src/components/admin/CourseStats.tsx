'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Users, DollarSign, TrendingUp } from 'lucide-react'
import { LoadingSpinner } from '@/components/admin/LoadingSpinner'

interface CourseStatsData {
  totalCourses: number
  totalEnrollments: number
  totalRevenue: number
  averagePrice: number
  coursesByStatus: {
    PUBLISHED: number
    DRAFT: number
    ARCHIVED: number
  }
  coursesByLevel: {
    BEGINNER: number
    INTERMEDIATE: number
    ADVANCED: number
    EXPERT: number
  }
}

export default function CourseStats() {
  const [stats, setStats] = useState<CourseStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/courses/stats')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      setError('Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center h-20">
              <LoadingSpinner size="sm" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300">{error || 'Erro ao carregar estatísticas'}</p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total de Cursos',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'blue',
      description: `${stats.coursesByStatus.PUBLISHED} publicados`
    },
    {
      title: 'Total de Inscrições',
      value: stats.totalEnrollments,
      icon: Users,
      color: 'green',
      description: 'Estudantes ativos'
    },
    {
      title: 'Receita Total',
      value: `R$ ${Number(stats.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'yellow',
      description: 'Faturamento total'
    },
    {
      title: 'Preço Médio',
      value: `R$ ${Number(stats.averagePrice || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'purple',
      description: 'Por curso'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      purple: 'bg-purple-50 text-purple-600'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{card.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${getColorClasses(card.color)} dark:opacity-90` }>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Distribuição por status e nível */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Status */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cursos por Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Publicados</span>
              <span className="font-medium text-green-600">{stats.coursesByStatus.PUBLISHED}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Rascunhos</span>
              <span className="font-medium text-yellow-600">{stats.coursesByStatus.DRAFT}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Arquivados</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">{stats.coursesByStatus.ARCHIVED}</span>
            </div>
          </div>
        </div>

        {/* Por Nível */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cursos por Nível</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Iniciante</span>
              <span className="font-medium text-blue-600">{stats.coursesByLevel.BEGINNER}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Intermediário</span>
              <span className="font-medium text-green-600">{stats.coursesByLevel.INTERMEDIATE}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Avançado</span>
              <span className="font-medium text-yellow-600">{stats.coursesByLevel.ADVANCED}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Especialista</span>
              <span className="font-medium text-purple-600">{stats.coursesByLevel.EXPERT}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
