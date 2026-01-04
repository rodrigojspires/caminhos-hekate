"use client"

import { Play, Clock, BookOpen, Calendar, CheckCircle, AlertCircle, Award, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

interface Course {
  id: string
  slug: string
  title: string
  description: string
  thumbnail: string
  instructor: string
  duration: string
  progress: number
  status: 'in_progress' | 'completed' | 'not_started'
  rating: number
  totalLessons: number
  completedLessons: number
  lastAccessed?: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  enrollmentStatus: 'active' | 'pending'
  hasFreeLessons: boolean
  checkoutUrl: string
  certificateStatus: 'locked' | 'ready' | 'available'
  certificateUrl?: string
  certificateIssuedAt?: string
  certificateTemplateName?: string
}

interface MyCoursesProps {
  courses: Course[]
  loading?: boolean
  onCourseSelect?: (courseId: string) => void
}

export function MyCourses({ courses, loading = false, onCourseSelect }: MyCoursesProps) {
  const { apply } = useDashboardVocabulary()
  const getStatusIcon = (status: Course['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case 'in_progress':
        return <Play className="w-5 h-5 text-[hsl(var(--temple-accent-gold))]" />
      case 'not_started':
        return <AlertCircle className="w-5 h-5 text-[hsl(var(--temple-text-secondary))]" />
    }
  }

  const getStatusText = (status: Course['status']) => {
    switch (status) {
      case 'completed':
        return 'Concluído'
      case 'in_progress':
        return 'Em Andamento'
      case 'not_started':
        return 'Não Iniciado'
    }
  }

  const getLevelColor = (level: Course['level']) => {
    switch (level) {
      case 'beginner':
        return 'temple-chip'
      case 'intermediate':
        return 'temple-chip'
      case 'advanced':
        return 'temple-chip'
    }
  }

  const getLevelText = (level: Course['level']) => {
    switch (level) {
      case 'beginner':
        return 'Neófito'
      case 'intermediate':
        return 'Iniciado'
      case 'advanced':
        return 'Adepto'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="temple-card p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="w-32 h-24 bg-[hsl(var(--temple-surface-2))] rounded-lg"></div>
              <div className="flex-1">
                <div className="h-5 bg-[hsl(var(--temple-surface-2))] rounded mb-2"></div>
                <div className="h-4 bg-[hsl(var(--temple-surface-2))] rounded mb-4 w-3/4"></div>
                <div className="h-2 bg-[hsl(var(--temple-surface-2))] rounded mb-2"></div>
                <div className="flex gap-4">
                  <div className="h-4 bg-[hsl(var(--temple-surface-2))] rounded w-20"></div>
                  <div className="h-4 bg-[hsl(var(--temple-surface-2))] rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-16 h-16 text-[hsl(var(--temple-text-secondary))] mx-auto mb-4" />
        <h3 className="text-lg font-medium text-[hsl(var(--temple-text-primary))] mb-2">{apply('Nenhum Ritual Iniciado')}</h3>
        <p className="text-[hsl(var(--temple-text-secondary))] mb-6">{apply('Seu Grimório aguarda suas primeiras inscrições. Explore os mistérios disponíveis e inicie sua jornada.')}</p>
        <Link
          href="/cursos"
          className="inline-flex items-center px-4 py-2 temple-btn-primary rounded-lg transition-colors"
        >
          {apply('Explorar Rituais')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0 overflow-hidden">
      {/* Lista de Cursos (sem filtros internos) */}
      <div className="space-y-4 min-w-0">
        {courses.map((course) => (
          <div key={course.id} className="temple-card temple-card-hover overflow-hidden">
            <div className="p-6">
              <div className="flex gap-4">
                {/* Miniatura do Curso */}
                <div className="relative w-32 h-24 rounded-lg overflow-hidden bg-[hsl(var(--temple-surface-2))] shrink-0">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Info do Curso */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-[hsl(var(--temple-text-primary))] mb-1">{course.title}</h3>
                      <p className="text-sm text-[hsl(var(--temple-text-secondary))] mb-2">{course.instructor}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {course.enrollmentStatus === 'pending' && course.hasFreeLessons ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--temple-surface-3))] text-[hsl(var(--temple-text-primary))] px-3 py-1 text-xs font-semibold">
                          <AlertCircle className="w-4 h-4" />
                          {apply('Acesso parcial (gratuitas)')}
                        </span>
                      ) : (
                        <>
                          {getStatusIcon(course.status)}
                      <span className="text-sm font-medium text-[hsl(var(--temple-text-primary))]">
                        {apply(getStatusText(course.status))}
                      </span>
                    </>
                  )}
                </div>
              </div>

                  <p className="text-[hsl(var(--temple-text-secondary))] text-sm mb-3 line-clamp-2">{course.description}</p>

                  {/* Barra de Progresso */}
                  <div className="mb-3">
                    <div className="h-2 bg-[hsl(var(--temple-surface-2))] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[hsl(var(--temple-accent-gold))] rounded-full"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-sm text-[hsl(var(--temple-text-secondary))]">
                        <Clock className="w-4 h-4" />
                        <span>{course.duration}</span>
                      </div>
                      <span className="text-sm font-medium text-[hsl(var(--temple-text-primary))]">{course.progress}% concluído</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                        {getLevelText(course.level)}
                      </span>
                      {/* Rating removido por ausência de sistema de avaliação */}
                      <div className="flex items-center gap-1 text-[hsl(var(--temple-text-secondary))]">
                        <Calendar className="w-4 h-4" />
                      <span className="text-sm">{apply(`${course.completedLessons}/${course.totalLessons} passos`)}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap justify-end">
                      {course.certificateStatus === 'locked' ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-[hsl(var(--temple-border-subtle))] text-[hsl(var(--temple-text-secondary))] rounded-lg cursor-not-allowed"
                          title="Conclua o ritual para liberar o selo"
                        >
                          <Award className="w-4 h-4" />
                          {apply('Selo bloqueado')}
                        </button>
                      ) : (
                        <a
                          href={course.certificateUrl || `/api/certificates/${course.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-emerald-400 text-emerald-200 rounded-lg hover:bg-emerald-400/10 transition-colors"
                          title={
                            (course.certificateIssuedAt ? 'Baixar Selo' : 'Emitir Selo') +
                            (course.certificateTemplateName ? ` • ${course.certificateTemplateName}` : '')
                          }
                        >
                          <Award className="w-4 h-4" />
                          {apply(course.certificateIssuedAt ? 'Baixar Selo' : 'Emitir Selo')}
                        </a>
                      )}
                      <Link
                        href={`/cursos/${course.slug}?view=content`}
                        className="px-4 py-2 temple-btn-primary rounded-lg transition-colors"
                      >
                        {apply('Continuar Ritual')}
                      </Link>
                      <Link
                        href={`/cursos/${course.slug}?view=overview`}
                        className="px-4 py-2 temple-btn-secondary rounded-lg transition-colors"
                      >
                        {apply('Ver Detalhes')}
                      </Link>
                      {course.enrollmentStatus === 'pending' && course.hasFreeLessons && (
                        <Link
                          href={course.checkoutUrl}
                          className="px-4 py-2 border border-[hsl(var(--temple-accent-gold))] text-[hsl(var(--temple-accent-gold))] rounded-lg hover:bg-[hsl(var(--temple-accent-gold))]/10 transition-colors"
                        >
                          {apply('Concluir compra')}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
