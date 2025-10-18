"use client"

import { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreditCard, QrCode, FileText, Play, CheckCircle2 } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

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
  }
}

const levelLabels: Record<string, string> = {
  BEGINNER: 'Iniciante',
  INTERMEDIATE: 'Intermediário',
  ADVANCED: 'Avançado',
  EXPERT: 'Especialista',
}

const accessModelLabels: Record<string, string> = {
  FREE: 'Gratuito',
  ONE_TIME: 'Pagamento único',
  SUBSCRIPTION: 'Assinatura',
}

const tierLabels: Record<string, string> = {
  FREE: 'Gratuito',
  INICIADO: 'Iniciado',
  ADEPTO: 'Adepto',
  SACERDOCIO: 'Sacerdócio',
}

export default function CoursePresentation({ course }: CoursePresentationProps) {
  const [enrolling, setEnrolling] = useState(false)
  const [enrolled, setEnrolled] = useState(false)
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null)
  const heroImage = useMemo(() => resolveMediaUrl(course.featuredImage || null), [course.featuredImage])
  const [introVideoSrc, setIntroVideoSrc] = useState<string | null>(() => resolveMediaUrl(course.introVideo || null))
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    fetch(`/api/courses/${course.id}/enrollment`).then(async (r) => {
      if (!mounted) return
      const j = await r.json().catch(() => ({ enrolled: false }))
      setEnrolled(!!j.enrolled)
      setEnrollmentStatus(j.status || null)
    }).catch(() => {})
    return () => { mounted = false }
  }, [course.id])

  useEffect(() => {
    const raw = course.introVideo || null
    const normalized = raw ? raw.trim() : null
    if (!normalized) {
      setIntroVideoSrc(null)
      return
    }
    const cleaned = normalized.replace(/^https?:\/\/[^\/]+\//, '/').replace(/^\/+/, '/')
    const looksPrivateCourseVideo = cleaned.startsWith('/private/course-videos/')
    let cancelled = false
    async function update() {
      if (looksPrivateCourseVideo) {
        try {
          const params = new URLSearchParams({ path: normalized || '', courseId: String(course.id) })
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
    return () => { cancelled = true }
  }, [course.introVideo, course.id])

  const isFree = (course.price ?? null) === null || (course.accessModels || []).includes('FREE') || course.tier === 'FREE'

  const priceBRL = useMemo(() => {
    if (course.price == null) return 'Acesso gratuito'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(course.price)
  }, [course.price])

  const compareBRL = useMemo(() => {
    if (course.comparePrice == null) return null
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(course.comparePrice)
  }, [course.comparePrice])

  const objectiveList = Array.isArray(course.objectives)
    ? course.objectives.filter((i: any) => typeof i === 'string')
    : []
  const requirementList = Array.isArray(course.requirements)
    ? course.requirements.filter((i: any) => typeof i === 'string')
    : []
  const audienceList = Array.isArray(course.targetAudience)
    ? course.targetAudience.filter((i: any) => typeof i === 'string')
    : []

  const onEnroll = async () => {
    try {
      setEnrolling(true)
      const res = await fetch(`/api/courses/${course.id}/enrollment`, { method: 'POST' })
      if (!res.ok) {
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
      }
    } catch (e) {
      toast.error('Erro ao processar inscrição')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <section className="space-y-8">
      {/* Hero */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="relative w-full aspect-video bg-gradient-to-br from-purple-700/40 to-indigo-800/40">
            {heroImage ? (
              <Image
                src={heroImage}
                alt={course.title}
                fill
                className="object-cover"
                priority
              />
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
                      <Badge key={m} variant="outline" className="bg-purple-100/80 text-purple-900 border-purple-300">
                        {accessModelLabels[m] ?? m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-white text-xl md:text-2xl font-bold">
                    {priceBRL}
                  </div>
                  {!isFree && compareBRL && (
                    <div className="text-white/70 text-sm line-through">{compareBRL}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-6 md:p-8">
          {/* Intro Video */}
          {introVideoSrc && (
            <div className="mb-6">
              <div className="aspect-video w-full overflow-hidden rounded-lg border">
                <video
                  src={introVideoSrc}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Descrição</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div>
              <h3 className="text-base font-semibold">Valores</h3>
              <div className="mt-2 text-sm">
                <div className="font-medium">{priceBRL}</div>
                {!isFree && compareBRL && (
                  <div className="text-muted-foreground line-through">{compareBRL}</div>
                )}
                {course.duration != null && (
                  <div className="mt-2 text-muted-foreground">Duração: {course.duration}h</div>
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

          {/* Objectives / Requirements / Audience */}
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

          {/* CTA */}
          <div className="mt-10 flex items-center justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              {isFree ? (
                <span>Acesso gratuito imediato após inscrição.</span>
              ) : (
                <span>
                  Conclua a inscrição e o pagamento para liberar o acesso.
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {(course.accessModels || []).includes('SUBSCRIPTION') && (
                <Button variant="outline" asChild>
                  <a href="/precos">Conheça os planos</a>
                </Button>
              )}
              {enrollmentStatus === 'pending' && (
                <Button variant="default" asChild>
                  <a href={`/checkout?enrollCourseId=${course.id}`}>Ir para o checkout</a>
                </Button>
              )}
              <Button onClick={onEnroll} disabled={enrolling}>
                {enrolling ? 'Processando...' : (enrolled ? 'Inscrito' : 'Inscrever-se')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}