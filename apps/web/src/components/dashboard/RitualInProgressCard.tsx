'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Compass, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

interface CourseProgress {
  courseId: string
  courseTitle: string
  completedLessons: number
  totalLessons: number
  progress: number
}

interface ProgressData {
  courseProgress: CourseProgress[]
}

export function RitualInProgressCard() {
  const { apply } = useDashboardVocabulary()
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/user/progress')
        if (!response.ok) throw new Error('Erro ao carregar dados de progresso')
        const data = await response.json()
        if (!cancelled) setProgressData({ courseProgress: data.courseProgress || [] })
      } catch {
        if (!cancelled) setProgressData({ courseProgress: [] })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const nextCourse = useMemo(() => {
    const list = progressData?.courseProgress || []
    if (!list.length) return null
    return [...list].sort((a, b) => b.progress - a.progress)[0]
  }, [progressData])

  if (loading) {
    return (
      <Card className="temple-card">
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="temple-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-serif text-[hsl(var(--temple-text-primary))]">
          <Compass className="h-5 w-5 text-[hsl(var(--temple-accent-violet))]" />
          {apply('Ritual em andamento')}
        </CardTitle>
        <CardDescription className="text-[hsl(var(--temple-text-secondary))]">
          {apply('Você está pronto para a próxima etapa?')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {progressData?.courseProgress?.length ? (
          progressData.courseProgress.slice(0, 3).map((course) => (
            <div key={course.courseId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[hsl(var(--temple-text-primary))]">{course.courseTitle}</span>
                <Badge variant="secondary" className="temple-chip text-xs">
                  {course.progress}%
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-[hsl(var(--temple-text-secondary))]">
                <span>{apply(`${course.completedLessons}/${course.totalLessons} ritos`)}</span>
                <span>{apply('Próximo portal em breve')}</span>
              </div>
              <Progress
                value={course.progress}
                className="h-2"
                indicatorClassName="bg-gradient-to-r from-[hsl(var(--temple-accent-violet))] to-[hsl(var(--temple-accent-gold))]"
              />
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--temple-accent-gold))]" />
            <p className="text-sm text-[hsl(var(--temple-text-secondary))]">
              {apply('Nenhum ritual iniciado. Abra seu primeiro portal.')}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-[hsl(var(--temple-text-secondary))]">
            {nextCourse
              ? apply(`Próximo portal: ${nextCourse.courseTitle}`)
              : apply('Escolha um portal para iniciar sua jornada.')}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/progress">{apply('Ver trilha completa')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
