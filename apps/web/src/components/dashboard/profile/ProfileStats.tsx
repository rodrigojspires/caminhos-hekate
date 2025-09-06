"use client"

import { Trophy, BookOpen, Clock, Star, TrendingUp, Award, Calendar, Target } from "lucide-react"

interface ProfileStatsProps {
  stats: {
    coursesCompleted: number
    totalStudyTime: number
    certificatesEarned: number
    averageRating: number
    currentStreak: number
    totalPoints: number
    rank: string
    joinDate: string
  }
  loading?: boolean
}

export default function ProfileStats({ stats, loading = false }: ProfileStatsProps) {
  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours === 0) {
      return `${remainingMinutes}min`
    } else if (remainingMinutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${remainingMinutes}min`
    }
  }

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    })
  }

  const getRankColor = (rank: string) => {
    switch (rank.toLowerCase()) {
      case 'bronze':
        return 'text-amber-600 bg-amber-50'
      case 'prata':
      case 'silver':
        return 'text-gray-600 bg-gray-50'
      case 'ouro':
      case 'gold':
        return 'text-yellow-600 bg-yellow-50'
      case 'platina':
      case 'platinum':
        return 'text-purple-600 bg-purple-50'
      case 'diamante':
      case 'diamond':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <div className="h-6 bg-gray-200 rounded mb-2 w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-2"></div>
              <div className="h-6 bg-gray-200 rounded mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const statItems = [
    {
      icon: BookOpen,
      value: stats.coursesCompleted,
      label: 'Cursos Concluídos',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      icon: Clock,
      value: formatStudyTime(stats.totalStudyTime),
      label: 'Tempo de Estudo',
      color: 'text-green-600 bg-green-50'
    },
    {
      icon: Award,
      value: stats.certificatesEarned,
      label: 'Certificados',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      icon: Star,
      value: stats.averageRating.toFixed(1),
      label: 'Avaliação Média',
      color: 'text-yellow-600 bg-yellow-50'
    },
    {
      icon: TrendingUp,
      value: `${stats.currentStreak} dias`,
      label: 'Sequência Atual',
      color: 'text-orange-600 bg-orange-50'
    },
    {
      icon: Target,
      value: stats.totalPoints.toLocaleString(),
      label: 'Pontos Totais',
      color: 'text-indigo-600 bg-indigo-50'
    },
    {
      icon: Trophy,
      value: stats.rank,
      label: 'Classificação',
      color: getRankColor(stats.rank)
    },
    {
      icon: Calendar,
      value: formatJoinDate(stats.joinDate),
      label: 'Membro desde',
      color: 'text-gray-600 bg-gray-50'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Estatísticas do Perfil</h2>
        <p className="text-gray-600 mt-1">Acompanhe seu progresso e conquistas</p>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={index}
                className="text-center p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-3 ${item.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {item.value}
                </div>
                <div className="text-sm text-gray-600">
                  {item.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Achievement Highlights */}
      <div className="px-6 pb-6">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Trophy className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Conquistas Recentes</h3>
              <p className="text-sm text-gray-600 mt-1">
                {stats.certificatesEarned > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    Último certificado obtido há 3 dias
                  </span>
                )}
                {stats.currentStreak >= 7 && (
                  <span className="inline-flex items-center gap-1 ml-4">
                    <TrendingUp className="w-4 h-4" />
                    Sequência de {stats.currentStreak} dias!
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Próximo Nível */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Próximo Nível</span>
              <span className="text-sm text-gray-600">
                {stats.totalPoints % 1000}/1000 XP
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stats.totalPoints % 1000) / 10}%` }}
              ></div>
            </div>
          </div>

          {/* Meta Mensal */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Meta Mensal</span>
              <span className="text-sm text-gray-600">
                {Math.min(stats.totalStudyTime, 1200)}/1200 min
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((stats.totalStudyTime / 1200) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}