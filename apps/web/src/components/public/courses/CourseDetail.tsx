"use client"

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LessonList } from '@/components/dashboard/courses/LessonList'
import VideoPlayer from '@/components/dashboard/courses/VideoPlayer'
import LessonQuiz from '@/components/public/courses/LessonQuiz'
import useCourseProgress from '@/hooks/useCourseProgress'

type CourseDetailProps = {
  course: any
  canAccessAllContent: boolean
  initialEnrolled?: boolean
}

export default function CourseDetail({ course, canAccessAllContent, initialEnrolled = false }: CourseDetailProps) {
  const { getLessonProgress, updateWatchTime, markLessonComplete } = useCourseProgress()
  const [enrolled, setEnrolled] = useState<boolean>(initialEnrolled)
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(() => {
    // Default to first free lesson or first lesson
    const firstLesson = course.modules?.[0]?.lessons?.[0]
    return firstLesson?.id || null
  })

  const currentLesson = useMemo(() => {
    for (const m of course.modules || []) {
      const l = (m.lessons || []).find((x: any) => x.id === currentLessonId)
      if (l) return l
    }
    return null
  }, [course.modules, currentLessonId])

  const modulesForList = useMemo(() => {
    return (course.modules || []).map((m: any) => {
      const lessons = (m.lessons || []).map((l: any) => {
        const lp = getLessonProgress(course.id, l.id)
        const lockedByTier = !canAccessAllContent
        const lockedByEnrollment = !l.isFree && !enrolled
        const locked = lockedByTier || lockedByEnrollment
        return {
          id: l.id,
          title: l.title,
          description: l.description || undefined,
          duration: l.videoDuration || 0,
          type: l.videoUrl ? 'video' : 'text',
          isCompleted: !!lp?.completed,
          isLocked: locked,
          order: l.order,
        }
      })

      const completedLessons = lessons.filter((l: any) => l.isCompleted).length
      const totalDuration = lessons.reduce((sum: number, l: any) => sum + (l.duration || 0), 0)
      return {
        id: m.id,
        title: m.title,
        description: m.description || undefined,
        lessons,
        isCompleted: completedLessons > 0 && completedLessons === lessons.length,
        completedLessons,
        totalLessons: lessons.length,
        duration: totalDuration,
        order: m.order,
      }
    })
  }, [course.modules, course.id, canAccessAllContent, getLessonProgress, enrolled])

  const resumeTime = useMemo(() => {
    if (!currentLessonId) return 0
    const lp = getLessonProgress(course.id, currentLessonId)
    return lp?.watchTime || 0
  }, [course.id, currentLessonId, getLessonProgress])

  // Throttle progress updates to backend
  const sendProgress = useMemo(() => {
    let timeout: any = null
    let lastPayload: { time: number } | null = null

    const flush = async (courseId: string, lessonId: string) => {
      if (!lastPayload) return
      try {
        await fetch(`/api/courses/${courseId}/lessons/${lessonId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ time: Math.floor(lastPayload.time) }),
        })
      } catch (e) {
        // ignore network errors for now
      }
      lastPayload = null
    }

    return (courseId: string, lessonId: string, time: number) => {
      lastPayload = { time }
      if (!timeout) {
        timeout = setTimeout(() => {
          flush(courseId, lessonId)
          timeout = null
        }, 3000)
      }
    }
  }, [])

  const handleTimeUpdate = useCallback((time: number) => {
    if (!currentLessonId) return
    updateWatchTime(course.id, currentLessonId, Math.floor(time), currentLesson?.videoDuration || 0)
    sendProgress(course.id, currentLessonId, time)
  }, [course.id, currentLesson?.videoDuration, currentLessonId, sendProgress, updateWatchTime])

  const handleComplete = useCallback(async () => {
    if (!currentLessonId) return
    await markLessonComplete(course.id, currentLessonId)
    try {
      await fetch(`/api/courses/${course.id}/lessons/${currentLessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true })
      })
    } catch {}
  }, [course.id, currentLessonId, markLessonComplete])

  // Fetch enrollment on mount if not provided
  useEffect(() => {
    let mounted = true
    if (!initialEnrolled) {
      fetch(`/api/courses/${course.id}/enrollment`).then(async (r) => {
        if (!mounted) return
        const j = await r.json().catch(() => ({ enrolled: false }))
        setEnrolled(!!j.enrolled)
      }).catch(() => {})
    }
    return () => { mounted = false }
  }, [course.id, initialEnrolled])

  const onEnroll = async () => {
    try {
      const res = await fetch(`/api/courses/${course.id}/enrollment`, { method: 'POST' })
      if (res.ok) {
        const j = await res.json()
        setEnrolled(!!j.enrolled)
      }
    } catch {}
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold">{course.title}</h1>
                <p className="text-sm text-muted-foreground">{course.shortDescription}</p>
              </div>
              <Badge variant="outline">{course.level || 'BEGINNER'}</Badge>
            </div>

            {currentLesson ? (
              <div className="space-y-3">
                <VideoPlayer
                  src={currentLesson.videoUrl || ''}
                  title={currentLesson.title}
                  duration={currentLesson.videoDuration || 0}
                  currentTime={resumeTime}
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full"
                />

                {(!canAccessAllContent) && (
                  <div className="p-3 text-sm bg-yellow-50 border border-yellow-200 rounded">
                    Este curso requer o nível {course.tier}. <a href="/precos" className="underline text-primary">Faça upgrade</a> para assistir.
                  </div>
                )}

                {(canAccessAllContent && !currentLesson.isFree && !enrolled) && (
                  <div className="p-3 text-sm bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                    <span>Inscreva-se no curso para acessar esta lição.</span>
                    <button className="text-sm text-primary underline" onClick={onEnroll}>Inscrever-se</button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div>
                    <h2 className="font-medium">{currentLesson.title}</h2>
                    {currentLesson.description && (
                      <p className="text-sm text-muted-foreground">{currentLesson.description}</p>
                    )}
                  </div>
                  <button className="text-sm text-primary" onClick={handleComplete}>Marcar como concluída</button>
                </div>

                {/* Quiz da lição, se houver e usuário puder acessar */}
                {canAccessAllContent && (currentLesson.isFree || enrolled) && (
                  <LessonQuiz courseId={course.id} lessonId={currentLesson.id} />
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">Selecione uma lição para começar</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <LessonList
          modules={modulesForList}
          currentLessonId={currentLessonId || undefined}
          onLessonSelect={(lessonId) => setCurrentLessonId(lessonId)}
        />
      </div>
    </div>
  )
}
