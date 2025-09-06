"use client"

import { BookOpen, Award, MessageCircle, Star, Clock, Calendar, ChevronRight } from "lucide-react"

interface Activity {
  id: string
  type: 'course_completed' | 'certificate_earned' | 'comment_posted' | 'rating_given' | 'lesson_completed' | 'quiz_passed'
  title: string
  description: string
  timestamp: string
  metadata?: {
    courseName?: string
    rating?: number
    points?: number
    certificateId?: string
  }
}

interface ProfileActivityProps {
  activities: Activity[]
  loading?: boolean
}

export default function ProfileActivity({ activities, loading = false }: ProfileActivityProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'course_completed':
        return BookOpen
      case 'certificate_earned':
        return Award
      case 'comment_posted':
        return MessageCircle
      case 'rating_given':
        return Star
      case 'lesson_completed':
        return Clock
      case 'quiz_passed':
        return Award
      default:
        return Clock
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'course_completed':
        return 'text-green-600 bg-green-50'
      case 'certificate_earned':
        return 'text-purple-600 bg-purple-50'
      case 'comment_posted':
        return 'text-blue-600 bg-blue-50'
      case 'rating_given':
        return 'text-yellow-600 bg-yellow-50'
      case 'lesson_completed':
        return 'text-indigo-600 bg-indigo-50'
      case 'quiz_passed':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `${diffInMinutes} min atrás`
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`
    } else if (diffInHours < 48) {
      return 'Ontem'
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays} dias atrás`
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded mb-2 w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-start gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Atividades Recentes</h2>
          <p className="text-gray-600 mt-1">Acompanhe suas últimas ações na plataforma</p>
        </div>
        <div className="p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma atividade ainda</h3>
          <p className="text-gray-600 mb-6">
            Comece a explorar os cursos para ver suas atividades aqui.
          </p>
          <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Explorar Cursos
          </button>
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
            <h2 className="text-xl font-semibold text-gray-900">Atividades Recentes</h2>
            <p className="text-gray-600 mt-1">Suas últimas {activities.length} atividades</p>
          </div>
          <button className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium">
            Ver todas
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Activities List */}
      <div className="p-6">
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            const colorClass = getActivityColor(activity.type)
            
            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {activity.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {activity.description}
                      </p>
                      
                      {/* Metadata */}
                      {activity.metadata && (
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {activity.metadata.courseName && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {activity.metadata.courseName}
                            </span>
                          )}
                          {activity.metadata.rating && (
                            <span className="flex items-center gap-1">
                              {renderStars(activity.metadata.rating)}
                            </span>
                          )}
                          {activity.metadata.points && (
                            <span className="flex items-center gap-1 text-purple-600 font-medium">
                              +{activity.metadata.points} XP
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Timestamp */}
                    <div className="flex-shrink-0 ml-4">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Mantenha-se ativo!</h3>
              <p className="text-sm text-gray-600 mt-1">
                Complete mais lições para ganhar pontos e subir de nível.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">
                Meta diária: 30min
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}