"use client"

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LessonList } from '@/components/dashboard/courses/LessonList'
import VideoPlayer from '@/components/dashboard/courses/VideoPlayer'
import LessonQuiz from '@/components/public/courses/LessonQuiz'
import useCourseProgress from '@/hooks/useCourseProgress'
import { Button } from '@/components/ui/button'
import { Download, FileText, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { resolveMediaUrl } from '@/lib/utils'

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
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null)

  const currentLesson = useMemo(() => {
    for (const m of course.modules || []) {
      const l = (m.lessons || []).find((x: any) => x.id === currentLessonId)
      if (l) return l
    }
    return null
  }, [course.modules, currentLessonId])

  const currentLessonVideoUrl = useMemo(
    () => resolveMediaUrl(currentLesson?.videoUrl ?? null),
    [currentLesson?.videoUrl]
  )

  // Secure signed URL state for protected course videos
  const [signedVideoSrc, setSignedVideoSrc] = useState<string | null>(null)
  const [signingError, setSigningError] = useState<string | null>(null)

  // Helper: detect course-videos path and extract relative path
  const normalizeCourseVideoRel = (url?: string | null): string | null => {
    if (!url) return null
    const trimmed = url.trim()
    if (!trimmed) return null
    const cleaned = trimmed.replace(/^https?:\/\/[^/]+\//, '/').replace(/^\/+/, '/')
    const withoutPrefix = cleaned
      .replace(/^\/uploads\//, '')
      .replace(/^\/private\//, '')
    if (!withoutPrefix.startsWith('course-videos/')) return null
    const safe = withoutPrefix.replace(/\.\.+/g, '').replace(/[^a-zA-Z0-9_\-./]/g, '')
    return safe
  }

  // Fetch signed URL when lesson video is a protected course video and user has access
  useEffect(() => {
    let abort = false
    setSigningError(null)

    const rel = normalizeCourseVideoRel(currentLesson?.videoUrl)
    const locked = !currentLesson || (!currentLesson.isFree && !(canAccessAllContent || enrolled))

    if (!rel || locked) {
      setSignedVideoSrc(null)
      return
    }

    ;(async () => {
      try {
        const params = new URLSearchParams({ path: rel, courseId: String(course.id) })
        const res = await fetch(`/api/media/course-videos/token?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store'
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || `Falha ao gerar acesso ao vídeo (${res.status})`)
        }
        const j = await res.json()
        if (!abort) {
          setSignedVideoSrc(j.url || null)
        }
      } catch (e: any) {
        if (!abort) {
          setSignedVideoSrc(null)
          setSigningError(e?.message || 'Não foi possível gerar acesso ao vídeo.')
        }
      }
    })()

    return () => { abort = true }
  }, [currentLesson?.videoUrl, currentLesson?.isFree, canAccessAllContent, enrolled, course.id])

  const modulesForList = useMemo(() => {
    return (course.modules || []).map((m: any) => {
      const lessons = (m.lessons || []).map((l: any) => {
        const lp = getLessonProgress(course.id, l.id)
        const lockedByTier = !canAccessAllContent
        const lockedByEnrollment = !l.isFree && !enrolled
        const locked = lockedByTier || lockedByEnrollment
        const assetCount = Array.isArray(l.assets) ? l.assets.length : 0
        return {
          id: l.id,
          title: l.title,
          description: l.description || undefined,
          duration: l.videoDuration || 0,
          type: l.videoUrl ? 'video' : 'text',
          isCompleted: !!lp?.completed,
          isLocked: locked,
          hasResources: assetCount > 0,
          resourcesCount: assetCount,
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

  const lessonContent = useMemo(() => {
    if (!currentLesson?.content) return null
    const value = currentLesson.content as string
    const isLikelyHtml = /<\/?[a-z][\s\S]*>/i.test(value)
    if (isLikelyHtml) {
      return (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      )
    }
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">
        {value}
      </div>
    )
  }, [currentLesson?.content])

  // Obter progresso da lição atual
  const currentLessonProgress = useMemo(() => {
    if (!currentLesson?.id) return null
    return getLessonProgress(course.id, currentLesson.id)
  }, [course.id, currentLesson?.id, getLessonProgress])

  // Traduzir nível do curso
  const translateLevel = (level?: string | null) => {
    switch (level) {
      case 'BEGINNER':
        return 'Iniciante'
      case 'INTERMEDIATE':
        return 'Intermediário'
      case 'ADVANCED':
        return 'Avançado'
      case 'EXPERT':
        return 'Especialista'
      default:
        return 'Iniciante'
    }
  }

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

  const hasLessonAccess = useMemo(() => {
    if (!currentLesson) return false
    if (currentLesson.isFree) return true
    return canAccessAllContent || enrolled
  }, [canAccessAllContent, currentLesson, enrolled])

  const formatFileSize = (value?: number | null) => {
    if (!value || value <= 0) return ''
    if (value < 1024) return `${value} B`
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
    return `${(value / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDownloadAsset = async (asset: any) => {
    if (!currentLesson) return
    try {
      setDownloadingAssetId(asset.id)
      const response = await fetch(`/api/courses/${course.id}/lessons/${currentLesson.id}/assets/${asset.id}/download`)
      if (!response.ok) {
        let message = 'Não foi possível baixar o material.'
        const contentType = response.headers.get('Content-Type') || ''
        if (contentType.includes('application/json')) {
          const data = await response.json().catch(() => null)
          if (data?.error) {
            message = data.error
          }
        } else {
          const text = await response.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = asset.title || `material-${asset.id}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível baixar o material.'
      toast.error(message)
    } finally {
      setDownloadingAssetId(null)
    }
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
              <div className="flex items-center gap-2">
                <Badge variant="outline">{translateLevel(course.level || 'BEGINNER')}</Badge>
                {course?.category?.name && (
                  <Badge variant="outline">{course.category.name}</Badge>
                )}
              </div>
            </div>

            {currentLesson ? (
              <div className="space-y-3">
                {currentLessonVideoUrl ? (
                  hasLessonAccess ? (
                    <VideoPlayer
                      src={signedVideoSrc || currentLessonVideoUrl || ''}
                      title={currentLesson.title}
                      duration={currentLesson.videoDuration || 0}
                      currentTime={resumeTime}
                      onTimeUpdate={handleTimeUpdate}
                      className="w-full"
                    />
                  ) : (
                    <div className="p-6 bg-muted border border-border rounded-lg text-center space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Você precisa de acesso para assistir a este vídeo.
                      </p>
                      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                        {!canAccessAllContent && !currentLesson.isFree && !enrolled && (
                          <span>
                            Este curso requer o nível {course.tier}. <a href="/precos" className="underline text-primary">Faça upgrade</a> para desbloquear.
                          </span>
                        )}
                        {(canAccessAllContent && !currentLesson.isFree && !enrolled) && (
                          <span>
                            Inscreva-se no curso para acessar esta lição.
                            <button className="ml-1 text-primary underline" onClick={onEnroll}>
                              Inscrever-se
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-6 bg-muted border border-border rounded-lg text-center text-sm text-muted-foreground">
                    Este conteúdo não possui vídeo. Confira a descrição ou materiais de apoio da aula.
                  </div>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div>
                    <h2 className="font-medium">{currentLesson.title}</h2>
                    {currentLesson.description && (
                      <p className="text-sm text-muted-foreground">{currentLesson.description}</p>
                    )}
                  </div>
                  {currentLessonProgress?.completed ? (
                    <span className="inline-flex items-center text-emerald-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4 mr-1" /> Aula concluída
                    </span>
                  ) : (
                    <button className="text-sm text-primary" onClick={handleComplete}>Marcar como concluída</button>
                  )}
                </div>

                {lessonContent && (
                  <div className="mt-3 p-4 border border-border rounded-lg bg-muted/40">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Conteúdo detalhado
                    </h3>
                    {lessonContent}
                  </div>
                )}

                {/* Materiais da lição */}
                {hasLessonAccess && Array.isArray(currentLesson.assets) && currentLesson.assets.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Materiais da aula
                    </h3>
                    <div className="space-y-2">
                      {currentLesson.assets.map((asset: any) => (
                        <Card key={asset.id} className="border border-dashed">
                          <CardContent className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-primary/10 text-primary">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium leading-none">{asset.title || 'Material da aula'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {asset.type?.split('/')[1]?.toUpperCase() || 'ARQUIVO'} · {formatFileSize(asset.size)}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() => handleDownloadAsset(asset)}
                              disabled={downloadingAssetId === asset.id}
                            >
                              {downloadingAssetId === asset.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Baixando...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4" />
                                  Baixar
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quiz da lição, se houver e usuário puder acessar */}
                {hasLessonAccess && (
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
