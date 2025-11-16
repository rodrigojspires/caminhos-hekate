"use client"

import { useMemo, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CreditCard,
  QrCode,
  FileText,
  Play,
  CheckCircle2,
  BookOpen,
  ChevronRight
} from 'lucide-react'
import { resolveMediaUrl, normalizeMediaPath, isProtectedCourseVideoPath } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type LessonPreview = {
  id: string
  title: string
  order?: number | null
  isFree?: boolean | null
  videoDuration?: number | null
}

type ModulePreview = {
  id: string
  title: string
  description?: string | null
  order?: number | null
  lessons?: LessonPreview[]
}

type CoursePresentationProps = {
  course: {
    id: string
    title: string
    slug: string
    description: string
    shortDescription?: string | null
    featuredImage?: string | null
    introVideo?: string | null
    price?: number | null
    comparePrice?: number | null
    level?: string | null
    duration?: number | null
    accessModels?: string[]
    category?: { id: string; name: string; slug: string } | null
    objectives?: any
    requirements?: any
    targetAudience?: any
    tier?: string
    modules?: ModulePreview[]
  }
  userTier?: string
  canAccessBySubscription?: boolean
  isAdmin?: boolean
  initialEnrolled?: boolean
  initialEnrollmentStatus?: string | null
  continueUrl?: string
  isAuthenticated?: boolean
}

const levelLabels: Record<string, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
  EXPERT: 'Especialista'
}

const accessModelLabels: Record<string, string> = {
  FREE: 'Gratuito',
  ONE_TIME: 'Pagamento único',
  SUBSCRIPTION: 'Assinatura'
}

const tierLabels: Record<string, string> = {
  FREE: 'Gratuito',
  INICIADO: 'Iniciado',
  ADEPTO: 'Adepto',
  SACERDOCIO: 'Sacerdócio'
}

