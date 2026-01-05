'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

interface CourseHighlight {
  id: number
  title: string
  category: string
  duration: string
  isNew: boolean
  isTrending: boolean
  reason?: string
}

interface RecommendedCoursesResponse {
  courses: CourseHighlight[]
}

export function HighlightsSidebar() {
  const { apply } = useDashboardVocabulary()
  const [courses, setCourses] = useState<CourseHighlight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/courses/recommended?limit=3')
        if (!response.ok) throw new Error('Erro ao carregar destaques')
        const data: RecommendedCoursesResponse = await response.json()
        if (!cancelled) setCourses(data.courses || [])
      } catch {
        if (!cancelled) setCourses([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className="temple-card">
      <CardHeader>
        <CardTitle className="text-lg temple-section-title">{apply('Destaques do Templo')}</CardTitle>
        <CardDescription className="text-[hsl(var(--temple-text-secondary))]">
          {apply('Cursos e produtos em evidência para este ciclo.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-[hsl(var(--temple-border-subtle))] p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 mt-2" />
                <Skeleton className="h-3 w-24 mt-2" />
              </div>
            ))}
          </>
        ) : courses.length ? (
          courses.map((course) => {
            const reason = course.reason
              || (course.isTrending ? apply('Em ascensão na comunidade.') : course.isNew ? apply('Novo portal aberto.') : apply('Aprofunda sua jornada atual.'))

            return (
              <div
                key={course.id}
                className="flex items-start gap-3 rounded-lg border border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-4"
              >
                <div className="h-10 w-10 rounded-lg bg-[hsl(var(--temple-surface-3))] flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-[hsl(var(--temple-accent-gold))]" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[hsl(var(--temple-text-primary))]">{course.title}</p>
                    {(course.isNew || course.isTrending) && (
                      <Badge variant="secondary" className="temple-chip text-[10px]">
                        {course.isTrending ? apply('Em foco') : apply('Novo')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[hsl(var(--temple-text-secondary))]">{reason}</p>
                  <div className="flex items-center justify-between text-xs text-[hsl(var(--temple-text-secondary))]">
                    <Badge variant="outline" className="temple-chip text-[10px]">
                      {course.category || apply('Jornada')}
                    </Badge>
                    <span>{course.duration}</span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/dashboard/courses">{apply('Explorar')}</Link>
                  </Button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-lg border border-dashed border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--temple-accent-gold))]" />
            <p className="text-sm text-[hsl(var(--temple-text-secondary))]">
              {apply('Sem destaques no momento.')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
