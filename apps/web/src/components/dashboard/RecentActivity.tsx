'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Award, 
  MessageCircle, 
  Heart, 
  Share2,
  Clock,
  CheckCircle,
  Star,
  Users,
  Calendar,
  Trophy,
  Target,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

// Tipos de atividade
type ActivityType = 
  | 'lesson_completed' 
  | 'course_started' 
  | 'certificate_earned' 
  | 'comment_posted' 
  | 'like_received' 
  | 'achievement_unlocked'
  | 'session_scheduled'
  | 'milestone_reached'
  | 'forum_post'
  | 'course_completed'

interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  metadata?: {
    courseName?: string
    lessonName?: string
    certificateName?: string
    achievementName?: string
    userName?: string
    likes?: number
    comments?: number
    progress?: number
  }
}

interface ActivitiesResponse {
  activities: Activity[]
  total: number
  hasMore: boolean
}



const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'lesson_completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'course_started':
      return <BookOpen className="h-4 w-4 text-blue-600" />
    case 'certificate_earned':
      return <Award className="h-4 w-4 text-yellow-600" />
    case 'comment_posted':
      return <MessageCircle className="h-4 w-4 text-purple-600" />
    case 'like_received':
      return <Heart className="h-4 w-4 text-red-600" />
    case 'achievement_unlocked':
      return <Trophy className="h-4 w-4 text-orange-600" />
    case 'session_scheduled':
      return <Calendar className="h-4 w-4 text-indigo-600" />
    case 'milestone_reached':
      return <Target className="h-4 w-4 text-emerald-600" />
    case 'forum_post':
      return <Users className="h-4 w-4 text-cyan-600" />
    case 'course_completed':
      return <Star className="h-4 w-4 text-amber-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-600" />
  }
}

const getActivityColor = (type: ActivityType) => {
  switch (type) {
    case 'lesson_completed':
      return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
    case 'course_started':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
    case 'certificate_earned':
      return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
    case 'comment_posted':
      return 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800'
    case 'like_received':
      return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
    case 'achievement_unlocked':
      return 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800'
    case 'session_scheduled':
      return 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-800'
    case 'milestone_reached':
      return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
    default:
      return 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800'
  }
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      const response = await fetch('/api/user/activities?limit=10')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar atividades')
      }
      
      const data: ActivitiesResponse = await response.json()
      setActivities(data.activities)
    } catch (error) {
      console.error('Erro ao buscar atividades:', error)
      setError('Não foi possível carregar as atividades')
      toast.error('Erro ao carregar atividades')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchActivities(true)
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-6 space-y-4 pb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
              <CardDescription>
                Suas últimas ações e conquistas
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Erro ao carregar atividades</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleRefresh}>
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>
              Suas últimas ações e conquistas
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px] px-6">
          <div className="space-y-4 pb-6">
            {activities.length > 0 ? (
              activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${getActivityColor(activity.type)}`}
              >
                <div className="flex items-start gap-3">
                  {/* Activity Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-sm">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {activity.description}
                        </p>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.timestamp), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </time>
                    </div>

                    {/* Activity Metadata */}
                    {activity.metadata && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {activity.metadata.courseName && (
                          <Badge variant="secondary" className="text-xs">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {activity.metadata.courseName}
                          </Badge>
                        )}
                        {activity.metadata.achievementName && (
                          <Badge variant="secondary" className="text-xs">
                            <Trophy className="h-3 w-3 mr-1" />
                            {activity.metadata.achievementName}
                          </Badge>
                        )}
                        {activity.metadata.likes && activity.metadata.likes > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Heart className="h-3 w-3 mr-1" />
                            {activity.metadata.likes}
                          </Badge>
                        )}
                        {activity.metadata.comments && activity.metadata.comments > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {activity.metadata.comments}
                          </Badge>
                        )}
                        {activity.metadata.progress && (
                          <Badge variant="outline" className="text-xs">
                            <Target className="h-3 w-3 mr-1" />
                            {activity.metadata.progress}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma atividade recente</h3>
                <p className="text-sm">Comece a usar a plataforma para ver suas atividades aqui</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}