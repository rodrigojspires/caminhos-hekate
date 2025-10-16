"use client"

import { CheckCircle, Circle, Clock, Star, Award, BookOpen, Target } from "lucide-react"

interface TimelineEvent {
  id: string
  type: 'milestone' | 'course_start' | 'course_complete' | 'certificate' | 'achievement'
  title: string
  description: string
  date: string
  status: 'completed' | 'current' | 'upcoming'
  metadata?: {
    courseName?: string
    points?: number
    certificateId?: string
    progress?: number
    orderNumber?: string
    reasonLabel?: string
  }
}

interface ProgressTimelineProps {
  events: TimelineEvent[]
  loading?: boolean
}

export default function ProgressTimeline({ events, loading = false }: ProgressTimelineProps) {
  const getEventIcon = (type: TimelineEvent['type'], status: TimelineEvent['status']) => {
    const iconClass = status === 'completed' ? 'text-green-600' : status === 'current' ? 'text-purple-600' : 'text-gray-400'
    
    switch (type) {
      case 'milestone':
        return <Target className={`w-5 h-5 ${iconClass}`} />
      case 'course_start':
        return <BookOpen className={`w-5 h-5 ${iconClass}`} />
      case 'course_complete':
        return <CheckCircle className={`w-5 h-5 ${iconClass}`} />
      case 'certificate':
        return <Award className={`w-5 h-5 ${iconClass}`} />
      case 'achievement':
        return <Star className={`w-5 h-5 ${iconClass}`} />
      default:
        return <Circle className={`w-5 h-5 ${iconClass}`} />
    }
  }

  const getEventColor = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'current':
        return 'bg-purple-50 border-purple-200'
      case 'upcoming':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded mb-2 w-1/3 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
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

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Linha do Tempo</h2>
          <p className="text-gray-600 mt-1">Acompanhe seu progresso ao longo do tempo</p>
        </div>
        <div className="p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum evento ainda</h3>
          <p className="text-gray-600 mb-6">
            Comece sua jornada de aprendizado para ver seu progresso aqui.
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
        <h2 className="text-xl font-semibold text-gray-900">Linha do Tempo</h2>
        <p className="text-gray-600 mt-1">Sua jornada de aprendizado</p>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          {/* Timeline Events */}
          <div className="space-y-6">
            {events.map((event, index) => {
              const isLast = index === events.length - 1
              
              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Event Icon */}
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                    event.status === 'completed' 
                      ? 'bg-green-50 border-green-200' 
                      : event.status === 'current'
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    {getEventIcon(event.type, event.status)}
                  </div>

                  {/* Event Content */}
                  <div className={`flex-1 pb-6 ${!isLast ? 'border-b border-gray-100' : ''}`}>
                    <div className={`p-4 rounded-lg border ${getEventColor(event.status)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {event.description}
                          </p>
                          
                          {/* Metadata */}
                          {event.metadata && (
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                              {event.metadata.courseName && (
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {event.metadata.courseName}
                                </span>
                              )}
                              {event.metadata.points && (
                                <span className="flex items-center gap-1 text-purple-600 font-medium">
                                  +{event.metadata.points} XP
                                </span>
                              )}
                              {event.metadata.progress !== undefined && (
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  {event.metadata.progress}% concluído
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Date */}
                        <div className="flex-shrink-0 ml-4">
                          <span className="text-xs text-gray-500 font-medium">
                            {formatDate(event.date)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Bar for Current Events */}
                      {event.status === 'current' && event.metadata?.progress !== undefined && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Progresso</span>
                            <span>{event.metadata.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${event.metadata.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 pb-6">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Resumo do Progresso</h3>
              <p className="text-sm text-gray-600 mt-1">
                {events.filter(e => e.status === 'completed').length} de {events.length} marcos alcançados
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((events.filter(e => e.status === 'completed').length / events.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600">Completo</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-white rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(events.filter(e => e.status === 'completed').length / events.length) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
