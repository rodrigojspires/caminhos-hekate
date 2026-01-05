'use client'

import { useEffect, useMemo, useState } from 'react'
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
  description: string
  duration: string
  level: string
  isTrending: boolean
  isNew: boolean
}

interface ProgressPayload {
  courseProgress: Array<{ courseId: string }>
}

interface RecommendedCoursesResponse {
  courses: CourseHighlight[]
}

export function CoursesHighlightsSidebar() {
  const { apply } = useDashboardVocabulary()
  const [courses, setCourses] = useState<CourseHighlight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const [progressRes, coursesRes] = await Promise.all([
          fetch('/api/user/progress'),
          fetch('/api/courses/recommended?limit=6')
        ])
        const progressJson: ProgressPayload = progressRes.ok ? await progressRes.json() : { courseProgress: [] }
        const coursesJson: RecommendedCoursesResponse = coursesRes.ok ? await coursesRes.json() : { courses: [] }

        if (cancelled) return

        const enrolled = new Set(
          (progressJson.courseProgress || []).map((course) => String(course.courseId))
        )
        const filtered = (coursesJson.courses || []).filter((course) => !enrolled.has(String(course.id)))
        setCourses(filtered.slice(0, 3))
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

  const bannerText = useMemo(() => {
    if (courses.length) return apply('Novos portais para expandir sua jornada.')
    return apply('Tudo em dia. Explore novos caminhos quando quiser.')
  }, [apply, courses.length])

  return (
    <Card className="temple-card">
      <CardHeader>
        <CardTitle className="text-lg temple-section-title">{apply('Cursos em Destaque')}</CardTitle>
        <CardDescription className="text-[hsl(var(--temple-text-secondary))]">
          {bannerText}
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
          courses.map((course) => (
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
                      {apply(course.isTrending ? 'Em foco' : 'Novo')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[hsl(var(--temple-text-secondary))] line-clamp-2">{course.description}</p>
                <div className="flex items-center justify-between text-xs text-[hsl(var(--temple-text-secondary))]">
                  <Badge variant="outline" className="temple-chip text-[10px]">
                    {course.level || apply('Jornada')}
                  </Badge>
                  <span>{course.duration}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-[hsl(var(--temple-border-subtle))] bg-[hsl(var(--temple-surface-2))] p-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-[hsl(var(--temple-accent-gold))]" />
            <p className="text-sm text-[hsl(var(--temple-text-secondary))]">
              {apply('Sem novos cursos no momento.')}
            </p>
          </div>
        )}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href="/dashboard/courses">{apply('Explorar cursos')}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
