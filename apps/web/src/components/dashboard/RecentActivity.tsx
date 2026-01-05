'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Award, 
  MessageCircle, 
  Heart, 
  Feather,
  Clock,
  CheckCircle,
  Star,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Key
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

type ActivityType = 
  | 'lesson_completed' 
  | 'course_started' 
  | 'certificate_earned' 
  | 'comment_posted' 
  | 'course_completed'
  | 'achievement_unlocked'

interface Activity {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  metadata?: {
    courseName?: string
    lessonName?: string
  }
}

interface ActivitiesResponse {
  activities: Activity[]
}

const getActivityProps = (type: ActivityType) => {
  switch (type) {
    case 'lesson_completed':
      return { icon: CheckCircle, color: 'text-green-400', title: 'Rito Concluído' }
    case 'course_started':
      return { icon: BookOpen, color: 'text-blue-400', title: 'Portal Cruzado' }
    case 'certificate_earned':
      return { icon: Key, color: 'text-yellow-400', title: 'Chave Forjada' }
    case 'comment_posted':
      return { icon: Feather, color: 'text-purple-400', title: 'Voz Ecoada' }
    case 'achievement_unlocked':
      return { icon: Sparkles, color: 'text-orange-400', title: 'Patamar Alcançado' }
    case 'course_completed':
      return { icon: Star, color: 'text-amber-400', title: 'Maestria Atingida' }
    default:
      return { icon: Clock, color: 'text-gray-400', title: 'Rastro Deixado' }
  }
}

export function RecentActivity() {
  const { apply } = useDashboardVocabulary()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const favorites: Activity[] = []

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/user/activities?limit=15')
      if (!response.ok) throw new Error('Erro ao carregar atividades')
      const data: ActivitiesResponse = await response.json()
      setActivities(data.activities)
    } catch (error) {
      setError('Não foi possível ler os rastros da jornada.')
      toast.error('Erro ao carregar seus rastros.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  if (loading) {
    return (
      <Card className="temple-card h-full">
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="px-6 pt-2">
          <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
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
      <Card className="temple-card h-full">
        <CardContent className="flex flex-col items-center justify-center text-center h-full">
            <AlertCircle className="h-12 w-12 text-red-400/80 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--temple-text-primary))]">{apply('Falha ao Ler os Rastros')}</h3>
            <p className="text-[hsl(var(--temple-text-secondary))] text-sm max-w-sm mx-auto">{apply(error)}</p>
            <Button onClick={fetchActivities} variant="outline" className="mt-6">
              {apply('Tentar Novamente')}
            </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="temple-card h-full flex flex-col">
      <CardHeader>
          <CardTitle className="font-serif text-[hsl(var(--temple-text-primary))]">{apply('Recente & Favoritos')}</CardTitle>
          <CardDescription className="text-[hsl(var(--temple-text-secondary))]">
            {apply('Materiais vistos recentemente e atalhos guardados para retorno rápido.')}
          </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <div className="px-6 pt-2 pb-4">
          <div className="rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[hsl(var(--temple-text-primary))]">{apply('Favoritos')}</span>
              <Badge variant="secondary" className="temple-chip text-xs">
                {apply(`${favorites.length} salvos`)}
              </Badge>
            </div>
            {favorites.length ? (
              <div className="mt-3 space-y-2">
                {favorites.slice(0, 3).map((favorite) => (
                  <div key={favorite.id} className="text-xs text-[hsl(var(--temple-text-secondary))]">
                    {favorite.title}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-xs text-[hsl(var(--temple-text-secondary))]">
                {apply('Sem favoritos ainda. Guarde materiais para acesso rápido.')}
              </div>
            )}
            <Button asChild variant="outline" size="sm" className="mt-3 w-full">
              <Link href="/dashboard/courses">{apply('Explorar biblioteca')}</Link>
            </Button>
          </div>
        </div>
        <ScrollArea className="h-[420px] px-6">
          <div className="relative space-y-6 pb-6">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-[hsl(var(--temple-border-subtle))]" />
            {activities.length > 0 ? (
              activities.map((activity, index) => {
                const { icon: Icon, color, title } = getActivityProps(activity.type)
                const description = activity.metadata?.lessonName || activity.metadata?.courseName || activity.description;
                
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.08 }}
                    className="flex items-start gap-4 relative"
                  >
                    <div className="h-8 w-8 rounded-full bg-[hsl(var(--temple-surface-3))] flex items-center justify-center flex-shrink-0 border-2 border-[hsl(var(--temple-border-subtle))] z-10">
                        <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <h4 className="font-bold text-sm text-[hsl(var(--temple-text-primary))]">{title}</h4>
                        <p className="text-sm text-[hsl(var(--temple-text-secondary))] truncate">{description}</p>
                        <time className="text-xs text-[hsl(var(--temple-text-secondary))]">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ptBR })}
                        </time>
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <div className="flex items-center justify-center h-full py-12 text-[hsl(var(--temple-text-secondary))]">
                <div className="text-center">
                  <Feather className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-1">{apply('Seus ecos ainda serão marcados.')}</h3>
                  <p className="text-sm">{apply('Inicie sua jornada para deixar sua marca na trilha.')}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