export default function CoursePresentation({
  course,
  userTier,
  canAccessBySubscription = false,
  isAdmin = false,
  initialEnrolled = false,
  initialEnrollmentStatus = null,
  continueUrl,
  isAuthenticated = false
}: CoursePresentationProps) {
  const router = useRouter()
  const [ctaLoading, setCtaLoading] = useState(false)
  const [enrolled, setEnrolled] = useState(initialEnrolled)
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(initialEnrollmentStatus)
  const heroImage = useMemo(() => resolveMediaUrl(course.featuredImage || null), [course.featuredImage])
  const [introVideoSrc, setIntroVideoSrc] = useState<string | null>(() => resolveMediaUrl(course.introVideo || null))
  const hasFreeLessons = useMemo(() => {
    return Array.isArray(course.modules)
      ? course.modules.some((m) => Array.isArray(m.lessons) && m.lessons.some((l) => !!l.isFree))
      : false
  }, [course.modules])

  useEffect(() => {
    let mounted = true
    if (!course.id) return
    fetch(`/api/courses/${course.id}/enrollment`)
      .then(async (r) => {
        if (!mounted) return
        const j = await r.json().catch(() => ({ enrolled: false }))
        setEnrolled(!!j.enrolled)
        setEnrollmentStatus(j.status || null)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [course.id])

  useEffect(() => {
    const normalized = normalizeMediaPath(course.introVideo)
    if (!normalized) {
      setIntroVideoSrc(null)
      return
    }
    const isProtectedVideo = isProtectedCourseVideoPath(normalized)
    let cancelled = false
    async function update() {
      if (isProtectedVideo) {
        try {
          const params = new URLSearchParams({ path: normalized, courseId: String(course.id) })
          const resp = await fetch(`/api/media/course-videos/token?${params.toString()}`)
          const json = await resp.json()
          if (resp.ok && json?.url) {
            if (!cancelled) setIntroVideoSrc(resolveMediaUrl(json.url))
            return
          }
        } catch {}
      }
      if (!cancelled) setIntroVideoSrc(resolveMediaUrl(normalized))
    }
    update()
    return () => {
      cancelled = true
    }
  }, [course.introVideo, course.id])

  const normalizedPrice = useMemo(() => {
    if (course.price == null) return null
    const parsed = Number(course.price)
    return Number.isNaN(parsed) ? null : parsed
  }, [course.price])

  const normalizedComparePrice = useMemo(() => {
    if (course.comparePrice == null) return null
    const parsed = Number(course.comparePrice)
    return Number.isNaN(parsed) ? null : parsed
  }, [course.comparePrice])

  const modules = useMemo(() => {
    const raw = Array.isArray(course.modules) ? course.modules : []
    return raw
      .map((module) => ({
        ...module,
        order: module.order ?? 0,
        lessons: Array.isArray(module.lessons) ? module.lessons : []
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [course.modules])

  const totalLessons = useMemo(
    () => modules.reduce((total, module) => total + (module.lessons?.length || 0), 0),
    [modules]
  )

  const isFree =
    normalizedPrice == null ||
    normalizedPrice === 0 ||
    (course.accessModels || []).includes('FREE') ||
    course.tier === 'FREE'
  const canDirectEnroll = isAdmin || canAccessBySubscription || isFree
  const hasActiveAccess = enrolled && enrollmentStatus === 'active'

  const priceBRL = useMemo(() => {
    if (normalizedPrice == null || normalizedPrice === 0) return 'Acesso gratuito'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalizedPrice)
  }, [normalizedPrice])

  const compareBRL = useMemo(() => {
    if (normalizedComparePrice == null || normalizedComparePrice === 0) return null
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalizedComparePrice)
  }, [normalizedComparePrice])

  const objectiveList = Array.isArray(course.objectives)
    ? course.objectives.filter((i: any) => typeof i === 'string')
    : []
  const requirementList = Array.isArray(course.requirements)
    ? course.requirements.filter((i: any) => typeof i === 'string')
    : []
  const audienceList = Array.isArray(course.targetAudience)
    ? course.targetAudience.filter((i: any) => typeof i === 'string')
    : []

  const onEnroll = useCallback(
    async (redirectOnSuccess = false) => {
      try {
        setCtaLoading(true)
        const res = await fetch(`/api/courses/${course.id}/enrollment`, { method: 'POST' })
        if (!res.ok) {
          if (res.status === 401) {
            toast.error('Faça login para se inscrever neste curso.')
            const callback = encodeURIComponent(`/cursos/${course.slug}`)
            router.push(`/auth/login?callbackUrl=${callback}`)
            return
          }
          const j = await res.json().catch(() => ({}))
          toast.error(j.error || 'Falha ao inscrever-se no curso')
          return
        }
        const j = await res.json()
        setEnrolled(!!j.enrolled)
        setEnrollmentStatus(j.status || null)
        if (j.status === 'pending') {
          toast.info('Inscrição pendente. Conclua o pagamento para liberar acesso.')
        } else {
          toast.success('Inscrição realizada com sucesso!')
          router.refresh()
          if (redirectOnSuccess) {
            router.push(continueUrl || `/cursos/${course.slug}?view=content`)
          }
        }
      } catch {
        toast.error('Erro ao processar inscrição')
      } finally {
        setCtaLoading(false)
      }
    },
    [continueUrl, course.id, course.slug, router]
  )

  const goToCart = useCallback(async () => {
    setCtaLoading(true)
    try {
      const res = await fetch(`/api/courses/${course.id}/add-to-cart`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json?.error || 'Não foi possível adicionar o curso ao carrinho.')
        return
      }
      if (json?.skipped && canDirectEnroll) {
        setCtaLoading(false)
        await onEnroll(true)
        return
      }
      toast.success('Curso adicionado ao carrinho.')
      router.push('/carrinho')
    } catch {
      toast.error('Não foi possível adicionar o curso ao carrinho.')
    } finally {
      setCtaLoading(false)
    }
  }, [canDirectEnroll, course.id, onEnroll, router])

  const primaryActionLabel = useMemo(() => {
    if (hasActiveAccess) return 'Acessar curso'
    if (canDirectEnroll) {
      return isFree ? 'Acessar gratuitamente' : 'Liberar acesso com assinatura'
    }
    return 'Ir para o carrinho'
  }, [canDirectEnroll, hasActiveAccess, isFree])

  const handlePrimaryAction = useCallback(async () => {
    if (ctaLoading) return
    if (hasActiveAccess) {
      router.push(continueUrl || `/cursos/${course.slug}?view=content`)
      return
    }
    if (canDirectEnroll) {
      await onEnroll(true)
      return
    }
    await goToCart()
  }, [ctaLoading, canDirectEnroll, continueUrl, course.slug, goToCart, hasActiveAccess, onEnroll, router])

  const subscriptionLabel = useMemo(() => {
    if (!course.tier) return null
    const label = tierLabels[course.tier] ?? course.tier
    if (isAdmin) return `${label} (Administrador)`
    if (userTier) {
      const userLabel = tierLabels[userTier] ?? userTier
      return `${label} · Seu plano: ${userLabel}`
    }
    return label
  }, [course.tier, isAdmin, userTier])

  const showPlanButton = useMemo(
    () => (course.accessModels || []).includes('SUBSCRIPTION'),
    [course.accessModels]
  )

  const handlePreviewEnroll = useCallback(async () => {
    if (ctaLoading) return
    try {
      setCtaLoading(true)
      const res = await fetch(`/api/courses/${course.id}/enrollment`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Faça login para acessar as aulas gratuitas.')
          const callback = encodeURIComponent(`/cursos/${course.slug}`)
          router.push(`/auth/login?callbackUrl=${callback}`)
          return
        }
        toast.error(j.error || 'Não foi possível liberar as aulas gratuitas.')
        return
      }
      setEnrolled(!!j.enrolled)
      setEnrollmentStatus(j.status || 'pending')
      toast.success('Acesso às aulas gratuitas liberado.')
    } catch {
      toast.error('Não foi possível liberar as aulas gratuitas.')
    } finally {
      setCtaLoading(false)
    }
  }, [ctaLoading, course.id, course.slug, router])

  return (
    <section className="space-y-8">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="relative w-full aspect-video bg-gradient-to-br from-purple-700/40 to-indigo-800/40">
            {heroImage ? (
              <Image src={heroImage} alt={course.title} fill className="object-cover" priority />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-12 h-12 text-white/80" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold text-white">{course.title}</h1>
                  {course.shortDescription && (
                    <p className="text-sm md:text-base text-white/90 mt-1">{course.shortDescription}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {course.level && (
                      <Badge variant="secondary" className="bg-white/90 text-gray-900">
                        {levelLabels[course.level] ?? course.level}
                      </Badge>
                    )}
                    {course.category?.name && (
                      <Badge variant="secondary" className="bg-white/90 text-gray-900">
                        {course.category.name}
                      </Badge>
                    )}
                    {(course.accessModels || []).map((m) => (
                      <Badge
                        key={m}
                        variant="outline"
                        className="bg-purple-100/80 text-purple-900 border-purple-300"
                      >
                        {accessModelLabels[m] ?? m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white text-xl md:text-2xl font-bold">{priceBRL}</div>
                  {!isFree && compareBRL && <div className="text-white/70 text-sm line-through">{compareBRL}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-6 md:p-8">
          {introVideoSrc && (
            <div className="mb-6">
              <div className="aspect-video w-full overflow-hidden rounded-lg border">
                <video src={introVideoSrc} controls className="w-full h-full object-cover" />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Descrição</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
          </div>

          {modules.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Conteúdo do curso</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {modules.length} módulo{modules.length === 1 ? '' : 's'} · {totalLessons} aula
                {totalLessons === 1 ? '' : 's'}
              </p>
              <div className="space-y-3">
                {modules.map((module) => {
                  const lessons = (module.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  const lessonCount = lessons.length
                  return (
                    <div key={module.id} className="rounded-lg border bg-muted/40 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold">{module.title}</h3>
                          {module.description && (
                            <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                          )}
                        </div>
                        <Badge variant="outline">{lessonCount} aula{lessonCount === 1 ? '' : 's'}</Badge>
                      </div>
                      {lessonCount > 0 && (
                        <ul className="mt-3 space-y-2">
                          {lessons.slice(0, 4).map((lesson) => (
                            <li key={lesson.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ChevronRight className="w-4 h-4 text-primary/80" />
                              <span>{lesson.title}</span>
                              {lesson.isFree && (
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                  Aula gratuita
                                </Badge>
                              )}
                            </li>
                          ))}
                          {lessonCount > 4 && (
                            <li className="text-xs text-muted-foreground italic">
                              + {lessonCount - 4} aula{lessonCount - 4 === 1 ? '' : 's'} neste módulo
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div>
              <h3 className="text-base font-semibold">Valores</h3>
              <div className="mt-2 text-sm">
                <div className="font-medium">{priceBRL}</div>
                {!isFree && compareBRL && <div className="text-muted-foreground line-through">{compareBRL}</div>}
                {course.duration != null && (
                  <div className="mt-2 text-muted-foreground">Duração: {course.duration}h</div>
                )}
                {subscriptionLabel && (
                  <div className="mt-2 text-muted-foreground">Plano: {subscriptionLabel}</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold">Modalidade de pagamento</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(course.accessModels || []).length > 0 ? (
                  (course.accessModels || []).map((m) => {
                    const label = accessModelLabels[m] ?? m
                    const showPlan = m === 'SUBSCRIPTION' && course.tier && course.tier !== 'FREE'
                    const planText = showPlan ? ` — Plano ${tierLabels[course.tier || 'FREE']}` : ''
                    return (
                      <span key={m} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        {`${label}${planText}`}
                      </span>
                    )
                  })
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {isFree ? 'Gratuito' : 'Pagamento único'}
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold">Métodos de pagamento</h3>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5">
                  <CreditCard className="w-4 h-4" />
                  Cartão de crédito
                </span>
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5">
                  <QrCode className="w-4 h-4" />
                  Pix
                </span>
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5">
                  <FileText className="w-4 h-4" />
                  Boleto
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {!!objectiveList.length && (
              <div>
                <h3 className="text-base font-semibold">O que você vai aprender</h3>
                <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                  {objectiveList.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!requirementList.length && (
              <div>
                <h3 className="text-base font-semibold">Requisitos</h3>
                <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                  {requirementList.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!audienceList.length && (
              <div>
                <h3 className="text-base font-semibold">Para quem é este curso</h3>
                <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                  {audienceList.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t pt-6">
            <div className="space-y-1 text-sm text-muted-foreground">
              {hasActiveAccess ? (
                <span>Você já está inscrito neste curso. Comece a estudar agora mesmo!</span>
              ) : isFree ? (
                <span>Acesso gratuito imediato após inscrição.</span>
              ) : canDirectEnroll ? (
                <span>Este curso está incluído no seu plano de assinatura.</span>
              ) : (
                <span>Conclua o pagamento para liberar o acesso completo ao curso.</span>
              )}
              {enrollmentStatus === 'pending' && (
                <div className="text-amber-600 font-medium">
                  Pagamento pendente. Finalize o checkout para liberar o conteúdo.
                </div>
              )}
              {!isAuthenticated && isFree && (
                <div className="text-xs text-muted-foreground/90">
                  Faça login ou crie uma conta para garantir seu acesso gratuito.
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {showPlanButton && (
                <Button variant="outline" asChild>
                  <a href="/precos">Conheça os planos</a>
                </Button>
              )}
              {!hasActiveAccess && !canDirectEnroll && hasFreeLessons && (
                <Button variant="secondary" onClick={handlePreviewEnroll} disabled={ctaLoading}>
                  {ctaLoading ? 'Liberando...' : 'Ver aulas gratuitas'}
                </Button>
              )}
              <Button onClick={handlePrimaryAction} disabled={ctaLoading}>
                {ctaLoading ? 'Processando...' : primaryActionLabel}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
